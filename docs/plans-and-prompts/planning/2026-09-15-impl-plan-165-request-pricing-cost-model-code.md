# Implementation Plan 165 — Request Pricing & Cost Model — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #pricing #cost #tokens #prediction #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (cost tracking from plan 45 (`src/lib/usageDb.js` + quota tracking); cost heuristics from plan 87; cost-quality modeling from plan 110; usage repo in `src/lib/db/repos/`).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — pricing model; cost tracking; prediction.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-165-request-pricing-cost-model.md`, `../research/9router/impl-plan-45-cost-tracking.md`, `../research/9router/impl-plan-87-cost-heuristics.md`.

## Scope

**In scope:** pricing model (token rates, request rates, updates); cost tracking (per-request, per-conversation, per-user); cost prediction (pre-request estimate, post-request actual, variance); integration.
**Out of scope:** cost tier bands (plan 153); cost-quality modeling (plan 110).

## Milestones

### M1 — Pricing model

**Reference code (`src/lib/pricing/model.js`):**

```js
// Pricing model: token rates per model.
export function makePricingModel() {
  const rates = new Map(); // modelId -> {input, output, fixed}
  return {
    set(modelId, rate) { rates.set(modelId, rate); },
    get(modelId) { return rates.get(modelId) ?? { input: 0, output: 0, fixed: 0 }; },
    // Per-request cost: tokens × rate.
    costOf({ modelId, inputTokens = 0, outputTokens = 0 } = {}) {
      const r = this.get(modelId);
      return r.input * inputTokens + r.output * outputTokens + (r.fixed ?? 0);
    },
    // Rate updates: refresh pricing.
    update(modelId, patch) {
      const r = this.get(modelId);
      rates.set(modelId, { ...r, ...patch });
      return this.get(modelId);
    },
    all() { return Object.fromEntries(rates); },
  };
}

// Token rates (per 1M tokens, USD) — example defaults.
export const DEFAULT_RATES = {
  "gpt-4o": { input: 2.5, output: 10 },
  "gpt-4o-mini": { input: 0.15, output: 0.6 },
  "claude-sonnet-4": { input: 3, output: 15 },
};
```

**Acceptance criteria:** rates; costOf; updates.

### M2 — Cost tracking

**Reference code (`src/lib/pricing/track.js`):**

```js
// Cost tracking: per-request, per-conversation, per-user.
export function makeCostTracker() {
  const requests = [];
  return {
    record({ modelId, inputTokens = 0, outputTokens = 0, conversation = null, user = null, pricing } = {}) {
      const cost = pricing.costOf({ modelId, inputTokens, outputTokens });
      const entry = { modelId, inputTokens, outputTokens, cost, conversation, user, at: Date.now() };
      requests.push(entry);
      return entry;
    },
    // Per-conversation aggregate.
    conversationCost(conversation) {
      return requests.filter((r) => r.conversation === conversation).reduce((s, r) => s + r.cost, 0);
    },
    // Per-user/org aggregate.
    userCost(user) {
      return requests.filter((r) => r.user === user).reduce((s, r) => s + r.cost, 0);
    },
    total() { return requests.reduce((s, r) => s + r.cost, 0); },
    report() { return { total: this.total(), requests: requests.length }; },
  };
}

// Budgets: per-user/org caps.
export function makeBudget({ caps = {} } = {}) {
  const spent = new Map();
  return {
    spend(user, amount) {
      const total = (spent.get(user) ?? 0) + amount;
      spent.set(user, total);
      return total <= (caps[user] ?? Infinity);
    },
    remaining(user) { return (caps[user] ?? Infinity) - (spent.get(user) ?? 0); },
    report() { return Object.fromEntries(spent); },
  };
}
```

**Acceptance criteria:** tracking; aggregates; budgets.

### M3 — Cost prediction

**Reference code (`src/lib/pricing/predict.js`):**

```js
// Cost prediction: pre-request estimate.
export function estimateCost({ modelId, estimatedInput = 0, estimatedOutput = 0, pricing } = {}) {
  return pricing.costOf({ modelId, inputTokens: estimatedInput, outputTokens: estimatedOutput });
}

// Variance: estimate vs actual.
export function costVariance({ estimated = 0, actual = 0 } = {}) {
  return { variance: actual - estimated, ratio: estimated ? actual / estimated : null };
}

// Historical trends: EWMA of costs.
export function makeCostTrend({ alpha = 0.1 } = {}) {
  let ewma = null;
  return {
    update(cost) { ewma = ewma === null ? cost : alpha * cost + (1 - alpha) * ewma; return ewma; },
    value() { return ewma; },
  };
}

// Prediction: next request cost from history.
export function predictNext({ trend, modelId, pricing, avgTokens = 1000 } = {}) {
  const base = trend.value() ?? pricing.costOf({ modelId, inputTokens: avgTokens, outputTokens: avgTokens });
  return base;
}
```

**Acceptance criteria:** estimate; variance; trend.

### M4 — Integration + tests

**Reference code (`src/lib/pricing/integrate.js`):**

```js
// Routing integration: cost predictions.
export function costAwarePick({ candidates = [], pricing, budget, user = null, maxCost = Infinity } = {}) {
  const feasible = candidates.filter((m) => pricing.get(m).input <= maxCost);
  if (!feasible.length) return { model: null, reason: "over-budget" };
  const model = feasible.sort((a, b) => pricing.get(a).input - pricing.get(b).input)[0];
  if (user && budget.remaining(user) <= 0) return { model: null, reason: "budget-exhausted" };
  return { model, reason: "ok" };
}

// Fail-open.
export function safePricing(fn, fallback = null) {
  try { return fn(); } catch { return fallback; }
}
```

**Files touched:** `src/lib/pricing/` (new: model, track, predict, integrate), `src/lib/db/repos/usage.js` (integration), dashboard pricing page (new), `tests/unit/pricing.test.js` (new).

**Acceptance criteria:** integration; fail-open; tests.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Stale pricing | Wrong costs | Auto-refresh |
| Prediction error | Bad estimates | Variance tracking |
| Complexity | Confusion | Simple defaults |
| Provider changes | Rate drift | Rate updates |

## Verification

- Unit: makePricingModel, costOf, makeCostTracker, makeBudget, estimateCost, costVariance, makeCostTrend, predictNext, costAwarePick
- Manual: request → cost; estimate vs actual
- Regression: `tests/__baseline__/verify-no-regression.mjs`