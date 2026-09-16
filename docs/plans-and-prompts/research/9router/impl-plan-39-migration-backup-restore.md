---
Date: 2026-09-16
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, migration, upgrade, backup, restore, data
---

# Implementation Plan 39 — Migration, Backup & Restore

> Written after the binary-tree research expansion (see `39-binary-tree-expansion-master-plan.md`, `47-branch-9router-internal-threads.md`).
> This plan covers the "migration/backup" option: robust data migration, backup, and restore.

## 1. Goal

Add robust data management to 9Router: schema migrations, automated backups, and restore workflows — so upgrades never lose data.

## 2. Background (from research)

- **9Router current state**: SQLite layer with migrations (`src/lib/db/migrations/`); usage.json + log.txt under ~/.9router.
- **Research findings**: migrations must be versioned + tested; backups must be automatic + verified; restore must be tested; upgrade paths must be documented.

## 3. Design

### 3.1 Migrations

- **Migration framework**: versioned migrations with up/down.
- **Migration testing**: test migrations on sample data.
- **Migration safety**: backup before migrate; transaction-wrapped.

### 3.2 Backups

- **Backup types**: full (DB + usage + config), incremental.
- **Backup schedule**: configurable (daily default).
- **Backup verification**: restore-test backups.
- **Backup retention**: keep N backups.

### 3.3 Restore

- **Restore workflow**: guided restore (choose backup → verify → restore).
- **Restore testing**: automated restore tests.
- **Restore safety**: confirm before overwrite.

### 3.4 Upgrade Paths

- **Upgrade docs**: version-to-version upgrade paths.
- **Upgrade checks**: pre-upgrade checks (disk, schema).
- **Rollback**: rollback on failed upgrade.

## 4. Implementation Steps

1. Audit current migrations.
2. Build migration framework.
3. Add automated backups.
4. Add restore workflow.
5. Document upgrade paths.
6. Tests: migrations, backup, restore.

## 5. Files Touched

- `src/lib/db/migrations/` (framework)
- `src/lib/backup/` (new: backup, restore)
- `src/app/api/v1/backup/route.js` (new)
- Dashboard backup page (new)
- `docs/UPGRADING.md` (new)
- `tests/unit/backup-restore.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Migration failure | Backup-first; transactions |
| Backup corruption | Verification |
| Restore data loss | Confirm; test |
| Upgrade breakage | Pre-checks; rollback |

## 7. Success Criteria

- Migrations versioned + tested.
- Backups automatic + verified.
- Restore workflow functional.
- Upgrade paths documented.

## 8. Related Plans
- Plan 32 (CI) — migration tests.
- Plan 33 (Docs) — upgrade docs.
- Plan 25 (Cloud Sync) — sync + backup.