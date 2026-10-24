# Implementation Plan 153 — Cost Tier Bands & Classification — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #cost #bands #tiers #budgets #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (cost tracking from plan 45 (`src/lib/usageDb.js` + quota tracking); quality tiers from plan 97; cost heuristics from plan 87; cost-quality modeling from plan 110; model pricing in `open-sse/config/providerModels.js`).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — band assignment; band routing; budget enforcement.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-153-cost-tier-bands.md`, `../research/9router/impl-plan-45-cost-tracking.md`, `../research/9router/impl-plan-97-quality-tiers.md`.

## Scope

**In scope:** band model (free/cheap/medium/expensive, price ranges); band assignment (per-model, validation); band routing (within band, escalation, budgets); reporting.
**Out of scope:** cost heuristics internals (plan 87); cost-quality modeling (plan 110).

## Milestones

### M1 — Band model

**Reference code (`src/lib/bands/model.js`):**

```js
// Cost tier bands: free/cheap/medium/expensive.
export const BANDS = ["free", "cheap", "medium", "expensive"];

// Price ranges (per 1M tokens, USD).
export const BAND_RANGES = {
  free: { min: 0, max: 0 },
  cheap: { min: 0, max: 1 },
  medium: { min: 1, max: 10 },
  expensive: { min: 10, max: Infinity },
};

// Band for a price.
export function bandForPrice(price) {
  for (const band of BANDS) {
    const r = BAND_RANGES[band];
    if (price >= r.min && price < r.max) return band;
  }
  return "expensive";
}

// Band ordering (for escalation).
export const BAND_ORDER = { free: 0, cheap: 1, medium: 2, expensive: 3 };

export function escalateBand(band) {
  const next = BAND_ORDER[band] + 1;
  return BANDS[Math.min(next, BANDS.length - 1)];
}
```

**Acceptance criteria:** ranges; assignment; escalation.

### M2 — Band assignment

**Reference code (`src/lib/bands/assign.js`):**

```js
// Band assignment: per-model band.
export function makeBandRegistry() {
  const bands = new Map(); // modelId -> band
  return {
    set(modelId, band) { bands.set(modelId, band); },
    get(modelId, fallback = "medium") { return bands.get(modelId) ?? fallback; },
    // Auto-assign from price.
    assign(modelId, price) { const b = bandForPrice(price); bands.set(modelId, b); return b; },
    // Validation: is the assignment consistent with price?
    validate(modelId, price) {
      const expected = bandForPrice(price);
      const actual = this.get(modelId);
      return { ok: actual === expected, expected, actual };
    },
    all() { return Object.fromEntries(bands); },
  };
}

// Bulk assignment from pricing table.
export function assignAll({ registry, pricing = {} } = {}) {
  const results = {};
  for (const [modelId, price] of Object.entries(pricing)) {
    results[modelId] = registry.assign(modelId, price);
  }
  return results;
}
```

**Acceptance criteria:** registry; auto-assign; validation.

### M3 — Band routing

**Reference code (`src/lib/bands/route.js`):**

```js
// Band routing: route within band.
export function withinBand({ registry, band, candidates = [] } = {}) {
  return candidates.filter((m) => registry.get(m) === band);
}

// Escalation: move to next band when needed.
export function escalate({ registry, from = "cheap", candidates = [] } = {}) {
  const target = escalateBand(from);
  return { band: target, models: withinBand({ registry, band: target, candidates }) };
}

// Band budgets: per-band spend caps.
export function makeBandBudget({ caps = {} } = {}) {
  const spent = new Map();
  return {
    spend(band, amount) {
      const total = (spent.get(band) ?? 0) + amount;
      spent.set(band, total);
      return total <= (caps[band] ?? Infinity);
    },
    remaining(band) { return (caps[band] ?? Infinity) - (spent.get(band) ?? 0); },
    report() { return Object.fromEntries(spent); },
  };
}

// Band-aware selection: prefer cheapest band with candidates.
export function selectInBand({ registry, candidates = [], maxBand = "expensive" } = {}) {
  for (const band of BANDS) {
    if (BAND_ORDER[band] > BAND_ORDER[maxBand]) break;
    const models = withinBand({ registry, band, candidates });
    if (models.length) return { band, model: models[0] };
  }
  return { band: null, model: null };
}
```

**Acceptance criteria:** within-band; escalation; budgets; selection.

### M4 — Integration + tests

**Reference code (`src/lib/bands/integrate.js`):**

```js
// Routing integration: band-aware routing.
export function bandAwarePick({ registry, budget, candidates = [], maxBand = "expensive" } = {}) {
  const { band, model } = selectInBand({ registry, candidates, maxBand });
  if (!model) return { model: null, reason: "no-candidates" };
  if (budget.remaining(band) <= 0) return { model: null, reason: "budget-exhausted" };
  return { model, band, reason: "ok" };
}

// Fail-open.
export function safeBand(fn, fallback = null) {
  try { return fn(); } catch { return fallback; }
}
```

**Files touched:** `src/lib/bands/` (new: model, assign, route, integrate), `open-sse/config/providerModels.js` (band config), dashboard bands page (new), `tests/unit/bands.test.js` (new).

**Acceptance criteria:** integration; fail-open; tests.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Band drift | Wrong classification | Validation |
| Budget overrun | Overspend | Enforcement |
| Pricing changes | Stale bands | Updates |
| Complexity | Confusion | Simple bands |

## Verification

- Unit: bandForPrice, escalateBand, makeBandRegistry, withinBand, escalate, makeBandBudget, selectInBand, bandAwarePick
- Manual: price → band; budget cap → exhausted
- Regression: `tests/__baseline__/verify-no-regression.mjs`