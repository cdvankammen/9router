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
const PEER = arg("peer", "http://mini2-9.local:20128");
const PROBE_MS = 2000;
const PROBE_TIMEOUT_MS = 3000;
const UPSTREAM_TIMEOUT_MS = 120000;
const HEALTH_PATH = "/api/health";

// Optimistic: local is probably up at boot (avoids a startup flap to peer).
const state = { localUp: true, peerUp: false };

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
  const [l, p] = await Promise.all([probe(LOCAL), probe(PEER)]);
  state.localUp = l;
  state.peerUp = p;
}
setInterval(tick, PROBE_MS);
tick();

function pickTarget() {
  if (state.localUp) return LOCAL;
  if (state.peerUp) return PEER;
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
  delete headers["host"];
  delete headers["x-forwarded-for"];
  delete headers["x-real-ip"];

  const preq = http.request(target + req.url, {
    method: req.method,
    headers,
    timeout: UPSTREAM_TIMEOUT_MS,
  }, (pres) => {
    res.writeHead(pres.statusCode, pres.headers);
    pres.pipe(res);
  });
  preq.on("timeout", () => preq.destroy(new Error("upstream timeout")));
  preq.on("error", (e) => {
    const detail = e.code || e.message || e.name || "unknown";
    if (!res.headersSent) {
      res.writeHead(502, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "failover proxy upstream error: " + detail }));
    } else {
      res.destroy(e);
    }
  });
  req.pipe(preq);
});

server.listen(LISTEN_PORT, "0.0.0.0", () => {
  console.log(`[9r-failover] :${LISTEN_PORT} → local=${LOCAL} peer=${PEER}`);
});
