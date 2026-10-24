# Implementation Plan 177 — Gating Mechanisms & Top-K Gating — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #gating #top-k #moe #routing #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (MoE dispatch from plan 5; MoE capacity from plan 140; expert utilization from plan 96; sparse routing from plan 101).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — gating model; routing; tuning.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-177-gating-mechanisms-topk.md`, `../research/9router/impl-plan-5-moe-dispatch.md`, `../research/9router/impl-plan-140-moe-capacity.md`.

## Scope

**In scope:** gating model (parameters, behavior, registry); gating-aware routing (quality, preference, fallback); gating tuning (top-k tuning, evaluation, registry).
**Out of scope:** load-balancing losses (plan 178); expert specialization.

## Milestones

### M1 — Gating model

**Reference code (`src/lib/gating/model.js`):**

```js
// Gating parameters: top-k, temperature, capacity.
export const DEFAULT_GATING = { topK: 2, temperature: 1.0, capacity: 1.0 };

// Gating behavior: per-model gating stats.
export function makeGatingStats() {
  const stats = new Map(); // modelId -> {requests, avgTopK, failures}
  return {
    record(modelId, { topK = 2, ok = true } = {}) {
      const s = stats.get(modelId) ?? { requests: 0, avgTopK: 0, failures: 0 };
      s.requests += 1;
      s.avgTopK = (s.avgTopK * (s.requests - 1) + topK) / s.requests;
      if (!ok) s.failures += 1;
      stats.set(modelId, s);
    },
    get(modelId) { return stats.get(modelId) ?? { requests: 0, avgTopK: 0, failures: 0 }; },
    all() { return Object.fromEntries(stats); },
  };
}

// Gating registry: gating configs.
export function makeGatingRegistry(configs = {}) {
  return {
    config(modelId) { return { ...DEFAULT_GATING, ...configs[modelId] }; },
    set(modelId, config) { configs[modelId] = config; },
    all() { return configs; },
  };
}
```

**Acceptance criteria:** parameters; stats; registry.

### M2 — Gating-aware routing

**Reference code (`src/lib/gating/route.js`):**

```js
// Gating quality: quality metrics from gating stats.
export function gatingQuality({ stats, modelId } = {}) {
  const s = stats.get(modelId);
  if (!s || s.requests < 5) return 0.5; // neutral
  const failureRate = s.failures / s.requests;
  return Math.max(0, 1 - failureRate * 2);
}

// Gating routing: prefer good gating.
export function routeByGating({ stats, candidates = [] } = {}) {
  return candidates
    .map((m) => ({ model: m, quality: gatingQuality({ stats, modelId: m }) }))
    .sort((a, b) => b.quality - a.quality);
}

// Gating fallback: fallback on gating issues.
export function gatingFallback({ stats, modelId, threshold = 0.3 } = {}) {
  return gatingQuality({ stats, modelId }) < threshold;
}
```

**Acceptance criteria:** quality; routing; fallback.

### M3 — Gating tuning

**Reference code (`src/lib/gating/tune.js`):**

```js
// Parameter tuning: top-k tuning.
export function tuneTopK({ stats, modelId, range = [1, 2, 4, 8] } = {}) {
  const s = stats.get(modelId);
  if (!s || s.requests < 10) return null; // not enough data
  return { modelId, bestTopK: range[Math.min(range.length - 1, Math.round(s.avgTopK))], current: s.avgTopK };
}

// Tuning evaluation: quality impact.
export function evaluateTuning({ before = 0.5, after = 0.5 } = {}) {
  return { improved: after > before, delta: after - before };
}

// Tuning registry: tuned configs.
export function makeTuningRegistry() {
  const tuned = new Map();
  return {
    set(modelId, config) { tuned.set(modelId, config); },
    get(modelId) { return tuned.get(modelId) ?? null; },
    all() { return Object.fromEntries(tuned); },
  };
}
```

**Acceptance criteria:** tuning; evaluation; registry.

### M4 — Integration + tests

**Reference code (`src/lib/gating/integrate.js`):**

```js
// Provider config: gating config.
export function gatingConfig({ registry, modelId } = {}) {
  return registry.config(modelId);
}

// Fail-open.
export function safeGating(fn, fallback = null) {
  try { return fn(); } catch { return fallback; }
}
```

**Files touched:** `src/lib/gating/` (new: model, route, tune, integrate), `open-sse/config/providerModels.js` (gating config), dashboard gating page (new), `tests/unit/gating.test.js` (new).

**Acceptance criteria:** integration; fail-open; tests.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Provider opacity | No gating data | Best-effort |
| Tuning risk | Worse quality | Evaluation |
| Complexity | Confusion | Simple defaults |
| Metric noise | Noisy quality | Smoothing |

## Verification

- Unit: makeGatingStats, makeGatingRegistry, gatingQuality, routeByGating, gatingFallback, tuneTopK, evaluateTuning, makeTuningRegistry, gatingConfig
- Manual: record stats → route by gating → tune
- Regression: `tests/__baseline__/verify-no-regression.mjs`