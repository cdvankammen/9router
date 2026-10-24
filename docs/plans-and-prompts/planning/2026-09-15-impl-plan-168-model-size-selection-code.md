# Implementation Plan 168 — Model Size Selection & Scaling — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #model-size #scaling #difficulty #routing #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (quality tiers from plan 97; cost heuristics from plan 87; cost-quality plane from plan 167 (`src/lib/cost-quality/`); cost-quality foundations from plan 4).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — size model; difficulty estimation; size routing.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-168-model-size-selection.md`, `../research/9router/impl-plan-97-quality-tiers.md`, `../research/9router/impl-plan-87-cost-heuristics.md`.

## Scope

**In scope:** size model (tiers, properties, registry); difficulty estimation (signals, score, thresholds); size routing (difficulty → size mapping, fallback, adaptation); integration.
**Out of scope:** quality tiers (plan 97); cost heuristics (plan 87).

## Milestones

### M1 — Size model

**Reference code (`src/lib/sizes/model.js`):**

```js
// Size tiers: small, medium, large, xlarge.
export const SIZES = ["small", "medium", "large", "xlarge"];

// Size properties: cost, speed, quality.
export const SIZE_PROPS = {
  small: { cost: 0.1, speed: 10, quality: 0.6 },
  medium: { cost: 1, speed: 5, quality: 0.8 },
  large: { cost: 10, speed: 2, quality: 0.9 },
  xlarge: { cost: 50, speed: 1, quality: 0.95 },
};

// Size registry: per-model size.
export function makeSizeRegistry() {
  const sizes = new Map(); // modelId -> size
  return {
    set(modelId, size) { sizes.set(modelId, size); },
    get(modelId, fallback = "medium") { return sizes.get(modelId) ?? fallback; },
    modelsFor(size) { return [...sizes.entries()].filter(([, s]) => s === size).map(([m]) => m); },
    all() { return Object.fromEntries(sizes); },
  };
}
```

**Acceptance criteria:** tiers; properties; registry.

### M2 — Difficulty estimation

**Reference code (`src/lib/sizes/difficulty.js`):**

```js
// Difficulty signals: length, complexity, domain.
export function difficultySignals({ text = "", domain = "general", hasImage = false } = {}) {
  const length = text.length;
  const complexity = (text.match(/[{}()\[\];]/g) ?? []).length + (text.match(/\b(if|for|while|function|class)\b/gi) ?? []).length;
  const domainWeight = { code: 1.2, math: 1.3, vision: 1.1, general: 1, chat: 0.8 }[domain] ?? 1;
  return { length, complexity, domainWeight, hasImage };
}

// Difficulty score: calibrated difficulty.
export function difficultyScore({ signals = {}, weights = { length: 0.3, complexity: 0.5, domain: 0.2 } } = {}) {
  const { length = 0, complexity = 0, domainWeight = 1, hasImage = false } = signals;
  const lenScore = Math.min(1, length / 5000);
  const compScore = Math.min(1, complexity / 20);
  const domScore = Math.min(1, (domainWeight - 0.8) / 0.5);
  const imgScore = hasImage ? 0.3 : 0;
  return weights.length * lenScore + weights.complexity * compScore + weights.domain * domScore + imgScore;
}

// Difficulty thresholds: size thresholds.
export const SIZE_THRESHOLDS = { small: 0.3, medium: 0.55, large: 0.75, xlarge: 1 };

export function sizeForDifficulty(score) {
  if (score <= SIZE_THRESHOLDS.small) return "small";
  if (score <= SIZE_THRESHOLDS.medium) return "medium";
  if (score <= SIZE_THRESHOLDS.large) return "large";
  return "xlarge";
}
```

**Acceptance criteria:** signals; score; thresholds.

### M3 — Size routing

**Reference code (`src/lib/sizes/route.js`):**

```js
// Difficulty → size mapping.
export function selectSize({ registry, difficulty = 0.5, candidates = [] } = {}) {
  const size = sizeForDifficulty(difficulty);
  const models = registry.modelsFor(size).filter((m) => candidates.includes(m));
  return models.length ? models : candidates; // fallback to candidates
}

// Fallback: escalate on failure.
export function escalateSize({ registry, currentSize = "medium", candidates = [] } = {}) {
  const idx = SIZES.indexOf(currentSize);
  for (let i = idx + 1; i < SIZES.length; i++) {
    const models = registry.modelsFor(SIZES[i]).filter((m) => candidates.includes(m));
    if (models.length) return models;
  }
  return candidates;
}

// Adaptation: adjust thresholds from outcomes.
export function adaptThresholds({ thresholds = SIZE_THRESHOLDS, outcome = "success", alpha = 0.05 } = {}) {
  // If success on small, lower threshold; if failure on large, raise.
  const next = { ...thresholds };
  if (outcome === "success") next.small = Math.max(0.1, thresholds.small - alpha);
  if (outcome === "failure") next.large = Math.min(0.95, thresholds.large + alpha);
  return next;
}
```

**Acceptance criteria:** mapping; escalation; adaptation.

### M4 — Integration + tests

**Reference code (`src/lib/sizes/integrate.js`):**

```js
// Routing integration: size selection.
export function routeBySize({ text = "", domain = "general", hasImage = false, registry, candidates = [] } = {}) {
  const signals = difficultySignals({ text, domain, hasImage });
  const score = difficultyScore({ signals });
  const models = selectSize({ registry, difficulty: score, candidates });
  return { size: sizeForDifficulty(score), score, models };
}

// Observability: size metrics.
export function makeSizeTelemetry() {
  const counts = new Map();
  return {
    record(size) { counts.set(size, (counts.get(size) ?? 0) + 1); },
    report() { return Object.fromEntries(counts); },
  };
}

// Fail-open.
export function safeSize(fn, fallback = null) {
  try { return fn(); } catch { return fallback; }
}
```

**Files touched:** `src/lib/sizes/` (new: model, difficulty, route, integrate), `open-sse/handlers/chatCore.js` (integration), dashboard sizes page (new), `tests/unit/sizes.test.js` (new).

**Acceptance criteria:** integration; telemetry; tests.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Misestimation | Wrong size | Calibration |
| Quality loss | Small model fails | Fallback |
| Threshold drift | Suboptimal | Tuning |
| Complexity | Confusion | Simple tiers |

## Verification

- Unit: makeSizeRegistry, difficultySignals, difficultyScore, sizeForDifficulty, selectSize, escalateSize, adaptThresholds, routeBySize, makeSizeTelemetry
- Manual: simple query → small model; complex → large
- Regression: `tests/__baseline__/verify-no-regression.mjs`