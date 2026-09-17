---
Date: 2026-09-16
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, cooldown-tuning, cooldown-optimization, provider-health, failover-tuning
---

# Implementation Plan 197 — Cooldown Tuning & Optimization

> Mined from branch docs: `44-branch-gateways-and-serving.md` (Level 4: ABA-A — Cooldown Tuning).

## 1. Goal

Implement cooldown tuning and optimization for 9Router: systematically tune cooldown parameters (duration, thresholds, recovery criteria), add cooldown effectiveness tracking, and add automatic cooldown optimization — making failover behavior optimal.

## 2. Background (from research)

- **9Router current state**: Cooldowns exist (plan 95); tuning ad hoc.
- **Research findings** (44-branch):
  - Cooldown tuning (ABA-A): systematic tuning.
  - Failure detection (ABA-B): detection triggers.
  - Cooldown policies (42-branch): cooldown strategies.

## 3. Design

### 3.1 Cooldown Model

- **Cooldown parameters**: duration, thresholds, recovery.
- **Cooldown scope**: per-provider, per-model, per-account.
- **Cooldown types**: error-based, quality-based, latency-based.

### 3.2 Tuning Framework

- **Tuning data**: cooldown effectiveness metrics.
- **Tuning methods**: grid search, Bayesian optimization.
- **Tuning validation**: holdout validation.

### 3.3 Optimization

- **Effectiveness tracking**: cooldown success rates.
- **Automatic tuning**: auto-adjust parameters.
- **Tuning alerts**: alert on poor effectiveness.

### 3.4 Integration

- **Routing integration**: tuned cooldowns.
- **Observability**: cooldown metrics.
- **Dashboard**: cooldown view.

## 4. Implementation Steps

1. Build cooldown model.
2. Add tuning framework.
3. Add optimization.
4. Integrate routing.
5. Dashboard: cooldown view.
6. Tests: tuning, optimization, effectiveness.

## 5. Files Touched

- `src/lib/cooldown/tuning.js` (new)
- `open-sse/handlers/chatCore.js` (cooldown hooks)
- Dashboard cooldown page (new)
- `tests/unit/cooldown-tuning.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Over-tuning | Validation |
| Parameter drift | Monitoring |
| Effectiveness noise | Smoothing |
| Complexity | Simple methods |

## 7. Success Criteria

- Parameters tuned.
- Effectiveness tracked.
- Optimization works.
- Failover optimal.

## 8. Related Plans

- Plan 95 (Cooldown Backoff) — cooldown foundations.
- Plan 181 (Cooldown Timers) — state management.
- Plan 186 (Failure Detection) — detection.
- Plan 9 (Error Hardening) — failover.