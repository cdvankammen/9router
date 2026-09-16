---
Date: 2026-09-16
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, sqlite, database, storage, performance
---

# Implementation Plan 43 — SQLite Layer & Storage Optimization

> Written after the binary-tree research expansion (see `39-binary-tree-expansion-master-plan.md`, `47-branch-9router-internal-threads.md`).
> This plan covers the "storage" option: optimize the SQLite layer and storage.

## 1. Goal

Optimize 9Router's SQLite layer: driver reliability, schema optimization, query performance, and storage hygiene — so the DB layer is fast and reliable.

## 2. Background (from research)

- **9Router current state**: SQLite layer (`src/lib/db/`) with adapter fallback chain (bun:sqlite → better-sqlite3 → node:sqlite → sql.js); repos per entity; migrations.
- **Research findings**: driver fallback must be tested; schema needs indexes; queries need profiling; WAL mode for concurrency; storage hygiene (VACUUM, retention).

## 3. Design

### 3.1 Driver Reliability

- **Driver tests**: test all fallback drivers.
- **Driver detection**: robust detection + clear errors.
- **Driver parity**: behavior parity across drivers.

### 3.2 Schema Optimization

- **Indexes**: add indexes for hot queries.
- **Schema review**: normalize + optimize.
- **Migration hygiene**: clean migration history.

### 3.3 Query Performance

- **Query profiling**: slow-query logging.
- **Query optimization**: optimize hot paths.
- **Connection pooling**: WAL mode + pooling.

### 3.4 Storage Hygiene

- **VACUUM**: scheduled vacuum.
- **Retention**: old data cleanup.
- **Size monitoring**: DB size telemetry.

## 4. Implementation Steps

1. Test all drivers.
2. Add indexes.
3. Profile + optimize queries.
4. Enable WAL.
5. Add storage hygiene.
6. Tests: drivers, queries, hygiene.

## 5. Files Touched

- `src/lib/db/driver.js` (driver tests)
- `src/lib/db/migrations/` (indexes)
- `src/lib/db/repos/*` (query optimization)
- `src/lib/db/hygiene.js` (new)
- `tests/unit/db-layer.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Driver divergence | Parity tests |
| Index bloat | Selective indexes |
| WAL issues | Testing |
| Vacuum locks | Off-peak scheduling |

## 7. Success Criteria

- All drivers tested.
- Hot queries indexed.
- WAL enabled.
- Storage hygiene operational.

## 8. Related Plans
- Plan 39 (Migration/Backup) — DB safety.
- Plan 31 (Performance) — query latency.
- Plan 32 (CI) — driver tests.