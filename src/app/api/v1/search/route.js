import { handleSearch } from "@/sse/handlers/search.js";

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
  return await handleSearch(request);
}
