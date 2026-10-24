# Implementation Plan 174 — Bradley-Terry Preference Models — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #bradley-terry #preference #elo #pairwise #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (preference collection from plan 163 (`src/lib/preferences/`); human preference learning from plan 103; matrix factorization from plan 173 (`src/lib/factors/`); learned routing from plan 1).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — BT model; training; routing.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-174-bradley-terry-preference-models.md`, `../research/9router/impl-plan-163-preference-data-collection.md`, `../research/9router/impl-plan-103-human-preference-learning.md`.

## Scope

**In scope:** BT model (pairwise win probabilities, model strengths, query features); training (maximum likelihood, validation); routing integration (win-probability routing, confidence, fallback).
**Out of scope:** matrix factorization (plan 173); win-probability prediction (plan 175).

## Milestones

### M1 — Preference model

**Reference code (`src/lib/preference/model.js`):**

```js
// BT model: pairwise win probabilities.
export function makeBTModel() {
  const strengths = new Map(); // modelId -> strength
  return {
    setStrength(modelId, s) { strengths.set(modelId, s); },
    strength(modelId, fallback = 0) { return strengths.get(modelId) ?? fallback; },
    // Win probability: P(A beats B).
    winProb(a, b) {
      const sa = this.strength(a);
      const sb = this.strength(b);
      return 1 / (1 + Math.exp(sb - sa));
    },
    // Elo-style update.
    update({ winner, loser, k = 32 } = {}) {
      const expected = this.winProb(winner, loser);
      this.setStrength(winner, this.strength(winner) + k * (1 - expected));
      this.setStrength(loser, this.strength(loser) - k * (1 - expected));
    },
    all() { return Object.fromEntries(strengths); },
  };
}

// Query features: query-conditioned strengths (scaffold).
export function queryFeatures({ text = "" } = {}) {
  return { length: text.length, hasCode: /```/.test(text), hasMath: /[=+\-*/^]/.test(text) };
}
```

**Acceptance criteria:** strengths; winProb; update.

### M2 — Training

**Reference code (`src/lib/preference/train.js`):**

```js
// Training: maximum likelihood over pairwise preferences.
export function trainBT({ model, pairs = [], epochs = 10, lr = 0.1 } = {}) {
  for (let e = 0; e < epochs; e++) {
    for (const p of pairs) {
      // p: {winner, loser}
      const expected = model.winProb(p.winner, p.loser);
      const grad = 1 - expected;
      model.setStrength(p.winner, model.strength(p.winner) + lr * grad);
      model.setStrength(p.loser, model.strength(p.loser) - lr * grad);
    }
  }
  return model;
}

// Validation: held-out pairs accuracy.
export function validateBT({ model, pairs = [] } = {}) {
  const correct = pairs.filter((p) => model.winProb(p.winner, p.loser) > 0.5).length;
  return { accuracy: pairs.length ? correct / pairs.length : 0, correct, total: pairs.length };
}

// Split: train/validation.
export function splitPairs({ pairs = [], holdout = 0.2, seed = 1 } = {}) {
  const shuffled = [...pairs].sort(() => (seed % 2 ? -1 : 1));
  const cut = Math.floor(shuffled.length * (1 - holdout));
  return { train: shuffled.slice(0, cut), validation: shuffled.slice(cut) };
}
```

**Acceptance criteria:** training; validation; split.

### M3 — Routing integration

**Reference code (`src/lib/preference/route.js`):**

```js
// Win-probability routing: route by win probability vs a reference.
export function routeByWinProb({ model, reference = "gpt-4o", candidates = [] } = {}) {
  return candidates
    .map((m) => ({ model: m, winProb: model.winProb(m, reference) }))
    .sort((a, b) => b.winProb - a.winProb);
}

// Confidence: prediction confidence from data volume.
export function routeConfidence({ model, modelId, minStrength = 1 } = {}) {
  return { confident: Math.abs(model.strength(modelId)) >= minStrength, strength: model.strength(modelId) };
}

// Fallback: rule fallback.
export function preferenceFallback({ confident = false, candidates = [], rules = [] } = {}) {
  return confident ? candidates : rules.length ? rules : candidates;
}
```

**Acceptance criteria:** win-prob routing; confidence; fallback.

### M4 — Integration + tests

**Reference code (`src/lib/preference/integrate.js`):**

```js
// Routing integration: BT scores.
export function routeWithPreference({ model, reference = "gpt-4o", candidates = [] } = {}) {
  const ranked = routeByWinProb({ model, reference, candidates });
  return { ranked, best: ranked[0]?.model ?? null };
}

// Fail-open.
export function safePreference(fn, fallback = null) {
  try { return fn(); } catch { return fallback; }
}
```

**Files touched:** `src/lib/preference/` (new: model, train, route, integrate), `open-sse/handlers/chatCore.js` (integration), dashboard preference page (new), `tests/unit/preference.test.js` (new).

**Acceptance criteria:** integration; fail-open; tests.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Data sparsity | Weak strengths | Regularization |
| Overfitting | Bad routing | Validation |
| Strength drift | Stale scores | Retraining |
| Complexity | Confusion | Simple model |

## Verification

- Unit: makeBTModel, winProb, update, trainBT, validateBT, splitPairs, routeByWinProb, routeConfidence, preferenceFallback, routeWithPreference
- Manual: pairs → train → validate → route
- Regression: `tests/__baseline__/verify-no-regression.mjs`