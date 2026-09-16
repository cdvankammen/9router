---
Date: 2026-09-16
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, cloud-sync, multi-device, state, conflict
---

# Implementation Plan 25 — Cloud Sync & Multi-Device State

> Written after the binary-tree research expansion (see `39-binary-tree-expansion-master-plan.md`, `47-branch-9router-internal-threads.md`).
> This plan covers the "cloud sync" option: robust cloud sync with conflict resolution for multi-device state.

## 1. Goal

Harden 9Router's cloud sync: reliable state sync across devices with conflict resolution, encryption, and sync telemetry — so configuration is consistent everywhere.

## 2. Background (from research)

- **9Router current state**: optional cloud sync exists (per ARCHITECTURE.md); SQLite local state.
- **Research findings**: sync needs conflict resolution (last-write-wins is dangerous for configs); encryption in transit + at rest; sync must be resumable (network drops); sync telemetry (last sync, conflicts).

## 3. Design

### 3.1 Sync Model

- **Sync units**: config, credentials (encrypted), usage stats, logs.
- **Sync direction**: push/pull/bidirectional.
- **Sync triggers**: change-based (debounced), interval, manual.

### 3.2 Conflict Resolution

- **Conflict types**: same-field edits, deletions vs edits, schema drift.
- **Resolution strategies**: per-unit (config: merge with field-level LWW; credentials: newest wins; usage: additive).
- **Conflict log**: all conflicts recorded with resolution.

### 3.3 Security

- **Encryption**: end-to-end encryption for credentials.
- **Auth**: device auth with rotation.
- **Audit**: sync events logged.

### 3.4 Sync Telemetry

- **Sync status**: last sync, pending changes, conflicts.
- **Sync health**: failure rates, retry counts.
- **Sync dashboard**: per-device state.

## 4. Implementation Steps

1. Audit current cloud sync.
2. Define sync units + triggers.
3. Build conflict resolution.
4. Add encryption + auth hardening.
5. Add sync telemetry.
6. Tests: sync, conflicts, resume.

## 5. Files Touched

- `src/lib/sync/` (new: sync engine, conflicts)
- `src/lib/db/repos/syncRepo.js` (new)
- `src/app/api/v1/sync/route.js` (new)
- Dashboard sync page (new)
- `tests/unit/sync.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Conflict data loss | Field-level merge; conflict log |
| Sync loops | Version vectors; debounce |
| Credential leakage | E2E encryption |
| Network flakiness | Resumable sync; retries |

## 7. Success Criteria

- Sync works across devices.
- Conflicts resolved per policy + logged.
- Credentials encrypted end-to-end.
- Sync telemetry visible.

## 8. Related Plans
- Plan 10 (Security) — encryption.
- Plan 11 (OAuth) — credential sync.
- Plan 8 (Observability) — sync telemetry.