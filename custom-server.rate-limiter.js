/**
 * Inbound rate limiter — per-IP sliding-window counter.
 *
 * Designed for the 9router custom-server.js request wrapper. Lightweight,
 * zero-dependency, in-memory only (no external state store needed for a
 * single-process Node.js server).
 *
 * Algorithm: Sliding-window counter (rolling window per ip|category bucket).
 *   - Two fixed-size maps (counters + timestamps) keyed by "ip|category".
 *   - On each request: increment counter, record timestamp.
 *   - Window rolls: if oldest entry is outside window, reset counter.
 *   - Excess cleanup: if counter exceeds limit AND window expired, reset.
 *   - Periodic sweep (every 60 s): evict entries older than 2× window to
 *     prevent unbounded memory growth on a LAN-exposed server.
 *
 * Buckets (per-IP, independent):
 *   - auth:       10 req/min  — POST login/setup/reset-password
 *   - chat:       20 req/min  — POST /v1/chat/completions, /v1/completions
 *   - api:       120 req/min  — /api/* (other), /v1/*
 *   - general:   120 req/min  — everything else
 *   - static/rsc: bypass      — Next.js framework traffic (never counted)
 *   - localhost:  unlimited   — loopback IPs bypass all rate limiting
 *
 * HTTP response on limit:
 *   429 Too Many Requests + Retry-After header (seconds until next slot).
 *
 * @module custom-server.rate-limiter
 */

"use strict";

// ── Config ─────────────────────────────────────────────────────────────────
const WINDOW_MS = 60_000;       // 1 minute sliding window

// Per-bucket limits. Mirrors src/lib/middleware/routeClassifier.js (the ESM
// twin used by the Next middleware). This file is CommonJS — loaded by
// custom-server.js before Next/ESM is available — so it keeps its own copy of
// the classifier. The two are pinned to identical behaviour by the shared
// fixture tables in rate-limiter.test.cjs, rate-limiter-buckets.test.cjs and
// route-classifier.test.js.
const LIMITS = {
  auth:     10,                 // POST login/setup/reset-password — brute-force protection
  chat:     20,                 // POST /v1/chat/completions, /v1/completions — expensive LLM calls
  api:     120,                 // /api/* (other), /v1/* — dashboard + gateway traffic
  general: 120,                 // fallback bucket
};

// Categories that bypass rate limiting entirely. These are framework traffic,
// not user traffic: RSC flight-data prefetches (?_rsc=…) and static chunks
// (/_next/…). A busy dashboard with many <Link>s emits 50+ of them per page
// load, so counting them would 429-storm the console (Finding #16).
const BYPASS_CATEGORIES = new Set(["static", "rsc"]);

// Loopback addresses that bypass all rate limiting (local tool usage).
const LOOPBACK = new Set([
  "127.0.0.1", "::1", "::ffff:127.0.0.1",
]);

// ── State ──────────────────────────────────────────────────────────────────
// Keyed by "ip|category" so each bucket has an independent per-IP budget —
// auth brute-force can't starve dashboard traffic and vice versa.
const counters   = new Map();   // "ip|category" → count
const timestamps = new Map();   // "ip|category" → last-request epoch (ms)
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
 *
 * CommonJS twin of src/lib/middleware/routeClassifier.js — kept inline because
 * this file loads before Next/ESM is available. Behaviour is pinned to the ESM
 * classifier by the shared fixture tables in the test suites.
 *
 * @param {string} url     Request URL (path + optional query string).
 * @param {string} method  HTTP method.
 * @returns {'static'|'rsc'|'auth'|'chat'|'api'|'general'}
 */
function classifyRequest(url, method) {
  if (!url) return "general";
  const qIdx = url.indexOf("?");
  const path = (qIdx === -1 ? url : url.slice(0, qIdx)).toLowerCase();
  const query = qIdx === -1 ? "" : url.slice(qIdx + 1);

  // Framework traffic — bypass buckets entirely (never counted, never 429'd).
  if (path.startsWith("/_next/")) return "static";
  // RSC prefetches are only legitimate on dashboard/page routes, never on API
  // endpoints. An attacker appending ?_rsc=1 to /api/auth/login would otherwise
  // bypass the 10-req/min brute-force protection (Round 9 finding).
  if (query.indexOf("_rsc=") !== -1 && !path.startsWith("/api/") && !path.startsWith("/v1/") && !path.startsWith("/v1beta/")) return "rsc";

  if (method === "POST") {
    // Credential-submission endpoints — tight bucket (brute-force protection).
    // NOTE: /api/auth/status is polled on every page load and stays in "api".
    if (
      path === "/api/auth/login" ||
      path === "/api/auth/setup" ||
      path === "/api/auth/reset-password"
    ) return "auth";

    // Expensive LLM completions — tight bucket. GET uses the api bucket.
    if (
      path === "/v1/chat/completions" ||
      path === "/v1/completions" ||
      path.endsWith("/v1/chat/completions") ||
      path.endsWith("/v1/completions")
    ) return "chat";
  }

  if (path.startsWith("/api/")) return "api";
  if (path.startsWith("/v1/") || path.startsWith("/v1beta/")) return "api";
  return "general";
}

/**
 * Check whether a request from `ip` is allowed.
 *
 * @param {string} ip      Client IP (from req.socket.remoteAddress or x-9r-real-ip).
 * @param {string} url     Request URL path.
 * @param {string} method  HTTP method (GET, POST, …).
 * @returns {{ allowed: boolean, retryAfter?: number, category: string }}
 *   `allowed: true` if within budget; `allowed: false` with `retryAfter` seconds
 *   if the budget is exhausted. `category` is the bucket that was applied.
 */
function checkLimit(ip, url, method) {
  // Loopback always allowed (local tool usage).
  if (isLoopback(ip)) return { allowed: true, category: "loopback" };

  const category = classifyRequest(url, method);

  // Framework traffic bypasses entirely — no counter increment, so it can't
  // starve real requests or be 429'd itself.
  if (BYPASS_CATEGORIES.has(category)) return { allowed: true, category };

  const limit = LIMITS[category] || LIMITS.general;
  const key = ip + "|" + category;

  // Roll window if expired.
  if (windowExpired(key)) reset(key);

  const count = counters.get(key) || 0;
  if (count < limit) {
    counters.set(key, count + 1);
    return { allowed: true, category };
  }

  // Budget exhausted — compute seconds until the window resets.
  const elapsed = Date.now() - timestamps.get(key);
  const retryAfter = Math.max(1, Math.ceil((WINDOW_MS - elapsed) / 1000));
  return { allowed: false, retryAfter, category };
}

// Start periodic sweep on module load.
sweep();

// ── Exports ────────────────────────────────────────────────────────────────
module.exports = { checkLimit, classifyRequest, LIMITS, WINDOW_MS, BYPASS_CATEGORIES };
