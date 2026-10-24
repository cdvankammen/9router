# Implementation Plan 193 — DB Migrations & Schema Evolution — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #db #migrations #schema #rollback #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (DB adapter chain from plan 116 (`src/lib/db/driver.js` — `getAdapter()`); SQLite optimization from plan 43; migration backup from plan 39; DB layer from plan 11). **Migrations live in `src/lib/db/migrations/` with `up`/`down` exports — follow the existing pattern.**
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — framework; versioning; rollback.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-193-db-migrations-schema-evolution.md`, `../research/9router/impl-plan-116-db-adapter-chain.md`, `../research/9router/impl-plan-43-sqlite-optimization.md`.

## Scope

**In scope:** migration framework (files, runner, state); schema versioning (version, tracking, compatibility); rollback support (scripts, safety, testing).
**Out of scope:** DB adapter chain (plan 116); SQLite optimization (plan 43).

## Milestones

### M1 — Migration framework

**Reference code (`src/lib/db/migrations/framework.js`):**

```js
// Migration files: versioned migration scripts.
// Each migration: {version, name, up(db), down(db)}

// Migration runner: apply migrations in order.
export function runMigrations({ db, migrations = [], current = 0 } = {}) {
  const applied = [];
  const pending = migrations.filter((m) => m.version > current).sort((a, b) => a.version - b.version);
  for (const m of pending) {
    m.up(db);
    applied.push(m.version);
  }
  return { applied, latest: applied.length ? applied[applied.length - 1] : current };
}

// Migration state: track applied migrations.
export function makeMigrationState(db, { table = "migrations" } = {}) {
  return {
    // Ensure state table exists.
    init() {
      db.exec(`CREATE TABLE IF NOT EXISTS ${table} (version INTEGER PRIMARY KEY, name TEXT, applied_at TEXT)`);
    },
    current() {
      this.init();
      const row = db.prepare(`SELECT MAX(version) AS v FROM ${table}`).get();
      return row?.v ?? 0;
    },
    record(migration) {
      this.init();
      db.prepare(`INSERT INTO ${table} (version, name, applied_at) VALUES (?, ?, ?)`).run(migration.version, migration.name, new Date().toISOString());
    },
  };
}
```

**Acceptance criteria:** runner; state; tracking.

### M2 — Schema versioning

**Reference code (`src/lib/db/schema.js`):**

```js
// Schema version: current schema version.
export function schemaVersion({ state } = {}) {
  return state.current();
}

// Version tracking: version in DB.
export function trackVersion({ db, version = 1 } = {}) {
  db.exec(`CREATE TABLE IF NOT EXISTS schema_meta (key TEXT PRIMARY KEY, value TEXT)`);
  db.prepare(`INSERT OR REPLACE INTO schema_meta (key, value) VALUES ('version', ?)`).run(String(version));
}

// Version compatibility: forward/backward compatibility.
export function compatibility({ current = 1, min = 1, max = 99 } = {}) {
  return { compatible: current >= min && current <= max, current, min, max };
}
```

**Acceptance criteria:** version; tracking; compatibility.

### M3 — Rollback support

**Reference code (`src/lib/db/migrations/rollback.js`):**

```js
// Rollback scripts: reverse migrations.
export function rollback({ db, migrations = [], to = 0 } = {}) {
  const rolled = [];
  const applied = migrations.filter((m) => m.version > to).sort((a, b) => b.version - a.version);
  for (const m of applied) {
    m.down(db);
    rolled.push(m.version);
  }
  return { rolled, now: to };
}

// Rollback safety: data preservation.
export function backupBefore({ db, path = null } = {}) {
  // Copy DB file before destructive migration.
  if (!path) return { backedUp: false, reason: "no-path" };
  const fs = require("node:fs");
  fs.copyFileSync(db.name, path);
  return { backedUp: true, path };
}

// Rollback testing: test rollbacks.
export function testRollback({ db, migrations = [] } = {}) {
  const errors = [];
  for (const m of migrations) {
    try { m.up(db); m.down(db); } catch (e) { errors.push({ version: m.version, error: e.message }); }
  }
  return { ok: errors.length === 0, errors };
}
```

**Acceptance criteria:** rollback; safety; testing.

### M4 — Integration + tests

**Reference code (`scripts/migrate.js`):**

```js
// CLI: apply migrations.
import { getAdapter } from "../src/lib/db/driver.js";
import { runMigrations, makeMigrationState } from "../src/lib/db/migrations/framework.js";
import { migrations } from "../src/lib/db/migrations/index.js";

const db = getAdapter();
const state = makeMigrationState(db);
const result = runMigrations({ db, migrations, current: state.current() });
for (const v of result.applied) state.record(migrations.find((m) => m.version === v));
console.log(`Applied ${result.applied.length} migrations; schema now at ${result.latest}`);
```

**Files touched:** `src/lib/db/migrations/framework.js` (new), `src/lib/db/migrations/rollback.js` (new), `src/lib/db/schema.js` (new), `scripts/migrate.js` (new), `tests/unit/migrations.test.js` (new).

**Acceptance criteria:** CLI; integration; tests.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Migration failures | Broken DB | Rollback |
| Data loss | Lost data | Backup before migration |
| Version drift | Wrong schema | Version tracking |
| Complexity | Confusion | Simple migrations |

## Verification

- Unit: runMigrations, makeMigrationState, schemaVersion, trackVersion, compatibility, rollback, backupBefore, testRollback
- Manual: migrate up → verify → rollback down
- Regression: `tests/__baseline__/verify-no-regression.mjs`