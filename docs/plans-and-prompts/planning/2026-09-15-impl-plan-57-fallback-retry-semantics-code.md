# Implementation Plan 57 — Model Fallback & Retry Semantics — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #fallback #retry #backoff #semantics #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (retry/refresh logic in `open-sse/handlers/chatCore.js`; combo fallback loop in `src/sse/handlers/chat.js`; error categories from plan 9 / `open-sse/config/errorCodes.js`; LiteLLM patterns referenced in research).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — simulate each error type; confirm retry matrix, ordering, budgets; check telemetry.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-57-fallback-retry-semantics.md`, `../research/9router/42-branch-cascades-and-fallbacks.md`, `../research/9router/impl-plan-09-error-system.md`.

## Scope

**In scope:** retry matrix (error type → retry count, backoff, jitter); no-retry errors (auth, context, content policy); retry budget per request; fallback ordering (same-provider retry → same-provider model → cross-provider); fallback conditions + budget; shared retry+fallback budget; termination with clear error; semantics doc + behavior tests + telemetry.
**Out of scope:** streaming retry (non-idempotent); circuit breaker state (plan 17).

## Milestones

### M1 — Retry matrix + config

**Reference code (`open-sse/config/retryConfig.js`):**

```js
// Retry matrix: error category → policy.
export const RETRY_MATRIX = {
  RATE_LIMITED: { retries: 3, backoffMs: 1000, backoffFactor: 2, jitter: true },
  TIMEOUT: { retries: 2, backoffMs: 500, backoffFactor: 2, jitter: true },
  OVERLOADED: { retries: 2, backoffMs: 1000, backoffFactor: 2, jitter: true },
  NETWORK: { retries: 2, backoffMs: 300, backoffFactor: 2, jitter: true },
  // No-retry categories (return immediately):
  AUTH_ERROR: null,
  CONTEXT_LENGTH: null,
  CONTENT_POLICY: null,
  INVALID_REQUEST: null,
  MODEL_NOT_FOUND: null,
};

export const RETRY_BUDGET = { maxRetriesPerRequest: 5, maxFallbacksPerRequest: 3 };

export function retryPolicyFor(category) {
  return RETRY_MATRIX[category] ?? null; // unknown → no retry (conservative)
}

export function backoffMs(policy, attempt) {
  const base = policy.backoffMs * policy.backoffFactor ** attempt;
  if (!policy.jitter) return base;
  return Math.round(base * (0.5 + Math.random() * 0.5)); // ±50% jitter
}
```

**Acceptance criteria:** matrix covers all categories; no-retry categories explicit; budget constants central.

### M2 — Retry executor

**Reference code (`open-sse/handlers/retry.js`):**

```js
import { retryPolicyFor, backoffMs, RETRY_BUDGET } from "../config/retryConfig.js";

// Execute with retry per policy. Non-streaming only (streaming fails fast).
export async function executeWithRetry({ fn, category, attempt = 0, budget = RETRY_BUDGET.maxRetriesPerRequest }) {
  const policy = retryPolicyFor(category);
  if (!policy || attempt >= Math.min(policy.retries, budget)) {
    return { ok: false, error: { category, exhausted: true } };
  }
  try {
    const result = await fn();
    return { ok: true, result };
  } catch (err) {
    const nextCategory = err.category ?? category;
    if (!retryPolicyFor(nextCategory)) return { ok: false, error: { category: nextCategory, exhausted: false } };
    await sleep(backoffMs(policy, attempt));
    return executeWithRetry({ fn, category: nextCategory, attempt: attempt + 1, budget: budget - 1 });
  }
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }
```

**Acceptance criteria:** retries per policy; budget shared; no-retry categories fail fast; jitter applied.

### M3 — Fallback ordering

**Reference code (`open-sse/handlers/fallback.js`):**

```js
import { RETRY_BUDGET } from "../config/retryConfig.js";

// Ordering: same-provider retry → same-provider model → cross-provider.
// candidates: [{ provider, model, priority }] — already ordered by combo.
export async function executeWithFallback({ candidates, execute, budget = RETRY_BUDGET.maxFallbacksPerRequest }) {
  let attempts = 0;
  const errors = [];

  for (const candidate of candidates) {
    if (attempts >= budget) break;
    attempts += 1;
    try {
      const result = await execute(candidate);
      return { ok: true, result, used: candidate, attempts };
    } catch (err) {
      errors.push({ candidate, category: err.category ?? "UNKNOWN", message: err.message });
      // Same-provider retry happens inside execute() (retry.js); here we move down the chain.
    }
  }
  return { ok: false, errors, attempts };
}

// Termination: after exhaustion, produce a clear final error.
export function finalError(errors) {
  const last = errors[errors.length - 1];
  return {
    error: {
      message: `All ${errors.length} candidate(s) failed. Last: ${last?.message ?? "unknown"}`,
      type: "api_error",
      param: null,
      code: "fallback_exhausted",
    },
    attempts: errors.length,
    candidates: errors.map((e) => e.candidate),
  };
}
```

**Acceptance criteria:** ordering respected; budget enforced; termination error clear.

### M4 — Semantics doc + telemetry + tests

**Reference code (`docs/routing-semantics.md`):**

```markdown
# Routing Semantics

## Retry
- Retryable: rate_limit (3×, exp backoff + jitter), timeout (2×), overloaded (2×), network (2×).
- Never retried: auth, context_length, content_policy, invalid_request, model_not_found.
- Budget: max 5 retries per request (shared with fallback budget).

## Fallback ordering
1. Same provider, same model (retry).
2. Same provider, next model (combo order).
3. Next provider (combo order).
4. Budget: max 3 fallbacks per request.

## Termination
- After exhaustion: `{ error: { type: "api_error", code: "fallback_exhausted", message: "All N candidate(s) failed..." } }`.
```

**Reference code (`src/lib/db/repos/retryRepo.js`):**

```js
// Telemetry: record retry/fallback events.
export async function recordRetryEvent(db, { requestId, provider, model, category, attempt, outcome }) {
  db.run(`
    INSERT INTO retry_events (request_id, provider, model, category, attempt, outcome, created_at)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
  `, [requestId, provider ?? null, model ?? null, category, attempt, outcome]);
}
```

**Files touched:** `open-sse/config/retryConfig.js` (new), `open-sse/handlers/retry.js` (new), `open-sse/handlers/fallback.js` (new), `open-sse/handlers/chatCore.js` (integration), `docs/routing-semantics.md` (new), `src/lib/db/repos/retryRepo.js` (new), `tests/unit/retry-fallback.test.js` (new).

**Acceptance criteria:** semantics doc matches implementation; telemetry recorded; tests cover matrix + ordering + budgets.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Retry storms | Provider overload | Budgets + backoff + jitter |
| Wrong ordering | Slow recovery | Documented rules + tests |
| Budget starvation | No fallback left | Shared budget tuning |
| Semantics drift | Doc/code mismatch | Behavior tests |

## Verification

- Unit: matrix, backoff, retry, fallback, budgets
- Manual: simulate rate_limit → retries → fallback → exhaustion error
- Regression: `tests/__baseline__/verify-no-regression.mjs`