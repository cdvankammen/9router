# Implementation Plan 189 — Zero Router Limitations Analysis — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #baseline #limitations #evaluation #context #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (zero router baseline from plan 166 (`src/lib/baseline/`); cascade vs zero from plan 182 (`src/lib/comparison/`); oracle gap from plan 183 (`src/lib/oracle/`); eval harness from plan 7).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — limitations; baselines; context.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-189-zero-router-limitations.md`, `../research/9router/impl-plan-166-zero-router-baseline.md`, `../research/9router/impl-plan-182-cascade-vs-zero-comparison.md`.

## Scope

**In scope:** limitation model (types, quantification, context); adjusted baselines (cost/latency/availability-constrained); comparison context (documentation, reports, alerts).
**Out of scope:** zero router construction (plan 166); oracle gap (plan 183).

## Milestones

### M1 — Limitation model

**Reference code (`src/lib/baseline/limitations.js`):**

```js
// Limitation types: cost, latency, availability, quality.
export const LIMITATION_TYPES = ["cost", "latency", "availability", "quality"];

// Limitation quantification: measure each limitation.
export function quantifyLimitations({ zero = {}, cascade = {} } = {}) {
  return LIMITATION_TYPES.map((t) => ({
    type: t,
    zero: zero[t] ?? 0,
    cascade: cascade[t] ?? 0,
    // How much worse the zero router is.
    penalty: Math.max(0, (zero[t] ?? 0) - (cascade[t] ?? 0)),
  }));
}

// Limitation context: when limitations matter.
export function limitationContext({ penalty = {}, thresholds = { cost: 0.5, latency: 0.5, availability: 0.3 } } = {}) {
  return LIMITATION_TYPES.filter((t) => (penalty[t] ?? 0) >= (thresholds[t] ?? Infinity)).map((t) => ({ type: t, matters: true }));
}
```

**Acceptance criteria:** types; quantification; context.

### M2 — Adjusted baselines

**Reference code (`src/lib/baseline/adjusted.js`):**

```js
// Cost-adjusted: baseline with cost constraints.
export function costAdjusted({ bestByTask = {}, maxCost = 1 } = {}) {
  return {
    pick(task = "general") {
      const best = bestByTask[task] ?? bestByTask.general ?? null;
      return best && (best.cost ?? 0) <= maxCost ? best : null;
    },
  };
}

// Latency-adjusted: baseline with latency constraints.
export function latencyAdjusted({ bestByTask = {}, maxLatency = 5000 } = {}) {
  return {
    pick(task = "general") {
      const best = bestByTask[task] ?? bestByTask.general ?? null;
      return best && (best.latency ?? 0) <= maxLatency ? best : null;
    },
  };
}

// Availability-adjusted: baseline with availability constraints.
export function availabilityAdjusted({ bestByTask = {}, minAvailability = 0.95 } = {}) {
  return {
    pick(task = "general") {
      const best = bestByTask[task] ?? bestByTask.general ?? null;
      return best && (best.availability ?? 1) >= minAvailability ? best : null;
    },
  };
}
```

**Acceptance criteria:** cost/latency/availability baselines.

### M3 — Comparison context

**Reference code (`src/lib/baseline/context.js`):**

```js
// Context documentation: when to use which baseline.
export function baselineGuide() {
  return [
    { baseline: "zero", useWhen: "quality is the only concern", caveats: ["expensive", "slow", "single point of failure"] },
    { baseline: "cost-adjusted", useWhen: "budget-constrained", caveats: ["may drop quality"] },
    { baseline: "latency-adjusted", useWhen: "latency-sensitive", caveats: ["may drop quality"] },
    { baseline: "availability-adjusted", useWhen: "reliability-critical", caveats: ["may drop quality"] },
  ];
}

// Context reports: baseline comparison with context.
export function contextReport({ comparison = [], context = {} } = {}) {
  return { comparison, context, guide: baselineGuide() };
}

// Context alerts: alert on misleading comparisons.
export function contextAlert({ penalty = {}, thresholds = { cost: 0.8, latency: 0.8 } } = {}) {
  const misleading = LIMITATION_TYPES.filter((t) => (penalty[t] ?? 0) >= (thresholds[t] ?? Infinity));
  return { alert: misleading.length > 0, misleading };
}
```

**Acceptance criteria:** guide; reports; alerts.

### M4 — Integration + tests

**Reference code (`src/lib/baseline/integrate-limitations.js`):**

```js
// Eval harness integration: context-aware comparisons.
export function contextualComparison({ zero = {}, cascade = {}, context = {} } = {}) {
  const limitations = quantifyLimitations({ zero, cascade });
  return { limitations, context: limitationContext({ penalty: Object.fromEntries(limitations.map((l) => [l.type, l.penalty])) }), alert: contextAlert({ penalty: Object.fromEntries(limitations.map((l) => [l.type, l.penalty])) }) };
}

// Fail-open.
export function safeLimitations(fn, fallback = null) {
  try { return fn(); } catch { return fallback; }
}
```

**Files touched:** `src/lib/baseline/limitations.js` (new), `src/lib/baseline/adjusted.js` (new), `src/lib/baseline/context.js` (new), `src/lib/baseline/integrate-limitations.js` (new), `open-sse/services/eval-harness.js` (integration), dashboard limitations page (new), `tests/unit/limitations.test.js` (new).

**Acceptance criteria:** integration; fail-open; tests.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Complexity | Confusion | Simple limitations |
| Misuse | Unfair comparisons | Clear documentation |
| Baseline drift | Stale baselines | Maintenance |
| Overhead | Slow evals | Sampling |

## Verification

- Unit: quantifyLimitations, limitationContext, costAdjusted, latencyAdjusted, availabilityAdjusted, baselineGuide, contextReport, contextAlert, contextualComparison
- Manual: zero vs cascade → limitations → context
- Regression: `tests/__baseline__/verify-no-regression.mjs`