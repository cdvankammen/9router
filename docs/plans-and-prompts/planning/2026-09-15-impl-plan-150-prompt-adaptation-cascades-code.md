# Implementation Plan 150 — Prompt Adaptation for Cascades — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #adaptation #prompts #cascades #escalation #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (cascade fallback from plan 2 (`open-sse/handlers/chatCore.js` fallback loop); cascade coordination from plan 90; escalation depth from plan 137 (`src/lib/cascade/`); prompt templates from plan 44).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — adaptation rules; engine; cascade integration.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-150-prompt-adaptation-cascades.md`, `../research/9router/impl-plan-2-cascade-fallback.md`, `../research/9router/impl-plan-137-cascade-escalation-depth.md`.

## Scope

**In scope:** adaptation rules (model-tier mapping, types, priority); adaptation engine (pre-adaptation, templates, quality); cascade integration (per-depth adaptation, cost, logging); observability.
**Out of scope:** escalation depth internals (plan 137); cascade trigger conditions (plan 42 branch).

## Milestones

### M1 — Adaptation rules

**Reference code (`src/lib/adaptation/rules.js`):**

```js
// Adaptation rules: model tier → adaptation.
export const TIERS = ["cheap", "medium", "expensive"];

export const ADAPTATION_TYPES = ["length", "detail", "format"];

// Tier → adaptation directives.
export const TIER_ADAPTATIONS = {
  cheap: [
    { type: "length", action: "add", text: "Be concise. Answer in as few words as possible." },
    { type: "detail", action: "reduce", text: "Skip explanations unless asked." },
  ],
  medium: [{ type: "format", action: "keep", text: "" }],
  expensive: [
    { type: "detail", action: "add", text: "Be thorough. Show your reasoning step by step." },
  ],
};

// Priority: critical adaptations first.
export function priorityOrder(adaptations) {
  const rank = { length: 0, detail: 1, format: 2 };
  return [...adaptations].sort((a, b) => rank[a.type] - rank[b.type]);
}

// Tier for a model (from cost heuristics).
export function tierForModel({ modelId, costOf = () => 1 } = {}) {
  const c = costOf(modelId);
  return c < 2 ? "cheap" : c < 10 ? "medium" : "expensive";
}
```

**Acceptance criteria:** tier mapping; priority; tier lookup.

### M2 — Adaptation engine

**Reference code (`src/lib/adaptation/engine.js`):**

```js
// Adaptation engine: apply tier adaptations to a prompt.
export function adaptPrompt({ prompt, tier = "medium", adaptations = TIER_ADAPTATIONS } = {}) {
  const list = priorityOrder(adaptations[tier] ?? []);
  let out = prompt;
  for (const a of list) {
    if (a.action === "add") out = `${a.text}\n\n${out}`;
    if (a.action === "reduce") out = out.replace(/\n{2,}/g, "\n"); // collapse verbosity
  }
  return out;
}

// Pre-adaptation: adapt before routing.
export function preAdapt({ prompt, modelId, costOf } = {}) {
  const tier = tierForModel({ modelId, costOf });
  return { prompt: adaptPrompt({ prompt, tier }), tier, adapted: tier !== "medium" };
}

// Quality measurement: did adaptation change the outcome?
export function measureImpact({ adapted, baseline, judge = (a, b) => a === b } = {}) {
  return { same: judge(adapted, baseline), changed: !judge(adapted, baseline) };
}
```

**Acceptance criteria:** engine; pre-adaptation; impact.

### M3 — Cascade integration

**Reference code (`src/lib/adaptation/cascade.js`):**

```js
// Cascade integration: adapt per depth.
export function adaptForDepth({ prompt, depth = 0, tiers = ["cheap", "medium", "expensive"] } = {}) {
  const tier = tiers[Math.min(depth, tiers.length - 1)];
  return { prompt: adaptPrompt({ prompt, tier }), tier, depth };
}

// Adaptation cost: overhead of adapting.
export function adaptationCost({ adapted = false, chars = 0 } = {}) {
  return adapted ? Math.ceil(chars / 1000) : 0; // ~1 token per 4 chars, rounded
}

// Logging: track adaptations.
export function makeAdaptationLog() {
  const entries = [];
  return {
    log(e) { entries.push({ ...e, at: Date.now() }); },
    report() {
      return {
        total: entries.length,
        byTier: entries.reduce((acc, e) => { acc[e.tier] = (acc[e.tier] ?? 0) + 1; return acc; }, {}),
        cost: entries.reduce((s, e) => s + (e.cost ?? 0), 0),
      };
    },
  };
}
```

**Acceptance criteria:** per-depth adaptation; cost; logging.

### M4 — Integration + tests

**Reference code (`src/lib/adaptation/integrate.js`):**

```js
// Routing integration: adaptation hooks in chatCore.
export function adaptForRequest({ prompt, modelId, depth = 0, costOf, enabled = true } = {}) {
  if (!enabled) return { prompt, adapted: false, tier: "medium" };
  const { prompt: adapted, tier } = adaptForDepth({ prompt, depth });
  return { prompt: adapted, adapted: adapted !== prompt, tier };
}

// Fail-open: never break the request on adaptation errors.
export function safeAdapt(fn, fallback = null) {
  try { return fn(); } catch { return fallback; }
}
```

**Files touched:** `src/lib/adaptation/` (new: rules, engine, cascade, integrate), `open-sse/handlers/chatCore.js` (adaptation hooks), dashboard adaptation page (new), `tests/unit/adaptation.test.js` (new).

**Acceptance criteria:** integration; fail-open; tests.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Quality loss | Worse answers | Quality monitoring |
| Over-adaptation | Prompt mangling | Threshold tuning |
| Complexity | Confusing rules | Simple rules |
| Latency | Slow adaptation | Pre-computation |

## Verification

- Unit: tierForModel, priorityOrder, adaptPrompt, preAdapt, adaptForDepth, adaptationCost, makeAdaptationLog, adaptForRequest
- Manual: cheap model → concise prompt; expensive → thorough
- Regression: `tests/__baseline__/verify-no-regression.mjs`