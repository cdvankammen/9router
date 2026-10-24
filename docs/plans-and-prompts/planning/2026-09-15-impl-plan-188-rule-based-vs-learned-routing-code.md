# Implementation Plan 188 — Rule-Based vs Learned Routing Hybrid — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #hybrid #rules #learned #routing #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (rule engine v2 from plan 88; learned routing from plan 1; classifier from plan 131 (`src/lib/classifier/`); constraint routing from plan 135).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — rules; learned; hybrid.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-188-rule-based-vs-learned-routing.md`, `../research/9router/impl-plan-88-rule-engine-v2.md`, `../research/9router/impl-plan-1-learned-routing.md`.

## Scope

**In scope:** rule layer (hard constraints, soft preferences, priority); learned layer (models, inference, fallback); hybrid logic (rule-first, learned-first, parallel).
**Out of scope:** classifier internals (plan 131); constraint routing (plan 135).

## Milestones

### M1 — Rule layer

**Reference code (`src/lib/hybrid/rules.js`):**

```js
// Rule types: hard constraints, soft preferences.
export const RULE_TYPES = ["hard", "soft"];

// Rule evaluation: fast rule engine.
export function evaluateRules({ rules = [], context = {} } = {}) {
  const passed = [];
  const failed = [];
  for (const rule of rules) {
    const ok = rule.test(context);
    (ok ? passed : failed).push(rule);
  }
  return { passed, failed };
}

// Rule priority: rule precedence.
export function priorityOrder(rules = []) {
  return [...rules].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
}

// Rule factory.
export function makeRule({ id, type = "soft", priority = 0, test = () => true } = {}) {
  return { id, type, priority, test };
}
```

**Acceptance criteria:** types; evaluation; priority.

### M2 — Learned layer

**Reference code (`src/lib/hybrid/learned.js`):**

```js
// Learned models: classifiers, predictors.
export function makeLearnedLayer({ predict = null, fallback = null } = {}) {
  return {
    // predict: {context} → model choice
    predict(context) {
      if (!predict) return fallback;
      try { return predict(context) ?? fallback; } catch { return fallback; }
    },
    fallback,
  };
}

// Learned inference: fast inference.
export function fastInference({ predict, context, timeoutMs = 50 } = {}) {
  const start = Date.now();
  const result = predict(context);
  return { result, tookMs: Date.now() - start, timedOut: Date.now() - start > timeoutMs };
}

// Learned fallback: rule fallback.
export function learnedFallback({ result = null, rules = [], context = {} } = {}) {
  if (result) return result;
  const { passed } = evaluateRules({ rules, context });
  return passed[0]?.id ?? null;
}
```

**Acceptance criteria:** layer; inference; fallback.

### M3 — Hybrid logic

**Reference code (`src/lib/hybrid/hybrid.js`):**

```js
// Rule-first: rules filter, learned selects.
export function ruleFirst({ rules = [], learned, context = {}, candidates = [] } = {}) {
  const { passed } = evaluateRules({ rules, context });
  const hard = passed.filter((r) => r.type === "hard");
  if (hard.length) return hard[0].id; // hard constraint wins
  return learned.predict(context) ?? candidates[0] ?? null;
}

// Learned-first: learned selects, rules validate.
export function learnedFirst({ rules = [], learned, context = {}, candidates = [] } = {}) {
  const pick = learned.predict(context) ?? candidates[0] ?? null;
  const { failed } = evaluateRules({ rules, context });
  const hardFailed = failed.some((r) => r.type === "hard");
  return hardFailed ? candidates[0] ?? null : pick;
}

// Parallel: both run, reconcile.
export function parallelHybrid({ rules = [], learned, context = {}, candidates = [] } = {}) {
  const rulePick = ruleFirst({ rules, learned, context, candidates });
  const learnedPick = learnedFirst({ rules, learned, context, candidates });
  return { rulePick, learnedPick, reconciled: rulePick === learnedPick ? rulePick : rulePick };
}
```

**Acceptance criteria:** rule-first; learned-first; parallel.

### M4 — Integration + tests

**Reference code (`src/lib/hybrid/integrate.js`):**

```js
// Routing integration: hybrid routing.
export function hybridRoute({ mode = "rule-first", rules = [], learned, context = {}, candidates = [] } = {}) {
  if (mode === "learned-first") return learnedFirst({ rules, learned, context, candidates });
  if (mode === "parallel") return parallelHybrid({ rules, learned, context, candidates });
  return ruleFirst({ rules, learned, context, candidates });
}

// Fail-open.
export function safeHybrid(fn, fallback = null) {
  try { return fn(); } catch { return fallback; }
}
```

**Files touched:** `src/lib/hybrid/` (new: rules, learned, hybrid, integrate), `open-sse/handlers/chatCore.js` (hybrid hooks), dashboard hybrid page (new), `tests/unit/hybrid.test.js` (new).

**Acceptance criteria:** integration; fail-open; tests.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Rule-learned conflict | Wrong picks | Clear precedence |
| Complexity | Confusion | Simple hybrid |
| Latency | Slow routing | Fast paths |
| Maintenance | Drift | Clear ownership |

## Verification

- Unit: evaluateRules, priorityOrder, makeRule, makeLearnedLayer, fastInference, learnedFallback, ruleFirst, learnedFirst, parallelHybrid, hybridRoute
- Manual: rules + learned → hybrid → route
- Regression: `tests/__baseline__/verify-no-regression.mjs`