# Branch K: Performance & Scalability — Hermes Message Import

**Date:** 2026-09-17
**Author:** GitHub Copilot agent (6-level binary tree expansion)
**Status:** active
**Tags:** research, hermes-import, performance, scalability, binary-tree, branch-k

## L0 Root: Hermes Message Import & External Agent Traffic Recording

## L1 Branch K: PERFORMANCE & SCALABILITY

Ensure the import system handles high volumes efficiently without degrading 9Router's core routing performance.

### L2 K1: IMPORT THROUGHPUT

#### L3 K1a: Batch Processing
- **L4 K1a1: Batch Size Optimization**
  - L5: Default batch size: 100 messages per INSERT transaction
  - L6: Tune based on message size (smaller batches for large payloads)
- **L4 K1a2: Parallel Inserts**
  - L5: Use SQLite WAL mode → allow concurrent reads during import
  - L6: Single writer (import), multiple readers (Messages page queries)

#### L3 K1b: Async Processing
- **L4 K1b1: Background Queue**
  - L5: Import API accepts request → queues for background processing → returns immediately
  - L6: Use existing `requestDetailsRepo.js` buffer/flush pattern
- **L4 K1b2: Progress Tracking**
  - L5: Track import progress: `{jobId, total, imported, skipped, errors}`
  - L6: Poll `/api/messages/import/{jobId}/status` for progress

### L2 K2: QUERY PERFORMANCE

#### L3 K2a: Indexing Strategy
- **L4 K2a1: Covering Indexes**
  - L5: Create indexes that cover common queries: `(provider, model, status, timestamp)`
  - L6: Avoid table scans on filtered queries
- **L4 K2a2: Partial Indexes**
  - L5: Index only recent data: `WHERE timestamp > date('now', '-90 days')`
  - L6: Faster queries on active data, archive old data separately

#### L3 K2b: Query Optimization
- **L4 K2b1: Pagination**
  - L5: Use keyset pagination (cursor-based) instead of OFFSET for large datasets
  - L6: `WHERE id < ? ORDER BY id DESC LIMIT 50` → faster than `OFFSET 1000`
- **L4 K2b2: Aggregation Caching**
  - L5: Cache expensive aggregations (cost by provider) for 5 minutes
  - L6: Invalidate cache on new imports

### L2 K3: STORAGE OPTIMIZATION

#### L3 K3a: Data Compression
- **L4 K3a1: JSON Compression**
  - L5: Compress large request/response JSON (>10KB) using gzip
  - L6: Store as BLOB, decompress on read
- **L4 K3a2: Columnar Storage**
  - L5: For analytics queries, store token counts in separate columns (not JSON)
  - L6: Faster aggregation: `SUM(prompt_tokens)` vs `SUM(json_extract(request_json, '$.tokens'))`

#### L3 K3b: Archival Strategy
- **L4 K3b1: Time-Based Archival**
  - L5: Move messages older than 90 days to `imported_messages_archive` table
  - L6: Background job runs nightly, reduces active table size
- **L4 K3b2: Size-Based Archival**
  - L5: If `imported_messages` > 1GB → archive oldest 50%
  - L6: Configurable threshold in settings

### L2 K4: CONCURRENCY CONTROL

#### L3 K4a: Write Concurrency
- **L4 K4a1: SQLite WAL Mode**
  - L5: Enable WAL (Write-Ahead Logging) → concurrent reads during writes
  - L6: Single writer queue, multiple readers
- **L4 K4a2: Transaction Batching**
  - L5: Batch 100 inserts per transaction → reduce WAL overhead
  - L6: Commit every 100 messages, not every message

#### L3 K4b: Read Concurrency
- **L4 K4b1: Read Replicas (Future)**
  - L5: If read load > write load → replicate SQLite to read-only replicas
  - L6: Use LiteFS or similar for distributed reads
- **L4 K4b2: Query Timeout**
  - L5: Set query timeout: 5 seconds for filtered queries, 30 seconds for aggregations
  - L6: Prevent long-running queries from blocking imports

### L2 K5: RESOURCE LIMITS

#### L3 K5a: Memory Limits
- **L4 K5a1: Import Buffer Size**
  - L5: Limit import buffer to 1000 messages in memory → flush to DB when full
  - L6: Prevent OOM on large imports
- **L4 K5a2: Query Result Size**
  - L5: Limit query results to 10,000 rows → paginate beyond that
  - L6: Prevent memory exhaustion on large result sets

#### L3 K5b: Disk Space
- **L4 K5b1: Disk Space Check**
  - L5: Before import, check available disk space → reject if <100MB free
  - L6: Prevent disk full errors mid-import
- **L4 K5b2: Growth Monitoring**
  - L5: Monitor `imported_messages` table size → alert if >1GB
  - L6: Suggest archival or cleanup

### L2 K6: SCALABILITY LIMITS

#### L3 K6a: Current Limits
- **L4 K6a1: SQLite Row Limit**
  - L5: SQLite max rows: 2^64 (18 quintillion) → not a practical limit
  - L6: Real limit: disk space + query performance
- **L4 K6a2: Practical Limit**
  - L5: With indexing + archival → handle 10M+ messages comfortably
  - L6: Beyond 10M → consider migrating to Postgres/ClickHouse

#### L3 K6b: Scaling Strategies
- **L4 K6b1: Vertical Scaling**
  - L5: Increase SQLite cache size, use faster SSD → handle more load
  - L6: Simple, no code changes
- **L4 K6b2: Horizontal Scaling**
  - L5: Shard by source (hermes, claude-code, etc.) → separate DBs per source
  - L6: Complex, requires query federation

## Implementation Priority

1. **Batch Processing + WAL Mode** (core) — 1 day
2. **Indexing Strategy + Pagination** — 1 day
3. **Archival Strategy** — 1 day
4. **Resource Limits + Monitoring** — 1 day

## Open Questions

- Should the system automatically archive old messages, or require manual trigger?
- How to handle imports that exceed memory limits (streaming vs batch)?
- Should the system migrate to Postgres/ClickHouse at a certain scale threshold?

## Related Implementation Plans

- `9router/impl-plan-import-11-import-scheduler.md` — chunked job processing, retry queue, catch-up on startup
- `9router/impl-plan-import-15-streaming-realtime.md` — `backpressure.js` `BackpressureBuffer` (pause/resume at maxSize, drain at 50%)
- `9router/impl-plan-import-16-analytics-insights.md` — indexes on `usageHistory(timestamp)` + `imported_messages(imported_at)` for UNION query performance
- `9router/impl-plan-import-01-db-schema.md` — indexes on the `imported_messages` table (6 indexes) for the hot query paths
- `9router/impl-plan-import-12-retention-lifecycle.md` — maxRows cap + archive-then-purge to bound table growth
