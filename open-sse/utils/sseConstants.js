// Shared SSE primitives (no imports → safe for executors + stream.js)
export const SSE_DONE = "data: [DONE]\n\n";

export const SSE_HEADERS = {
  "Content-Type": "text/event-stream",
  "Cache-Control": "no-cache",
  "Connection": "keep-alive"
};

// Variant for web-cookie executors behind nginx (disable proxy buffering)
export const SSE_HEADERS_NO_BUFFER = {
  "Content-Type": "text/event-stream",
  "Cache-Control": "no-cache",
  "X-Accel-Buffering": "no"
};

// NOTE: SSE_HEADERS_CORS was removed in the CORS Phase 3B refactor.
// CORS headers are now applied exclusively at the app boundary
// (src/shared/utils/corsOptions.js withCorsHeaders). Use SSE_HEADERS
// for all SSE responses — the allowlist is the single source of truth.
