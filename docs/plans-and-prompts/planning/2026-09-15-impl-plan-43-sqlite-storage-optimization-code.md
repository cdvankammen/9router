# Implementation Plan 43 — SQLite Layer & Storage Optimization — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #sqlite #storage #indexes #wal #vacuum #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (`src/lib/db/driver.js` adapter fallback chain: bun:sqlite → better-sqlite3 → node:sqlite → sql.js; `src/lib/db/repos/*`; `src/lib/db/migrations/`; `src/lib/usageDb.js` which still uses `usage.json` + `log.txt` under `~/.9router`).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — run the driver parity tests on every available driver; profile hot queries; confirm WAL + VACUUM behavior.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-43-sqlite-storage-optimization.md`, `../research/9router/impl-plan-39-migration-backup-restore.md`, `../research/9router/impl-plan-31-performance.md`.

## Scope

**In scope:** driver reliability + parity tests across the fallback chain; schema indexes for hot queries; slow-query logging; WAL mode + busy timeout; storage hygiene (scheduled VACUUM, retention cleanup, size telemetry).
**Out of scope:** migrating usageDb off `usage.json` (separate plan); sharding; read replicas.

## Milestones

### M1 — Driver reliability + parity tests

**Reference code (`tests/unit/db-layer.test.js`):**

```js
import { describe, it, expect, beforeAll } from "vitest";
import { getAdapter } from "@/lib/db/driver.js";

describe("SQLite driver layer", () => {
  let db;
  beforeAll(() => { db = getAdapter({ memory: true }); });

  it("detects a working driver", () => {
    expect(db.driverName).toBeTruthy();
  });

  it("runs basic CRUD", () => {
    db.exec("CREATE TABLE t (id INTEGER PRIMARY KEY, v TEXT)");
    db.run("INSERT INTO t (v) VALUES (?)", ["hello"]);
    const row = db.get("SELECT v FROM t WHERE id = 1");
    expect(row.v).toBe("hello");
  });

  it("supports transactions", () => {
    db.transaction(() => {
      db.run("INSERT INTO t (v) VALUES (?)", ["a"]);
      db.run("INSERT INTO t (v) VALUES (?)", ["b"]);
    });
    expect(db.get("SELECT COUNT(*) AS n FROM t").n).toBe(3);
  });

  it("rolls back on error", () => {
    expect(() => db.transaction(() => {
      db.run("INSERT INTO t (v) VALUES (?)", ["c"]);
      throw new Error("boom");
    })).toThrow();
    expect(db.get("SELECT COUNT(*) AS n FROM t").n).toBe(3);
  });
});
```

**Acceptance criteria:** parity suite passes on every driver the environment can provide; detection errors are clear.

### M2 — Schema indexes for hot queries

**Reference code (migration `src/lib/db/migrations/20260915-indexes.js`):**

```js
export const up = (db) => {
  // Hot queries: usage by day, sessions by user, logs by timestamp.
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_usage_day ON usage (day);
    CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions (user_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_logs_ts ON logs (ts);
    CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_status ON webhook_deliveries (status, next_attempt_at);
  `);
};

export const down = (db) => {
  db.exec(`
    DROP INDEX IF EXISTS idx_usage_day;
    DROP INDEX IF EXISTS idx_sessions_user;
    DROP INDEX IF EXISTS idx_logs_ts;
    DROP INDEX IF EXISTS idx_webhook_deliveries_status;
  `);
};
```

**Acceptance criteria:** indexes exist after migration; `EXPLAIN QUERY PLAN` shows index use on hot queries; no redundant indexes.

### M3 — WAL mode + slow-query logging

**Reference code (`src/lib/db/hygiene.js`):**

```js
import { getAdapter } from "./driver.js";

// Enable WAL + busy timeout at startup (call once after adapter init).
export function enableWAL(db) {
  try {
    db.exec("PRAGMA journal_mode = WAL");
    db.exec("PRAGMA busy_timeout = 5000");
    db.exec("PRAGMA synchronous = NORMAL");
  } catch (err) {
    // sql.js (pure-JS fallback) may not support WAL — fail open.
    console.warn("[db] WAL not enabled:", err.message);
  }
}

// Slow-query logging: wrap run/get/all when SLOW_QUERY_MS is set.
export function withSlowQueryLog(db, thresholdMs = Number(process.env.SLOW_QUERY_MS ?? 200)) {
  for (const method of ["run", "get", "all"]) {
    const orig = db[method].bind(db);
    db[method] = (...args) => {
      const start = performance.now();
      const result = orig(...args);
      const elapsed = performance.now() - start;
      if (elapsed > thresholdMs) {
        console.warn(`[db] slow ${method} (${elapsed.toFixed(0)}ms): ${String(args[0]).slice(0, 200)}`);
      }
      return result;
    };
  }
  return db;
}
```

**Acceptance criteria:** WAL active on native drivers; sql.js fails open; slow queries logged above threshold.

### M4 — Storage hygiene (VACUUM, retention, size telemetry)

**Reference code (`src/lib/db/hygiene.js` additions):**

```js
// Scheduled hygiene: run via setInterval or a cron-like loop.
export async function runHygiene(db, { vacuumEveryMs = 24 * 60 * 60 * 1000, retentionDays = 90 } = {}) {
  const stats = { vacuumed: false, removed: 0, sizeBytes: 0 };
  // 1. Retention: delete old logs/deliveries.
  const cutoff = new Date(Date.now() - retentionDays * 86_400_000).toISOString();
  try {
    const res = db.run("DELETE FROM logs WHERE ts < ?", [cutoff]);
    stats.removed = res.changes ?? 0;
  } catch { /* table may not exist yet */ }
  // 2. VACUUM (only on native drivers; sql.js throws — catch).
  try {
    db.exec("VACUUM");
    stats.vacuumed = true;
  } catch { /* fail open */ }
  // 3. Size telemetry.
  try {
    const row = db.get("PRAGMA page_count");
    const page = db.get("PRAGMA page_size");
    stats.sizeBytes = (row?.page_count ?? 0) * (page?.page_size ?? 4096);
  } catch { /* fail open */ }
  return stats;
}
```

**Files touched:** `src/lib/db/driver.js` (WAL hook), `src/lib/db/migrations/20260915-indexes.js` (new), `src/lib/db/hygiene.js` (new), `src/lib/db/index.js` (export hygiene), `tests/unit/db-layer.test.js` (new).

**Acceptance criteria:** hygiene runs on schedule; retention removes old rows; VACUUM succeeds on native drivers; size telemetry available.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Driver divergence | Parity failures | Parity tests per driver |
| Index bloat | Write slowdown | Selective indexes + EXPLAIN review |
| WAL on sql.js | Unsupported | Fail-open pragma |
| VACUUM locks | Blocked writes | Off-peak scheduling + busy_timeout |

## Verification

- Unit: driver parity, hygiene, slow-query wrapper
- Manual: `EXPLAIN QUERY PLAN` on hot queries; watch slow-query log
- Regression: `tests/__baseline__/verify-no-regression.mjs`