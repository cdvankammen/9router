# Implementation Plan 124 — Translator Direct Route Optimization — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #translator #direct-routes #pivot #lossless #routes #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (translators in `open-sse/translator/*`; route selection in `open-sse/translator/index.js`; per-model adaptation from plan 79; post-translation validation from plan 121 (`src/lib/divergence/`)).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — register routes; track health; generate suggestions.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-124-translator-direct-routes.md`, `../research/9router/impl-plan-8-translator-deep-dive.md`, `../research/9router/impl-plan-52-request-normalization.md`.

## Scope

**In scope:** direct route registry (source, target, translator, coverage; route gaps); route health (success/lossiness/latency per route, degradation detection, direct vs pivot comparison); route suggestions (fragile pairs → suggest direct route; fragility signals thinking blocks/tool ids/non-base64 images/is_error; manual review); translator integration + dashboard route view.
**Out of scope:** writing new translators; per-model translation internals (plan 79).

## Milestones

### M1 — Direct route registry

**Reference code (`open-sse/translator/routes.js`):**

```js
// Route model: source, target, translator, coverage.
export function makeRoute({ source, target, translator, coverage = [] } = {}) {
  return { id: `${source}:${target}`, source, target, translator, coverage };
}

export function makeRouteRegistry() {
  const routes = new Map(); // id -> route
  return {
    register(route) { routes.set(route.id, route); return route; },
    get(source, target) { return routes.get(`${source}:${target}`) ?? null; },
    // Route gaps: pairs without direct routes.
    gaps(pairs) { return pairs.filter(([s, t]) => !this.get(s, t)).map(([s, t]) => ({ source: s, target: t })); },
    // Coverage: which features each route handles.
    covers(source, target, feature) { return this.get(source, target)?.coverage.includes(feature) ?? false; },
    all() { return [...routes.values()]; },
  };
}
```

**Acceptance criteria:** registration; gaps; coverage.

### M2 — Route health

**Reference code (`open-sse/translator/health.js`):**

```js
// Route metrics: success, lossiness, latency (EWMA).
export function makeRouteHealth({ alpha = 0.1 } = {}) {
  const stats = new Map(); // routeId -> { success, lossiness, latency }
  return {
    record(routeId, { ok = true, lossy = false, latencyMs = 0 } = {}) {
      const s = stats.get(routeId) ?? { success: null, lossiness: null, latency: null };
      s.success = s.success == null ? (ok ? 1 : 0) : alpha * (ok ? 1 : 0) + (1 - alpha) * s.success;
      s.lossiness = s.lossiness == null ? (lossy ? 1 : 0) : alpha * (lossy ? 1 : 0) + (1 - alpha) * s.lossiness;
      s.latency = s.latency == null ? latencyMs : alpha * latencyMs + (1 - alpha) * s.latency;
      stats.set(routeId, s);
    },
    // Degradation: quality regression detection.
    degraded(routeId, { minSuccess = 0.7, maxLossiness = 0.2 } = {}) {
      const s = stats.get(routeId);
      if (!s) return false;
      return (s.success != null && s.success < minSuccess) || (s.lossiness != null && s.lossiness > maxLossiness);
    },
    // Comparison: direct vs pivot.
    compare(directId, pivotId) {
      const d = stats.get(directId), p = stats.get(pivotId);
      if (!d || !p) return null;
      return { directBetter: (d.success ?? 0) > (p.success ?? 0) && (d.lossiness ?? 1) < (p.lossiness ?? 1), direct, pivot: p };
    },
    report(routeId) { return stats.get(routeId) ?? null; },
  };
}
```

**Acceptance criteria:** metrics; degradation; comparison.

### M3 — Route suggestions

**Reference code (`open-sse/translator/suggest.js`):**

```js
// Fragility signals: thinking blocks, tool ids, non-base64 images, is_error.
export const FRAGILE_SIGNALS = [
  /<thinking>|reasoning/i, /tool_call|tool_use|function_call/i,
  /data:image\/(?!base64)/i, /"is_error"\s*:\s*true/i,
];

// Suggestion logic: fragile pairs → suggest direct route.
export function suggestDirectRoute({ source, target, sample, signals = FRAGILE_SIGNALS } = {}) {
  const hits = signals.filter((re) => re.test(sample ?? "")).length;
  if (hits === 0) return null;
  return { source, target, reason: "fragile-payload", signals: hits, suggested: true };
}

// Suggestion review: manual approval queue.
export function makeSuggestionQueue() {
  const queue = [];
  return {
    add(suggestion) { queue.push({ ...suggestion, status: "pending", at: Date.now() }); },
    approve(id) { const s = queue.find((x) => x.at === id); if (s) s.status = "approved"; return s; },
    reject(id) { const s = queue.find((x) => x.at === id); if (s) s.status = "rejected"; return s; },
    pending() { return queue.filter((s) => s.status === "pending"); },
  };
}
```

**Acceptance criteria:** fragility detection; suggestions; review.

### M4 — Integration + tests

**Reference code (`open-sse/translator/integrate.js`):**

```js
// Translator integration: route selection.
export function selectRoute({ registry, health, source, target, pivotId = null } = {}) {
  const direct = registry.get(source, target);
  if (!direct) return { route: null, via: "pivot", pivotId };
  if (health.degraded(direct.id)) return { route: null, via: "pivot", pivotId, reason: "degraded" };
  return { route: direct, via: "direct" };
}

// Telemetry: route view.
export function makeRouteTelemetry() {
  const events = [];
  return {
    record(evt) { events.push({ ...evt, at: Date.now() }); },
    report() {
      return {
        direct: events.filter((e) => e.via === "direct").length,
        pivot: events.filter((e) => e.via === "pivot").length,
        degraded: events.filter((e) => e.reason === "degraded").length,
      };
    },
  };
}
```

**Files touched:** `open-sse/translator/routes.js` (new), `open-sse/translator/health.js` (new), `open-sse/translator/suggest.js` (new), `open-sse/translator/index.js` (integration), `open-sse/translator/*` (route metadata), dashboard translator page (new), `tests/unit/translator-routes.test.js` (new).

**Acceptance criteria:** route selection; telemetry; tests.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Route gaps | Pivot lossiness | Coverage tracking |
| Health noise | Bad signals | EWMA |
| Bad suggestions | Wrong routes | Review workflow |
| Regression | Quality drop | Route comparison |

## Verification

- Unit: makeRouteRegistry, makeRouteHealth, suggestDirectRoute, makeSuggestionQueue, selectRoute
- Manual: fragile pair → suggestion; approve → direct route used
- Regression: `tests/__baseline__/verify-no-regression.mjs`