import { ollamaModels } from "open-sse/config/ollamaModels.js";
import { corsOptionsResponse, withCorsHeaders } from "@/shared/utils/corsOptions.js";

export async function OPTIONS(request) {
  return corsOptionsResponse(request, "GET, OPTIONS");
}

export async function GET(request) {
  const base = new Response(JSON.stringify(ollamaModels), {
    headers: { "Content-Type": "application/json" }
  });
  return withCorsHeaders(request, base);
}

