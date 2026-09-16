---
Date: 2026-09-16
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, ha-mini-nodes, backup-nodes, failover-nodes, high-availability
---

# Implementation Plan 119 — HA Mini Backup Nodes

> Mined from branch docs: `47-branch-9router-internal-threads.md` (HA mini nodes) and `24-ha-mini-backup-nodes.md`, `28b-mini2-failover-crashloop-deep-dive.md`.

## 1. Goal

Add HA mini backup nodes to 9Router: lightweight standby nodes that take over when the primary fails, with health monitoring, state sync, and automatic promotion — so the gateway stays available during primary failures.

## 2. Background (from research)

- **9Router current state**: single-node deployment; failover is provider-level only.
- **Research findings** (47-branch):
  - HA mini nodes: lightweight backup nodes.
  - (24) HA mini backup nodes: design research.
  - (28b) Mini2 failover crashloop: crash-loop lessons.

## 3. Design

### 3.1 Mini Node Model

- **Mini node**: lightweight gateway instance (reduced footprint).
- **Node roles**: primary, standby, observer.
- **Node lifecycle**: register → sync → standby → promote.

### 3.2 Health Monitoring

- **Heartbeats**: periodic primary heartbeats.
- **Failure detection**: missed heartbeats → failover trigger.
- **Split-brain prevention**: quorum-based promotion.

### 3.3 State Sync

- **State replication**: config, credentials, usage state.
- **Sync modes**: full sync, incremental sync.
- **Sync conflicts**: last-writer-wins with timestamps.

### 3.4 Promotion

- **Promotion flow**: standby → primary.
- **Promotion checks**: state freshness, health.
- **Promotion rollback**: revert on primary recovery.

### 3.5 Integration

- **CLI integration**: mini node management.
- **Observability**: node health telemetry.
- **Dashboard**: HA view.

## 4. Implementation Steps

1. Build mini node model (`src/lib/ha/`).
2. Add health monitoring.
3. Add state sync.
4. Add promotion logic.
5. Integrate CLI.
6. Dashboard: HA view.
7. Tests: failover, sync, promotion.

## 5. Files Touched

- `src/lib/ha/` (new: node, health, sync, promote)
- `cli/src/` (node management)
- `src/lib/db/repos/haRepo.js` (new)
- Dashboard ha page (new)
- `tests/unit/ha.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Split brain | Quorum |
| Stale state | Freshness checks |
| Crash loops | Crash-loop backoff |
| Promotion races | Locking |

## 7. Success Criteria

- Mini nodes register and sync.
- Failover triggers on missed heartbeats.
- Promotion works with checks.
- HA view visible.

## 8. Related Plans

- Plan 65 (Provider Redundancy) — redundancy.
- Plan 49 (Health/Self-Healing) — health checks.
- Plan 70 (Gateway Clustering) — shared state.
- Plan 25 (Node Failover) — failover design.