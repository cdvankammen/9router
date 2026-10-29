import { handleSystemone } from "@/sse/handlers/systemone.js";
import { corsOptionsResponse, withCorsHeaders } from "@/shared/utils/corsOptions.js";

/**
 * Handle CORS preflight — honors settings.corsAllowedOrigins.
 */
export async function OPTIONS(request) {
  return corsOptionsResponse(request, "POST, OPTIONS");
}

/**
 * POST /v1/systemone - System One (Jev) decision endpoint
 */
export async function POST(request) {
  const response = await handleSystemone(request);
  return withCorsHeaders(request, response);
}
