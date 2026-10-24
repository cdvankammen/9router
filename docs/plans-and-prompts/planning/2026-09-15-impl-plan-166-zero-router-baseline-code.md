# Implementation Plan 166 — Zero Router Baseline & Comparison — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #baseline #zero-router #comparison #eval #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (eval harness from plan 7 (`tests/` harness); oracle gap from plan 98; benchmark hygiene from plan 91; statistical power from plan 149 (`src/lib/stats/`)).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — zero router; comparison; maintenance.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-166-zero-router-baseline.md`, `../research/9router/impl-plan-7-eval-harness.md`, `../research/9router/impl-plan-98-oracle-gap.md`.

## Scope

**In scope:** zero router (always-best-model baseline, config, metrics); comparison framework (metrics, reports, thresholds); baseline maintenance (updates, validation, docs); integration.
**Out of scope:** oracle router (plan 98); benchmark hygiene (plan 91).

## Milestones

### M1 — Zero router

**Reference code (`src/lib/baseline/zero.js`):**

```js
// Zero router: always route to best model per task.
export function makeZeroRouter({ bestPerTask = {} } = {}) {
  return {
    route({ task = "general", candidates = [] } = {}) {
      const best = bestPerTask[task];
      return candidates.includes(best) ? best : candidates[0] ?? null;
    },
    // Metrics: cost, quality, latency of the baseline.
    metrics({ task = "general", pricing, qualityOf = () => 0.8, latencyOf = () => 5000 } = {}) {
      const model = bestPerTask[task];
      if (!model) return null;
      return { model, cost: pricing.costOf({ modelId: model, inputTokens: 1000, outputTokens: 1000 }), quality: qualityOf(model), latency: latencyOf(model) };
    },
  };
}

// Baseline config: best model per task.
export const DEFAULT_BEST = {
  code: "gpt-4o",
  math: "gpt-4o",
  vision: "gpt-4o",
  general: "gpt-4o-mini",
  chat: "gpt-4o-mini",
};
```

**Acceptance criteria:** router; metrics; config.

### M2 — Comparison framework

**Reference code (`src/lib/baseline/compare.js`):**

```js
// Comparison: strategy vs baseline.
export function compare({ strategy = {}, baseline = {}, metrics = ["cost", "quality", "latency"] } = {}) {
  const report = {};
  for (const m of metrics) {
    const s = strategy[m];
    const b = baseline[m];
    if (s === undefined || b === undefined) continue;
    report[m] = { strategy: s, baseline: b, diff: s - b, pct: b ? ((s - b) / b) * 100 : null };
  }
  return report;
}

// Improvement thresholds: minimum improvement to claim win.
export const IMPROVEMENT_THRESHOLDS = { cost: -0.1, quality: 0.02, latency: -0.1 }; // cost/latency lower is better

export function isImprovement({ report, thresholds = IMPROVEMENT_THRESHOLDS } = {}) {
  return Object.entries(report).every(([m, v]) => {
    const t = thresholds[m];
    if (!t) return true;
    return t < 0 ? v.pct <= t * 100 : v.pct >= t * 100;
  });
}
```

**Acceptance criteria:** comparison; thresholds.

### M3 — Baseline maintenance

**Reference code (`src/lib/baseline/maintain.js`):**

```js
// Baseline updates: best model changes.
export function makeBaselineStore() {
  const history = [];
  return {
    update(bestPerTask) {
      history.push({ bestPerTask, at: Date.now() });
      return bestPerTask;
    },
    current() { return history.at(-1)?.bestPerTask ?? {}; },
    // Validation: sanity check (all models exist in registry).
    validate(registry) {
      const current = this.current();
      const missing = Object.values(current).filter((m) => !registry.has(m));
      return { ok: missing.length === 0, missing };
    },
    history() { return history; },
  };
}
```

**Acceptance criteria:** updates; validation; history.

### M4 — Integration + tests

**Reference code (`src/lib/baseline/integrate.js`):**

```js
// Eval harness integration: baseline comparisons.
export function baselineReport({ strategyResults = [], baselineResults = [] } = {}) {
  return strategyResults.map((s, i) => ({
    strategy: s,
    baseline: baselineResults[i],
    comparison: compare({ strategy: s, baseline: baselineResults[i] }),
  }));
}

// Fail-open.
export function safeBaseline(fn, fallback = null) {
  try { return fn(); } catch { return fallback; }
}
```

**Files touched:** `src/lib/baseline/` (new: zero-router, compare, maintain, integrate), `open-sse/services/eval-harness.js` (integration), dashboard baseline page (new), `tests/unit/baseline.test.js` (new).

**Acceptance criteria:** integration; fail-open; tests.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Baseline drift | Stale baseline | Maintenance |
| Comparison bias | Unfair metrics | Fair metrics |
| Cost of baseline | Expensive eval | Sampling |
| Complexity | Confusion | Simple baseline |

## Verification

- Unit: makeZeroRouter, compare, isImprovement, makeBaselineStore, baselineReport
- Manual: run eval → compare vs zero router
- Regression: `tests/__baseline__/verify-no-regression.mjs`