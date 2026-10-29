import { handleFetch } from "@/sse/handlers/fetch.js";
import { corsOptionsResponse, withCorsHeaders } from "@/shared/utils/corsOptions.js";

/**
 * Handle CORS preflight — delegates to the shared helper which consults
 * settings.corsAllowedOrigins. CORS pilot (2026-10-29).
 */
export async function OPTIONS(request) {
  return corsOptionsResponse(request, "POST, OPTIONS");
}

/**
 * POST /v1/web/fetch - Web URL fetch/extract endpoint
 */
export async function POST(request) {
  return withCorsHeaders(request, await handleFetch(request));
}
