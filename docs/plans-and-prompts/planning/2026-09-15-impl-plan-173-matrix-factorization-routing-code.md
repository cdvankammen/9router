# Implementation Plan 173 — Matrix Factorization for Routing — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #matrix-factorization #latent-factors #learned-routing #prediction #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (learned routing from plan 1; preference collection from plan 163 (`src/lib/preferences/`); classifier from plan 131 (`src/lib/classifier/`); causal routers from plan 136 (`src/lib/causal/`)).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — factorization; prediction; routing.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-173-matrix-factorization-routing.md`, `../research/9router/impl-plan-1-learned-routing.md`, `../research/9router/impl-plan-163-preference-data-collection.md`.

## Scope

**In scope:** factorization model (preference matrix, latent factors, SVD/ALS); prediction (query-model score, cold start, confidence); routing integration (score-based, hybrid, fallback).
**Out of scope:** Bradley-Terry models (plan 174); win-probability prediction (plan 175).

## Milestones

### M1 — Factorization model

**Reference code (`src/lib/factors/model.js`):**

```js
// Preference matrix: queries × models.
export function makePreferenceMatrix() {
  const rows = new Map(); // queryId -> Map(modelId -> score)
  return {
    set(queryId, modelId, score) {
      const row = rows.get(queryId) ?? new Map();
      row.set(modelId, score);
      rows.set(queryId, row);
    },
    get(queryId, modelId) { return rows.get(queryId)?.get(modelId) ?? null; },
    queries() { return [...rows.keys()]; },
    models() { return [...new Set([...rows.values()].flatMap((r) => [...r.keys()]))]; },
    // Dense matrix for factorization.
    dense() {
      const qs = this.queries();
      const ms = this.models();
      return { queries: qs, models: ms, values: qs.map((q) => ms.map((m) => this.get(q, m) ?? 0)) };
    },
  };
}

// Latent factors: query factors, model factors.
export function makeFactors({ queries = [], models = [], dims = 8, seed = 1 } = {}) {
  const rng = mulberry32(seed);
  const qf = new Map(queries.map((q) => [q, Array.from({ length: dims }, () => rng() * 0.1)]));
  const mf = new Map(models.map((m) => [m, Array.from({ length: dims }, () => rng() * 0.1)]));
  return { queryFactors: qf, modelFactors: mf, dims };
}

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
```

**Acceptance criteria:** matrix; factors.

### M2 — Prediction

**Reference code (`src/lib/factors/predict.js`):**

```js
// Prediction: query-model score = dot(queryFactors, modelFactors).
export function predictScore({ factors, queryId, modelId } = {}) {
  const q = factors.queryFactors.get(queryId);
  const m = factors.modelFactors.get(modelId);
  if (!q || !m) return null;
  return q.reduce((s, v, i) => s + v * m[i], 0);
}

// Cold start: new query → average model factors.
export function coldStart({ factors, queryId = null, modelId } = {}) {
  const m = factors.modelFactors.get(modelId);
  if (!m) return 0;
  if (queryId && factors.queryFactors.has(queryId)) return predictScore({ factors, queryId, modelId });
  // Average query factor (or zero vector).
  const avg = [...factors.queryFactors.values()].reduce((acc, q) => acc.map((v, i) => v + q[i]), Array(factors.dims).fill(0));
  const n = factors.queryFactors.size || 1;
  return avg.reduce((s, v, i) => s + (v / n) * m[i], 0);
}

// Confidence: more data → higher confidence.
export function predictionConfidence({ matrix, queryId, modelId, minObs = 5 } = {}) {
  const obs = matrix.get(queryId, modelId);
  return { confident: obs !== null && obs >= minObs, observations: obs ?? 0 };
}
```

**Acceptance criteria:** score; cold start; confidence.

### M3 — Routing integration

**Reference code (`src/lib/factors/route.js`):**

```js
// Score-based routing: rank models by factor score.
export function rankByScore({ factors, queryId, candidates = [] } = {}) {
  return candidates
    .map((m) => ({ model: m, score: predictScore({ factors, queryId, modelId: m }) ?? coldStart({ factors, queryId, modelId: m }) }))
    .sort((a, b) => b.score - a.score);
}

// Hybrid routing: factors + rules.
export function hybridRoute({ factors, queryId, candidates = [], ruleScore = () => 0, w = 0.5 } = {}) {
  return candidates
    .map((m) => ({ model: m, score: w * (predictScore({ factors, queryId, modelId: m }) ?? 0) + (1 - w) * ruleScore(m) }))
    .sort((a, b) => b.score - a.score);
}

// Fallback: rule fallback when factors are cold.
export function factorFallback({ factors, queryId, candidates = [], cold = true } = {}) {
  return cold ? candidates : rankByScore({ factors, queryId, candidates });
}
```

**Acceptance criteria:** ranking; hybrid; fallback.

### M4 — Integration + tests

**Reference code (`src/lib/factors/integrate.js`):**

```js
// Routing integration: factor predictions.
export function routeWithFactors({ factors, matrix, queryId, candidates = [], cold = !matrix.get(queryId, candidates[0]) } = {}) {
  return factorFallback({ factors, queryId, candidates, cold });
}

// Fail-open.
export function safeFactors(fn, fallback = null) {
  try { return fn(); } catch { return fallback; }
}
```

**Files touched:** `src/lib/factors/` (new: model, predict, route, integrate), `open-sse/handlers/chatCore.js` (integration), dashboard factors page (new), `tests/unit/factors.test.js` (new).

**Acceptance criteria:** integration; fail-open; tests.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Sparse matrix | Weak factors | Regularization |
| Cold start | No predictions | Fallback |
| Factor drift | Stale routing | Retraining |
| Complexity | Confusion | Simple SVD |

## Verification

- Unit: makePreferenceMatrix, makeFactors, predictScore, coldStart, predictionConfidence, rankByScore, hybridRoute, factorFallback, routeWithFactors
- Manual: build matrix → factorize → predict → route
- Regression: `tests/__baseline__/verify-no-regression.mjs`