// SSRF guard: block internal/private/metadata targets for server-side fetch.
//
// Three layers, each closing a distinct bypass class documented in #3714:
//   1. assertPublicUrl        - synchronous literal-IP/hostname checks (cheap, for
//                                immediate rejection of obviously-bad input at request-build time).
//   2. assertPublicUrlResolved - adds DNS resolution so a hostname that merely
//                                *resolves* to a private/loopback address (e.g. a
//                                nip.io/sslip.io wildcard-DNS domain, or an attacker's
//                                own domain pointed at 127.0.0.1) is also rejected.
//   3. fetchPublic             - wraps fetch() with manual redirect handling so a
//                                validated public URL can't 30x its way to an
//                                internal target without the redirect target being
//                                re-validated through layer 2 first.
//
// Layer 1 alone previously had matching bugs, not just missing coverage: hostname
// checks ran on the raw string without normalizing a trailing dot ("localhost."),
// and the IPv6 check only recognized one textual representation of an IPv4-mapped
// address (dotted "::ffff:a.b.c.d") while Node/WHATWG URL parsing can normalize the
// same address to hex form ("::ffff:7f00:1") — a mismatch, not an oversight.

import dns from "node:dns";

const BLOCKED_HOSTNAMES = new Set(["localhost", "ip6-localhost", "ip6-loopback"]);
const BLOCKED_SUFFIXES = [".internal", ".local", ".localhost"];
// Hosts that are literal loopback — exemptable via { allowLoopback: true } for
// callers that legitimately target a local dev service. DNS-rebinding attacks
// (e.g. attacker.example -> 127.0.0.1) are NOT in this set and remain blocked
// by the DNS-resolution layer below.
const LOOPBACK_HOST = new Set(["localhost", "127.0.0.1", "::1"]);

// Parse dotted IPv4 to 32-bit integer, or null if not a valid IPv4 literal.
function ipv4ToInt(host) {
  const parts = host.split(".");
  if (parts.length !== 4) return null;
  let value = 0;
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null;
    const octet = Number(part);
    if (octet > 255) return null;
    value = value * 256 + octet;
  }
  return value >>> 0;
}

// Private/reserved IPv4 ranges as [startInt, maskBits].
const BLOCKED_V4_RANGES = [
  [ipv4ToInt("0.0.0.0"), 8],
  [ipv4ToInt("10.0.0.0"), 8],
  [ipv4ToInt("100.64.0.0"), 10], // CGNAT — also used by some cloud metadata proxies
  [ipv4ToInt("127.0.0.0"), 8],
  [ipv4ToInt("169.254.0.0"), 16], // includes 169.254.169.254 cloud metadata
  [ipv4ToInt("172.16.0.0"), 12],
  [ipv4ToInt("192.168.0.0"), 16],
];

function isBlockedIpv4Int(ip) {
  return BLOCKED_V4_RANGES.some(([base, bits]) => {
    const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
    return (ip & mask) === (base & mask);
  });
}

function isBlockedIpv4(host) {
  const ip = ipv4ToInt(host);
  if (ip === null) return false;
  return isBlockedIpv4Int(ip);
}

// Link-local-only check (169.254.0.0/16) — used by callers that MUST permit
// RFC1918 private ranges + loopback (local model hosts: Ollama at
// localhost:11434, LAN vLLM boxes at 192.168.x / 10.x, Tailscale CGNAT at
// 100.64/10) while still blocking cloud-metadata and link-local probes.
// 169.254.169.254 (AWS/GCP/Azure metadata) and 169.254.170.2 (ECS task
// metadata) both fall in this range. This is the ONE IP class that is never
// a legitimate model host.
const LINK_LOCAL_V4_BASE = ipv4ToInt("169.254.0.0");
function isLinkLocalIpv4(host) {
  const ip = ipv4ToInt(host);
  if (ip === null) return false;
  // /16 mask
  const mask = 0xffff0000 >>> 0;
  return (ip & mask) === (LINK_LOCAL_V4_BASE & mask);
}

function isLinkLocalIpv6Groups(g) {
  // fe80::/10 link-local
  if ((g[0] & 0xffc0) === 0xfe80) return true;
  // IPv4-mapped ::ffff:169.254.x.x — extract the embedded IPv4 and reapply
  // the v4 link-local check. NAT64 64:ff9b::/96 and IPv4-compat ::a.b.c.d
  // forms can also embed a link-local v4.
  const low32 = ((g[6] << 16) | g[7]) >>> 0;
  if ([0, 1, 2, 3, 4].every((i) => g[i] === 0) && g[5] === 0xffff) {
    return isLinkLocalIpv4Int(low32);
  }
  if (g[0] === 0x0064 && g[1] === 0xff9b && [2, 3, 4, 5].every((i) => g[i] === 0)) {
    return isLinkLocalIpv4Int(low32);
  }
  if ([0, 1, 2, 3, 4, 5].every((i) => g[i] === 0) && low32 !== 0 && low32 !== 1) {
    return isLinkLocalIpv4Int(low32);
  }
  return false;
}

function isLinkLocalIpv4Int(ip) {
  const mask = 0xffff0000 >>> 0;
  return (ip & mask) === (LINK_LOCAL_V4_BASE & mask);
}

function isLinkLocalHost(host) {
  if (isLinkLocalIpv4(host)) return true;
  if (host.includes(":")) {
    const groups = parseIPv6ToGroups(host.replace(/^\[|\]$/g, ""));
    if (groups && isLinkLocalIpv6Groups(groups)) return true;
  }
  return false;
}

function parseHextets(s) {
  if (s === "") return [];
  const segs = s.split(":");
  const out = [];
  for (const seg of segs) {
    if (!/^[0-9a-f]{1,4}$/.test(seg)) return null;
    out.push(parseInt(seg, 16));
  }
  return out;
}

// Parse any textual IPv6 representation (including an embedded dotted-IPv4 tail,
// "::" compression in any position, and full/partial forms) into 8 16-bit groups.
// Returns null if the string isn't a valid IPv6 literal. Parsing into groups once
// and reasoning about the numeric value — rather than pattern-matching the source
// string — is what makes this immune to "which textual form did the URL parser
// pick" bugs: "::ffff:127.0.0.1" and "::ffff:7f00:1" produce identical groups.
function parseIPv6ToGroups(rawHost) {
  let host = rawHost.toLowerCase();

  const v4TailMatch = host.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
  let v4Groups = null;
  if (v4TailMatch) {
    const v4Int = ipv4ToInt(v4TailMatch[1]);
    if (v4Int === null) return null;
    v4Groups = [(v4Int >>> 16) & 0xffff, v4Int & 0xffff];
    host = host.slice(0, host.length - v4TailMatch[1].length);
    if (host.endsWith("::")) {
      // "::" compression marker itself — leave both colons, the removed IPv4
      // fills the gap it represents.
    } else if (host.endsWith(":")) {
      host = host.slice(0, -1); // was just the "prevgroup:ipv4" separator
    }
  }

  const doubleColonParts = host.split("::");
  if (doubleColonParts.length > 2) return null;

  let groups;
  if (doubleColonParts.length === 2) {
    const head = parseHextets(doubleColonParts[0]);
    const tail = parseHextets(doubleColonParts[1]);
    if (head === null || tail === null) return null;
    const v4Len = v4Groups ? v4Groups.length : 0;
    const missing = 8 - head.length - tail.length - v4Len;
    if (missing < 0) return null;
    groups = [...head, ...new Array(missing).fill(0), ...tail, ...(v4Groups || [])];
  } else {
    const all = parseHextets(host);
    if (all === null) return null;
    groups = [...all, ...(v4Groups || [])];
  }
  return groups.length === 8 ? groups : null;
}

function isBlockedIpv6Groups(g) {
  const isZero = (n) => g[n] === 0;
  // loopback ::1
  if ([0, 1, 2, 3, 4, 5, 6].every(isZero) && g[7] === 1) return true;
  // unspecified ::
  if (g.every((x) => x === 0)) return true;
  // link-local fe80::/10
  if ((g[0] & 0xffc0) === 0xfe80) return true;
  // unique local fc00::/7
  if ((g[0] & 0xfe00) === 0xfc00) return true;
  // IPv4-mapped ::ffff:0:0/96 (0:0:0:0:0:ffff:a.b.c.d — the 0xffff marker is
  // group index 5) and NAT64 well-known prefix 64:ff9b::/96 — both embed a
  // real IPv4 address in the low 32 bits; check it against the same IPv4
  // blocklist regardless of which prefix wraps it.
  const low32 = ((g[6] << 16) | g[7]) >>> 0;
  if ([0, 1, 2, 3, 4].every(isZero) && g[5] === 0xffff) return isBlockedIpv4Int(low32);
  if (g[0] === 0x0064 && g[1] === 0xff9b && [2, 3, 4, 5].every(isZero)) return isBlockedIpv4Int(low32);
  // IPv4-compatible ::a.b.c.d/96 (deprecated, still parseable) — excludes :: and ::1
  // which already matched above.
  if ([0, 1, 2, 3, 4, 5].every(isZero) && low32 !== 0 && low32 !== 1) return isBlockedIpv4Int(low32);
  return false;
}

function normalizeHost(hostname) {
  // A trailing dot marks an FQDN and is semantically insignificant
  // ("localhost." and "localhost" are the same host) but was being compared
  // as a literal character, letting it slip past every string-based check.
  return hostname.toLowerCase().replace(/\.+$/, "");
}

function isBlockedHost(host) {
  if (BLOCKED_HOSTNAMES.has(host)) return true;
  if (BLOCKED_SUFFIXES.some((s) => host.endsWith(s))) return true;
  if (isBlockedIpv4(host)) return true;
  if (host.includes(":")) {
    const groups = parseIPv6ToGroups(host.replace(/^\[|\]$/g, ""));
    if (groups && isBlockedIpv6Groups(groups)) return true;
  }
  return false;
}

// Throw if URL targets a non-public host by literal hostname/IP alone (no DNS
// resolution — see assertPublicUrlResolved for that). Caller should map to 400.
export function assertPublicUrl(rawUrl) {
  const parsed = new URL(rawUrl);
  const host = normalizeHost(parsed.hostname);
  if (isBlockedHost(host)) throw new Error("Blocked URL: internal host");
}

// Link-local / cloud-metadata guard — blocks ONLY the IP class that is never
// a legitimate model host:
//   - 169.254.0.0/16 (link-local, including AWS/GCP/Azure metadata at
//     169.254.169.254 and ECS task metadata at 169.254.170.2)
//   - fe80::/10 (IPv6 link-local) and IPv4-mapped forms
//   - http://[fd00::]/... (ULA) is NOT blocked — some private model servers
//     use ULA addressing
//
// Use this INSTEAD of assertPublicUrlResolved when the caller must permit
// RFC1918 private ranges and loopback — the 9Router use case of proxying to
// local model hosts (Ollama at localhost:11434, LAN vLLM at 192.168.x/10.x,
// Tailscale CGNAT at 100.64/10) makes the full SSRF guard inappropriate for
// provider baseUrl validation. The link-local block closes the cloud-metadata
// exfiltration vector without breaking legitimate local model routing.
//
// Scheme check is also enforced: only http:/https: allowed. Prevents file:/,
// gopher:, and other exotic schemes from being smuggled into the fetch path.
export function assertNotLinkLocal(rawUrl) {
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error("Invalid URL");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(`Blocked URL scheme: ${parsed.protocol}`);
  }
  if (parsed.username || parsed.password) {
    throw new Error("Blocked URL: embedded credentials not allowed");
  }
  const host = normalizeHost(parsed.hostname);
  if (isLinkLocalHost(host)) {
    throw new Error("Blocked URL: link-local / cloud-metadata host");
  }
}

// Async variant: also resolves hostnames via DNS so a wildcard-DNS domain
// (nip.io/sslip.io) or attacker-controlled A record pointed at 169.254.169.254
// is caught, not just literals.
export async function assertNotLinkLocalResolved(rawUrl) {
  assertNotLinkLocal(rawUrl); // literal check first (fast path)
  const parsed = new URL(rawUrl);
  const host = normalizeHost(parsed.hostname);
  const bracketless = host.replace(/^\[|\]$/g, "");
  // Already a literal address — isLinkLocalHost above covered it.
  if (ipv4ToInt(bracketless) !== null || bracketless.includes(":")) return;
  let addresses;
  try {
    addresses = await dns.promises.lookup(host, { all: true, verbatim: true });
  } catch {
    return; // resolution failure isn't an SSRF signal
  }
  for (const { address, family } of addresses) {
    const blocked = family === 4
      ? isLinkLocalIpv4(address)
      : isLinkLocalIpv6Groups(parseIPv6ToGroups(address) || []);
    if (blocked) {
      throw new Error("Blocked URL: hostname resolves to link-local / cloud-metadata host");
    }
  }
}

// Async: assertPublicUrl plus DNS resolution of non-literal hostnames, so a
// domain that merely *resolves* to a private/loopback/metadata address (wildcard-DNS
// services like nip.io/sslip.io, or an attacker-controlled domain with an A record
// pointed at 127.0.0.1) is rejected too, not just IPs typed directly into the URL.
//
// Options:
//   allowLoopback: when true, literal loopback hosts (localhost, 127.0.0.1, ::1)
//     are permitted while all other SSRF protections remain enforced — private
//     ranges, cloud metadata (169.254.169.254), link-local, ULA, and DNS-rebinding
//     to loopback via wildcard-DNS domains are still blocked. Used by callers
//     whose target URL is legitimately a local dev service (OIDC dev issuers,
//     Headroom on localhost:8787). Do NOT use this for user-controlled URLs.
export async function assertPublicUrlResolved(rawUrl, { allowLoopback = false } = {}) {
  const parsed = new URL(rawUrl);
  const host = normalizeHost(parsed.hostname);
  if (allowLoopback && LOOPBACK_HOST.has(host)) return;
  if (isBlockedHost(host)) throw new Error("Blocked URL: internal host");

  // Already a literal IPv4/IPv6 address — isBlockedHost above already covered it,
  // no DNS lookup applies (and dns.lookup would just echo it back anyway).
  const bracketless = host.replace(/^\[|\]$/g, "");
  if (ipv4ToInt(bracketless) !== null || bracketless.includes(":")) return;

  let addresses;
  try {
    addresses = await dns.promises.lookup(host, { all: true, verbatim: true });
  } catch {
    // Resolution failure isn't an SSRF signal by itself — let the subsequent
    // fetch() fail with its own (clearer) network error.
    return;
  }
  for (const { address, family } of addresses) {
    if (family === 4 ? isBlockedIpv4(address) : isBlockedIpv6Groups(parseIPv6ToGroups(address) || [])) {
      throw new Error("Blocked URL: hostname resolves to an internal host");
    }
  }
}

// fetch() with SSRF-safe manual redirect handling: each hop's target is
// re-validated through assertPublicUrlResolved before being followed, so a
// validated public URL can't 30x its way to an internal target. Bounded to
// maxRedirects hops (fetch's own default following behavior has no bound
// relevant here since we never let it auto-follow).
export async function fetchPublic(url, init = {}, { maxRedirects = 5 } = {}) {
  await assertPublicUrlResolved(url);
  let currentUrl = url;
  for (let hop = 0; ; hop++) {
    const res = await fetch(currentUrl, { ...init, redirect: "manual" });
    const isRedirect = res.status >= 300 && res.status < 400;
    const location = isRedirect ? res.headers.get("location") : null;
    if (!location) return res;
    if (hop >= maxRedirects) throw new Error("Blocked URL: too many redirects");
    const nextUrl = new URL(location, currentUrl).toString();
    await assertPublicUrlResolved(nextUrl);
    currentUrl = nextUrl;
  }
}
