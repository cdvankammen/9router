import { handleStt } from "@/sse/handlers/stt.js";
import { corsOptionsResponse } from "@/shared/utils/corsOptions.js";

// Allow large audio uploads — 5min for processing large files
export const maxDuration = 300;

export async function OPTIONS(request) {
  return corsOptionsResponse(request, "POST, OPTIONS");
}

/** POST /v1/audio/transcriptions - OpenAI Whisper compatible STT */
export async function POST(request) {
  return await handleStt(request);
}
