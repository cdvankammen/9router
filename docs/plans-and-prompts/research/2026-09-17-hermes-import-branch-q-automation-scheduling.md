# Branch Q: Import Automation & Scheduling — Hermes Message Import

**Date:** 2026-09-17
**Author:** GitHub Copilot agent (6-level binary tree expansion)
**Status:** active
**Tags:** research, hermes-import, automation, scheduling, cron, binary-tree, branch-q

## L0 Root: Hermes Message Import & External Agent Traffic Recording

## L1 Branch Q: IMPORT AUTOMATION & SCHEDULING

Automate the import pipeline: scheduled pulls from log files, watch folders, event-driven triggers, retry queues, and backfill jobs.

### L2 Q1: SCHEDULED IMPORTS

#### L3 Q1a: Cron-Based Pull
- **L4 Q1a1: Interval Config**
  - L5: Settings: `importSchedule: { enabled, cron: "*/5 * * * *", source: "log-file" }`
  - L6: Use `node-cron` or a lightweight interval loop
- **L4 Q1a2: Missed-Run Catch-Up**
  - L5: On startup, run any missed scheduled imports (last-run timestamp)
  - L6: Prevents data loss during downtime

#### L3 Q1b: Watch Folder
- **L4 Q1b1: Directory Watch**
  - L5: Watch a configured directory for new log files (fs.watch)
  - L6: On new file → parse → import → move to processed/ or archive
- **L4 Q1b2: File Pattern Filter**
  - L5: Only import files matching `*.jsonl`, `*.log`, `usage-*.json`
  - L6: Configurable glob patterns

### L2 Q2: EVENT-DRIVEN TRIGGERS

#### L3 Q2a: Webhook Trigger
- **L4 Q2a1: Incoming Webhook**
  - L5: External systems POST to `/api/messages/import/trigger` to kick off an import
  - L6: Useful for agent post-run hooks

#### L3 Q2b: File System Events
- **L4 Q2b1: fs.watch Events**
  - L5: Debounced watcher (500ms) to avoid duplicate triggers
  - L6: Handles atomic rename patterns (write-tmp-then-rename)

### L2 Q3: RETRY & FAILURE HANDLING

#### L3 Q3a: Retry Queue
- **L4 Q3a1: Failed Import Queue**
  - L5: Failed imports go to `import_jobs` table with retry count
  - L6: Exponential backoff: 1m, 5m, 15m, 1h, max 5 retries
- **L4 Q3a2: Dead Letter**
  - L5: After max retries, mark `dead` with error; UI shows dead jobs
  - L6: Manual re-run button

#### L3 Q3b: Partial Failure
- **L4 Q3b1: Per-Message Errors**
  - L5: Batch import reports per-message success/failure
  - L6: Failed messages stored in `import_errors` for inspection

### L2 Q4: BACKFILL JOBS

#### L3 Q4a: Historical Backfill
- **L4 Q4a1: Date-Range Backfill**
  - L5: Import all logs from a date range (e.g., last 30 days)
  - L6: Runs as a background job with progress reporting
- **L4 Q4a2: Full Backfill**
  - L5: Import everything available (first run scenario)
  - L6: Chunked processing to avoid memory spikes

### L2 Q5: JOB MANAGEMENT

#### L3 Q5a: Job Status API
- **L4 Q5a1: Job CRUD**
  - L5: `import_jobs` table: id, type, status (pending/running/done/failed/dead), progress, error
  - L6: `GET /api/messages/import/jobs` lists jobs with status
- **L4 Q5a2: Job Cancellation**
  - L5: `POST /api/messages/import/jobs/:id/cancel` sets a cancel flag
  - L6: Worker checks flag between chunks

#### L3 Q5b: Concurrency Control
- **L4 Q5b1: Single Runner**
  - L5: Only one import job runs at a time (mutex via DB lock)
  - L6: Prevents double-import of the same files

## Open Questions

1. Should scheduling be in-process or a separate worker process?
2. What's the expected log volume (files per day)?
3. Should backfill be user-initiated or automatic on first run?

## Related Implementation Plans

- `9router/impl-plan-import-11-import-scheduler.md` — cron loop, watch folder, job table, retry queue with code