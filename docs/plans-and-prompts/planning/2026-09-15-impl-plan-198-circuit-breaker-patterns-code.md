# Implementation Plan 198 — Circuit Breaker Patterns & Tuning — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #circuit-breakers #resilience #patterns #tuning #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (error hardening from plan 9; cascade collapse prevention from plan 152 (`src/lib/collapse/`); failure detection from plan 186 (`src/lib/failures/`); cooldown tuning from plan 197 (`src/lib/cooldown/`)).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — states; patterns; tuning.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-198-circuit-breaker-patterns.md`, `../research/9router/impl-plan-9-error-hardening.md`, `../research/9router/impl-plan-152-cascade-collapse-prevention.md`.

## Scope

**In scope:** breaker model (states, parameters, scope); breaker patterns (standard, progressive, adaptive); breaker tuning (data, methods, validation).
**Out of scope:** failure detection (plan 186); cooldown tuning (plan 197).

## Milestones

### M1 — Breaker model

**Reference code (`src/lib/breakers/model.js`):**

```js
// Breaker states: closed, open, half-open.
export const BREAKER_STATES = ["closed", "open", "half-open"];

// Breaker parameters: failure threshold, timeout, probe interval.
export const DEFAULT_BREAKER_PARAMS = { failureThreshold: 0.5, timeout: 30_000, probeInterval: 10_000 };

// Breaker: per-provider, per-model, per-account.
export function makeBreaker({ key, params = DEFAULT_BREAKER_PARAMS, now = Date.now } = {}) {
  let state = "closed";
  let failures = 0;
  let requests = 0;
  let openedAt = 0;
  return {
    key,
    state() { return state; },
    // Record outcome.
    record({ ok = true } = {}) {
      requests += 1;
      if (ok) { failures = 0; if (state === "half-open") state = "closed"; return; }
      failures += 1;
      const rate = requests ? failures / requests : 0;
      if (state === "closed" && rate >= params.failureThreshold) { state = "open"; openedAt = now(); }
      if (state === "half-open") state = "open";
    },
    // Should we allow a request?
    allow() {
      if (state === "closed") return true;
      if (state === "open" && now() - openedAt >= params.timeout) { state = "half-open"; return true; }
      return state === "half-open";
    },
    // Probe: half-open probe.
    probe() { return state === "half-open"; },
  };
}

// Breaker registry.
export function makeBreakerRegistry() {
  const breakers = new Map();
  return {
    breaker(key) { if (!breakers.has(key)) breakers.set(key, makeBreaker({ key })); return breakers.get(key); },
    all() { return Object.fromEntries(breakers); },
  };
}
```

**Acceptance criteria:** states; parameters; registry.

### M2 — Breaker patterns

**Reference code (`src/lib/breakers/patterns.js`):**

```js
// Standard breaker: threshold-based.
export function standardBreaker({ key, params = DEFAULT_BREAKER_PARAMS } = {}) {
  return makeBreaker({ key, params });
}

// Progressive breaker: escalating thresholds.
export function progressiveBreaker({ key, params = DEFAULT_BREAKER_PARAMS, levels = [0.3, 0.5, 0.7] } = {}) {
  const breaker = makeBreaker({ key, params });
  let level = 0;
  return {
    ...breaker,
    // Escalate threshold after repeated trips.
    record(outcome) {
      breaker.record(outcome);
      if (breaker.state() === "open") level = Math.min(levels.length - 1, level + 1);
      return { level, threshold: levels[level] };
    },
  };
}

// Adaptive breaker: auto-adjusting parameters.
export function adaptiveBreaker({ key, params = DEFAULT_BREAKER_PARAMS, min = 10_000, max = 120_000 } = {}) {
  const breaker = makeBreaker({ key, params });
  let timeout = params.timeout;
  return {
    ...breaker,
    // Lengthen timeout after trips, shorten after recovery.
    record(outcome) {
      breaker.record(outcome);
      if (breaker.state() === "open") timeout = Math.min(max, timeout * 1.5);
      if (breaker.state() === "closed") timeout = Math.max(min, timeout * 0.8);
      return { timeout };
    },
  };
}
```

**Acceptance criteria:** standard; progressive; adaptive.

### M3 — Breaker tuning

**Reference code (`src/lib/breakers/tune.js`):**

```js
// Tuning data: breaker effectiveness.
export function makeBreakerTuningData() {
  const examples = []; // {params, effectiveness}
  return {
    add(example) { examples.push(example); },
    all() { return examples; },
  };
}

// Tuning methods: parameter optimization.
export function tuneBreaker({ data = [], param = "failureThreshold", range = [0.2, 0.8], steps = 7, metric = (v, d) => d.filter((x) => x.params[param] === v && x.effectiveness > 0.5).length / (d.length || 1) } = {}) {
  let best = { value: range[0], score: -Infinity };
  for (let i = 0; i <= steps; i++) {
    const v = range[0] + ((range[1] - range[0]) * i) / steps;
    const score = metric(v, data);
    if (score > best.score) best = { value: v, score };
  }
  return best;
}

// Tuning validation: holdout validation.
export function validateBreakerTuning({ data = [], tuned = {} } = {}) {
  const score = data.filter((x) => x.params.failureThreshold === tuned.value && x.effectiveness > 0.5).length / (data.length || 1);
  return { score, ok: score >= 0.5 };
}
```

**Acceptance criteria:** data; tuning; validation.

### M4 — Integration + tests

**Reference code (`src/lib/breakers/integrate.js`):**

```js
// Routing integration: breaker hooks.
export function breakerFor({ registry, key } = {}) {
  return registry.breaker(key);
}

// Fail-open.
export function safeBreaker(fn, fallback = null) {
  try { return fn(); } catch { return fallback; }
}
```

**Files touched:** `src/lib/breakers/` (new: model, patterns, tune, integrate), `open-sse/handlers/chatCore.js` (breaker hooks), dashboard breakers page (new), `tests/unit/breakers.test.js` (new).

**Acceptance criteria:** integration; fail-open; tests.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Premature opening | Lost capacity | Threshold tuning |
| Missed failures | Cascading | Multiple signals |
| Flapping | Unstable routing | Half-open probes |
| Complexity | Confusion | Simple patterns |

## Verification

- Unit: makeBreaker, makeBreakerRegistry, standardBreaker, progressiveBreaker, adaptiveBreaker, makeBreakerTuningData, tuneBreaker, validateBreakerTuning, breakerFor
- Manual: failures → open → probe → recover
- Regression: `tests/__baseline__/verify-no-regression.mjs`