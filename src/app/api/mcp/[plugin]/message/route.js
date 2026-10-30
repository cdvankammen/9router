import { NextResponse } from "next/server";
import { sendToChild, findPlugin } from "@/lib/mcp/stdioSseBridge";
import { hasValidCliToken } from "@/lib/auth/requireAuth";

// SECURITY (Finding #322): use the canonical hasValidCliToken from
// @/lib/auth/requireAuth which uses crypto.timingSafeEqual. The previous
// duplicated implementation here used plain === comparison, leaking a
// timing side-channel that lets an attacker iteratively guess the
// machine-id token byte-by-byte.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request, { params }) {
  // SECURITY: Require CLI-token auth for MCP endpoints (issue #3674)
  if (!await hasValidCliToken(request)) {
    return NextResponse.json({ error: "CLI token required" }, { status: 401 });
  }

  const { plugin } = await params;
  if (!findPlugin(plugin)) {
    return NextResponse.json({ error: `Unknown plugin: ${plugin}` }, { status: 404 });
  }
  try {
    const body = await request.json();
    sendToChild(plugin, body);
    return new Response(null, { status: 202 });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
