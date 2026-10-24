# Implementation Plan 167 — Cost-Quality Plane Analysis — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #cost-quality #pareto #frontier #analysis #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (cost-quality modeling from plan 110; cost-quality foundations from plan 4; cost tiers from plan 153 (`src/lib/bands/`); request pricing from plan 165 (`src/lib/pricing/`)).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — cost-quality model; Pareto frontier; visualization.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-167-cost-quality-plane.md`, `../research/9router/impl-plan-110-cost-quality-modeling.md`, `../research/9router/impl-plan-4-cost-quality.md`.

## Scope

**In scope:** cost-quality model (cost axis, quality axis, plane surface); Pareto analysis (frontier, dominated, selection); visualization (scatter, frontier curve, strategy markers); integration.
**Out of scope:** cost tier bands (plan 153); request pricing (plan 165).

## Milestones

### M1 — Cost-quality model

**Reference code (`src/lib/cost-quality/model.js`):**

```js
// Cost-quality plane: cost vs quality surface.
export function makeCostQualityPlane() {
  const points = []; // {strategy, cost, quality, latency}
  return {
    add(point) { points.push(point); },
    all() { return points; },
    // Cost axis: per-request cost.
    // Quality axis: per-request quality.
    // Plane surface: scatter of strategies.
    surface() { return points.map((p) => ({ x: p.cost, y: p.quality, label: p.strategy })); },
  };
}

// Strategy point: cost + quality + latency.
export function strategyPoint({ strategy, cost, quality, latency } = {}) {
  return { strategy, cost, quality, latency };
}
```

**Acceptance criteria:** plane; points; surface.

### M2 — Pareto analysis

**Reference code (`src/lib/cost-quality/pareto.js`):**

```js
// Pareto frontier: optimal points (lower cost, higher quality).
export function paretoFrontier(points) {
  // Sort by cost ascending, quality descending.
  const sorted = [...points].sort((a, b) => a.cost - b.cost || b.quality - a.quality);
  const frontier = [];
  let maxQuality = -Infinity;
  for (const p of sorted) {
    if (p.quality > maxQuality) {
      frontier.push(p);
      maxQuality = p.quality;
    }
  }
  return frontier;
}

// Dominated: points not on frontier.
export function dominated(points) {
  const frontier = paretoFrontier(points);
  const frontierSet = new Set(frontier.map((p) => p.strategy));
  return points.filter((p) => !frontierSet.has(p.strategy));
}

// Selection: choose on frontier by preference.
export function selectOnFrontier({ frontier, prefer = "quality" } = {}) {
  if (!frontier.length) return null;
  return frontier.sort((a, b) => b[prefer] - a[prefer])[0];
}
```

**Acceptance criteria:** frontier; dominated; selection.

### M3 — Visualization

**Reference code (`src/lib/cost-quality/visualize.js`):**

```js
// Visualization data: scatter + frontier curve.
export function visualizationData({ plane, frontier } = {}) {
  return {
    scatter: plane.surface(),
    frontier: frontier.map((p) => ({ x: p.cost, y: p.quality, label: p.strategy })),
    // Strategy markers: all strategies.
    strategies: plane.all().map((p) => ({ x: p.cost, y: p.quality, label: p.strategy, onFrontier: frontier.some((f) => f.strategy === p.strategy) })),
  };
}

// Plot config for dashboard.
export function plotConfig() {
  return {
    x: { label: "Cost per request (USD)", scale: "log" },
    y: { label: "Quality (0-1)", scale: "linear" },
    series: ["scatter", "frontier"],
  };
}
```

**Acceptance criteria:** scatter; frontier; config.

### M4 — Integration + tests

**Reference code (`src/lib/cost-quality/integrate.js`):**

```js
// Routing integration: frontier routing.
export function frontierRoute({ plane, frontier, prefer = "quality", candidates = [] } = {}) {
  const best = selectOnFrontier({ frontier, prefer });
  if (!best) return { model: candidates[0] ?? null, reason: "no-frontier" };
  return { model: best.strategy, reason: "frontier" };
}

// Fail-open.
export function safeCostQuality(fn, fallback = null) {
  try { return fn(); } catch { return fallback; }
}
```

**Files touched:** `src/lib/cost-quality/` (new: model, pareto, visualize, integrate), `open-sse/handlers/chatCore.js` (frontier routing), dashboard cost-quality page (new), `tests/unit/cost-quality.test.js` (new).

**Acceptance criteria:** integration; fail-open; tests.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Sparse data | Empty frontier | Synthetic fill |
| Frontier drift | Stale routing | Recomputation |
| Complexity | Confusion | Simple model |
| Stale analysis | Wrong decisions | Periodic refresh |

## Verification

- Unit: makeCostQualityPlane, strategyPoint, paretoFrontier, dominated, selectOnFrontier, visualizationData, plotConfig, frontierRoute
- Manual: add strategies → frontier → route
- Regression: `tests/__baseline__/verify-no-regression.mjs`