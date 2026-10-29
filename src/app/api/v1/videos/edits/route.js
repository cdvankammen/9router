import { handleVideoCreate } from "@/sse/handlers/videoGeneration.js";
import { corsOptionsResponse, withCorsHeaders } from "@/shared/utils/corsOptions.js";

export async function OPTIONS(request) {
  return corsOptionsResponse(request, "POST, OPTIONS");
}

/** POST /v1/videos/edits - async video edit (xAI Grok Imagine) */
export async function POST(request) {
  return withCorsHeaders(request, await handleVideoCreate(request, "edits"));
}
