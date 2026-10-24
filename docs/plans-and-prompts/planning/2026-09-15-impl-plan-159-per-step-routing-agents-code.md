# Implementation Plan 159 — Per-Step Routing for Agents — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #steps #agents #per-step-routing #context #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (step context from plan 106; goal systems from plan 14; mixture of agents from plan 85; task classification from plan 154 (`src/lib/tasks/`); API routes in `src/app/api/v1/`).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — step classification; step routing; context.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-159-per-step-routing-agents.md`, `../research/9router/impl-plan-106-step-context.md`, `../research/9router/impl-plan-154-task-type-classification.md`.

## Scope

**In scope:** step classification (types, features, classifier); step routing (step → model mapping, context, fallback); agent integration (step-aware API, tracking, observability).
**Out of scope:** step context internals (plan 106); goal systems (plan 14).

## Milestones

### M1 — Step classification

**Reference code (`src/lib/steps/classify.js`):**

```js
// Step types: reasoning, tool, code, summary, chat.
export const STEP_TYPES = ["reasoning", "tool", "code", "summary", "chat"];

// Step features: content, tool calls, length.
export const STEP_PATTERNS = {
  reasoning: [/think|reason|therefore|because|step by step|analyze/i],
  tool: [/tool|function call|search|fetch|api call|invoke/i],
  code: [/```|function|class|import|const |def |=>/i],
  summary: [/summarize|in short|to summarize|conclusion|tl;dr/i],
  chat: [/hi|hello|thanks|ok|sure/i],
};

export function classifyStep({ text = "", hasToolCalls = false, patterns = STEP_PATTERNS } = {}) {
  if (hasToolCalls) return { type: "tool", confidence: 0.95, signals: ["tool-calls"] };
  const hits = Object.entries(patterns)
    .map(([type, res]) => ({ type, count: res.filter((re) => re.test(text)).length }))
    .filter((h) => h.count > 0)
    .sort((a, b) => b.count - a.count);
  if (!hits.length) return { type: "chat", confidence: 0.5, signals: [] };
  const top = hits[0];
  return { type: top.type, confidence: Math.min(0.95, 0.5 + top.count * 0.15), signals: hits.map((h) => `${h.type}:${h.count}`) };
}

// Features: extract step features.
export function stepFeatures({ text = "", hasToolCalls = false, toolCount = 0, length = text.length } = {}) {
  return { hasToolCalls, toolCount, length, hasCode: /```/.test(text) };
}
```

**Acceptance criteria:** classifier; features.

### M2 — Step routing

**Reference code (`src/lib/steps/route.js`):**

```js
// Step → model mapping.
export function makeStepRouter() {
  const mapping = new Map(); // stepType -> [modelIds]
  return {
    set(type, models) { mapping.set(type, models); },
    modelsFor(type) { return mapping.get(type) ?? []; },
    // Select: step models ∩ candidates, else general.
    select({ type, candidates = [], general = [] } = {}) {
      const specialized = this.modelsFor(type).filter((m) => candidates.includes(m));
      return specialized.length ? specialized : general.filter((m) => candidates.includes(m));
    },
  };
}

// Fallback: general fallback.
export function fallbackStep({ type, known = [], general = [] } = {}) {
  return known.includes(type) ? null : general;
}

// Step budgets: per-step cost caps.
export function makeStepBudget({ caps = {} } = {}) {
  const spent = new Map();
  return {
    spend(type, amount) {
      const total = (spent.get(type) ?? 0) + amount;
      spent.set(type, total);
      return total <= (caps[type] ?? Infinity);
    },
    report() { return Object.fromEntries(spent); },
  };
}
```

**Acceptance criteria:** mapping; fallback; budgets.

### M3 — Step context

**Reference code (`src/lib/steps/context.js`):**

```js
// Step context: conversation context for routing.
export function makeStepContext({ window = 10 } = {}) {
  const steps = [];
  return {
    push(step) {
      steps.push(step);
      if (steps.length > window) steps.shift();
    },
    // Recent types: distribution of last N steps.
    recentTypes() {
      return steps.reduce((acc, s) => { acc[s.type] = (acc[s.type] ?? 0) + 1; return acc; }, {});
    },
    // Context summary for routing decisions.
    summary() {
      return { count: steps.length, types: this.recentTypes(), last: steps.at(-1) ?? null };
    },
  };
}

// Context-aware routing: prefer continuity for reasoning chains.
export function routeWithContext({ type, context, router, candidates = [], general = [] } = {}) {
  const models = router.select({ type, candidates, general });
  return { type, models, context: context.summary() };
}
```

**Acceptance criteria:** context; routing with context.

### M4 — Integration + tests

**Reference code (`src/lib/steps/integrate.js`):**

```js
// Agent protocol: step-aware API.
export function stepForRequest({ text, hasToolCalls = false, context, router, candidates = [], general = [] } = {}) {
  const { type, confidence } = classifyStep({ text, hasToolCalls });
  const models = router.select({ type, candidates, general });
  context.push({ type, confidence });
  return { type, confidence, models, context: context.summary() };
}

// Observability: step distribution.
export function makeStepTelemetry() {
  const counts = new Map();
  return {
    record(type) { counts.set(type, (counts.get(type) ?? 0) + 1); },
    report() { return Object.fromEntries(counts); },
  };
}

// Fail-open.
export function safeStep(fn, fallback = null) {
  try { return fn(); } catch { return fallback; }
}
```

**Files touched:** `src/lib/steps/` (new: classify, route, context, integrate), `src/app/api/v1/` (step-aware API), dashboard steps page (new), `tests/unit/steps.test.js` (new).

**Acceptance criteria:** integration; telemetry; tests.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Misclassification | Wrong routing | Confidence |
| Context loss | Broken chains | Step state |
| Cost increase | Overspend | Step budgets |
| Complexity | Confusion | Coarse steps |

## Verification

- Unit: classifyStep, stepFeatures, makeStepRouter, fallbackStep, makeStepBudget, makeStepContext, routeWithContext, stepForRequest
- Manual: tool step → tool model; reasoning chain continuity
- Regression: `tests/__baseline__/verify-no-regression.mjs`