/**
 * Full-text search over captured request payloads.
 *
 * Verifies:
 * - getRequestDetails({ search }) matches request message text AND response
 *   text (FTS5 index when the driver supports it, LIKE fallback otherwise —
 *   results must be identical on both paths).
 * - searchMode reports "fts" | "like".
 * - FTS operator chars / quotes / LIKE wildcards in the term never throw and
 *   search literally (escaping).
 * - Short/empty terms and non-FTS drivers fall back to LIKE.
 * - The retention janitor keeps the FTS index in sync with the main table.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

const TEST_DIR = "/tmp/9r-search-" + Date.now();

async function seedRows(saveRequestDetail) {
  const now = new Date().toISOString();
  await saveRequestDetail({
    id: "m1", timestamp: now, provider: "openai", model: "gpt-4o", status: "success", conversationId: "conv-1",
    request: { messages: [{ role: "user", content: "What is a banana?" }] },
    providerRequest: {}, providerResponse: {}, response: { content: "A banana is a fruit." },
  });
  await saveRequestDetail({
    id: "m2", timestamp: now, provider: "anthropic", model: "claude-3", status: "success", conversationId: "conv-2",
    request: { messages: [{ role: "user", content: "Tell me about fruit" }] },
    providerRequest: {}, providerResponse: {}, response: { content: "Pineapple is tropical." },
  });
  await saveRequestDetail({
    id: "m3", timestamp: now, provider: "openai", model: "gpt-4o-mini", status: "error", conversationId: "conv-3",
    request: { messages: [{ role: "user", content: "Weather today?" }] },
    providerRequest: {}, providerResponse: {}, response: { error: "rate limited", status: 429 },
  });
  await saveRequestDetail({
    id: "m4", timestamp: now, provider: "openai", model: "gpt-4o", status: "success", conversationId: "conv-4",
    request: { messages: [{ role: "user", content: 'say "hi" *now*' }] },
    providerRequest: {}, providerResponse: {}, response: { content: "done" },
  });
}

describe("requestDetails full-text search", () => {
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
    await seedRows(saveRequestDetail);
    return await import("@/lib/db/repos/requestDetailsRepo.js");
  }

  it("matches request message text (banana in the prompt)", async () => {
    const { getRequestDetails } = await seed();
    const res = await getRequestDetails({ search: "banana", pageSize: 10 });
    expect(res.details.map((d) => d.id)).toEqual(["m1"]);
    expect(res.pagination.totalItems).toBe(1);
    expect(["fts", "like"]).toContain(res.searchMode);
  });

  it("matches response text (pineapple in the answer)", async () => {
    const { getRequestDetails } = await seed();
    const res = await getRequestDetails({ search: "pineapple", pageSize: 10 });
    expect(res.details.map((d) => d.id)).toEqual(["m2"]);
    expect(["fts", "like"]).toContain(res.searchMode);
  });

  it("no matches → empty details, zero totals", async () => {
    const { getRequestDetails } = await seed();
    const res = await getRequestDetails({ search: "zebra-unicorn", pageSize: 10 });
    expect(res.details).toHaveLength(0);
    expect(res.pagination.totalItems).toBe(0);
  });

  it("escaping: quotes + FTS operator chars never throw, match literally", async () => {
    const { getRequestDetails, sanitizeFtsTerm, buildLikeCondition } = await seed();
    // FTS phrase sanitizer: operators stripped, wrapped in quotes
    expect(sanitizeFtsTerm('say "hi" *now*')).toBe('"say hi now"');
    expect(sanitizeFtsTerm("banana:fruit*")).toBe('"banana fruit"');
    expect(sanitizeFtsTerm("*")).toBe(null);
    expect(sanitizeFtsTerm("a")).toBe(null);
    expect(sanitizeFtsTerm("")).toBe(null);
    // LIKE builder escapes wildcards
    expect(buildLikeCondition("50%_off").param).toBe("%50\\%\\_off%");
    expect(buildLikeCondition("50%_off").cond).toContain("ESCAPE");
    // end-to-end: term full of operator chars finds the exact row
    const res = await getRequestDetails({ search: 'say "hi" *now*', pageSize: 10 });
    expect(res.details.map((d) => d.id)).toEqual(["m4"]);
    // FTS-ish term (colon + star stripped → phrase) still matches the plain text
    const res2 = await getRequestDetails({ search: "What is a banana?", pageSize: 10 });
    expect(res2.details.map((d) => d.id)).toEqual(["m1"]);
  });

  it("short/empty terms fall back to LIKE (no FTS syntax errors)", async () => {
    const { getRequestDetails } = await seed();
    const res = await getRequestDetails({ search: "a", pageSize: 10 });
    expect(res.searchMode).toBe("like");
    // every row contains "a" somewhere in its JSON blob
    expect(res.details.length).toBeGreaterThan(0);
    expect(res.pagination.totalItems).toBe(4);
  });

  it("search combines with other filters (status)", async () => {
    const { getRequestDetails } = await seed();
    const err = await getRequestDetails({ search: "banana", status: "error", pageSize: 10 });
    expect(err.details).toHaveLength(0);
    const ok = await getRequestDetails({ search: "banana", status: "success", pageSize: 10 });
    expect(ok.details.map((d) => d.id)).toEqual(["m1"]);
    expect(ok.pagination.totalItems).toBe(1);
  });

  it("search respects pagination totals", async () => {
    const { getRequestDetails } = await seed();
    // "fruit" appears in m1's response and m2's prompt → 2 matches
    const page1 = await getRequestDetails({ search: "fruit", page: 1, pageSize: 1 });
    expect(page1.pagination.totalItems).toBe(2);
    expect(page1.pagination.totalPages).toBe(2);
    expect(page1.details).toHaveLength(1);
    const page2 = await getRequestDetails({ search: "fruit", page: 2, pageSize: 1 });
    expect(page2.details).toHaveLength(1);
    expect(page2.details[0].id).not.toBe(page1.details[0].id);
  });

  it("FTS path: index exists, stays in sync with main table (when supported)", async () => {
    const { getRequestDetails } = await seed();
    const res = await getRequestDetails({ search: "banana", pageSize: 10 });
    const { getAdapter } = await import("@/lib/db/driver.js");
    const db = await getAdapter();
    const ftsTable = db.get(`SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'requestDetails_fts'`);
    if (res.searchMode === "fts") {
      // driver supports FTS5 → index created and populated for all rows
      expect(ftsTable).toBeTruthy();
      const ftsCount = db.get(`SELECT COUNT(*) as c FROM requestDetails_fts`).c;
      expect(ftsCount).toBe(4);
      // orphan cleanup (same statement the retention janitor runs) repairs drift
      db.run(`DELETE FROM requestDetails WHERE id = 'm3'`);
      db.run(`DELETE FROM requestDetails_fts WHERE id NOT IN (SELECT id FROM requestDetails)`);
      const after = db.get(`SELECT COUNT(*) as c FROM requestDetails_fts`).c;
      expect(after).toBe(3);
    } else {
      // sql.js: no FTS5 module → LIKE fallback, no fts table
      expect(res.searchMode).toBe("like");
      expect(ftsTable).toBeFalsy();
    }
  });
});

describe("requestDetails retention janitor keeps FTS in sync", () => {
  const JANITOR_DIR = "/tmp/9r-search-janitor-" + Date.now();

  it("drops fts rows for rows the janitor deleted", async () => {
    // Fresh adapter + module state for this describe (pattern from
    // db-driver-chain.test.js) so maxRecords=2 applies from the first save.
    try { global._dbAdapter?.instance?.close?.(); } catch {}
    delete global._dbAdapter;
    vi.resetModules();

    process.env.DATA_DIR = JANITOR_DIR;
    process.env.ENABLE_REQUEST_LOGS = "true";

    const { initDb, updateSettings } = await import("@/lib/db/index.js");
    await initDb();
    await updateSettings({ enableObservability: true, observabilityBatchSize: 1, observabilityMaxRecords: 2 });
    const { saveRequestDetail, getRequestDetails } = await import("@/lib/db/repos/requestDetailsRepo.js");

    const base = Date.parse("2026-08-09T00:00:00.000Z");
    for (let i = 0; i < 3; i++) {
      await saveRequestDetail({
        id: `j${i}`, timestamp: new Date(base + i * 1000).toISOString(), provider: "openai",
        model: "gpt-4o", status: "success", conversationId: "conv-j",
        request: { messages: [{ role: "user", content: `needle ${i}` }] },
        providerRequest: {}, providerResponse: {}, response: { content: "ok" },
      });
    }

    const { getAdapter } = await import("@/lib/db/driver.js");
    const db = await getAdapter();
    // janitor capped the main table at maxRecords=2, dropping the oldest (j0)
    const mainIds = db.all(`SELECT id FROM requestDetails ORDER BY timestamp ASC`).map((r) => r.id);
    expect(mainIds).toEqual(["j1", "j2"]);

    const res = await getRequestDetails({ search: "needle", pageSize: 10 });
    expect(res.details.map((d) => d.id)).toEqual(["j2", "j1"]); // newest first
    expect(res.pagination.totalItems).toBe(2);
    expect(["fts", "like"]).toContain(res.searchMode);

    if (res.searchMode === "fts") {
      const ftsIds = db.all(`SELECT id FROM requestDetails_fts`).map((r) => r.id).sort();
      expect(ftsIds).toEqual(["j1", "j2"]); // j0 purged from the index too
    }
  });
});
