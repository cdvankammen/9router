import { resolveCorsHeaders } from "./cors.js";

/**
 * Build a CORS preflight Response for a route's OPTIONS handler.
 *
 * Wraps `resolveCorsHeaders` (which consults settings.corsAllowedOrigins)
 * and produces a ready-to-return Response. Callers just pass the request
 * and the list of HTTP methods the route supports.
 *
 * Usage:
 *   import { corsOptionsResponse } from "@/shared/utils/corsOptions.js";
 *   export async function OPTIONS(request) {
 *     return corsOptionsResponse(request, "GET, POST, OPTIONS");
 *   }
 *
 * Security: when corsAllowedOrigins is configured, disallowed browser
 * origins receive an empty headers object (browser blocks). Non-browser
 * clients (curl, SDKs) are unaffected because they don't send Origin.
 *
 * @param {Request} request - the preflight request
 * @param {string} [methods="GET, POST, OPTIONS"] - comma-separated allowed methods
 * @returns {Promise<Response>}
 */
export async function corsOptionsResponse(request, methods = "GET, POST, OPTIONS") {
  const cors = await resolveCorsHeaders(request);
  const headers = {
    ...cors,
    "Access-Control-Allow-Methods": methods,
    "Access-Control-Allow-Headers": "*",
  };
  // 204 No Content is the conventional preflight status; 200 is also valid.
  // Use 204 to signal "no body" unambiguously.
  return new Response(null, { status: 204, headers });
}

/**
 * Merge CORS headers into an existing Response.
 *
 * Use this for non-preflight responses (POST/GET handlers) that want to
 * honor the configured allowlist. Merges into the response's existing
 * headers rather than replacing them, so caller-provided Content-Type
 * etc. are preserved.
 *
 * @param {Request} request
 * @param {Response} response - the response to augment
 * @returns {Promise<Response>}
 */
export async function withCorsHeaders(request, response) {
  const cors = await resolveCorsHeaders(request);
  const headers = new Headers(response.headers);
  for (const [k, v] of Object.entries(cors)) {
    headers.set(k, v);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
