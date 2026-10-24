# Branch N: Migration & Backward Compatibility — Hermes Message Import

**Date:** 2026-09-17
**Author:** GitHub Copilot agent (6-level binary tree expansion)
**Status:** active
**Tags:** research, hermes-import, migration, backward-compatibility, binary-tree, branch-n

## L0 Root: Hermes Message Import & External Agent Traffic Recording

## L1 Branch N: MIGRATION & BACKWARD COMPATIBILITY

Ensure the import feature can be added without breaking existing functionality, and support migration of historical data.

### L2 N1: DATABASE MIGRATION

#### L3 N1a: Schema Migration
- **L4 N1a1: Migration File**
  - L5: Create `src/lib/db/migrations/NNN-create-imported-messages.js`
  - L6: Follow existing migration pattern, use `CREATE TABLE IF NOT EXISTS`
- **L4 N1a2: Idempotent Migration**
  - L5: Migration safe to run multiple times → no errors if table exists
  - L6: Check table existence before creating

#### L3 N1b: Data Migration
- **L4 N1b1: Backfill Script**
  - L5: Create `scripts/backfill-imported-messages.mjs` to import historical data
  - L6: Parse `~/.9router/usage.json`, insert into `imported_messages`
- **L4 N1b2: Incremental Sync**
  - L5: Create `scripts/sync-imported-messages.mjs` for ongoing sync
  - L6: Watch for new log entries, import incrementally

### L2 N2: API BACKWARD COMPATIBILITY

#### L3 N2a: Existing APIs Unchanged
- **L4 N2a1: /api/messages GET**
  - L5: Existing `/api/messages` endpoint unchanged → still returns native messages by default
  - L6: Add optional `source` parameter to include imported messages
- **L4 N2a2: /api/messages/[id] GET**
  - L5: Existing `/api/messages/[id]` endpoint unchanged → still returns native message by ID
  - L6: Extend to also accept imported message IDs (prefixed with `import-`)

#### L3 N2b: New APIs Additive
- **L4 N2b1: /api/messages/import POST**
  - L5: New endpoint for importing messages → doesn't affect existing endpoints
  - L6: Separate auth, separate rate limits
- **L4 N2b2: /api/messages/import/{jobId}/status GET**
  - L5: New endpoint for tracking import progress → doesn't affect existing endpoints
  - L6: Optional feature, can be disabled

### L2 N3: UI BACKWARD COMPATIBILITY

#### L3 N3a: Existing UI Unchanged
- **L4 N3a1: Messages Page Default**
  - L5: Messages page shows native messages by default → imported messages opt-in
  - L6: User must explicitly select "Source: Imported" or "Source: All"
- **L4 N3a2: Dashboard Quota Page**
  - L5: Dashboard quota page shows native costs by default → imported costs opt-in
  - L6: User must explicitly enable "Include imported traffic"

#### L3 N3b: New UI Additive
- **L4 N3b1: Import Button**
  - L5: New "Import" button in Messages page header → doesn't affect existing buttons
  - L6: Optional feature, can be hidden via settings
- **L4 N3b2: Source Badge**
  - L5: New source badge on message rows → doesn't affect existing badges
  - L6: Only shown for imported messages

### L2 N4: CONFIGURATION BACKWARD COMPATIBILITY

#### L3 N4a: Existing Config Unchanged
- **L4 N4a1: .env Variables**
  - L5: Existing `.env` variables unchanged → no new required variables
  - L6: New optional variables: `ENABLE_IMPORT_API`, `IMPORT_API_KEY`
- **L4 N4a2: settingsRepo.js**
  - L5: Existing settings unchanged → no new required settings
  - L6: New optional settings: `enableImportApi`, `importApiKey`, `includeImportedInQuotas`

#### L3 N4b: New Config Additive
- **L4 N4b1: Import Settings**
  - L5: New settings for import feature → all optional, sensible defaults
  - L6: `enableImportApi: false` (opt-in), `importApiKey: null`, `includeImportedInQuotas: false`
- **L4 N4b2: Feature Flags**
  - L5: Feature flags for import sub-features: `enableHermesHook`, `enableLogFileTail`, `enableProxyMode`
  - L6: All default to false, user opts in

### L2 N5: HISTORICAL DATA MIGRATION

#### L3 N5a: usage.json Migration
- **L4 N5a1: Parse usage.json**
  - L5: Script to parse `~/.9router/usage.json` (existing log file)
  - L6: Extract timestamp, model, tokens, cost → insert into `imported_messages`
- **L4 N5a2: Handle Missing Fields**
  - L5: usage.json may not have all fields (e.g., no request/response JSON)
  - L6: Set missing fields to null, flag as "partial import"

#### L3 N5b: log.txt Migration
- **L4 N5b1: Parse log.txt**
  - L5: Script to parse `~/.9router/log.txt` (existing log file)
  - L6: Extract request/response JSON → insert into `imported_messages`
- **L4 N5b2: Handle Malformed Lines**
  - L5: log.txt may have malformed lines → skip and log
  - L6: Report skipped line count

### L2 N6: ROLLBACK STRATEGY

#### L3 N6a: Database Rollback
- **L4 N6a1: Drop Table**
  - L5: If import feature causes issues → `DROP TABLE imported_messages`
  - L6: Safe, doesn't affect native messages
- **L4 N6a2: Restore Backup**
  - L5: If migration corrupts data → restore from SQLite backup
  - L6: 9Router already creates automatic backups

#### L3 N6b: Code Rollback
- **L4 N6b1: Feature Flag Disable**
  - L5: If import feature causes issues → set `enableImportApi: false`
  - L6: Disables import API, existing functionality unaffected
- **L4 N6b2: Code Revert**
  - L5: If import code has bugs → revert to previous version
  - L6: Git revert, no data loss

## Implementation Priority

1. **Database Migration + Idempotent Schema** — 1 day
2. **API Backward Compatibility** — 1 day
3. **Historical Data Migration Scripts** — 2 days
4. **Rollback Strategy Documentation** — 0.5 days

## Open Questions

- Should the migration be automatic (on first run) or manual (user-triggered)?
- How to handle very large historical logs (10GB+ usage.json)?
- Should the system support rollback to a specific point in time?

## Related Implementation Plans

- `9router/impl-plan-import-01-db-schema.md` — additive-only migrations (`005`–`012`), `SCHEMA_VERSION` bump 3→4, registered in `migrations/index.js`; nothing existing is mutated
- `9router/impl-plan-import-12-retention-lifecycle.md` — `restore.js` re-imports from `.jsonl.gz` archives with `restore-` prefixed IDs (rollback path)
- `9router/impl-plan-import-04-log-file-tail.md` — persistent `import_sync_state` means a restart never re-imports or skips a range
- `9router/impl-plan-import-14-format-adapters.md` — parsers are additive; unknown agent formats degrade to `unknown` source rather than failing ingest
