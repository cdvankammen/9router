# Implementation Plan 187 — Strategy Evaluation Framework — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #strategies #evaluation #selection #benchmark #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (eval harness from plan 7; cascade vs zero from plan 182 (`src/lib/comparison/`); learned routing from plan 1; strategy selection from plan 187's research).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — registry; evaluation; selection.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-187-strategy-evaluation-framework.md`, `../research/9router/impl-plan-7-eval-harness.md`, `../research/9router/impl-plan-182-cascade-vs-zero-comparison.md`.

## Scope

**In scope:** strategy registry (catalog, properties, context); evaluation framework (metrics, scenarios, methods); strategy selection (criteria, per-context, fallback).
**Out of scope:** cascade vs zero comparison (plan 182); learned routing (plan 1).

## Milestones

### M1 — Strategy registry

**Reference code (`src/lib/strategies/registry.js`):**

```js
// Strategy catalog: available strategies.
export function makeStrategyRegistry(catalog = {}) {
  return {
    // catalog: {name: {cost, quality, latency, complexity, contexts}}
    get(name) { return catalog[name] ?? null; },
    add(name, props) { catalog[name] = props; },
    all() { return catalog; },
    // Strategy context: applicable contexts.
    forContext(context) {
      return Object.entries(catalog).filter(([, p]) => !p.contexts || p.contexts.includes(context)).map(([name]) => name);
    },
  };
}

// Strategy properties.
export const DEFAULT_STRATEGY_PROPS = { cost: 1, quality: 0.8, latency: 1, complexity: 1, contexts: ["general"] };
```

**Acceptance criteria:** catalog; context.

### M2 — Evaluation framework

**Reference code (`src/lib/strategies/evaluate.js`):**

```js
// Evaluation metrics: cost, quality, latency, reliability.
export const STRATEGY_METRICS = ["cost", "quality", "latency", "reliability"];

// Evaluation scenarios: diverse query sets.
export function makeEvalScenarios() {
  const scenarios = []; // {id, queries: []}
  return {
    add(scenario) { scenarios.push(scenario); },
    all() { return scenarios; },
  };
}

// Evaluation methods: A/B, head-to-head, simulation.
export function evaluateStrategy({ strategy, results = [], metrics = STRATEGY_METRICS } = {}) {
  return {
    strategy,
    metrics: metrics.map((m) => ({ metric: m, value: results.reduce((s, r) => s + (r[m] ?? 0), 0) / (results.length || 1) })),
    score: results.reduce((s, r) => s + (r.quality ?? 0) - 0.1 * (r.cost ?? 0), 0) / (results.length || 1),
  };
}

// Head-to-head comparison.
export function headToHead({ a = {}, b = {} } = {}) {
  return { winner: a.score > b.score ? a.strategy : b.strategy, delta: a.score - b.score };
}
```

**Acceptance criteria:** metrics; scenarios; evaluation.

### M3 — Strategy selection

**Reference code (`src/lib/strategies/select.js`):**

```js
// Selection criteria: context-based selection.
export function selectStrategy({ registry, context = "general", evaluations = {} } = {}) {
  const candidates = registry.forContext(context);
  if (!candidates.length) return null;
  // Prefer evaluated best; fall back to catalog order.
  return candidates.sort((a, b) => (evaluations[b]?.score ?? 0) - (evaluations[a]?.score ?? 0))[0];
}

// Selection strategy: per-context best strategy.
export function selectPerContext({ registry, contexts = [], evaluations = {} } = {}) {
  return Object.fromEntries(contexts.map((c) => [c, selectStrategy({ registry, context: c, evaluations })]));
}

// Selection fallback: default strategy.
export function strategyFallback({ selected = null, defaults = [] } = {}) {
  return selected ?? defaults[0] ?? null;
}
```

**Acceptance criteria:** selection; per-context; fallback.

### M4 — Integration + tests

**Reference code (`src/lib/strategies/integrate.js`):**

```js
// Routing integration: strategy selection.
export function strategyFor({ registry, context = "general", evaluations = {}, defaults = [] } = {}) {
  return strategyFallback({ selected: selectStrategy({ registry, context, evaluations }), defaults });
}

// Fail-open.
export function safeStrategy(fn, fallback = null) {
  try { return fn(); } catch { return fallback; }
}
```

**Files touched:** `src/lib/strategies/` (new: registry, evaluate, select, integrate), `open-sse/handlers/chatCore.js` (strategy hooks), dashboard strategies page (new), `tests/unit/strategies.test.js` (new).

**Acceptance criteria:** integration; fail-open; tests.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Evaluation bias | Wrong winners | Standardized tests |
| Selection complexity | Confusion | Simple selection |
| Strategy drift | Stale choices | Monitoring |
| Overhead | Slow evals | Sampling |

## Verification

- Unit: makeStrategyRegistry, makeEvalScenarios, evaluateStrategy, headToHead, selectStrategy, selectPerContext, strategyFallback, strategyFor
- Manual: catalog → evaluate → select per context
- Regression: `tests/__baseline__/verify-no-regression.mjs`