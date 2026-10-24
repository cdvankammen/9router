# Implementation Plan 171 — Threshold Calibration Pipeline — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #calibration #thresholds #pipeline #drift #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (router calibration from plan 82; confidence from plan 170 (`src/lib/confidence/`); statistical power from plan 149 (`src/lib/stats/`); dataset construction from plan 148 (`tests/benchmarks/datasets/`)).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — calibration framework; pipeline; drift.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-171-threshold-calibration-pipeline.md`, `../research/9router/impl-plan-82-router-calibration.md`, `../research/9router/impl-plan-170-answer-confidence-estimation.md`.

## Scope

**In scope:** calibration framework (threshold types, data, methods); calibration pipeline (collection, run, validation, deployment); drift monitoring (detection, re-calibration, alerts); integration.
**Out of scope:** confidence estimation (plan 170); statistical power (plan 149).

## Milestones

### M1 — Calibration framework

**Reference code (`src/lib/calibration/framework.js`):**

```js
// Threshold types: difficulty, confidence, cost, quality.
export const THRESHOLD_TYPES = ["difficulty", "confidence", "cost", "quality"];

// Calibration data: labeled examples.
export function makeCalibrationData() {
  const examples = []; // {features, label}
  return {
    add(example) { examples.push(example); },
    all() { return examples; },
    // Split: train/holdout.
    split({ holdout = 0.2, seed = 1 } = {}) {
      const shuffled = [...examples].sort(() => (seed % 2 ? -1 : 1));
      const cut = Math.floor(shuffled.length * (1 - holdout));
      return { train: shuffled.slice(0, cut), holdout: shuffled.slice(cut) };
    },
  };
}

// Calibration methods: grid search.
export function gridSearch({ data, metric = (t, d) => d.filter((x) => x.label === (x.score >= t)).length / (d.length || 1), range = [0.1, 0.9], steps = 9 } = {}) {
  let best = { t: 0.5, score: -Infinity };
  for (let i = 0; i <= steps; i++) {
    const t = range[0] + ((range[1] - range[0]) * i) / steps;
    const score = metric(t, data);
    if (score > best.score) best = { t, score };
  }
  return best;
}
```

**Acceptance criteria:** types; data; grid search.

### M2 — Calibration pipeline

**Reference code (`src/lib/calibration/pipeline.js`):**

```js
// Pipeline: collect → calibrate → validate → deploy.
export function runCalibration({ data, type = "confidence", method = gridSearch } = {}) {
  const { train, holdout } = data.split();
  const result = method({ data: train });
  // Validation: holdout score.
  const valid = method({ data: holdout, range: [result.t, result.t] });
  return {
    type,
    threshold: result.t,
    trainScore: result.score,
    holdoutScore: valid.score,
    // Deployable if holdout is close to train.
    deployable: Math.abs(result.score - valid.score) <= 0.1,
  };
}

// Apply thresholds to config.
export function applyThresholds({ config = {}, thresholds = {} } = {}) {
  return { ...config, thresholds: { ...config.thresholds, ...thresholds } };
}
```

**Acceptance criteria:** run; validation; deploy.

### M3 — Drift monitoring

**Reference code (`src/lib/calibration/drift.js`):**

```js
// Drift detection: threshold drift.
export function makeDriftMonitor({ baseline = {}, window = 100 } = {}) {
  const recent = [];
  return {
    record(sample) { recent.push(sample); if (recent.length > window) recent.shift(); },
    // Current performance vs baseline.
    drift() {
      if (!recent.length) return 0;
      const current = recent.reduce((a, b) => a + b, 0) / recent.length;
      const base = Object.values(baseline).reduce((a, b) => a + b, 0) / (Object.keys(baseline).length || 1);
      return base - current;
    },
    // Re-calibration trigger.
    needsRecalibration({ threshold = 0.1 } = {}) {
      return this.drift() >= threshold;
    },
  };
}

// Alerts: alert on drift.
export function alertCheck({ monitor, threshold = 0.1, throttled = false } = {}) {
  return { alert: monitor.needsRecalibration({ threshold }) && !throttled, drift: monitor.drift() };
}
```

**Acceptance criteria:** drift; re-calibration; alerts.

### M4 — Integration + tests

**Reference code (`src/lib/calibration/integrate.js`):**

```js
// Config integration: threshold config.
export function thresholdConfig({ type = "confidence", thresholds = {} } = {}) {
  return { [type]: thresholds };
}

// Fail-open.
export function safeCalibration(fn, fallback = null) {
  try { return fn(); } catch { return fallback; }
}
```

**Files touched:** `src/lib/calibration/` (new: framework, pipeline, drift, integrate), `src/lib/config/thresholds.js` (new), dashboard calibration page (new), `tests/unit/calibration.test.js` (new).

**Acceptance criteria:** integration; fail-open; tests.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Overfitting | Bad thresholds | Holdout validation |
| Drift | Stale thresholds | Monitoring |
| Data scarcity | Weak calibration | Synthetic data |
| Complexity | Confusion | Simple methods |

## Verification

- Unit: makeCalibrationData, gridSearch, runCalibration, applyThresholds, makeDriftMonitor, alertCheck, thresholdConfig
- Manual: labeled data → calibrate → validate → deploy
- Regression: `tests/__baseline__/verify-no-regression.mjs`