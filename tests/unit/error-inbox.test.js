/**
 * Error Inbox P2 — server-side fingerprint aggregation + settings-KV triage.
 *
 * Verifies:
 * - getErrorSummary: SQL window-function grouping by the COARSE key
 *   provider|model|errorCategory over the FULL filtered set — grouped counts,
 *   cost sums (data JSON), first/last timestamps, sample error (display
 *   only), latest detailId for drill-in, forced status='error' (success rows
 *   never appear), date/category/provider/model filters, pagination totals,
 *   empty result.
 * - errorFingerprint: stable key with 'unknown' fills.
 * - settings boardColumns round-trip: MAP_REPLACE semantics (partial map
 *   replaces the stored map — deletes are honored), default {} present.
 *
 * Temp DATA_DIR pattern (isolated sqlite per run) mirrors
 * conversation-keyset.test.js / request-details-json-filter.test.js.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it, expect, beforeAll, afterAll } from "vitest";

const originalDataDir = process.env.DATA_DIR;
let tempDir;

// Dataset (errors only unless noted):
//   A: anthropic/claude-sonnet  rate_limit ×3 (t0, t0+1, t0+2), costs .001/.002/.003
//   B: openai/gpt-4o            timeout    ×2 (t0+5, t0+6),     costs .004/.006
//   C: anthropic/claude-sonnet  auth       ×1 (t0+10),          cost  .01
//   OK: anthropic/claude-sonnet success    ×1 (t0+12)           — must NEVER appear
//   D: deepseek/deepseek-chat   (no category) ×1 (t0+15), cost .002 → 'unknown'
const T0 = "2026-08-09T10:00:00.000Z";
const MIN = 60 * 1000;

function iso(base, minutes) {
  return new Date(Date.parse(base) + minutes * MIN).toISOString();
}

let repo;
let settingsRepo;
let barrel;

beforeAll(async () => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "9router-error-inbox-"));
  process.env.DATA_DIR = tempDir;
  process.env.ENABLE_REQUEST_LOGS = "true";
  // Clear the driver's global adapter singleton so this suite never reuses
  // an adapter bound to a previous suite's DATA_DIR (see db-driver-chain).
  delete global._dbAdapter;
  barrel = await import("@/lib/db/index.js");
  await barrel.initDb();
  // batchSize=1 → saveRequestDetail flushes immediately (buffered writer)
  await barrel.updateSettings({ enableObservability: true, observabilityBatchSize: 1, observabilityMaxRecords: 500 });
  repo = await import("@/lib/db/repos/requestDetailsRepo.js");
  settingsRepo = await import("@/lib/db/repos/settingsRepo.js");

  const save = (detail) => repo.saveRequestDetail({
    request: { messages: [{ role: "user", content: "hi" }] },
    providerRequest: {}, providerResponse: {}, response: { content: "ok" },
    ...detail,
  });

  // Group A — 3 rate_limit errors on anthropic/claude-sonnet
  for (let i = 0; i < 3; i++) {
    await save({
      id: `a-${i + 1}`,
      timestamp: iso(T0, i),
      provider: "anthropic",
      model: "claude-sonnet",
      status: "error",
      errorCategory: "rate_limit",
      cost: 0.001 + i * 0.001,
      response: { error: `Rate limit exceeded: 429 (attempt ${i + 1})` },
    });
  }
  // Group B — 2 timeout errors on openai/gpt-4o
  for (let i = 0; i < 2; i++) {
    await save({
      id: `b-${i + 1}`,
      timestamp: iso(T0, 5 + i),
      provider: "openai",
      model: "gpt-4o",
      status: "error",
      errorCategory: "timeout",
      cost: 0.004 + i * 0.002,
      response: { error: "Request timed out after 120s" },
    });
  }
  // Group C — 1 auth error, same provider/model as A but different category
  await save({
    id: "c-1",
    timestamp: iso(T0, 10),
    provider: "anthropic",
    model: "claude-sonnet",
    status: "error",
    errorCategory: "auth",
    cost: 0.01,
    response: { error: "Invalid API key" },
  });
  // Success row sharing A's provider/model — the status='error' filter must
  // keep it out of every group.
  await save({
    id: "ok-1",
    timestamp: iso(T0, 12),
    provider: "anthropic",
    model: "claude-sonnet",
    status: "success",
    cost: 0.05,
    response: { content: "ok" },
  });
  // Group D — error with NO errorCategory → 'unknown' group (and a NULL
  // model-free fingerprint shape).
  await save({
    id: "d-1",
    timestamp: iso(T0, 15),
    provider: "deepseek",
    model: "deepseek-chat",
    status: "error",
    cost: 0.002,
    response: { error: "fetch failed: ENOTFOUND api.deepseek.com" },
  });

  // Let the fire-and-forget batched flushes settle before querying.
  await new Promise((r) => setTimeout(r, 50));
});

afterAll(() => {
  try { global._dbAdapter?.instance?.close?.(); } catch {}
  delete global._dbAdapter;
  delete process.env.ENABLE_REQUEST_LOGS;
  if (tempDir) fs.rmSync(tempDir, { recursive: true, force: true });
  if (originalDataDir === undefined) delete process.env.DATA_DIR;
  else process.env.DATA_DIR = originalDataDir;
});

// ── errorFingerprint ────────────────────────────────────────────────────────
describe("errorFingerprint (coarse Sentry-style key)", () => {
  it("joins provider|model|errorCategory", () => {
    expect(repo.errorFingerprint("anthropic", "claude-sonnet", "rate_limit"))
      .toBe("anthropic|claude-sonnet|rate_limit");
  });
  it("fills null members with 'unknown' for a stable key", () => {
    expect(repo.errorFingerprint(null, "gpt-4o", undefined)).toBe("unknown|gpt-4o|unknown");
    expect(repo.errorFingerprint("openai", null, "")).toBe("openai|unknown|unknown");
    expect(repo.errorFingerprint(undefined, undefined, undefined)).toBe("unknown|unknown|unknown");
  });
  it("is insensitive to error text (display-only, never part of the key)", () => {
    const a = repo.errorFingerprint("x", "y", "auth");
    const b = repo.errorFingerprint("x", "y", "auth");
    expect(a).toBe(b);
  });
});

// ── getErrorSummary ─────────────────────────────────────────────────────────
describe("getErrorSummary (SQL aggregation over the full filtered set)", () => {
  it("groups by provider|model|errorCategory with counts, cost, first/last, sample error, latest detailId", async () => {
    const { errors, totals } = await repo.getErrorSummary({ pageSize: 50 });

    expect(totals.errorGroupCount).toBe(4);
    expect(errors).toHaveLength(4);

    const byFp = Object.fromEntries(errors.map((e) => [e.fingerprint, e]));

    // Group A — 3 rows
    const a = byFp["anthropic|claude-sonnet|rate_limit"];
    expect(a).toBeTruthy();
    expect(a.count).toBe(3);
    expect(a.cost).toBeCloseTo(0.006, 9); // .001 + .002 + .003
    expect(a.firstTimestamp).toBe(iso(T0, 0));
    expect(a.lastTimestamp).toBe(iso(T0, 2));
    expect(a.sampleError).toContain("Rate limit exceeded");
    expect(a.detailId).toBe("a-3"); // latest row in the group (drill-in target)

    // Group B — 2 rows
    const b = byFp["openai|gpt-4o|timeout"];
    expect(b.count).toBe(2);
    expect(b.cost).toBeCloseTo(0.01, 9); // .004 + .006
    expect(b.firstTimestamp).toBe(iso(T0, 5));
    expect(b.lastTimestamp).toBe(iso(T0, 6));
    expect(b.sampleError).toBe("Request timed out after 120s");
    expect(b.detailId).toBe("b-2");

    // Group C — 1 row; SAME provider/model as A but different category ⇒
    // separate group (category is part of the coarse key).
    const c = byFp["anthropic|claude-sonnet|auth"];
    expect(c.count).toBe(1);
    expect(c.cost).toBeCloseTo(0.01, 9);
    expect(c.detailId).toBe("c-1");

    // Group D — missing category → 'unknown'
    const d = byFp["deepseek|deepseek-chat|unknown"];
    expect(d.count).toBe(1);
    expect(d.errorCategory).toBe("unknown");
    expect(d.sampleError).toContain("fetch failed");
    expect(d.detailId).toBe("d-1");
  });

  it("orders groups by count DESC, then lastTimestamp DESC", async () => {
    const { errors } = await repo.getErrorSummary({ pageSize: 50 });
    // A(3) → B(2) → D(1, t0+15) → C(1, t0+10)
    expect(errors.map((e) => e.fingerprint)).toEqual([
      "anthropic|claude-sonnet|rate_limit",
      "openai|gpt-4o|timeout",
      "deepseek|deepseek-chat|unknown",
      "anthropic|claude-sonnet|auth",
    ]);
  });

  it("forces status='error' — success rows never appear, even with a status filter", async () => {
    const noFilter = await repo.getErrorSummary({ pageSize: 50 });
    expect(noFilter.errors.flatMap((e) => e.count).reduce((a, b) => a + b, 0)).toBe(7); // 3+2+1+1

    const explicitSuccess = await repo.getErrorSummary({ pageSize: 50, status: "success" });
    expect(explicitSuccess.errors.flatMap((e) => e.count).reduce((a, b) => a + b, 0)).toBe(7);
  });

  it("filters by errorCategory (JSON1)", async () => {
    const { errors } = await repo.getErrorSummary({ errorCategory: "rate_limit", pageSize: 50 });
    expect(errors).toHaveLength(1);
    expect(errors[0].fingerprint).toBe("anthropic|claude-sonnet|rate_limit");
    expect(errors[0].count).toBe(3);
  });

  it("filters by provider", async () => {
    const { errors } = await repo.getErrorSummary({ provider: "anthropic", pageSize: 50 });
    expect(errors.map((e) => e.fingerprint).sort()).toEqual([
      "anthropic|claude-sonnet|auth",
      "anthropic|claude-sonnet|rate_limit",
    ]);
  });

  it("filters by model", async () => {
    const { errors } = await repo.getErrorSummary({ model: "gpt-4o", pageSize: 50 });
    expect(errors).toHaveLength(1);
    expect(errors[0].fingerprint).toBe("openai|gpt-4o|timeout");
  });

  it("filters by endDate (inclusive)", async () => {
    const { errors } = await repo.getErrorSummary({ endDate: iso(T0, 6), pageSize: 50 });
    // A (t0..t0+2) + B (t0+5, t0+6) qualify; C (t0+10) and D (t0+15) don't.
    expect(errors.map((e) => e.fingerprint).sort()).toEqual([
      "anthropic|claude-sonnet|rate_limit",
      "openai|gpt-4o|timeout",
    ]);
  });

  it("filters by startDate (inclusive)", async () => {
    const { errors } = await repo.getErrorSummary({ startDate: iso(T0, 3), pageSize: 50 });
    // A's rows are at t0..t0+2 → excluded entirely; B (t0+5,+6), C (t0+10), D (t0+15) remain.
    expect(errors.map((e) => e.fingerprint).sort()).toEqual([
      "anthropic|claude-sonnet|auth",
      "deepseek|deepseek-chat|unknown",
      "openai|gpt-4o|timeout",
    ]);
  });

  it("returns an empty result for a filter with no matches", async () => {
    const { errors, pagination, totals } = await repo.getErrorSummary({ provider: "nonexistent", pageSize: 50 });
    expect(errors).toEqual([]);
    expect(pagination.totalItems).toBe(0);
    expect(pagination.totalPages).toBe(0);
    expect(totals.errorGroupCount).toBe(0);
  });

  it("paginates the group list with totals over the full set", async () => {
    const page1 = await repo.getErrorSummary({ pageSize: 2 });
    expect(page1.errors).toHaveLength(2);
    expect(page1.pagination.totalItems).toBe(4);
    expect(page1.pagination.totalPages).toBe(2);
    expect(page1.pagination.hasNext).toBe(true);
    expect(page1.pagination.hasPrev).toBe(false);

    const page2 = await repo.getErrorSummary({ pageSize: 2, page: 2 });
    expect(page2.errors).toHaveLength(2);
    expect(page2.pagination.hasNext).toBe(false);
    expect(page2.pagination.hasPrev).toBe(true);

    // Pages are disjoint and together cover every group.
    const seen = new Set([...page1.errors, ...page2.errors].map((e) => e.fingerprint));
    expect(seen.size).toBe(4);
  });
});

// ── settings boardColumns triage round-trip ─────────────────────────────────
describe("settings boardColumns (triage persistence, MAP_REPLACE)", () => {
  it("defaults to an empty map", async () => {
    const s = await settingsRepo.getSettings();
    expect(s.boardColumns).toEqual({});
  });

  it("round-trips assignments and survives reload", async () => {
    await settingsRepo.updateSettings({
      boardColumns: { "anthropic|claude-sonnet|rate_limit": "acknowledged", "openai|gpt-4o|timeout": "resolved" },
    });
    const s = await settingsRepo.getSettings();
    expect(s.boardColumns).toEqual({
      "anthropic|claude-sonnet|rate_limit": "acknowledged",
      "openai|gpt-4o|timeout": "resolved",
    });
  });

  it("uses replace semantics — a partial map drops entries not in the update (deletes honored)", async () => {
    await settingsRepo.updateSettings({ boardColumns: { "anthropic|claude-sonnet|rate_limit": "dismissed" } });
    const s = await settingsRepo.getSettings();
    expect(s.boardColumns).toEqual({ "anthropic|claude-sonnet|rate_limit": "dismissed" });
  });

  it("keeps unrelated settings keys intact when boardColumns changes", async () => {
    await settingsRepo.updateSettings({ analyzeErrorModel: "test/model" });
    await settingsRepo.updateSettings({ boardColumns: { fp: "open" } });
    const s = await settingsRepo.getSettings();
    expect(s.analyzeErrorModel).toBe("test/model");
    expect(s.boardColumns).toEqual({ fp: "open" });
  });
});
