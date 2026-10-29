import { handleVideoGet } from "@/sse/handlers/videoGeneration.js";
import { corsOptionsResponse, withCorsHeaders } from "@/shared/utils/corsOptions.js";

export async function OPTIONS(request) {
  return corsOptionsResponse(request, "GET, OPTIONS");
}

/** GET /v1/videos/{request_id} - poll async video job status (xAI Grok Imagine) */
export async function GET(request, { params }) {
  const { id } = await params;
  return withCorsHeaders(request, await handleVideoGet(request, id));
}
