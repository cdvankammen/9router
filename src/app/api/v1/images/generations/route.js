import { handleImageGeneration } from "@/sse/handlers/imageGeneration.js";
import { corsOptionsResponse } from "@/shared/utils/corsOptions.js";

export async function OPTIONS(request) {
  return corsOptionsResponse(request, "POST, OPTIONS");
}

/** POST /v1/images/generations - OpenAI-compatible image generation endpoint */
export async function POST(request) {
  return await handleImageGeneration(request);
}
