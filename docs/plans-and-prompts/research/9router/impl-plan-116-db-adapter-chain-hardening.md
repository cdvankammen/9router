---
Date: 2026-09-16
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, db-adapter-chain, db-migrations, sqlite-optimization, storage-reliability
---

# Implementation Plan 116 — DB Adapter Chain Hardening & Migration Tooling

> Mined from branch docs: `47-branch-9router-internal-threads.md` (DB adapter chain, DB migrations) and `11-db-layer-deep-dive.md`.

## 1. Goal

Harden 9Router's DB adapter chain and migration tooling: formalize the adapter fallback chain (bun:sqlite → better-sqlite3 → node:sqlite → sql.js), add migration versioning with rollback, and add adapter health checks — so the database layer is reliable across all runtimes.

## 2. Background (from research)

- **9Router current state**: adapter chain exists (driver.js); migrations exist but basic.
- **Research findings** (47-branch):
  - DB adapter chain: fallback chain across runtimes.
  - DB migrations: schema evolution.
  - (11) DB layer deep dive: adapter architecture.

## 3. Design

### 3.1 Adapter Chain Hardening

- **Adapter contract**: unified adapter interface.
- **Adapter health checks**: per-adapter self-test.
- **Adapter fallback**: automatic fallback with logging.
- **Adapter parity tests**: same behavior across adapters.

### 3.2 Migration Tooling

- **Migration versioning**: sequential versioned migrations.
- **Migration up/down**: forward + rollback migrations.
- **Migration locking**: prevent concurrent migrations.
- **Migration dry-run**: preview before apply.

### 3.3 Data Integrity

- **Integrity checks**: PRAGMA integrity_check.
- **Backup integration**: plan 39 backup hooks.
- **Corruption recovery**: rebuild from backup.

### 3.4 Observability

- **Adapter telemetry**: which adapter active, fallback events.
- **Migration telemetry**: migration history.
- **Dashboard**: DB health view.

## 4. Implementation Steps

1. Define adapter contract (`src/lib/db/driver.js`).
2. Add adapter health checks.
3. Build migration tooling (up/down, locking, dry-run).
4. Add integrity checks.
5. Add telemetry.
6. Dashboard: DB health view.
7. Tests: adapter parity, migrations.

## 5. Files Touched

- `src/lib/db/driver.js` (hardening)
- `src/lib/db/migrations/` (tooling)
- `src/lib/db/health.js` (new)
- Dashboard db page (new)
- `tests/unit/db.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Adapter divergence | Parity tests |
| Migration failure | Rollback + locking |
| Corruption | Integrity checks |
| Fallback loops | Fallback caps |

## 7. Success Criteria

- Adapter chain reliable.
- Migrations versioned with rollback.
- Integrity checks run.
- DB health visible.

## 8. Related Plans

- Plan 43 (SQLite Optimization) — storage optimization.
- Plan 39 (Migration/Backup) — backup integration.
- Plan 11 (DB Layer) — adapter architecture.
- Plan 49 (Health/Self-Healing) — health checks.