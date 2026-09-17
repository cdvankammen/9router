---
Date: 2026-09-16
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, fallback-chains, fallback-triggers, chain-management, failover-orchestration
---

# Implementation Plan 179 — Fallback Chains & Trigger Management

> Mined from branch docs: `42-branch-cascades-and-fallbacks.md` (Level 4: ABBA — Fallback Chains, ABBB — Fallback Triggers).

## 1. Goal

Implement fallback chain management for 9Router: formalize fallback chain construction, define trigger conditions for moving down the chain, and add chain health monitoring — making failover predictable and controllable.

## 2. Background (from research)

- **9Router current state**: Fallback chains exist (plan 2); triggers implicit.
- **Research findings** (42-branch):
  - Fallback chains (ABBA): chain construction.
  - Fallback triggers (ABBB): when to move down.
  - Retry counts (BAAA): retry per chain level.

## 3. Design

### 3.1 Chain Model

- **Chain definition**: ordered list of providers/models.
- **Chain depth**: max chain length.
- **Chain scope**: per-request, per-user, per-org.

### 3.2 Trigger Management

- **Trigger types**: error, timeout, quality, cost.
- **Trigger thresholds**: per-trigger thresholds.
- **Trigger priority**: trigger precedence.

### 3.3 Chain Health

- **Chain metrics**: depth usage, trigger rates.
- **Chain alerts**: excessive depth, frequent triggers.
- **Chain reports**: chain usage patterns.

### 3.4 Integration

- **Routing integration**: chain hooks.
- **Observability**: chain telemetry.
- **Dashboard**: chain view.

## 4. Implementation Steps

1. Build chain model.
2. Add trigger management.
3. Add chain health.
4. Integrate routing.
5. Dashboard: chain view.
6. Tests: chains, triggers, health.

## 5. Files Touched

- `src/lib/chains/` (new: model, triggers, health)
- `open-sse/handlers/chatCore.js` (chain hooks)
- Dashboard chains page (new)
- `tests/unit/chains.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Chain too long | Depth limits |
| Trigger noise | Threshold tuning |
| Chain exhaustion | Degraded mode |
| Complexity | Simple chains |

## 7. Success Criteria

- Chains defined.
- Triggers managed.
- Health monitored.
- Failover predictable.

## 8. Related Plans

- Plan 2 (Cascade Fallback) — cascade foundations.
- Plan 9 (Error Hardening) — failover.
- Plan 137 (Escalation Depth) — depth.
- Plan 152 (Cascade Collapse) — collapse.