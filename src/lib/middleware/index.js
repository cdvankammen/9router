// Middleware barrel — reusable request-processing utilities for 9router API routes.
// Used by dashboardGuard.js (Next.js middleware) and individual route handlers.

export { checkRateLimit, rateLimitResponse, addRateLimitHeaders } from "./rateLimiter.js";
export { sanitizeHeaders, createSanitizedHeaders } from "./headerSanitizer.js";
