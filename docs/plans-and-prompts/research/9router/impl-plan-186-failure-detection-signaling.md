---
Date: 2026-09-16
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, failure-detection, failure-signals, health-monitoring, provider-health
---

# Implementation Plan 186 — Failure Detection & Signaling

> Mined from branch docs: `44-branch-gateways-and-serving.md` (Level 4: ABA-B — Failure Detection).

## 1. Goal

Implement failure detection and signaling for 9Router: detect provider/model failures quickly, signal failures to routing decisions, and add failure classification — enabling fast failover and accurate health tracking.

## 2. Background (from research)

- **9Router current state**: Failure detection ad hoc.
- **Research findings** (44-branch):
  - Failure detection (ABA-B): detection methods.
  - Cooldown tuning (ABA-A): cooldown after detection.
  - Error classification (AAB-B): error types.

## 3. Design

### 3.1 Detection Model

- **Detection signals**: errors, timeouts, quality drops.
- **Detection methods**: threshold, rate, pattern.
- **Detection scope**: per-provider, per-model, per-account.

### 3.2 Signaling

- **Signal types**: failure, degraded, recovered.
- **Signal propagation**: signal to routing.
- **Signal persistence**: signal duration.

### 3.3 Failure Classification

- **Failure types**: network, auth, rate-limit, quality.
- **Failure severity**: critical, major, minor.
- **Failure action**: failover, cooldown, alert.

### 3.4 Integration

- **Routing integration**: failure signals.
- **Observability**: failure metrics.
- **Dashboard**: failure view.

## 4. Implementation Steps

1. Build detection model.
2. Add signaling.
3. Add failure classification.
4. Integrate routing.
5. Dashboard: failure view.
6. Tests: detection, signaling, classification.

## 5. Files Touched

- `src/lib/failures/` (new: detect, signal, classify)
- `open-sse/handlers/chatCore.js` (failure hooks)
- Dashboard failures page (new)
- `tests/unit/failures.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| False positives | Signal tuning |
| Missed failures | Multiple signals |
| Signal noise | Smoothing |
| Complexity | Simple detection |

## 7. Success Criteria

- Failures detected.
- Signals propagated.
- Classification accurate.
- Failover fast.

## 8. Related Plans

- Plan 9 (Error Hardening) — error foundations.
- Plan 89 (Error Classification) — classification.
- Plan 181 (Cooldown Timers) — cooldowns.
- Plan 94 (Provider Load Balancing) — provider health.