---
Date: 2026-09-16
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, escalation-depth, cascade-depth, cascade-limit, depth-management
---

# Implementation Plan 137 — Cascade Escalation Depth Management

> Mined from branch docs: `42-branch-cascades-and-fallbacks.md` (Level 4: AAAB — Escalation Depth).

## 1. Goal

Implement cascade escalation depth management for 9Router: control how deep cascades go, optimize escalation depth per request type, and prevent runaway cascades that consume excessive resources.

## 2. Background (from research)

- **9Router current state**: Unlimited escalation depth; no depth limits.
- **Research findings** (42-branch):
  - Escalation depth (AAAB): depth vs cost vs quality tradeoffs.
  - Cascade collapse (ABB): cascades that exhaust all models.
  - Cascade trigger conditions (AAAA): when to stop.

## 3. Design

### 3.1 Depth Configuration

- **Global max depth**: configurable ceiling.
- **Per-query depth**: adaptive depth by complexity.
- **Per-cost-tier depth**: max depth per cost tier.
- **Dynamic depth**: adjust based on time/cost budget.

### 3.2 Depth Control

- **Depth budget**: remaining budget tracking.
- **Early termination**: stop when quality sufficient.
- **Depth penalty**: cost penalty per depth level.
- **Depth logging**: track depth usage patterns.

### 3.3 Cascade Prevention

- **Circuit breaker**: stop after N failures.
- **Timeout cascade**: time limit per cascade.
- **Cost cascade**: cost limit per cascade.
- **Degraded mode**: serve best-effort if exhausted.

## 4. Implementation Steps

1. Build depth configuration.
2. Add depth budget tracking.
3. Add early termination.
4. Add circuit breaker.
5. Dashboard: depth view.
6. Tests: depth control, prevention.

## 5. Files Touched

- `open-sse/handlers/chatCore.js` (depth logic)
- `src/lib/config/cascade.js` (new: depth config)
- Dashboard cascade page (new)
- `tests/unit/cascade-depth.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Too shallow | Adaptive depth |
| Too deep | Cost limits |
| Runaway | Circuit breaker |
| Quality loss | Degraded mode |

## 7. Success Criteria

- Depth configurable.
- Budget tracked.
- Runaway prevented.
- Quality maintained.

## 8. Related Plans

- Plan 2 (Cascade Fallback) — cascade foundations.
- Plan 90 (Cascade Coordination) — coordination.
- Plan 87 (Cost Heuristics) — cost awareness.
- Plan 9 (Error Hardening) — circuit breakers.