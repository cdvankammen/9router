# Implementation Plan 200 — Load Balancing Strategies Deep Dive — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #load-balancing #strategies #traffic #distribution #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (provider load balancing from plan 94; strategy evaluation from plan 187 (`src/lib/strategies/`); MoE dispatch from plan 5; MoE stability from plan 178 (`src/lib/balance/`)).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — strategies; selection; tracking.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-200-load-balancing-strategies-deep.md`, `../research/9router/impl-plan-94-provider-load-balancing.md`, `../research/9router/impl-plan-187-strategy-evaluation-framework.md`.

## Scope

**In scope:** strategy registry (algorithms, properties, context); strategy selection (criteria, per-context, fallback); load tracking (metrics, aggregation, alerts).
**Out of scope:** MoE stability (plan 178); strategy evaluation (plan 187).

## Milestones

### M1 — Strategy registry

**Reference code (`src/lib/loadbalancing/strategies.js`):**

```js
// Algorithm catalog: round-robin, least-loaded, weighted, adaptive, random.
export const LB_ALGORITHMS = ["round-robin", "least-loaded", "weighted", "adaptive", "random"];

// Algorithm properties: fairness, overhead, adaptability.
export const ALGORITHM_PROPS = {
  "round-robin": { fairness: 1, overhead: 0, adaptability: 0 },
  "least-loaded": { fairness: 0.8, overhead: 0.3, adaptability: 0.5 },
  weighted: { fairness: 0.6, overhead: 0.2, adaptability: 0.3 },
  adaptive: { fairness: 0.7, overhead: 0.5, adaptability: 1 },
  random: { fairness: 0.5, overhead: 0, adaptability: 0 },
};

// Algorithm context: applicable contexts.
export const ALGORITHM_CONTEXTS = { "round-robin": ["general"], "least-loaded": ["high-load"], weighted: ["cost-sensitive"], adaptive: ["variable-load"], random: ["testing"] };

// Strategy registry.
export function makeLBRegistry() {
  return {
    algorithms() { return LB_ALGORITHMS; },
    props(algo) { return ALGORITHM_PROPS[algo] ?? ALGORITHM_PROPS["round-robin"]; },
    forContext(context) { return LB_ALGORITHMS.filter((a) => (ALGORITHM_CONTEXTS[a] ?? []).includes(context) || context === "general"); },
  };
}
```

**Acceptance criteria:** catalog; properties; context.

### M2 — Strategy selection

**Reference code (`src/lib/loadbalancing/select.js`):**

```js
// Selection criteria: context-based selection.
export function selectAlgorithm({ registry, context = "general" } = {}) {
  const candidates = registry.forContext(context);
  return candidates[0] ?? "round-robin";
}

// Selection strategy: per-context best algorithm.
export function selectPerContext({ registry, contexts = [] } = {}) {
  return Object.fromEntries(contexts.map((c) => [c, selectAlgorithm({ registry, context: c })]));
}

// Selection fallback: default algorithm.
export function algorithmFallback({ selected = null, defaults = ["round-robin"] } = {}) {
  return selected ?? defaults[0];
}
```

**Acceptance criteria:** selection; per-context; fallback.

### M3 — Load tracking

**Reference code (`src/lib/loadbalancing/track.js`):**

```js
// Load metrics: per-provider load, queue depth, latency.
export function makeLoadTracker() {
  const perProvider = new Map(); // provider -> {requests, queue, latency}
  return {
    record(provider, { queue = 0, latency = 0 } = {}) {
      const s = perProvider.get(provider) ?? { requests: 0, queue: 0, latency: 0 };
      s.requests += 1;
      s.queue = queue;
      s.latency = (s.latency * (s.requests - 1) + latency) / s.requests;
      perProvider.set(provider, s);
    },
    get(provider) { return perProvider.get(provider) ?? { requests: 0, queue: 0, latency: 0 }; },
    all() { return Object.fromEntries(perProvider); },
  };
}

// Load aggregation: provider-level, model-level, account-level.
export function aggregateLoad({ tracker, by = "provider" } = {}) {
  const all = tracker.all();
  return Object.entries(all).reduce((acc, [k, v]) => { acc[k] = v.queue + v.latency / 1000; return acc; }, {});
}

// Load alerts: load imbalance alerts.
export function loadAlert({ loads = {}, threshold = 0.5 } = {}) {
  const values = Object.values(loads);
  if (values.length < 2) return { alert: false };
  const max = Math.max(...values);
  const min = Math.min(...values);
  return { alert: max - min >= threshold, spread: max - min };
}
```

**Acceptance criteria:** metrics; aggregation; alerts.

### M4 — Integration + tests

**Reference code (`src/lib/loadbalancing/integrate.js`):**

```js
// Routing integration: load balancing hooks.
export function balanceFor({ registry, context = "general", tracker, candidates = [] } = {}) {
  const algo = selectAlgorithm({ registry, context });
  const loads = aggregateLoad({ tracker });
  // Least-loaded pick.
  return [...candidates].sort((a, b) => (loads[a] ?? 0) - (loads[b] ?? 0))[0] ?? candidates[0] ?? null;
}

// Fail-open.
export function safeLB(fn, fallback = null) {
  try { return fn(); } catch { return fallback; }
}
```

**Files touched:** `src/lib/loadbalancing/` (new: strategies, select, track, integrate), `open-sse/handlers/chatCore.js` (balancing hooks), dashboard loadbalancing page (new), `tests/unit/loadbalancing.test.js` (new).

**Acceptance criteria:** integration; fail-open; tests.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Strategy mismatch | Bad distribution | Context selection |
| Load tracking overhead | Slow paths | Sampling |
| Imbalance | Hot providers | Alerts |
| Complexity | Confusion | Simple defaults |

## Verification

- Unit: makeLBRegistry, selectAlgorithm, selectPerContext, algorithmFallback, makeLoadTracker, aggregateLoad, loadAlert, balanceFor
- Manual: track loads → select algorithm → balance
- Regression: `tests/__baseline__/verify-no-regression.mjs`