import { NextResponse } from "next/server";
import { getAdapter } from "@/lib/db/driver.js";
import { previewMigrations } from "@/lib/db/migrate.js";

export const dynamic = "force-dynamic";

// GET /api/settings/database/migrations
// Read-only dry-run of the schema migration runner (backlog #2). Reports
// pending migrations, registry health, fingerprint divergence, downgrade
// detection, and any persisted refusal warnings — without applying anything.
// Auth-gated by dashboardGuard ALWAYS_PROTECTED (prefix "/api/settings/database").
export async function GET() {
  try {
    const adapter = await getAdapter();
    return NextResponse.json(previewMigrations(adapter));
  } catch (error) {
    console.log("Error previewing migrations:", error);
    return NextResponse.json({ error: "Failed to preview migrations" }, { status: 500 });
  }
}