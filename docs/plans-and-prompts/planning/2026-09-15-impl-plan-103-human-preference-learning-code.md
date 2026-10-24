# Implementation Plan 103 — Human Preference Evaluation & Preference Learning — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #preferences #human-feedback #learning #personalization #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (feedback pipeline from plan 83 (`src/lib/feedback/`); preference policy from plan 77 (`src/lib/preferences/`); learned routing from plan 1 research; privacy from plan 35 research).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — collect a pairwise comparison; update Elo; confirm routing impact; confirm drift tracking.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-103-human-preference-learning.md`, `../research/9router/impl-plan-83-feedback-based-selection.md`, `../research/9router/impl-plan-77-model-preference-fallback-order.md`.

## Scope

**In scope:** preference collection (pairwise comparisons, ratings, implicit signals copy/continue/edit/regenerate; chat UI + API feedback endpoint); preference learning (per-user + aggregate models, dimensions style/depth/format/tone, Bradley-Terry/Elo updates); preference application (preference-weighted selection, parameter tuning, per-user profiles); evaluation (accuracy, drift, reports); routing integration + dashboard.
**Out of scope:** RLHF-style model training; cross-device identity (uses existing session/user identity).

## Milestones

### M1 — Preference collection

**Reference code (`src/lib/preferences/collect.js`):**

```js
// Preference signal types.
export const SIGNAL = {
  PAIRWISE: "pairwise", RATING: "rating", COPY: "copy", CONTINUE: "continue", EDIT: "edit", REGENERATE: "regenerate",
};

// Collection: normalize signals into preference events.
export function collectSignal({ userId, sessionId, type, payload = {}, at = new Date().toISOString() } = {}) {
  if (!Object.values(SIGNAL).includes(type)) return { ok: false, reason: "unknown-signal" };
  return { ok: true, event: { userId, sessionId, type, payload, at } };
}

// Implicit signals → preference interpretation.
export function interpretImplicit(type) {
  switch (type) {
    case SIGNAL.COPY: return { dimension: "format", preference: "concise" };
    case SIGNAL.CONTINUE: return { dimension: "depth", preference: "deeper" };
    case SIGNAL.EDIT: return { dimension: "style", preference: "edited-style" };
    case SIGNAL.REGENERATE: return { dimension: "overall", preference: "dissatisfied" };
    default: return null;
  }
}

// Pairwise comparison event.
export function pairwiseEvent({ userId, winner, loser, at = new Date().toISOString() } = {}) {
  return { userId, type: SIGNAL.PAIRWISE, payload: { winner, loser }, at };
}
```

**Acceptance criteria:** signals normalized; implicit interpretation; pairwise events.

### M2 — Preference learning

**Reference code (`src/lib/preferences/learn.js`):**

```js
// Elo-style updates per (user, dimension).
export function makeElo({ k = 32, initial = 1000 } = {}) {
  const ratings = new Map(); // key -> rating
  const expected = (a, b) => 1 / (1 + 10 ** ((b - a) / 400));
  return {
    rating(key) { return ratings.get(key) ?? initial; },
    compare({ winner, loser, key = "global" }) {
      const w = this.rating(`${key}:${winner}`);
      const l = this.rating(`${key}:${loser}`);
      const ew = expected(w, l);
      ratings.set(`${key}:${winner}`, w + k * (1 - ew));
      ratings.set(`${key}:${loser}`, l + k * (0 - (1 - ew)));
      return { winner: w + k * (1 - ew), loser: l + k * (0 - (1 - ew)) };
    },
    rate(key) { return this.rating(key); },
  };
}

// Aggregate priors: sparse user feedback falls back to global.
export function blendPreference({ userRating, globalRating, userSamples = 0, minSamples = 5 } = {}) {
  if (userSamples < minSamples) return globalRating;
  const w = Math.min(1, userSamples / (userSamples + minSamples));
  return w * userRating + (1 - w) * globalRating;
}
```

**Acceptance criteria:** Elo updates; aggregate priors.

### M3 — Preference application

**Reference code (`src/lib/preferences/apply.js`):**

```js
// Preference-weighted model selection.
export function preferenceWeight({ model, preferences = {}, dimension = "overall" } = {}) {
  const p = preferences[model]?.[dimension];
  return p == null ? 1 : 0.5 + p / 2000; // Elo 1000 → 1.0
}

export function rankByPreference(candidates, { preferences = {}, dimension = "overall" } = {}) {
  return [...candidates].sort((a, b) => preferenceWeight({ model: b, preferences, dimension }) - preferenceWeight({ model: a, preferences, dimension }));
}

// Parameter impact: preference-based parameter tuning.
export function paramsForPreference({ preference = "concise", base = {} } = {}) {
  if (preference === "concise") return { ...base, max_tokens: Math.min(base.max_tokens ?? 1024, 512) };
  if (preference === "deeper") return { ...base, max_tokens: (base.max_tokens ?? 1024) * 2 };
  return base;
}

// Personalization: per-user routing profile.
export function profileFor({ userId, userPrefs = {}, globalPrefs = {} } = {}) {
  return { userId, user: userPrefs, global: globalPrefs, effective: { ...globalPrefs, ...userPrefs } };
}
```

**Acceptance criteria:** weighted ranking; parameter tuning; profiles.

### M4 — Evaluation + integration + tests

**Reference code (`src/lib/preferences/evaluate.js`):**

```js
// Preference accuracy: predicted vs. actual.
export function accuracy({ predictions, actuals }) {
  if (!predictions.length) return null;
  const hits = predictions.filter((p, i) => p === actuals[i]).length;
  return hits / predictions.length;
}

// Preference drift: rating change over time.
export function drift({ ratings, window = 30 } = {}) {
  if (ratings.length < 2) return 0;
  const recent = ratings.slice(-window);
  return Math.abs(recent.at(-1) - recent[0]);
}

// Reports: preference analytics summary.
export function report({ elo, keys = [] } = {}) {
  return Object.fromEntries(keys.map((k) => [k, elo.rate(k)]));
}
```

**Files touched:** `src/lib/preferences/` (new: collect, learn, apply, evaluate), `src/sse/handlers/chat.js` (preference integration), `src/lib/db/migrations/20260915-preferences.js` (new), `src/lib/db/repos/preferenceRepo.js` (new), dashboard preferences page (new), `tests/unit/preferences.test.js` (new).

**Acceptance criteria:** preferences collected; learning updates; routing respects; drift tracked.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Sparse feedback | Noisy models | Aggregate priors |
| Preference noise | Wrong signals | Smoothing |
| Privacy | Data exposure | Anonymization |
| Over-personalization | Narrow routing | Global fallback |

## Verification

- Unit: collectSignal, makeElo, blendPreference, rankByPreference, drift
- Manual: pairwise compare → Elo moves → selection re-ranks
- Regression: `tests/__baseline__/verify-no-regression.mjs`