/**
 * Inbound rate limiter — per-IP sliding-window counter.
 *
 * Designed for the 9router custom-server.js request wrapper. Lightweight,
 * zero-dependency, in-memory only (no external state store needed for a
 * single-process Node.js server).
 *
 * Algorithm: Sliding-window counter (rolling window per IP).
 *   - Two fixed-size maps (counters + timestamps) keyed by IP.
 *   - On each request: increment counter, record timestamp.
 *   - Window rolls: if oldest entry is outside window, reset counter.
 *   - Excess cleanup: if counter exceeds limit AND window expired, reset.
 *   - Periodic sweep (every 60 s): evict entries older than 2× window to
 *     prevent unbounded memory growth on a LAN-exposed server.
 *
 * Limits:
 *   - general:  120 req/min  — /api/*, /v1/*, static assets, health checks
 *   - chat:      20 req/min  — /v1/chat/completions, /v1/completions (POST)
 *   - localhost: unlimited   — loopback IPs bypass all rate limiting
 *
 * HTTP response on limit:
 *   429 Too Many Requests + Retry-After header (seconds until next slot).
 *
 * @module custom-server.rate-limiter
 */

"use strict";

// ── Config ─────────────────────────────────────────────────────────────────
const WINDOW_MS = 60_000;       // 1 minute sliding window
const LIMITS = {
  general: 120,                 // max requests per window — general endpoints
  chat:     20,                 // max requests per window — chat completions
};

// Loopback addresses that bypass all rate limiting (local tool usage).
const LOOPBACK = new Set([
  "127.0.0.1", "::1", "::ffff:127.0.0.1",
]);

// Chat-completion path prefixes (case-insensitive match on req.url).
const CHAT_PATHS = ["/v1/chat/completions", "/v1/completions"];

// ── State ──────────────────────────────────────────────────────────────────
const counters   = new Map();   // ip → count
const timestamps = new Map();   // ip → last-request epoch (ms)
let lastCleanup  = Date.now();

// ── Internal ───────────────────────────────────────────────────────────────

function isLoopback(ip) {
  if (!ip) return false;
  return LOOPBACK.has(ip)
      || ip.startsWith("127.")
      || ip === "::ffff:127.0.0.1";
}

function windowExpired(ip) {
  const ts = timestamps.get(ip);
  return ts == null || (Date.now() - ts) > WINDOW_MS;
}

function reset(ip) {
  counters.set(ip, 0);
  timestamps.set(ip, Date.now());
}

/** Periodic sweep: remove entries older than 2× window. */
function sweep() {
  const now = Date.now();
  if (now - lastCleanup < 60_000) return;
  lastCleanup = now;
  const cutoff = now - WINDOW_MS * 2;
  for (const [ip, ts] of timestamps) {
    if (ts < cutoff) {
      timestamps.delete(ip);
      counters.delete(ip);
    }
  }
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Classify a request into a rate-limit bucket.
 * @param {string} url  The request URL path.
 * @param {string} method  HTTP method.
 * @returns {'chat'|'general'}
 */
function classifyRequest(url, method) {
  // Only POST to chat endpoints gets the tighter chat bucket.
  // GET /v1/models, GET /v1/chat/completions, etc. use general bucket.
  if (method === "POST") {
    const u = url.split("?")[0].toLowerCase();
    for (const p of CHAT_PATHS) {
      if (u.endsWith(p)) return "chat";
    }
  }
  return "general";
}

/**
 * Check whether a request from `ip` is allowed.
 *
 * @param {string} ip      Client IP (from req.socket.remoteAddress or x-9r-real-ip).
 * @param {string} url     Request URL path.
 * @param {string} method  HTTP method (GET, POST, …).
 * @returns {{ allowed: boolean, retryAfter?: number }}
 *   `allowed: true` if within budget; `allowed: false` with `retryAfter` seconds
 *   if the budget is exhausted.
 */
function checkLimit(ip, url, method) {
  // Loopback always allowed (local tool usage).
  if (isLoopback(ip)) return { allowed: true };

  const bucket = classifyRequest(url, method);
  const limit  = LIMITS[bucket];

  // Roll window if expired.
  if (windowExpired(ip)) reset(ip);

  const count = counters.get(ip) || 0;
  if (count < limit) {
    counters.set(ip, count + 1);
    return { allowed: true };
  }

  // Budget exhausted — compute seconds until oldest entry exits the window.
  const elapsed = Date.now() - timestamps.get(ip);
  const retryAfter = Math.max(1, Math.ceil((WINDOW_MS - elapsed) / 1000));
  return { allowed: false, retryAfter };
}

// Start periodic sweep on module load.
sweep();

// ── Exports ────────────────────────────────────────────────────────────────
module.exports = { checkLimit, LIMITS, WINDOW_MS };
