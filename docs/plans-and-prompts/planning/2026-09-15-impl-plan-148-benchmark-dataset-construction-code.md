# Implementation Plan 148 — Benchmark Dataset Construction & Maintenance — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #benchmark #datasets #evaluation #taxonomy #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (eval harness from plan 7 (`tests/` harness); benchmark hygiene from plan 91; experiment design from plan 112; classifier training data from plan 131 (`src/lib/classifier/data.js`)).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — schema validation; balance; versioning.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-148-benchmark-dataset-construction.md`, `../research/9router/impl-plan-7-eval-harness.md`, `../research/9router/impl-plan-91-benchmark-hygiene.md`.

## Scope

**In scope:** dataset schema (query, expected_quality, expected_cost, domain); task taxonomy (code/math/vision/general/conversation); balance checks; construction (sources, filtering, labeling, versioning); maintenance (refresh, quality checks, drift, deprecation).
**Out of scope:** statistical power (plan 149); experiment design internals (plan 112).

## Milestones

### M1 — Dataset schema + taxonomy

**Reference code (`tests/benchmarks/datasets/schema.js`):**

```js
// Dataset schema: query, expected_quality, expected_cost, domain.
export const TAXONOMY = ["code", "math", "vision", "general", "conversation"];

export function validateSample(sample) {
  const errors = [];
  if (typeof sample.query !== "string" || !sample.query.trim()) errors.push("query required");
  if (!TAXONOMY.includes(sample.domain)) errors.push(`domain must be one of ${TAXONOMY.join(", ")}`);
  if (typeof sample.expected_quality !== "number" || sample.expected_quality < 0 || sample.expected_quality > 1) errors.push("expected_quality in [0,1]");
  if (typeof sample.expected_cost !== "number" || sample.expected_cost < 0) errors.push("expected_cost >= 0");
  return { ok: errors.length === 0, errors };
}

export function validateDataset(dataset) {
  const results = dataset.map((s, i) => ({ i, ...validateSample(s) }));
  const bad = results.filter((r) => !r.ok);
  return { ok: bad.length === 0, bad, total: dataset.length };
}
```

**Acceptance criteria:** schema; taxonomy; validation.

### M2 — Dataset construction

**Reference code (`scripts/build-dataset.mjs`):**

```js
// Dataset construction: sources, filtering, labeling, versioning.
import { validateDataset } from "../tests/benchmarks/datasets/schema.js";

export function buildDataset({ sources = [], filters = [], label = (s) => s } = {}) {
  const raw = sources.flat();
  const filtered = filters.reduce((acc, f) => acc.filter(f), raw);
  const labeled = filtered.map((s) => ({ ...s, ...label(s), version: 1, createdAt: Date.now() }));
  const { ok, bad } = validateDataset(labeled);
  if (!ok) throw new Error(`Dataset invalid: ${bad.length} bad samples`);
  return labeled;
}

// Balance check: domain distribution.
export function balanceReport(dataset) {
  const byDomain = dataset.reduce((acc, s) => { acc[s.domain] = (acc[s.domain] ?? 0) + 1; return acc; }, {});
  const total = dataset.length;
  return {
    byDomain,
    // Entropy: 1 = perfectly balanced.
    entropy: -Object.values(byDomain).reduce((s, n) => s + (n / total) * Math.log2(n / total), 0) / Math.log2(TAXONOMY.length),
  };
}
```

**Acceptance criteria:** build pipeline; balance report.

### M3 — Dataset maintenance

**Reference code (`tests/benchmarks/datasets/maintain.js`):**

```js
// Maintenance: refresh, quality checks, drift, deprecation.
export function makeDatasetStore() {
  const versions = new Map(); // name -> [{version, samples, at}]
  return {
    add(name, samples) {
      const prev = versions.get(name)?.at(-1);
      const version = (prev?.version ?? 0) + 1;
      versions.set(name, [...(versions.get(name) ?? []), { version, samples, at: Date.now() }]);
      return version;
    },
    latest(name) { return versions.get(name)?.at(-1) ?? null; },
    deprecate(name, version) {
      const list = versions.get(name) ?? [];
      const v = list.find((x) => x.version === version);
      if (v) v.deprecated = true;
      return v;
    },
    // Drift: label distribution shift between versions.
    drift(name, a, b) {
      const va = versions.get(name)?.find((x) => x.version === a);
      const vb = versions.get(name)?.find((x) => x.version === b);
      if (!va || !vb) return null;
      const dist = (samples) => samples.reduce((acc, s) => { acc[s.domain] = (acc[s.domain] ?? 0) + 1; return acc; }, {});
      const da = dist(va.samples), db = dist(vb.samples);
      const domains = new Set([...Object.keys(da), ...Object.keys(db)]);
      return [...domains].reduce((s, d) => s + Math.abs((da[d] ?? 0) / va.samples.length - (db[d] ?? 0) / vb.samples.length), 0);
    },
  };
}

// Quality checks: label consistency spot-check.
export function labelConsistency({ samples, sample = 0.1, judge } = {}) {
  const picked = samples.filter(() => Math.random() < sample);
  const bad = picked.filter((s) => !judge(s));
  return { checked: picked.length, bad: bad.length, ok: bad.length === 0 };
}
```

**Acceptance criteria:** versioning; deprecation; drift; quality checks.

### M4 — Tests

**Reference code (`tests/unit/datasets.test.js`):**

```js
import { describe, it, expect } from "vitest";
import { validateSample, validateDataset, TAXONOMY } from "../benchmarks/datasets/schema.js";
import { balanceReport } from "../benchmarks/datasets/maintain.js";

describe("datasets", () => {
  it("validates samples", () => {
    expect(validateSample({ query: "x", domain: "code", expected_quality: 0.8, expected_cost: 1 }).ok).toBe(true);
    expect(validateSample({ query: "", domain: "nope" }).ok).toBe(false);
  });
  it("reports balance", () => {
    const r = balanceReport([{ domain: "code" }, { domain: "math" }]);
    expect(r.entropy).toBeCloseTo(1, 1);
  });
});
```

**Files touched:** `tests/benchmarks/datasets/` (new: schema, maintain), `scripts/build-dataset.mjs` (new), `tests/unit/datasets.test.js` (new).

**Acceptance criteria:** tests pass.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Dataset bias | Skewed evals | Balance checks |
| Stale labels | Wrong conclusions | Versioning |
| Scale | Slow builds | Synthetic data |
| Quality | Garbage in | Filtering |

## Verification

- Unit: validateSample, validateDataset, balanceReport, makeDatasetStore, labelConsistency
- Manual: build dataset from corpus → check balance
- Regression: `tests/__baseline__/verify-no-regression.mjs`