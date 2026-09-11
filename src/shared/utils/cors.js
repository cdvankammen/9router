import { getSettings } from "@/lib/db/index.js";

// Default when no CORS allowlist is configured: reflect requests' own Origin
// with credentials support (browser sends credentials only for same-origin).
const DEFAULT_CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "*",
};

function normalizeOriginList(list) {
  if (!Array.isArray(list)) return [];
  return list
    .map((s) => String(s).trim().toLowerCase())
    .filter((s) => s.length > 0);
}

/**
 * Resolve CORS headers for a request.
 *
 * - `settings.corsAllowedOrigins` (array) is the allowlist, e.g.
 *   `["https://app.example.com", "http://localhost:3000"]`.
 * - When the allowlist is empty/missing the legacy wildcard headers are
 *   returned (preserves existing browser/client behavior).
 * - When the allowlist is non-empty, the request's own Origin is echoed back
 *   ONLY if it matches the allowlist exactly; disallowed origins get an empty
 *   object (browser blocks the response) and the actual request is still
 *   processed for server-side clients (curl, SDKs) which don't send an Origin.
 *
 * @param {Request} request
 * @param {object} [settings] cached settings; fetched when omitted
 */
export async function resolveCorsHeaders(request, settings) {
  const finalSettings = settings || (await getSettings());
  const allowlist = normalizeOriginList(finalSettings.corsAllowedOrigins);

  if (allowlist.length === 0) {
    return { ...DEFAULT_CORS };
  }

  const origin = request && request.headers ? request.headers.get("origin") : null;
  // Compare trimmed + lowercased origin against allowlist; echo the original
  // (preserving casing) back so browsers accept it verbatim.
  const normalized = origin ? String(origin).trim().toLowerCase() : "";
  if (normalized && allowlist.includes(normalized)) {
    return {
      "Access-Control-Allow-Origin": origin.trim(),
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "*",
      "Vary": "Origin",
    };
  }

  // Allowlist configured: NEVER emit "*".
  // - Browser with a disallowed Origin: no CORS headers → browser blocks the response.
  // - Non-browser clients (no Origin header) don't need CORS headers at all;
  //   they pass no origin and are unaffected.
  return {};
}