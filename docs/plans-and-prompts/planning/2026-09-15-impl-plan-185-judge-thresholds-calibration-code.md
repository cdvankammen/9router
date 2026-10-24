# Implementation Plan 185 — Judge Thresholds Calibration — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #judges #thresholds #calibration #escalation #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (cascade judge quality from plan 133 (`src/lib/judges/`); threshold calibration from plan 171 (`src/lib/calibration/`); router calibration from plan 82; judge models from plan 184 (`src/lib/judges/registry.js`)).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — thresholds; calibration; drift.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-185-judge-thresholds-calibration.md`, `../research/9router/impl-plan-133-cascade-judge-quality.md`, `../research/9router/impl-plan-171-threshold-calibration-pipeline.md`.

## Scope

**In scope:** threshold model (types, scope, values); calibration pipeline (data, method, validation); drift monitoring (detection, re-calibration, alerts).
**Out of scope:** judge model selection (plan 184); router calibration (plan 82).

## Milestones

### M1 — Threshold model

**Reference code (`src/lib/judges/thresholds.js`):**

```js
// Threshold types: confidence, quality, cost.
export const JUDGE_THRESHOLD_TYPES = ["confidence", "quality", "cost"];

// Threshold scope: per-task, per-judge, per-model.
export function makeThresholdStore(initial = {}) {
  const store = new Map(Object.entries(initial));
  return {
    get(key, fallback = 0.6) { return store.get(key) ?? fallback; },
    set(key, value) { store.set(key, value); },
    // Scope key: task|judge|model.
    keyFor({ task = "general", judge = null, model = null } = {}) {
      return [task, judge, model].filter(Boolean).join(":");
    },
    all() { return Object.fromEntries(store); },
  };
}

// Threshold values: calibrated values.
export const DEFAULT_JUDGE_THRESHOLDS = { confidence: 0.6, quality: 0.5, cost: 0.5 };
```

**Acceptance criteria:** types; store; defaults.

### M2 — Calibration pipeline

**Reference code (`src/lib/judges/calibrate.js`):**

```js
// Calibration data: labeled judgments.
export function makeJudgmentData() {
  const examples = []; // {score, escalated, correct}
  return {
    add(example) { examples.push(example); },
    all() { return examples; },
    split({ holdout = 0.2, seed = 1 } = {}) {
      const shuffled = [...examples].sort(() => (seed % 2 ? -1 : 1));
      const cut = Math.floor(shuffled.length * (1 - holdout));
      return { train: shuffled.slice(0, cut), holdout: shuffled.slice(cut) };
    },
  };
}

// Calibration method: threshold optimization.
export function optimizeJudgeThreshold({ data = [], metric = (t, d) => d.filter((x) => x.escalated === (x.score < t)).length / (d.length || 1), range = [0.3, 0.9], steps = 7 } = {}) {
  let best = { t: 0.6, score: -Infinity };
  for (let i = 0; i <= steps; i++) {
    const t = range[0] + ((range[1] - range[0]) * i) / steps;
    const score = metric(t, data);
    if (score > best.score) best = { t, score };
  }
  return best;
}

// Calibration validation: holdout validation.
export function validateThreshold({ data = [], threshold = 0.6 } = {}) {
  const correct = data.filter((x) => x.escalated === (x.score < threshold)).length;
  return { accuracy: data.length ? correct / data.length : 0, correct, total: data.length };
}
```

**Acceptance criteria:** data; optimization; validation.

### M3 — Drift monitoring

**Reference code (`src/lib/judges/drift.js`):**

```js
// Drift detection: threshold drift.
export function makeJudgeDriftMonitor({ baseline = 0.8, window = 200 } = {}) {
  const recent = [];
  return {
    record(sample) { recent.push(sample); if (recent.length > window) recent.shift(); },
    accuracy() { return recent.length ? recent.filter((s) => s.correct).length / recent.length : baseline; },
    drift() { return baseline - this.accuracy(); },
    // Re-calibration trigger.
    needsRecalibration({ threshold = 0.1 } = {}) { return this.drift() >= threshold; },
  };
}

// Drift alerts.
export function driftAlert({ monitor, threshold = 0.1 } = {}) {
  return { alert: monitor.needsRecalibration({ threshold }), drift: monitor.drift() };
}
```

**Acceptance criteria:** detection; re-calibration; alerts.

### M4 — Integration + tests

**Reference code (`src/lib/judges/integrate-thresholds.js`):**

```js
// Judge integration: calibrated thresholds.
export function thresholdForJudgment({ store, task = "general", judge = null, model = null, type = "confidence" } = {}) {
  return store.get(store.keyFor({ task, judge, model }), DEFAULT_JUDGE_THRESHOLDS[type] ?? 0.6);
}

// Fail-open.
export function safeThreshold(fn, fallback = null) {
  try { return fn(); } catch { return fallback; }
}
```

**Files touched:** `src/lib/judges/thresholds.js` (new), `src/lib/judges/calibrate.js` (new), `src/lib/judges/drift.js` (new), `src/lib/judges/integrate-thresholds.js` (new), `src/lib/calibration/` (integration), dashboard thresholds page (new), `tests/unit/thresholds.test.js` (new).

**Acceptance criteria:** integration; fail-open; tests.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Overfitting | Bad thresholds | Holdout validation |
| Drift | Stale thresholds | Monitoring |
| Data scarcity | Weak calibration | Synthetic data |
| Complexity | Confusion | Simple methods |

## Verification

- Unit: makeThresholdStore, makeJudgmentData, optimizeJudgeThreshold, validateThreshold, makeJudgeDriftMonitor, driftAlert, thresholdForJudgment
- Manual: labeled judgments → optimize → validate → deploy
- Regression: `tests/__baseline__/verify-no-regression.mjs`