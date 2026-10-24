# Implementation Plan 146 — Similarity Metrics & Nearest-Neighbor Search — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #similarity #metrics #nearest-neighbor #vector-search #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (semantic routing from plan 3 (`open-sse/services/semantic-router.js`); embedding management from plan 93; calibration from plan 82; RAG-aware routing from plan 114 (`src/lib/ragroute/`)).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — metric math; threshold calibration; NN search.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-146-similarity-metrics-nn-search.md`, `../research/9router/impl-plan-3-semantic-routing.md`, `../research/9router/impl-plan-82-calibration.md`.

## Scope

**In scope:** metric registry (cosine, dot, euclidean, manhattan); threshold calibration (per-route, from labeled data, adaptive); NN search (brute-force + approximate, recall vs speed); integration.
**Out of scope:** embedding encoder selection (plan 145); semantic route design (plan 147).

## Milestones

### M1 — Metric registry

**Reference code (`src/lib/similarity/metrics.js`):**

```js
// Similarity metrics: cosine, dot, euclidean, manhattan.
export const METRICS = ["cosine", "dot", "euclidean", "manhattan"];

export function cosine(a, b) {
  const dot = a.reduce((s, v, i) => s + v * b[i], 0);
  const na = Math.sqrt(a.reduce((s, v) => s + v * v, 0));
  const nb = Math.sqrt(b.reduce((s, v) => s + v * v, 0));
  return na && nb ? dot / (na * nb) : 0;
}

export function dot(a, b) {
  return a.reduce((s, v, i) => s + v * b[i], 0);
}

export function euclidean(a, b) {
  return Math.sqrt(a.reduce((s, v, i) => s + (v - b[i]) ** 2, 0));
}

export function manhattan(a, b) {
  return a.reduce((s, v, i) => s + Math.abs(v - b[i]), 0);
}

// Registry: metric choice per use case.
export function makeMetricRegistry() {
  const fns = { cosine, dot, euclidean, manhattan };
  const use = new Map(); // useCase -> metric
  return {
    set(useCase, metric) { use.set(useCase, metric); },
    get(useCase) { return fns[use.get(useCase) ?? "cosine"]; },
    // Similarity: normalize distance metrics to [0,1] similarity.
    similarity(useCase, a, b) {
      const fn = this.get(useCase);
      const v = fn(a, b);
      return fn === euclidean || fn === manhattan ? 1 / (1 + v) : v;
    },
  };
}
```

**Acceptance criteria:** metric math; registry; normalization.

### M2 — Threshold calibration

**Reference code (`src/lib/similarity/thresholds.js`):**

```js
// Threshold calibration: from labeled data.
export function calibrateThreshold({ positives = [], negatives = [], metric = cosine } = {}) {
  // Score all pairs; pick threshold maximizing separation.
  const pos = positives.map(([a, b]) => metric(a, b));
  const neg = negatives.map(([a, b]) => metric(a, b));
  const all = [...pos, ...neg].sort((a, b) => a - b);
  let best = { t: 0.5, score: -Infinity };
  for (const t of all) {
    const tp = pos.filter((s) => s >= t).length;
    const fp = neg.filter((s) => s >= t).length;
    const score = tp - fp; // simple F1-ish proxy
    if (score > best.score) best = { t, score };
  }
  return best.t;
}

// Adaptive thresholds: adjust over time with EWMA.
export function adaptThreshold({ current = 0.5, sample = 0.5, alpha = 0.1 } = {}) {
  return alpha * sample + (1 - alpha) * current;
}

// Per-route thresholds.
export function makeThresholdStore() {
  const map = new Map();
  return {
    set(route, t) { map.set(route, t); },
    get(route, fallback = 0.5) { return map.get(route) ?? fallback; },
    adapt(route, sample, alpha = 0.1) { map.set(route, adaptThreshold({ current: this.get(route), sample, alpha })); },
  };
}
```

**Acceptance criteria:** calibration; adaptation; per-route store.

### M3 — Nearest-neighbor search

**Reference code (`src/lib/similarity/search.js`):**

```js
// NN search: brute force + simple approximate (random projection buckets).
export function bruteForce(query, items, metric = cosine, k = 5) {
  return items
    .map((item) => ({ item, score: metric(query, item.vector) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
}

// Approximate: bucket by sign of random projections.
export function makeApproxIndex({ dims = 768, nBits = 8, metric = cosine } = {}) {
  const planes = Array.from({ length: nBits }, () => Array.from({ length: dims }, () => (Math.random() < 0.5 ? 1 : -1)));
  const buckets = new Map();
  const hash = (v) => planes.map((p) => (v.reduce((s, x, i) => s + x * p[i], 0) >= 0 ? "1" : "0")).join("");
  return {
    add(item) {
      const h = hash(item.vector);
      const list = buckets.get(h) ?? [];
      list.push(item);
      buckets.set(h, list);
    },
    search(query, k = 5) {
      const h = hash(query);
      const candidates = (buckets.get(h) ?? []).concat([...buckets.values()].flat().slice(0, 64));
      return bruteForce(query, [...new Map(candidates.map((c) => [c.id, c])).values()], metric, k);
    },
    size() { return [...buckets.values()].reduce((s, l) => s + l.length, 0); },
  };
}

// Recall check: approximate vs brute force.
export function recallAtK(approx, exact, k = 5) {
  const a = new Set(approx.map((r) => r.item.id));
  const e = new Set(exact.map((r) => r.item.id));
  return [...e].filter((id) => a.has(id)).length / Math.min(k, e.size);
}
```

**Acceptance criteria:** brute force; approximate index; recall.

### M4 — Integration + tests

**Reference code (`src/lib/similarity/integrate.js`):**

```js
// Semantic router integration: metric + search.
export function semanticMatch({ query, routes, registry, threshold = 0.5 } = {}) {
  const metric = registry.get("route");
  const scored = routes.map((r) => ({ route: r, score: metric(query, r.vector) }));
  const best = scored.sort((a, b) => b.score - a.score)[0];
  return best && best.score >= threshold ? best.route : null;
}

// Fail-open wrapper.
export function safeSimilarity(fn, fallback = null) {
  try { return fn(); } catch { return fallback; }
}
```

**Files touched:** `src/lib/similarity/` (new: metrics, thresholds, search, integrate), `open-sse/services/semantic-router.js` (integration), dashboard similarity page (new), `tests/unit/similarity.test.js` (new).

**Acceptance criteria:** integration; fail-open; tests.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Metric mismatch | Wrong matches | Registry + tests |
| Threshold drift | Bad decisions | Calibration |
| Search latency | Slow routing | Approximate search |
| Index staleness | Stale vectors | Rebuild policy |

## Verification

- Unit: cosine/dot/euclidean/manhattan, calibrateThreshold, adaptThreshold, bruteForce, makeApproxIndex, recallAtK, semanticMatch
- Manual: metric switch; threshold calibration on labeled pairs
- Regression: `tests/__baseline__/verify-no-regression.mjs`