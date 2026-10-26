// Security: peerNodes URL validation for PATCH /api/settings.
//
// The L1 failover consumer (cli/app/custom-server.js l1MaybeForward) forwards
// /v1* traffic — prompts, API keys, responses — to whatever URL is stored in
// settings.peerNodes when the local node is degraded. Persisting an
// attacker-controlled URL turns the proxy into a traffic-forwarding MITM.
// l1Probe also makes blind HTTP GETs to each entry (SSRF vector).
//
// Validation is static (no DNS resolution): mDNS hostnames (mini2-9.local)
// and Tailscale hostnames won't always resolve at PATCH time, and DNS
// rebinding is a separate concern that the runtime probe timeout already
// limits. We block the known-bad classes instead:
//
//   - non-http(s) schemes (file://, ftp://, javascript:, data:)
//   - embedded credentials (http://user:pass@host — smuggles auth)
//   - link-local / cloud-metadata IPs (169.254.0.0/16, including
//     169.254.169.254 AWS/GCP/Azure metadata + 169.254.170.2 ECS)
//   - IPv4-mapped IPv6 forms of the above (::ffff:169.254.x.x)
//   - IPv6 literal peers when the proxy is IPv4-only (defense in depth —
//     the failover proxy already rejects these, but never persist them)
//
// Legitimate LAN / Tailscale / mDNS peers are preserved:
//   http://mini2-9.local:20128           ✅ mDNS
//   http://192.168.1.189:20129           ✅ RFC1918 LAN
//   http://100.76.147.49:20128           ✅ Tailscale CGNAT range
//   https://router.example.com:20128     ✅ HTTPS public
//   http://evil.example.com:20128        ✅ (not our job to judge DNS)
//   http://169.254.169.254/latest/meta…  ❌ cloud metadata
//   http://[::ffff:169.254.169.254]/     ❌ IPv4-mapped metadata
//   http://user:pass@evil.com/           ❌ embedded credentials
//   file:///etc/passwd                   ❌ non-http scheme

const LINK_LOCAL_V4_RE = /^169\.254\./;
// Tailscale CGNAT block: 100.64.0.0/10 (100.64.x.x – 100.127.x.x).
// We accept the whole /10 — any address in it is a legitimate peer candidate.
const TAILSCALE_V4_RE = /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./;
// RFC1918 private: 10.x, 172.16-31.x, 192.168.x
const RFC1918_V4_RE =
  /^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.)/;

function isIpv4Literal(host) {
  return /^(\d{1,3}\.){3}\d{1,3}$/.test(host);
}

function isIpv6Literal(host) {
  // Hostname is bracket-stripped by URL parsing; an IPv6 literal still has colons.
  return host.includes(":");
}

function stripIpv4MappedIpv6(host) {
  // Node's URL parser leaves brackets on IPv6 hostnames ("[::ffff:a9fe:a9fe]").
  // Strip them so the regexes below match uniformly across input forms.
  const bare = host.startsWith("[") && host.endsWith("]") ? host.slice(1, -1) : host;
  // Form 1: ::ffff:1.2.3.4 (dotted-decimal tail, not normalized by some parsers).
  const m1 = bare.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i);
  if (m1) return m1[1];
  // Form 2: ::ffff:aabb:ccdd (URL-normalized hex — what Node's URL parser
  // actually produces for http://[::ffff:169.254.169.254]/).
  // Decode the two hex groups back to dotted-decimal IPv4 so the existing
  // v4 rules (link-local, loopback, RFC1918, Tailscale) can apply uniformly.
  const m2 = bare.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/i);
  if (m2) {
    const hi = parseInt(m2[1], 16);
    const lo = parseInt(m2[2], 16);
    return `${(hi >> 8) & 0xff}.${hi & 0xff}.${(lo >> 8) & 0xff}.${lo & 0xff}`;
  }
  return null;
}

/**
 * Validate a single peer URL. Returns { ok: true, normalized } on success,
 * or { ok: false, reason, detail } on failure.
 */
export function validatePeerNode(raw) {
  if (typeof raw !== "string") {
    return { ok: false, reason: "not-a-string", detail: `peerNodes entry must be a string (got ${typeof raw})` };
  }
  const trimmed = raw.trim();
  if (!trimmed) {
    return { ok: false, reason: "empty", detail: "peerNodes entry is empty" };
  }

  let u;
  try {
    u = new URL(trimmed);
  } catch {
    return { ok: false, reason: "invalid-url", detail: `not a valid URL: ${trimmed}` };
  }

  if (u.protocol !== "http:" && u.protocol !== "https:") {
    return {
      ok: false,
      reason: "bad-scheme",
      detail: `peerNodes scheme must be http: or https: (got ${u.protocol})`,
    };
  }

  if (u.username || u.password) {
    return {
      ok: false,
      reason: "embedded-credentials",
      detail: `peerNodes URL must not contain embedded credentials (user:pass@)`,
    };
  }

  const host = u.hostname;
  if (!host) {
    return { ok: false, reason: "no-host", detail: `peerNodes URL has no host: ${trimmed}` };
  }

  // IPv6 literal — we don't currently ship an IPv6-aware failover proxy by
  // default (cli/failover-proxy.cjs only enables v6 with --ipv6). Block to
  // prevent persisting peers the runtime will silently ignore.
  if (isIpv6Literal(host)) {
    // Exception: IPv4-mapped IPv6 (::ffff:x.x.x.x) — unwrap and reapply v4 rules.
    const mapped = stripIpv4MappedIpv6(host);
    if (!mapped) {
      return {
        ok: false,
        reason: "ipv6-not-allowed",
        detail: `IPv6 peer URLs are not allowed (runtime is IPv4-only by default): ${trimmed}`,
      };
    }
    if (LINK_LOCAL_V4_RE.test(mapped)) {
      return {
        ok: false,
        reason: "link-local",
        detail: `link-local / cloud-metadata IPs are not allowed as peers: ${trimmed}`,
      };
    }
    // Mapped RFC1918 / Tailscale / public v4 addresses are allowed through
    // the same rules as plain v4, but we normalize the URL to the v4 form
    // so the runtime (which only understands v4) can probe it.
    u.hostname = mapped;
  } else if (isIpv4Literal(host)) {
    if (LINK_LOCAL_V4_RE.test(host)) {
      return {
        ok: false,
        reason: "link-local",
        detail: `link-local / cloud-metadata IPs are not allowed as peers: ${trimmed}`,
      };
    }
    // RFC1918 and Tailscale v4 are allowed. Public v4 is also allowed (the
    // operator may legitimately peer with a remote box).
  } else {
    // Hostname (mDNS .local, Tailscale MagicDNS, public FQDN). All allowed —
    // we don't DNS-resolve at PATCH time.
    // Block explicit loopback hostnames to catch the obvious self-forwarding
    // misconfiguration (127.0.0.1 and localhost point at the local node).
    const lh = host.toLowerCase();
    if (lh === "localhost" || lh === "localhost.localdomain") {
      return {
        ok: false,
        reason: "loopback",
        detail: `loopback hostnames are not allowed as peers (points at the local node): ${trimmed}`,
      };
    }
  }

  // 127.x.y.z (whole /8 is loopback per RFC1122)
  if (isIpv4Literal(u.hostname) && u.hostname.startsWith("127.")) {
    return {
      ok: false,
      reason: "loopback",
      detail: `loopback IPs are not allowed as peers: ${trimmed}`,
    };
  }

  // Normalize: strip trailing slash, drop default ports, lowercase scheme/host.
  const normalized = u.toString().replace(/\/+$/, "");
  return { ok: true, normalized };
}

/**
 * Validate an entire peerNodes array. Returns { ok: true, entries: string[] }
 * on success, or { ok: false, errors: [{ entry, reason, detail }] } on failure.
 * An empty array (feature off) is always valid.
 */
export function validatePeerNodes(value) {
  if (!Array.isArray(value)) {
    return {
      ok: false,
      errors: [{ entry: value, reason: "not-an-array", detail: "peerNodes must be an array of URL strings" }],
    };
  }
  const errors = [];
  const entries = [];
  for (const raw of value) {
    const result = validatePeerNode(raw);
    if (result.ok) {
      entries.push(result.normalized);
    } else {
      errors.push({ entry: raw, reason: result.reason, detail: result.detail });
    }
  }
  if (errors.length) return { ok: false, errors };
  return { ok: true, entries };
}

// Exported for tests.
export const __test__ = { isIpv4Literal, isIpv6Literal, stripIpv4MappedIpv6, LINK_LOCAL_V4_RE, RFC1918_V4_RE, TAILSCALE_V4_RE };
