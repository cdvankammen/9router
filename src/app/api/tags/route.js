import { ollamaModels } from "open-sse/config/ollamaModels.js";
import { corsOptionsResponse } from "@/shared/utils/corsOptions.js";

// CORS_HEADERS retained for the GET response (Phase 2 will remove this).
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "*"
};

export async function OPTIONS(request) {
  return corsOptionsResponse(request, "GET, OPTIONS");
}

export async function GET() {
  return new Response(JSON.stringify(ollamaModels), {
    headers: { "Content-Type": "application/json", ...CORS_HEADERS }
  });
}

