# Implementation Plan 152 — Cascade Collapse Prevention & Recovery — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #collapse #circuit-breaker #cascades #recovery #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (cascade fallback from plan 2 (`open-sse/handlers/chatCore.js` fallback loop); error hardening from plan 9 (circuit breakers); escalation depth from plan 137 (`src/lib/cascade/`); failover state machine from plan 123 (`src/lib/failover/`)).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — collapse detection; circuit breaker; recovery.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-152-cascade-collapse-prevention.md`, `../research/9router/impl-plan-2-cascade-fallback.md`, `../research/9router/impl-plan-9-error-hardening.md`.

## Scope

**In scope:** collapse detection (consecutive failures, error patterns, severity); prevention (circuit breaker, failure budget, policies); recovery (degraded mode, logging, alerts); integration.
**Out of scope:** failover state machine internals (plan 123); escalation depth (plan 137).

## Milestones

### M1 — Collapse detection

**Reference code (`src/lib/collapse/detect.js`):**

```js
// Collapse detection: consecutive failures + error patterns.
export function detectCollapse({ failures = [], window = 5, threshold = 3 } = {}) {
  const recent = failures.slice(-window);
  const consecutive = recent.filter((f) => f).length;
  return {
    collapsing: consecutive >= threshold,
    severity: consecutive >= threshold ? (consecutive >= window ? "total" : "partial") : "none",
    consecutive,
  };
}

// Error patterns: specific error types signal collapse.
export const COLLAPSE_PATTERNS = [/rate.?limit/i, /auth/i, /quota/i, /overload/i, /5\d\d/i];

export function patternHits(errors = []) {
  return errors.filter((e) => COLLAPSE_PATTERNS.some((re) => re.test(e?.message ?? ""))).length;
}

// Combined: failures + patterns.
export function collapseScore({ failures = [], errors = [], window = 5 } = {}) {
  const recent = failures.slice(-window);
  const failCount = recent.filter(Boolean).length;
  const pat = patternHits(errors.slice(-window));
  return { score: failCount + pat, collapsing: failCount + pat >= window, failCount, pat };
}
```

**Acceptance criteria:** detection; patterns; score.

### M2 — Collapse prevention

**Reference code (`src/lib/collapse/prevent.js`):**

```js
// Circuit breaker: stop after N failures.
export function makeCircuitBreaker({ maxFailures = 3, cooldownMs = 30_000 } = {}) {
  let failures = 0;
  let openedAt = null;
  return {
    record(success) {
      if (success) { failures = 0; openedAt = null; }
      else {
        failures++;
        if (failures >= maxFailures) openedAt = Date.now();
      }
    },
    isOpen(now = Date.now()) {
      if (!openedAt) return false;
      if (now - openedAt >= cooldownMs) { openedAt = null; failures = 0; return false; } // half-open reset
      return true;
    },
    failures() { return failures; },
  };
}

// Failure budget: per-cascade budget.
export function makeFailureBudget({ budget = 5, windowMs = 60_000 } = {}) {
  const events = [];
  return {
    spend(now = Date.now()) {
      events.push(now);
      while (events.length && now - events[0] > windowMs) events.shift();
      return events.length >= budget;
    },
    remaining(now = Date.now()) {
      while (events.length && now - events[0] > windowMs) events.shift();
      return Math.max(0, budget - events.length);
    },
  };
}

// Prevention policies: per-provider.
export function policyFor({ provider, policies = {} } = {}) {
  return policies[provider] ?? { maxFailures: 3, cooldownMs: 30_000 };
}
```

**Acceptance criteria:** breaker; budget; policies.

### M3 — Collapse recovery

**Reference code (`src/lib/collapse/recover.js`):**

```js
// Recovery: fallback to degraded mode.
export function recoveryPlan({ severity = "partial", degraded = null } = {}) {
  if (severity === "none") return { action: "continue", degraded: null };
  return { action: "degrade", degraded, reason: `collapse:${severity}` };
}

// Recovery logging: collapse traces.
export function makeCollapseLog() {
  const entries = [];
  return {
    log(e) { entries.push({ ...e, at: Date.now() }); },
    traces() { return entries; },
    report() {
      return {
        total: entries.length,
        bySeverity: entries.reduce((acc, e) => { acc[e.severity] = (acc[e.severity] ?? 0) + 1; return acc; }, {}),
      };
    },
  };
}

// Alerts: notify on collapse.
export function alertCheck({ severity = "none", threshold = "partial", throttled = false } = {}) {
  const order = { none: 0, partial: 1, total: 2 };
  return { alert: order[severity] >= order[threshold] && !throttled, severity };
}
```

**Acceptance criteria:** recovery plan; logging; alerts.

### M4 — Integration + tests

**Reference code (`src/lib/collapse/integrate.js`):**

```js
// Cascade integration: collapse handling in the fallback loop.
export function cascadeGuard({ breaker, budget, failures = [], errors = [], degraded = null } = {}) {
  const { score, collapsing, failCount, pat } = collapseScore({ failures, errors });
  const severity = collapsing ? (failCount >= 5 ? "total" : "partial") : "none";
  if (breaker.isOpen() || budget.remaining() === 0 || severity !== "none") {
    return { stop: true, severity, action: "degrade", degraded, score };
  }
  return { stop: false, severity, action: "continue", score };
}

// Fail-open.
export function safeCollapse(fn, fallback = null) {
  try { return fn(); } catch { return fallback; }
}
```

**Files touched:** `src/lib/collapse/` (new: detect, prevent, recover, integrate), `open-sse/handlers/chatCore.js` (cascade integration), dashboard collapse page (new), `tests/unit/collapse.test.js` (new).

**Acceptance criteria:** integration; fail-open; tests.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| False positives | Premature stop | Signal tuning |
| Missed collapses | Wasted cost | Multiple signals |
| Recovery failure | No fallback | Degraded mode |
| Alert fatigue | Ignored alerts | Thresholds |

## Verification

- Unit: detectCollapse, collapseScore, makeCircuitBreaker, makeFailureBudget, recoveryPlan, makeCollapseLog, alertCheck, cascadeGuard
- Manual: 3 failures → breaker opens → degraded mode
- Regression: `tests/__baseline__/verify-no-regression.mjs`