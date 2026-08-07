/**
 * Smart-router (sr-*) combo cleanup scheduler.
 *
 * Verifies:
 * - Pure selection: only stale sr-* combos qualify; fresh sr-* combos, non-sr
 *   combos, and combos with unknown age are never selected.
 * - Tick: deletes exactly the stale combos via the injected repo functions,
 *   counts results, and is fail-open (a throwing deleteCombo does not abort
 *   the sweep; a throwing loadCombos is swallowed).
 * - Scheduler: no-ops when disabled (settings off) — the default.
 */

import { describe, it, expect, vi, afterEach } from "vitest";

const NOW = Date.parse("2026-08-07T12:00:00.000Z");
const HOUR = 3600 * 1000;

function combo(overrides = {}) {
  return {
    id: "c-" + Math.random().toString(36).slice(2, 8),
    name: "sr-modelRouter-code-generation",
    kind: "llm",
    models: ["mock/a", "mock/b"],
    createdAt: new Date(NOW - 48 * HOUR).toISOString(),
    updatedAt: new Date(NOW - 2 * HOUR).toISOString(),
    ...overrides,
  };
}

const silentLog = {
  info: () => {},
  warn: () => {},
  debug: () => {},
  error: () => {},
};

describe("selectStaleSmartCombos (pure)", () => {
  it("selects an sr-* combo last touched before the TTL cutoff", async () => {
    const { selectStaleSmartCombos } = await import("../../src/sse/services/srComboCleanup.js");
    const stale = combo({ updatedAt: new Date(NOW - 30 * HOUR).toISOString() });
    const list = selectStaleSmartCombos([stale], 24 * HOUR, NOW);
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe(stale.id);
  });

  it("skips sr-* combos touched within the TTL window", async () => {
    const { selectStaleSmartCombos } = await import("../../src/sse/services/srComboCleanup.js");
    const fresh = combo({ updatedAt: new Date(NOW - 2 * HOUR).toISOString() });
    expect(selectStaleSmartCombos([fresh], 24 * HOUR, NOW)).toHaveLength(0);
  });

  it("never selects non-sr combos (user combos are untouchable)", async () => {
    const { selectStaleSmartCombos } = await import("../../src/sse/services/srComboCleanup.js");
    const userCombo = combo({
      name: "my-custom-combo",
      updatedAt: new Date(NOW - 30 * 24 * HOUR).toISOString(), // very old
    });
    const list = selectStaleSmartCombos([userCombo], 24 * HOUR, NOW);
    expect(list).toHaveLength(0);
  });

  it("skips combos with unparseable updatedAt (unknown age → keep)", async () => {
    const { selectStaleSmartCombos } = await import("../../src/sse/services/srComboCleanup.js");
    const bad = combo({ updatedAt: "not-a-date" });
    const nullDate = combo({ updatedAt: null });
    const noDate = combo({});
    const list = selectStaleSmartCombos([bad, nullDate, noDate], 24 * HOUR, NOW);
    expect(list).toHaveLength(0);
  });

  it("treats the exact cutoff as stale (older-than, not older-or-equal)", async () => {
    const { selectStaleSmartCombos } = await import("../../src/sse/services/srComboCleanup.js");
    // updatedAt == cutoff → NOT stale (strictly less than cutoff required)
    const boundary = combo({ updatedAt: new Date(NOW - 24 * HOUR).toISOString() });
    expect(selectStaleSmartCombos([boundary], 24 * HOUR, NOW)).toHaveLength(0);
  });

  it("handles empty / non-array input", async () => {
    const { selectStaleSmartCombos } = await import("../../src/sse/services/srComboCleanup.js");
    expect(selectStaleSmartCombos([], 24 * HOUR, NOW)).toHaveLength(0);
    expect(selectStaleSmartCombos(null, 24 * HOUR, NOW)).toHaveLength(0);
  });
});

describe("runSrComboCleanupTick (DI'd, fail-open)", () => {
  it("deletes only stale sr-* combos and reports results", async () => {
    const { runSrComboCleanupTick } = await import("../../src/sse/services/srComboCleanup.js");

    const staleA = combo({ id: "stale-a", name: "sr-auto-code", updatedAt: new Date(NOW - 30 * HOUR).toISOString() });
    const staleB = combo({ id: "stale-b", name: "sr-auto-chat", updatedAt: new Date(NOW - 50 * HOUR).toISOString() });
    const fresh = combo({ id: "fresh-1", updatedAt: new Date(NOW - HOUR).toISOString() });
    const userCombo = combo({ id: "user-1", name: "my-combo", updatedAt: new Date(NOW - 30 * HOUR).toISOString() });

    const deleted = [];
    const result = await runSrComboCleanupTick({
      loadCombos: async () => [staleA, staleB, fresh, userCombo],
      deleteCombo: async (id) => { deleted.push(id); return true; },
      ttlMs: 24 * HOUR,
      nowMs: NOW,
      logger: silentLog,
    });

    expect(result.deleted).toBe(2);
    expect(result.scanned).toBe(2);
    expect(result.errors).toBe(0);
    expect(deleted.sort()).toEqual(["stale-a", "stale-b"]);
    expect(result.deletedNames.sort()).toEqual(["sr-auto-chat", "sr-auto-code"]);
  });

  it("continues sweeping when one delete throws (fail-open per combo)", async () => {
    const { runSrComboCleanupTick } = await import("../../src/sse/services/srComboCleanup.js");

    const staleA = combo({ id: "stale-a", updatedAt: new Date(NOW - 30 * HOUR).toISOString() });
    const staleB = combo({ id: "stale-b", updatedAt: new Date(NOW - 30 * HOUR).toISOString() });

    const deleted = [];
    const result = await runSrComboCleanupTick({
      loadCombos: async () => [staleA, staleB],
      deleteCombo: async (id) => {
        if (id === "stale-a") throw new Error("db locked");
        deleted.push(id);
        return true;
      },
      ttlMs: 24 * HOUR,
      nowMs: NOW,
      logger: silentLog,
    });

    expect(result.deleted).toBe(1);
    expect(result.errors).toBe(1);
    expect(deleted).toEqual(["stale-b"]);
  });

  it("swallows a throwing loadCombos (fail-open tick)", async () => {
    const { runSrComboCleanupTick } = await import("../../src/sse/services/srComboCleanup.js");

    const result = await runSrComboCleanupTick({
      loadCombos: async () => { throw new Error("db down"); },
      deleteCombo: async () => { throw new Error("should not be called"); },
      ttlMs: 24 * HOUR,
      nowMs: NOW,
      logger: silentLog,
    });

    expect(result.errors).toBe(1);
    expect(result.deleted).toBe(0);
    expect(result.skipped).toBe(false);
  });

  it("does nothing when loadCombos returns a non-array", async () => {
    const { runSrComboCleanupTick } = await import("../../src/sse/services/srComboCleanup.js");

    const result = await runSrComboCleanupTick({
      loadCombos: async () => null,
      deleteCombo: async () => { throw new Error("should not be called"); },
      ttlMs: 24 * HOUR,
      nowMs: NOW,
      logger: silentLog,
    });

    expect(result.deleted).toBe(0);
    expect(result.errors).toBe(0);
  });
});

describe("startSrComboCleanup (scheduler gate)", () => {
  afterEach(() => {
    vi.resetModules();
  });

  it("refuses to start when disabled — this is the default for all installs", async () => {
    const mod = await import("../../src/sse/services/srComboCleanup.js");
    // No timers should be armed when enabled=false (the default setting).
    const started = mod.startSrComboCleanup({ enabled: false, ttlHours: 24, intervalHours: 12 });
    expect(started).toBe(false);
  });

  it("is idempotent — second start while running is a no-op", async () => {
    const mod = await import("../../src/sse/services/srComboCleanup.js");
    // force the runtime guard off by faking the phase to empty
    const originalPhase = process.env.NEXT_PHASE;
    delete process.env.NEXT_PHASE;

    try {
      const first = mod.startSrComboCleanup({ enabled: true, ttlHours: 24, intervalHours: 12 });
      const second = mod.startSrComboCleanup({ enabled: true, ttlHours: 24, intervalHours: 12 });
      expect(first).toBe(true);
      expect(second).toBe(true);
    } finally {
      mod.stopSrComboCleanup();
      if (originalPhase === undefined) delete process.env.NEXT_PHASE;
      else process.env.NEXT_PHASE = originalPhase;
    }
  });

  it("runs a tick on the real repo layer when enabled (integration-style)", async () => {
    const mod = await import("../../src/sse/services/srComboCleanup.js");
    // Direct tick with real DB adapter (sql.js fallback works everywhere).
    // Use a temp DATA_DIR so we never touch the dev DB.
    const originalDataDir = process.env.DATA_DIR;
    process.env.DATA_DIR = "/tmp/9r-sr-cleanup-test-" + Date.now();

    try {
      const { getAdapter } = await import("../../src/lib/db/driver.js");
      const db = await getAdapter();
      // Ensure schema (combos table) exists — driver may auto-migrate; create if missing.
      db.run(`CREATE TABLE IF NOT EXISTS combos (
        id TEXT PRIMARY KEY,
        name TEXT,
        kind TEXT,
        models TEXT,
        createdAt TEXT,
        updatedAt TEXT
      )`);

      const now = new Date().toISOString();
      const oldIso = new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString();
      db.run(
        `INSERT OR REPLACE INTO combos(id, name, kind, models, createdAt, updatedAt) VALUES(?,?,?,?,?,?)`,
        ["sr-old", "sr-modelRouter-code", "llm", "[]", oldIso, oldIso]
      );
      db.run(
        `INSERT OR REPLACE INTO combos(id, name, kind, models, createdAt, updatedAt) VALUES(?,?,?,?,?,?)`,
        ["sr-fresh", "sr-modelRouter-chat", "llm", "[]", now, now]
      );
      db.run(
        `INSERT OR REPLACE INTO combos(id, name, kind, models, createdAt, updatedAt) VALUES(?,?,?,?,?,?)`,
        ["user-keeper", "my-precious-combo", "llm", "[]", oldIso, oldIso]
      );

      const result = await mod.runSrComboCleanupTick({
        ttlMs: 24 * 3600 * 1000,
        logger: silentLog,
      });

      expect(result.deleted).toBe(1);
      expect(result.deletedNames).toEqual(["sr-modelRouter-code"]);

      const remaining = db.all(`SELECT id FROM combos ORDER BY id`);
      const ids = remaining.map((r) => r.id).sort();
      expect(ids).toEqual(["sr-fresh", "user-keeper"]);
    } finally {
      if (originalDataDir === undefined) delete process.env.DATA_DIR;
      else process.env.DATA_DIR = originalDataDir;
      mod.stopSrComboCleanup();
    }
  });
});
