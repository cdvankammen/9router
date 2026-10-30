import { NextResponse } from "next/server";
import { getSettings } from "@/lib/localDb";

// SECURITY (Finding #336): this route is explicitly PUBLIC (listed in
// `PUBLIC_API_PATHS` at src/dashboardGuard.js:44) because the login page
// needs `requireLogin` to decide setup-vs-login form. The previous response
// also leaked `tunnelDashboardAccess`, `tunnelUrl`, and `tailscaleUrl` —
// exact public hostnames of tunneled/tailnet deployments — to any
// unauthenticated LAN peer. The login page (src/app/login/page.js) does
// NOT consume those fields; the dashboard components that do
// (ToolDetailClient, JcodeToolCard, DroidToolCard) fetch from the
// auth-gated /api/settings route. Return only what the login page needs.
export async function GET() {
  try {
    const settings = await getSettings();
    const requireLogin = settings.requireLogin !== false;
    return NextResponse.json({ requireLogin });
  } catch (error) {
    return NextResponse.json({ requireLogin: true }, { status: 200 });
  }
}
