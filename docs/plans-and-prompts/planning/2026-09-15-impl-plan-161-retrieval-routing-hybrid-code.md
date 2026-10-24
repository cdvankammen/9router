# Implementation Plan 161 — Retrieval Routing & Hybrid Retrieval — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #retrieval #rag #hybrid #fusion #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (RAG cascade from plan 84 (`open-sse/services/rag.js`); RAG-aware routing from plan 114 (`src/lib/ragroute/`); encoder selection from plan 145 (`src/lib/encoders/`); similarity metrics from plan 146 (`src/lib/similarity/`)).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — strategy selection; hybrid fusion; quality.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-161-retrieval-routing-hybrid.md`, `../research/9router/impl-plan-84-rag-cascade.md`, `../research/9router/impl-plan-114-rag-aware-routing.md`.

## Scope

**In scope:** retrieval registry (vector/keyword/hybrid strategies, properties, availability); retrieval routing (query classification, strategy selection, fallback); hybrid retrieval (RRF fusion, weighting, dedup); integration.
**Out of scope:** encoder selection (plan 145); similarity metrics (plan 146).

## Milestones

### M1 — Retrieval registry

**Reference code (`src/lib/retrieval/registry.js`):**

```js
// Retrieval registry: strategies with properties.
export const STRATEGIES = ["vector", "keyword", "hybrid"];

export function makeRetrievalRegistry() {
  const strategies = new Map(); // id -> {id, speed, quality, cost, run}
  return {
    register(s) { strategies.set(s.id, s); },
    get(id) { return strategies.get(id); },
    all() { return [...strategies.values()]; },
    // Best strategy under constraints.
    bestFor({ maxCost = Infinity, minQuality = 0, prefer = "quality" } = {}) {
      return this.all()
        .filter((s) => s.cost <= maxCost && s.quality >= minQuality)
        .sort((a, b) => b[prefer] - a[prefer])[0] ?? null;
    },
  };
}

export function makeStrategy({ id, speed = 1, quality = 0.7, cost = 1, run = null } = {}) {
  return { id, speed, quality, cost, run };
}
```

**Acceptance criteria:** registry; bestFor; shape.

### M2 — Retrieval routing

**Reference code (`src/lib/retrieval/select.js`):**

```js
// Query classification: retrieval query type.
export function classifyQuery({ text = "" } = {}) {
  // Factual/entity queries → keyword; semantic → vector.
  const keywordish = /who|what is|when|where|name|list|define/i.test(text);
  const semanticish = /explain|compare|why|how|summarize|concept/i.test(text);
  if (keywordish && !semanticish) return "keyword";
  if (semanticish && !keywordish) return "vector";
  return "hybrid";
}

// Strategy selection: best strategy per query.
export function selectStrategy({ registry, query = "hybrid", maxCost = Infinity } = {}) {
  if (query === "hybrid") return registry.get("hybrid") ?? registry.bestFor({ maxCost });
  return registry.get(query) ?? registry.bestFor({ maxCost });
}

// Fallback: fallback strategies.
export function fallbackStrategy({ registry, current = null } = {}) {
  return registry.all().filter((s) => s.id !== current).sort((a, b) => b.quality - a.quality)[0] ?? null;
}
```

**Acceptance criteria:** classification; selection; fallback.

### M3 — Hybrid retrieval

**Reference code (`src/lib/retrieval/fuse.js`):**

```js
// Fusion: Reciprocal Rank Fusion (RRF).
export function rrfFuse({ results = [], k = 60 } = {}) {
  // results: [{strategy, items: [{id, score}]}]
  const scores = new Map();
  for (const { items } of results) {
    items.forEach((item, rank) => {
      const s = scores.get(item.id) ?? 0;
      scores.set(item.id, s + 1 / (k + rank + 1));
    });
  }
  return [...scores.entries()].sort((a, b) => b[1] - a[1]).map(([id, score]) => ({ id, score }));
}

// Weighting: strategy weights.
export function weightedFuse({ results = [], weights = {} } = {}) {
  const scores = new Map();
  for (const { strategy, items } of results) {
    const w = weights[strategy] ?? 1;
    items.forEach((item, rank) => {
      const s = scores.get(item.id) ?? 0;
      scores.set(item.id, s + w / (rank + 1));
    });
  }
  return [...scores.entries()].sort((a, b) => b[1] - a[1]).map(([id, score]) => ({ id, score }));
}

// Deduplication: dedupe by id.
export function dedupe(items) {
  return [...new Map(items.map((i) => [i.id, i])).values()];
}
```

**Acceptance criteria:** RRF; weighting; dedup.

### M4 — Integration + tests

**Reference code (`src/lib/retrieval/integrate.js`):**

```js
// RAG integration: retrieval routing.
export function retrieve({ registry, text = "", maxCost = Infinity } = {}) {
  const query = classifyQuery({ text });
  const strategy = selectStrategy({ registry, query, maxCost });
  if (!strategy?.run) return { items: [], strategy: null, query };
  const items = strategy.run(text);
  return { items, strategy: strategy.id, query };
}

// Fail-open.
export function safeRetrieval(fn, fallback = null) {
  try { return fn(); } catch { return fallback; }
}
```

**Files touched:** `src/lib/retrieval/` (new: registry, select, fuse, integrate), `open-sse/services/rag.js` (integration), dashboard retrieval page (new), `tests/unit/retrieval.test.js` (new).

**Acceptance criteria:** integration; fail-open; tests.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Quality loss | Bad retrieval | Monitoring |
| Latency | Slow retrieval | Strategy speed |
| Fusion complexity | Confusion | Simple RRF |
| Cost | Expensive retrieval | Strategy cost |

## Verification

- Unit: makeRetrievalRegistry, classifyQuery, selectStrategy, fallbackStrategy, rrfFuse, weightedFuse, dedupe, retrieve
- Manual: semantic query → vector; hybrid → RRF
- Regression: `tests/__baseline__/verify-no-regression.mjs`