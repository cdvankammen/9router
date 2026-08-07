import { NextResponse } from "next/server";
import { getRequestDetailById } from "@/lib/usageDb";

/**
 * GET /api/messages/:id
 * Full detail for one captured request message.
 * Returns the parsed requestDetails.data record plus a convenience `_id`.
 */
export async function GET(request, { params }) {
  try {
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
