# Implementation Plan 191 — Executor Retry Semantics Deep Dive — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #executors #retry #semantics #policy #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (fallback retry semantics from plan 23; retry counts from plan 180 (`src/lib/retry/`); error hardening from plan 9; error classification from plan 89).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — retry model; policy; observability.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-191-executor-retry-semantics.md`, `../research/9router/impl-plan-23-fallback-retry-semantics.md`, `../research/9router/impl-plan-180-retry-counts-backoff-strategies.md`.

## Scope

**In scope:** executor retry model (per-executor config, per-error config, differences); retry policy (retryable/non-retryable errors, limits); retry observability (metrics, logs, alerts).
**Out of scope:** retry counts/backoff (plan 180); error classification (plan 89).

## Milestones

### M1 — Executor retry model

**Reference code (`src/lib/executors/retry.js`):**

```js
// Per-executor config: retry counts, backoff, timeouts.
export const DEFAULT_EXECUTOR_RETRY = { maxRetries: 2, backoff: "exponential", baseDelay: 1000, timeout: 60_000 };

export function makeExecutorRetryConfig(configs = {}) {
  return {
    config(executor) { return { ...DEFAULT_EXECUTOR_RETRY, ...configs[executor] }; },
    set(executor, config) { configs[executor] = config; },
    all() { return configs; },
  };
}

// Per-error config: retry by error type.
export function errorRetryConfig({ errorType = "generic", configs = {} } = {}) {
  return configs[errorType] ?? { retryable: true, maxRetries: 2 };
}

// Executor differences: provider-specific behavior.
export const EXECUTOR_DIFFERENCES = {
  openai: { retryable: ["rate-limit", "timeout", "5xx"], nonRetryable: ["auth", "invalid-request"] },
  anthropic: { retryable: ["rate-limit", "timeout", "5xx", "overloaded"], nonRetryable: ["auth", "invalid-request"] },
  google: { retryable: ["rate-limit", "timeout", "5xx"], nonRetryable: ["auth", "invalid-request"] },
};
```

**Acceptance criteria:** config; per-error; differences.

### M2 — Retry policy

**Reference code (`src/lib/executors/policy.js`):**

```js
// Retryable errors: which errors to retry.
export function isRetryable({ errorType = "generic", executor = "openai", differences = EXECUTOR_DIFFERENCES } = {}) {
  const d = differences[executor] ?? differences.openai;
  return d.retryable.includes(errorType) || errorType === "generic";
}

// Non-retryable errors: fail fast.
export function isNonRetryable({ errorType = "generic", executor = "openai", differences = EXECUTOR_DIFFERENCES } = {}) {
  const d = differences[executor] ?? differences.openai;
  return d.nonRetryable.includes(errorType);
}

// Retry limits: max retries per executor.
export function maxRetriesFor({ executor = "openai", configs = {} } = {}) {
  return configs[executor]?.maxRetries ?? DEFAULT_EXECUTOR_RETRY.maxRetries;
}

// Policy decision.
export function retryDecision({ errorType = "generic", executor = "openai", attempts = 0, configs = {} } = {}) {
  if (isNonRetryable({ errorType, executor })) return { retry: false, reason: "non-retryable" };
  if (!isRetryable({ errorType, executor })) return { retry: false, reason: "not-retryable" };
  if (attempts >= maxRetriesFor({ executor, configs })) return { retry: false, reason: "limit" };
  return { retry: true, reason: "retryable" };
}
```

**Acceptance criteria:** retryable; non-retryable; limits.

### M3 — Retry observability

**Reference code (`src/lib/executors/observe.js`):**

```js
// Retry metrics: retry rates, success rates.
export function makeRetryMetrics() {
  const perExecutor = new Map(); // executor -> {requests, retries, successes}
  return {
    record(executor, { retried = false, ok = true } = {}) {
      const s = perExecutor.get(executor) ?? { requests: 0, retries: 0, successes: 0 };
      s.requests += 1;
      if (retried) s.retries += 1;
      if (ok) s.successes += 1;
      perExecutor.set(executor, s);
    },
    get(executor) {
      const s = perExecutor.get(executor) ?? { requests: 0, retries: 0, successes: 0 };
      return { ...s, retryRate: s.requests ? s.retries / s.requests : 0, successRate: s.requests ? s.successes / s.requests : 1 };
    },
    all() { return Object.fromEntries(perExecutor); },
  };
}

// Retry logs: detailed retry traces.
export function makeRetryLog() {
  const entries = [];
  return {
    log(entry) { entries.push({ ...entry, at: Date.now() }); },
    recent({ limit = 50 } = {}) { return entries.slice(-limit); },
    all() { return entries; },
  };
}

// Retry alerts: excessive retries.
export function retryAlert({ metrics, executor, threshold = 0.5 } = {}) {
  const m = metrics.get(executor);
  return { alert: m.retryRate >= threshold, retryRate: m.retryRate };
}
```

**Acceptance criteria:** metrics; logs; alerts.

### M4 — Integration + tests

**Reference code (`src/lib/executors/integrate-retry.js`):**

```js
// Executor integration: retry config.
export function executorRetryConfig({ executor = "openai", configs = {} } = {}) {
  return { executor, ...(configs[executor] ?? DEFAULT_EXECUTOR_RETRY) };
}

// Fail-open.
export function safeExecutorRetry(fn, fallback = null) {
  try { return fn(); } catch { return fallback; }
}
```

**Files touched:** `src/lib/executors/retry.js` (new), `src/lib/executors/policy.js` (new), `src/lib/executors/observe.js` (new), `src/lib/executors/integrate-retry.js` (new), `open-sse/executors/` (retry integration), dashboard executor-retry page (new), `tests/unit/executor-retry.test.js` (new).

**Acceptance criteria:** integration; fail-open; tests.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Retry storms | Load spikes | Limits |
| Executor differences | Wrong policy | Per-executor config |
| Complexity | Confusion | Simple defaults |
| Observability overhead | Slow paths | Sampling |

## Verification

- Unit: makeExecutorRetryConfig, errorRetryConfig, isRetryable, isNonRetryable, maxRetriesFor, retryDecision, makeRetryMetrics, makeRetryLog, retryAlert, executorRetryConfig
- Manual: error → decision → retry → observe
- Regression: `tests/__baseline__/verify-no-regression.mjs`