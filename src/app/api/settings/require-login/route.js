import { NextResponse } from "next/server";
import { getSettings } from "@/lib/localDb";

export async function GET() {
  try {
    const settings = await getSettings();
    const requireLogin = settings.requireLogin !== false;
    const tunnelDashboardAccess = settings.tunnelDashboardAccess !== false;
    // SECURITY (Finding #336): do NOT echo tunnelUrl / tailscaleUrl here.
    // This endpoint is served to the UNAUTHENTICATED login page — any visitor
    // can fetch it. Exposing internal tunnel URLs (tailscale hostname,
    // cloudflare tunnel UUID) gives an attacker the direct bypass path past
    // the login gate. The authenticated /api/settings endpoint still serves
    // these for dashboard display once logged in.
    return NextResponse.json({ requireLogin, tunnelDashboardAccess });
  } catch (error) {
    return NextResponse.json({ requireLogin: true }, { status: 200 });
  }
}
