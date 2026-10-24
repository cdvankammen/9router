# Implementation Plan 91 — Benchmark Hygiene & Dataset Management — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #benchmark-hygiene #datasets #contamination #balance #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (eval harness from plan 7 research; quality evaluation from plan 67 (`src/lib/eval/`); calibration from plan 82; leaderboard from plan 36 research).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — register a dataset; run contamination check against usage data; view balance report.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-91-benchmark-hygiene-datasets.md`, `../research/9router/impl-plan-82-router-calibration-confidence.md`, `../research/9router/impl-plan-67-model-quality-evaluation.md`.

## Scope

**In scope:** dataset registry (id, version, task-type, samples, provenance; immutable versions with changelog); contamination checks (n-gram overlap vs training/usage data, leakage blocklist, continuous checks); dataset balance (class/difficulty/domain distribution metrics + reports + oversampling/undersampling tools); verification discipline (sampled verification, holdout discipline, pinned seeds/versions); eval harness integration + dashboard.
**Out of scope:** dataset acquisition/curation pipelines; external benchmark licensing management.

## Milestones

### M1 — Dataset registry

**Reference code (`src/lib/benchmarks/registry.js` + migration):**

```js
// Dataset model with immutable versions.
export function makeDataset({ id, taskType, samples, provenance = {}, version = 1 }) {
  return { id, taskType, samples, provenance, version, createdAt: new Date().toISOString() };
}

export function bumpVersion(dataset, { changelog = "" } = {}) {
  return { ...dataset, version: dataset.version + 1, changelog, updatedAt: new Date().toISOString() };
}
```

```js
// src/lib/db/migrations/20260915-benchmarks.js
export const up = (db) => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS benchmark_datasets (
      id TEXT NOT NULL,
      version INTEGER NOT NULL,
      task_type TEXT NOT NULL,
      samples_json TEXT NOT NULL,
      provenance_json TEXT NOT NULL,
      changelog TEXT,
      created_at TEXT NOT NULL,
      PRIMARY KEY (id, version)
    );
  `);
};
export const down = (db) => { db.exec("DROP TABLE IF EXISTS benchmark_datasets"); };
```

**Acceptance criteria:** datasets versioned immutably; provenance stored.

### M2 — Contamination checks

**Reference code (`src/lib/benchmarks/contamination.js`):**

```js
// n-gram overlap detection between eval samples and corpus.
export function ngrams(text, n = 5) {
  const tokens = text.toLowerCase().match(/[a-z0-9]+/g) ?? [];
  const out = new Set();
  for (let i = 0; i <= tokens.length - n; i++) out.add(tokens.slice(i, i + n).join(" "));
  return out;
}

export function checkContamination(samples, corpus, { n = 5, threshold = 0.3 } = {}) {
  const corpusGrams = new Set();
  for (const c of corpus) for (const g of ngrams(c, n)) corpusGrams.add(g);
  const hits = [];
  for (const s of samples) {
    const grams = ngrams(s, n);
    if (!grams.size) continue;
    const overlap = [...grams].filter((g) => corpusGrams.has(g)).length / grams.size;
    if (overlap >= threshold) hits.push({ sample: s.slice(0, 80), overlap: Number(overlap.toFixed(3)) });
  }
  return { contaminated: hits.length > 0, hits, total: samples.length };
}

// Leakage blocklist: samples never allowed in eval sets.
export function makeBlocklist() {
  const blocked = new Set();
  return {
    add(sample) { blocked.add(sample.trim().toLowerCase()); },
    isBlocked(sample) { return blocked.has(sample.trim().toLowerCase()); },
    size() { return blocked.size; },
  };
}
```

**Acceptance criteria:** n-gram overlap detected; blocklist enforced.

### M3 — Dataset balance

**Reference code (`src/lib/benchmarks/balance.js`):**

```js
// Balance metrics: class distribution, difficulty, domain coverage.
export function balanceReport(samples, { classOf, difficultyOf, domainOf } = {}) {
  const classes = new Map(), difficulties = new Map(), domains = new Map();
  for (const s of samples) {
    const c = classOf?.(s) ?? "default";
    classes.set(c, (classes.get(c) ?? 0) + 1);
    const d = difficultyOf?.(s) ?? "medium";
    difficulties.set(d, (difficulties.get(d) ?? 0) + 1);
    const dom = domainOf?.(s) ?? "general";
    domains.set(dom, (domains.get(dom) ?? 0) + 1);
  }
  const entropy = (map) => {
    const total = [...map.values()].reduce((a, v) => a + v, 0);
    if (!total) return 0;
    return -[...map.values()].reduce((a, v) => a + (v / total) * Math.log2(v / total), 0);
  };
  return {
    n: samples.length,
    classes: Object.fromEntries(classes),
    difficulties: Object.fromEntries(difficulties),
    domains: Object.fromEntries(domains),
    classEntropy: Number(entropy(classes).toFixed(3)),
    balanced: entropy(classes) > 1, // heuristic: >1 bit suggests spread
  };
}

// Balance correction: oversample minority classes.
export function oversample(samples, { classOf, targetPerClass = 10 }) {
  const byClass = new Map();
  for (const s of samples) {
    const c = classOf?.(s) ?? "default";
    byClass.set(c, [...(byClass.get(c) ?? []), s]);
  }
  const out = [];
  for (const [, group] of byClass) {
    let i = 0;
    while (out.length < targetPerClass && group.length) {
      out.push(group[i % group.length]);
      i += 1;
    }
  }
  return out;
}
```

**Acceptance criteria:** distribution metrics; entropy heuristic; oversampling.

### M4 — Verification discipline + integration + tests

**Reference code (`src/lib/benchmarks/verify.js`):**

```js
// Sampled verification: verify on a seeded sample, not the full set.
export function sampleForVerification(samples, { rate = 0.2, seed = 42 } = {}) {
  let state = seed;
  const rand = () => { state = (state * 1664525 + 1013904223) >>> 0; return state / 2 ** 32; };
  return samples.filter(() => rand() < rate);
}

// Holdout discipline: eval sets must not be used for tuning.
export function assertHoldout({ datasetId, usedForTuning }) {
  if (usedForTuning) throw new Error(`dataset ${datasetId} used for tuning — violates holdout discipline`);
  return { ok: true };
}

// Reproducibility: pin model versions + seeds in run metadata.
export function runMetadata({ datasetId, version, model, seed }) {
  return { datasetId, version, model, seed, at: new Date().toISOString() };
}
```

**Files touched:** `src/lib/benchmarks/` (new: registry, contamination, balance, verify), `src/lib/eval/` (integration), `src/lib/db/migrations/20260915-benchmarks.js` (new), `src/lib/db/repos/benchmarkRepo.js` (new), dashboard benchmarks page (new), `tests/unit/benchmarks.test.js` (new).

**Acceptance criteria:** datasets versioned; contamination checked; balance reported; discipline enforced.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Contamination | Biased evals | Continuous checks + blocklist |
| Imbalanced sets | Skewed results | Balance reports + oversampling |
| Version drift | Unreproducible runs | Immutable versions |
| Verification cost | Expensive evals | Sampled verification |

## Verification

- Unit: checkContamination, balanceReport, oversample, sampleForVerification, assertHoldout
- Manual: register dataset → contamination check vs usage corpus → balance report
- Regression: `tests/__baseline__/verify-no-regression.mjs`