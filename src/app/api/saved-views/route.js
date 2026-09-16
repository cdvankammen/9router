import { NextResponse } from "next/server";
import { getSavedViews, saveView, deleteSavedView } from "@/lib/usageDb";

/**
 * GET /api/saved-views
 * List saved filter presets.
 * Response: { views: [{ id, name, filter, createdAt, updatedAt }] }
 */
export async function GET() {
  try {
    const views = await getSavedViews();
    return NextResponse.json({ views });
  } catch (error) {
    console.error("[API] Failed to get saved views:", error);
    return NextResponse.json({ error: "Failed to fetch saved views" }, { status: 500 });
  }
}

/**
 * POST /api/saved-views
 * Create or update a saved view (upsert by name).
 * Body: { name: string, filter: object }
 * Response: { view: {...} }
 */
export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { name, filter } = body;
    if (!name || !filter) {
      return NextResponse.json({ error: "name and filter are required" }, { status: 400 });
    }
    const view = await saveView({ name, filter });
    return NextResponse.json({ view }, { status: 201 });
  } catch (error) {
    console.error("[API] Failed to save view:", error);
    return NextResponse.json({ error: error.message || "Failed to save view" }, { status: 400 });
  }
}

/**
 * DELETE /api/saved-views?id=123 (or ?name=...)
 * Response: { deleted: true }
 */
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const name = searchParams.get("name");
    const deleted = await deleteSavedView({ id: id ? Number(id) : undefined, name: name || undefined });
    if (!deleted) {
      return NextResponse.json({ error: "Saved view not found" }, { status: 404 });
    }
    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error("[API] Failed to delete saved view:", error);
    return NextResponse.json({ error: error.message || "Failed to delete saved view" }, { status: 400 });
  }
}