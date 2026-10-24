# Implementation Plan 101 — Sparse Routing Efficiency & Upcycling — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #sparse-routing #upcycling #expert-merging #moe #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (expert utilization from plan 96 (`src/lib/experts/`); MoA from plan 85 (`src/lib/moa/`); intent classification from plan 81 (`src/lib/intent/`)).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — top-K activation; upcycling reuse; merge modes; efficiency metrics.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-101-sparse-routing-efficiency.md`, `../research/9router/impl-plan-96-expert-utilization-capacity.md`, `../research/9router/impl-plan-85-mixture-of-agents.md`.

## Scope

**In scope:** sparse activation (taxonomy confidence → activation, top-K activation, per-expert confidence gates, general-model fallback); expert upcycling (registry of reusable experts, domain-similarity detection, reuse-vs-new policy); expert merging (weighted voting, best-of-N, aggregator; learned weights; single-expert fallback); efficiency metrics (activation rate, utilization, sparse-vs-dense cost); expert dispatch integration + dashboard.
**Out of scope:** training/upcycling model weights (registry + policy only); distributed expert state (plan 70).

## Milestones

### M1 — Sparse activation

**Reference code (`src/lib/sparse/activation.js`):**

```js
// Sparse activation: top-K experts by confidence, with gates.
export function activateExperts({ candidates, k = 2, threshold = 0.6 } = {}) {
  // candidates: [{ expertId, confidence }]
  const passed = candidates.filter((c) => c.confidence >= threshold);
  if (!passed.length) return { experts: [], fallback: true, reason: "no-confident-expert" };
  const top = passed.sort((a, b) => b.confidence - a.confidence).slice(0, k);
  return { experts: top, fallback: false };
}

// Per-expert confidence gates.
export function gateFor(expertId, { gates = {} } = {}) {
  return gates[expertId] ?? 0.6;
}

// Fallback: no expert confident → general model.
export function routeSparse({ candidates, k = 2, gates = {}, general = "general" } = {}) {
  const gated = candidates.map((c) => ({ ...c, confidence: c.confidence >= (gates[c.expertId] ?? 0.6) ? c.confidence : 0 }));
  const { experts, fallback } = activateExperts({ candidates: gated, k });
  return fallback ? { target: general, reason: "fallback" } : { target: experts.map((e) => e.expertId), reason: "activated" };
}
```

**Acceptance criteria:** top-K; gates; fallback.

### M2 — Expert upcycling

**Reference code (`src/lib/sparse/upcycle.js`):**

```js
// Upcycling registry: experts reusable across domains.
export const UPCYCLING = new Map(); // domain -> [expertIds]

export function registerUpcycle(domain, expertIds) {
  UPCYCLING.set(domain, expertIds);
}

// Domain similarity → expert reuse.
export function similarDomains(domain, { similarity = {} } = {}) {
  return Object.entries(similarity)
    .filter(([, sim]) => sim >= 0.7)
    .map(([d]) => d);
}

// Reuse vs. new expert decision.
export function decideUpcycle({ domain, similarity = {}, newExpertCost = 1, reuseCost = 0.2 } = {}) {
  const similar = similarDomains(domain, { similarity });
  if (!similar.length) return { action: "create", reason: "no-similar-domain" };
  const best = similar[0];
  const reuse = reuseCost < newExpertCost;
  return { action: reuse ? "reuse" : "create", sourceDomain: best, reason: reuse ? "cheaper-reuse" : "quality-first" };
}
```

**Acceptance criteria:** registry; similarity; reuse decision.

### M3 — Expert merging

**Reference code (`src/lib/sparse/merge.js`):**

```js
// Merge modes: weighted voting, best-of-N, aggregator.
export const MERGE_MODES = {
  bestOfN: (results, { scoreOf }) => results.sort((a, b) => scoreOf(b) - scoreOf(a))[0],
  weightedVote: (results, { weightOf, voteOf }) => {
    const scores = new Map();
    for (const r of results) {
      const v = voteOf(r);
      scores.set(v, (scores.get(v) ?? 0) + weightOf(r));
    }
    return [...scores.entries()].sort((a, b) => b[1] - a[1])[0][0];
  },
  aggregator: (results, { aggregate }) => aggregate(results),
};

// Learned weights from outcomes: Beta-style update.
export function makeWeightLearner({ alpha = 1, beta = 1 } = {}) {
  return {
    update(weight, { ok }) {
      if (ok) alpha += weight; else beta += weight;
      return alpha / (alpha + beta);
    },
    weight() { return alpha / (alpha + beta); },
  };
}

// Single-expert fallback.
export function fallbackMerge(results) {
  return results[0] ?? null;
}
```

**Acceptance criteria:** merge modes; learned weights; fallback.

### M4 — Efficiency metrics + integration + tests

**Reference code (`src/lib/sparse/metrics.js`):**

```js
// Efficiency metrics: activation rate, utilization, cost.
export function makeSparseMetrics() {
  const stats = { requests: 0, activated: 0, expertCalls: 0, denseCost: 0, sparseCost: 0 };
  return {
    record({ activatedCount, cost, denseCost }) {
      stats.requests += 1;
      stats.activated += activatedCount > 0 ? 1 : 0;
      stats.expertCalls += activatedCount;
      stats.sparseCost += cost;
      stats.denseCost += denseCost;
    },
    report() {
      return {
        activationRate: stats.requests ? stats.activated / stats.requests : 0,
        avgExpertsPerRequest: stats.requests ? stats.expertCalls / stats.requests : 0,
        costSaving: stats.denseCost ? 1 - stats.sparseCost / stats.denseCost : 0,
      };
    },
  };
}
```

**Files touched:** `src/lib/sparse/` (new: activation, upcycle, merge, metrics), `src/lib/experts/` (integration), `open-sse/config/sparseConfig.js` (new), dashboard sparse page (new), `tests/unit/sparse.test.js` (new).

**Acceptance criteria:** sparse activation; upcycling; merging; metrics.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Wrong activation | Bad routing | Confidence gates |
| Upcycling mismatch | Wrong expert | Similarity checks |
| Merge noise | Bad output | Weight learning |
| Efficiency loss | No savings | Metrics + tuning |

## Verification

- Unit: activateExperts, routeSparse, decideUpcycle, MERGE_MODES, makeSparseMetrics
- Manual: low-confidence task → general fallback; similar domain → reuse
- Regression: `tests/__baseline__/verify-no-regression.mjs`