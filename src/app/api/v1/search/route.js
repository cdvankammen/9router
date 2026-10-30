import { handleSearch } from "@/sse/handlers/search.js";
import { corsOptionsResponse, withCorsHeaders } from "@/shared/utils/corsOptions.js";

/**
 * Handle CORS preflight
 */
export async function OPTIONS(request) {
  return corsOptionsResponse(request, "POST, OPTIONS");
}

/**
 * POST /v1/search - Web search endpoint
 */
export async function POST(request) {
  const response = await handleSearch(request);
  return withCorsHeaders(request, response);
}
