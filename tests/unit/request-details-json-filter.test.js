/**
 * Verifies getRequestDetails can filter on fields stored inside the `data`
 * JSON column (errorCategory, sourceApp) via JSON1 — and that pagination
 * math stays correct when those filters are applied.
 */
import { describe, it, expect, beforeEach } from "vitest";

const TEST_DIR = "/tmp/9r-jsonfilter-" + Date.now();

describe("requestDetails JSON1 filters (errorCategory/sourceApp)", () => {
  beforeEach(() => {
    process.env.DATA_DIR = TEST_DIR;
    // saveRequestDetail no-ops unless observability is enabled
    process.env.ENABLE_REQUEST_LOGS = "true";
  });

  async function seed() {
    const { initDb, updateSettings } = await import("@/lib/db/index.js");
    await initDb();
    // batchSize=1 → saveRequestDetail flushes immediately (buffered writer)
    await updateSettings({ enableObservability: true, observabilityBatchSize: 1 });
    const { saveRequestDetail } = await import("@/lib/db/repos/requestDetailsRepo.js");
    const now = new Date().toISOString();
    await saveRequestDetail({
      id: "m1", timestamp: now, provider: "openai", model: "gpt-4o", connectionId: "c1",
      status: "error", errorCategory: "rate_limit", sourceApp: "curl",
      request: { messages: [] }, providerRequest: {}, providerResponse: {}, response: { error: "x", status: 429 },
    });
    await saveRequestDetail({
      id: "m2", timestamp: now, provider: "openai", model: "gpt-4o-mini", connectionId: "c1",
      status: "success", sourceApp: "Claude Code",
      request: { messages: [] }, providerRequest: {}, providerResponse: {}, response: { content: "ok" },
    });
    await saveRequestDetail({
      id: "m3", timestamp: now, provider: "anthropic", model: "claude-3", connectionId: "c2",
      status: "error", errorCategory: "auth", sourceApp: "curl",
      request: { messages: [] }, providerRequest: {}, providerResponse: {}, response: { error: "y", status: 401 },
    });
    return (await import("@/lib/db/repos/requestDetailsRepo.js"));
  }

  it("filters by errorCategory via JSON1", async () => {
    const { getRequestDetails } = await seed();
    const { details, pagination } = await getRequestDetails({ errorCategory: "rate_limit", pageSize: 10 });
    expect(details).toHaveLength(1);
    expect(details[0].errorCategory).toBe("rate_limit");
    expect(pagination.totalItems).toBe(1);
  });

  it("filters by sourceApp via JSON1", async () => {
    const { getRequestDetails } = await seed();
    const { details, pagination } = await getRequestDetails({ sourceApp: "curl", pageSize: 10 });
    expect(details).toHaveLength(2);
    expect(pagination.totalItems).toBe(2);
  });

  it("combined filters + pagination math stays correct", async () => {
    const { getRequestDetails } = await seed();
    // page 1 of 1 item per page, filtered to curl+error → exactly 2 pages
    const page1 = await getRequestDetails({ sourceApp: "curl", status: "error", page: 1, pageSize: 1 });
    const page2 = await getRequestDetails({ sourceApp: "curl", status: "error", page: 2, pageSize: 1 });
    expect(page1.pagination.totalItems).toBe(2);
    expect(page1.pagination.totalPages).toBe(2);
    expect(page1.details).toHaveLength(1);
    expect(page2.details).toHaveLength(1);
    expect(page2.details[0].id).not.toBe(page1.details[0].id);
  });
});
