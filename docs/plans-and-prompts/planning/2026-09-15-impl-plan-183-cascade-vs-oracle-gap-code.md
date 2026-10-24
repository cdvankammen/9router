# Implementation Plan 183 — Cascade vs Oracle Router Gap Analysis — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #oracle #gap-analysis #ceiling #improvement #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (oracle gap analysis from plan 98; zero router baseline from plan 166 (`src/lib/baseline/`); cascade vs zero from plan 182 (`src/lib/comparison/`); eval harness from plan 7).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — oracle; gap; opportunities.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-183-cascade-vs-oracle-gap.md`, `../research/9router/impl-plan-98-oracle-gap-analysis.md`, `../research/9router/impl-plan-166-zero-router-baseline.md`.

## Scope

**In scope:** oracle router (definition, simulation, metrics); gap analysis (metrics, decomposition, trends); improvement opportunities (sources, ranking, tracking).
**Out of scope:** cascade vs zero comparison (plan 182); statistical power (plan 149).

## Milestones

### M1 — Oracle router

**Reference code (`src/lib/oracle/oracle.js`):**

```js
// Oracle definition: perfect model selection.
export function makeOracle({ results = [] } = {}) {
  return {
    // Simulate: post-hoc best selection per query.
    simulate() {
      return results.map((r) => {
        const best = r.candidates?.reduce((a, b) => (b.quality > a.quality ? b : a), r.candidates?.[0]);
        return { ...r, oracleModel: best?.model ?? null, oracleQuality: best?.quality ?? r.quality ?? 0, oracleCost: best?.cost ?? r.cost ?? 0 };
      });
    },
    // Oracle metrics: ideal cost, quality, latency.
    metrics() {
      const sim = this.simulate();
      return {
        cost: sim.reduce((s, r) => s + r.oracleCost, 0) / (sim.length || 1),
        quality: sim.reduce((s, r) => s + r.oracleQuality, 0) / (sim.length || 1),
        latency: sim.reduce((s, r) => s + (r.latency ?? 0), 0) / (sim.length || 1),
      };
    },
  };
}
```

**Acceptance criteria:** simulation; metrics.

### M2 — Gap analysis

**Reference code (`src/lib/oracle/gap.js`):**

```js
// Gap metrics: cost gap, quality gap, latency gap.
export function gapMetrics({ actual = {}, oracle = {} } = {}) {
  return {
    costGap: Math.max(0, actual.cost - oracle.cost),
    qualityGap: Math.max(0, oracle.quality - actual.quality),
    latencyGap: Math.max(0, actual.latency - oracle.latency),
  };
}

// Gap decomposition: where the gap comes from.
export function decomposeGap({ results = [], oracleResults = [] } = {}) {
  const wrong = results.filter((r, i) => r.model !== oracleResults[i]?.oracleModel).length;
  return {
    selectionErrors: wrong,
    selectionRate: results.length ? wrong / results.length : 0,
    // Remaining gap is model error (even oracle can't fix).
    modelError: results.length ? 1 - wrong / results.length : 0,
  };
}

// Gap trends: gap over time.
export function gapTrend({ samples = [] } = {}) {
  // samples: [{at, gap}]
  return samples.map((s) => ({ at: s.at, gap: s.gap })).sort((a, b) => a.at - b.at);
}
```

**Acceptance criteria:** metrics; decomposition; trends.

### M3 — Improvement opportunities

**Reference code (`src/lib/oracle/opportunities.js`):**

```js
// Gap sources: classification errors, model errors.
export function gapSources({ decomposition = {} } = {}) {
  return [
    { source: "selection", share: decomposition.selectionRate ?? 0, fix: "improve router" },
    { source: "model", share: decomposition.modelError ?? 0, fix: "improve models" },
  ];
}

// Improvement ranking: highest-impact fixes.
export function rankOpportunities({ sources = [] } = {}) {
  return [...sources].sort((a, b) => b.share - a.share);
}

// Improvement tracking: gap reduction over time.
export function makeGapTracker() {
  const history = [];
  return {
    record(sample) { history.push(sample); },
    // Reduction: latest vs first.
    reduction() {
      if (history.length < 2) return 0;
      return history[0].gap - history[history.length - 1].gap;
    },
    history() { return history; },
  };
}
```

**Acceptance criteria:** sources; ranking; tracking.

### M4 — Integration + tests

**Reference code (`src/lib/oracle/integrate.js`):**

```js
// Eval harness integration: oracle comparisons.
export function oracleReport({ actual = {}, oracle = {} } = {}) {
  return { metrics: gapMetrics({ actual, oracle }), decomposition: decomposeGap({}) };
}

// Fail-open.
export function safeOracle(fn, fallback = null) {
  try { return fn(); } catch { return fallback; }
}
```

**Files touched:** `src/lib/oracle/` (new: oracle, gap, opportunities, integrate), `open-sse/services/eval-harness.js` (integration), dashboard gap page (new), `tests/unit/oracle.test.js` (new).

**Acceptance criteria:** integration; fail-open; tests.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Oracle unrealistic | Misleading ceiling | Clear documentation |
| Gap noise | Wrong conclusions | Smoothing |
| Opportunity noise | Wrong priorities | Ranking validation |
| Cost of oracle | Expensive runs | Sampling |

## Verification

- Unit: makeOracle, gapMetrics, decomposeGap, gapTrend, gapSources, rankOpportunities, makeGapTracker, oracleReport
- Manual: simulate oracle → measure gap → rank fixes
- Regression: `tests/__baseline__/verify-no-regression.mjs`