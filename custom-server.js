const http = require("http");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const { pathToFileURL } = require("url");
// SECURITY (Finding #289): per-IP sliding-window rate limiter. The CLI variant
// (cli/app/custom-server.js) already wires this in; the root custom-server.js
// used by `npm start` / standalone builds did not, leaving /v1/* and dashboard
// endpoints with no TCP-layer budget. Loopback IPs bypass (local tool usage).
const { checkLimit } = require("./custom-server.rate-limiter");

const origCreate = http.createServer.bind(http);

// Per-process secret proving x-9r-real-ip was stamped below rather than sent by the client.
// A bare `next start` / `next dev` never loads this file, so it cannot produce a matching
// header even though the env var is inherited by child processes. Named like x-9r-cli-token
// so the request-detail header sanitizer redacts it too.
const PEER_TOKEN = crypto.randomBytes(24).toString("hex");
process.env.NINEROUTER_PEER_TOKEN = PEER_TOKEN;

let backgroundRefreshStarted = false;

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
    // SECURITY (Finding #303): strip client-spoofable x-9r-* identity headers
    // at the TCP-socket boundary. open-sse/utils/clientDetector.js trusts
    // x-9r-app, x-9router-app, x-9r-user, x-9router-user, x-9r-session,
    // x-9router-session to override detected clientTool/sourceApp/session.
    // Without stripping here, any LAN peer can set these headers to forge
    // telemetry identity AND trigger native-passthrough mode (#304) which
    // skips translator sanitization. Only the gateway itself should inject
    // verified values of these headers (and it does so downstream after
    // auth checks).
    delete req.headers["x-9r-app"];
    delete req.headers["x-9router-app"];
    delete req.headers["x-9r-user"];
    delete req.headers["x-9router-user"];
    delete req.headers["x-9r-session"];
    delete req.headers["x-9router-session"];
    // Bug GG (2026-10-27): strip host/proto forwarding headers so route
    // handlers (notably oidc.js/saml.js getPublicOrigin) cannot be tricked
    // into building attacker-controlled redirect_uri values when BASE_URL
    // is unset. These headers must only be trusted from a verified reverse
    // proxy; custom-server.js is the TCP-socket boundary, so strip them
    // unconditionally here and only re-stamp safe equivalents if/when a
    // trusted proxy layer is introduced.
    delete req.headers["x-forwarded-host"];
    delete req.headers["x-forwarded-proto"];
    delete req.headers["x-forwarded-server"];
    delete req.headers["x-original-host"];
    delete req.headers["x-real-host"];
    req.headers["x-9r-real-ip"] = ip;
    req.headers["x-9r-peer-token"] = PEER_TOKEN;
    if (viaProxy) req.headers["x-9r-via-proxy"] = "1";

    // Security headers — clickjacking + MIME-sniffing protection.
    // Injected at the socket layer so every response (dashboard HTML, API JSON,
    // static assets) gets them. Browsers ignore frame-ancestors on non-HTML
    // content types; X-Content-Type-Options is universally safe.
    // Routes that need to be embeddable (e.g. /api/mimo/login upstream proxy)
    // override these via res.setHeader() before writeHead, which takes precedence.
    if (!res.getHeader("x-frame-options")) {
      res.setHeader("X-Frame-Options", "SAMEORIGIN");
    }
    if (!res.getHeader("content-security-policy")) {
      res.setHeader("Content-Security-Policy", "frame-ancestors 'self'");
    }
    if (!res.getHeader("x-content-type-options")) {
      res.setHeader("X-Content-Type-Options", "nosniff");
    }
    if (!res.getHeader("referrer-policy")) {
      res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    }

    // ── Inbound rate limiting (per-IP sliding window) ──────────────────────
    // SECURITY (Finding #289): apply the same budget the CLI variant enforces.
    // `ip` is derived from the TCP socket above (unspoofable — XFF stripped
    // unless the peer is a verified loopback reverse proxy), so an attacker
    // cannot rotate their bucket via X-Forwarded-For. Loopback IPs bypass
    // (local tool usage); static/RSC framework traffic bypasses (Finding #16).
    const rl = checkLimit(ip, req.url, req.method);
    if (!rl.allowed) {
      res.writeHead(429, {
        "Content-Type": "application/json",
        "Retry-After": String(rl.retryAfter),
        "X-RateLimit-Limit": "see custom-server.rate-limiter",
      });
      res.end(JSON.stringify({
        error: "Too Many Requests",
        retryAfter: rl.retryAfter,
        message: "Rate limit exceeded. Retry after " + rl.retryAfter + " seconds.",
      }));
      return;
    }

    return handler(req, res);
  };
  const server = origCreate(...rest, wrapped);
  server.once("listening", () => {
    startBackgroundTokenRefreshFromCustomServer();
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
