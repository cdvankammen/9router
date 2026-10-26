// General-purpose in-memory rate limiter for API routes.
// Complements loginLimiter.js (login-specific lockout) with per-IP request throttling.
// Resets on process restart. Uses trusted peer headers when available.

import { getClientIp } from "@/lib/auth/loginLimiter.js";
import { classifyRoute, shouldBypass, getBucketLimit } from "./routeClassifier.js";

let cachedNextResponse = null;
export function __setNextResponse(nr) { cachedNextResponse = nr; }

const DEFAULT_WINDOW_MS = 60_000; // 1 minute sliding window
// 600/min = 10 req/s average. Raised from 120 after the providers page (92 <Link>
// prefetches on mount) demonstrated that the old 2 req/s average was too tight
// for a dashboard that legitimately fires 80-150 requests on a single human-pace
// navigation. This is the fallback when a bucket has no classifier-specific limit;
// per-category limits in routeClassifier.js take precedence via getBucketLimit().
// MUST stay >= BURST_LIMIT to preserve the two-tier invariant (burst fires first
// on spikes, window fires first on sustained abuse).
const DEFAULT_MAX_REQUESTS = 600;
// 200 burst — raised from 30 after the providers page (92 <Link> prefetches +
// dashboardGuard API probes) demonstrated that a single human-pace navigation
// to a heavy page routinely fires 80-150 requests on mount. The lower limit
// was the direct cause of Finding #1 in 51-mini2-dashboard-dom-error-audit.md
// recurring on v5-vscode-works (14/16 pages 429'd under 5s inter-page pacing).
// Per-(IP, category) buckets already prevent cross-category starvation, so
// the higher burst ceiling does not weaken brute-force protection on /api/auth/*.
const BURST_LIMIT = 200;
const BURST_WINDOW_MS = 5_000; // 5s burst window

// Per-(IP, category) state: ip → Map(category → { count, resetAt, burstCount, burstResetAt })
const buckets = new Map();

function now() {
  return Date.now();
}

function getCategoryBucket(ip, category) {
  const t = now();
  let ipMap = buckets.get(ip);
  if (!ipMap) {
    ipMap = new Map();
    buckets.set(ip, ipMap);
  }
  const windowMs = DEFAULT_WINDOW_MS;
  let b = ipMap.get(category);
  if (!b || t >= b.resetAt) {
    b = { count: 0, resetAt: t + windowMs, burstCount: 0, burstResetAt: t + BURST_WINDOW_MS };
    ipMap.set(category, b);
  }
  if (t >= b.burstResetAt) {
    b.burstCount = 0;
    b.burstResetAt = t + BURST_WINDOW_MS;
  }
  return b;
}

/**
 * Check if a request should be rate-limited.
 *
 * Routes are classified into buckets (static, rsc, auth, chat, api, general)
 * via routeClassifier.js. Static/RSC bypass entirely; each other bucket has
 * its own per-IP counter so auth brute-force can't starve dashboard traffic.
 *
 * @param {Request} request - The incoming request
 * @param {object} options - Optional overrides (kept for backward compat with tests)
 * @param {number} options.windowMs - Ignored when classifier is active; kept for API compat
 * @param {number} options.maxRequests - When provided AND no classifier match, overrides the bucket limit
 * @returns {{ limited: boolean, remaining: number, retryAfter?: number, resetAt: number, category?: string }}
 */
export function checkRateLimit(request, options = {}) {
  // Classify on path + query so the classifier can see ?_rsc= prefetches.
  const nu = request.nextUrl;
  const url = nu ? `${nu.pathname || ""}${nu.search || ""}` : (request.url || "");
  const method = request.method || "GET";
  const category = classifyRoute(url, method);

  // Framework traffic bypasses entirely — no counter increment.
  if (shouldBypass(category)) {
    return {
      limited: false,
      remaining: Number.MAX_SAFE_INTEGER,
      resetAt: now() + DEFAULT_WINDOW_MS,
      category,
    };
  }

  const ip = getClientIp(request);
  const bucket = getCategoryBucket(ip, category);
  const maxRequests = options.maxRequests || getBucketLimit(category);
  const t = now();

  bucket.count++;
  bucket.burstCount++;

  // Burst protection
  if (bucket.burstCount > BURST_LIMIT) {
    const retryAfter = Math.ceil((bucket.burstResetAt - t) / 1000);
    return {
      limited: true,
      remaining: 0,
      retryAfter,
      resetAt: bucket.resetAt,
      category,
    };
  }

  // Window limit
  if (bucket.count > maxRequests) {
    const retryAfter = Math.ceil((bucket.resetAt - t) / 1000);
    return {
      limited: true,
      remaining: 0,
      retryAfter,
      resetAt: bucket.resetAt,
      category,
    };
  }

  return {
    limited: false,
    remaining: maxRequests - bucket.count,
    resetAt: bucket.resetAt,
    category,
  };
}

/**
 * Create a NextResponse-compatible rate-limit rejection.
 * @param {object} result - Result from checkRateLimit
 * @param {Function} NextResponseClass - The NextResponse class (avoids ESM/CJS import issues)
 */
export function rateLimitResponse(result, NextResponseClass = null) {
  // Lazy import only if caller didn't provide NextResponse (test scenarios).
  let NR = NextResponseClass;
  if (!NR) {
    // Dynamic ESM import — cached at module level on first call.
    if (!cachedNextResponse) {
      // Synchronous-ish fallback: caller MUST pass NextResponse in production.
      throw new Error("rateLimitResponse requires NextResponse class as second argument in ESM context");
    }
    NR = cachedNextResponse;
  }
  return NR.json(
    { error: "Too many requests" },
    {
      status: 429,
      headers: {
        "Retry-After": String(result.retryAfter || 60),
        "X-RateLimit-Limit": String(DEFAULT_MAX_REQUESTS),
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
      },
    }
  );
}

/**
 * Add rate-limit headers to an existing response.
 */
export function addRateLimitHeaders(response, result, maxRequests = DEFAULT_MAX_REQUESTS) {
  response.headers.set("X-RateLimit-Limit", String(maxRequests));
  response.headers.set("X-RateLimit-Remaining", String(result.remaining));
  response.headers.set("X-RateLimit-Reset", String(Math.ceil(result.resetAt / 1000)));
  return response;
}

// For testing: clear all buckets
export function __resetBuckets() {
  buckets.clear();
}

export const __test__ = {
  getCategoryBucket,
  BURST_LIMIT,
  BURST_WINDOW_MS,
  DEFAULT_WINDOW_MS,
  DEFAULT_MAX_REQUESTS,
};
