import { NextResponse } from "next/server";
import { getAdapter } from "@/lib/db/driver.js";
import { getDroppedRecordsCount } from "@/lib/db/repos/requestDetailsRepo.js";
import { getSettings } from "@/lib/db/repos/settingsRepo.js";

/**
 * GET /api/observability/status
 * Lightweight status for the observability capture pipeline:
 * - enabled: whether capture is on (settings.observabilityEnabled)
 * - maxRecords: configured record cap
 * - currentCount: rows currently in requestDetails
 * - droppedRecords: cumulative rows dropped since boot because the cap was hit
 *   (in-process counter; resets on server restart)
 *
 * Lets the UI surface "capture at cap — oldest records dropped" instead of
 * silently losing data.
 */
export async function GET() {
  try {
    const settings = await getSettings();
    const db = await getAdapter();
    const row = db.get(`SELECT COUNT(*) AS c FROM requestDetails`);
    return NextResponse.json({
      enabled: !!settings.enableObservability,
      maxRecords: settings.observabilityMaxRecords || 200,
      currentCount: row?.c || 0,
      droppedRecords: getDroppedRecordsCount(),
    });
  } catch (error) {
    console.error("[observability/status] failed:", error);
    return NextResponse.json({ error: "Failed to read observability status" }, { status: 500 });
  }
}
