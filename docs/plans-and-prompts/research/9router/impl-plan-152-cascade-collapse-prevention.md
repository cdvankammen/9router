---
Date: 2026-09-16
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, cascade-collapse, cascade-failure, cascade-resilience, cascade-recovery
---

# Implementation Plan 152 — Cascade Collapse Prevention & Recovery

> Mined from branch docs: `42-branch-cascades-and-fallbacks.md` (Level 3: ABB — Cascade Collapse).

## 1. Goal

Implement cascade collapse prevention and recovery for 9Router: detect cascades that are failing catastrophically (all models failing), stop them early, and recover gracefully — preventing wasted cost and latency.

## 2. Background (from research)

- **9Router current state**: Cascades run to exhaustion.
- **Research findings** (42-branch):
  - Cascade collapse (ABB): cascades that fail catastrophically.
  - Cascade vs zero (ABAA): collapse vs no cascade.
  - Cascade vs oracle (ABAB): collapse vs ideal.
  - Fallback triggers (ABBB): when to stop.

## 3. Design

### 3.1 Collapse Detection

- **Collapse signals**: consecutive failures, error patterns.
- **Collapse detection**: early detection.
- **Collapse severity**: partial vs total.

### 3.2 Collapse Prevention

- **Circuit breaker**: stop after N failures.
- **Failure budget**: per-cascade budget.
- **Prevention policies**: per-provider policies.

### 3.3 Collapse Recovery

- **Recovery strategy**: fallback to degraded mode.
- **Recovery logging**: collapse traces.
- **Recovery alerts**: notify on collapse.

### 3.4 Integration

- **Cascade integration**: collapse handling.
- **Observability**: collapse metrics.
- **Dashboard**: collapse view.

## 4. Implementation Steps

1. Build collapse detection.
2. Add circuit breaker.
3. Add recovery strategy.
4. Add alerts.
5. Dashboard: collapse view.
6. Tests: detection, prevention, recovery.

## 5. Files Touched

- `src/lib/collapse/` (new: detect, prevent, recover)
- `open-sse/handlers/chatCore.js` (cascade integration)
- Dashboard collapse page (new)
- `tests/unit/collapse.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| False positives | Signal tuning |
| Missed collapses | Multiple signals |
| Recovery failure | Degraded mode |
| Alert fatigue | Thresholds |

## 7. Success Criteria

- Collapses detected.
- Prevention works.
- Recovery functional.
- Costs saved.

## 8. Related Plans

- Plan 2 (Cascade Fallback) — foundations.
- Plan 9 (Error Hardening) — circuit breakers.
- Plan 137 (Escalation Depth) — depth.
- Plan 123 (Failover State Machine) — states.