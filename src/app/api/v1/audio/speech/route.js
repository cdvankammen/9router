import { handleTts } from "@/sse/handlers/tts.js";
import { corsOptionsResponse, withCorsHeaders } from "@/shared/utils/corsOptions.js";

export async function OPTIONS(request) {
  return corsOptionsResponse(request, "POST, OPTIONS");
}

/** POST /v1/audio/speech - OpenAI-compatible TTS endpoint */
export async function POST(request) {
  return withCorsHeaders(request, await handleTts(request));
}
