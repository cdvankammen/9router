import { NextResponse } from "next/server";
import { getSettings, updateSettings } from "@/lib/localDb";
import bcrypt from "bcryptjs";
import { isLocalRequest } from "@/dashboardGuard";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

// First-run password setup endpoint.
// Only works when no password hash exists AND no INITIAL_PASSWORD env is set.
// Available without auth so a local first-run user can bootstrap the password,
// but guarded to LOCAL requests only (same gate as /api/auth/reset-password)
// so a remote attacker on a tunnel/Tailscale URL cannot claim a fresh install
// by racing to set the password before the owner returns to the machine.
export async function POST(request) {
  try {
    // Cheap gate first (no DB read) — block non-loopback callers immediately.
    if (!isLocalRequest(request)) {
      return NextResponse.json(
        { error: "Setup is local-only. Create the first password from the local machine, or set INITIAL_PASSWORD before launch." },
        { status: 403, headers: NO_STORE_HEADERS }
      );
    }

    const settings = await getSettings();
    const storedHash = settings.password;

    // If a password is already configured (or the operator already bootstrapped
    // via INITIAL_PASSWORD), this endpoint is disabled — use /api/auth/login.
    if (storedHash || process.env.INITIAL_PASSWORD) {
      return NextResponse.json(
        { error: "Password is already configured. Use the login endpoint." },
        { status: 403, headers: NO_STORE_HEADERS }
      );
    }

    const body = await request.json();
    const newPassword = body?.password;

    if (!newPassword || typeof newPassword !== "string" || newPassword.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters." },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(newPassword, salt);
    await updateSettings({ password: hash });

    return NextResponse.json(
      { success: true, message: "Password configured successfully." },
      { headers: NO_STORE_HEADERS }
    );
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET: check whether initial setup is required.
// Public read-only probe (no side-effects) so the login page can decide
// whether to show the setup form vs the login form.
export async function GET() {
  try {
    const settings = await getSettings();
    const setupRequired = !settings.password && !process.env.INITIAL_PASSWORD;
    return NextResponse.json({ setupRequired }, { headers: NO_STORE_HEADERS });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}