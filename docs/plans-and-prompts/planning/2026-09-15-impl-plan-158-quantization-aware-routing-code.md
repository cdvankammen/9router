# Implementation Plan 158 — Quantization-Aware Routing — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #quantization #variants #routing #quality #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (quantization from plan 113; local inference from plan 92 (`open-sse/executors/local.js`); expert merging variants from plan 141 (`src/lib/variants/`); quality tiers from plan 97).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — variant registry; selection; quality monitoring.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-158-quantization-aware-routing.md`, `../research/9router/impl-plan-113-quantization.md`, `../research/9router/impl-plan-92-local-inference.md`.

## Scope

**In scope:** quantization registry (per-model variants, precision/quality/speed, availability); quantization-aware routing (quality thresholds, variant selection, fallback); quality monitoring (tracking, drift, alerts); integration.
**Out of scope:** KV cache quantization (plan 157); expert merging (plan 141).

## Milestones

### M1 — Quantization registry

**Reference code (`src/lib/quantization/registry.js`):**

```js
// Quantization registry: per-model quantized variants.
export const PRECISIONS = ["fp16", "int8", "int4"];

export function makeQuantRegistry() {
  const variants = new Map(); // modelId -> [{precision, quality, speed, available}]
  return {
    register(modelId, variant) {
      const list = variants.get(modelId) ?? [];
      list.push(variant);
      variants.set(modelId, list);
    },
    variantsFor(modelId) { return variants.get(modelId) ?? []; },
    // Best variant under quality floor.
    bestFor({ modelId, minQuality = 0, prefer = "speed" } = {}) {
      return this.variantsFor(modelId)
        .filter((v) => v.available && v.quality >= minQuality)
        .sort((a, b) => b[prefer] - a[prefer])[0] ?? null;
    },
    all() { return Object.fromEntries(variants); },
  };
}

export function makeVariant({ precision = "fp16", quality = 1, speed = 1, available = true } = {}) {
  return { precision, quality, speed, available };
}
```

**Acceptance criteria:** registry; bestFor; shape.

### M2 — Quantization-aware routing

**Reference code (`src/lib/quantization/select.js`):**

```js
// Quality thresholds: min quality per task.
export const TASK_MIN_QUALITY = { code: 0.9, math: 0.9, vision: 0.85, general: 0.7, chat: 0.6 };

// Variant selection: best variant per task.
export function selectVariant({ registry, modelId, task = "general", minQuality = null } = {}) {
  const floor = minQuality ?? TASK_MIN_QUALITY[task] ?? 0.7;
  return registry.bestFor({ modelId, minQuality: floor });
}

// Fallback: higher precision fallback.
export function fallbackVariant({ registry, modelId, current = null } = {}) {
  const list = registry.variantsFor(modelId).filter((v) => v.available && v.precision !== current?.precision);
  return list.sort((a, b) => b.quality - a.quality)[0] ?? null;
}

// Selection with fallback chain.
export function selectWithFallback({ registry, modelId, task = "general" } = {}) {
  const best = selectVariant({ registry, modelId, task });
  if (best) return { variant: best, source: "quantized" };
  const fp16 = registry.variantsFor(modelId).find((v) => v.precision === "fp16" && v.available);
  return { variant: fp16 ?? null, source: fp16 ? "fp16" : "none" };
}
```

**Acceptance criteria:** thresholds; selection; fallback.

### M3 — Quality monitoring

**Reference code (`src/lib/quantization/quality.js`):**

```js
// Quality tracking: variant quality over time.
export function makeVariantQuality() {
  const samples = new Map(); // modelId:precision -> [scores]
  return {
    record(modelId, precision, score) {
      const key = `${modelId}:${precision}`;
      const list = samples.get(key) ?? [];
      list.push(score);
      samples.set(key, list.slice(-100));
    },
    quality(modelId, precision) {
      const list = samples.get(`${modelId}:${precision}`) ?? [];
      return list.length ? list.reduce((a, b) => a + b, 0) / list.length : null;
    },
    // Drift: quality drop vs baseline.
    drift(modelId, precision, baseline = 0.8) {
      const q = this.quality(modelId, precision);
      return q === null ? 0 : baseline - q;
    },
    report() { return Object.fromEntries([...samples.keys()].map((k) => [k, { quality: this.quality(...k.split(":")), drift: this.drift(...k.split(":")) }])); },
  };
}

// Alerts: degradation alerts.
export function alertCheck({ monitor, modelId, precision, threshold = 0.15 } = {}) {
  const d = monitor.drift(modelId, precision);
  return { alert: d >= threshold, drift: d };
}
```

**Acceptance criteria:** tracking; drift; alerts.

### M4 — Integration + tests

**Reference code (`src/lib/quantization/integrate.js`):**

```js
// Inference integration: variant selection.
export function variantForRequest({ registry, modelId, task = "general", monitor = null } = {}) {
  const { variant, source } = selectWithFallback({ registry, modelId, task });
  return {
    variant,
    source,
    record(score) { if (variant && monitor) monitor.record(modelId, variant.precision, score); },
  };
}

// Fail-open.
export function safeQuant(fn, fallback = null) {
  try { return fn(); } catch { return fallback; }
}
```

**Files touched:** `src/lib/quantization/` (new: registry, select, quality, integrate), `open-sse/executors/local.js` (integration), dashboard quantization page (new), `tests/unit/quantization.test.js` (new).

**Acceptance criteria:** integration; fail-open; tests.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Quality loss | Bad outputs | Thresholds |
| Variant drift | Degradation | Monitoring |
| Availability | Missing variants | Fallback |
| Complexity | Confusion | Simple defaults |

## Verification

- Unit: makeQuantRegistry, makeVariant, selectVariant, fallbackVariant, selectWithFallback, makeVariantQuality, alertCheck, variantForRequest
- Manual: int8 variant under floor → fp16 fallback
- Regression: `tests/__baseline__/verify-no-regression.mjs`