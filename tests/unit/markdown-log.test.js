// Tests for the markdown log auto-flusher.
// Verifies flushMarkdownLog writes a real per-day file when enabled and
// skips (returns false) when disabled.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it, expect, beforeAll, afterAll } from "vitest";

const originalDataDir = process.env.DATA_DIR;
let tempDir;

beforeAll(async () => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "9router-mdlog-"));
  process.env.DATA_DIR = tempDir;
  process.env.ENABLE_REQUEST_LOGS = "true";
  // Clear the driver's global adapter singleton so this suite never reuses
  // an adapter bound to a previous suite's DATA_DIR (see db-driver-chain).
  delete global._dbAdapter;
  const { initDb, updateSettings, saveRequestDetail } = await import("@/lib/db/index.js");
  await initDb();
  await updateSettings({ observabilityBatchSize: 1 });
  await saveRequestDetail({
    id: "md-1",
    provider: "openai",
    model: "gpt-4o",
    status: "success",
    conversationId: "conv-md",
    latency: { ttft: 5, total: 30 },
    tokens: { prompt_tokens: 3, completion_tokens: 2 },
    request: { model: "gpt-4o", messages: [{ role: "user", content: "hello" }] },
    response: { content: "hi" },
  });
  await new Promise((r) => setTimeout(r, 150));
});

afterAll(() => {
  try { global._dbAdapter?.instance?.close?.(); } catch {}
  delete global._dbAdapter;
  delete process.env.ENABLE_REQUEST_LOGS;
  if (tempDir) fs.rmSync(tempDir, { recursive: true, force: true });
  if (originalDataDir === undefined) delete process.env.DATA_DIR;
  else process.env.DATA_DIR = originalDataDir;
});

describe("markdownLog.flushMarkdownLog", () => {
  it("writes a per-day markdown file grouped by conversation when enabled", async () => {
    const { updateSettings } = await import("@/lib/db/index.js");
    await updateSettings({ markdownLogEnabled: true });

    const { flushMarkdownLog } = await import("@/lib/markdownLog.js");
    const ok = await flushMarkdownLog();
    expect(ok).toBe(true);

    // Locate the daily file and assert real content
    const logsDir = path.join(tempDir, "logs");
    const files = fs.readdirSync(logsDir).filter((f) => f.endsWith(".md"));
    expect(files.length).toBeGreaterThan(0);
    const content = fs.readFileSync(path.join(logsDir, files[0]), "utf8");

    expect(content).toContain("## Conversation: `conv-md`");
    expect(content).toContain("openai/gpt-4o");
    expect(content).toContain("hello");
  });

  it("skips writing when disabled (returns false, no file created)", async () => {
    const { updateSettings } = await import("@/lib/db/index.js");
    await updateSettings({ markdownLogEnabled: false });

    const { flushMarkdownLog } = await import("@/lib/markdownLog.js");
    const ok = await flushMarkdownLog();
    expect(ok).toBe(false);
  });
});
