import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { killAppProcesses, spawnUpdaterAndExit } from "@/lib/appUpdater";
import { verifyDashboardAuthToken } from "@/lib/auth/dashboardSession";
import { getConsistentMachineId } from "@/shared/utils/machineId";
import crypto from "node:crypto";

const CLI_TOKEN_HEADER = "x-9r-cli-token";
const CLI_TOKEN_SALT = "9r-cli-auth";

let cachedCliToken = null;
async function getExpectedCliToken() {
  if (!cachedCliToken) cachedCliToken = await getConsistentMachineId(CLI_TOKEN_SALT);
  return cachedCliToken;
}

async function hasValidCliToken(request) {
  const token = request.headers.get(CLI_TOKEN_HEADER);
  if (!token) return false;
  const expected = await getExpectedCliToken();
  // Timing-safe comparison to prevent side-channel leaks on the machineId token.
  const a = Buffer.from(token, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export async function POST(request) {
  if (process.env.NODE_ENV !== "production") {
    return NextResponse.json(
      { success: false, message: "Update is only available in production build (9router CLI)" },
      { status: 403 }
    );
  }

  // Defense-in-depth: middleware gates this path via ALWAYS_PROTECTED, but the
  // handler must not rely solely on middleware. A misconfigured proxy or future
  // route restructure must not expose killAppProcesses + spawnUpdaterAndExit to
  // unauthenticated callers.
  //
  // Accept either:
  //   1. CLI machine-id token (x-9r-cli-token) — used by the self-updater
  //   2. Dashboard JWT cookie (auth_token)
  // Without either, reject with 401.
  const cliOk = await hasValidCliToken(request);
  const cookieStore = cookies();
  const authToken = cookieStore.get("auth_token")?.value;
  const jwtOk = await verifyDashboardAuthToken(authToken);

  if (!cliOk && !jwtOk) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 }
    );
  }

  // Optional second factor: when UPDATE_SECRET is configured, require it via
  // Authorization: Bearer <secret> (timing-safe). Without the env var the
  // primary factor alone is sufficient — the CLI self-updater does not set it.
  const secret = process.env.UPDATE_SECRET;
  if (secret) {
    const authorization = headers().get("authorization");
    const received = authorization?.startsWith("Bearer ")
      ? Buffer.from(authorization.slice(7), "utf8")
      : Buffer.alloc(0);
    const expected = Buffer.from(secret, "utf8");
    if (
      received.length !== expected.length ||
      !crypto.timingSafeEqual(received, expected)
    ) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }
  }

  try {
    // Kill sibling processes (cloudflared, MITM, stray next-server) to release
    // file locks on Windows.
    await killAppProcesses();
  } catch { /* best effort */ }

  // Schedule detached updater then exit current server process.
  spawnUpdaterAndExit();

  return NextResponse.json({ success: true, message: "Updater started. This app will exit shortly." });
}
