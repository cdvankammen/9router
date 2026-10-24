# Branch G: Database Schema & Storage — Hermes Message Import

**Date:** 2026-09-17
**Author:** GitHub Copilot agent (6-level binary tree expansion)
**Status:** active
**Tags:** research, hermes-import, database, schema, storage, binary-tree, branch-g

## L0 Root: Hermes Message Import & External Agent Traffic Recording

## L1 Branch G: DATABASE SCHEMA & STORAGE

Design the database schema for storing imported messages, optimized for querying, aggregation, and unified viewing with native traffic.

### L2 G1: TABLE DESIGN

#### L3 G1a: Separate Table (imported_messages)
- **L4 G1a1: Pros**
  - L5: Clean separation of provenance, easy to audit imports
  - L6: Can drop/recreate without affecting native traffic
- **L4 G1a2: Cons**
  - L5: Unified queries require UNION or JOIN
  - L6: More complex schema, two tables to maintain

#### L3 G1b: Flag in requestDetails (imported BOOLEAN)
- **L4 G1b1: Pros**
  - L5: Unified queries trivial (just `WHERE imported=0` or `WHERE imported=1`)
  - L6: Single table, simpler schema
- **L4 G1b2: Cons**
  - L5: Provenance less clear (is this a real request or an import?)
  - L6: Harder to audit imports separately

#### L3 G1c: Recommendation
- **L4 G1c1: Separate Table**
  - L5: Use `imported_messages` table for clean separation
  - L6: Create view `all_messages` that UNIONs native + imported for unified queries

### L2 G2: SCHEMA DEFINITION

#### L3 G2a: imported_messages Table
- **L4 G2a1: Core Fields**
  - L5: `id TEXT PRIMARY KEY`, `imported_at TEXT`, `source TEXT`, `source_session_id TEXT`
  - L6: `id` prefixed with `import-` to avoid collisions with native IDs
- **L4 G2a2: Provider/Model Fields**
  - L5: `provider TEXT`, `model TEXT`, `model_match_confidence REAL`
  - L6: Confidence score for provider matching (0-1)
- **L4 G2a3: Status/Error Fields**
  - L5: `status TEXT`, `error_message TEXT`, `error_category TEXT`
  - L6: Match native `requestDetails` schema for unified error inbox
- **L4 G2a4: Token/Cost Fields**
  - L5: `prompt_tokens INTEGER`, `completion_tokens INTEGER`, `total_tokens INTEGER`, `cost REAL`
  - L6: Match native schema for unified cost tracking
- **L4 G2a5: Request/Response JSON**
  - L5: `request_json TEXT`, `response_json TEXT`
  - L6: Sanitized (strip auth headers), stored as JSON strings
- **L4 G2a6: Conversation Fields**
  - L5: `conversation_id TEXT`, `source_app TEXT`
  - L6: For conversation reconstruction and source filtering

#### L3 G2b: Indexes
- **L4 G2b1: Query Indexes**
  - L5: `idx_imported_provider`, `idx_imported_model`, `idx_imported_status`, `idx_imported_timestamp`
  - L6: Speed up filtered queries in Messages page
- **L4 G2b2: Conversation Index**
  - L5: `idx_imported_conversation` on `conversation_id`
  - L6: Speed up conversation grouping

### L2 G3: MIGRATION STRATEGY

#### L3 G3a: Migration File
- **L4 G3a1: Create Table**
  - L5: `src/lib/db/migrations/NNN-create-imported-messages.js`
  - L6: Follow existing migration pattern in `src/lib/db/migrations/`
- **L4 G3a2: Idempotent**
  - L5: `CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`
  - L6: Safe to run multiple times

#### L3 G3b: Backfill
- **L4 G3b1: Import Existing Logs**
  - L5: Script to parse `~/.9router/usage.json` and import historical data
  - L6: Run once after migration, backfills imported_messages table
- **L4 G3b2: Incremental Sync**
  - L5: Background job to watch for new log entries and import incrementally
  - L6: Runs continuously, imports new entries as they appear

### L2 G4: QUERY PATTERNS

#### L3 G4a: Unified Queries
- **L4 G4a1: View Definition**
  - L5: `CREATE VIEW all_messages AS SELECT * FROM requestDetails UNION ALL SELECT * FROM imported_messages`
  - L6: Unified queries use `all_messages` view
- **L4 G4a2: Filter by Source**
  - L5: `SELECT * FROM all_messages WHERE source = 'native'` or `WHERE source = 'hermes'`
  - L6: Messages page filter dropdown

#### L3 G4b: Aggregation Queries
- **L4 G4b1: Cost by Provider**
  - L5: `SELECT provider, SUM(cost) FROM all_messages GROUP BY provider`
  - L6: Dashboard quota page
- **L4 G4b2: Error Count by Category**
  - L5: `SELECT error_category, COUNT(*) FROM all_messages WHERE status='error' GROUP BY error_category`
  - L6: Error inbox summary

### L2 G5: PERFORMANCE CONSIDERATIONS

#### L3 G5a: Table Size
- **L4 G5a1: Estimated Growth**
  - L5: ~1000 imported messages/day → ~365k/year
  - L6: SQLite handles millions of rows easily
- **L4 G5a2: Archival Strategy**
  - L5: Archive messages older than 90 days to `imported_messages_archive`
  - L6: Background job, reduces active table size

#### L3 G5b: Query Performance
- **L4 G5b1: Indexed Queries**
  - L5: All filtered queries use indexes → <100ms response time
  - L6: EXPLAIN QUERY PLAN to verify
- **L4 G5b2: Full-Text Search**
  - L5: FTS5 index on `request_json` + `response_json` for content search
  - L6: Optional, only if search performance is acceptable

## Implementation Priority

1. **Schema Definition + Migration** (core) — 1 day
2. **Indexes + View Definition** — 0.5 days
3. **Backfill Script** — 1 day
4. **Archival Strategy** — 1 day

## Open Questions

- Should imported messages be stored in the same SQLite database as native traffic?
- How to handle very large request/response JSON (e.g., 1MB+ payloads)?
- Should the system compress old messages to save space?

## Related Implementation Plans

- `9router/impl-plan-import-01-db-schema.md` — `005-imported-messages.js` migration, `importedMessagesRepo.js` (6 functions), `all_messages` UNION view, `SCHEMA_VERSION` bump
- `9router/impl-plan-import-10-multi-tenant-import.md` — `008-import-tenants.js` tenant columns + `import_keys` table
- `9router/impl-plan-import-11-import-scheduler.md` — `009-import-jobs.js` job table + retry/dead-letter columns
- `9router/impl-plan-import-12-retention-lifecycle.md` — `010-import-archives.js` archive metadata table
- `9router/impl-plan-import-13-deduplication-idempotency.md` — `011-import-fingerprint.js` + `012-import-idempotency.js`
- `9router/impl-plan-import-02-provider-matching.md` — `006-unknown-models.js`
- `9router/impl-plan-import-04-log-file-tail.md` — `007-import-sync-state.js` persistent sync positions
