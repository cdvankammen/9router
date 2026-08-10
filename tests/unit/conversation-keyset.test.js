/**
 * DB-level conversation aggregation (B3) + keyset pagination.
 *
 * Verifies:
 * - getConversationSummary: SQL GROUP BY over the FULL dataset — correct
 *   counts/tokens/cost per conversation (including conversations spanning
 *   multiple pages), ordered by lastTimestamp DESC, "(none)" group for NULL
 *   conversationId, pagination totals, filter respect.
 * - getConversationMessages: full thread ASC regardless of page window,
 *   pageSize honored, NULL-conversation group queryable.
 * - Keyset: with pageSize=10 over 30 rows, iterating nextCursor visits every
 *   row exactly once (no duplicates/gaps), including timestamp ties (id
 *   tiebreak); pagination object keeps page/pageSize/totalItems/hasNext.
 * - Backward compat: page param still works and agrees with the keyset walk.
 *
 * Temp DATA_DIR pattern (isolated sqlite per run) mirrors
 * request-details-json-filter.test.js / cost-capture.test.js.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it, expect, beforeAll, afterAll } from "vitest";

const originalDataDir = process.env.DATA_DIR;
let tempDir;

// Dataset: 30 rows across 3 conversations
//   conv-long: 25 rows, anthropic/claude-sonnet, T0..T0+24min (spans pages)
//   conv-b:     2 rows, openai/gpt-4o-mini,     T0+25..T0+26min (newest)
//   (none):     3 rows, deepseek/deepseek-chat, all at T0 (timestamp ties)
const T0 = "2026-08-09T10:00:00.000Z";
const MIN = 60 * 1000;

function iso(base, minutes) {
  return new Date(Date.parse(base) + minutes * MIN).toISOString();
}

let repo;

beforeAll(async () => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "9router-conv-keyset-"));
  process.env.DATA_DIR = tempDir;
  process.env.ENABLE_REQUEST_LOGS = "true";
  const { initDb, updateSettings } = await import("@/lib/db/index.js");
  await initDb();
  // batchSize=1 → saveRequestDetail flushes immediately (buffered writer)
  await updateSettings({ enableObservability: true, observabilityBatchSize: 1, observabilityMaxRecords: 500 });
  repo = await import("@/lib/db/repos/requestDetailsRepo.js");

  // conv-long: 25 rows, tokens/cost scale with i
  for (let i = 0; i < 25; i++) {
    await repo.saveRequestDetail({
      id: `long-${String(i).padStart(2, "0")}`,
      timestamp: iso(T0, i),
      provider: "anthropic",
      model: "claude-sonnet",
      connectionId: "conn-a",
      status: "success",
      conversationId: "conv-long",
      tokens: { prompt_tokens: 100 + i, completion_tokens: 50 + i },
      cost: 0.001 + i * 0.0001,
      request: { messages: [{ role: "user", content: `msg ${i}` }] },
      providerRequest: {}, providerResponse: {}, response: { content: "ok" },
    });
  }
  // conv-b: 2 newest rows
  await repo.saveRequestDetail({
    id: "b-0", timestamp: iso(T0, 25), provider: "openai", model: "gpt-4o-mini",
    status: "success", conversationId: "conv-b",
    tokens: { prompt_tokens: 500, completion_tokens: 200 }, cost: 0.005,
    request: { messages: [] }, providerRequest: {}, providerResponse: {}, response: { content: "ok" },
  });
  await repo.saveRequestDetail({
    id: "b-1", timestamp: iso(T0, 26), provider: "openai", model: "gpt-4o-mini",
    status: "success", conversationId: "conv-b",
    tokens: { prompt_tokens: 500, completion_tokens: 200 }, cost: 0.005,
    request: { messages: [] }, providerRequest: {}, providerResponse: {}, response: { content: "ok" },
  });
  // (none): 3 rows sharing T0 — exercises the id tiebreak in keyset ordering
  for (let i = 0; i < 3; i++) {
    await repo.saveRequestDetail({
      id: `none-${i}`, timestamp: T0, provider: "deepseek", model: "deepseek-chat",
      status: "success",
      tokens: { prompt_tokens: 10, completion_tokens: 5 }, cost: 0.0001,
      request: { messages: [] }, providerRequest: {}, providerResponse: {}, response: { content: "ok" },
    });
  }

  // Let the fire-and-forget batched flushes settle before querying.
  await new Promise((r) => setTimeout(r, 50));
});

afterAll(() => {
  delete process.env.ENABLE_REQUEST_LOGS;
  if (tempDir) fs.rmSync(tempDir, { recursive: true, force: true });
  if (originalDataDir === undefined) delete process.env.DATA_DIR;
  else process.env.DATA_DIR = originalDataDir;
});

// ── getConversationSummary ──────────────────────────────────────────────────
describe("getConversationSummary (SQL GROUP BY over the full dataset)", () => {
  it("aggregates counts/tokens/cost per conversation, ordered by lastTimestamp DESC", async () => {
    const { conversations, pagination, totals } = await repo.getConversationSummary({ pageSize: 50 });

    expect(totals.conversationCount).toBe(3);
    expect(pagination.totalItems).toBe(3);
    expect(conversations.map((c) => c.conversationId)).toEqual(["conv-b", "conv-long", null]);

    // conv-b: 2 rows × (500 prompt, 200 completion, $0.005)
    const b = conversations[0];
    expect(b.messageCount).toBe(2);
    expect(b.tokens.prompt).toBe(1000);
    expect(b.tokens.completion).toBe(400);
    expect(b.cost).toBeCloseTo(0.01, 9);
    expect(b.lastTimestamp).toBe(iso(T0, 26));
    expect(b.firstTimestamp).toBe(iso(T0, 25));

    // conv-long: 25 rows spanning many pages — the B3 fix: the page window
    // (e.g. 10) must NOT truncate the aggregate.
    const l = conversations[1];
    expect(l.messageCount).toBe(25);
    expect(l.tokens.prompt).toBe(2800); // Σ(100+i), i=0..24
    expect(l.tokens.completion).toBe(1550); // Σ(50+i), i=0..24
    expect(l.cost).toBeCloseTo(0.055, 9); // 25×0.001 + 300×0.0001
    expect(l.lastTimestamp).toBe(iso(T0, 24));
    expect(l.firstTimestamp).toBe(iso(T0, 0));

    // NULL conversationId groups as "(none)" → null in the response
    const n = conversations[2];
    expect(n.conversationId).toBeNull();
    expect(n.messageCount).toBe(3);
    expect(n.tokens.prompt).toBe(30);
    expect(n.tokens.completion).toBe(15);
    expect(n.cost).toBeCloseTo(0.0003, 9);
  });

  it("respects the same filters as getRequestDetails (minus conversationId)", async () => {
    const { conversations, pagination } = await repo.getConversationSummary({ provider: "openai", pageSize: 50 });
    expect(conversations).toHaveLength(1);
    expect(conversations[0].conversationId).toBe("conv-b");
    expect(pagination.totalItems).toBe(1);
  });

  it("paginates the conversation list with correct totals", async () => {
    const page1 = await repo.getConversationSummary({ page: 1, pageSize: 2 });
    const page2 = await repo.getConversationSummary({ page: 2, pageSize: 2 });
    expect(page1.pagination).toMatchObject({ page: 1, pageSize: 2, totalItems: 3, totalPages: 2, hasNext: true, hasPrev: false });
    expect(page1.conversations.map((c) => c.conversationId)).toEqual(["conv-b", "conv-long"]);
    expect(page2.pagination.hasNext).toBe(false);
    expect(page2.conversations.map((c) => c.conversationId)).toEqual([null]);
  });
});

// ── getConversationMessages ─────────────────────────────────────────────────
describe("getConversationMessages (full thread ASC)", () => {
  it("returns the FULL multi-page conversation ASC by timestamp", async () => {
    const thread = await repo.getConversationMessages("conv-long");
    expect(thread).toHaveLength(25);
    expect(thread[0].id).toBe("long-00");
    expect(thread[24].id).toBe("long-24");
    // strictly ascending
    const tss = thread.map((m) => m.timestamp);
    expect([...tss].sort()).toEqual(tss);
    // every row belongs to the conversation
    expect(thread.every((m) => m.conversationId === "conv-long")).toBe(true);
  });

  it("honors pageSize for paginated thread reads", async () => {
    const first = await repo.getConversationMessages("conv-long", { pageSize: 10 });
    expect(first).toHaveLength(10);
    expect(first[0].id).toBe("long-00");
    const second = await repo.getConversationMessages("conv-long", { page: 2, pageSize: 10 });
    expect(second).toHaveLength(10);
    expect(second[0].id).toBe("long-10");
  });

  it("queries the (none) group via null conversationId", async () => {
    const none = await repo.getConversationMessages(null);
    expect(none).toHaveLength(3);
    expect(none.every((m) => m.conversationId === undefined || m.conversationId === null)).toBe(true);
  });

  it("applies other filters inside the conversation", async () => {
    const ok = await repo.getConversationMessages("conv-long", { status: "success" });
    expect(ok).toHaveLength(25);
    const err = await repo.getConversationMessages("conv-long", { status: "error" });
    expect(err).toHaveLength(0);
  });
});

// ── Keyset pagination ───────────────────────────────────────────────────────
describe("getRequestDetails keyset pagination", () => {
  it("walks every row exactly once via nextCursor (no dupes/gaps)", async () => {
    const seen = [];
    let cursor = null;
    let pages = 0;
    for (;;) {
      const res = await repo.getRequestDetails(cursor ? { pageSize: 10, cursor } : { pageSize: 10 });
      pages += 1;
      expect(res.details.length).toBeLessThanOrEqual(10);
      const ids = res.details.map((d) => d.id);
      // no duplicates across the walk
      for (const id of ids) expect(seen).not.toContain(id);
      seen.push(...ids);
      // pagination object shape preserved in cursor mode
      expect(res.pagination).toMatchObject({
        page: 1, pageSize: 10, totalItems: 30,
        hasNext: res.nextCursor ? true : pages < 3,
      });
      expect(res.pagination.hasNext).toBe(pages < 3);
      if (!res.nextCursor) break;
      cursor = res.nextCursor;
    }
    expect(pages).toBe(3);
    expect(seen).toHaveLength(30);
    expect(new Set(seen).size).toBe(30); // every row exactly once
  });

  it("keyset order matches offset order (backward-compat page param)", async () => {
    // Build the keyset walk with pageSize 10…
    const walk = [];
    let cursor = null;
    for (let i = 0; i < 3; i++) {
      const res = await repo.getRequestDetails({ pageSize: 10, ...(cursor ? { cursor } : {}) });
      walk.push(...res.details.map((d) => d.id));
      cursor = res.nextCursor;
    }
    // …and compare to plain page param (same ORDER BY timestamp DESC, id DESC)
    for (let p = 1; p <= 3; p++) {
      const res = await repo.getRequestDetails({ page: p, pageSize: 10 });
      expect(res.details.map((d) => d.id)).toEqual(walk.slice((p - 1) * 10, p * 10));
      expect(res.pagination).toMatchObject({ page: p, pageSize: 10, totalItems: 30, totalPages: 3 });
    }
  });

  it("newest-first with the id tiebreak for equal timestamps", async () => {
    const res = await repo.getRequestDetails({ pageSize: 30 });
    const ids = res.details.map((d) => d.id);
    // T0 group (last 4 rows): id DESC within the tie → none-2, none-1, none-0, long-00
    expect(ids.slice(-4)).toEqual(["none-2", "none-1", "none-0", "long-00"]);
    expect(ids[0]).toBe("b-1");
    expect(ids[1]).toBe("b-0");
  });

  it("falls back to offset page 1 on an unparseable cursor", async () => {
    const res = await repo.getRequestDetails({ pageSize: 10, cursor: "not-a-valid-cursor" });
    expect(res.details).toHaveLength(10);
    expect(res.pagination.totalItems).toBe(30);
    expect(res.pagination.hasNext).toBe(true);
    expect(res.nextCursor).toBeTruthy();
  });

  it("returns a null nextCursor on the last page", async () => {
    const res = await repo.getRequestDetails({ page: 3, pageSize: 10 });
    expect(res.nextCursor).toBeNull();
    expect(res.pagination.hasNext).toBe(false);
  });
});
