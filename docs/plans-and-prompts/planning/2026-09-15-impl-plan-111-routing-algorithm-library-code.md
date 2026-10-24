# Implementation Plan 111 — Routing Algorithm Library (Selection & Coordination) — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #algorithms #selection #coordination #decision-rules #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (cascade from plan 90 (`src/lib/cascade/`); panel from plan 99 (`src/lib/panel/`); calibration from plan 82 (`src/lib/calibration/`); rule engine from plan 88 (`src/lib/rules/`)).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — run each selection algorithm; run coordination; compose rules; confirm default preserves current behavior.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-111-routing-algorithm-library.md`, `../research/9router/impl-plan-90-cascade-coordination-strategy.md`, `../research/9router/impl-plan-88-routing-rule-engine-v2.md`.

## Scope

**In scope:** selection algorithms (top1, threshold, weighted, cascade, panel, learned); coordination algorithms (round_robin, least_loaded, sticky, health, hybrid); decision rules (AND/OR/NOT composition, hard requirements, soft preferences); per-route algorithm config with validation; A/B comparison support; routing integration + dashboard.
**Out of scope:** learning new algorithms (uses existing learned weights from plan 108); distributed coordination state (plan 70).

## Milestones

### M1 — Algorithm registry

**Reference code (`src/lib/algorithms/registry.js`):**

```js
// Algorithm registry: named selection + coordination algorithms.
export const SELECTION = new Map();
export const COORDINATION = new Map();

export function registerSelection(name, fn) { SELECTION.set(name, fn); }
export function registerCoordination(name, fn) { COORDINATION.set(name, fn); }

export function selectionFor(name) { return SELECTION.get(name) ?? SELECTION.get("top1"); }
export function coordinationFor(name) { return COORDINATION.get(name) ?? COORDINATION.get("round_robin"); }

// Validation: valid algorithm configs.
export function validateAlgorithmConfig({ selection, coordination, params = {} } = {}) {
  if (!SELECTION.has(selection)) return { ok: false, reason: `unknown-selection:${selection}` };
  if (!COORDINATION.has(coordination)) return { ok: false, reason: `unknown-coordination:${coordination}` };
  return { ok: true };
}
```

**Acceptance criteria:** registry; defaults; validation.

### M2 — Selection algorithms

**Reference code (`src/lib/algorithms/selection.js`):**

```js
// Selection algorithms over scored candidates.
export function top1(candidates) {
  return [...candidates].sort((a, b) => b.score - a.score)[0] ?? null;
}

export function threshold(candidates, { minScore = 0.6 } = {}) {
  return candidates.find((c) => c.score >= minScore) ?? null;
}

export function weighted(candidates, { rand = Math.random } = {}) {
  const total = candidates.reduce((a, c) => a + Math.max(0, c.score), 0);
  if (!total) return candidates[0] ?? null;
  let r = rand() * total;
  for (const c of candidates) { r -= Math.max(0, c.score); if (r <= 0) return c; }
  return candidates.at(-1);
}

export function cascade(candidates, { call, fallbackOnError = true } = {}) {
  for (const c of candidates) {
    try { return { model: c.model, result: call(c) }; }
    catch (err) { if (!fallbackOnError) throw err; }
  }
  return null;
}

export function panel(candidates, { run, merge }) {
  return run(candidates, merge);
}

export function learned(candidates, { scoreOf }) {
  return [...candidates].sort((a, b) => scoreOf(b) - scoreOf(a))[0] ?? null;
}
```

**Acceptance criteria:** six algorithms implemented.

### M3 — Coordination algorithms

**Reference code (`src/lib/algorithms/coordination.js`):**

```js
// Coordination algorithms across models.
export function roundRobin({ providers, state = { i: 0 } } = {}) {
  const p = providers[state.i % providers.length];
  state.i += 1;
  return p ?? null;
}

export function leastLoaded({ providers, inflightOf } = {}) {
  return [...providers].sort((a, b) => inflightOf(a) - inflightOf(b))[0] ?? null;
}

export function sticky({ providers, sessionKey, stickyMap = new Map() } = {}) {
  const prev = stickyMap.get(sessionKey);
  if (prev && providers.includes(prev)) return prev;
  const pick = providers[0] ?? null;
  if (pick) stickyMap.set(sessionKey, pick);
  return pick;
}

export function healthWeighted({ providers, healthOf, rand = Math.random } = {}) {
  const total = providers.reduce((a, p) => a + Math.max(0, healthOf(p)), 0);
  if (!total) return providers[0] ?? null;
  let r = rand() * total;
  for (const p of providers) { r -= Math.max(0, healthOf(p)); if (r <= 0) return p; }
  return providers.at(-1);
}

export function hybrid({ providers, pickers, state = {} } = {}) {
  for (const picker of pickers) {
    const p = picker({ providers, state });
    if (p) return p;
  }
  return providers[0] ?? null;
}
```

**Acceptance criteria:** five coordination algorithms.

### M4 — Decision rules + integration + tests

**Reference code (`src/lib/algorithms/rules.js`):**

```js
// Rule composition: AND/OR/NOT.
export function andRules(rules) { return (ctx) => rules.every((r) => r(ctx)); }
export function orRules(rules) { return (ctx) => rules.some((r) => r(ctx)); }
export function notRule(rule) { return (ctx) => !rule(ctx); }

// Hard requirements: mandatory constraints.
export function hardRequirement({ name, check }) {
  return { name, hard: true, matches: check };
}

// Soft preferences: weighted preferences.
export function softPreference({ name, check, weight = 1 }) {
  return { name, hard: false, weight, matches: check };
}

// Dispatch: per-route algorithm.
export function dispatch({ route, configs = {}, context } = {}) {
  const cfg = configs[route] ?? { selection: "top1", coordination: "round_robin" };
  const v = validateAlgorithmConfig(cfg);
  if (!v.ok) return { ok: false, reason: v.reason };
  return { ok: true, selection: selectionFor(cfg.selection), coordination: coordinationFor(cfg.coordination), params: cfg.params ?? {} };
}
```

**Files touched:** `src/lib/algorithms/` (new: registry, selection, coordination, rules), `src/sse/handlers/chat.js` (algorithm dispatch), `open-sse/config/algorithmConfig.js` (new), dashboard algorithms page (new), `tests/unit/algorithms.test.js` (new).

**Acceptance criteria:** all algorithms; per-route config; A/B comparable; default = current behavior.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Algorithm bugs | Wrong picks | Per-algorithm tests |
| Config errors | Broken routes | Validation |
| Behavior change | Regressions | Default = current behavior |
| Comparison noise | Wrong conclusions | A/B framework |

## Verification

- Unit: top1, threshold, weighted, roundRobin, leastLoaded, andRules, dispatch
- Manual: route with threshold algorithm → first above threshold picked
- Regression: `tests/__baseline__/verify-no-regression.mjs`