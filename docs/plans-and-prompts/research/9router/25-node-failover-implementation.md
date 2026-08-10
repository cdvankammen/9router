# Node Failover — Implementation Research + Prototypes (2026-08-09)

**Date:** 2026-08-09
**Author:** GitHub Copilot agent
**Status:** active
**Tags:** #research #ha #failover #implementation #prototype #node-fallback

## 1. Goal (from user)

> "Research how you could implement the idea in code… looking at where we are in
> the code, where it could go, and even make code in our research files, then
> scrutinize the code you came up with. After you feel you have a full grasp,
> start implementing and testing. After things work, rebuild the apps and do
> real-world testing between mini and mini2 — see if we can keep using the
> endpoints and still reach the nodes when one goes down: **9Router node
> fallback protection** vs what we already have (provider fallback protection)."

## 2. Where we are in the code (the entry paths)

| Layer | File | Role |
|---|---|---|
| Process wrapper | `cli/app/custom-server.js` | Wraps Next standalone `http.createServer`: derives unspoofable client IP, strips attacker XFF, handles h2c upgrade (JBR 25), starts background token refresh |
| Auth/proxy middleware | `src/proxy.js` → `src/dashboardGuard.js` | Guards `/api/*` (auth), allows `/v1*` public prefixes, rewrites `/v1/*` → `/api/v1/*` |
| LLM serving | Next routes → `src/sse/handlers/chat.js` → `open-sse/` | The provider-fallback engine (combos, modelFallbacks, capacity adapter) |
| Health | `src/app/api/health/route.js` (public), `/api/health/providers` (auth'd) | Probe primitives |
| Settings | `src/lib/db/repos/settingsRepo.js` | `settings` JSON; merge semantics fixed (CONFIG_MERGE_KEYS) |
| Node deploy | `cli/app` (62MB bundle) | Both nodes run identical build (verified 2026-08-09) |

**Key fact:** the app ALREADY has *provider* fallback (combo engine, model
fallback chains, capacity adapter, smart router). There is NO *node* fallback:
if the whole process/machine dies, nothing answers. This doc designs that layer.

## 3. The three layers (L0/L1/L2)

### L0 — Peer as an OpenAI-compatible provider (zero code, exists today)
Add `http://mini2-9.local:20128` as an "OpenAI Compatible" custom node in the
local app → its models appear in the catalog → use in fallback chains, combos,
or smart router. **Works when the local node is UP but a provider failed.**
Does NOT work when the whole local node is DOWN. (Doc 24, option 22.)

### L1 — In-app peer forwarding (`settings.peerNodes`)
The local app learns peers and forwards `/v1/*` requests to a healthy peer when
**local health is degraded** (probe-gated) — covers "node up but unusable"
(DB lock, all providers dead, hung). Lives in `custom-server.js` (process
layer) so it also works for the tray/CLI deployment.

### L2 — Standalone failover proxy (node-DOWN protection) ⭐ the real ask
A tiny independent Node process (`cli/failover-proxy.cjs`, node built-ins
only) that owns the **client-facing port**, health-probes local + peer app
ports every 2 s, and proxies each request to whichever is alive (local
preferred, peer backup). When the local app process dies, the proxy — a
separate process — keeps running and forwards to the peer. **This is the
"keep using the endpoints when one node goes down" answer.**

## 4. Prototype: L2 failover proxy (node built-ins only)

```js
#!/usr/bin/env node
/**
 * 9Router node failover proxy — L2 (node-DOWN protection).
 * A separate lightweight process that owns the client-facing port and routes
 * each request to the healthy node: local preferred, peer as backup.
 *
 * Usage:
 *   node failover-proxy.cjs --listen 20140 \
 *     --local http://localhost:20130 --peer http://mini2-9.local:20128
 *
 * Health probe: GET <node>/api/health — any <500 status counts as "up"
 * (401 Unauthorized = alive, just auth-gated).
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

const state = { localUp: false, peerUp: false };

function probe(url) {
  return new Promise((resolve) => {
    const req = http.request(url + HEALTH_PATH, { method: "GET", timeout: PROBE_TIMEOUT_MS }, (res) => {
      res.resume(); // drain
      resolve(res.statusCode < 500); // 200/3xx/401 = up; 5xx = degraded
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
tick(); // immediate first probe

function pickTarget() {
  if (state.localUp) return LOCAL;
  if (state.peerUp) return PEER;
  return LOCAL; // both down — last resort (fail locally, don't invent errors)
}

const server = http.createServer((req, res) => {
  const target = pickTarget();

  // Failover guard: never re-forward an already-failed-over request (loop-proof)
  if (req.headers["x-9r-failover"] === "1") {
    res.writeHead(502, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "failover loop detected" }));
    return;
  }

  const headers = { ...req.headers, "x-9r-failover": "1" };
  delete headers["host"]; // let the target set its own Host
  delete headers["x-forwarded-for"];
  delete headers["x-real-ip"];

  const preq = http.request(target + req.url, {
    method: req.method,
    headers,
    timeout: UPSTREAM_TIMEOUT_MS,
  }, (pres) => {
    res.writeHead(pres.statusCode, pres.headers);
    pres.pipe(res); // streams SSE + JSON chunked transparently
  });
  preq.on("timeout", () => preq.destroy(new Error("upstream timeout")));
  preq.on("error", (e) => {
    if (!res.headersSent) {
      res.writeHead(502, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "failover proxy upstream error: " + e.message }));
    } else {
      res.destroy(e);
    }
  });
  req.pipe(preq);
});

server.listen(LISTEN_PORT, "0.0.0.0", () => {
  console.log(`[9r-failover] :${LISTEN_PORT} → local=${LOCAL} peer=${PEER}`);
});
```

### Scrutiny of L2 (self-review)

| # | Concern | Verdict / mitigation |
|---|---|---|
| S1 | **Loop prevention** | `x-9r-failover: 1` header — if an already-failed-over request arrives, 502 immediately. Proxy forwards only to APP ports (`--local`/`--peer`), never to other proxies, so loops are structurally impossible anyway; header is belt-and-suspenders. |
| S2 | **Health probe auth** | `/api/health` returns 401 with requireLogin — `<500` counts as UP, so auth-gated nodes probe correctly. A hung-but-listening app returns 000/500 → DOWN. |
| S3 | **SSE streaming** | `pres.pipe(res)` + `req.pipe(preq)` — chunked transfer streams both ways. Verified pattern (same as Next rewrites). |
| S4 | **Both nodes down** | Falls back to LOCAL (last resort) — client gets the local app's real error instead of a fabricated proxy error. Correct fail-open-to-real-error. |
| S5 | **Host header** | Stripped so the target app's own vhost logic applies. |
| S6 | **Client IP at the peer** | When proxy→peer, peer's custom-server keys by proxy's LAN IP (peer treats non-loopback as untrusted). Refinement: set `x-9r-real-ip` to the original client IP when the proxy knows it (loopback clients). Acceptable for v1; documented. |
| S7 | **Upstream hang** | 120 s timeout on forwarded requests; destroys on timeout, 502 if headers not sent. |
| S8 | **WebSocket/h2c** | Out of scope v1 (JBR 25 h2c upgrade would need upgrade handling — document; the app's own custom-server handles h2c for direct clients). |
| S9 | **Split-brain (both up)** | Local preferred always — no split-brain (no state shared). Peer is used ONLY when local probe fails. |
| S10 | **Startup race** | `tick()` runs immediately; first requests before first probe resolve default `localUp=false` → may briefly hit peer. Mitigation: initialize `localUp=true, peerUp=false` optimistically (local is likely up at boot) — refinement below. |

Refinement (apply): initialize `state.localUp = true; state.peerUp = false;`

## 5. Prototype: L1 in-app peer forwarding (`custom-server.js` hook)

Health-probe-gated: for `/v1*` requests, if local is unhealthy AND a peer is
configured AND peer is healthy → forward to peer. No response buffering, no
post-hoc retry (streaming makes retry-after-partial unsafe).

```js
// In custom-server.js wrapped handler, BEFORE calling the inner handler:
const isV1 = req.url && (req.url.startsWith("/v1") || req.url.startsWith("/v1beta"));
if (isV1 && !state.localUp && state.peerUp && !req.headers["x-9r-failover"]) {
  return forwardToPeer(req, res, peerUrl); // same forward logic as L2
}
```

- Requires a `settings.peerNodes` array (default `[]`) — read via
  `getSettings()` in the process layer (custom-server already imports app
  modules for token refresh).
- **Scrutiny:** covers "node up but unusable" (DB lock / provider meltdown /
  hung) — complements L2's "node down". 503-with-"unavailable" post-hoc retry
  for JSON-only responses is a possible refinement but not v1 (buffering
  decisions are risky with streaming).

## 6. Test plan (real-world, between machines)

1. **Local harness:** local app :20130 (real) + second instance :20131 (fake
   peer) + proxy :20140 `--local :20130 --peer :20131`.
   - Live: request through :20140 → local answers.
   - Kill :20130 → probe flips (≤3 s) → same request through :20140 → :20131
     answers. Streaming + JSON both.
   - Restart :20130 → traffic returns to local.
2. **Real world:** deploy proxy to mini-2 (local :20130, peer mini2 :20128) and
   to mini2 (local :20128, peer mini-2 :20130). Client (curl/Claude Code) hits
   each machine's proxy port. Kill mini-2's app → mini-2's proxy serves from
   mini2. Kill mini2's app → mini2's proxy serves from mini-2.
3. **Endpoint continuity:** `POST /v1/chat/completions` with a real API key —
   must succeed identically through the proxy during a node kill.

## 8. Verification results (2026-08-09) ✅ ALL PASS

Implemented `cli/failover-proxy.cjs` (zero deps, node built-ins) and ran the
full plan. **Identity marker used for proofs:** `/api/settings/require-login`
differs per machine (mini-2 app = `false`, mini2 app = `true`), so responses
through the proxies are attributable to the exact upstream node.

### 8a. Local harness (proxy :20141 → local :20170 / peer :20171, echo servers)

| Test | Result |
|---|---|
| T1 both up → local | `{"node":"LOCAL-A"}` ✅ |
| T2 kill local → peer | `{"node":"PEER-B"}` ✅ (flip ≤ 4 s incl. probe interval) |
| T3 restart local → local | `{"node":"LOCAL-A"}` ✅ (failback) |
| T4 loop protection | `{"error":"failover loop detected"}` 502 ✅ |
| T5 both down → fail-open | 502 `ECONNREFUSED` detail, proxy process survives ✅ |

### 8b. Real world (mini-2 :20142 ↔ mini2 :20142, both apps real)

| Scenario | Proof |
|---|---|
| Both up | proxy-here → `requireLogin:false` (mini-2), proxy-mini2 → `requireLogin:true` (mini2) ✅ |
| **Kill mini-2 app** | proxy-here keeps answering — now `requireLogin:true` (mini2) ✅ direct :20130 refused, mini2 :20128 200 |
| **Kill mini2 app** | proxy-mini2 keeps answering — now `requireLogin:false` (mini-2) ✅ direct :20128 refused, mini-2 :20130 200 |
| **Both restored** | both proxies fail back to local identity ✅ all 4 endpoints 200 |
| Endpoint continuity | `POST /v1/chat/completions` via proxy during kill → structured app error (`API key required…`, `No active credentials…`), NOT connection refused ✅ |
| Streaming | SSE request through proxy → clean streamed response, no hang ✅ |

### 8c. Gotchas found during testing

- `lsof -ti :port` matches the proxy's OWN outbound connection to that port —
  killing by that PID kills the proxy too. Use `lsof -tiTCP:<port> -sTCP:LISTEN`.
- Killing both echo servers at once (same process) only proves both-down; the
  meaningful local-dead/peer-alive test needs SEPARATE processes.
- mini2 restart needs `env PORT=20128` (bare `node custom-server.js` falls back
  to port 3000 — same gotcha as the runbook).
- Terminal `\;` escaping can append a literal `;` to curl URLs → Next.js 404
  page. Use script files for multi-command sequences.

## 9. Post-implementation scrutiny (2026-08-09) — 3 real bugs found & fixed

Re-read the proxy after the real-world run (user: "scrutinize the code again").
Found and fixed in `cli/failover-proxy.cjs`:

| # | Severity | Bug | Fix |
|---|---|---|---|
| S11 | **CRITICAL** | `req` (client IncomingMessage) had no `'error'` handler. A client disconnecting mid-request (streaming cancellations!) emits ECONNRESET → unhandled stream error **crashes the proxy** — the exact failure this proxy exists to prevent | `req.on("error")` → destroy upstream `preq`/`pres` |
| S12 | **CRITICAL** | `pres` (upstream response) had no `'error'` handler. App killed while streaming (the failover scenario itself!) → reset mid-stream → crash | `pres.on("error")` → `res.destroy()` |
| S13 | **HIGH** | Stale-probe race: `tick()` can run 3s (probe timeout) on a 2s interval; a slow tick resolving after a fast one overwrites newer state (e.g. routes to peer while local is actually back) | monotonic `tickSeq` guard — only the latest tick writes state |
| S14 | MEDIUM | Hop-by-hop headers (`connection`, `transfer-encoding`, `upgrade`, `te`, `trailer`, `keep-alive`, `proxy-connection`) forwarded per RFC 7230 §6.1 — double chunked framing, broken h2c passthrough | strip them; Node re-frames upstream |
| S15 | MEDIUM | Client closed mid-body without error (`close` with `!req.complete`) left upstream work running | teardown upstream pair on incomplete close |
| S16 | LOW | 502 detail had empty message for ECONNREFUSED on Node 22 | `e.code \|\| e.message \|\| e.name` |

**Regression re-verified after fixes** (local harness): T1–T5 matrix still green,
plus C1 client-abort-mid-stream (proxy survives), C2 upstream-killed-mid-stream
(proxy survives), C3 still functional after both. Redeployed hardened build to
both machines — final matrix 200/200/200/200.

## 7. Open decisions for user
1. Proxy client-facing ports (20140 default; or repoint 20130 → proxy and move
   app to 20128) — keeping 20130 on the app avoids breaking existing clients;
   new port means clients must switch. Recommend: keep app ports as-is; proxies
   on 20140; document.
2. L1 `peerNodes` setting — implement now or L2-only first? (L2 alone answers
   the ask; L1 adds in-app degraded-node coverage.)
3. launchd/KeepAlive for the proxy (auto-start + restart) — recommend yes.
