# Implementation Plan 175 — Win-Probability Prediction for Routing — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #win-probability #expected-value #routing #calibration #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (learned routing from plan 1; matrix factorization from plan 173 (`src/lib/factors/`); Bradley-Terry from plan 174 (`src/lib/preference/`); threshold calibration from plan 171 (`src/lib/calibration/`)).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — prediction; EV routing; calibration.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-175-win-probability-prediction.md`, `../research/9router/impl-plan-173-matrix-factorization-routing.md`, `../research/9router/impl-plan-174-bradley-terry-preference-models.md`.

## Scope

**In scope:** prediction model (win-probability, MF/SW variants, features); expected-value routing (EV = win-prob × quality − cost, ranking, thresholds); calibration (predicted vs actual, drift, updates).
**Out of scope:** matrix factorization internals (plan 173); Bradley-Terry internals (plan 174).

## Milestones

### M1 — Prediction model

**Reference code (`src/lib/winprob/model.js`):**

```js
// Win-probability: P(model wins | query).
export function makeWinProbModel({ predictor = null, variant = "mf" } = {}) {
  return {
    variant,
    // predict: {queryId, modelId} → win probability
    predict({ queryId, modelId } = {}) {
      if (!predictor) return 0.5; // uniform fallback
      return Math.max(0, Math.min(1, predictor({ queryId, modelId })));
    },
  };
}

// MF-based predictor: sigmoid of factor score.
export function mfPredictor({ factors, scale = 1 } = {}) {
  return ({ queryId, modelId }) => {
    const score = factors.queryFactors.get(queryId)?.reduce((s, v, i) => s + v * (factors.modelFactors.get(modelId)?.[i] ?? 0), 0) ?? 0;
    return 1 / (1 + Math.exp(-scale * score));
  };
}

// SW-based predictor: sigmoid of strength difference.
export function swPredictor({ model } = {}) {
  return ({ queryId, modelId }) => model.winProb(modelId, "reference");
}

// Prediction features: query features.
export function predictFeatures({ text = "", domain = "general" } = {}) {
  return { length: text.length, domain, hasCode: /```/.test(text) };
}
```

**Acceptance criteria:** model; MF/SW predictors; features.

### M2 — Expected-value routing

**Reference code (`src/lib/winprob/ev.js`):**

```js
// Expected value: win-prob × quality − cost.
export function expectedValue({ winProb = 0.5, quality = 0.8, cost = 1, lambda = 0.1 } = {}) {
  return winProb * quality - lambda * cost;
}

// Value ranking: rank models by EV.
export function rankByEV({ winprob, candidates = [], qualityOf = () => 0.8, costOf = () => 1, lambda = 0.1 } = {}) {
  return candidates
    .map((m) => ({ model: m, ev: expectedValue({ winProb: winprob.predict({ modelId: m }), quality: qualityOf(m), cost: costOf(m), lambda }) }))
    .sort((a, b) => b.ev - a.ev);
}

// EV thresholds: route above threshold.
export function routeAboveEV({ ranked = [], threshold = 0.3 } = {}) {
  const above = ranked.filter((r) => r.ev >= threshold);
  return above.length ? above : ranked.slice(0, 1); // best effort
}
```

**Acceptance criteria:** EV; ranking; thresholds.

### M3 — Calibration

**Reference code (`src/lib/winprob/calibrate.js`):**

```js
// Calibration: predicted vs actual win rates.
export function calibrateWinProb({ pairs = [], buckets = 10 } = {}) {
  // pairs: [{predicted, won}]
  const map = new Map();
  for (const p of pairs) {
    const key = Math.round(p.predicted * buckets) / buckets;
    const list = map.get(key) ?? [];
    list.push(p.won ? 1 : 0);
    map.set(key, list);
  }
  return {
    calibrated(predicted) {
      const key = Math.round(predicted * buckets) / buckets;
      const list = map.get(key);
      return list?.length ? list.reduce((a, b) => a + b, 0) / list.length : predicted;
    },
    // Brier score: mean squared error.
    brier() {
      let err = 0, n = 0;
      for (const [key, list] of map) {
        const acc = list.reduce((a, b) => a + b, 0) / list.length;
        err += (Number(key) - acc) ** 2 * list.length;
        n += list.length;
      }
      return n ? err / n : 0;
    },
  };
}

// Drift: monitor calibration.
export function makeWinProbMonitor({ window = 200 } = {}) {
  const recent = [];
  return {
    record(pair) { recent.push(pair); if (recent.length > window) recent.shift(); },
    brier() { return calibrateWinProb({ pairs: recent }).brier(); },
    drift(baseline = 0.1) { return this.brier() - baseline; },
  };
}
```

**Acceptance criteria:** calibration; brier; drift.

### M4 — Integration + tests

**Reference code (`src/lib/winprob/integrate.js`):**

```js
// Routing integration: EV routing.
export function routeWithWinProb({ winprob, candidates = [], qualityOf, costOf, lambda = 0.1 } = {}) {
  const ranked = rankByEV({ winprob, candidates, qualityOf, costOf, lambda });
  return { ranked, best: ranked[0]?.model ?? null };
}

// Fail-open.
export function safeWinProb(fn, fallback = null) {
  try { return fn(); } catch { return fallback; }
}
```

**Files touched:** `src/lib/winprob/` (new: model, ev, calibrate, integrate), `open-sse/handlers/chatCore.js` (integration), dashboard winprob page (new), `tests/unit/winprob.test.js` (new).

**Acceptance criteria:** integration; fail-open; tests.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Poor calibration | Wrong routing | Calibration pipeline |
| EV complexity | Confusion | Simple EV |
| Data needs | Cold start | Preference data |
| Drift | Stale predictions | Monitoring |

## Verification

- Unit: makeWinProbModel, mfPredictor, swPredictor, expectedValue, rankByEV, routeAboveEV, calibrateWinProb, makeWinProbMonitor, routeWithWinProb
- Manual: predict → EV rank → route
- Regression: `tests/__baseline__/verify-no-regression.mjs`