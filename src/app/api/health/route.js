import { NextResponse } from "next/server";
import { corsOptionsResponse, withCorsHeaders } from "@/shared/utils/corsOptions.js";

// CORS pilot (2026-10-29): /api/health uses the shared helper so it
// honors settings.corsAllowedOrigins instead of hardcoding wildcard.
// GET uses withCorsHeaders so the response still carries CORS headers;
// OPTIONS delegates entirely to corsOptionsResponse.
export async function GET(request) {
  return withCorsHeaders(
    request,
    NextResponse.json({ ok: true })
  );
}

export async function OPTIONS(request) {
  return corsOptionsResponse(request, "GET, OPTIONS");
}
