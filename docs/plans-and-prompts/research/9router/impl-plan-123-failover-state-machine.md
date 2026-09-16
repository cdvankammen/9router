---
Date: 2026-09-16
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, failover-details, failover-state, failover-recovery, failover-testing
---

# Implementation Plan 123 — Failover State Machine & Recovery

> Mined from branch docs: `47-branch-9router-internal-threads.md` (failover details) and `28c-failover-session-command-log.md`, `29-mini2-freeze-investigation.md`.

## 1. Goal

Add a failover state machine to 9Router: formalize failover states (idle, attempting, failed, recovered), track failover sessions, and add recovery verification — so failover behavior is deterministic and observable.

## 2. Background (from research)

- **9Router current state**: failover logic exists; state implicit.
- **Research findings** (47-branch):
  - Failover details: failover behavior details.
  - (28c) Failover session command log: session logging.
  - (29) Mini2 freeze investigation: freeze root-cause lessons.

## 3. Design

### 3.1 Failover State Machine

```
STATES = {
  idle:       no failover active,
  attempting: trying fallback models,
  degraded:   partial failover,
  failed:     all fallbacks exhausted,
  recovered:  primary restored,
}
TRANSITIONS: idle→attempting→(degraded|failed)→recovered→idle
```

### 3.2 Failover Sessions

- **Session model**: request id, timeline, attempts, outcomes.
- **Session logging**: full failover trace.
- **Session replay**: replay failover for debugging.

### 3.3 Recovery Verification

- **Recovery checks**: primary health after failover.
- **Recovery timing**: configurable recovery delay.
- **Recovery rollback**: revert to primary when healthy.

### 3.4 Failover Testing

- **Failure injection**: simulate provider failures.
- **Failover drills**: scheduled failover tests.
- **Failover reports**: failover effectiveness.

### 3.5 Integration

- **Failover integration**: state machine in failover logic.
- **Observability**: failover telemetry.
- **Dashboard**: failover view.

## 4. Implementation Steps

1. Build state machine (`src/lib/failover/`).
2. Add failover sessions.
3. Add recovery verification.
4. Add failure injection.
5. Integrate failover logic.
6. Dashboard: failover view.
7. Tests: transitions, recovery, injection.

## 5. Files Touched

- `src/lib/failover/` (new: state, session, recovery, inject)
- `src/sse/handlers/chat.js` (state integration)
- `open-sse/handlers/chatCore.js` (failover hooks)
- Dashboard failover page (new)
- `tests/unit/failover.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| State divergence | Single source of truth |
| Recovery races | Locking |
| Injection accidents | Test-only mode |
| Session bloat | Retention policy |

## 7. Success Criteria

- State machine deterministic.
- Sessions logged.
- Recovery verified.
- Failure injection works.

## 8. Related Plans

- Plan 9 (Error Failover) — failover foundations.
- Plan 25 (Node Failover) — node failover.
- Plan 119 (HA Mini Nodes) — HA failover.
- Plan 66 (Request Tracing) — session traces.