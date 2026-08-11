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

function arg(name, def) {
  const i = process.argv.indexOf("--" + name);
  return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : def;
}

const LISTEN_PORT = Number(arg("listen", 20140));
const LOCAL = arg("local", "http://localhost:20130");
// Multi-peer: accept comma-separated --peer (e.g. "http://ts:20128,http://lan:20128,http://mdns:20128")
// so failover works on ANY network path (Tailscale, LAN, mDNS) — tries each in order.
const PEERS = (arg("peer", "http://mini2-9.local:20128") || "")
  .split(",").map((s) => s.trim()).filter(Boolean);
const PROBE_MS = 2000;
const PROBE_TIMEOUT_MS = 3000;
const UPSTREAM_TIMEOUT_MS = 120000;
const HEALTH_PATH = "/api/health";

// Optimistic: local is probably up at boot (avoids a startup flap to peer).
// peers: [{ url, up }] — the first UP peer wins.
const state = { localUp: true, peers: PEERS.map((url) => ({ url: String(url).replace(/\/+$/, ""), up: false })) };

function probe(url) {
  return new Promise((resolve) => {
    const req = http.request(url + HEALTH_PATH, { method: "GET", timeout: PROBE_TIMEOUT_MS }, (res) => {
      res.resume(); // drain so the socket can be reused
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

server.listen(LISTEN_PORT, "0.0.0.0", () => {
  console.log(`[9r-failover] :${LISTEN_PORT} → local=${LOCAL} peers=[${state.peers.map((p) => p.url).join(", ")}]`);
});
