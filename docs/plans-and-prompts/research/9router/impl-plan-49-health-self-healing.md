---
Date: 2026-09-16
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, health-check, self-healing, watchdog, resilience
---

# Implementation Plan 49 — Health Checks & Self-Healing

> Written after the binary-tree research expansion (see `39-binary-tree-expansion-master-plan.md`, `47-branch-9router-internal-threads.md`).
> This plan covers the "health/self-healing" option: health monitoring and self-healing behaviors.

## 1. Goal

Add health checks and self-healing to 9Router: internal health monitoring, automatic recovery actions, and health reporting — so the gateway heals itself where possible.

## 2. Background (from research)

- **9Router current state**: no health system; crash recovery manual.
- **Research findings**: health checks (liveness, readiness) enable orchestration; self-healing (restart, failover, cleanup) reduces downtime; health reporting (status endpoint) aids monitoring.

## 3. Design

### 3.1 Health Checks

- **Liveness**: process alive.
- **Readiness**: ready to serve (DB, config, providers).
- **Component checks**: DB, cache, upstream connectivity.
- **Health endpoint**: /healthz (liveness), /readyz (readiness).

### 3.2 Self-Healing

- **Recovery actions**: restart component, failover, cleanup, re-init.
- **Action triggers**: health check failures.
- **Action safety**: cooldowns; max attempts.
- **Action logging**: recovery events.

### 3.3 Watchdog

- **Watchdog loop**: periodic health evaluation.
- **Watchdog actions**: automated recovery.
- **Watchdog config**: enable/disable per action.

### 3.4 Health Reporting

- **Health status**: dashboard health view.
- **Health history**: health events over time.
- **Health alerts**: degradation alerts.

## 4. Implementation Steps

1. Build health checks.
2. Add health endpoints.
3. Build self-healing actions.
4. Add watchdog.
5. Build health reporting.
6. Tests: health checks, recovery.

## 5. Files Touched

- `src/lib/health/` (new: checks, watchdog)
- `custom-server.js` (health endpoints)
- `src/lib/db/repos/healthRepo.js` (new)
- Dashboard health page (new)
- `tests/unit/health.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| False positives | Tuned checks |
| Recovery loops | Cooldowns; max attempts |
| Health endpoint abuse | Rate limit |
| Complexity | Simple checks first |

## 7. Success Criteria

- Health endpoints operational.
- Self-healing actions work.
- Watchdog active.
- Health reporting visible.

## 8. Related Plans
- Plan 17 (Node Failover) — failover synergy.
- Plan 41 (Docker) — orchestration health.
- Plan 37 (Webhooks) — health alerts.