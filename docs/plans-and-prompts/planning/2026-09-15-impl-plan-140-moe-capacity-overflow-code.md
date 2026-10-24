# Implementation Plan 140 — MoE Capacity & Overflow Handling — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #moe #capacity #overflow #token-dropping #tuning #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (MoE dispatch from plan 5; expert utilization from plan 96 (`src/lib/experts/`); sparse routing from plan 101 (`src/lib/sparse/`); quantization from plan 113 (`src/lib/quant/`); model config in `open-sse/config/providerModels.js`).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — capacity model; overflow detection; tuning.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-140-moe-capacity-overflow.md`, `../research/9router/impl-plan-5-moe-aware-dispatch.md`, `../research/9router/impl-plan-96-expert-utilization-capacity.md`.

## Scope

**In scope:** capacity model (per-model capacity factor, overflow detection, token-drop impact); capacity tuning (per-model factors, expert load balancing, quality-vs-capacity monitoring); MoE-aware routing (prefer models with headroom, avoid chronic overflow, fallback on overflow); provider config + dashboard MoE view.
**Out of scope:** MoE dispatch internals (plan 5); expert utilization (plan 96).

## Milestones

### M1 — Capacity model

**Reference code (`src/lib/moe/capacity.js`):**

```js
// Capacity factor: per-model capacity config.
export const DEFAULT_CAPACITY = { factor: 1.25, maxTokens: 4096 };

// Capacity model: track usage vs capacity.
export function makeCapacityModel({ factor = 1.25, maxTokens = 4096 } = {}) {
  let used = 0;
  return {
    // Record token usage.
    record(tokens) { used += tokens; },
    // Utilization: used / (capacity).
    utilization() { return used / (maxTokens * factor); },
    // Overflow: utilization above 1.
    overflow() { return { overflow: this.utilization() > 1, ratio: this.utilization() }; },
    reset() { used = 0; },
  };
}

// Token dropping: estimate impact.
export function dropImpact({ dropped = 0, total = 0 } = {}) {
  return { rate: total ? dropped / total : 0, severe: total ? dropped / total > 0.1 : false };
}
```

**Acceptance criteria:** capacity; utilization; overflow; drop impact.

### M2 — Capacity tuning

**Reference code (`src/lib/moe/tune.js`):**

```js
// Tuning: per-model capacity factors.
export function tuneCapacity({ model, current = 1.25, overflowRate = 0, min = 1.0, max = 2.0, step = 0.05 } = {}) {
  if (overflowRate > 0.2) return Math.min(max, current + step); // raise capacity
  if (overflowRate < 0.02) return Math.max(min, current - step); // lower capacity
  return current;
}

// Load balancing: balance expert load.
export function balanceLoad({ expertLoads = [], target = 0.5 } = {}) {
  const avg = expertLoads.length ? expertLoads.reduce((a, b) => a + b, 0) / expertLoads.length : 0;
  return { balanced: Math.abs(avg - target) < 0.1, avg, imbalance: Math.abs(avg - target) };
}

// Quality monitoring: quality vs capacity.
export function qualityVsCapacity({ qualityScores = [], capacityFactors = [] } = {}) {
  return capacityFactors.map((f, i) => ({ capacity: f, quality: qualityScores[i] ?? null }));
}
```

**Acceptance criteria:** tuning; load balance; quality monitoring.

### M3 — MoE-aware routing

**Reference code (`src/lib/moe/route.js`):**

```js
// MoE-aware routing: prefer models with capacity headroom.
export function preferHeadroom(models, { utilizationOf = () => 0 } = {}) {
  return [...models].sort((a, b) => utilizationOf(a) - utilizationOf(b));
}

// Overflow avoidance: avoid models with chronic overflow.
export function avoidOverflow(models, { overflowRateOf = () => 0, threshold = 0.2 } = {}) {
  return models.filter((m) => overflowRateOf(m) < threshold);
}

// Fallback: fallback on overflow.
export function fallbackOnOverflow({ overflow = false, primary = null, fallback = null } = {}) {
  return overflow ? fallback ?? primary : primary;
}
```

**Acceptance criteria:** headroom; avoidance; fallback.

### M4 — Integration + telemetry + tests

**Reference code (`src/lib/moe/integrate.js`):**

```js
// Provider config: MoE capacity config.
export function moeConfig(models, { capacityOf = () => DEFAULT_CAPACITY } = {}) {
  return Object.fromEntries(models.map((m) => [m, capacityOf(m)]));
}

// Telemetry: MoE view.
export function makeMoeTelemetry() {
  const events = [];
  return {
    record(evt) { events.push({ ...evt, at: Date.now() }); },
    report() {
      return {
        overflows: events.filter((e) => e.overflow).length,
        drops: events.filter((e) => (e.dropRate ?? 0) > 0.1).length,
        avgUtilization: events.length ? events.reduce((a, e) => a + (e.utilization ?? 0), 0) / events.length : 0,
      };
    },
  };
}
```

**Files touched:** `src/lib/moe/` (new: capacity, tune, route, integrate), `open-sse/config/providerModels.js` (capacity config), dashboard moe page (new), `tests/unit/moe.test.js` (new).

**Acceptance criteria:** integration; telemetry; tests.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Quality loss | Dropped tokens | Overflow avoidance |
| Config complexity | Misconfiguration | Simple defaults |
| Metric noise | Bad signals | Smoothing |
| Provider opacity | No signals | Best-effort |

## Verification

- Unit: makeCapacityModel, dropImpact, tuneCapacity, balanceLoad, preferHeadroom, avoidOverflow
- Manual: chronic overflow model deprioritized; capacity factor auto-tuned
- Regression: `tests/__baseline__/verify-no-regression.mjs`