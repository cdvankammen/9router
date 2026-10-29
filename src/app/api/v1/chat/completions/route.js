import { handleChat } from "@/sse/handlers/chat.js";
import { initTranslators } from "open-sse/translator/index.js";
import { corsOptionsResponse } from "@/shared/utils/corsOptions.js";

let initialized = false;

/**
 * Initialize translators once
 */
async function ensureInitialized() {
  if (!initialized) {
    await initTranslators();
    initialized = true;
  }
}

/**
 * Handle CORS preflight — delegates to shared helper which honors
 * settings.corsAllowedOrigins (CORS pilot rollout 2026-10-29).
 */
export async function OPTIONS(request) {
  return corsOptionsResponse(request, "GET, POST, OPTIONS");
}

export async function POST(request) {  
  // Fallback to local handling
  await ensureInitialized();
  
  return await handleChat(request);
}

