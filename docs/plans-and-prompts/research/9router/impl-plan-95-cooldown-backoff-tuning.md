---
Date: 2026-09-16
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, cooldown-tuning, backoff-strategies, retry-jitter, circuit-breaker
---

# Implementation Plan 95 — Cooldown & Backoff Strategy Tuning

> Mined from branch docs: `42-branch-cascades-and-fallbacks.md` (backoff strategies, cooldown tuning) and `47-branch-9router-internal-threads.md` (cooldown tuning, backoff strategies).

## 1. Goal

Add configurable cooldown and backoff strategies to 9Router: per-provider cooldown periods after failures, exponential backoff with jitter, and circuit-breaker patterns — so retries are gentle on failing providers and recovery is fast.

## 2. Background (from research)

- **9Router current state**: basic retry exists; no cooldown/circuit-breaker.
- **Research findings** (42-branch):
  - Backoff strategies: exponential, linear, fixed, with jitter.
  - Cooldown tuning: cooldown periods after failures.
  - (47-branch) Cooldown tuning: per-provider cooldown config.

## 3. Design

### 3.1 Backoff Strategies

```
STRATEGIES = {
  fixed:        delay = base
  linear:       delay = base * attempt
  exponential:  delay = base * 2^attempt
  exponential_jitter: delay = base * 2^attempt + rand(0, jitter)
  full_jitter:  delay = rand(0, base * 2^attempt)
}
```

- **Per-error-type strategy**: rate-limit → Retry-After; timeout → exponential.
- **Max delay cap**: prevent unbounded waits.

### 3.2 Cooldown Management

- **Cooldown trigger**: N failures in window.
- **Cooldown period**: per-provider configurable.
- **Cooldown decay**: gradual recovery (half-open).
- **Cooldown override**: admin manual override.

### 3.3 Circuit Breaker

- **States**: closed → open → half-open → closed.
- **Trip conditions**: failure rate threshold in window.
- **Half-open probes**: limited test traffic.
- **Reset conditions**: success threshold.

### 3.4 Integration

- **Retry integration**: backoff in retry engine.
- **Selection integration**: cooling providers deprioritized.
- **Observability**: backoff/cooldown telemetry.
- **Dashboard**: strategy tuning UI.

## 4. Implementation Steps

1. Build backoff library (`src/lib/backoff/`).
2. Build cooldown manager.
3. Build circuit breaker.
4. Integrate retry + selection.
5. Dashboard: tuning UI.
6. Tests: backoff math, cooldown transitions, breaker states.

## 5. Files Touched

- `src/lib/backoff/` (new: strategies, cooldown, breaker)
- `open-sse/handlers/chatCore.js` (retry integration)
- `open-sse/config/backoffConfig.js` (new)
- Dashboard backoff page (new)
- `tests/unit/backoff.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Long waits | Max delay caps |
| Breaker flapping | Hysteresis |
| Cooldown starvation | Half-open probes |
| Config complexity | Presets + defaults |

## 7. Success Criteria

- Backoff strategies configurable.
- Cooldowns work with decay.
- Circuit breaker functional.
- Telemetry visible.

## 8. Related Plans

- Plan 57 (Retry Semantics) — retry policies.
- Plan 89 (Error Classification) — error-type backoff.
- Plan 9 (Error Failover) — failover integration.
- Plan 94 (Acceptance/Load) — health signals.