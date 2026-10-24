# Implementation Plan 147 — Semantic Route Design & Utterance Engineering — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #routes #utterances #semantic #granularity #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (semantic routing from plan 3 (`open-sse/services/semantic-router.js`); rule engine from plan 88; intent classification from plan 81; similarity metrics from plan 146 (`src/lib/similarity/`)).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — route definition; utterance validation; route tests.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-147-semantic-route-design.md`, `../research/9router/impl-plan-3-semantic-routing.md`, `../research/9router/impl-plan-88-rule-engine-v2.md`.

## Scope

**In scope:** route model (name, utterances, threshold, target); granularity (coarse/fine, conflict detection); utterance engineering (quality, generation, validation); route testing (precision/recall, regression).
**Out of scope:** similarity metric internals (plan 146); rule engine internals (plan 88).

## Milestones

### M1 — Route model

**Reference code (`src/lib/routes/model.js`):**

```js
// Route: name, utterances, threshold, target.
export function makeRoute({ name, utterances = [], threshold = 0.5, target = null, granularity = "medium" } = {}) {
  return { name, utterances, threshold, target, granularity, createdAt: Date.now() };
}

// Conflict detection: overlapping utterance sets.
export function findConflicts(routes) {
  const conflicts = [];
  for (let i = 0; i < routes.length; i++) {
    for (let j = i + 1; j < routes.length; j++) {
      const overlap = routes[i].utterances.filter((u) => routes[j].utterances.includes(u));
      if (overlap.length) conflicts.push({ a: routes[i].name, b: routes[j].name, overlap });
    }
  }
  return conflicts;
}

// Granularity guidance: coarse vs fine.
export function granularityOf(route) {
  const n = route.utterances.length;
  return n < 5 ? "coarse" : n > 20 ? "fine" : "medium";
}
```

**Acceptance criteria:** route shape; conflicts; granularity.

### M2 — Utterance engineering

**Reference code (`src/lib/routes/utterances.js`):**

```js
// Utterance quality: coverage + diversity.
export function utteranceQuality({ utterances = [], embed = null } = {}) {
  if (!utterances.length) return { coverage: 0, diversity: 0 };
  const coverage = Math.min(1, utterances.length / 10);
  let diversity = 0;
  if (embed) {
    // Mean pairwise distance as diversity proxy.
    const sims = [];
    for (let i = 0; i < utterances.length; i++) {
      for (let j = i + 1; j < utterances.length; j++) {
        sims.push(embed(utterances[i], utterances[j]));
      }
    }
    diversity = sims.length ? 1 - sims.reduce((a, s) => a + s, 0) / sims.length : 0;
  }
  return { coverage, diversity };
}

// Validation: utterances must be non-empty, unique, reasonably sized.
export function validateUtterances(utterances) {
  const cleaned = [...new Set(utterances.map((u) => u.trim()).filter((u) => u.length >= 3 && u.length <= 500))];
  return { ok: cleaned.length === utterances.length, cleaned, dropped: utterances.length - cleaned.length };
}

// Generation scaffold: LLM-assisted utterance generation hook.
export function generationPrompt({ routeName, examples = [] } = {}) {
  return `Generate 10 diverse user utterances for the route "${routeName}".\nExamples:\n${examples.map((e) => `- ${e}`).join("\n")}\nReturn one utterance per line.`;
}
```

**Acceptance criteria:** quality; validation; generation hook.

### M3 — Route testing

**Reference code (`src/lib/routes/tests.js`):**

```js
// Route tests: utterance → expected route mapping.
export function evaluateRoutes({ routes, cases = [], match } = {}) {
  // cases: [{utterance, expected}]
  let tp = 0, fp = 0, fn = 0;
  for (const c of cases) {
    const got = match(c.utterance);
    if (got === c.expected) tp++;
    else if (got === null) fn++;
    else fp++;
  }
  const precision = tp + fp ? tp / (tp + fp) : 0;
  const recall = tp + fn ? tp / (tp + fn) : 0;
  return { precision, recall, f1: precision + recall ? (2 * precision * recall) / (precision + recall) : 0, tp, fp, fn };
}

// Regression: compare against baseline results.
export function regressionCheck({ current, baseline, tolerance = 0.05 } = {}) {
  const drop = baseline.f1 - current.f1;
  return { ok: drop <= tolerance, drop };
}
```

**Acceptance criteria:** precision/recall; regression gate.

### M4 — Integration + tests

**Reference code (`src/lib/routes/integrate.js`):**

```js
// Semantic router integration: route definitions.
export function routeForUtterance({ utterance, routes, embed, thresholdOverride = null } = {}) {
  const scored = routes.map((r) => ({
    route: r,
    score: Math.max(...r.utterances.map((u) => embed(utterance, u))),
  }));
  const best = scored.sort((a, b) => b.score - a.score)[0];
  const threshold = thresholdOverride ?? best?.route.threshold ?? 0.5;
  return best && best.score >= threshold ? best.route : null;
}

// Fail-open.
export function safeRoute(fn, fallback = null) {
  try { return fn(); } catch { return fallback; }
}
```

**Files touched:** `src/lib/routes/` (new: model, utterances, tests, integrate), `open-sse/services/semantic-router.js` (integration), dashboard routes page (new), `tests/unit/routes.test.js` (new).

**Acceptance criteria:** integration; fail-open; tests.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Route conflicts | Ambiguous routing | Conflict detection |
| Utterance gaps | Missed queries | Generation + validation |
| Granularity issues | Over/under-splitting | Design guidelines |
| Regression | Quality loss | Route tests |

## Verification

- Unit: makeRoute, findConflicts, utteranceQuality, validateUtterances, evaluateRoutes, regressionCheck, routeForUtterance
- Manual: define route → test utterances → evaluate
- Regression: `tests/__baseline__/verify-no-regression.mjs`