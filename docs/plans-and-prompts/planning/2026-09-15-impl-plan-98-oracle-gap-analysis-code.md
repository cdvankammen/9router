# Implementation Plan 98 — Oracle Gap Analysis & Routing Upper Bounds — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #oracle-gap #upper-bounds #prioritization #analytics #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (calibration from plan 82 (`src/lib/calibration/`); analytics from plan 53 research; quality evaluation from plan 67 (`src/lib/eval/`); learned routing from plan 1 research).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — compute oracle for historical requests; measure gaps; confirm prioritization.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-98-oracle-gap-analysis.md`, `../research/9router/impl-plan-82-router-calibration-confidence.md`, `../research/9router/impl-plan-67-model-quality-evaluation.md`.

## Scope

**In scope:** oracle definition (best model per historical request given hindsight, approximated from quality/cost/latency outcome data); gap computation (quality/cost/latency gaps, aggregation per task-type/route/user, trends); improvement prioritization (high-gap segments, suggested routing changes, impact estimation); analytics + calibration integration; dashboard oracle gap view.
**Out of scope:** live oracle-guided routing (analysis only); collecting new outcome data (uses existing A/B/replay data).

## Milestones

### M1 — Oracle computation

**Reference code (`src/lib/oracle/compute.js`):**

```js
// Oracle: for each historical request, the model that would have produced the best outcome.
// outcomes: [{ requestId, model, quality, cost, latencyMs }]
export function computeOracle(outcomes, { weight = { quality: 0.6, cost: 0.2, latency: 0.2 } } = {}) {
  const byRequest = new Map();
  for (const o of outcomes) {
    const list = byRequest.get(o.requestId) ?? [];
    list.push(o);
    byRequest.set(o.requestId, list);
  }
  const oracle = [];
  for (const [requestId, list] of byRequest) {
    const scored = list.map((o) => ({
      ...o,
      score: weight.quality * (o.quality ?? 0) - weight.cost * (o.cost ?? 0) - weight.latency * ((o.latencyMs ?? 0) / 1000),
    }));
    scored.sort((a, b) => b.score - a.score);
    oracle.push({ requestId, best: scored[0], alternatives: scored.length });
  }
  return oracle;
}

// Oracle approximation when outcome data is sparse: use quality scores + cost + latency.
export function approximateOracle({ qualityScores, cost, latencyMs, weight = { quality: 0.6, cost: 0.2, latency: 0.2 } } = {}) {
  return weight.quality * (qualityScores ?? 0) - weight.cost * (cost ?? 0) - weight.latency * ((latencyMs ?? 0) / 1000);
}
```

**Acceptance criteria:** oracle computed; approximation available.

### M2 — Gap metrics

**Reference code (`src/lib/oracle/gap.js`):**

```js
// Gap: actual vs. oracle per request.
export function gapFor({ actual, oracle }) {
  return {
    qualityGap: Math.max(0, (oracle.quality ?? 0) - (actual.quality ?? 0)),
    costGap: Math.max(0, (actual.cost ?? 0) - (oracle.cost ?? 0)),
    latencyGap: Math.max(0, (actual.latencyMs ?? 0) - (oracle.latencyMs ?? 0)),
    totalGap: Math.max(0, oracle.score - actual.score),
  };
}

// Aggregation per segment (task-type, route, user).
export function aggregateGaps(records, { segmentOf }) {
  const bySegment = new Map();
  for (const r of records) {
    const seg = segmentOf(r);
    const s = bySegment.get(seg) ?? { n: 0, qualityGap: 0, costGap: 0, latencyGap: 0, totalGap: 0 };
    const g = gapFor(r);
    s.n += 1; s.qualityGap += g.qualityGap; s.costGap += g.costGap; s.latencyGap += g.latencyGap; s.totalGap += g.totalGap;
    bySegment.set(seg, s);
  }
  return Object.fromEntries([...bySegment.entries()].map(([seg, s]) => [
    seg,
    { ...s, avgQualityGap: s.n ? s.qualityGap / s.n : 0, avgCostGap: s.n ? s.costGap / s.n : 0, avgTotalGap: s.n ? s.totalGap / s.n : 0 },
  ]));
}

// Trends: gap over time buckets.
export function gapTrend(records, { bucketOf }) {
  const byBucket = new Map();
  for (const r of records) {
    const b = bucketOf(r);
    const s = byBucket.get(b) ?? { n: 0, totalGap: 0 };
    s.n += 1; s.totalGap += gapFor(r).totalGap;
    byBucket.set(b, s);
  }
  return Object.fromEntries([...byBucket.entries()].map(([b, s]) => [b, { n: s.n, avgGap: s.n ? s.totalGap / s.n : 0 }]));
}
```

**Acceptance criteria:** per-request gaps; segment aggregation; trends.

### M3 — Prioritization

**Reference code (`src/lib/oracle/prioritize.js`):**

```js
// High-gap segments → improvement suggestions.
export function prioritize(segmentGaps, { topN = 5, minSample = 10 } = {}) {
  return Object.entries(segmentGaps)
    .filter(([, s]) => s.n >= minSample)
    .sort((a, b) => b[1].avgTotalGap - a[1].avgTotalGap)
    .slice(0, topN)
    .map(([seg, s]) => ({
      segment: seg,
      avgTotalGap: s.avgTotalGap,
      suggestion: `investigate routing for ${seg}: consider higher-quality model or better fallback order`,
    }));
}

// Impact estimation: expected improvement from closing the gap.
export function estimateImpact({ avgTotalGap, requestsPerDay, costPerRequest }) {
  return {
    qualityUnitsPerDay: avgTotalGap * requestsPerDay,
    costSavingsPerDay: avgTotalGap * requestsPerDay * (costPerRequest ?? 0),
  };
}
```

**Acceptance criteria:** top segments; suggestions; impact estimates.

### M4 — Integration + tests

**Reference code (`src/lib/oracle/integrate.js`):**

```js
// Analytics integration: gap in analytics dashboard.
export function oracleSummary(oracle, records) {
  const gaps = records.map((r) => gapFor(r));
  const avg = (f) => (gaps.length ? gaps.reduce((a, g) => a + f(g), 0) / gaps.length : 0);
  return {
    oracleSize: oracle.length,
    avgQualityGap: avg((g) => g.qualityGap),
    avgCostGap: avg((g) => g.costGap),
    avgTotalGap: avg((g) => g.totalGap),
  };
}

// Calibration integration: gap informs calibration targets.
export function calibrationTarget({ avgTotalGap, currentTarget = 0.6 }) {
  return Math.min(0.95, currentTarget + avgTotalGap * 0.5);
}
```

**Files touched:** `src/lib/oracle/` (new: compute, gap, prioritize, integrate), `src/lib/analytics/` (integration), `src/lib/db/migrations/20260915-oracle.js` (new), `src/lib/db/repos/oracleRepo.js` (new), dashboard oracle page (new), `tests/unit/oracle.test.js` (new).

**Acceptance criteria:** oracle computed; gaps measured; prioritization suggestions; gap view.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Oracle data sparsity | Wrong oracle | Approximation methods |
| Misleading gaps | Bad decisions | Confidence intervals |
| Compute cost | Slow analysis | Sampled computation |
| Actionability | No value | Prioritization + suggestions |

## Verification

- Unit: computeOracle, gapFor, aggregateGaps, prioritize, estimateImpact
- Manual: feed historical outcomes → oracle → gap view → suggestions
- Regression: `tests/__baseline__/verify-no-regression.mjs`