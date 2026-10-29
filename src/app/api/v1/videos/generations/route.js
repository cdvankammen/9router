import { handleVideoCreate } from "@/sse/handlers/videoGeneration.js";
import { corsOptionsResponse } from "@/shared/utils/corsOptions.js";

export async function OPTIONS(request) {
  return corsOptionsResponse(request, "POST, OPTIONS");
}

/** POST /v1/videos/generations - async video generation (xAI Grok Imagine) */
export async function POST(request) {
  return await handleVideoCreate(request, "generations");
}
