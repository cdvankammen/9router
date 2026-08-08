import { NextResponse } from "next/server";
import { getRequestDetailById } from "@/lib/usageDb";
import { buildCurl, buildMarkdown } from "@/shared/messageFormats";

/**
 * GET /api/messages/:id/export?format=json|markdown|curl
 * Export one captured request in the requested format.
 *
 * - json: normalized full record (importable)
 * - markdown: role-styled transcript (prompt / completion / thinking / error)
 * - curl: reconstructed curl command with auth placeholder
 */

export async function GET(request, { params }) {
  try {
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
