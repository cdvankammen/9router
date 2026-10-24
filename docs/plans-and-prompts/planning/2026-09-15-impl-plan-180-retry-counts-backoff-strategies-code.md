# Implementation Plan 180 — Retry Counts & Backoff Strategies — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #retry #backoff #jitter #resilience #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (fallback retry semantics from plan 23; retry amplification from plan 138; cooldown backoff from plan 95; error hardening from plan 9).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — retry counts; backoff; selection.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-180-retry-counts-backoff-strategies.md`, `../research/9router/impl-plan-23-fallback-retry-semantics.md`, `../research/9router/impl-plan-138-retry-amplification.md`.

## Scope

**In scope:** retry count model (per-provider, per-error, global limits); backoff strategies (exponential, linear, fixed, jitter); strategy selection (per-provider, per-error, adaptive).
**Out of scope:** cooldown states (plan 181); fallback chains (plan 179).

## Milestones

### M1 — Retry count model

**Reference code (`src/lib/retry/counts.js`):**

```js
// Retry counts: per-provider, per-error, global.
export function makeRetryPolicy({ perProvider = {}, perError = {}, global = 5 } = {}) {
  return {
    maxFor(provider, errorType = "generic") {
      return perError[errorType] ?? perProvider[provider] ?? 2;
    },
    global,
    // Check: can we retry?
    canRetry({ provider, errorType = "generic", attempts = 0 } = {}) {
      return attempts < this.maxFor(provider, errorType) && attempts < global;
    },
  };
}

// Global limits: system-wide retry cap.
export function globalCap({ attempts = 0, cap = 5 } = {}) {
  return attempts < cap;
}
```

**Acceptance criteria:** policy; limits.

### M2 — Backoff strategies

**Reference code (`src/lib/retry/backoff.js`):**

```js
// Backoff strategies: exponential, linear, fixed.
export function exponentialBackoff({ attempt = 0, base = 1000, max = 30000 } = {}) {
  return Math.min(max, base * 2 ** attempt);
}

export function linearBackoff({ attempt = 0, base = 1000, max = 30000 } = {}) {
  return Math.min(max, base * (attempt + 1));
}

export function fixedBackoff({ base = 1000 } = {}) {
  return base;
}

// Jitter: randomization.
export function withJitter(delay, { jitter = 0.3, rng = Math.random } = {}) {
  const spread = delay * jitter;
  return delay - spread + rng() * spread * 2;
}

// Strategy dispatch.
export const BACKOFF_STRATEGIES = { exponential: exponentialBackoff, linear: linearBackoff, fixed: fixedBackoff };

export function backoffFor({ strategy = "exponential", attempt = 0, base = 1000, max = 30000, jitter = 0.3 } = {}) {
  const fn = BACKOFF_STRATEGIES[strategy] ?? exponentialBackoff;
  return withJitter(fn({ attempt, base, max }), { jitter });
}
```

**Acceptance criteria:** strategies; jitter; dispatch.

### M3 — Strategy selection

**Reference code (`src/lib/retry/select.js`):**

```js
// Per-provider strategy.
export function strategyFor({ provider, strategies = {} } = {}) {
  return strategies[provider] ?? "exponential";
}

// Per-error strategy.
export function errorStrategy({ errorType, strategies = {} } = {}) {
  return strategies[errorType] ?? "exponential";
}

// Adaptive strategy: adjust from metrics.
export function adaptiveStrategy({ metrics = {}, current = "exponential" } = {}) {
  // If retries keep failing, slow down.
  if (metrics.failureRate > 0.5) return "linear";
  return current;
}

// Retry plan: full retry schedule.
export function retryPlan({ policy, provider, errorType = "generic", strategy = "exponential", base = 1000 } = {}) {
  const plan = [];
  let attempt = 0;
  while (policy.canRetry({ provider, errorType, attempts: attempt })) {
    plan.push({ attempt, delay: backoffFor({ strategy, attempt, base }) });
    attempt += 1;
  }
  return plan;
}
```

**Acceptance criteria:** selection; adaptive; plan.

### M4 — Integration + tests

**Reference code (`src/lib/retry/integrate.js`):**

```js
// Executor integration: retry config.
export function retryConfig({ policy, provider, strategy = "exponential" } = {}) {
  return { policy, provider, strategy };
}

// Fail-open.
export function safeRetry(fn, fallback = null) {
  try { return fn(); } catch { return fallback; }
}
```

**Files touched:** `src/lib/retry/` (new: counts, backoff, select, integrate), `open-sse/executors/` (retry integration), dashboard retry page (new), `tests/unit/retry.test.js` (new).

**Acceptance criteria:** integration; fail-open; tests.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Too many retries | Retry storms | Global cap |
| Backoff too long | Slow recovery | Max delay |
| Backoff too short | Amplification | Amplification cap |
| Complexity | Confusion | Simple defaults |

## Verification

- Unit: makeRetryPolicy, globalCap, exponentialBackoff, linearBackoff, fixedBackoff, withJitter, backoffFor, strategyFor, errorStrategy, adaptiveStrategy, retryPlan, retryConfig
- Manual: policy → plan → execute → observe delays
- Regression: `tests/__baseline__/verify-no-regression.mjs`