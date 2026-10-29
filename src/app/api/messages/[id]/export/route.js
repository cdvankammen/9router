import { NextResponse } from "next/server";
import { getRequestDetailById } from "@/lib/usageDb";
import { buildCurl, buildMarkdown } from "@/shared/messageFormats";
import { requireAuth } from "@/lib/auth/requireAuth";

/**
 * GET /api/messages/:id/export?format=json|markdown|curl
 * Export one captured request in the requested format.
 *
 * - json: normalized full record (importable)
 * - markdown: role-styled transcript (prompt / completion / thinking / error)
 * - curl: reconstructed curl command with auth placeholder
 *
 * Security (IDOR sweep 2026-10-29): route-level requireAuth as defence-in-
 * depth. The json export returns the full captured record verbatim
 * (prompts, responses, forwarded Authorization headers, embedded API
 * keys). The curl format reconstructs the upstream call including the
 * target URL and body — useful to an attacker even with the auth header
 * replaced by a placeholder. The markdown transcript preserves thinking
 * blocks that may contain provider-side reasoning about secrets. A
 * middleware regression would otherwise expose all three formats to any
 * unauthenticated peer.
 */

export async function GET(request, { params }) {
  try {
    if (!(await requireAuth(request))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") || "json";

    const detail = await getRequestDetailById(id);
    if (!detail) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    if (format === "markdown") {
      return new NextResponse(buildMarkdown(detail), {
        headers: { "Content-Type": "text/markdown; charset=utf-8" },
      });
    }

    if (format === "curl") {
      return new NextResponse(buildCurl(detail), {
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    // default json
    return NextResponse.json({ ...detail, _id: id });
  } catch (error) {
    console.error("[API] Failed to export message:", error);
    return NextResponse.json({ error: "Failed to export message" }, { status: 500 });
  }
}
