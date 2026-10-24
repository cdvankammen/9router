# Implementation Plan 138 — Retry Amplification Control — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #retry #amplification #backoff #budget #alerts #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (retry semantics from plan 23; error classification from plan 89 (`open-sse/errors/`); cooldown/backoff from plan 95 (`src/lib/backoff/`); rate limiting from plan 24; retry integration in `open-sse/executors/*`).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — amplification model; retry budget; backoff; alerts.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-138-retry-amplification-control.md`, `../research/9router/impl-plan-23-fallback-retry-semantics.md`, `../research/9router/impl-plan-95-cooldown-backoff-tuning.md`.

## Scope

**In scope:** amplification model (amplification factor requests/original, retry budget max retries per request, retry fan-out max parallel, retry window); retry control (per-provider retry policy, exponential backoff with jitter, retryable vs non-retryable classification, retry dedup); amplification alerts (thresholds, throttle/block/notify actions, dashboard metrics); executor integration + dashboard retry view.
**Out of scope:** retry foundations (plan 23); backoff tuning internals (plan 95).

## Milestones

### M1 — Amplification model

**Reference code (`src/lib/retry/amplify.js`):**

```js
// Amplification factor: requests / original requests.
export function amplificationFactor({ totalRequests = 1, originalRequests = 1 } = {}) {
  return originalRequests ? totalRequests / originalRequests : 0;
}

// Retry budget: max retries per request.
export function makeRetryBudget({ maxRetries = 3, maxFanOut = 2, windowMs = 60_000 } = {}) {
  let retries = 0, fanOut = 0;
  const startedAt = Date.now();
  return {
    // Can we retry?
    canRetry() {
      if (retries >= maxRetries) return { ok: false, reason: "max-retries" };
      if (Date.now() - startedAt > windowMs) return { ok: false, reason: "window-expired" };
      return { ok: true };
    },
    // Can we fan out more parallel retries?
    canFanOut() { return { ok: fanOut < maxFanOut, reason: fanOut < maxFanOut ? null : "max-fanout" }; },
    recordRetry() { retries += 1; },
    recordFanOut() { fanOut += 1; },
    releaseFanOut() { fanOut = Math.max(0, fanOut - 1); },
    report() { return { retries, fanOut, maxRetries, maxFanOut }; },
  };
}
```

**Acceptance criteria:** factor; budget; fan-out; window.

### M2 — Retry control

**Reference code (`src/lib/retry/control.js`):**

```js
// Retry policy: per-provider retry config.
export function retryPolicy({ providerId, policies = {} } = {}) {
  return policies[providerId] ?? { maxRetries: 2, backoffMs: 500, jitter: true };
}

// Backoff: exponential with jitter.
export function backoffDelay(attempt, { baseMs = 500, maxMs = 10_000, jitter = true } = {}) {
  const exp = Math.min(maxMs, baseMs * 2 ** attempt);
  return jitter ? exp / 2 + Math.random() * (exp / 2) : exp;
}

// Retry classification: retryable vs non-retryable.
export const RETRYABLE = ["timeout", "network", "rate-limit", "5xx", "connection"];
export const NON_RETRYABLE = ["auth", "invalid-request", "malformed", "quota"];

export function isRetryable(errorType) {
  return RETRYABLE.includes(errorType) && !NON_RETRYABLE.includes(errorType);
}

// Retry dedup: dedupe identical retries.
export function makeRetryDeduper() {
  const seen = new Set(); // hash -> count
  return {
    // Hash: request identity.
    hash({ providerId, model, messages, attempt = 0 } = {}) {
      return `${providerId}:${model}:${JSON.stringify(messages)?.slice(0, 200)}:${attempt}`;
    },
    // Should we skip this retry (already attempted)?
    shouldSkip(key) {
      const n = seen.get(key) ?? 0;
      if (n > 0) return true;
      seen.set(key, 1);
      return false;
    },
  };
}
```

**Acceptance criteria:** policy; backoff; classification; dedup.

### M3 — Amplification alerts

**Reference code (`src/lib/retry/alerts.js`):**

```js
// Alert thresholds: amplification > N.
export function alertCheck({ factor = 1, threshold = 3, windowMs = 60_000 } = {}) {
  return { alert: factor > threshold, factor, threshold };
}

// Alert actions: throttle, block, notify.
export function alertAction({ alert = false, action = "notify" } = {}) {
  if (!alert) return { action: "none" };
  return { action }; // throttle | block | notify
}

// Throttle: reduce retry rate.
export function throttle({ factor = 1, maxFactor = 3 } = {}) {
  return { allowed: factor <= maxFactor, delayMs: factor > maxFactor ? 1000 * (factor - maxFactor) : 0 };
}

// Telemetry: amplification metrics.
export function makeAmplificationTelemetry() {
  const events = [];
  return {
    record(evt) { events.push({ ...evt, at: Date.now() }); },
    report() {
      const factors = events.filter((e) => e.factor != null).map((e) => e.factor);
      return {
        requests: events.length,
        avgFactor: factors.length ? factors.reduce((a, b) => a + b, 0) / factors.length : 0,
        alerts: events.filter((e) => e.alert).length,
        blocked: events.filter((e) => e.action === "block").length,
      };
    },
  };
}
```

**Acceptance criteria:** thresholds; actions; throttle; telemetry.

### M4 — Integration + tests

**Reference code (`src/lib/retry/integrate.js`):**

```js
// Executor integration: retry control.
export function retryStep({ budget, errorType, policy, deduper, key } = {}) {
  if (!isRetryable(errorType)) return { retry: false, reason: "not-retryable" };
  if (deduper?.shouldSkip(key)) return { retry: false, reason: "duplicate" };
  const can = budget.canRetry();
  if (!can.ok) return { retry: false, reason: can.reason };
  budget.recordRetry();
  return { retry: true, delayMs: backoffDelay(budget.report().retries - 1, policy) };
}

// Amplification guard: cap total requests.
export function amplificationGuard({ budget, factor, maxFactor = 3 } = {}) {
  if (factor > maxFactor) return { ok: false, reason: "amplification-capped" };
  return { ok: budget.canRetry().ok };
}
```

**Files touched:** `src/lib/retry/` (new: amplify, control, alerts, integrate), `open-sse/executors/` (retry integration), dashboard retry page (new), `tests/unit/retry-amplification.test.js` (new).

**Acceptance criteria:** integration; guard; tests.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Retry storms | Provider overload | Budget + alerts |
| Provider rate limits | 429s | Backoff |
| Cost explosion | High bills | Amplification cap |
| False alerts | Alert fatigue | Threshold tuning |

## Verification

- Unit: amplificationFactor, makeRetryBudget, backoffDelay, isRetryable, makeRetryDeduper, retryStep
- Manual: repeated failures → amplification alert; cap blocks further retries
- Regression: `tests/__baseline__/verify-no-regression.mjs`