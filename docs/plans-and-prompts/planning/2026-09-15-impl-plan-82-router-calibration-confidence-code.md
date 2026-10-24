# Implementation Plan 82 — Router Calibration & Confidence Scoring — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #calibration #confidence #significance-testing #ab-testing #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (quality evaluation from plan 67; anomaly detection from plan 64; outcome signals in usage logs (`src/lib/usageDb.js`); selection in `src/sse/handlers/chat.js`).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — attach confidence to decisions; compute calibration curve; run a significance test on synthetic outcomes.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-82-router-calibration-confidence.md`, `../research/9router/impl-plan-67-model-quality-evaluation.md`, `../research/9router/impl-plan-64-anomaly-detection-alerts.md`.

## Scope

**In scope:** confidence scoring (sources: classifier confidence, historical success rate, provider health, model tier; weighted geometric mean; thresholds); calibration store (per route/model/context outcomes) + calibration curves (ECE, Brier); outcome feedback loop (success/failure/quality signals → calibration); A/B framework with significance testing (chi-square, minimum sample, opt-in auto-promotion); benchmark registry with contamination checks.
**Out of scope:** online learning (batch recalibration); multi-armed bandit exploration.

## Milestones

### M1 — Confidence scoring

**Reference code (`src/lib/calibration/confidence.js`):**

```js
// Combine confidence sources with weighted geometric mean.
export function combineConfidence(sources, weights = {}) {
  const entries = Object.entries(sources).filter(([, v]) => v != null);
  if (!entries.length) return 0.5;
  const wSum = entries.reduce((a, [k]) => a + (weights[k] ?? 1), 0);
  const logSum = entries.reduce((a, [k, v]) => a + (weights[k] ?? 1) * Math.log(Math.max(1e-6, Math.min(1, v))), 0);
  return Number(Math.exp(logSum / wSum).toFixed(3));
}

export const DEFAULT_SOURCES = {
  classifier: 0.3,   // intent classifier confidence
  history: 0.4,      // historical success rate for (route, model)
  health: 0.2,       // provider health score
  tier: 0.1,         // model tier prior
};

export function confidenceFor({ classifier = null, history = null, health = null, tier = null } = {}) {
  return combineConfidence({ classifier, history, health, tier }, DEFAULT_SOURCES);
}

// Gate: rules can require minimum confidence.
export function meetsThreshold(confidence, { min = 0.5 } = {}) {
  return confidence >= min;
}
```

**Acceptance criteria:** sources combined geometrically; defaults sane; threshold gate.

### M2 — Calibration store

**Reference code (migration `src/lib/db/migrations/20260915-calibration.js` + repo):**

```js
export const up = (db) => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS calibration_outcomes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      route TEXT NOT NULL,
      model TEXT NOT NULL,
      context_hash TEXT,
      predicted REAL NOT NULL,
      success INTEGER NOT NULL,
      quality REAL,
      at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_calibration ON calibration_outcomes (route, model, at);
  `);
};
export const down = (db) => { db.exec("DROP TABLE IF EXISTS calibration_outcomes"); };
```

```js
// src/lib/db/repos/calibrationRepo.js
export async function recordOutcome(db, { route, model, contextHash = null, predicted, success, quality = null }) {
  db.run(`INSERT INTO calibration_outcomes (route, model, context_hash, predicted, success, quality, at)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [route, model, contextHash, predicted, success ? 1 : 0, quality ?? null, new Date().toISOString()]);
}
export async function successRate(db, { route, model, sinceIso }) {
  const where = "route = ? AND model = ?" + (sinceIso ? " AND at >= ?" : "");
  const params = sinceIso ? [route, model, sinceIso] : [route, model];
  const row = db.get(`SELECT AVG(success) AS rate, COUNT(*) AS n FROM calibration_outcomes WHERE ${where}`, params);
  return { rate: row.rate ?? null, n: row.n ?? 0 };
}
```

**Acceptance criteria:** outcomes recorded; success rate queryable.

### M3 — Calibration curves + feedback

**Reference code (`src/lib/calibration/curve.js`):**

```js
// Calibration curve: bucket predictions, compare to actual success.
export function calibrationCurve(rows, { buckets = 10 } = {}) {
  const groups = new Map();
  for (const r of rows) {
    const b = Math.min(buckets - 1, Math.floor(r.predicted * buckets));
    const g = groups.get(b) ?? { n: 0, successes: 0, predictedSum: 0 };
    g.n += 1; g.successes += r.success; g.predictedSum += r.predicted;
    groups.set(b, g);
  }
  return [...groups.entries()]
    .map(([b, g]) => ({
      bucket: b / buckets,
      n: g.n,
      predicted: Number((g.predictedSum / g.n).toFixed(3)),
      actual: Number((g.successes / g.n).toFixed(3)),
    }))
    .sort((a, b) => a.bucket - b.bucket);
}

// ECE: expected calibration error.
export function ece(curve) {
  const total = curve.reduce((a, c) => a + c.n, 0);
  if (!total) return 0;
  return Number((curve.reduce((a, c) => a + (c.n / total) * Math.abs(c.predicted - c.actual), 0)).toFixed(4));
}

// Brier score.
export function brier(rows) {
  if (!rows.length) return 0;
  return Number((rows.reduce((a, r) => a + (r.predicted - r.success) ** 2, 0) / rows.length).toFixed(4));
}
```

**Acceptance criteria:** curve bucketed; ECE/Brier computed.

### M4 — A/B + significance + benchmark hygiene + tests

**Reference code (`src/lib/calibration/ab.js`):**

```js
// Chi-square test for A/B outcome comparison (2x2: variant x success).
export function chiSquareTest(a, b) {
  const table = [
    [a.successes, a.failures()],
    [b.successes, b.failures()],
  ];
  const total = table[0][0] + table[0][1] + table[1][0] + table[1][1];
  if (total === 0) return { significant: false, p: 1 };
  const rowTotals = [table[0][0] + table[0][1], table[1][0] + table[1][1]];
  const colTotals = [table[0][0] + table[1][0], table[0][1] + table[1][1]];
  let chi2 = 0;
  for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
    const expected = (rowTotals[i] * colTotals[j]) / total;
    if (expected > 0) chi2 += (table[i][j] - expected) ** 2 / expected;
  }
  // 1 dof; p ≈ 0.05 at chi2 ≈ 3.841.
  const significant = chi2 > 3.841;
  return { chi2: Number(chi2.toFixed(3)), significant, p: significant ? "<0.05" : ">=0.05" };
}

// A/B runner with configurable split + minimum sample.
export function makeABTest({ split = 0.5, minSample = 100, autoPromote = false } = {}) {
  const counts = { a: { successes: 0, n: 0 }, b: { successes: 0, n: 0 } };
  return {
    assign() { return Math.random() < split ? "a" : "b"; },
    record(variant, success) { counts[variant].n += 1; if (success) counts[variant].successes += 1; },
    result() {
      const a = counts.a, b = counts.b;
      const ready = a.n >= minSample && b.n >= minSample;
      const test = ready ? chiSquareTest({ successes: a.successes, failures: () => a.n - a.successes }, { successes: b.successes, failures: () => b.n - b.successes }) : null;
      return { counts, ready, test, promote: ready && test?.significant && autoPromote };
    },
  };
}
```

**Reference code (`src/lib/calibration/benchmark.js`):**

```js
// Benchmark hygiene: contamination check between eval set and training corpus.
export function checkContamination(evalPrompts, corpus) {
  const corpusSet = new Set(corpus.map((c) => c.trim().toLowerCase()));
  const hits = evalPrompts.filter((p) => corpusSet.has(p.trim().toLowerCase()));
  return { contaminated: hits.length > 0, hits: hits.length, total: evalPrompts.length };
}
```

**Files touched:** `src/lib/calibration/` (new: confidence, curve, ab, benchmark), `src/lib/db/migrations/20260915-calibration.js` (new), `src/lib/db/repos/calibrationRepo.js` (new), `src/sse/handlers/chat.js` (confidence attach), dashboard calibration page (new), `tests/unit/calibration.test.js` (new).

**Acceptance criteria:** confidence attached to decisions; curves computed; A/B significant; contamination checked.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Calibration drift | Stale curves | Periodic recalibration |
| A/B traffic cost | Extra spend | Configurable split % |
| Contaminated benchmarks | Biased evals | Contamination checks |
| Overfitting to feedback | Wrong tuning | Holdout discipline |

## Verification

- Unit: combineConfidence, calibrationCurve, ece, brier, chiSquareTest, checkContamination
- Manual: record synthetic outcomes → curve + ECE; A/B with significant difference → promote
- Regression: `tests/__baseline__/verify-no-regression.mjs`