---
Date: 2026-09-16
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, circuit-breakers, breaker-patterns, breaker-tuning, resilience-patterns
---

# Implementation Plan 198 — Circuit Breaker Patterns & Tuning

> Mined from branch docs: `44-branch-gateways-and-serving.md` (Level 3: ABB — Circuit Breakers).

## 1. Goal

Implement circuit breaker patterns and tuning for 9Router: formalize circuit breaker states (closed, open, half-open), add configurable breaker parameters, and add breaker tuning — protecting providers from cascading failures.

## 2. Background (from research)

- **9Router current state**: Circuit breakers exist (plan 9); patterns shallow.
- **Research findings** (44-branch):
  - Circuit breakers (ABB): breaker patterns.
  - Reliability layers (AB): breaker integration.
  - Failure detection (ABA-B): breaker triggers.

## 3. Design

### 3.1 Breaker Model

- **Breaker states**: closed, open, half-open.
- **Breaker parameters**: failure threshold, timeout, probe interval.
- **Breaker scope**: per-provider, per-model, per-account.

### 3.2 Breaker Patterns

- **Standard breaker**: threshold-based.
- **Progressive breaker**: escalating thresholds.
- **Adaptive breaker**: auto-adjusting parameters.

### 3.3 Breaker Tuning

- **Tuning data**: breaker effectiveness.
- **Tuning methods**: parameter optimization.
- **Tuning validation**: holdout validation.

### 3.4 Integration

- **Routing integration**: breaker hooks.
- **Observability**: breaker metrics.
- **Dashboard**: breaker view.

## 4. Implementation Steps

1. Build breaker model.
2. Add breaker patterns.
3. Add breaker tuning.
4. Integrate routing.
5. Dashboard: breaker view.
6. Tests: states, patterns, tuning.

## 5. Files Touched

- `src/lib/breakers/` (new: model, patterns, tune)
- `open-sse/handlers/chatCore.js` (breaker hooks)
- Dashboard breakers page (new)
- `tests/unit/breakers.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Premature opening | Threshold tuning |
| Missed failures | Multiple signals |
| Flapping | Half-open probes |
| Complexity | Simple patterns |

## 7. Success Criteria

- States tracked.
- Patterns work.
- Tuning effective.
- Failures contained.

## 8. Related Plans

- Plan 9 (Error Hardening) — failover foundations.
- Plan 152 (Cascade Collapse) — collapse prevention.
- Plan 186 (Failure Detection) — detection.
- Plan 197 (Cooldown Tuning) — cooldowns.