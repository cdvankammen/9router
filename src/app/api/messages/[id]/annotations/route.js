import { NextResponse } from "next/server";
import { getRequestDetailById } from "@/lib/usageDb";
import { getAnnotations, addAnnotation, deleteAnnotation, toggleStar } from "@/lib/usageDb";
import { requireAuth } from "@/lib/auth/requireAuth";

/**
 * GET /api/messages/:id/annotations
 * List annotations for one message.
 * Response: { annotations: [{ id, requestId, conversationId, kind, value, createdAt }] }
 */
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const detail = await getRequestDetailById(id);
    if (!detail) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }
    const annotations = await getAnnotations({ requestId: id });
    return NextResponse.json({ annotations });
  } catch (error) {
    console.error("[API] Failed to get annotations:", error);
    return NextResponse.json({ error: "Failed to fetch annotations" }, { status: 500 });
  }
}

/**
 * POST /api/messages/:id/annotations
 * Add/update an annotation.
 * Body: { kind: "tag"|"star"|"note", value: string, conversationId?: string }
 * Response: { annotation: {...} }
 */
export async function POST(request, { params }) {
  try {
    // Finding #7 follow-up (2026-10-26): route-level requireAuth. Annotation
    // writes modify stored metadata on captured conversations.
    if (!(await requireAuth(request))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;
    const detail = await getRequestDetailById(id);
    if (!detail) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }
    const body = await request.json().catch(() => ({}));
    const { kind, conversationId } = body;
    // Accept { value } (API) or { note }/{ tag } (UI convenience).
    const value = body.value ?? body.note ?? body.tag;
    if (!kind || !value) {
      return NextResponse.json({ error: "kind and value are required" }, { status: 400 });
    }
    const annotation = await addAnnotation({
      requestId: id,
      conversationId: conversationId || detail.conversationId || null,
      kind,
      value,
    });
    return NextResponse.json({ annotation }, { status: 201 });
  } catch (error) {
    console.error("[API] Failed to add annotation:", error);
    return NextResponse.json({ error: error.message || "Failed to add annotation" }, { status: 400 });
  }
}

/**
 * DELETE /api/messages/:id/annotations
 * Remove an annotation. Query: ?annotationId=123 (or body { kind, value }).
 * Response: { deleted: true }
 */
export async function DELETE(request, { params }) {
  try {
    // Finding #7 follow-up (2026-10-26): route-level requireAuth.
    if (!(await requireAuth(request))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const annotationId = searchParams.get("annotationId");
    let deleted;
    if (annotationId) {
      deleted = await deleteAnnotation({ id: Number(annotationId) });
    } else {
      const body = await request.json().catch(() => ({}));
      deleted = await deleteAnnotation({ requestId: id, kind: body.kind, value: body.value });
    }
    if (!deleted) {
      return NextResponse.json({ error: "Annotation not found" }, { status: 404 });
    }
    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error("[API] Failed to delete annotation:", error);
    return NextResponse.json({ error: error.message || "Failed to delete annotation" }, { status: 400 });
  }
}

/**
 * PATCH /api/messages/:id/annotations
 * Toggle star on a message. Body: { conversationId?: string }
 * Response: { starred: boolean }
 */
export async function PATCH(request, { params }) {
  try {
    // Finding #7 follow-up (2026-10-26): route-level requireAuth.
    if (!(await requireAuth(request))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;
    const detail = await getRequestDetailById(id);
    if (!detail) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }
    const body = await request.json().catch(() => ({}));
    const starred = await toggleStar(id, body.conversationId || detail.conversationId || null);
    return NextResponse.json({ starred });
  } catch (error) {
    console.error("[API] Failed to toggle star:", error);
    return NextResponse.json({ error: error.message || "Failed to toggle star" }, { status: 400 });
  }
}