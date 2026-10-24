# Implementation Plan 190 — Oracle Router Properties & Analysis — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #oracle #properties #ceiling #analysis #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (oracle gap analysis from plan 98; cascade vs oracle from plan 183 (`src/lib/oracle/`); zero router baseline from plan 166 (`src/lib/baseline/`); eval harness from plan 7).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — properties; simulation; improvement.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-190-oracle-properties-analysis.md`, `../research/9router/impl-plan-98-oracle-gap-analysis.md`, `../research/9router/impl-plan-183-cascade-vs-oracle-gap.md`.

## Scope

**In scope:** oracle properties (definitions, analysis, limitations); oracle simulation (method, scope, metrics); oracle-guided improvement (gap analysis, priorities, tracking).
**Out of scope:** oracle gap analysis (plan 183); zero router baseline (plan 166).

## Milestones

### M1 — Oracle properties

**Reference code (`src/lib/oracle/properties.js`):**

```js
// Property definitions: perfect knowledge, post-hoc, cost-aware.
export const ORACLE_PROPERTIES = [
  { name: "perfect-knowledge", description: "knows which model produces the best answer" },
  { name: "post-hoc", description: "selects after seeing all outputs" },
  { name: "cost-aware", description: "can trade quality for cost" },
];

// Property analysis: oracle behavior analysis.
export function analyzeProperties({ results = [] } = {}) {
  return ORACLE_PROPERTIES.map((p) => ({
    ...p,
    // How often the oracle's choice differs from the router's.
    applicable: results.length ? results.filter((r) => r.oracleModel !== r.model).length / results.length : 0,
  }));
}

// Property limitations: oracle unrealistic assumptions.
export function propertyLimitations() {
  return [
    { property: "perfect-knowledge", limitation: "unavailable in practice", impact: "gap is a ceiling, not a target" },
    { property: "post-hoc", limitation: "requires running all models", impact: "expensive to simulate" },
    { property: "cost-aware", limitation: "needs cost model", impact: "depends on pricing accuracy" },
  ];
}
```

**Acceptance criteria:** definitions; analysis; limitations.

### M2 — Oracle simulation

**Reference code (`src/lib/oracle/simulate.js`):**

```js
// Simulation method: post-hoc best selection.
export function simulateOracle({ results = [] } = {}) {
  return results.map((r) => {
    const best = r.candidates?.reduce((a, b) => (b.quality > a.quality ? b : a), r.candidates?.[0]);
    return { ...r, oracleModel: best?.model ?? null, oracleQuality: best?.quality ?? r.quality ?? 0, oracleCost: best?.cost ?? r.cost ?? 0 };
  });
}

// Simulation scope: per-query, per-distribution.
export function simulateByDistribution({ results = [], distributions = [] } = {}) {
  return distributions.map((d) => {
    const subset = results.filter((r) => d.queries.includes(r.queryId));
    return { distribution: d.id, oracle: simulateOracle({ results: subset }) };
  });
}

// Simulation metrics: oracle cost, quality, latency.
export function oracleMetrics({ simulated = [] } = {}) {
  return {
    cost: simulated.reduce((s, r) => s + (r.oracleCost ?? 0), 0) / (simulated.length || 1),
    quality: simulated.reduce((s, r) => s + (r.oracleQuality ?? 0), 0) / (simulated.length || 1),
    latency: simulated.reduce((s, r) => s + (r.latency ?? 0), 0) / (simulated.length || 1),
  };
}
```

**Acceptance criteria:** simulation; scope; metrics.

### M3 — Oracle-guided improvement

**Reference code (`src/lib/oracle/improve.js`):**

```js
// Gap analysis: where routing falls short.
export function gapAnalysis({ results = [], simulated = [] } = {}) {
  const wrong = results.filter((r, i) => r.model !== simulated[i]?.oracleModel).length;
  return { selectionErrorRate: results.length ? wrong / results.length : 0, wrong };
}

// Improvement priorities: highest-impact fixes.
export function improvementPriorities({ analysis = {} } = {}) {
  return [
    { fix: "improve model selection", impact: analysis.selectionErrorRate ?? 0 },
    { fix: "improve quality prediction", impact: (analysis.selectionErrorRate ?? 0) / 2 },
    { fix: "improve cost model", impact: 0.1 },
  ].sort((a, b) => b.impact - a.impact);
}

// Improvement tracking: progress toward oracle.
export function makeOracleProgress() {
  const history = [];
  return {
    record(sample) { history.push(sample); },
    // Progress: gap reduction.
    progress() {
      if (history.length < 2) return 0;
      return history[0].gap - history[history.length - 1].gap;
    },
    history() { return history; },
  };
}
```

**Acceptance criteria:** gap; priorities; tracking.

### M4 — Integration + tests

**Reference code (`src/lib/oracle/integrate-properties.js`):**

```js
// Eval harness integration: oracle analysis.
export function oracleAnalysis({ results = [] } = {}) {
  const simulated = simulateOracle({ results });
  return { properties: analyzeProperties({ results: simulated }), metrics: oracleMetrics({ simulated }) };
}

// Fail-open.
export function safeOracleAnalysis(fn, fallback = null) {
  try { return fn(); } catch { return fallback; }
}
```

**Files touched:** `src/lib/oracle/properties.js` (new), `src/lib/oracle/simulate.js` (new), `src/lib/oracle/improve.js` (new), `src/lib/oracle/integrate-properties.js` (new), `open-sse/services/eval-harness.js` (integration), dashboard oracle page (new), `tests/unit/oracle.test.js` (new).

**Acceptance criteria:** integration; fail-open; tests.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Oracle unrealistic | Misleading ceiling | Clear documentation |
| Simulation cost | Expensive runs | Sampling |
| Gap noise | Wrong priorities | Smoothing |
| Complexity | Confusion | Simple analysis |

## Verification

- Unit: analyzeProperties, propertyLimitations, simulateOracle, simulateByDistribution, oracleMetrics, gapAnalysis, improvementPriorities, makeOracleProgress, oracleAnalysis
- Manual: simulate oracle → analyze → prioritize fixes
- Regression: `tests/__baseline__/verify-no-regression.mjs`