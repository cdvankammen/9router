# Implementation Plan 182 — Cascade vs Zero Router Comparison — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #comparison #baseline #cascade #evaluation #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (zero router baseline from plan 166 (`src/lib/baseline/`); eval harness from plan 7; oracle gap from plan 98; statistical power from plan 149 (`src/lib/stats/`)).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — framework; baseline; reports.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-182-cascade-vs-zero-comparison.md`, `../research/9router/impl-plan-166-zero-router-baseline.md`, `../research/9router/impl-plan-7-eval-harness.md`.

## Scope

**In scope:** comparison framework (metrics, scenarios, modes); zero router baseline (always-best, config, metrics); comparison reports (summary, detailed, per-task).
**Out of scope:** oracle gap analysis (plan 183); statistical power (plan 149).

## Milestones

### M1 — Comparison framework

**Reference code (`src/lib/comparison/framework.js`):**

```js
// Comparison metrics: cost, quality, latency, reliability.
export const COMPARISON_METRICS = ["cost", "quality", "latency", "reliability"];

// Test scenarios: diverse query sets.
export function makeScenarios() {
  const scenarios = []; // {id, queries: []}
  return {
    add(scenario) { scenarios.push(scenario); },
    all() { return scenarios; },
  };
}

// Comparison modes: head-to-head, A/B.
export function compare({ cascade = [], zero = [], metrics = COMPARISON_METRICS } = {}) {
  return metrics.map((m) => ({
    metric: m,
    cascade: cascade.reduce((s, r) => s + (r[m] ?? 0), 0) / (cascade.length || 1),
    zero: zero.reduce((s, r) => s + (r[m] ?? 0), 0) / (zero.length || 1),
    delta: (zero.reduce((s, r) => s + (r[m] ?? 0), 0) / (zero.length || 1)) - (cascade.reduce((s, r) => s + (r[m] ?? 0), 0) / (cascade.length || 1)),
  }));
}
```

**Acceptance criteria:** metrics; scenarios; compare.

### M2 — Zero router baseline

**Reference code (`src/lib/comparison/baseline.js`):**

```js
// Zero router: always best model.
export function makeZeroRouter({ bestByTask = {} } = {}) {
  return {
    // pick: always the best model for the task.
    pick(task = "general") { return bestByTask[task] ?? bestByTask.general ?? null; },
    // Config: per-task best model.
    config() { return bestByTask; },
  };
}

// Baseline metrics: measurements.
export function baselineMetrics({ results = [] } = {}) {
  return {
    cost: results.reduce((s, r) => s + (r.cost ?? 0), 0) / (results.length || 1),
    quality: results.reduce((s, r) => s + (r.quality ?? 0), 0) / (results.length || 1),
    latency: results.reduce((s, r) => s + (r.latency ?? 0), 0) / (results.length || 1),
    reliability: results.reduce((s, r) => s + (r.reliability ?? 1), 0) / (results.length || 1),
  };
}
```

**Acceptance criteria:** zero router; metrics.

### M3 — Comparison reports

**Reference code (`src/lib/comparison/reports.js`):**

```js
// Report types: summary, detailed, per-task.
export function summaryReport({ comparison = [] } = {}) {
  return comparison.map((c) => ({ metric: c.metric, delta: c.delta, better: c.delta > 0 ? "zero" : "cascade" }));
}

export function detailedReport({ comparison = [], scenarios = [] } = {}) {
  return { comparison, scenarios: scenarios.map((s) => ({ id: s.id, count: s.queries.length })) };
}

export function perTaskReport({ results = [], tasks = [] } = {}) {
  return tasks.map((t) => {
    const r = results.filter((x) => x.task === t);
    return { task: t, count: r.length, cost: r.reduce((s, x) => s + (x.cost ?? 0), 0) / (r.length || 1), quality: r.reduce((s, x) => s + (x.quality ?? 0), 0) / (r.length || 1) };
  });
}

// Visualization: chart data.
export function chartData({ comparison = [] } = {}) {
  return comparison.map((c) => ({ label: c.metric, cascade: c.cascade, zero: c.zero }));
}
```

**Acceptance criteria:** reports; charts.

### M4 — Integration + tests

**Reference code (`src/lib/comparison/integrate.js`):**

```js
// Eval harness integration: comparison runs.
export function runComparison({ cascade, zero, scenarios } = {}) {
  const results = scenarios.flatMap((s) => s.queries.map((q) => ({ scenario: s.id, ...q })));
  return { comparison: compare({ cascade, zero }), results };
}

// Fail-open.
export function safeComparison(fn, fallback = null) {
  try { return fn(); } catch { return fallback; }
}
```

**Files touched:** `src/lib/comparison/` (new: framework, baseline, reports, integrate), `open-sse/services/eval-harness.js` (integration), dashboard comparison page (new), `tests/unit/comparison.test.js` (new).

**Acceptance criteria:** integration; fail-open; tests.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Unfair comparison | Wrong conclusions | Standardized tests |
| Baseline drift | Stale baseline | Baseline maintenance |
| Report complexity | Confusion | Simple reports |
| Cost of baseline | Expensive runs | Sampling |

## Verification

- Unit: makeScenarios, compare, makeZeroRouter, baselineMetrics, summaryReport, detailedReport, perTaskReport, chartData, runComparison
- Manual: cascade vs zero → report → visualize
- Regression: `tests/__baseline__/verify-no-regression.mjs`