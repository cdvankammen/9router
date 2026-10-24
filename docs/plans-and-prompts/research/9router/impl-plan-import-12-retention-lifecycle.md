# Implementation Plan 12: Retention & Lifecycle Management

**Date:** 2026-09-17
**Author:** GitHub Copilot agent (6-level binary tree expansion)
**Status:** active
**Tags:** implementation-plan, hermes-import, retention, lifecycle, archival, purge

> ⚠️ **AGENT REVIEW NOTE (READ FIRST)**
> THIS PLAN IS A RESEARCH DOCUMENT — NOT AN IMPLEMENTATION INSTRUCTION.
> The code is a **SUGGESTION / OPTION** for future agents — NOT a final decision, NOT an instruction to implement anything.
> Code snippets show **possible approaches** (file paths, function signatures, patterns) — options, not requirements.
> **Nothing in this plan should be implemented automatically** — future agents must evaluate each suggestion, decide if there's a better way, and only then proceed.
> The agent is the final arbiter: if a better approach exists, make those changes happen.

## Source Research Branches

This plan implements options researched in:
- `../2026-09-17-hermes-import-branch-r-retention-lifecycle.md` (primary — retention windows, archive, purge, restore)
- `../2026-09-17-hermes-import-branch-q-automation-scheduling.md` (daily 03:00 purge scheduling)
- `../2026-09-17-hermes-import-branch-l-security-privacy.md` (archive file permissions and PII in archived payloads)

## Goal

Bound the imported_messages table: retention policies, archive-then-purge, restore. **This is a research artifact — code below is a suggestion for future agents, not an implementation.**

## Grounding (verified against the real codebase, 2026-09-17)

| Fact | Verified value |
|------|---------------|
| Adapter API | `db.run/get/all/exec` positional params — **no `.prepare()`** |
| `DB_DIR` | `src/lib/db/paths.js` exports `DB_DIR = path.join(DATA_DIR, "db")` — archive dir should live under it |
| Settings | `getSettings()`/`updateSettings()` in `src/lib/db/repos/settingsRepo.js` |
| Scheduler | Plan 11: `scheduler.js` tick — purge hook would run there |
| `import_archives` table | **Does not exist** — needs its own migration (e.g. `010-import-archives`) |
| `crypto` | Must import `node:crypto` (original used `crypto.randomUUID` without import) |

## Scope

- Time/size-based retention
- Archive to JSONL/SQLite
- Scheduled purge job
- Restore from archive

## Design

### 1. Retention Config — `src/lib/import/retention.js`

**Purpose:** Read retention settings + find expired rows.

**⚠️ GROUNDING FIX:** Original used `db.prepare(...).all(cutoff)` — use `db.all(sql, [cutoff])`.

```javascript
// src/lib/import/retention.js
// SUGGESTION ONLY — review against actual codebase before implementing
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

### 2. Archive Writer — `src/lib/import/archive.js`

**Purpose:** Write expired rows to gzip JSONL + record metadata in `import_archives`.

**⚠️ GROUNDING FIXES (original plan was wrong):**
1. `db.prepare(...).run(...)` — use `db.run(sql, params[])`.
2. `crypto` not imported — add `import crypto from "node:crypto"`.
3. `import_archives` table undefined — needs migration `010-import-archives`.

```javascript
// src/lib/import/archive.js
// SUGGESTION ONLY — review against actual codebase before implementing
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

  // Record archive metadata
  const db = await getAdapter();
  db.run(`
    INSERT INTO import_archives (id, file, row_count, date_range_start, date_range_end, checksum, created_at)
    VALUES (?, ?, ?, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  `, [
    crypto.randomUUID(),
    file,
    archived,
    rows[0]?.importedAt,
    rows[rows.length - 1]?.importedAt,
    crypto.createHash("sha256").update(rows.map((r) => r.id).join(",")).digest("hex"),
  ]);

  return { archived, skipped: 0 };
}
```

### 3. `import_archives` table migration — `src/lib/db/migrations/010-import-archives.js`

**Purpose:** Track archive files for restore + audit.

```javascript
// src/lib/db/migrations/010-import-archives.js
// SUGGESTION ONLY — review against actual codebase before implementing
export default {
  version: 10,
  name: "import-archives",
  up(db) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS import_archives (
        id TEXT PRIMARY KEY,
        file TEXT NOT NULL,
        row_count INTEGER NOT NULL DEFAULT 0,
        date_range_start TEXT,
        date_range_end TEXT,
        checksum TEXT,
        created_at TEXT NOT NULL
      )
    `);
    console.log("[DB][migrate:010] import_archives table created");
  },
};
```

### 4. Purge Job — `src/lib/import/purge.js`

**Purpose:** Archive-then-purge + maxRows cap. **Positional params.**

**⚠️ GROUNDING FIX:** Original used `db.prepare(...).run(...ids)` — use `db.run(sql, ids)`.

```javascript
// src/lib/import/purge.js
// SUGGESTION ONLY — review against actual codebase before implementing
import { getAdapter } from "@/lib/db/driver.js";

export async function runPurge() {
  const db = await getAdapter();
  const { findExpiredRows, getRetentionConfig } = await import("./retention.js");
  const { archiveRows } = await import("./archive.js");

  const config = await getRetentionConfig();
  const expired = await findExpiredRows();
  if (!expired.length) return { purged: 0, archived: 0 };

  const { archived } = await archiveRows(expired);
  const ids = expired.map((r) => r.id);
  const placeholders = ids.map(() => "?").join(",");
  const result = db.run(`DELETE FROM imported_messages WHERE id IN (${placeholders})`, ids);

  // Also enforce maxRows cap
  const cntRow = db.get("SELECT COUNT(*) as c FROM imported_messages");
  const count = cntRow ? cntRow.c : 0;
  if (count > config.maxRows) {
    const excess = count - config.maxRows;
    db.run(`
      DELETE FROM imported_messages WHERE id IN (
        SELECT id FROM imported_messages ORDER BY imported_at ASC LIMIT ?
      )
    `, [excess]);
  }

  return { purged: result.changes, archived };
}

// Daily schedule hook — call from scheduler.js tick():
// if (settings.importRetentionEnabled && now.getHours() === 3) await runPurge();
```

### 5. Restore — `src/lib/import/restore.js`

**Purpose:** Re-import from an archive file, preserving original timestamps.

```javascript
// src/lib/import/restore.js
// SUGGESTION ONLY — review against actual codebase before implementing
import fs from "node:fs";
import zlib from "node:zlib";
import readline from "node:readline";
import { insertImportedMessages } from "@/lib/db/repos/importedMessagesRepo.js";

export async function restoreFromArchive(file) {
  const stream = fs.createReadStream(file).pipe(zlib.createGunzip());
  const rl = readline.createInterface({ input: stream });
  const batch = [];
  let restored = 0;

  for await (const line of rl) {
    if (!line.trim()) continue;
    const row = JSON.parse(line);
    // Preserve original imported_at
    batch.push({
      ...row,
      id: `restore-${row.id}`,
      metadata: { ...(row.metadata ? JSON.parse(row.metadata) : {}), restoredFrom: file },
    });
    if (batch.length >= 500) {
      restored += await insertImportedMessages(batch);
      batch.length = 0;
    }
  }
  if (batch.length) restored += await insertImportedMessages(batch);
  return { restored };
}
```

## Steps (per-part instructions)

### Step 1 — `retention.js` — config + expired row finder
1. Create the file.
2. **Verify:** `findExpiredRows()` returns rows older than `retentionDays`.

### Step 2 — `archive.js` — JSONL.gz writer + archive metadata
1. Create the file.
2. **Verify:** archiving 3 rows produces a valid `.jsonl.gz`; `import_archives` has a row.

### Step 3 — Migration 010: `import_archives` table
1. Create `src/lib/db/migrations/010-import-archives.js`.
2. Register in `migrations/index.js`.
3. **Verify:** `latestVersion()` returns 10.

### Step 4 — `purge.js` — archive-then-purge + maxRows cap
1. Create the file.
2. **Verify:** expired rows archived then deleted; maxRows cap enforced.

### Step 5 — Hook purge into scheduler (03:00 daily)
1. In `scheduler.js` tick, add the daily purge hook.
2. **Verify:** purge runs once per day at 03:00.

### Step 6 — `restore.js` + restore endpoint
1. Create the file + `POST /api/messages/import/restore` route.
2. **Verify:** restore re-imports with `restore-` prefixed IDs, original timestamps.

### Step 7 — Settings UI: retention days, archive dir, enable toggles
1. Add settings fields + UI.
2. **Verify:** changing retention days affects `findExpiredRows`.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|-----------|------|-----------|
| Archive writes | Disk full | Check free space, fail-open |
| Purge + insert race | Deleting rows being imported | Run purge in transaction |
| Restore IDs | Collision with existing | `restore-` prefix |

## Verification (commands)

```bash
# Archive + purge round-trip
node -e "
import('./src/lib/import/purge.js').then(async (m) => {
  const r = await m.runPurge();
  console.log('purged:', r.purged, 'archived:', r.archived);
})"
# Expect: expired rows purged, archive file created under DB_DIR/archive
```

## Note to Implementing Agents (READ FIRST)

The code above is a **starting point for review**, not a final implementation. Agents MUST review it against the actual codebase, decide if there is a better way, make those changes happen, verify by running, and update this plan.