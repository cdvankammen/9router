# Implementation Plan Import-12 — Retention & Lifecycle Management — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #hermes-import #retention #lifecycle #archival #purge #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (adapter API `db.run/get/all/exec` positional params — **no `.prepare()`**; `DB_DIR` from `src/lib/db/paths.js` — archive dir should live under it; settings from `src/lib/db/repos/settingsRepo.js`; scheduler from plan import-11; `import_archives` table **does not exist** — needs its own migration e.g. `010-import-archives`; `crypto` must import `node:crypto`).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — retention; archive; purge; restore.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-import-12-retention-lifecycle.md`, `../research/9router/impl-plan-import-11-import-scheduler.md`, `../research/9router/impl-plan-import-01-db-schema.md`.

## Scope

**In scope:** time/size-based retention; archive to JSONL/SQLite; scheduled purge job; restore from archive.
**Out of scope:** scheduler (import-11); deduplication (import-13).

## Milestones

### M1 — Retention config

**Reference code (`src/lib/import/retention.js`):**

```js
import path from "node:path";
import { getAdapter } from "@/lib/db/driver.js";
import { DB_DIR } from "@/lib/db/paths.js";

const DEFAULT_RETENTION_DAYS = 90;
const ARCHIVE_DIR = path.join(DB_DIR, "archive");

export async function getRetentionConfig() {
  const { getSettings } = await import("@/lib/db/repos/settingsRepo.js");
  const settings = await getSettings();
  return {
    retentionDays: settings.importRetentionDays || DEFAULT_RETENTION_DAYS,
    perSource: settings.importRetentionPerSource || {}, // { hermes: 30, "log-file": 90, manual: null }
    maxRows: settings.importMaxRows || 100_000,
    archiveEnabled: settings.importArchiveEnabled !== false,
    archiveDir: settings.importArchiveDir || ARCHIVE_DIR,
  };
}

export async function findExpiredRows() {
  const db = await getAdapter();
  const config = await getRetentionConfig();
  const cutoff = new Date(Date.now() - config.retentionDays * 86_400_000).toISOString();
  return db.all(`
    SELECT * FROM imported_messages
    WHERE imported_at < ?
    ORDER BY imported_at ASC
    LIMIT 10000
  `, [cutoff]);
}
```

**Acceptance criteria:** config; expired rows.

### M2 — Archive writer

**Reference code (`src/lib/import/archive.js`):**

```js
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { getAdapter } from "@/lib/db/driver.js";

export async function archiveRows(rows) {
  const { getRetentionConfig } = await import("./retention.js");
  const config = await getRetentionConfig();
  if (!config.archiveEnabled) return { archived: 0, skipped: rows.length };

  fs.mkdirSync(config.archiveDir, { recursive: true });
  const month = new Date().toISOString().slice(0, 7); // YYYY-MM
  const file = path.join(config.archiveDir, `imported-${month}.jsonl.gz`);
  const gz = zlib.createGzip();
  const out = fs.createWriteStream(file, { flags: "a" });
  gz.pipe(out);

  let archived = 0;
  for (const row of rows) {
    gz.write(JSON.stringify(row) + "\n");
    archived++;
  }
  await new Promise((resolve, reject) => {
    gz.end();
    out.on("finish", resolve);
    out.on("error", reject);
  });

  // Record archive metadata.
  const db = await getAdapter();
  db.run(`INSERT INTO import_archives (id, file, row_count, created_at) VALUES (?, ?, ?, ?)`,
    [crypto.randomUUID(), file, archived, new Date().toISOString()]);

  return { archived, skipped: 0, file };
}
```

**Acceptance criteria:** gzip JSONL; metadata; archive record.

### M3 — Purge + restore

**Reference code (`src/lib/import/retention.js` additions):**

```js
// Purge: delete archived rows.
export async function purgeRows(rows) {
  const db = await getAdapter();
  const ids = rows.map((r) => r.id);
  const tx = db.transaction((list) => {
    for (const id of list) db.run(`DELETE FROM imported_messages WHERE id = ?`, [id]);
  });
  tx(ids);
  return ids.length;
}

// Restore: read archive file back into the table.
export async function restoreFromArchive(file) {
  const fs = await import("node:fs");
  const zlib = await import("node:zlib");
  const db = await getAdapter();
  const content = zlib.gunzipSync(fs.readFileSync(file)).toString("utf8");
  const rows = content.split("\n").filter(Boolean).map((l) => JSON.parse(l));
  const tx = db.transaction((list) => {
    for (const r of list) {
      db.run(`INSERT OR IGNORE INTO imported_messages (id, imported_at, source, provider, model, status, request_json, response_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [r.id, r.imported_at, r.source, r.provider, r.model, r.status, r.request_json, r.response_json]);
    }
  });
  tx(rows);
  return rows.length;
}
```

**Acceptance criteria:** purge; restore.

### M4 — Migration + tests

**Reference code (`src/lib/db/migrations/010-import-archives.js`):**

```js
export default {
  version: 10,
  name: "import-archives",
  up(db) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS import_archives (
        id TEXT PRIMARY KEY,
        file TEXT NOT NULL,
        row_count INTEGER DEFAULT 0,
        created_at TEXT NOT NULL
      )
    `);
    console.log("[DB][migrate:010] import_archives table created");
  },
};
```

**Files touched:** `src/lib/import/retention.js` (new), `src/lib/import/archive.js` (new), `src/lib/db/migrations/010-import-archives.js` (new), `src/lib/db/repos/settingsRepo.js` (retention settings), `src/lib/import/scheduler.js` (purge hook), `tests/unit/import-retention.test.js` (new).

**Acceptance criteria:** migration; tests pass.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Data loss | Purge without archive | Archive-first |
| Archive corruption | Unreadable files | gzip + metadata |
| Retention drift | Unbounded table | maxRows cap |
| Restore conflicts | Duplicate rows | INSERT OR IGNORE |

## Verification

- Unit: getRetentionConfig, findExpiredRows, archiveRows, purgeRows, restoreFromArchive
- Manual: expire rows → archive → purge → restore
- Regression: `tests/__baseline__/verify-no-regression.mjs`