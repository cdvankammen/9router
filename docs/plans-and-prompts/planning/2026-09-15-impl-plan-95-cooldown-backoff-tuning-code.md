# Implementation Plan 95 — Cooldown & Backoff Strategy Tuning — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #backoff #cooldown #circuit-breaker #retry #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (retry engine from plan 89 (`open-sse/errors/retry.js`); error taxonomy from plan 89; failover in `src/sse/handlers/chat.js`; health signals from plan 94 (`src/lib/health/`)).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — compute backoff delays; trip a breaker; confirm half-open recovery.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-95-cooldown-backoff-tuning.md`, `../research/9router/impl-plan-89-error-classification-retry.md`, `../research/9router/impl-plan-57-retry-semantics.md`.

## Scope

**In scope:** backoff strategies (fixed, linear, exponential, exponential_jitter, full_jitter; per-error-type strategy; max delay cap); cooldown management (N-failures trigger, per-provider period, half-open decay, admin override); circuit breaker (closed→open→half-open→closed, failure-rate trip, limited probes, success reset); retry + selection integration; dashboard tuning UI.
**Out of scope:** distributed breaker state (plan 70); provider-side rate-limit negotiation.

## Milestones

### M1 — Backoff library

**Reference code (`src/lib/backoff/strategies.js`):**

```js
// Backoff strategies.
export const STRATEGIES = {
  fixed: (base) => base,
  linear: (base, attempt) => base * attempt,
  exponential: (base, attempt) => base * 2 ** attempt,
  exponential_jitter: (base, attempt, jitter = 0.3) => base * 2 ** attempt + Math.random() * jitter * base * 2 ** attempt,
  full_jitter: (base, attempt) => Math.random() * base * 2 ** attempt,
};

export function backoffDelay({ strategy = "exponential_jitter", baseMs = 500, attempt = 0, maxMs = 10_000, jitter = 0.3 } = {}) {
  const fn = STRATEGIES[strategy] ?? STRATEGIES.exponential_jitter;
  return Math.min(maxMs, Math.round(fn(baseMs, attempt, jitter)));
}

// Per-error-type strategy mapping.
export const ERROR_STRATEGY = {
  rate_limit: { strategy: "fixed", baseMs: 1000, maxMs: 5000 }, // honor Retry-After instead
  timeout: { strategy: "exponential_jitter", baseMs: 500, maxMs: 10_000 },
  transient: { strategy: "exponential_jitter", baseMs: 300, maxMs: 8000 },
  auth: { strategy: "fixed", baseMs: 2000, maxMs: 2000 }, // rarely retryable
  quota: { strategy: "linear", baseMs: 1000, maxMs: 15_000 },
};

export function delayForErrorType(type, attempt, { retryAfterMs = null } = {}) {
  if (type === "rate_limit" && retryAfterMs != null) return Math.min(retryAfterMs, 5000); // cap Retry-After abuse
  const cfg = ERROR_STRATEGY[type] ?? ERROR_STRATEGY.transient;
  return backoffDelay({ ...cfg, attempt });
}
```

**Acceptance criteria:** all strategies; max cap; per-error-type mapping.

### M2 — Cooldown manager

**Reference code (`src/lib/backoff/cooldown.js`):**

```js
// Cooldown: N failures in window → cooldown period; half-open decay.
export function makeCooldown({ failThreshold = 3, windowMs = 60_000, cooldownMs = 120_000, halfOpenProbes = 1 } = {}) {
  const failures = []; // { at }
  let cooling = false;
  let coolingUntil = 0;
  let probesLeft = 0;
  return {
    recordFailure(now = Date.now()) {
      failures.push({ at: now });
      const cutoff = now - windowMs;
      while (failures.length && failures[0].at < cutoff) failures.shift();
      if (failures.length >= failThreshold && !cooling) {
        cooling = true;
        coolingUntil = now + cooldownMs;
        probesLeft = halfOpenProbes;
      }
    },
    recordSuccess() { failures.length = 0; cooling = false; probesLeft = 0; },
    state(now = Date.now()) {
      if (!cooling) return "normal";
      if (now >= coolingUntil) return probesLeft > 0 ? "half-open" : "normal";
      return "cooling";
    },
    allowProbe(now = Date.now()) {
      if (this.state(now) !== "half-open") return false;
      if (probesLeft <= 0) return false;
      probesLeft -= 1;
      return true;
    },
    override({ cooling: c = false, until = 0 } = {}) { cooling = c; coolingUntil = until; }, // admin override
  };
}
```

**Acceptance criteria:** trigger, decay, half-open probes, override.

### M3 — Circuit breaker

**Reference code (`src/lib/backoff/breaker.js`):**

```js
// Circuit breaker: closed → open → half-open → closed.
export const BREAKER_STATE = { CLOSED: "closed", OPEN: "open", HALF_OPEN: "half-open" };

export function makeBreaker({ failureRateThreshold = 0.5, windowMs = 60_000, minRequests = 5, openMs = 30_000, halfOpenMax = 3 } = {}) {
  const events = []; // { at, ok }
  let state = BREAKER_STATE.CLOSED;
  let openedAt = 0;
  let halfOpenCount = 0;
  return {
    state() { return state; },
    record(ok, now = Date.now()) {
      events.push({ at: now, ok });
      const cutoff = now - windowMs;
      while (events.length && events[0].at < cutoff) events.shift();
      if (state === BREAKER_STATE.HALF_OPEN) {
        if (ok) { halfOpenCount += 1; if (halfOpenCount >= halfOpenMax) { state = BREAKER_STATE.CLOSED; halfOpenCount = 0; events.length = 0; } }
        else { state = BREAKER_STATE.OPEN; openedAt = now; halfOpenCount = 0; }
        return;
      }
      if (state === BREAKER_STATE.CLOSED && events.length >= minRequests) {
        const failures = events.filter((e) => !e.ok).length;
        if (failures / events.length >= failureRateThreshold) { state = BREAKER_STATE.OPEN; openedAt = now; }
      }
    },
    allow(now = Date.now()) {
      if (state === BREAKER_STATE.CLOSED) return true;
      if (state === BREAKER_STATE.OPEN) {
        if (now - openedAt >= openMs) { state = BREAKER_STATE.HALF_OPEN; halfOpenCount = 0; return true; }
        return false;
      }
      return true; // half-open: limited traffic
    },
    reset() { state = BREAKER_STATE.CLOSED; events.length = 0; halfOpenCount = 0; },
  };
}
```

**Acceptance criteria:** trip on failure rate; open window; half-open recovery.

### M4 — Integration + tests

**Reference code (`src/lib/backoff/integrate.js`):**

```js
// Retry integration: backoff delay per attempt.
export function retryDelay({ errorType, attempt, retryAfterMs = null }) {
  return delayForErrorType(errorType, attempt, { retryAfterMs });
}

// Selection integration: cooling providers deprioritized.
export function deprioritize(coolingProviders, candidates) {
  return candidates.sort((a, b) => Number(coolingProviders.has(a)) - Number(coolingProviders.has(b)));
}
```

**Files touched:** `src/lib/backoff/` (new: strategies, cooldown, breaker, integrate), `open-sse/handlers/chatCore.js` (retry integration), `open-sse/config/backoffConfig.js` (new), dashboard backoff page (new), `tests/unit/backoff.test.js` (new).

**Acceptance criteria:** backoff in retry engine; cooling providers deprioritized; telemetry.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Long waits | Slow recovery | Max delay caps |
| Breaker flapping | Unstable traffic | Hysteresis (half-open) |
| Cooldown starvation | Provider unused | Half-open probes |
| Config complexity | Misconfiguration | Presets + defaults |

## Verification

- Unit: backoffDelay, delayForErrorType, makeCooldown, makeBreaker
- Manual: 3 failures → cooldown; breaker opens → half-open probe succeeds → closed
- Regression: `tests/__baseline__/verify-no-regression.mjs`