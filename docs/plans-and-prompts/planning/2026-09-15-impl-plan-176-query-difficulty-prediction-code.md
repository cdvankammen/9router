# Implementation Plan 176 — Query Difficulty Prediction — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #difficulty #prediction #routing #calibration #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (model size selection from plan 168 (`src/lib/sizes/`); threshold calibration from plan 171 (`src/lib/calibration/`); cost heuristics from plan 87; quality tiers from plan 97).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — difficulty model; routing; calibration.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-176-query-difficulty-prediction.md`, `../research/9router/impl-plan-168-model-size-selection.md`, `../research/9router/impl-plan-171-threshold-calibration-pipeline.md`.

## Scope

**In scope:** difficulty model (signals, score, features); difficulty-based routing (tiers, mapping, fallback); calibration (data, method, drift).
**Out of scope:** model size selection (plan 168); quality tiers (plan 97).

## Milestones

### M1 — Difficulty model

**Reference code (`src/lib/difficulty/model.js`):**

```js
// Difficulty signals: length, complexity, domain, novelty.
export function difficultySignals({ text = "", domain = "general", novelty = 0.5 } = {}) {
  const length = Math.min(1, text.length / 4000);
  const complexity = (text.match(/```/g)?.length ?? 0) * 0.1 + (text.match(/[=+\-*/^]/g)?.length ?? 0) * 0.02;
  const domainWeight = { math: 0.3, code: 0.2, general: 0, research: 0.1 }[domain] ?? 0;
  return { length, complexity: Math.min(1, complexity), domain: domainWeight, novelty };
}

// Difficulty score: 0-1 calibrated.
export function difficultyScore({ signals = {}, weights = { length: 0.3, complexity: 0.4, domain: 0.1, novelty: 0.2 } } = {}) {
  return Object.entries(weights).reduce((s, [k, w]) => s + w * (signals[k] ?? 0), 0);
}

// Difficulty features: extracted features.
export function difficultyFeatures({ text = "" } = {}) {
  return {
    length: text.length,
    codeBlocks: (text.match(/```/g)?.length ?? 0) / 2,
    mathOps: (text.match(/[=+\-*/^]/g)?.length ?? 0),
    questions: (text.match(/\?/g)?.length ?? 0),
    steps: (text.match(/\b(first|then|next|finally)\b/g)?.length ?? 0),
  };
}
```

**Acceptance criteria:** signals; score; features.

### M2 — Difficulty-based routing

**Reference code (`src/lib/difficulty/route.js`):**

```js
// Difficulty tiers: easy/medium/hard.
export const DIFFICULTY_TIERS = [
  { tier: "easy", max: 0.4 },
  { tier: "medium", max: 0.7 },
  { tier: "hard", max: 1.01 },
];

export function tierFor(score, tiers = DIFFICULTY_TIERS) {
  return tiers.find((t) => score < t.max)?.tier ?? "hard";
}

// Tier mapping: difficulty → model tier.
export const TIER_MODELS = { easy: ["gpt-4o-mini", "claude-3-5-haiku"], medium: ["gpt-4o", "claude-3-5-sonnet"], hard: ["o1", "claude-opus"] };

export function modelsForTier(tier, mapping = TIER_MODELS) {
  return mapping[tier] ?? mapping.medium;
}

// Tier fallback: escalate on failure.
export function escalateTier(tier, tiers = ["easy", "medium", "hard"]) {
  const idx = tiers.indexOf(tier);
  return tiers[idx + 1] ?? tier;
}
```

**Acceptance criteria:** tiers; mapping; fallback.

### M3 — Calibration

**Reference code (`src/lib/difficulty/calibrate.js`):**

```js
// Calibration data: difficulty labels.
export function makeDifficultyData() {
  const examples = []; // {features, label: 0|1}
  return {
    add(example) { examples.push(example); },
    all() { return examples; },
  };
}

// Calibration method: threshold optimization.
export function optimizeThreshold({ data = [], metric = (t, d) => d.filter((x) => x.label === (x.score >= t)).length / (d.length || 1), range = [0.2, 0.8], steps = 7 } = {}) {
  let best = { t: 0.5, score: -Infinity };
  for (let i = 0; i <= steps; i++) {
    const t = range[0] + ((range[1] - range[0]) * i) / steps;
    const score = metric(t, data);
    if (score > best.score) best = { t, score };
  }
  return best;
}

// Calibration drift: monitor.
export function makeDifficultyMonitor({ window = 200 } = {}) {
  const recent = [];
  return {
    record(sample) { recent.push(sample); if (recent.length > window) recent.shift(); },
    accuracy() { return recent.length ? recent.filter((s) => s.correct).length / recent.length : 0; },
    drift(baseline = 0.8) { return baseline - this.accuracy(); },
  };
}
```

**Acceptance criteria:** data; optimization; drift.

### M4 — Integration + tests

**Reference code (`src/lib/difficulty/integrate.js`):**

```js
// Routing integration: difficulty hooks.
export function routeByDifficulty({ text = "", domain = "general", candidates = [] } = {}) {
  const score = difficultyScore({ signals: difficultySignals({ text, domain }) });
  const tier = tierFor(score);
  const models = modelsForTier(tier);
  const pick = candidates.find((c) => models.includes(c)) ?? candidates[0] ?? null;
  return { score, tier, models, pick };
}

// Fail-open.
export function safeDifficulty(fn, fallback = null) {
  try { return fn(); } catch { return fallback; }
}
```

**Files touched:** `src/lib/difficulty/` (new: model, route, calibrate, integrate), `open-sse/handlers/chatCore.js` (integration), dashboard difficulty page (new), `tests/unit/difficulty.test.js` (new).

**Acceptance criteria:** integration; fail-open; tests.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Misestimation | Wrong tier | Calibration |
| Quality loss | Bad routing | Fallback |
| Feature noise | Noisy scores | Feature selection |
| Drift | Stale tiers | Monitoring |

## Verification

- Unit: difficultySignals, difficultyScore, difficultyFeatures, tierFor, modelsForTier, escalateTier, makeDifficultyData, optimizeThreshold, makeDifficultyMonitor, routeByDifficulty
- Manual: easy query → cheap model; hard query → strong model
- Regression: `tests/__baseline__/verify-no-regression.mjs`