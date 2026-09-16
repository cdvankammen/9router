---
Date: 2026-09-16
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, retry-amplification, retry-storms, retry-control, backoff-policy
---

# Implementation Plan 138 — Retry Amplification Control

> Mined from branch docs: `42-branch-cascades-and-fallbacks.md` (Level 3: BAA — Retry Amplification).

## 1. Goal

Implement retry amplification control for 9Router: prevent retry storms where cascading retries multiply request volume, add retry budget tracking, and add amplification alerts — protecting upstream providers and controlling costs.

## 2. Background (from research)

- **9Router current state**: Retries exist (plan 23); amplification unmanaged.
- **Research findings** (42-branch):
  - Retry amplification (BAA): retries multiply request volume.
  - Retry counts (BAAA): how many retries.
  - Backoff strategies (BAAB): backoff policies.
  - Executor retry config (BBB): per-executor retry settings.

## 3. Design

### 3.1 Amplification Model

- **Amplification factor**: requests / original requests.
- **Retry budget**: max retries per request.
- **Retry fan-out**: max parallel retries.
- **Retry window**: time window for retries.

### 3.2 Retry Control

- **Retry policy**: per-provider retry config.
- **Backoff**: exponential backoff with jitter.
- **Retry classification**: retryable vs non-retryable.
- **Retry deduplication**: dedupe identical retries.

### 3.3 Amplification Alerts

- **Alert thresholds**: amplification > N.
- **Alert actions**: throttle, block, notify.
- **Alert dashboard**: amplification metrics.

### 3.4 Integration

- **Executor integration**: retry control.
- **Observability**: amplification telemetry.
- **Dashboard**: retry view.

## 4. Implementation Steps

1. Build amplification model.
2. Add retry budget.
3. Add backoff policies.
4. Add amplification alerts.
5. Dashboard: retry view.
6. Tests: amplification, backoff, alerts.

## 5. Files Touched

- `src/lib/retry/` (new: budget, backoff, alerts)
- `open-sse/executors/` (retry integration)
- Dashboard retry page (new)
- `tests/unit/retry-amplification.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Retry storms | Budget + alerts |
| Provider rate limits | Backoff |
| Cost explosion | Amplification cap |
| False alerts | Threshold tuning |

## 7. Success Criteria

- Amplification capped.
- Backoff works.
- Alerts fire.
- Costs controlled.

## 8. Related Plans

- Plan 23 (Fallback Retry Semantics) — retry foundations.
- Plan 89 (Error Classification) — retryable errors.
- Plan 95 (Cooldown Backoff) — backoff tuning.
- Plan 24 (Rate Limiting) — rate limits.