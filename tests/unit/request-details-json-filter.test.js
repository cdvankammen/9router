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

  it("getRequestFacets counts via GROUP BY over the full filtered set", async () => {
    const { getRequestFacets } = await seed();
    const { facets, histogram } = await getRequestFacets({});
    // 3 rows: 2 curl + 1 Claude Code; 2 error (rate_limit, auth) + 1 success
    expect(facets.provider.find((f) => f.value === "openai")?.count).toBe(2);
    expect(facets.provider.find((f) => f.value === "anthropic")?.count).toBe(1);
    expect(facets.status.find((f) => f.value === "error")?.count).toBe(2);
    expect(facets.errorCategory.find((f) => f.value === "rate_limit")?.count).toBe(1);
    expect(facets.errorCategory.find((f) => f.value === "auth")?.count).toBe(1);
    expect(facets.sourceApp.find((f) => f.value === "curl")?.count).toBe(2);
    expect(facets.sourceApp.find((f) => f.value === "Claude Code")?.count).toBe(1);
    // histogram: 24 hourly buckets, one populated
    expect(histogram).toHaveLength(24);
    expect(histogram.reduce((s, b) => s + b.count, 0)).toBe(3);
  });

  it("getRequestFacets respects filters (sourceApp=curl)", async () => {
    const { getRequestFacets } = await seed();
    const { facets } = await getRequestFacets({ sourceApp: "curl" });
    expect(facets.provider.reduce((s, f) => s + f.count, 0)).toBe(2);
    expect(facets.errorCategory.find((f) => f.value === "auth")?.count).toBe(1);
  });
});
