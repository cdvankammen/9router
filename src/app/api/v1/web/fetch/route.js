import { handleFetch } from "@/sse/handlers/fetch.js";
import { resolveCorsHeaders } from "@/shared/utils/cors.js";

/**
 * Handle CORS preflight
 */
export async function OPTIONS(request) {
  const headers = await resolveCorsHeaders(request);
  return new Response(null, {
    headers: { ...headers, "Access-Control-Allow-Methods": "POST, OPTIONS" }
  });
}

/**
 * POST /v1/web/fetch - Web URL fetch/extract endpoint
 */
export async function POST(request) {
  const response = await handleFetch(request);
  const corsHeaders = await resolveCorsHeaders(request);
  // Strip any wildcard CORS headers the handler set, then apply the
  // configured origin policy (empty object = no CORS headers = browser blocks).
  response.headers.delete("Access-Control-Allow-Origin");
  for (const [key, value] of Object.entries(corsHeaders)) {
    response.headers.set(key, value);
  }
  return response;
}
