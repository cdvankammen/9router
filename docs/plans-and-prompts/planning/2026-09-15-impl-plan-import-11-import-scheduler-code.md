# Implementation Plan Import-11 — Import Scheduler & Automation — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #hermes-import #scheduler #automation #cron #jobs #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (**migration version 6 is TAKEN** by plan import-02 — `import_jobs` must be a LATER version e.g. `009-import-jobs`; migration format `export default { version, name, up(db) }`; adapter API `db.run/get/all/exec` positional params — **no `.prepare()`**; project is ESM — **no `require()`**; `getAdapter()` is async — must be awaited; boot hook from `src/instrumentation.js` `register()`; settings from `src/lib/db/repos/settingsRepo.js`).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — jobs; runner; scheduler.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-import-11-import-scheduler.md`, `../research/9router/impl-plan-import-04-log-file-tail.md`, `../research/9router/impl-plan-import-12-retention-lifecycle.md`.

## Scope

**In scope:** cron-based scheduled imports; watch folder ingestion; `import_jobs` table + job runner; retry with backoff + dead letter.
**Out of scope:** log watcher (import-04); retention (import-12).

## Milestones

### M1 — Job table migration

**Reference code (`src/lib/db/migrations/009-import-jobs.js`):**

```js
// Version 9 (5–8 taken by plans import-01/02/04/10).
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

**Acceptance criteria:** table + indexes; version 9.

### M2 — Job runner

**Reference code (`src/lib/import/jobRunner.js`):**

```js
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

    // Dispatch by type.
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
    // Retry with backoff, then dead-letter.
    const job = db.get("SELECT * FROM import_jobs WHERE id = ?", [jobId]);
    const retries = (job?.retry_count ?? 0) + 1;
    if (retries <= (job?.max_retries ?? 5)) {
      db.run(`UPDATE import_jobs SET status = 'pending', retry_count = ?, next_retry_at = strftime('%Y-%m-%dT%H:%M:%fZ','now', '+' || ? || ' seconds') WHERE id = ?`,
        [retries, Math.min(300, 2 ** retries), jobId]);
    } else {
      db.run(`UPDATE import_jobs SET status = 'dead', error = ?, finished_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?`, [err.message, jobId]);
    }
    return { error: err.message };
  } finally {
    running = false;
  }
}

async function updateProgress(jobId, progress) {
  const db = await getAdapter();
  db.run(`UPDATE import_jobs SET progress = ? WHERE id = ?`, [progress, jobId]);
}
```

**Acceptance criteria:** dispatch; retry/backoff; dead-letter.

### M3 — Scheduler

**Reference code (`src/lib/import/scheduler.js`):**

```js
import { getAdapter } from "@/lib/db/driver.js";
import { runJob } from "./jobRunner.js";

// Tick: pick due jobs and run them.
export async function schedulerTick() {
  const db = await getAdapter();
  const due = db.all(
    `SELECT * FROM import_jobs
     WHERE status = 'pending' AND (next_retry_at IS NULL OR next_retry_at <= strftime('%Y-%m-%dT%H:%M:%fZ','now'))
     ORDER BY created_at ASC LIMIT 1`,
  );
  for (const job of due) {
    await runJob(job.id);
  }
}

// Start periodic scheduler (boot hook).
export function startImportScheduler({ intervalMs = 60_000 } = {}) {
  const timer = setInterval(() => {
    schedulerTick().catch((err) => console.error("[import] scheduler tick failed:", err));
  }, intervalMs);
  timer.unref?.();
  return timer;
}
```

**Acceptance criteria:** tick; due jobs; boot hook.

### M4 — Tests

**Reference code (`tests/unit/import-scheduler.test.js`):**

```js
import { describe, it, expect } from "vitest";
import { runJob } from "@/lib/import/jobRunner.js";

describe("runJob", () => {
  it("rejects missing jobs", async () => {
    const r = await runJob("nope");
    expect(r.error).toBe("job-not-found");
  });
  it("prevents concurrent runs", async () => {
    // runJob twice in parallel — second gets job-already-running.
  });
});
```

**Files touched:** `src/lib/db/migrations/009-import-jobs.js` (new), `src/lib/import/jobRunner.js` (new), `src/lib/import/scheduler.js` (new), `src/instrumentation.js` (boot hook), `tests/unit/import-scheduler.test.js` (new).

**Acceptance criteria:** tests pass.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Version collision | Migration conflict | Version 9 |
| Concurrent jobs | Double imports | running flag |
| Retry storms | Amplification | Backoff + dead letter |
| Boot failures | Crash | Fail-open try/catch |

## Verification

- Unit: runJob, schedulerTick, updateProgress, cancelCurrentJob
- Manual: create job → run → retry → dead-letter
- Regression: `tests/__baseline__/verify-no-regression.mjs`