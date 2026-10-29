import { NextResponse } from "next/server";
import { getRequestDetailById } from "@/lib/usageDb";
import { requireAuth } from "@/lib/auth/requireAuth";

/**
 * GET /api/messages/:id
 * Full detail for one captured request message.
 * Returns the parsed requestDetails.data record plus a convenience `_id`.
 *
 * Security (IDOR sweep 2026-10-29): route-level requireAuth as defence-in-
 * depth. The middleware classifies /api/messages as ALWAYS_PROTECTED, but
 * this route exposes the raw captured request record — including prompts,
 * provider responses, Authorization/Bearer headers forwarded upstream,
 * and any API keys embedded in the captured body. A middleware regression
 * that reverts /api/messages to PROTECTED_API_PATHS (as happened pre-
 * commit 24f497b6) would otherwise let any LAN peer iterate ids and
 * drain the entire request log plus credentials. Route-level auth here
 * catches that regression before data leaves the handler.
 */
export async function GET(request, { params }) {
  try {
    if (!(await requireAuth(request))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;
    const detail = await getRequestDetailById(id);
    if (!detail) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }
    return NextResponse.json({ message: { ...detail, _id: id } });
  } catch (error) {
    console.error("[API] Failed to get message detail:", error);
    return NextResponse.json({ error: "Failed to fetch message" }, { status: 500 });
  }
}
