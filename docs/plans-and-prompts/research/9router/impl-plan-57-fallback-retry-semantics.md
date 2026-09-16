---
Date: 2026-09-16
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, model-fallback, retry, backoff, resilience
---

# Implementation Plan 57 — Model Fallback & Retry Semantics

> Written after the binary-tree research expansion (see `39-binary-tree-expansion-master-plan.md`, `42-branch-cascades-and-fallbacks.md`).
> This plan covers the "fallback/retry semantics" option: precise fallback and retry semantics.

## 1. Goal

Define and implement precise fallback and retry semantics: retry policies per error type, fallback ordering, and retry/fallback interaction — so failures are handled predictably.

## 2. Background (from research)

- **9Router current state**: retry/refresh in chatCore; combo fallback; LiteLLM patterns researched.
- **Research findings** (42-branch): retry semantics — which errors retry (rate_limit, timeout, 5xx), which don't (auth, context, content policy); fallback ordering — same-provider retry before cross-provider fallback; retry/fallback interaction — retry budget then fallback.

## 3. Design

### 3.1 Retry Policies

- **Retry matrix**: error type → retry count, backoff, jitter.
- **Retry budget**: max retries per request.
- **Retry idempotency**: safe retry (non-streaming).
- **No-retry errors**: auth, context, content policy.

### 3.2 Fallback Ordering

- **Ordering rules**: same-provider retry → same-provider model → cross-provider.
- **Fallback conditions**: error type, retry exhaustion.
- **Fallback budget**: max fallbacks per request.

### 3.3 Retry/Fallback Interaction

- **Sequence**: retry (per policy) → fallback (per ordering).
- **Budget sharing**: shared retry+fallback budget.
- **Termination**: clear error after exhaustion.

### 3.4 Semantics Documentation

- **Semantics doc**: documented retry/fallback semantics.
- **Semantics tests**: behavior tests.
- **Semantics telemetry**: retry/fallback events.

## 4. Implementation Steps

1. Define retry matrix.
2. Define fallback ordering.
3. Implement interaction.
4. Document semantics.
5. Tests: retry matrix, ordering, budgets.

## 5. Files Touched

- `open-sse/config/retryConfig.js` (new)
- `open-sse/handlers/chatCore.js` (retry/fallback)
- `docs/routing-semantics.md` (new)
- `src/lib/db/repos/retryRepo.js` (new)
- `tests/unit/retry-fallback.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Retry storms | Budgets; backoff |
| Wrong ordering | Documented rules |
| Budget starvation | Shared budget tuning |
| Semantics drift | Tests |

## 7. Success Criteria

- Retry matrix enforced.
- Fallback ordering correct.
- Budgets respected.
- Semantics documented + tested.

## 8. Related Plans
- Plan 9 (Error System) — error categories.
- Plan 2 (Cascade Enhancements) — cascade synergy.
- Plan 8 (Observability) — retry telemetry.