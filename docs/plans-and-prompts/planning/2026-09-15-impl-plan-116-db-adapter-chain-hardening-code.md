# Implementation Plan 116 — DB Adapter Chain Hardening & Migration Tooling — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #db #adapter-chain #migrations #sqlite #reliability #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (adapter chain in `src/lib/db/driver.js` (`getAdapter()`); migrations in `src/lib/db/migrations/` with `up`/`down`; repos exported from `src/lib/db/index.js`; backup hooks from plan 39).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — run adapter self-tests; apply a migration with rollback; confirm integrity check.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-116-db-adapter-chain-hardening.md`, `../research/9router/impl-plan-43-sqlite-optimization.md`, `../research/9router/impl-plan-39-migration-backup.md`.

## Scope

**In scope:** adapter contract + health checks (per-adapter self-test, automatic fallback with logging, fallback caps); migration tooling (sequential versioning, up/down rollback, locking, dry-run); data integrity (PRAGMA integrity_check, corruption recovery via backup); adapter/migration telemetry + dashboard DB health view.
**Out of scope:** new adapters; storage optimization internals (plan 43).

## Milestones

### M1 — Adapter contract + health checks

**Reference code (`src/lib/db/health.js`):**

```js
// Adapter self-test: run a trivial query through the adapter.
export async function adapterSelfTest(adapter) {
  try {
    const rows = await adapter.all("SELECT 1 AS ok");
    return { ok: rows?.[0]?.ok === 1, error: null };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

// Fallback with logging + caps: never loop forever.
export async function withFallback(chain, { log = console, maxFallbacks = 3 } = {}) {
  let lastError = null;
  let fallbacks = 0;
  for (const adapter of chain) {
    const test = await adapterSelfTest(adapter);
    if (test.ok) return { adapter, fallbacks };
    lastError = test.error;
    log.warn(`[db] adapter ${adapter.name} failed self-test: ${test.error}`);
    fallbacks += 1;
    if (fallbacks >= maxFallbacks) break;
  }
  throw new Error(`[db] all adapters failed; last error: ${lastError}`);
}

// Adapter parity: same behavior across adapters.
export async function parityCheck(adapters, { query = "SELECT 1 AS ok" } = {}) {
  const results = [];
  for (const a of adapters) {
    try { results.push({ adapter: a.name, rows: await a.all(query) }); }
    catch (err) { results.push({ adapter: a.name, error: err.message }); }
  }
  const first = results[0];
  return results.every((r) => r.error == null && JSON.stringify(r.rows) === JSON.stringify(first.rows));
}
```

**Acceptance criteria:** self-test; capped fallback; parity check.

### M2 — Migration tooling

**Reference code (`src/lib/db/migrations/tooling.js`):**

```js
// Migration record: versioned, up/down, locked.
export function makeMigrationRunner({ db, migrations = [], lockTable = "_migrations" } = {}) {
  return {
    async applied() {
      await db.exec(`CREATE TABLE IF NOT EXISTS ${lockTable} (version INTEGER PRIMARY KEY, name TEXT, applied_at TEXT)`);
      return (await db.all(`SELECT version FROM ${lockTable}`)).map((r) => r.version);
    },
    // Locking: single-flight via a lock row.
    async withLock(fn) {
      try {
        await db.exec(`INSERT INTO ${lockTable} (version, name, applied_at) VALUES (-1, 'lock', datetime('now'))`);
      } catch { throw new Error("[db] migration lock held by another process"); }
      try { return await fn(); }
      finally { await db.exec(`DELETE FROM ${lockTable} WHERE version = -1`); }
    },
    // Dry-run: preview without applying.
    async dryRun(migrations) {
      const applied = await this.applied();
      return migrations.filter((m) => !applied.includes(m.version)).map((m) => ({ version: m.version, name: m.name, sql: m.up?.toString().slice(0, 80) ?? "(fn)" }));
    },
    // Apply: up in order; rollback on failure.
    async up(migrations = migrations) {
      return this.withLock(async () => {
        const applied = await this.applied();
        for (const m of [...migrations].sort((a, b) => a.version - b.version)) {
          if (applied.includes(m.version)) continue;
          try {
            await m.up(db);
            await db.exec(`INSERT INTO ${lockTable} (version, name, applied_at) VALUES (${m.version}, '${m.name}', datetime('now'))`);
          } catch (err) {
            await m.down?.(db); // rollback
            throw new Error(`[db] migration ${m.version} (${m.name}) failed: ${err.message}; rolled back`);
          }
        }
      });
    },
    // Rollback: down the last N migrations.
    async down(n = 1) {
      return this.withLock(async () => {
        const applied = (await this.applied()).sort((a, b) => b - a).slice(0, n);
        for (const version of applied) {
          const m = migrations.find((x) => x.version === version);
          await m?.down?.(db);
          await db.exec(`DELETE FROM ${lockTable} WHERE version = ${version}`);
        }
      });
    },
  };
}
```

**Acceptance criteria:** versioning; locking; dry-run; rollback.

### M3 — Data integrity

**Reference code (`src/lib/db/integrity.js`):**

```js
// PRAGMA integrity_check.
export async function integrityCheck(db) {
  const rows = await db.all("PRAGMA integrity_check");
  const ok = rows.every((r) => r.integrity_check === "ok");
  return { ok, detail: rows };
}

// Corruption recovery: rebuild from backup (plan 39 hooks).
export async function recoverFromBackup({ db, backupPath, restore } = {}) {
  const check = await integrityCheck(db);
  if (check.ok) return { recovered: false, reason: "intact" };
  if (!backupPath) return { recovered: false, reason: "no-backup" };
  await restore(backupPath);
  const after = await integrityCheck(db);
  return { recovered: after.ok, reason: after.ok ? "restored-from-backup" : "restore-failed" };
}
```

**Acceptance criteria:** integrity check; recovery path.

### M4 — Telemetry + dashboard + tests

**Reference code (`src/lib/db/telemetry.js`):**

```js
// Adapter + migration telemetry.
export function makeDbTelemetry() {
  const events = [];
  return {
    recordAdapter(adapterName, { fallbacks = 0 } = {}) { events.push({ t: "adapter", adapterName, fallbacks, at: Date.now() }); },
    recordMigration(version, { ok = true, rolledBack = false } = {}) { events.push({ t: "migration", version, ok, rolledBack, at: Date.now() }); },
    report() {
      const adapters = events.filter((e) => e.t === "adapter");
      const migrations = events.filter((e) => e.t === "migration");
      return {
        activeAdapter: adapters.at(-1)?.adapterName ?? null,
        fallbackEvents: adapters.filter((e) => e.fallbacks > 0).length,
        migrations: { applied: migrations.filter((e) => e.ok).length, rolledBack: migrations.filter((e) => e.rolledBack).length },
      };
    },
  };
}
```

**Files touched:** `src/lib/db/driver.js` (hardening), `src/lib/db/migrations/` (tooling), `src/lib/db/health.js` (new), `src/lib/db/integrity.js` (new), `src/lib/db/telemetry.js` (new), dashboard db page (new), `tests/unit/db.test.js` (new).

**Acceptance criteria:** telemetry; dashboard view; tests.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Adapter divergence | Different behavior | Parity tests |
| Migration failure | Partial schema | Rollback + locking |
| Corruption | Data loss | Integrity checks |
| Fallback loops | Infinite retry | Fallback caps |

## Verification

- Unit: adapterSelfTest, withFallback, parityCheck, makeMigrationRunner, integrityCheck
- Manual: run migrations with dry-run; corrupt DB → recover from backup
- Regression: `tests/__baseline__/verify-no-regression.mjs`