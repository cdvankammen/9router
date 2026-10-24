# Branch R: Data Retention & Lifecycle — Hermes Message Import

**Date:** 2026-09-17
**Author:** GitHub Copilot agent (6-level binary tree expansion)
**Status:** active
**Tags:** research, hermes-import, retention, lifecycle, archival, binary-tree, branch-r

## L0 Root: Hermes Message Import & External Agent Traffic Recording

## L1 Branch R: DATA RETENTION & LIFECYCLE

Imported messages accumulate fast. Define retention policies, archival, purging, and cold storage so the DB stays bounded and queries stay fast.

### L2 R1: RETENTION POLICIES

#### L3 R1a: Time-Based Retention
- **L4 R1a1: Default TTL**
  - L5: Default retention: 90 days (configurable)
  - L6: `imported_at < now() - interval` rows are candidates for purge
- **L4 R1a2: Per-Source Retention**
  - L5: Different TTL per source (hermes=30d, log-file=90d, manual=forever)
  - L6: Config in settings JSON

#### L3 R1b: Size-Based Retention
- **L4 R1b1: Max Row Count**
  - L5: Cap imported_messages at N rows (e.g., 100k); oldest purged first
  - L6: Mirrors requestDetailsRepo DEFAULT_MAX_RECORDS pattern
- **L4 R1b2: Max DB Size**
  - L5: Cap DB file size; purge oldest when exceeded
  - L6: Check file size on flush

### L2 R2: ARCHIVAL

#### L3 R2a: Archive to JSONL
- **L4 R2a1: Archive Job**
  - L5: Before purge, archive rows to `~/.9router/archive/imported-YYYY-MM.jsonl`
  - L6: Compressed with gzip; one file per month
- **L4 R2a2: Archive Metadata**
  - L5: `import_archives` table: file, row_count, date_range, checksum
  - L6: Enables restore

#### L3 R2b: Archive to SQLite
- **L4 R2b1: Archive DB**
  - L5: Copy rows to `archive-YYYY-MM.sqlite` (same schema)
  - L6: Queryable offline

### L2 R3: PURGING

#### L3 R3a: Scheduled Purge
- **L4 R3a1: Daily Purge Job**
  - L5: Daily job: archive-then-purge expired rows
  - L6: Runs at configurable time (default 03:00)
- **L4 R3a2: Purge Logging**
  - L5: Log purge counts to `log.txt` and `import_jobs`
  - L6: Audit trail

#### L3 R3b: Manual Purge
- **L4 R3b1: UI Action**
  - L5: "Purge imported messages older than X" in settings
  - L6: Confirmation dialog with row count preview

### L2 R4: COLD STORAGE

#### L3 R4a: External Cold Storage
- **L4 R4a1: S3-Compatible**
  - L5: Archive to S3/MinIO/R2 via `@aws-sdk/client-s3`
  - L6: Configurable bucket/prefix
- **L4 R4a2: Local Disk**
  - L5: Archive to configured directory
  - L6: Default `~/.9router/archive/`

### L2 R5: RESTORE

#### L3 R5a: Restore from Archive
- **L4 R5a1: Archive Re-Import**
  - L5: `POST /api/messages/import/restore` with archive file
  - L6: Re-imports with original `imported_at` preserved

#### L3 R5b: Restore UI
- **L4 R5b1: Archive Browser**
  - L5: List archives with row counts and date ranges
  - L6: "Restore" button per archive

## Open Questions

1. What retention period does the user actually want?
2. Should native requestDetails also get retention policies (consistency)?
3. Is S3 archival needed or is local disk enough?

## Related Implementation Plans

- `9router/impl-plan-import-12-retention-lifecycle.md` — purge job, archive writer, restore with code