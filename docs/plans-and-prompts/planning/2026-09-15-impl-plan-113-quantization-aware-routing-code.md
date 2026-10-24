# Implementation Plan 113 — Quantization-Aware Routing — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #quantization #variants #quality-impact #routing #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (local acceleration from plan 92 (`src/lib/local/`); provider registry in `open-sse/providers/registry/` + `open-sse/config/providerModels.js`; quality tiers from plan 97 (`src/lib/tiers/`)).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — register variants; track quality delta; route low-stakes tasks to quantized; confirm fallback.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-113-quantization-aware-routing.md`, `../research/9router/impl-plan-92-local-inference-acceleration.md`, `../research/9router/impl-plan-97-quality-tiers-thresholds.md`.

## Scope

**In scope:** quantization registry (variant = base model + quantization level; metadata quality delta/speed/memory/cost; per-provider availability); quality impact tracking (quantized-vs-full delta per task-type, task sensitivity, continuous measurement); quantization routing (quality requirement → quantization level, low-stakes → quantized, quality failure → full precision); model registry integration + dashboard.
**Out of scope:** producing quantized weights (consumes existing variants); KV quantization internals (plan 92).

## Milestones

### M1 — Quantization registry

**Reference code (`src/lib/quant/registry.js`):**

```js
// Quantization levels.
export const QUANT_LEVELS = ["fp16", "int8", "int4"];

// Variant model: base model + quantization level.
export function makeVariant({ baseModel, level, qualityDelta = 0, speedup = 1, memoryRatio = 1, costRatio = 1 } = {}) {
  if (!QUANT_LEVELS.includes(level)) throw new Error(`invalid quant level: ${level}`);
  return { id: `${baseModel}:${level}`, baseModel, level, qualityDelta, speedup, memoryRatio, costRatio };
}

export function makeQuantRegistry() {
  const variants = new Map(); // id -> variant
  return {
    register(variant) { variants.set(variant.id, variant); return variant; },
    get(id) { return variants.get(id) ?? null; },
    variantsFor(baseModel) { return [...variants.values()].filter((v) => v.baseModel === baseModel); },
    availableFor(baseModel, { providerSupports = {} } = {}) {
      return this.variantsFor(baseModel).filter((v) => providerSupports[v.id] !== false);
    },
    all() { return [...variants.values()]; },
  };
}
```

**Acceptance criteria:** variants registered; availability filtering.

### M2 — Quality impact tracking

**Reference code (`src/lib/quant/impact.js`):**

```js
// Quality delta: quantized vs. full per task-type (EWMA).
export function makeImpactTracker({ alpha = 0.1 } = {}) {
  const deltas = new Map(); // `${variantId}:${taskType}` -> delta
  return {
    record(variantId, taskType, { quantizedScore, fullScore }) {
      const delta = (quantizedScore ?? 0) - (fullScore ?? 0);
      const key = `${variantId}:${taskType}`;
      const prev = deltas.get(key);
      deltas.set(key, prev == null ? delta : alpha * delta + (1 - alpha) * prev);
    },
    delta(variantId, taskType) { return deltas.get(`${variantId}:${taskType}`) ?? null; },
    // Task sensitivity: which tasks tolerate quantization.
    sensitivity(taskType, { tolerance = -0.05 } = {}) {
      const ds = [...deltas.entries()].filter(([k]) => k.endsWith(`:${taskType}`)).map(([, d]) => d);
      if (!ds.length) return "unknown";
      const avg = ds.reduce((a, b) => a + b, 0) / ds.length;
      return avg >= tolerance ? "tolerant" : "sensitive";
    },
  };
}
```

**Acceptance criteria:** deltas tracked; sensitivity classification.

### M3 — Quantization routing

**Reference code (`src/lib/quant/route.js`):**

```js
// Routing: quality requirement → quantization level.
export function levelForRequirement({ minQuality = 0.6, baseQuality = 1.0 } = {}) {
  const headroom = baseQuality - minQuality;
  if (headroom >= 0.3) return "int4";
  if (headroom >= 0.15) return "int8";
  return "fp16";
}

// Task mapping: low-stakes tasks → quantized variants.
export function quantizeForTask({ taskType, lowStakes = [], impact, baseModel, registry } = {}) {
  if (!lowStakes.includes(taskType)) return null;
  const variants = registry.availableFor(baseModel);
  const sorted = variants.sort((a, b) => QUANT_LEVELS.indexOf(a.level) - QUANT_LEVELS.indexOf(b.level));
  for (const v of sorted) {
    const d = impact?.delta(v.id, taskType);
    if (d == null || d >= -0.05) return v; // tolerate small deltas
  }
  return null;
}

// Fallback: quality failure → full precision.
export function fallbackToFull({ variant, qualityScore, minQuality = 0.6 } = {}) {
  if (variant && variant.level !== "fp16" && qualityScore != null && qualityScore < minQuality) {
    return { fallback: true, model: variant.baseModel, reason: "quality-below-threshold" };
  }
  return { fallback: false };
}
```

**Acceptance criteria:** level selection; task mapping; fallback.

### M4 — Integration + tests

**Reference code (`src/lib/quant/integrate.js`):**

```js
// Model registry integration: variants in provider registry.
export function variantModels(baseModels, registry) {
  return baseModels.flatMap((m) => registry.variantsFor(m).map((v) => v.id));
}

// Telemetry: quantization usage + quality impact.
export function makeQuantTelemetry() {
  const counts = new Map();
  const impacts = [];
  return {
    record(variantId, { qualityScore = null } = {}) {
      counts.set(variantId, (counts.get(variantId) ?? 0) + 1);
      if (qualityScore != null) impacts.push(qualityScore);
    },
    report() {
      return {
        usage: Object.fromEntries(counts),
        avgQuality: impacts.length ? impacts.reduce((a, b) => a + b, 0) / impacts.length : null,
      };
    },
  };
}
```

**Files touched:** `src/lib/quant/` (new: registry, impact, route, integrate), `open-sse/config/providerModels.js` (variant metadata), `src/sse/handlers/chat.js` (quant routing), dashboard quant page (new), `tests/unit/quant.test.js` (new).

**Acceptance criteria:** variants registered; impact tracked; quant routing; fallback.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Quality loss | Bad outputs | Task sensitivity mapping |
| Variant confusion | Wrong model | Clear naming |
| Impact drift | Stale deltas | Continuous measurement |
| Fallback gaps | Quality failures | Full-precision fallback |

## Verification

- Unit: makeVariant, makeImpactTracker, levelForRequirement, quantizeForTask, fallbackToFull
- Manual: low-stakes task → int4; quality drop → fp16 fallback
- Regression: `tests/__baseline__/verify-no-regression.mjs`