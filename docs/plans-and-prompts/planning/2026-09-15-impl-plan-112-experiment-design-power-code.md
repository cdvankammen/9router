# Implementation Plan 112 — Experiment Design & Statistical Power — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #experiments #statistical-power #ab-testing #significance #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (calibration from plan 82 (`src/lib/calibration/`); benchmark hygiene from plan 91 (`src/lib/benchmarks/`); strategy evaluation from plan 90 (`src/lib/cascade/strategy.js`); eval harness from plan 7 research).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — compute power; design an experiment; run significance test; confirm registry.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-112-experiment-design-power.md`, `../research/9router/impl-plan-82-router-calibration-confidence.md`, `../research/9router/impl-plan-91-benchmark-hygiene-datasets.md`.

## Scope

**In scope:** power analysis (power from effect size/sample/alpha, sample-size calculator, effect-size estimation from history); experiment framework (hypothesis/variants/metrics/duration model, configurable traffic split, consistent-hash randomization, safety guardrails); analysis (chi-square, t-test, bootstrap, Bayesian; Bonferroni/FDR corrections; practical vs statistical significance; auto promote/revert with confidence); experiment registry (versioned, history, reuse); routing hooks + dashboard designer.
**Out of scope:** external experiment platforms; multi-variate optimization beyond A/B.

## Milestones

### M1 — Power analysis

**Reference code (`src/lib/experiments/power.js`):**

```js
// Power computation (two-proportion z-test approximation).
export function powerFor({ p1, p2, n, alpha = 0.05 } = {}) {
  const p = (p1 + p2) / 2;
  const se = Math.sqrt(2 * p * (1 - p) / n);
  const z = Math.abs(p2 - p1) / (se || 1e-9);
  const zAlpha = 1.96; // two-sided 0.05
  // Approximate power via normal CDF.
  const phi = (x) => 0.5 * (1 + erf(x / Math.SQRT2));
  return phi(z - zAlpha);
}

// Sample size calculator for target power.
export function sampleSizeFor({ p1, p2, power = 0.8, alpha = 0.05 } = {}) {
  const zAlpha = 1.96;
  const zBeta = 0.84; // power 0.8
  const p = (p1 + p2) / 2;
  const se = Math.sqrt(2 * p * (1 - p));
  const d = Math.abs(p2 - p1) || 1e-9;
  return Math.ceil(((zAlpha + zBeta) * se / d) ** 2);
}

// Effect size estimation from historical data.
export function effectSizeFrom({ controlRate, treatmentRate }) {
  return Math.abs(treatmentRate - controlRate) / Math.max(1e-9, controlRate);
}

function erf(x) {
  // Abramowitz-Stegun approximation.
  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * x);
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return sign * y;
}
```

**Acceptance criteria:** power; sample size; effect size.

### M2 — Experiment framework

**Reference code (`src/lib/experiments/framework.js`):**

```js
// Experiment model.
export function makeExperiment({ id, hypothesis, variants = ["control", "treatment"], metrics = ["success"], split = 0.5, minDurationMs = 0 } = {}) {
  return { id, hypothesis, variants, metrics, split, minDurationMs, startedAt: new Date().toISOString(), status: "running" };
}

// Consistent hashing for stable assignment.
export function assignVariant(experiment, unitId) {
  let h = 0;
  const s = `${experiment.id}:${unitId}`;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  const r = (h >>> 0) / 2 ** 32;
  return r < experiment.split ? experiment.variants[0] : experiment.variants[1];
}

// Safety guardrails.
export function guardrails({ experiment, sampleSize, maxTraffic = 0.5 } = {}) {
  const issues = [];
  if (experiment.split > maxTraffic) issues.push("traffic-split-too-high");
  if (sampleSize < 100) issues.push("sample-too-small");
  return { ok: issues.length === 0, issues };
}
```

**Acceptance criteria:** experiment model; stable assignment; guardrails.

### M3 — Analysis engine

**Reference code (`src/lib/experiments/analysis.js`):**

```js
// Chi-square test for proportions.
export function chiSquare({ control: { n, success }, treatment: { n: n2, success: s2 } } = {}) {
  const total = n + n2;
  const overall = (success + s2) / total;
  const e1 = n * overall, e2 = n2 * overall;
  const o1 = success, o2 = s2;
  const stat = ((o1 - e1) ** 2) / Math.max(1e-9, e1) + ((o2 - e2) ** 2) / Math.max(1e-9, e2);
  return { chi2: stat, significant: stat > 3.841 }; // df=1, alpha=0.05
}

// Multiple comparison correction: Bonferroni.
export function bonferroni(pValues, { alpha = 0.05 } = {}) {
  const k = pValues.length || 1;
  return pValues.map((p) => Math.min(1, p * k));
}

// Practical significance: effect must exceed minimum.
export function practicallySignificant({ effect, minEffect = 0.01 } = {}) {
  return Math.abs(effect) >= minEffect;
}

// Auto-decision: promote/revert with confidence.
export function decide({ significant, practical, treatmentBetter }) {
  if (!significant) return { action: "continue", reason: "not-significant" };
  if (!practical) return { action: "continue", reason: "not-practical" };
  return { action: treatmentBetter ? "promote" : "revert", reason: "significant-and-practical" };
}
```

**Acceptance criteria:** chi-square; Bonferroni; practical significance; auto-decision.

### M4 — Registry + integration + tests

**Reference code (`src/lib/experiments/registry.js`):**

```js
// Versioned experiment registry with history.
export function makeExperimentRegistry() {
  const experiments = new Map(); // id -> experiment
  const history = [];
  return {
    register(exp) { experiments.set(exp.id, exp); return exp; },
    get(id) { return experiments.get(id) ?? null; },
    complete(id, results) {
      const exp = experiments.get(id);
      if (!exp) return null;
      exp.status = "completed";
      exp.results = results;
      history.push({ ...exp, completedAt: new Date().toISOString() });
      return exp;
    },
    history() { return history; },
    // Reuse: find similar past experiments.
    similar({ hypothesis }) {
      return history.filter((h) => h.hypothesis === hypothesis);
    },
  };
}

// Routing hooks: experiment in selection.
export function experimentHook({ registry, unitId, context } = {}) {
  const running = [...registry.get?.() ?? []].filter((e) => e.status === "running");
  return running.map((e) => ({ experiment: e.id, variant: assignVariant(e, unitId) }));
}
```

**Files touched:** `src/lib/experiments/` (new: power, framework, analysis, registry), `src/sse/handlers/chat.js` (experiment hooks), `src/lib/db/migrations/20260915-experiments.js` (new), `src/lib/db/repos/experimentRepo.js` (new), dashboard experiments page (new), `tests/unit/experiments.test.js` (new).

**Acceptance criteria:** power analysis; experiments designed; significance applied; registry maintained.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Underpowered tests | Missed effects | Power analysis |
| Multiple comparisons | False positives | Corrections |
| Traffic cost | Expensive tests | Split control |
| Misinterpretation | Bad decisions | Practical significance |

## Verification

- Unit: powerFor, sampleSizeFor, assignVariant, chiSquare, bonferroni, decide
- Manual: design 50/50 experiment → run → chi-square → promote/revert
- Regression: `tests/__baseline__/verify-no-regression.mjs`