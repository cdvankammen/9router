// Shared route-level authentication helper for API routes that need
// defence-in-depth beyond the middleware PROTECTED_API_PATHS gate.
//
// WHY THIS EXISTS (Finding #7, 2026-10-26):
//   The middleware classifies routes as ALWAYS_PROTECTED (JWT required
//   regardless of requireLogin) or PROTECTED_API_PATHS (auth required,
//   but isAuthenticated() returns true for everyone when
//   settings.requireLogin === false — see dashboardGuard.js:201-205).
//   Many mutating admin endpoints landed in PROTECTED_API_PATHS, so on
//   the documented default open-by-choice deployment (requireLogin=false,
//   confirmed active on mini4 during the Finding #6 proof round) every
//   network peer could hit them unauthenticated. The middleware promotion
//   in commit 24f497b6 moved the route families to ALWAYS_PROTECTED, but
//   defence-in-depth at the route layer catches any future middleware
//   regression and protects endpoints that ride stored credentials
//   (SSRF-via-stored-config) or cascade to multiple resources.
//
// SEMANTICS:
//   Accepts either a valid dashboard JWT session (auth_token cookie) OR a
//   valid CLI machine-id token (x-9r-cli-token header). Timing-safe
//   comparison on the CLI token prevents timing side-channels.
//
// USAGE:
//   import { requireAuth } from "@/lib/auth/requireAuth";
//   export async function POST(request, ctx) {
//     if (!(await requireAuth(request))) {
//       return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
//     }
//     // ... rest of handler
//   }

import { verifyDashboardAuthToken } from "@/lib/auth/dashboardSession";
import { getConsistentMachineId } from "@/shared/utils/machineId";
import crypto from "node:crypto";

export const CLI_TOKEN_HEADER = "x-9r-cli-token";
export const CLI_TOKEN_SALT = "9r-cli-auth";

export async function hasValidCliToken(request) {
  const token = request.headers.get(CLI_TOKEN_HEADER);
  if (!token) return false;
  const expected = await getConsistentMachineId(CLI_TOKEN_SALT);
  const a = Buffer.from(token, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export async function requireAuth(request) {
  const cliOk = await hasValidCliToken(request);
  if (cliOk) return true;
  // Defensive: raw Request objects (tests, internal callers) may lack .cookies
  const jwtOk = await verifyDashboardAuthToken(
    request.cookies?.get?.("auth_token")?.value
  );
  return !!jwtOk;
}
