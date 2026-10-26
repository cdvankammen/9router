import { NextResponse } from "next/server";
import { killAppProcesses } from "@/lib/appUpdater";
import { verifyDashboardAuthToken } from "@/lib/auth/dashboardSession";
import { getConsistentMachineId } from "@/shared/utils/machineId";
import crypto from "node:crypto";

const CLI_TOKEN_HEADER = "x-9r-cli-token";
const CLI_TOKEN_SALT = "9r-cli-auth";

// CRITICAL fix (2026-10-26): this route previously had NO auth gate, allowing
// any network peer to shut down the server with a single unauthenticated POST.
// Now mirrors the auth pattern of /api/shutdown and /api/version/update:
//   - primary factor: CLI machine-id token (x-9r-cli-token) OR dashboard JWT
//   - optional second factor: SHUTDOWN_SECRET via Authorization: Bearer <secret>
//   - timing-safe compares throughout (no byte-by-byte secret recovery)
//   - GET returns 405 (method not allowed) so probes don't accidentally succeed
async function hasValidCliToken(request) {
  const token = request.headers.get(CLI_TOKEN_HEADER);
  if (!token) return false;
  const expected = await getConsistentMachineId(CLI_TOKEN_SALT);
  const a = Buffer.from(token, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function timingSafeEquals(a, b) {
  const da = crypto.createHash("sha256").update(String(a), "utf8").digest();
  const db = crypto.createHash("sha256").update(String(b), "utf8").digest();
  return crypto.timingSafeEqual(da, db);
}

export async function GET() {
  // Method guard: probes like `curl /api/version/shutdown` must not silently
  // succeed or return a useful error. 405 shuts down the conversation.
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

export async function POST(request) {
  const cliOk = await hasValidCliToken(request);
  const jwtOk = await verifyDashboardAuthToken(
    request.cookies.get("auth_token")?.value
  );
  if (!cliOk && !jwtOk) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 }
    );
  }

  // Optional second factor: SHUTDOWN_SECRET env var (timing-safe).
  const secret = process.env.SHUTDOWN_SECRET;
  if (secret) {
    const authorization = request.headers.get("authorization") || "";
    const received = authorization.startsWith("Bearer ")
      ? authorization.slice(7)
      : "";
    if (!timingSafeEquals(received, secret)) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }
  }

  try {
    await killAppProcesses();
  } catch { /* best effort */ }

  const response = NextResponse.json({
    success: true,
    message: "Shutting down for manual update...",
  });

  setTimeout(() => process.exit(0), 500);

  return response;
}
