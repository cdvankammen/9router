#!/usr/bin/env node
/**
 * 9Router node failover proxy — L2 (node-DOWN protection).
 *
 * A separate lightweight process that owns the client-facing port and routes
 * each request to the healthy node: local preferred, peer as backup. When the
 * local app process dies, this proxy (a different process) keeps running and
 * forwards to the peer — clients keep using the same endpoints.
 *
 * Usage:
 *   node failover-proxy.cjs --listen 20140 \
 *     --local http://localhost:20130 --peer http://mini2-9.local:20128
 *
 * Health probe: GET <node>/api/health — any status <500 counts as "up"
 * (401 Unauthorized = alive, just auth-gated).
 *
 * Design notes (see docs/plans-and-prompts/research/9router/25-node-failover-implementation.md):
 * - Loop-proof: sets x-9r-failover:1 and 502s any request that already carries it.
 * - Streaming-safe: req.pipe/preq and pres.pipe/res forward SSE + JSON chunked.
 * - Both-down: falls back to LOCAL so the client sees the real app error,
 *   never a fabricated proxy error.
 * - Startup: optimistic localUp=true so the first requests hit local.
 */
"use strict";
const http = require("http");
const dns = require("dns");
const os = require("os");

function arg(name, def) {
  const i = process.argv.indexOf("--" + name);
  return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : def;
}
function hasFlag(name) {
  return process.argv.includes("--" + name);
}

const LISTEN_PORT = Number(arg("listen", 20140));
const LOCAL = arg("local", "http://localhost:20130");
// Peer can be:
//   - a bare HOSTNAME (e.g. "mini2-9.local") → auto-discover ALL its addresses
//     (LAN, WiFi, Tailscale, mDNS, IPv6) dynamically — no hardcoded IPs.
//   - an explicit URL (e.g. "http://10.0.0.5:20128") → used as-is (legacy).
// Comma-separated allowed. Fallback hostname: "mini2-9.local" (mDNS).
const PEER_HOSTS = (arg("peer", "mini2-9.local") || "")
  .split(",").map((s) => s.trim()).filter(Boolean);
const PROBE_MS = 2000;
const PROBE_TIMEOUT_MS = 3000;
const UPSTREAM_TIMEOUT_MS = 120000;
const HEALTH_PATH = "/api/health";
// Peer port for auto-discovered hostnames. Defaults to the LOCAL port (same-port
// deployments), but can differ (e.g. local=20130, peer mini2=20128) via --peer-port.
const PEER_PORT = Number(arg("peer-port", new URL(LOCAL).port)) || new URL(LOCAL).port;

// IPv6 toggle (SECURITY): default OFF — IPv4 + hostname only (reduces attack
// surface on untrusted networks: no link-local exposure, no RA/DNS-leak vectors,
// and the app binds IPv4-only 0.0.0.0 anyway). With --ipv6, IPv6 addresses from
// DNS/local interfaces are also probed AND the listener binds dual-stack ::.
const IPV6_ENABLED = hasFlag("ipv6");

// ── Dynamic peer discovery ────────────────────────────────────────────────
// No hardcoded IPs: resolve each peer hostname to ALL its addresses (dns.lookup
// with all:true → 127.0.0.1-style v4 + fe80/fdxx v6) AND enumerate local
// interfaces to catch the same-machine case. Refresh periodically so a network
// change (WiFi→LAN, Tailscale up/down) is picked up without a restart.
const discovered = new Map(); // hostname → [{url, family}]

function listLocalAddresses() {
  const addrs = new Set();
  for (const ifaces of Object.values(os.networkInterfaces())) {
    for (const i of ifaces || []) {
      if (!i.internal && (IPV6_ENABLED || i.family === "IPv4")) addrs.add(i.address);
    }
  }
  return [...addrs];
}

function resolveHost(host) {
  return new Promise((resolve) => {
    dns.lookup(host, { all: true, verbatim: true }, (err, addrs) => {
      if (err || !addrs || !addrs.length) return resolve([]);
      resolve(addrs
        .map((a) => a.address)
        .filter((a) => IPV6_ENABLED || !a.includes(":"))); // drop v6 unless --ipv6
    });
  });
}

function buildPeerUrls(host, port) {
  return [host, ...listLocalAddresses()].map((h) => {
    // IPv6 literal → bracket form; hostname stays as-is.
    const fmt = h.includes(":") && !h.startsWith("[") ? `[${h}]` : h;
    return `http://${fmt}:${port}`;
  });
}

async function refreshPeers() {
  const urls = [];
  for (const entry of PEER_HOSTS) {
    // Explicit URL (http://...) → use as-is (legacy, exact control).
    if (/^https?:\/\//i.test(entry)) {
      urls.push(entry.replace(/\/+$/, ""));
      continue;
    }
    // Bare hostname → hostname itself + all its resolved addresses + local
    // interfaces (adapts to whatever network is present). Uses PEER_PORT.
    const host = entry.replace(/\/+$/, "");
    const resolved = await resolveHost(host);
    urls.push(...buildPeerUrls(host, PEER_PORT));
    for (const a of resolved) urls.push(`http://${a.includes(":") && !a.startsWith("[") ? `[${a}]` : a}:${PEER_PORT}`);
  }
  // Dedupe, keep order (hostname first, then discovered addresses).
  const seen = new Set();
  const unique = urls.filter((u) => { if (seen.has(u)) return false; seen.add(u); return true; });
  // Replace peer list if it changed (preserves up-state for unchanged URLs).
  const existing = new Map(state.peers.map((p) => [p.url, p.up]));
  state.peers = unique.map((url) => ({ url, up: existing.has(url) ? existing.get(url) : false }));
}

// Parse a peer URL into { url, isIpv6Literal } — reject malformed URLs and
// IPv6 literals when the toggle is off (security).
function parsePeer(raw) {
  const url = String(raw).replace(/\/+$/, "");
  try {
    const u = new URL(url);
    if (!/^https?:$/.test(u.protocol)) return null;
    const host = u.hostname;
    const isIpv6 = host.includes(":");
    if (isIpv6 && !IPV6_ENABLED) return null; // IPv6 peer blocked when toggle off
    return { url, isIpv6Literal: isIpv6 };
  } catch {
    return null;
  }
}

// Optimistic: local is probably up at boot (avoids a startup flap to peer).
// peers: [{ url, up }] — the first UP peer wins.
const state = { localUp: true, peers: [] };

function probe(url) {
  return new Promise((resolve) => {
    const req = http.request(url + HEALTH_PATH, { method: "GET", timeout: PROBE_TIMEOUT_MS }, (res) => {
      res.resume(); // drain so the socket can be reused
      // Upstream socket can be destroyed mid-probe (node killed while probing)
      // → the response stream emits 'error'; without a handler Node crashes.
      res.on("error", () => resolve(false));
      resolve(res.statusCode < 500);
    });
    req.on("error", () => resolve(false));
    req.on("timeout", () => { req.destroy(); resolve(false); });
    req.end();
  });
}

async function tick() {
  const seq = ++tickSeq; // guard against stale ticks overwriting newer state
  const localResult = await probe(LOCAL);
  const peerResults = await Promise.all(state.peers.map((p) => probe(p.url)));
  if (seq !== tickSeq) return; // a newer tick already landed — discard stale results
  state.localUp = localResult;
  state.peers.forEach((p, i) => { p.up = peerResults[i]; });
}
let tickSeq = 0;
setInterval(tick, PROBE_MS);
tick();
// Re-discover addresses periodically (network changes: WiFi→LAN, Tailscale up).
const DISCOVER_MS = 15000;
setInterval(refreshPeers, DISCOVER_MS);
refreshPeers(); // initial discovery

function pickTarget() {
  if (state.localUp) return LOCAL;
  // First healthy peer path (network-agnostic — tries Tailscale/LAN/mDNS in order).
  const peer = state.peers.find((p) => p.up);
  if (peer) return peer.url;
  return LOCAL; // both down — fail locally with the app's real error
}

const server = http.createServer((req, res) => {
  const target = pickTarget();

  if (req.headers["x-9r-failover"] === "1") {
    res.writeHead(502, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "failover loop detected" }));
    return;
  }

  const headers = { ...req.headers, "x-9r-failover": "1" };
  // RFC 7230 §6.1 hop-by-hop headers must not be forwarded; Node sets its own
  // framing/connection semantics on the upstream request.
  for (const h of ["host", "connection", "keep-alive", "proxy-connection",
    "transfer-encoding", "te", "trailer", "upgrade",
    "x-forwarded-for", "x-real-ip"]) {
    delete headers[h];
  }

  let pres;
  const preq = http.request(target + req.url, {
    method: req.method,
    headers,
    timeout: UPSTREAM_TIMEOUT_MS,
  }, (p) => {
    pres = p;
    res.writeHead(p.statusCode, p.headers);
    p.pipe(res);
    // Upstream reset mid-stream (app killed while streaming): must not crash.
    p.on("error", () => res.destroy());
  });
  preq.on("timeout", () => preq.destroy(new Error("upstream timeout")));
  preq.on("error", (e) => {
    const detail = e.code || e.message || e.name || "unknown";
    if (!res.headersSent && !res.destroyed) {
      res.writeHead(502, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "failover proxy upstream error: " + detail }));
    } else {
      res.destroy(e);
    }
  });
  // Client aborted mid-request (cancelled stream): tear down the upstream pair
  // instead of crashing the proxy on the unhandled ECONNRESET.
  req.on("error", () => {
    preq.destroy();
    if (pres) pres.destroy();
  });
  res.on("error", () => {
    preq.destroy();
    if (pres) pres.destroy();
  });
  req.on("close", () => {
    // Client vanished without an error event (e.g. body half-sent) — stop
    // forwarding so upstream work isn't wasted.
    if (!req.complete) {
      preq.destroy();
      if (pres) pres.destroy();
    }
  });
  req.pipe(preq);
});

// Bind IPv4-only by default (0.0.0.0, security default — not reachable over
// IPv6, reduces attack surface). With --ipv6, bind :: (dual-stack) so IPv6
// clients can reach the proxy too.
const BIND_HOST = IPV6_ENABLED ? "::" : "0.0.0.0";
server.listen(LISTEN_PORT, BIND_HOST, () => {
  console.log(`[9r-failover] :${LISTEN_PORT} (${IPV6_ENABLED ? "ipv6 dual-stack" : "ipv4-only"}) → local=${LOCAL} peers=[${state.peers.map((p) => p.url).join(", ")}]`);
});