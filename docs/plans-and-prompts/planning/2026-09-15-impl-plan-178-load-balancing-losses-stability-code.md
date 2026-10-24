# Implementation Plan 178 — Load-Balancing Losses & MoE Stability — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #load-balancing #moe #stability #monitoring #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (MoE dispatch from plan 5; expert utilization from plan 96; MoE capacity from plan 140; gating mechanisms from plan 177 (`src/lib/gating/`)).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — balance model; stability routing; monitoring.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-178-load-balancing-losses-stability.md`, `../research/9router/impl-plan-5-moe-dispatch.md`, `../research/9router/impl-plan-96-expert-utilization.md`.

## Scope

**In scope:** load-balance model (metrics, tracking, thresholds); stability routing (scoring, preference, fallback); monitoring (tracking, alerts, reports).
**Out of scope:** gating mechanisms (plan 177); MoE capacity (plan 140).

## Milestones

### M1 — Load-balance model

**Reference code (`src/lib/balance/model.js`):**

```js
// Balance metrics: expert load variance.
export function loadVariance(loads = []) {
  if (!loads.length) return 0;
  const mean = loads.reduce((a, b) => a + b, 0) / loads.length;
  return loads.reduce((s, l) => s + (l - mean) ** 2, 0) / loads.length;
}

// Balance tracking: per-model balance.
export function makeBalanceTracker() {
  const perModel = new Map(); // modelId -> [loads]
  return {
    record(modelId, loads = []) {
      const list = perModel.get(modelId) ?? [];
      list.push(loadVariance(loads));
      if (list.length > 100) list.shift();
      perModel.set(modelId, list);
    },
    variance(modelId) {
      const list = perModel.get(modelId);
      return list?.length ? list[list.length - 1] : 0;
    },
    all() { return Object.fromEntries(perModel); },
  };
}

// Balance thresholds: imbalance detection.
export const BALANCE_THRESHOLDS = { imbalanced: 0.25, degraded: 0.5 };

export function balanceLevel(variance, thresholds = BALANCE_THRESHOLDS) {
  if (variance >= thresholds.degraded) return "degraded";
  if (variance >= thresholds.imbalanced) return "imbalanced";
  return "balanced";
}
```

**Acceptance criteria:** variance; tracking; thresholds.

### M2 — Stability routing

**Reference code (`src/lib/balance/stability.js`):**

```js
// Stability scoring: model stability scores.
export function stabilityScore({ variance = 0, failures = 0, requests = 1 } = {}) {
  const balance = Math.max(0, 1 - variance * 2);
  const reliability = requests ? 1 - failures / requests : 1;
  return 0.5 * balance + 0.5 * reliability;
}

// Stability routing: prefer stable models.
export function routeByStability({ tracker, candidates = [], failures = {} } = {}) {
  return candidates
    .map((m) => ({ model: m, stability: stabilityScore({ variance: tracker.variance(m), failures: failures[m] ?? 0, requests: 1 }) }))
    .sort((a, b) => b.stability - a.stability);
}

// Stability fallback: fallback on instability.
export function stabilityFallback({ stability, threshold = 0.4 } = {}) {
  return stability < threshold;
}
```

**Acceptance criteria:** scoring; routing; fallback.

### M3 — Monitoring

**Reference code (`src/lib/balance/monitor.js`):**

```js
// Balance monitoring: continuous tracking.
export function makeBalanceMonitor({ tracker, window = 50 } = {}) {
  const alerts = [];
  return {
    check(modelId) {
      const level = balanceLevel(tracker.variance(modelId));
      if (level !== "balanced") alerts.push({ modelId, level, at: Date.now() });
      return level;
    },
    // Balance alerts: imbalance alerts.
    recentAlerts({ limit = 10 } = {}) { return alerts.slice(-limit); },
    // Balance reports: periodic reports.
    report() {
      const models = Object.keys(tracker.all());
      return models.map((m) => ({ model: m, variance: tracker.variance(m), level: balanceLevel(tracker.variance(m)) }));
    },
  };
}
```

**Acceptance criteria:** monitoring; alerts; reports.

### M4 — Integration + tests

**Reference code (`src/lib/balance/integrate.js`):**

```js
// Routing integration: stability signals.
export function balanceSignal({ tracker, modelId } = {}) {
  return { variance: tracker.variance(modelId), level: balanceLevel(tracker.variance(modelId)) };
}

// Fail-open.
export function safeBalance(fn, fallback = null) {
  try { return fn(); } catch { return fallback; }
}
```

**Files touched:** `src/lib/balance/` (new: model, stability, monitor, integrate), `open-sse/handlers/chatCore.js` (integration), dashboard balance page (new), `tests/unit/balance.test.js` (new).

**Acceptance criteria:** integration; fail-open; tests.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Metric noise | Wrong levels | Smoothing |
| False alerts | Alert fatigue | Thresholds |
| Provider opacity | No load data | Best-effort |
| Complexity | Confusion | Simple model |

## Verification

- Unit: loadVariance, makeBalanceTracker, balanceLevel, stabilityScore, routeByStability, stabilityFallback, makeBalanceMonitor, balanceSignal
- Manual: record loads → detect imbalance → route around
- Regression: `tests/__baseline__/verify-no-regression.mjs`