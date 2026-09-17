---
Date: 2026-09-16
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, cooldown-timers, cooldown-states, state-management, provider-health
---

# Implementation Plan 181 — Cooldown Timers & State Management

> Mined from branch docs: `42-branch-cascades-and-fallbacks.md` (Level 4: BABA — Cooldown Timers) and Level 3: BAB — Cooldown States.

## 1. Goal

Implement cooldown timer and state management for 9Router: formalize cooldown states (healthy, degraded, cooldown, recovering), add configurable cooldown timers, and add state transition logic — making provider health management explicit and controllable.

## 2. Background (from research)

- **9Router current state**: Cooldowns exist (plan 95); states implicit.
- **Research findings** (42-branch):
  - Cooldown timers (BABA): timer configuration.
  - Cooldown states (BAB): state machine.
  - Failure detection (44-branch): state triggers.

## 3. Design

### 3.1 State Model

- **States**: healthy, degraded, cooldown, recovering, failed.
- **Transitions**: state transition rules.
- **State scope**: per-provider, per-model, per-account.

### 3.2 Timer Management

- **Cooldown timer**: duration in cooldown.
- **Recovery timer**: duration in recovery.
- **Degradation timer**: time before cooldown.

### 3.3 State Transitions

- **Transition triggers**: error rates, latency, quality.
- **Transition guards**: prevent flapping.
- **Transition logging**: state change audit.

### 3.4 Integration

- **Routing integration**: state-aware selection.
- **Observability**: state telemetry.
- **Dashboard**: state view.

## 4. Implementation Steps

1. Build state model.
2. Add timer management.
3. Add state transitions.
4. Integrate routing.
5. Dashboard: state view.
6. Tests: states, timers, transitions.

## 5. Files Touched

- `src/lib/cooldown/` (new: states, timers, transitions)
- `open-sse/handlers/chatCore.js` (state hooks)
- Dashboard cooldown page (new)
- `tests/unit/cooldown.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| State flapping | Transition guards |
| Timer drift | Periodic sync |
| Missed recovery | Recovery probes |
| Complexity | Simple states |

## 7. Success Criteria

- States tracked.
- Timers managed.
- Transitions clean.
- Routing state-aware.

## 8. Related Plans

- Plan 95 (Cooldown Backoff) — cooldown foundations.
- Plan 9 (Error Hardening) — failover.
- Plan 123 (Failover State Machine) — state machine.
- Plan 94 (Provider Load Balancing) — provider health.