// Integration test: errorCategory must survive the full request-detail
// pipeline (buildRequestDetail → saveRequestDetail → getRequestDetails).
// Regression guard — previously errorCategory was dropped at both the
// buildRequestDetail output and the repo flush record (caught by E2E).
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { buildRequestDetail } from "open-sse/handlers/chatCore/requestDetail.js";
import { categorizeError } from "open-sse/utils/errorCategorizer.js";

const originalDataDir = process.env.DATA_DIR;
let tempDir;

beforeAll(async () => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "9router-errcat-"));
  process.env.DATA_DIR = tempDir;
  process.env.ENABLE_REQUEST_LOGS = "true";
  // Clear the driver's global adapter singleton so this suite never reuses
  // an adapter bound to a previous suite's DATA_DIR (see db-driver-chain).
  delete global._dbAdapter;
  const { initDb, updateSettings } = await import("@/lib/db/index.js");
  await initDb();
  await updateSettings({ observabilityBatchSize: 1, observabilityMaxRecords: 500 });
});

afterAll(() => {
  try { global._dbAdapter?.instance?.close?.(); } catch {}
  delete global._dbAdapter;
  delete process.env.ENABLE_REQUEST_LOGS;
  if (tempDir) fs.rmSync(tempDir, { recursive: true, force: true });
  if (originalDataDir === undefined) delete process.env.DATA_DIR;
  else process.env.DATA_DIR = originalDataDir;
});

describe("errorCategory end-to-end through request details", () => {
  it("buildRequestDetail forwards errorCategory from base", () => {
    const detail = buildRequestDetail({
      provider: "openai",
      model: "gpt-4o",
      status: "error",
      errorCategory: "rate_limit",
      response: { error: "Rate limit exceeded", status: 429 },
    });
    expect(detail.errorCategory).toBe("rate_limit");
  });

  it("buildRequestDetail omits errorCategory when absent (backward compat)", () => {
    const detail = buildRequestDetail({ provider: "openai", model: "gpt-4o", status: "success" });
    expect(detail.errorCategory).toBeUndefined();
  });

  it("saveRequestDetail → getRequestDetails round-trips errorCategory", async () => {
    const { saveRequestDetail } = await import("@/lib/db/index.js");
    const { getRequestDetails } = await import("@/lib/db/repos/requestDetailsRepo.js");

    // Unique id per run — robust to module-cached DB driver sharing the
    // process with other test files (full-suite isolation).
    const convId = `conv-err-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    // Mimic the chatCore error path exactly: categorize → buildRequestDetail → save
    const status = 429;
    const message = "Rate limit exceeded, retry later";
    const detail = buildRequestDetail({
      provider: "openai",
      model: "gpt-4o",
      connectionId: "conn-1",
      conversationId: convId,
      errorCategory: categorizeError(status, message),
      latency: { ttft: 0, total: 12 },
      tokens: { prompt_tokens: 0, completion_tokens: 0 },
      request: { messages: [{ role: "user", content: "hi" }], model: "gpt-4o", stream: true },
      providerRequest: null,
      response: { error: message, status, thinking: null },
      status: "error",
    });
    expect(detail.errorCategory).toBe("rate_limit");

    await saveRequestDetail(detail);
    await new Promise((r) => setTimeout(r, 200)); // allow flush (batchSize 1)

    const { details } = await getRequestDetails({ conversationId: convId, pageSize: 10 });
    // Assert on the exact record we wrote (count may include other files' rows
    // when the DB driver is shared in-process).
    const mine = details.find((d) => d.conversationId === convId);
    expect(mine).toBeDefined();
    // THE regression assertion: category survives storage
    expect(mine.errorCategory).toBe("rate_limit");
    expect(mine.status).toBe("error");
    expect(mine.response.status).toBe(429);
  });
});
