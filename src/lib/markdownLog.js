/**
 * Markdown auto-flush — periodically writes recent request details to
 * ~/.9router/logs/YYYY-MM-DD.md as a per-conversation report.
 *
 * Opt-in via settings.markdownLogEnabled (default false). Runs a lightweight
 * timer; each cycle re-reads settings so toggling takes effect without restart.
 * Fail-open: any error is logged and skipped — never crashes the server.
 */
import fs from "node:fs";
import path from "node:path";
import { DATA_DIR } from "@/lib/dataDir.js";
import { getSettings } from "@/lib/db/repos/settingsRepo.js";
import { getRequestDetails } from "@/lib/db/repos/requestDetailsRepo.js";
import { renderRequestsMarkdown } from "@/lib/markdownReport.js";

let timer = null;
let started = false;

const LOGS_DIR = () => path.join(DATA_DIR, "logs");
const RECENT_WINDOW_MS = 24 * 60 * 60 * 1000; // last 24h of details per flush

function getLogFileName(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return path.join(LOGS_DIR(), `${y}-${m}-${d}.md`);
}

export async function flushMarkdownLog() {
  try {
    const settings = await getSettings();
    if (!settings.markdownLogEnabled) return false;

    const startDate = new Date(Date.now() - RECENT_WINDOW_MS).toISOString();
    const { details } = await getRequestDetails({ startDate, pageSize: 5000 });

    fs.mkdirSync(LOGS_DIR(), { recursive: true });
    const filePath = getLogFileName();
    const content = renderRequestsMarkdown(details);
    // Atomic write: render to a temp file then rename over the target. A
    // reader (or another process flushing concurrently) never observes a
    // partially-written file — rename is atomic on POSIX. Last-writer-wins
    // across processes is accepted (this is a snapshot, not an append log).
    const tmpPath = `${filePath}.${process.pid}.tmp`;
    await fs.promises.writeFile(tmpPath, content, "utf8");
    await fs.promises.rename(tmpPath, filePath);
    return true;
  } catch (err) {
    console.error("[markdownLog] flush failed:", err.message);
    return false;
  }
}

async function tick() {
  try {
    const settings = await getSettings();
    if (!settings.markdownLogEnabled) {
      // Still schedule next check so enabling from the UI starts flushing
      timer = setTimeout(tick, 60_000);
      return;
    }
    await flushMarkdownLog();
    const intervalMin = Math.max(1, settings.markdownLogFlushIntervalMin || 5);
    timer = setTimeout(tick, intervalMin * 60_000);
  } catch {
    timer = setTimeout(tick, 60_000);
  }
}

export function startMarkdownLogFlusher() {
  if (started) return;
  started = true;
  // First flush shortly after boot (settings read inside tick)
  timer = setTimeout(tick, 15_000);
  timer.unref?.();
}

export function stopMarkdownLogFlusher() {
  if (timer) clearTimeout(timer);
  timer = null;
  started = false;
}
