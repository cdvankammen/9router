---
Date: 2026-09-15
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, error-system, failover, hardening, cooldown, circuit-breaker
---

# Implementation Plan 9 — Error System & Failover Hardening

> Written after the binary-tree research expansion (see `39-binary-tree-expansion-master-plan.md`, `47-branch-9router-internal-threads.md` — error systems 21–29, node failover 24–28).
> This plan covers the "error/failover hardening" option: unify error handling and harden failover with research-backed policies.

## 1. Goal

Harden 9Router's error system and failover: unify error categorization (rate_limit | auth | billing | timeout | ...), apply LiteLLM-style cooldown/retry policies, and strengthen node failover with crash-loop protection and session recovery.

## 2. Background (from research)

- **9Router error systems** (docs 21–29): error categorization in `categorizeError()`; programmatic error registry; unified error system v2; error inbox P2 design; no-more-bugs audit.
- **9Router node failover** (docs 24–28): HA mini backup nodes; failover networking options; mini2 crashloop deep-dive; failover session command log; packaging fixes; dual-instance conflicts.
- **LiteLLM**: cooldowns (429 → 5s; >50% failures in minute → 5s; 401/404/408 → 5s); allowed_fails + cooldown_time; retries with exponential backoff; max_retries:0 pinning; no-retry errors (ContextWindowExceededError, ContentPolicyViolationError).
- **RouterBench**: cascades collapse when judge error > 0.2 — error handling must not amplify failures.

## 3. Design

### 3.1 Unified Error System (from docs 21–29)

- **Error taxonomy**: rate_limit | auth | billing | timeout | context_window | content_policy | network | server | unknown.
- **Error registry**: programmatic registry (doc 26) — error codes, categories, retry policies, user messages.
- **Error mapping**: upstream errors → internal taxonomy (per-executor mapping).
- **Error responses**: unified format (doc 29) — consistent error responses across providers.

### 3.2 Cooldown & Retry Policies (LiteLLM patterns)

- **Cooldown map**: per-error-category cooldowns:
  - 429 → immediate 5s.
  - >50% failures in minute → 5s.
  - 401/404/408 → 5s.
  - allowed_fails + cooldown_time per deployment.
- **Retry semantics**: num_retries precedence (header → body → deployment params → settings); exponential backoff for RateLimitError; max_retries:0 pinning.
- **No-retry errors**: context_window, content_policy — fail fast.
- **Circuit breakers**: trip after allowed_fails; half-open probe; per-deployment isolation.

### 3.3 Failover Hardening (from docs 24–28)

- **Crash-loop protection**: exponential backoff on repeated crashes; health checks before promotion.
- **Session recovery**: failover session command log (doc 28c) — restore sessions after failover.
- **Networking**: failover networking options (doc 26) — socket reuse, connection pooling.
- **Packaging**: failover packaging fixes (doc 28d) — ensure backup nodes ship correct artifacts.
- **Dual-instance conflicts** (doc 28): lock files, port conflicts, state ownership.

### 3.4 Error Inbox (doc 25 P2 design)

- **Error inbox**: dashboard view of categorized errors with retry/fix actions.
- **Error analytics**: error rates per provider/model/category.
- **Error alerts**: threshold-based alerts (Slack/webhook).

## 4. Implementation Steps

1. Consolidate error taxonomy + registry (docs 21–29 findings).
2. Add cooldown map to retry config.
3. Add circuit breakers per deployment.
4. Add no-retry error classification.
5. Harden failover (crash-loop protection, session recovery).
6. Fix dual-instance conflicts.
7. Build error inbox dashboard.
8. Tests: error mapping, cooldowns, circuit breakers, failover.

## 5. Files Touched

- `open-sse/config/runtimeConfig.js` (cooldown map)
- `open-sse/handlers/chatCore.js` (retry/refresh)
- `open-sse/executors/default.js` (retry logic)
- `src/lib/db/repos/errorRegistryRepo.js` (new)
- `src/lib/db/repos/circuitBreakerRepo.js` (new)
- `custom-server.js` (failover networking)
- Dashboard error-inbox page (new)
- `tests/unit/error-system.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Cooldown over-aggression | Tune per-category; per-deployment policies |
| Circuit breaker false trips | Allowed_fails tuning; half-open probing |
| Failover complexity | Incremental rollout; failover testing |
| Error taxonomy churn | Registry-driven; migration path |

## 7. Success Criteria

- Unified error taxonomy across all executors.
- Cooldowns/circuit breakers operational.
- No (1+N)² retry amplification.
- Failover recovers sessions without crash loops.
- Error inbox functional.

## 8. Related Plans
- Plan 2 (Cascade Enhancements) — fallback synergy.
- Plan 8 (Routing Observability) — error telemetry.
- Plan 7 (Eval Harness) — error-rate evaluation.