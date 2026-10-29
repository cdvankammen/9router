// Tests for the request-details export endpoint (/api/export/requests).
// Verifies: conversationId filter works, markdown rendering groups by
// conversation, JSON export returns full detail rows.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it, expect, beforeAll, afterAll } from "vitest";

const originalDataDir = process.env.DATA_DIR;
let tempDir;
let db;

async function saveDetail(detail) {
  await db.saveRequestDetail(detail);
  await new Promise((r) => setTimeout(r, 120));
}

beforeAll(async () => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "9router-export-"));
  process.env.DATA_DIR = tempDir;
  process.env.ENABLE_REQUEST_LOGS = "true"; // force observability on for this test
  // Clear the driver's global adapter singleton so this suite never reuses
  // an adapter bound to a previous suite's DATA_DIR (see db-driver-chain).
  delete global._dbAdapter;
  const { initDb, saveRequestDetail, updateSettings } = await import("@/lib/db/index.js");
  await initDb();
  await updateSettings({ observabilityBatchSize: 1, observabilityMaxRecords: 1000 });
  db = { saveRequestDetail };
});

afterAll(() => {
  try { global._dbAdapter?.instance?.close?.(); } catch {}
  delete global._dbAdapter;
  delete process.env.ENABLE_REQUEST_LOGS;
  if (tempDir) fs.rmSync(tempDir, { recursive: true, force: true });
  if (originalDataDir === undefined) delete process.env.DATA_DIR;
  else process.env.DATA_DIR = originalDataDir;
});

describe("export route — GET handler", () => {
  it("returns markdown grouped by conversation with request bodies", async () => {
    // Two conversations: conv-A (2 requests), conv-B (1 request)
    await saveDetail({
      id: "exp-1", provider: "openai", model: "gpt-4o", status: "success",
      conversationId: "conv-A",
      latency: { ttft: 10, total: 50 },
      tokens: { prompt_tokens: 5, completion_tokens: 3 },
      request: { model: "gpt-4o", messages: [{ role: "user", content: "hi" }] },
      response: { content: "hello" },
    });
    await saveDetail({
      id: "exp-2", provider: "openai", model: "gpt-4o", status: "success",
      conversationId: "conv-A",
      latency: { ttft: 8, total: 40 },
      tokens: { prompt_tokens: 7, completion_tokens: 2 },
      request: { model: "gpt-4o", messages: [{ role: "user", content: "again" }] },
      response: { content: "hey" },
    });
    await saveDetail({
      id: "exp-3", provider: "anthropic", model: "claude-sonnet", status: "error",
      conversationId: "conv-B",
      latency: { ttft: 0, total: 20 },
      tokens: { prompt_tokens: 4, completion_tokens: 0 },
      request: { model: "claude-sonnet", messages: [{ role: "user", content: "fail me" }] },
      response: { error: "rate limited" },
    });

    // Import route handler AFTER data is seeded (module reads via DB at call time)
    const { GET } = await import("@/app/api/export/requests/route.js");
    const url = "http://localhost/api/export/requests?format=markdown";
    const res = await GET(new Request(url));
    expect(res.status).toBe(200);
    const text = await res.text();

    // Real assertions — not tautologies:
    expect(text).toContain("## Conversation: `conv-A`");
    expect(text).toContain("## Conversation: `conv-B`");
    expect(text).toContain("openai/gpt-4o");
    expect(text).toContain("claude-sonnet");
    // Error surfaced in markdown
    expect(text).toContain("**Error:** rate limited");
    // Conversation grouping: both conv-A requests appear before conv-B
    expect(text.indexOf("conv-A")).toBeLessThan(text.indexOf("conv-B"));
  });

  it("filters by conversationId and returns JSON rows", async () => {
    const { GET } = await import("@/app/api/export/requests/route.js");
    const url = "http://localhost/api/export/requests?format=json&conversationId=conv-B";
    const res = await GET(new Request(url));
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.details.length).toBe(1);
    expect(body.details[0].conversationId).toBe("conv-B");
    expect(body.details[0].status).toBe("error");
    expect(body.pagination.totalItems).toBe(1);
  });

  it("filters by status", async () => {
    const { GET } = await import("@/app/api/export/requests/route.js");
    const url = "http://localhost/api/export/requests?format=json&status=success";
    const res = await GET(new Request(url));
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.details.length).toBe(2);
    expect(body.details.every((d) => d.status === "success")).toBe(true);
  });
});
