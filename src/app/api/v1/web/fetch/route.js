import { handleFetch } from "@/sse/handlers/fetch.js";
import { corsOptionsResponse, withCorsHeaders } from "@/shared/utils/corsOptions.js";

/**
 * Handle CORS preflight
 */
export async function OPTIONS(request) {
  return corsOptionsResponse(request, "POST, OPTIONS");
}

/**
 * POST /v1/web/fetch - Web URL fetch/extract endpoint
 */
export async function POST(request) {
  const response = await handleFetch(request);
  return withCorsHeaders(request, response);
}
