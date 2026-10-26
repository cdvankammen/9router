/**
 * Route classifier for rate-limit buckets (backlog #1).
 *
 * Replaces magic-string URL detection with explicit route classification.
 * ESM twin of the inline CJS classifier in custom-server.rate-limiter.js;
 * behaviour is pinned to identical fixtures in route-classifier.test.js,
 * rate-limiter.test.cjs and rate-limiter-buckets.test.cjs.
 *
 * Buckets:
 * - static:   Next.js static assets (/_next/*) — bypass entirely (framework traffic)
 * - rsc:      RSC prefetches (?_rsc=) — bypass entirely (framework traffic)
 * - auth:     POST login/setup/reset-password only — tight bucket (brute-force
 *             protection). NOTE: /api/auth/status is polled by Header.js on
 *             every page load and deliberately stays in the api bucket.
 * - chat:     POST /v1/chat/completions, /v1/completions — tight bucket
 *             (expensive upstream LLM calls). GET uses the api bucket.
 * - api:      Other /api/* and /v1/* routes — general dashboard/gateway traffic
 * - general:  Everything else (fallback)
 */

// Route categories that bypass rate limiting entirely (framework traffic).
export const BYPASS_CATEGORIES = new Set(["static", "rsc"]);

// Bucket limits (requests per window). Tuned for a single-process server
// handling a LAN-exposed dashboard + LLM API gateway.
// MUST stay >= BURST_LIMIT (200 in rateLimiter.js) to preserve the two-tier
// invariant: burst cap fires first on spikes, window cap fires first on
// sustained abuse. The providers page alone fires 92 <Link> prefetches on
// mount, so api/general at 600/min (10 req/s avg) gives a 3× safety margin
// over the heaviest observed single-navigation burst.
export const BUCKET_LIMITS = {
  auth: 10,      // Tight: login brute-force protection (10/min = 1 every 6s)
  chat: 20,      // Tight: expensive upstream LLM calls (20/min = 1 every 3s)
  api: 600,      // General: dashboard API traffic (10 req/s average)
  general: 600,  // Fallback: same as api
};

/**
 * Classify a request into a rate-limit bucket.
 *
 * @param {string} url - Request URL path (may include query string)
 * @param {string} method - HTTP method (GET, POST, etc.)
 * @returns {"static"|"rsc"|"auth"|"chat"|"api"|"general"}
 */
export function classifyRoute(url, method) {
  if (!url) return "general";

  // Strip query string for path matching
  const path = url.split("?")[0].toLowerCase();
  const query = url.includes("?") ? url.slice(url.indexOf("?") + 1) : "";

  // 1. Next.js static assets — bypass entirely
  if (path.startsWith("/_next/")) {
    return "static";
  }

  // 2. RSC prefetches — bypass entirely (framework-generated, not user traffic).
  //    Restricted to page routes only: an attacker appending ?_rsc=1 to
  //    /api/auth/login would otherwise bypass the 10-req/min brute-force
  //    protection. Next.js only emits _rsc prefetches for rendered pages,
  //    never for API routes, so this restriction is safe (Round 9 finding).
  if (query.includes("_rsc=") && !path.startsWith("/api/") && !path.startsWith("/v1/") && !path.startsWith("/v1beta/")) {
    return "rsc";
  }

  // 3. Credential-submission auth routes — tighter bucket (brute-force protection).
  //    Narrow: only POST to login/setup/reset-password. /api/auth/status is polled
  //    by Header.js on every page load and MUST stay in the api bucket.
  if (method === "POST") {
    if (
      path === "/api/auth/login" ||
      path === "/api/auth/setup" ||
      path === "/api/auth/reset-password"
    ) {
      return "auth";
    }
  }

  // 4. LLM completions — tighter bucket (expensive upstream calls)
  // Only POST to these endpoints counts as "chat"; GET uses general bucket.
  if (method === "POST") {
    if (
      path === "/v1/chat/completions" ||
      path === "/v1/completions" ||
      path.endsWith("/v1/chat/completions") ||
      path.endsWith("/v1/completions")
    ) {
      return "chat";
    }
  }

  // 5. Dashboard API routes — general bucket
  if (path.startsWith("/api/")) {
    return "api";
  }

  // 6. Public LLM API routes (when accessed via /api/v1/* rewrites)
  if (path.startsWith("/v1/") || path.startsWith("/v1beta/")) {
    return "api";
  }

  // 7. Fallback
  return "general";
}

/**
 * Check if a route category should bypass rate limiting entirely.
 * @param {string} category - Route category from classifyRoute
 * @returns {boolean}
 */
export function shouldBypass(category) {
  return BYPASS_CATEGORIES.has(category);
}

/**
 * Get the rate limit for a bucket.
 * @param {string} bucket - Bucket name from classifyRoute
 * @returns {number} Max requests per window
 */
export function getBucketLimit(bucket) {
  return BUCKET_LIMITS[bucket] || BUCKET_LIMITS.general;
}
