// Tests for taskType persistence in usageHistory via meta column.
// Verifies saveRequestUsage stores meta.taskType and conversationId columns
// directly at the SQLite layer (getUsageHistory intentionally omits meta).
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it, expect, beforeAll, afterAll } from "vitest";

const originalDataDir = process.env.DATA_DIR;
let tempDir;
let adapter;

beforeAll(async () => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "9router-tasktype-"));
  process.env.DATA_DIR = tempDir;
  const { initDb } = await import("@/lib/db/index.js");
  await initDb();
  const { getAdapter } = await import("@/lib/db/driver.js");
  adapter = await getAdapter();
});

afterAll(() => {
  if (tempDir) fs.rmSync(tempDir, { recursive: true, force: true });
  if (originalDataDir === undefined) delete process.env.DATA_DIR;
  else process.env.DATA_DIR = originalDataDir;
});

describe("taskType tracking in usageHistory", () => {
  it("saveRequestUsage persists meta.taskType + conversationId columns", async () => {
    const { saveRequestUsage } = await import("@/lib/db/index.js");

    await saveRequestUsage({
      provider: "openai",
      model: "gpt-4o",
      tokens: { prompt_tokens: 10, completion_tokens: 5 },
      status: "ok",
      conversationId: "conv-t1",
      meta: { taskType: "code:generation" },
    });

    const row = adapter.get(
      `SELECT timestamp, provider, model, status, meta, conversationId FROM usageHistory WHERE conversationId = ?`,
      ["conv-t1"]
    );
    expect(row).toBeDefined();
    expect(row.provider).toBe("openai");
    expect(row.conversationId).toBe("conv-t1");

    // Real assertion: meta JSON round-trips with taskType present
    const meta = JSON.parse(row.meta);
    expect(meta.taskType).toBe("code:generation");
  });

  it("saveRequestUsage without meta stores empty object (backward compat)", async () => {
    const { saveRequestUsage } = await import("@/lib/db/index.js");

    await saveRequestUsage({
      provider: "openai",
      model: "gpt-4o-mini",
      tokens: { prompt_tokens: 1, completion_tokens: 1 },
      status: "ok",
    });

    const rows = adapter.all(
      `SELECT meta, conversationId FROM usageHistory WHERE model = ? ORDER BY id DESC LIMIT 1`,
      ["gpt-4o-mini"]
    );
    expect(rows.length).toBeGreaterThan(0);
    const meta = JSON.parse(rows[0].meta);
    expect(meta.taskType).toBeUndefined();
    expect(rows[0].conversationId).toBeNull();
  });
});
