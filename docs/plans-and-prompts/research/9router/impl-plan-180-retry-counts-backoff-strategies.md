---
Date: 2026-09-16
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, retry-counts, backoff-strategies, retry-policy, backoff-tuning
---

# Implementation Plan 180 — Retry Counts & Backoff Strategies

> Mined from branch docs: `42-branch-cascades-and-fallbacks.md` (Level 4: BAAA — Retry Counts, BAAB — Backoff Strategies).

## 1. Goal

Implement retry count and backoff strategy management for 9Router: formalize retry limits per provider, add configurable backoff strategies (exponential, linear, fixed), and tune retry parameters — preventing retry storms while maximizing recovery.

## 2. Background (from research)

- **9Router current state**: Retries exist (plan 23); counts/backoff implicit.
- **Research findings** (42-branch):
  - Retry counts (BAAA): how many retries.
  - Backoff strategies (BAAB): backoff policies.
  - Retry amplification (BAA): amplification control.

## 3. Design

### 3.1 Retry Count Model

- **Per-provider counts**: max retries per provider.
- **Per-error counts**: retries by error type.
- **Global limits**: system-wide retry cap.

### 3.2 Backoff Strategies

- **Exponential**: 2^n × base.
- **Linear**: n × base.
- **Fixed**: constant delay.
- **Jitter**: randomization.

### 3.3 Strategy Selection

- **Per-provider strategy**: provider-specific backoff.
- **Per-error strategy**: error-specific backoff.
- **Adaptive strategy**: adjust from metrics.

### 3.4 Integration

- **Executor integration**: retry config.
- **Observability**: retry telemetry.
- **Dashboard**: retry view.

## 4. Implementation Steps

1. Build retry count model.
2. Add backoff strategies.
3. Add strategy selection.
4. Integrate executors.
5. Dashboard: retry view.
6. Tests: counts, backoff, selection.

## 5. Files Touched

- `src/lib/retry/` (new: counts, backoff, select)
- `open-sse/executors/` (retry integration)
- Dashboard retry page (new)
- `tests/unit/retry.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Too many retries | Global cap |
| Backoff too long | Max delay |
| Backoff too short | Amplification cap |
| Complexity | Simple defaults |

## 7. Success Criteria

- Counts configured.
- Backoff strategies work.
- Selection adaptive.
- Storms prevented.

## 8. Related Plans

- Plan 23 (Fallback Retry Semantics) — retry foundations.
- Plan 138 (Retry Amplification) — amplification.
- Plan 95 (Cooldown Backoff) — cooldowns.
- Plan 9 (Error Hardening) — failover.