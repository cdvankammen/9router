---
Date: 2026-09-16
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, gateway-clustering, multi-instance, shared-state, coordination
---

# Implementation Plan 70 — Gateway Clustering & Shared State

> Written after the binary-tree research expansion (see `39-binary-tree-expansion-master-plan.md`, `47-branch-9router-internal-threads.md`).
> This plan covers the "clustering" option: multi-instance gateway clustering with shared state.

## 1. Goal

Add gateway clustering to 9Router: multiple instances sharing state, coordinated routing, and consistent behavior — so the gateway scales horizontally.

## 2. Background (from research)

- **9Router current state**: single-instance; SQLite local state; dual-instance conflicts noted (doc 28).
- **Research findings**: clustering needs shared state (config, usage, locks); coordination (leader election, distributed locks); consistency (eventual for usage, strong for config).

## 3. Design

### 3.1 Shared State

- **Shared config**: config in shared store (SQLite file, Redis, or file sync).
- **Shared usage**: usage aggregation across instances.
- **Shared locks**: distributed locks (file-based or Redis).

### 3.2 Coordination

- **Leader election**: single writer for config.
- **Distributed locks**: for exclusive operations.
- **Heartbeats**: instance health.

### 3.3 Consistency

- **Config consistency**: strong consistency (leader writes).
- **Usage consistency**: eventual (aggregated).
- **Cache consistency**: shared cache invalidation.

### 3.4 Operations

- **Instance management**: register/deregister instances.
- **Instance health**: per-instance health.
- **Instance telemetry**: per-instance metrics.

## 4. Implementation Steps

1. Define shared state model.
2. Build shared config.
3. Add coordination.
4. Add instance management.
5. Tests: shared state, coordination.

## 5. Files Touched

- `src/lib/cluster/` (new: state, coordination)
- `src/lib/db/` (shared store)
- `custom-server.js` (instance registration)
- Dashboard cluster page (new)
- `tests/unit/cluster.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Split-brain | Leader election |
| Lock contention | Scoped locks |
| Consistency drift | Reconciliation |
| Complexity | Progressive |

## 7. Success Criteria

- Shared state works.
- Coordination functional.
- Instances manageable.
- Telemetry visible.

## 8. Related Plans
- Plan 41 (Docker) — deployment scaling.
- Plan 25 (Cloud Sync) — state sync.
- Plan 60 (Load Testing) — capacity.