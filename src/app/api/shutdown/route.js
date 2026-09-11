import { NextResponse } from "next/server";
import { verifyDashboardAuthToken } from "@/lib/auth/dashboardSession";
import { getConsistentMachineId } from "@/shared/utils/machineId";

const CLI_TOKEN_HEADER = "x-9r-cli-token";
const CLI_TOKEN_SALT = "9r-cli-auth";

// Replicate dashboardGuard CLI-token check so the route is self-protected
// even if the middleware layer is bypassed (defence in depth).
async function hasValidCliToken(request) {
  const token = request.headers.get(CLI_TOKEN_HEADER);
  if (!token) return false;
  const cliToken = await getConsistentMachineId(CLI_TOKEN_SALT);
  return token === cliToken;
}

export async function POST(request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ success: false, message: "Not allowed in production" }, { status: 403 });
  }

  // Primary gate: dashboardGuard auth (JWT session cookie or CLI token).
  // Mirrors the ALWAYS_PROTECTED check in src/dashboardGuard.js.
  const cliOk = await hasValidCliToken(request);
  const jwtOk = await verifyDashboardAuthToken(request.cookies.get("auth_token")?.value);
  if (!cliOk && !jwtOk) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  // Secondary gate: SHUTDOWN_SECRET (defence-in-depth when configured).
  const secret = process.env.SHUTDOWN_SECRET;
  if (secret) {
    const authorization = request.headers.get("authorization");
    if (authorization !== `Bearer ${secret}`) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }
  }

  const response = NextResponse.json({ success: true, message: "Shutting down..." });

  setTimeout(() => {
    process.exit(0);
  }, 500);

  return response;
}
