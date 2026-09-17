---
Date: 2026-09-16
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, executor-retry, retry-semantics, executor-config, retry-policy
---

# Implementation Plan 191 — Executor Retry Semantics Deep Dive

> Mined from branch docs: `47-branch-9router-internal-threads.md` (Level 4: AAA-A — Executor Retry Semantics).

## 1. Goal

Deepen 9Router's executor retry semantics: formalize retry behavior per executor (OpenAI, Anthropic, Google, etc.), add executor-specific retry policies, and add retry observability — making executor retry behavior predictable and tunable.

## 2. Background (from research)

- **9Router current state**: Executor retries exist; semantics implicit.
- **Research findings** (47-branch):
  - Executor retry semantics (AAA-A): per-executor retry.
  - Executor specialization (AAA-B): executor differences.
  - Retry counts (42-branch): retry limits.

## 3. Design

### 3.1 Executor Retry Model

- **Per-executor config**: retry counts, backoff, timeouts.
- **Per-error config**: retry by error type.
- **Executor differences**: provider-specific behavior.

### 3.2 Retry Policy

- **Retryable errors**: which errors to retry.
- **Non-retryable errors**: which errors to fail fast.
- **Retry limits**: max retries per executor.

### 3.3 Retry Observability

- **Retry metrics**: retry rates, success rates.
- **Retry logs**: detailed retry traces.
- **Retry alerts**: excessive retries.

### 3.4 Integration

- **Executor integration**: retry config.
- **Observability**: retry telemetry.
- **Dashboard**: retry view.

## 4. Implementation Steps

1. Build executor retry model.
2. Add retry policy.
3. Add retry observability.
4. Integrate executors.
5. Dashboard: retry view.
6. Tests: semantics, policy, observability.

## 5. Files Touched

- `src/lib/executors/retry.js` (new)
- `open-sse/executors/` (retry integration)
- Dashboard executor-retry page (new)
- `tests/unit/executor-retry.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Retry storms | Limits |
| Executor differences | Per-executor config |
| Complexity | Simple defaults |
| Observability overhead | Sampling |

## 7. Success Criteria

- Semantics formalized.
- Policy enforced.
- Observability functional.
- Retries predictable.

## 8. Related Plans

- Plan 23 (Fallback Retry Semantics) — retry foundations.
- Plan 180 (Retry Counts) — retry counts.
- Plan 9 (Error Hardening) — failover.
- Plan 89 (Error Classification) — error types.