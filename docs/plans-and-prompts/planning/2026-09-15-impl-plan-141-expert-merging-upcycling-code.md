# Implementation Plan 141 — Expert Merging & Sparse Upcycling — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #experts #merging #upcycling #variants #sparse #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (MoE dispatch from plan 5; expert utilization from plan 96 (`src/lib/experts/`); inference efficiency from plan 92 (`src/lib/local/`); quantization variants from plan 113 (`src/lib/quant/`); model config in `open-sse/config/providerModels.js`).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — merging; upcycling; variant routing.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-141-expert-merging-upcycling.md`, `../research/9router/impl-plan-5-moe-aware-dispatch.md`, `../research/9router/impl-plan-96-expert-utilization-capacity.md`.

## Scope

**In scope:** expert merging (weight averaging, clustering; merge evaluation; merged variant registry); sparse upcycling (dense → MoE pipeline, quality/cost tradeoff evaluation, upcycled variant registry); routing integration (route to merged/upcycled variants, variant quality tracking, fallback to original); provider config + dashboard variants view.
**Out of scope:** actual weight merging math (consumes external tools); MoE dispatch internals (plan 5).

## Milestones

### M1 — Expert merging

**Reference code (`src/lib/variants/merge.js`):**

```js
// Merging techniques: weight averaging, clustering.
export function averageWeights(weights) {
  if (!weights.length) return null;
  const n = weights.length;
  const out = {};
  for (const w of weights) for (const [k, v] of Object.entries(w)) out[k] = (out[k] ?? 0) + v / n;
  return out;
}

// Cluster experts: group similar experts.
export function clusterExperts(experts, { similarity = null, threshold = 0.8 } = {}) {
  const clusters = [];
  for (const e of experts) {
    const found = clusters.find((c) => c.some((x) => (similarity?.(x, e) ?? 0) >= threshold));
    if (found) found.push(e);
    else clusters.push([e]);
  }
  return clusters;
}

// Merge evaluation: quality after merge.
export function evaluateMerge({ before = null, after = null } = {}) {
  if (before == null || after == null) return { ok: false, reason: "missing-scores" };
  return { ok: after >= before * 0.95, delta: after - before };
}
```

**Acceptance criteria:** averaging; clustering; evaluation.

### M2 — Sparse upcycling

**Reference code (`src/lib/variants/upcycle.js`):**

```js
// Upcycling pipeline: dense → MoE.
export function upcyclePlan({ denseModel, experts = 8, topK = 2, costRatio = 1.2 } = {}) {
  return { denseModel, experts, topK, costRatio, variantId: `${denseModel}:moe-${experts}x${topK}` };
}

// Upcycling evaluation: quality/cost tradeoffs.
export function evaluateUpcycle({ quality = null, costRatio = 1.2, minQuality = 0.9 } = {}) {
  if (quality == null) return { ok: false, reason: "missing-quality" };
  return { ok: quality >= minQuality, quality, costRatio, value: quality / costRatio };
}

// Upcycling registry: upcycled variants.
export function makeUpcycleRegistry() {
  const variants = new Map(); // id -> variant
  return {
    register(v) { variants.set(v.id, v); return v; },
    get(id) { return variants.get(id) ?? null; },
    forDense(denseModel) { return [...variants.values()].filter((v) => v.denseModel === denseModel); },
    all() { return [...variants.values()]; },
  };
}
```

**Acceptance criteria:** pipeline; evaluation; registry.

### M3 — Variant routing

**Reference code (`src/lib/variants/route.js`):**

```js
// Variant routing: route to merged/upcycled variants.
export function variantFor({ registry, denseModel, qualityOf = () => null, minQuality = 0.9 } = {}) {
  const candidates = registry.forDense(denseModel);
  const ok = candidates.filter((v) => (qualityOf(v.id) ?? 1) >= minQuality);
  return ok[0] ?? null;
}

// Quality monitoring: variant quality tracking (EWMA).
export function makeVariantQuality({ alpha = 0.1 } = {}) {
  const scores = new Map(); // variantId -> score
  return {
    record(variantId, score) {
      const prev = scores.get(variantId);
      scores.set(variantId, prev == null ? score : alpha * score + (1 - alpha) * prev);
    },
    score(variantId) { return scores.get(variantId) ?? null; },
  };
}

// Fallback: fallback to original model.
export function fallbackToOriginal({ variant = null, original = null } = {}) {
  return variant ?? original;
}
```

**Acceptance criteria:** variant selection; quality tracking; fallback.

### M4 — Integration + telemetry + tests

**Reference code (`src/lib/variants/integrate.js`):**

```js
// Provider config: variant config.
export function variantConfig(models, { variantsOf = () => [] } = {}) {
  return Object.fromEntries(models.map((m) => [m, variantsOf(m)]));
}

// Telemetry: variants view.
export function makeVariantTelemetry() {
  const events = [];
  return {
    record(evt) { events.push({ ...evt, at: Date.now() }); },
    report() {
      return {
        variantRoutes: events.filter((e) => e.variant).length,
        originalRoutes: events.filter((e) => !e.variant).length,
        fallbacks: events.filter((e) => e.fallback).length,
        avgQuality: events.length ? events.reduce((a, e) => a + (e.quality ?? 0), 0) / events.length : null,
      };
    },
  };
}
```

**Files touched:** `src/lib/variants/` (new: merge, upcycle, route, integrate), `open-sse/config/providerModels.js` (variant config), dashboard variants page (new), `tests/unit/variants.test.js` (new).

**Acceptance criteria:** integration; telemetry; tests.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Quality loss | Bad variants | Evaluation |
| Complexity | Pipeline bugs | Simple pipelines |
| Registry bloat | Stale variants | Cleanup policy |
| Provider support | Unsupported | Best-effort |

## Verification

- Unit: averageWeights, clusterExperts, evaluateMerge, upcyclePlan, evaluateUpcycle, makeUpcycleRegistry, variantFor
- Manual: merged variant quality below threshold → original used
- Regression: `tests/__baseline__/verify-no-regression.mjs`