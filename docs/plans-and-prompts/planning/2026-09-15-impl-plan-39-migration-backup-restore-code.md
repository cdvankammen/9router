# Implementation Plan 39 — Migration, Backup & Restore — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #migration #backup #restore #upgrade #data-safety #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (`src/lib/db/migrations/` existing migration shape, `src/lib/db/paths.js` `DATA_DIR`/`~/.9router/`, `src/lib/db/driver.js` adapter chain, the fact that `usage.json`/`log.txt` live under `~/.9router` and do **not** follow `DATA_DIR`).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — run a backup, corrupt/restore, confirm restore; run migrations up/down.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-39-migration-backup-restore.md`, `../research/9router/impl-plan-193-db-migrations-schema-evolution.md`, `../research/9router/impl-plan-116-db-adapter-chain-hardening.md`.

## Scope

**In scope:** versioned migration runner (ordered, transaction-wrapped, tracked in `schema_migrations`); automatic scheduled backups (full DB + usage files + config) with verification; guided restore workflow with confirmation; documented upgrade paths + pre-upgrade checks + rollback.
**Out of scope:** incremental/PITR backups; remote backup destinations (S3) — see plan 25 cloud sync.

## Milestones

### M1 — Migration runner + version tracking

**Reference code (`src/lib/db/migrator.js`):**

```js
import fs from "node:fs";
import path from "node:path";
import { getAdapter } from "./driver.js";

const MIGRATIONS_DIR = path.join(process.cwd(), "src", "lib", "db", "migrations");

export async function ensureMigrationTable(db) {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL
    );
  `);
}

export async function appliedVersions(db) {
  await ensureMigrationTable(db);
  const rows = await db.all(`SELECT version FROM schema_migrations ORDER BY version`);
  return new Set(rows.map((r) => r.version));
}

export async function runMigrations() {
  const db = await getAdapter();
  const applied = await appliedVersions(db);
  const files = fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(".js")).sort();
  const results = [];
  for (const file of files) {
    const version = file.replace(/\.js$/, "");
    if (applied.has(version)) continue;
    const mod = await import(path.join(MIGRATIONS_DIR, file));
    // Transaction-wrap so a failed migration leaves no partial schema.
    await db.exec("BEGIN");
    try {
      await (mod.up ?? mod.default?.up)(db);
      await db.run(`INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)`, [version, new Date().toISOString()]);
      await db.exec("COMMIT");
      results.push({ version, ok: true });
    } catch (err) {
      await db.exec("ROLLBACK");
      results.push({ version, ok: false, error: err.message });
      throw err; // stop on first failure
    }
  }
  return results;
}

export async function rollbackTo(version) {
  const db = await getAdapter();
  const applied = await appliedVersions(db);
  const files = fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(".js")).sort().reverse();
  for (const file of files) {
    const v = file.replace(/\.js$/, "");
    if (v === version) break;
    if (!applied.has(v)) continue;
    const mod = await import(path.join(MIGRATIONS_DIR, file));
    if (!mod.down && !mod.default?.down) throw new Error(`Migration ${v} has no down()`);
    await db.exec("BEGIN");
    try {
      await (mod.down ?? mod.default.down)(db);
      await db.run(`DELETE FROM schema_migrations WHERE version = ?`, v);
      await db.exec("COMMIT");
    } catch (err) {
      await db.exec("ROLLBACK");
      throw err;
    }
  }
}
```

**Acceptance criteria:** migrations apply in order once; re-run is a no-op; failure rolls back; `rollbackTo` works.

### M2 — Automated backups + verification

**Reference code (`src/lib/backup/backup.js`):**

```js
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { getAdapter } from "@/lib/db/driver.js";
import { DB_DIR } from "@/lib/db/paths.js";

const BACKUP_DIR = path.join(DB_DIR, "backups");

export async function createBackup({ label = "auto" } = {}) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const db = await getAdapter();
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const dir = path.join(BACKUP_DIR, `${stamp}-${label}`);
  fs.mkdirSync(dir, { recursive: true });

  // 1. DB snapshot — dump all tables to JSON (adapter-agnostic).
  const tables = await db.all(`SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'`);
  const dump = {};
  for (const { name } of tables) dump[name] = await db.all(`SELECT * FROM ${name}`);
  fs.writeFileSync(path.join(dir, "db.json.gz"), zlib.gzipSync(JSON.stringify(dump)));

  // 2. Usage + log files (these live under ~/.9router and do NOT follow DATA_DIR).
  const usageDir = path.join(process.env.HOME ?? "/root", ".9router");
  for (const f of ["usage.json", "log.txt"]) {
    const src = path.join(usageDir, f);
    if (fs.existsSync(src)) fs.copyFileSync(src, path.join(dir, f));
  }

  // 3. Config snapshot (settings row).
  const settings = await db.all(`SELECT * FROM settings`);
  fs.writeFileSync(path.join(dir, "settings.json"), JSON.stringify(settings, null, 2));

  // 4. Manifest + checksum for verification.
  const checksum = crypto.createHash("sha256").update(fs.readFileSync(path.join(dir, "db.json.gz"))).digest("hex");
  fs.writeFileSync(path.join(dir, "manifest.json"), JSON.stringify({ stamp, label, checksum, tables: tables.map((t) => t.name) }, null, 2));

  return dir;
}

export async function verifyBackup(dir) {
  const manifest = JSON.parse(fs.readFileSync(path.join(dir, "manifest.json"), "utf8"));
  const actual = crypto.createHash("sha256").update(fs.readFileSync(path.join(dir, "db.json.gz"))).digest("hex");
  return { ok: actual === manifest.checksum, manifest, actual };
}

export async function pruneBackups({ keep = 7 } = {}) {
  if (!fs.existsSync(BACKUP_DIR)) return [];
  const dirs = fs.readdirSync(BACKUP_DIR).sort().reverse();
  const removed = [];
  for (const d of dirs.slice(keep)) {
    fs.rmSync(path.join(BACKUP_DIR, d), { recursive: true, force: true });
    removed.push(d);
  }
  return removed;
}
```

**Acceptance criteria:** backup dir created with DB dump + usage files + settings + manifest; verification detects corruption; retention prunes oldest.

### M3 — Restore workflow (guided, confirmed, tested)

**Reference code (`src/lib/backup/restore.js`):**

```js
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { getAdapter } from "@/lib/db/driver.js";

export async function previewRestore(dir) {
  const manifest = JSON.parse(fs.readFileSync(path.join(dir, "manifest.json"), "utf8"));
  const { ok } = await verifyBackup(dir);
  return { manifest, verified: ok };
}

export async function restoreBackup(dir, { confirmToken }) {
  // Guard: require an explicit confirm token so a stray call can't wipe data.
  if (confirmToken !== "RESTORE") throw new Error("Restore requires confirmToken === 'RESTORE'");

  const { verified } = await verifyBackup(dir);
  if (!verified) throw new Error("Backup failed checksum verification — refusing to restore");

  // Safety backup of current state before overwrite.
  await createBackup({ label: "pre-restore" });

  const db = await getAdapter();
  const dump = JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(dir, "db.json.gz"))).toString());
  for (const [table, rows] of Object.entries(dump)) {
    await db.exec(`DELETE FROM ${table}`);
    for (const row of rows) {
      const cols = Object.keys(row);
      const placeholders = cols.map(() => "?").join(", ");
      await db.run(`INSERT INTO ${table} (${cols.join(", ")}) VALUES (${placeholders})`, cols.map((c) => row[c]));
    }
  }
  return { restored: Object.keys(dump), safetyBackup: "pre-restore" };
}
```

**Acceptance criteria:** preview verifies checksum; restore refuses without token; pre-restore safety backup created; data round-trips.

### M4 — API + dashboard + upgrade docs + tests

**Reference code (`src/app/api/v1/backup/route.js`):**

```js
import { NextResponse } from "next/server";
import { createBackup, pruneBackups } from "@/lib/backup/backup.js";
import { previewRestore, restoreBackup } from "@/lib/backup/restore.js";

export async function GET() {
  return NextResponse.json({ backups: await listBackups() });
}

export async function POST(req) {
  const { action, label, dir, confirmToken } = await req.json();
  if (action === "create") return NextResponse.json({ dir: await createBackup({ label }) });
  if (action === "prune") return NextResponse.json({ removed: await pruneBackups() });
  if (action === "preview") return NextResponse.json(await previewRestore(dir));
  if (action === "restore") return NextResponse.json(await restoreBackup(dir, { confirmToken }));
  return NextResponse.json({ error: "unknown action" }, { status: 400 });
}
```

**Files touched:** `src/lib/backup/` (new: backup, restore), `src/app/api/v1/backup/route.js` (new), dashboard backup page (new: list/create/verify/restore + retention config), `docs/UPGRADING.md` (new: version-to-version upgrade paths, pre-upgrade checks, rollback), `tests/unit/backup-restore.test.js` (new).

**Acceptance criteria:** API works; dashboard functional; upgrade doc covers all released versions; tests pass.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Migration failure mid-upgrade | Partial schema | Transaction + backup-first |
| Backup corruption | Silently bad restore | Checksum verification |
| Restore data loss | Accidental overwrite | Confirm token + pre-restore backup |
| Adapter variance (sql.js vs bun) | `sqlite_master` differences | Adapter-agnostic dump; test each driver |

## Verification

- Unit: migrator (up/down/rollback), backup manifest + checksum, restore guard
- Manual: create backup → verify → restore → confirm data; run migrations on a copy
- Regression: `tests/__baseline__/verify-no-regression.mjs`