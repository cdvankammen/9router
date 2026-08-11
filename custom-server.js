const http = require("http");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const { pathToFileURL } = require("url");

const origCreate = http.createServer.bind(http);

// Per-process secret proving x-9r-real-ip was stamped below rather than sent by the client.
// A bare `next start` / `next dev` never loads this file, so it cannot produce a matching
// header even though the env var is inherited by child processes. Named like x-9r-cli-token
// so the request-detail header sanitizer redacts it too.
const PEER_TOKEN = crypto.randomBytes(24).toString("hex");
process.env.NINEROUTER_PEER_TOKEN = PEER_TOKEN;

let backgroundRefreshStarted = false;

// ── L1 in-app peer forwarding (node failover) ───────────────────────────────
// When the LOCAL node is up but degraded (health probe failing), /v1* requests
// are forwarded to the first healthy peer from settings.peerNodes. Complements
// the L2 standalone proxy (cli/failover-proxy.cjs) which covers node-DOWN.
// This hook lives in the process layer so it works for tray/CLI deployments.
const L1 = {
  enabled: false,
  peers: [],            // [{ url, up }]
  localUp: true,        // optimistic at boot (avoids startup flap)
  localPort: null,      // set from the actual listening socket
  probeMs: 5000,
  probeTimeoutMs: 2000,
  upstreamTimeoutMs: 120000,
  timer: null,
  settingsLoaded: false,
  loadAttempts: 0,      // settings-load retry counter (DB may not be ready at boot)
};

function l1Probe(url) {
  return new Promise((resolve) => {
    const req = http.request(url + "/api/health", { method: "GET", timeout: L1.probeTimeoutMs }, (res) => {
      res.resume(); // drain so the socket can be reused
      resolve(res.statusCode < 500); // 401 = alive, just auth-gated
    });
    req.on("error", () => resolve(false));
    req.on("timeout", () => { req.destroy(); resolve(false); });
    req.end();
  });
}

async function l1Tick() {
  if (!L1.enabled || L1.peers.length === 0) return;
  const localUrl = "http://127.0.0.1:" + (L1.localPort || process.env.PORT || 3000);
  const results = await Promise.all([
    l1Probe(localUrl),
    ...L1.peers.map((p) => l1Probe(p.url)),
  ]);
  L1.localUp = results[0];
  L1.peers.forEach((p, i) => { p.up = results[i + 1]; });
}

async function l1LoadSettings() {
  try {
    const modPath = path.join(__dirname, "src", "lib", "db", "repos", "settingsRepo.js");
    const { getSettings } = await import(pathToFileURL(modPath).href);
    const settings = await getSettings();
    const peers = Array.isArray(settings.peerNodes) ? settings.peerNodes : [];
    L1.enabled = peers.length > 0;
    L1.peers = peers.map((url) => ({ url: String(url).replace(/\/+$/, ""), up: false }));
    L1.settingsLoaded = true;
    if (L1.enabled && !L1.timer) {
      L1.timer = setInterval(l1Tick, L1.probeMs);
      l1Tick();
    } else if (!L1.enabled && L1.timer) {
      clearInterval(L1.timer);
      L1.timer = null;
    }
  } catch (e) {
    // DB adapter may not be ready at boot (Next app initializes it lazily).
    // Retry with backoff instead of silently staying off — L1 must activate
    // once the app is up. Give up after ~30s (published CLI standalone has no
    // src/ on disk, so this is expected there and L1 stays off).
    const delay = Math.min(1000 * 2 ** (L1.loadAttempts || 0), 5000);
    L1.loadAttempts = (L1.loadAttempts || 0) + 1;
    if (L1.loadAttempts <= 10) {
      if (process.env.DEBUG_L1_PEER_FORWARD) {
        console.error(`[L1] settings load failed (attempt ${L1.loadAttempts}, retry in ${delay}ms):`, e && e.message ? e.message : e);
      }
      setTimeout(l1LoadSettings, delay);
    } else if (process.env.DEBUG_L1_PEER_FORWARD) {
      console.error("[L1] settings load gave up after 10 attempts:", e && e.message ? e.message : e);
    }
  }
}

// Forward a /v1* request to a healthy peer (same logic as the L2 proxy).
function l1Forward(req, res, peerUrl) {
  const headers = { ...req.headers, "x-9r-failover": "1" };
  for (const h of ["host", "connection", "keep-alive", "proxy-connection",
    "transfer-encoding", "te", "trailer", "upgrade",
    "x-forwarded-for", "x-real-ip"]) {
    delete headers[h];
  }
  let pres;
  const preq = http.request(peerUrl + req.url, {
    method: req.method,
    headers,
    timeout: L1.upstreamTimeoutMs,
  }, (p) => {
    pres = p;
    res.writeHead(p.statusCode, p.headers);
    p.pipe(res);
    p.on("error", () => res.destroy());
  });
  preq.on("timeout", () => preq.destroy(new Error("upstream timeout")));
  preq.on("error", (e) => {
    const detail = e.code || e.message || e.name || "unknown";
    if (!res.headersSent && !res.destroyed) {
      res.writeHead(502, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "L1 peer forward failed: " + detail }));
    } else {
      res.destroy(e);
    }
  });
  req.on("error", () => { preq.destroy(); if (pres) pres.destroy(); });
  res.on("error", () => { preq.destroy(); if (pres) pres.destroy(); });
  req.pipe(preq);
}

// Decide whether to forward this request to a peer. Returns true if handled.
function l1MaybeForward(req, res) {
  if (!L1.enabled || L1.peers.length === 0) return false;
  if (req.headers["x-9r-failover"] === "1") return false; // loop protection
  const isV1 = req.url && (req.url.startsWith("/v1") || req.url.startsWith("/v1beta"));
  if (!isV1) return false;
  if (L1.localUp) return false; // local healthy — serve normally
  const peer = L1.peers.find((p) => p.up);
  if (!peer) return false; // no healthy peer — fail locally with the app's real error
  l1Forward(req, res, peer.url);
  return true;
}

function startBackgroundTokenRefreshFromCustomServer() {
  if (backgroundRefreshStarted) return;
  backgroundRefreshStarted = true;
  // Prefer source path (repo / standalone that still has src). Fail-open if missing
  // — initializeApp also starts the same scheduler when the Next app boots.
  const modPath = path.join(__dirname, "src", "sse", "services", "backgroundTokenRefresh.js");
  import(pathToFileURL(modPath).href)
    .then((m) => {
      try {
        m.startBackgroundTokenRefresh();
      } catch (e) {
        console.error("[BackgroundTokenRefresh] start failed:", e && e.message ? e.message : e);
      }
      const stop = () => {
        try {
          m.stopBackgroundTokenRefresh();
        } catch {
          /* ignore */
        }
      };
      process.once("SIGINT", stop);
      process.once("SIGTERM", stop);
    })
    .catch((e) => {
      // Expected in published CLI standalone (src/ not on disk). App bootstrap covers it.
      if (process.env.DEBUG_BACKGROUND_TOKEN_REFRESH) {
        console.error("[BackgroundTokenRefresh] import failed:", e && e.message ? e.message : e);
      }
    });
}

// Wrap Next standalone HTTP server: derive client IP from the TCP socket
// (unspoofable) and strip client-supplied forwarding headers so downstream
// rate-limiting keys on the real peer address instead of attacker-controlled XFF.
http.createServer = (...args) => {
  const handler = args.find((a) => typeof a === "function");
  const rest = args.filter((a) => typeof a !== "function");
  if (!handler) return origCreate(...args);
  const wrapped = (req, res) => {
    // L1 peer forwarding: local degraded + healthy peer configured → forward
    // /v1* requests before the inner handler runs (no buffering, streaming-safe).
    if (l1MaybeForward(req, res)) return;
    const socketIp = req.socket && req.socket.remoteAddress ? req.socket.remoteAddress : "";
    const xff = req.headers["x-forwarded-for"];
    const xRealIp = req.headers["x-real-ip"];
    const viaProxy = !!(xff || xRealIp);
    const isLoopbackProxy = socketIp === "127.0.0.1" || socketIp === "::1" || socketIp === "::ffff:127.0.0.1";
    // Trust forwarding headers only when the TCP peer is a local reverse proxy.
    // Direct/public sockets remain keyed by the unspoofable peer address.
    const proxyIp = xRealIp || (xff ? String(xff).split(",")[0].trim() : "");
    const ip = isLoopbackProxy && proxyIp ? proxyIp : socketIp;
    delete req.headers["x-9r-real-ip"];
    delete req.headers["x-forwarded-for"];
    delete req.headers["x-9r-via-proxy"];
    delete req.headers["x-9r-peer-token"];
    req.headers["x-9r-real-ip"] = ip;
    req.headers["x-9r-peer-token"] = PEER_TOKEN;
    if (viaProxy) req.headers["x-9r-via-proxy"] = "1";
    return handler(req, res);
  };
  const server = origCreate(...rest, wrapped);
  server.once("listening", () => {
    const addr = server.address();
    if (addr && typeof addr === "object") L1.localPort = addr.port;
    startBackgroundTokenRefreshFromCustomServer();
    l1LoadSettings();
  });
  const origEmit = server.emit;
  // JBR 25 sends h2c upgrades that the HTTP/1.1 server would otherwise close.
  server.emit = function (event, ...eventArgs) {
    const [req, socket, head] = eventArgs;
    if (event !== "upgrade" || String(req.headers.upgrade || "").toLowerCase() !== "h2c") {
      return origEmit.call(this, event, ...eventArgs);
    }

    const contentLength = Number(req.headers["content-length"] || 0);
    if (!Number.isSafeInteger(contentLength) || contentLength < 0) {
      socket.destroy();
      return true;
    }
    const chunks = [head];
    let received = head.length;
    const serve = () => {
      // Replay the upgraded request through the existing HTTP/1.1 handler.
      const replay = new http.IncomingMessage(socket);
      Object.assign(replay, { method: req.method, url: req.url, headers: req.headers, complete: true });
      if (received) replay.push(Buffer.concat(chunks, received).subarray(0, contentLength));
      replay.push(null);
      const res = new http.ServerResponse(replay);
      res.shouldKeepAlive = false;
      res.assignSocket(socket);
      res.once("finish", () => socket.end());
      Promise.resolve().then(() => wrapped(replay, res)).catch((error) => {
        console.error("Failed to downgrade h2c request", error);
        socket.destroy();
      });
    };
    if (received >= contentLength) serve();
    else {
      socket.on("data", function readBody(chunk) {
        chunks.push(chunk);
        received += chunk.length;
        if (received < contentLength) return;
        socket.off("data", readBody);
        serve();
      });
      socket.resume();
    }
    delete req.headers.upgrade;
    delete req.headers["http2-settings"];
    req.headers.connection = "close";
    return true;
  };
  return server;
};

if (require.main === module) {
  const standalone = path.join(__dirname, "server.js");
  if (fs.existsSync(standalone)) {
    require(standalone);
  } else {
    // Repo checkout has no standalone build next to us. `next start` builds its HTTP
    // server in-process, so the wrapper above still sanitizes every request.
    const nextBin = require.resolve("next/dist/bin/next");
    process.argv = [process.argv[0], nextBin, "start", ...process.argv.slice(2)];
    require(nextBin);
  }
}
