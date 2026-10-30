import { registerSession, unregisterSession, findPlugin } from "@/lib/mcp/stdioSseBridge";
import { hasValidCliToken } from "@/lib/auth/requireAuth";
import { NextResponse } from "next/server";

// SECURITY (Finding #322): use the canonical hasValidCliToken from
// @/lib/auth/requireAuth which uses crypto.timingSafeEqual. The previous
// duplicated implementation here used plain === comparison, leaking a
// timing side-channel that lets an attacker iteratively guess the
// machine-id token byte-by-byte.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request, { params }) {
  // SECURITY: Require CLI-token auth for MCP endpoints (issue #3674)
  if (!await hasValidCliToken(request)) {
    return NextResponse.json({ error: "CLI token required" }, { status: 401 });
  }

  const { plugin } = await params;
  if (!findPlugin(plugin)) {
    return new Response(`Unknown plugin: ${plugin}`, { status: 404 });
  }

  const encoder = new TextEncoder();
  let sid;

  const stream = new ReadableStream({
    start(controller) {
      const send = (chunk) => controller.enqueue(encoder.encode(chunk));
      sid = registerSession(plugin, send);
      // MCP SSE handshake: tell client where to POST messages.
      send(`event: endpoint\ndata: /api/mcp/${plugin}/message?sessionId=${sid}\n\n`);
    },
    cancel() {
      if (sid) unregisterSession(plugin, sid);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
