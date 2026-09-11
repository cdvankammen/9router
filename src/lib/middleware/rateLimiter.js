// General-purpose in-memory rate limiter for API routes.
// Complements loginLimiter.js (login-specific lockout) with per-IP request throttling.
// Resets on process restart. Uses trusted peer headers when available.

import { getClientIp } from "@/lib/auth/loginLimiter.js";

let cachedNextResponse = null;
export function __setNextResponse(nr) { cachedNextResponse = nr; }

const DEFAULT_WINDOW_MS = 60_000; // 1 minute sliding window
const DEFAULT_MAX_REQUESTS = 120; // 2 req/s average
const BURST_LIMIT = 30; // max requests in a short burst before throttling
const BURST_WINDOW_MS = 5_000; // 5s burst window

const buckets = new Map(); // ip → { count, resetAt, burstCount, burstResetAt }

function now() {
  return Date.now();
}

function getBucket(ip, windowMs, maxRequests) {
  const t = now();
  let b = buckets.get(ip);
  if (!b || t >= b.resetAt) {
    b = { count: 0, resetAt: t + windowMs, burstCount: 0, burstResetAt: t + BURST_WINDOW_MS };
    buckets.set(ip, b);
  }
  // Reset burst counter independently
  if (t >= b.burstResetAt) {
    b.burstCount = 0;
    b.burstResetAt = t + BURST_WINDOW_MS;
  }
  return b;
}

/**
 * Check if a request should be rate-limited.
 * @param {Request} request - The incoming request
 * @param {object} options - Optional overrides
 * @param {number} options.windowMs - Sliding window duration (default 60s)
 * @param {number} options.maxRequests - Max requests per window (default 120)
 * @returns {{ limited: boolean, remaining: number, retryAfter?: number, resetAt: number }}
 */
export function checkRateLimit(request, options = {}) {
  const windowMs = options.windowMs || DEFAULT_WINDOW_MS;
  const maxRequests = options.maxRequests || DEFAULT_MAX_REQUESTS;
  const ip = getClientIp(request);
  const bucket = getBucket(ip, windowMs, maxRequests);
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
    };
  }

  return {
    limited: false,
    remaining: maxRequests - bucket.count,
    resetAt: bucket.resetAt,
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
  getBucket,
  BURST_LIMIT,
  BURST_WINDOW_MS,
  DEFAULT_WINDOW_MS,
  DEFAULT_MAX_REQUESTS,
};
