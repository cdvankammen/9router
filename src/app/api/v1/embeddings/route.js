import { handleEmbeddings } from "@/sse/handlers/embeddings.js";
import { corsOptionsResponse, withCorsHeaders } from "@/shared/utils/corsOptions.js";

/**
 * Handle CORS preflight
 */
export async function OPTIONS(request) {
  return corsOptionsResponse(request, "POST, OPTIONS");
}

/**
 * POST /v1/embeddings - OpenAI-compatible embeddings endpoint
 */
export async function POST(request) {
  const response = await handleEmbeddings(request);
  return withCorsHeaders(request, response);
}
