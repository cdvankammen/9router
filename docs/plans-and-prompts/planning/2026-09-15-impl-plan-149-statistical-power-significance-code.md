# Implementation Plan 149 — Statistical Power & Significance Testing — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #stats #power #significance #ab-testing #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (eval harness from plan 7 (`tests/` harness); experiment design from plan 112; benchmark datasets from plan 148 (`tests/benchmarks/datasets/`)).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — power math; significance tests; A/B framework.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-149-statistical-power-significance.md`, `../research/9router/impl-plan-7-eval-harness.md`, `../research/9router/impl-plan-112-experiment-design.md`.

## Scope

**In scope:** power analysis (effect size, sample size, alpha); significance testing (paired t-test, bootstrap, Bonferroni correction, confidence intervals); A/B framework (randomization, pre-registration); integration.
**Out of scope:** dataset construction (plan 148); benchmark hygiene (plan 91).

## Milestones

### M1 — Power analysis

**Reference code (`src/lib/stats/power.js`):**

```js
// Power analysis: sample size for a two-proportion test.
export function sampleSize({ p1 = 0.5, p2 = 0.6, alpha = 0.05, power = 0.8 } = {}) {
  const zAlpha = 1.96; // approx for alpha=0.05
  const zBeta = 0.84; // approx for power=0.8
  const p = (p1 + p2) / 2;
  const se = Math.sqrt(2 * p * (1 - p));
  const delta = Math.abs(p2 - p1);
  if (!delta) return Infinity;
  return Math.ceil(((zAlpha + zBeta) ** 2 * se ** 2) / delta ** 2);
}

// Achieved power given n.
export function achievedPower({ n, p1 = 0.5, p2 = 0.6, alpha = 0.05 } = {}) {
  const zAlpha = 1.96;
  const p = (p1 + p2) / 2;
  const se = Math.sqrt(2 * p * (1 - p));
  const delta = Math.abs(p2 - p1);
  const z = Math.sqrt(n) * delta / se - zAlpha;
  return 0.5 * (1 + erf(z / Math.SQRT2));
}

function erf(x) {
  // Abramowitz-Stegun approximation.
  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * x);
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return sign * y;
}

// Report: is the experiment adequately powered?
export function powerReport({ n, p1, p2, alpha = 0.05, target = 0.8 } = {}) {
  const power = achievedPower({ n, p1, p2, alpha });
  return { power, adequate: power >= target, required: sampleSize({ p1, p2, alpha, power: target }) };
}
```

**Acceptance criteria:** sample size; achieved power; report.

### M2 — Significance testing

**Reference code (`src/lib/stats/tests.js`):**

```js
// Paired t-test (approximate, Welch-style).
export function pairedTTest(a, b) {
  const diffs = a.map((x, i) => x - b[i]);
  const n = diffs.length;
  if (n < 2) return { p: 1, significant: false };
  const mean = diffs.reduce((s, d) => s + d, 0) / n;
  const sd = Math.sqrt(diffs.reduce((s, d) => s + (d - mean) ** 2, 0) / (n - 1));
  const t = mean / (sd / Math.sqrt(n));
  // Two-tailed p via normal approximation (n large) — use t-table for small n.
  const p = 2 * (1 - normalCdf(Math.abs(t)));
  return { t, p, significant: p < 0.05, meanDiff: mean };
}

function normalCdf(x) {
  return 0.5 * (1 + erf(x / Math.SQRT2));
}

// Bootstrap confidence interval.
export function bootstrapCI(samples, { n = 1000, alpha = 0.05, stat = (s) => s.reduce((a, b) => a + b, 0) / s.length } = {}) {
  const resampled = Array.from({ length: n }, () => {
    const pick = Array.from({ length: samples.length }, () => samples[Math.floor(Math.random() * samples.length)]);
    return stat(pick);
  }).sort((a, b) => a - b);
  const lo = resampled[Math.floor(n * alpha / 2)];
  const hi = resampled[Math.floor(n * (1 - alpha / 2))];
  return { lo, hi, point: stat(samples) };
}

// Multiple comparisons: Bonferroni correction.
export function bonferroni(pValues, alpha = 0.05) {
  const k = pValues.length || 1;
  return pValues.map((p) => ({ p, adjusted: Math.min(1, p * k), significant: p * k < alpha }));
}
```

**Acceptance criteria:** t-test; bootstrap CI; Bonferroni.

### M3 — A/B framework

**Reference code (`src/lib/stats/ab.js`):**

```js
// A/B framework: randomization + pre-registration.
export function makeExperiment({ name, hypothesis = "", variants = ["control", "treatment"], seed = 1 } = {}) {
  let counter = 0;
  const assignments = new Map();
  return {
    name, hypothesis, variants,
    // Deterministic assignment (seeded) for reproducibility.
    assign(queryId) {
      if (!assignments.has(queryId)) {
        counter++;
        assignments.set(queryId, variants[(hash(queryId + seed) + counter) % variants.length]);
      }
      return assignments.get(queryId);
    },
    // Pre-registration record.
    preregister() {
      return { name, hypothesis, variants, declaredAt: Date.now() };
    },
  };
}

function hash(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

// Result: compare variants with significance.
export function analyzeExperiment({ experiment, results = [] } = {}) {
  // results: [{queryId, variant, metric}]
  const byVariant = experiment.variants.map((v) => ({
    variant: v,
    values: results.filter((r) => r.variant === v).map((r) => r.metric),
  }));
  const [control, treatment] = byVariant;
  if (!control?.values.length || !treatment?.values.length) return { ok: false, reason: "insufficient data" };
  const test = pairedTTest(treatment.values, control.values);
  return { ok: true, byVariant, test };
}
```

**Acceptance criteria:** assignment; pre-registration; analysis.

### M4 — Integration + tests

**Reference code (`src/lib/stats/integrate.js`):**

```js
// Eval harness integration: statistical report.
export function statsReport({ control = [], treatment = [], p1 = 0.5, p2 = 0.6 } = {}) {
  const test = pairedTTest(treatment, control);
  const ci = bootstrapCI(treatment);
  const power = powerReport({ n: treatment.length, p1, p2 });
  return { test, ci, power };
}

// Fail-open.
export function safeStats(fn, fallback = null) {
  try { return fn(); } catch { return fallback; }
}
```

**Files touched:** `src/lib/stats/` (new: power, tests, ab, integrate), `open-sse/services/eval-harness.js` (integration), dashboard experiments page (new), `tests/unit/stats.test.js` (new).

**Acceptance criteria:** integration; fail-open; tests.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Underpowered | Missed effects | Power analysis |
| False positives | Wrong decisions | Corrections |
| Bias | Skewed results | Randomization |
| Complexity | Misuse | Simple defaults |

## Verification

- Unit: sampleSize, achievedPower, pairedTTest, bootstrapCI, bonferroni, makeExperiment, analyzeExperiment
- Manual: run A/B on eval harness → stats report
- Regression: `tests/__baseline__/verify-no-regression.mjs`