# Implementation Plan 110 — Cost & Quality Modeling (Measurement + Prediction) — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #cost-model #quality-model #frontier #prediction #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (cost heuristics from plan 87 (`src/lib/cost/`); quality evaluation from plan 67 (`src/lib/eval/`); calibration from plan 82 (`src/lib/calibration/`); cost-quality routing from plan 4 research).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — measure cost; predict cost; compute frontier; confirm frontier routing.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-110-cost-quality-modeling.md`, `../research/9router/impl-plan-87-cost-heuristics-estimation.md`, `../research/9router/impl-plan-67-model-quality-evaluation.md`.

## Scope

**In scope:** cost model (features tokens/pricing/caching/retries, per-request measurement, regression prediction, predicted-vs-actual calibration); quality model (features model/task/difficulty/context/params, measurement from judge/feedback/outcomes, per (model, task-type) prediction, calibration); cost-quality frontier (Pareto computation per task-type, frontier-aware selection under budget/quality constraints, continuous refresh); routing integration + dashboard.
**Out of scope:** training complex ML models (uses simple regression/EWMA); provider billing reconciliation.

## Milestones

### M1 — Cost model

**Reference code (`src/lib/models/cost.js`):**

```js
// Cost measurement: accurate per-request capture.
export function measureCost({ inputTokens = 0, outputTokens = 0, pricing, cachedTokens = 0, retries = 0 } = {}) {
  const inPrice = pricing?.inputPer1M ?? 0;
  const outPrice = pricing?.outputPer1M ?? 0;
  const cachePrice = pricing?.cachedPer1M ?? inPrice * 0.1;
  const base = (inputTokens - cachedTokens) * inPrice / 1e6 + cachedTokens * cachePrice / 1e6 + outputTokens * outPrice / 1e6;
  return { costUsd: base * (retries + 1), inputTokens, outputTokens, cachedTokens };
}

// Cost prediction: regression on features (linear model).
export function makeCostPredictor({ alpha = 0.05 } = {}) {
  const samples = []; // { features, actual }
  return {
    record(features, actual) { samples.push({ features, actual }); if (samples.length > 1000) samples.shift(); },
    predict(features) {
      // Simple: average cost per token ratio from recent samples.
      if (!samples.length) return null;
      const ratios = samples.map((s) => s.actual / Math.max(1, (s.features.inputTokens ?? 0) + (s.features.outputTokens ?? 0)));
      const avg = ratios.reduce((a, b) => a + b, 0) / ratios.length;
      return avg * ((features.inputTokens ?? 0) + (features.outputTokens ?? 0));
    },
    // Calibration: predicted vs. actual.
    mape() {
      if (samples.length < 2) return null;
      const errs = samples.map((s) => {
        const p = this.predict(s.features);
        return p == null ? null : Math.abs(p - s.actual) / Math.max(1e-9, s.actual);
      }).filter((e) => e != null);
      return errs.length ? errs.reduce((a, b) => a + b, 0) / errs.length : null;
    },
  };
}
```

**Acceptance criteria:** measurement; prediction; MAPE calibration.

### M2 — Quality model

**Reference code (`src/lib/models/quality.js`):**

```js
// Quality measurement: judge scores, feedback, outcomes.
export function measureQuality({ judgeScore = null, feedback = null, outcome = null } = {}) {
  const scores = [judgeScore, feedback, outcome].filter((s) => s != null);
  return scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
}

// Quality prediction: per (model, task-type) with EWMA.
export function makeQualityPredictor({ alpha = 0.1 } = {}) {
  const scores = new Map(); // `${model}:${taskType}` -> score
  return {
    record(model, taskType, score) {
      const key = `${model}:${taskType}`;
      const prev = scores.get(key);
      scores.set(key, prev == null ? score : alpha * score + (1 - alpha) * prev);
    },
    predict(model, taskType) { return scores.get(`${model}:${taskType}`) ?? null; },
    // Calibration: predicted vs. actual.
    error(model, taskType, actual) {
      const p = this.predict(model, taskType);
      return p == null ? null : Math.abs(p - actual);
    },
  };
}
```

**Acceptance criteria:** measurement; prediction; calibration.

### M3 — Cost-quality frontier

**Reference code (`src/lib/models/frontier.js`):**

```js
// Pareto frontier of (cost, quality) per task-type.
export function paretoFrontier(points) {
  // points: [{ model, cost, quality }]
  const sorted = [...points].sort((a, b) => a.cost - b.cost);
  const frontier = [];
  let bestQuality = -Infinity;
  for (const p of sorted) {
    if (p.quality > bestQuality) {
      frontier.push(p);
      bestQuality = p.quality;
    }
  }
  return frontier;
}

// Frontier routing: select on frontier given budget/quality constraints.
export function selectOnFrontier({ frontier, maxCost = Infinity, minQuality = 0 } = {}) {
  const eligible = frontier.filter((p) => p.cost <= maxCost && p.quality >= minQuality);
  if (!eligible.length) return null;
  // Default: best quality within budget.
  return eligible.sort((a, b) => b.quality - a.quality)[0];
}

// Continuous refresh: merge new points into frontier.
export function refreshFrontier({ frontier, newPoints }) {
  return paretoFrontier([...(frontier ?? []), ...newPoints]);
}
```

**Acceptance criteria:** Pareto; constrained selection; refresh.

### M4 — Integration + tests

**Reference code (`src/lib/models/integrate.js`):**

```js
// Routing integration: frontier-aware selection.
export function selectModel({ candidates, costOf, qualityOf, maxCost, minQuality } = {}) {
  const points = candidates.map((m) => ({ model: m, cost: costOf(m), quality: qualityOf(m) }));
  const frontier = paretoFrontier(points);
  return selectOnFrontier({ frontier, maxCost, minQuality });
}

// Telemetry: model accuracy metrics.
export function makeModelTelemetry() {
  const stats = { predictions: 0, costErrors: [], qualityErrors: [] };
  return {
    recordCostError(e) { stats.predictions += 1; stats.costErrors.push(e); if (stats.costErrors.length > 500) stats.costErrors.shift(); },
    recordQualityError(e) { stats.qualityErrors.push(e); if (stats.qualityErrors.length > 500) stats.qualityErrors.shift(); },
    report() {
      const avg = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
      return { predictions: stats.predictions, avgCostError: avg(stats.costErrors), avgQualityError: avg(stats.qualityErrors) };
    },
  };
}
```

**Files touched:** `src/lib/models/` (new: cost, quality, frontier, integrate), `src/sse/handlers/chat.js` (frontier integration), `src/lib/db/migrations/20260915-models.js` (new), `src/lib/db/repos/modelRepo.js` (new), dashboard models page (new), `tests/unit/models.test.js` (new).

**Acceptance criteria:** cost/quality measured + predicted; frontier computed; frontier routing.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Model drift | Stale predictions | Recalibration |
| Sparse data | Weak models | Priors |
| Frontier staleness | Suboptimal picks | Refresh schedule |
| Overfitting | Bad generalization | Holdout validation |

## Verification

- Unit: measureCost, makeCostPredictor, makeQualityPredictor, paretoFrontier, selectOnFrontier
- Manual: record outcomes → frontier updates → selection respects budget
- Regression: `tests/__baseline__/verify-no-regression.mjs`