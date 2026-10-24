# Implementation Plan 89 — Error Classification & Executor Retry Semantics — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #error-classification #retry-semantics #error-registry #failure-detection #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (unified error system from plan 19 research; retry/fallback from plan 57 (`open-sse/handlers/retry.js`); executors in `open-sse/executors/*`; error messages from plan 61).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — classify each error type; confirm per-type retry policy; confirm budget respected.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-89-error-classification-retry.md`, `../research/9router/impl-plan-57-fallback-retry-semantics.md`, `../research/9router/impl-plan-19-unified-error-system.md`.

## Scope

**In scope:** error taxonomy (transient, rate_limit, timeout, auth, quota, malformed, permanent, unknown) with per-type retry semantics (retryable flags, backoff, Retry-After respect, timeout shortening); error registry (code, type, message template, retry policy, provider extensions); classifier (upstream errors → registry entries); unified retry engine (per-type + per-executor policies, total retry budget, retry trace logging); failure detection (pre-flight health checks, per-phase timeouts, mid-stream detection); executor migration + telemetry.
**Out of scope:** token-refresh integration details (plan 21/oauth scope); provider-specific retry quirks beyond registry entries.

## Milestones

### M1 — Error taxonomy + registry

**Reference code (`open-sse/errors/taxonomy.js` + `registry.js`):**

```js
export const ERROR_TYPES = {
  transient:   { retryable: true,  maxRetries: 3, backoffMs: 500 },
  rate_limit:  { retryable: true,  maxRetries: 2, backoffMs: 1000, respectRetryAfter: true },
  timeout:     { retryable: true,  maxRetries: 2, backoffMs: 200, shortenTimeout: true },
  auth:        { retryable: false, note: "refresh token first" },
  quota:       { retryable: false, note: "switch account" },
  malformed:   { retryable: false, note: "fix request" },
  permanent:   { retryable: false, note: "fail fast" },
  unknown:     { retryable: true,  maxRetries: 1, backoffMs: 300 },
};

export function policyFor(type, taxonomy = ERROR_TYPES) {
  return taxonomy[type] ?? taxonomy.unknown;
}
```

```js
// Centralized registry: code → { type, messageTemplate, retryPolicy }.
export const ERROR_REGISTRY = [
  { code: "rate_limit_exceeded", type: "rate_limit", messageTemplate: "Rate limit exceeded" },
  { code: "insufficient_quota", type: "quota", messageTemplate: "Quota exhausted" },
  { code: "invalid_api_key", type: "auth", messageTemplate: "Invalid API key" },
  { code: "authentication_error", type: "auth", messageTemplate: "Authentication failed" },
  { code: "request_timeout", type: "timeout", messageTemplate: "Request timed out" },
  { code: "bad_request", type: "malformed", messageTemplate: "Malformed request" },
  { code: "server_error", type: "transient", messageTemplate: "Upstream server error" },
  { code: "overloaded", type: "transient", messageTemplate: "Upstream overloaded" },
];

export function lookupError(code, registry = ERROR_REGISTRY) {
  return registry.find((e) => e.code === code) ?? null;
}

// Providers register custom errors.
export function registerError(entry, registry = ERROR_REGISTRY) {
  registry.push(entry);
}
```

**Acceptance criteria:** taxonomy complete; registry lookup; custom registration.

### M2 — Classifier

**Reference code (`open-sse/errors/classifier.js`):**

```js
import { lookupError } from "./registry.js";

// Classify an upstream error into a taxonomy type.
export function classifyError({ status, code, message = "", headers = {} }) {
  if (status === 429 || code === "rate_limit_exceeded" || /rate\s*limit/i.test(message)) return "rate_limit";
  if (status === 401 || status === 403 || /invalid.*key|auth/i.test(message)) return "auth";
  if (status === 402 || /quota|insufficient/i.test(message)) return "quota";
  if (status === 408 || /timeout/i.test(message)) return "timeout";
  if (status === 400 || /malformed|invalid request/i.test(message)) return "malformed";
  if (status >= 500) return "transient";
  const reg = lookupError(code);
  if (reg) return reg.type;
  return "unknown";
}

// Retry-After extraction (seconds).
export function retryAfterMs(headers = {}) {
  const raw = headers["retry-after"];
  if (!raw) return null;
  const secs = Number(raw);
  return Number.isFinite(secs) ? secs * 1000 : null;
}
```

**Acceptance criteria:** status/code/message classification; Retry-After parsed.

### M3 — Unified retry engine

**Reference code (`open-sse/errors/retry.js`):**

```js
import { classifyError, retryAfterMs } from "./classifier.js";
import { policyFor } from "./taxonomy.js";

// Unified retry: per-type policy + budget + trace.
export async function withRetry(fn, { executor = "default", budgetMs = 30_000, onRetry = () => {} } = {}) {
  const started = Date.now();
  let attempt = 0;
  const trace = [];
  for (;;) {
    attempt += 1;
    try {
      const result = await fn(attempt);
      return { ok: true, result, attempts: attempt, trace };
    } catch (err) {
      const type = classifyError(err);
      const policy = policyFor(type);
      const elapsed = Date.now() - started;
      const retryable = policy.retryable && attempt <= (policy.maxRetries ?? 0) && elapsed < budgetMs;
      trace.push({ attempt, type, message: err.message, retryable, elapsed });
      if (!retryable) return { ok: false, error: err, type, attempts: attempt, trace };
      const wait = retryAfterMs(err.headers) ?? policy.backoffMs * 2 ** (attempt - 1);
      onRetry({ attempt, type, waitMs: wait });
      await new Promise((r) => setTimeout(r, Math.min(wait, 5_000))); // cap Retry-After abuse
    }
  }
}

// Per-executor override: executor-specific policy wins.
export function policyForExecutor(executor, type, executorPolicies = {}) {
  return executorPolicies[executor]?.[type] ?? policyFor(type);
}
```

**Acceptance criteria:** retries per policy; budget respected; trace recorded; Retry-After capped.

### M4 — Failure detection + integration + tests

**Reference code (`open-sse/errors/detect.js`):**

```js
// Pre-flight: fail fast when provider is known unhealthy.
export function preflightCheck({ healthScore, minHealth = 0.2 }) {
  if (healthScore == null) return { ok: true };
  return healthScore >= minHealth ? { ok: true } : { ok: false, reason: "provider-unhealthy" };
}

// Per-phase timeouts: shorter timeout on retry.
export function phaseTimeout({ phase, baseMs = 30_000, attempt = 1, shorten = false }) {
  const factor = shorten && attempt > 1 ? 0.5 : 1;
  return { phase, timeoutMs: Math.round(baseMs * factor) };
}

// Mid-stream failure detection: classify a stream error chunk.
export function streamError(chunk) {
  if (!chunk?.error) return null;
  return classifyError({ status: chunk.error.status, code: chunk.error.code, message: chunk.error.message });
}
```

**Files touched:** `open-sse/errors/` (new: taxonomy, registry, classifier, retry, detect), `open-sse/executors/*` (retry migration), `open-sse/handlers/chatCore.js` (retry integration), dashboard errors page (new), `tests/unit/errors.test.js` (new).

**Acceptance criteria:** executors use unified retry; pre-flight + timeouts active; telemetry visible.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Misclassification | Wrong retries | Unknown → retry once |
| Retry storms | Upstream overload | Budget + backoff |
| Executor divergence | Inconsistent behavior | Migration tests |
| Retry-After abuse | Long waits | Cap wait time |

## Verification

- Unit: classifyError, retryAfterMs, withRetry, preflightCheck
- Manual: 429 → respects Retry-After; 401 → no retry; budget exceeded → stop
- Regression: `tests/__baseline__/verify-no-regression.mjs`