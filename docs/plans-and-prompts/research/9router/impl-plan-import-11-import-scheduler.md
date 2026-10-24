# Implementation Plan 11: Import Scheduler & Automation

**Date:** 2026-09-17
**Author:** GitHub Copilot agent (6-level binary tree expansion)
**Status:** active
**Tags:** implementation-plan, hermes-import, scheduler, automation, cron, jobs

> ⚠️ **AGENT REVIEW NOTE (READ FIRST)**
> THIS PLAN IS A RESEARCH DOCUMENT — NOT AN IMPLEMENTATION INSTRUCTION.
> The code is a **SUGGESTION / OPTION** for future agents — NOT a final decision, NOT an instruction to implement anything.
> Code snippets show **possible approaches** (file paths, function signatures, patterns) — options, not requirements.
> **Nothing in this plan should be implemented automatically** — future agents must evaluate each suggestion, decide if there's a better way, and only then proceed.
> The agent is the final arbiter: if a better approach exists, make those changes happen.

## Source Research Branches

This plan implements options researched in:
- `../2026-09-17-hermes-import-branch-q-automation-scheduling.md` (primary — cron scheduling, job queue, watch folder)
- `../2026-09-17-hermes-import-branch-e-conversation-reconstruction.md` (conversation grouping for batched imports)
- `../2026-09-17-hermes-import-branch-r-retention-lifecycle.md` (daily purge hook scheduled from the tick loop)

## Goal

Automate imports: scheduled pulls, watch folders, retry queues, backfill jobs. **This is a research artifact — code below is a suggestion for future agents, not an implementation.**

## Grounding (verified against the real codebase, 2026-09-17)

| Fact | Verified value |
|------|---------------|
| **Migration version 6 is TAKEN** | Plan 02 uses `006-unknown-models` (version 6). `import_jobs` must be a LATER version (e.g. `009-import-jobs`) |
| Migration format | `export default { version, name, up(db) }` — `db.exec()` for DDL |
| Adapter API | `db.run/get/all/exec` positional params — **no `.prepare()`** |
| Project is ESM | Plain ESM JavaScript — **no `require()`** (original watchFolder used `require`) |
| `getAdapter()` is async | Must be awaited — original `updateProgress` called it without await |
| Boot hook | `src/instrumentation.js` `register()` — scheduler would start here (like `startSrComboCleanup`) |
| Settings | `getSettings()`/`updateSettings()` in `src/lib/db/repos/settingsRepo.js` |

## Scope

- Cron-based scheduled imports
- Watch folder ingestion
- `import_jobs` table + job runner
- Retry with backoff + dead letter

## Design

### 1. Job Table Migration — `src/lib/db/migrations/009-import-jobs.js`

**Purpose:** Track import jobs. **Version 9** (5–8 taken by plans 01/02/04/10).

```javascript
// src/lib/db/migrations/009-import-jobs.js
// SUGGESTION ONLY — review against actual codebase before implementing
export default {
  version: 9,
  name: "import-jobs",
  up(db) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS import_jobs (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,               -- scheduled | watch | backfill | manual
        source TEXT NOT NULL,             -- log-file | hermes | proxy | manual
        status TEXT NOT NULL DEFAULT 'pending',  -- pending | running | done | failed | dead | cancelled
        progress INTEGER DEFAULT 0,       -- 0-100
        total INTEGER DEFAULT 0,
        processed INTEGER DEFAULT 0,
        error TEXT,
        retry_count INTEGER DEFAULT 0,
        max_retries INTEGER DEFAULT 5,
        next_retry_at TEXT,
        created_at TEXT NOT NULL,
        started_at TEXT,
        finished_at TEXT,
        metadata TEXT
      )
    `);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_import_jobs_status ON import_jobs(status)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_import_jobs_created ON import_jobs(created_at)`);
    console.log("[DB][migrate:009] import_jobs table created");
  },
};
```

### 2. Job Runner — `src/lib/import/jobRunner.js`

**Purpose:** Execute jobs with retry/backoff/dead-letter. **Positional params only.**

**⚠️ GROUNDING FIXES (original plan was wrong):**
1. Used `db.prepare(...).get/run(...)` — adapter has no `.prepare()`. Use `db.get(sql, params)` / `db.run(sql, params)`.
2. `updateProgress` called `getAdapter()` without await — it's async.
3. `crypto` not imported — add `import crypto from "node:crypto"`.

```javascript
// src/lib/import/jobRunner.js
// SUGGESTION ONLY — review against actual codebase before implementing
import crypto from "node:crypto";
import { getAdapter } from "@/lib/db/driver.js";

let running = false;
let cancelFlag = false;

export function cancelCurrentJob() { cancelFlag = true; }

export async function runJob(jobId) {
  const db = await getAdapter();
  if (running) return { error: "job-already-running" };
  running = true;
  cancelFlag = false;

  try {
    const job = db.get("SELECT * FROM import_jobs WHERE id = ?", [jobId]);
    if (!job) return { error: "job-not-found" };

    db.run(`UPDATE import_jobs SET status = 'running', started_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?`, [jobId]);

    // Dispatch by type
    let result;
    if (job.type === "watch" || job.type === "scheduled") {
      const { importFromLogFiles } = await import("./logWatcher.js");
      result = await importFromLogFiles({ onProgress: (p) => updateProgress(jobId, p) });
    } else if (job.type === "backfill") {
      const { backfillImport } = await import("./backfill.js");
      result = await backfillImport(JSON.parse(job.metadata || "{}"), { onProgress: (p) => updateProgress(jobId, p) });
    }

    db.run(`UPDATE import_jobs SET status = 'done', progress = 100, finished_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?`, [jobId]);
    return result;
  } catch (err) {
    const job = db.get("SELECT * FROM import_jobs WHERE id = ?", [jobId]);
    const retryCount = (job?.retry_count || 0) + 1;
    if (retryCount <= (job?.max_retries || 5)) {
      const backoffMs = Math.min(60_000 * 2 ** (retryCount - 1), 3_600_000); // 1m, 2m, 4m... cap 1h
      db.run(`
        UPDATE import_jobs SET status = 'pending', retry_count = ?, error = ?,
          next_retry_at = datetime('now', '+' || ? || ' seconds')
        WHERE id = ?
      `, [retryCount, err.message, Math.round(backoffMs / 1000), jobId]);
      scheduleRetry(jobId, backoffMs);
    } else {
      db.run(`UPDATE import_jobs SET status = 'dead', error = ?, finished_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?`, [err.message, jobId]);
    }
    return { error: err.message };
  } finally {
    running = false;
  }
}

async function updateProgress(jobId, { processed, total }) {
  const db = await getAdapter(); // async — must await
  const progress = total ? Math.round((processed / total) * 100) : 0;
  db.run(`UPDATE import_jobs SET progress = ?, processed = ?, total = ? WHERE id = ?`, [progress, processed, total, jobId]);
}

const retryTimers = new Map();
function scheduleRetry(jobId, delayMs) {
  if (retryTimers.has(jobId)) clearTimeout(retryTimers.get(jobId));
  retryTimers.set(jobId, setTimeout(() => { retryTimers.delete(jobId); runJob(jobId); }, delayMs));
}
```

### 3. Scheduler Loop — `src/lib/import/scheduler.js`

**Purpose:** Periodic tick that creates + runs scheduled jobs. **Positional params.**

```javascript
// src/lib/import/scheduler.js
// SUGGESTION ONLY — review against actual codebase before implementing
import crypto from "node:crypto";
import { getAdapter } from "@/lib/db/driver.js";

let timer = null;
let lastRunAt = 0;

export function startScheduler(intervalMs = 60_000) {
  if (timer) return;
  timer = setInterval(tick, intervalMs);
  tick(); // run once on startup (catch-up)
}

export function stopScheduler() {
  if (timer) { clearInterval(timer); timer = null; }
}

async function tick() {
  const db = await getAdapter();
  const { getSettings } = await import("@/lib/db/repos/settingsRepo.js");
  const settings = await getSettings();
  if (!settings.importSchedule?.enabled) return;

  const now = Date.now();
  const cronMs = parseInterval(settings.importSchedule.interval || "5m");
  if (now - lastRunAt < cronMs) return;
  lastRunAt = now;

  // Create + run a scheduled job
  const jobId = crypto.randomUUID();
  db.run(`
    INSERT INTO import_jobs (id, type, source, status, created_at)
    VALUES (?, 'scheduled', ?, 'pending', strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  `, [jobId, settings.importSchedule.source || "log-file"]);

  const { runJob } = await import("./jobRunner.js");
  runJob(jobId); // fire and forget
}

function parseInterval(str) {
  const m = str.match(/^(\d+)([smhd])$/);
  if (!m) return 300_000;
  const mult = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[m[2]];
  return parseInt(m[1], 10) * mult;
}
```

### 4. Watch Folder — `src/lib/import/watchFolder.js`

**Purpose:** Watch a directory for new log files, create watch jobs. **ESM — no `require()`.**

**⚠️ GROUNDING FIX:** Original used `require("./jobRunner.js")` — project is ESM. Use dynamic `import()`.

```javascript
// src/lib/import/watchFolder.js
// SUGGESTION ONLY — review against actual codebase before implementing
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { getAdapter } from "@/lib/db/driver.js";

let watcher = null;
let debounceTimer = null;

export function startWatchFolder(dir, patterns = ["*.jsonl", "*.log", "usage-*.json"]) {
  if (watcher) return;
  if (!fs.existsSync(dir)) return;
  watcher = fs.watch(dir, { persistent: true }, (eventType, filename) => {
    if (!filename) return;
    if (!patterns.some((p) => matchGlob(filename, p))) return;
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(async () => {
      const { runJob } = await import("./jobRunner.js"); // ESM dynamic import
      const db = await getAdapter();
      const jobId = crypto.randomUUID();
      db.run(`
        INSERT INTO import_jobs (id, type, source, status, metadata, created_at)
        VALUES (?, 'watch', 'log-file', 'pending', ?, strftime('%Y-%m-%dT%H:%M:%fZ','now'))
      `, [jobId, JSON.stringify({ file: path.join(dir, filename) })]);
      runJob(jobId);
    }, 500); // debounce atomic rename patterns
  });
}

function matchGlob(filename, pattern) {
  const regex = new RegExp("^" + pattern.replace(/\./g, "\\.").replace(/\*/g, ".*") + "$");
  return regex.test(filename);
}
```

### 5. Boot hook — `src/instrumentation.js`

**Purpose:** Start scheduler + watch folder at boot (like `startSrComboCleanup`).

```javascript
// src/instrumentation.js (addition inside register(), NEXT_RUNTIME === "nodejs")
try {
  const { startScheduler } = await import("@/lib/import/scheduler.js");
  startScheduler();
  const { startWatchFolder } = await import("@/lib/import/watchFolder.js");
  startWatchFolder(process.env.IMPORT_WATCH_DIR || "");
} catch (err) {
  console.error("[ImportScheduler] start failed:", err?.message || err);
}
```

## Steps (per-part instructions)

### Step 1 — Migration 009: `import_jobs` table
1. Create `src/lib/db/migrations/009-import-jobs.js`.
2. Register in `migrations/index.js`.
3. **Verify:** `latestVersion()` returns 9.

### Step 2 — `jobRunner.js` — run/retry/dead-letter
1. Create the file.
2. **Verify:** a failing job retries with backoff, then goes `dead` after max_retries.

### Step 3 — `scheduler.js` — cron loop with catch-up
1. Create the file.
2. **Verify:** with `importSchedule.enabled`, a job is created every interval.

### Step 4 — `watchFolder.js` — fs.watch with debounce
1. Create the file.
2. **Verify:** dropping a `.jsonl` file in the watch dir creates a watch job within ~500ms.

### Step 5 — Job status API + UI
1. Add `GET /api/messages/import/jobs` returning job list.
2. Add a jobs panel to the Messages page (plan 08).
3. **Verify:** jobs show status/progress/retry state.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|-----------|------|-----------|
| In-process timers | Lost on restart | Catch-up on startup |
| fs.watch | Platform quirks (macOS) | Debounce + fallback polling |
| Long jobs | Memory | Chunked processing |

## Verification (commands)

```bash
# Create a job + run it
node -e "
import('./src/lib/import/jobRunner.js').then(async (m) => {
  const { getAdapter } = await import('./src/lib/db/driver.js');
  const db = await getAdapter();
  db.run(\"INSERT INTO import_jobs (id, type, source, status, created_at) VALUES ('test-1', 'manual', 'log-file', 'pending', strftime('%Y-%m-%dT%H:%M:%fZ','now'))\");
  console.log(await m.runJob('test-1'));
})"
# Expect: job runs (or errors gracefully), status transitions pending → running → done/dead
```

## Note to Implementing Agents (READ FIRST)

The code above is a **starting point for review**, not a final implementation. Agents MUST review it against the actual codebase, decide if there is a better way, make those changes happen, verify by running, and update this plan.