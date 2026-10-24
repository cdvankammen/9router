# Implementation Plan 81 — Request Intent Classification & Task Taxonomy — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #intent-classification #task-taxonomy #difficulty #routing #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (task classification from plan 56 (`src/lib/classify/`); tool routing from plan 80; semantic routing from plan 3 research; selection in `src/sse/handlers/chat.js`).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — classify a code request and a chat request; confirm taxonomy mapping drives selection; check confidence.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-81-request-intent-classification.md`, `../research/9router/impl-plan-80-tool-routing-function-calling.md`, `../research/9router/impl-plan-56-task-classification-intent.md`.

## Scope

**In scope:** task taxonomy (chat, code, math, analysis, tool-use, agent-step, creative) with per-node defaults/features; heuristic classifier with confidence scoring + optional LLM classifier when confidence is low; difficulty prediction (message length, code markers, math symbols, tool count) influencing tier; taxonomy-aware routing (mappings, combos, fallback chains, explicit override); classification telemetry.
**Out of scope:** per-step classification within multi-step agent flows (single-request classification first); learned classifiers.

## Milestones

### M1 — Task taxonomy

**Reference code (`src/lib/intent/taxonomy.js`):**

```js
export const TASK_TAXONOMY = {
  chat:       { default: "gpt-4o-mini", features: ["fast"] },
  code:       { default: "claude-sonnet-4-5", features: ["code"] },
  math:       { default: "gpt-4o", features: ["math"] },
  analysis:   { default: "claude-opus-4-1", features: ["deep"] },
  "tool-use": { default: "gpt-4o", features: ["tools"] },
  "agent-step": { default: "claude-sonnet-4-5", features: ["tools", "long-context"] },
  creative:   { default: "gpt-4o", features: ["creative"] },
};

export const TASK_KEYS = Object.keys(TASK_TAXONOMY);

export function taxonomyNode(task, taxonomy = TASK_TAXONOMY) {
  return taxonomy[task] ?? null;
}

// Configurable mapping: task -> preferred model (override defaults).
export function modelForTask(task, overrides = {}) {
  return overrides[task] ?? TASK_TAXONOMY[task]?.default ?? null;
}
```

**Acceptance criteria:** taxonomy defined; node lookup; overrides configurable.

### M2 — Heuristic classifier + confidence

**Reference code (`src/lib/intent/classifier.js`):**

```js
// Heuristic classifier: keyword/pattern matching with confidence.
const PATTERNS = {
  code: /\b(code|debug|refactor|fix|implement|function|script|bug|error|exception|stack trace)\b/i,
  math: /\b(calculate|solve|equation|derivative|integral|proof|math|algebra|probability)\b/i,
  analysis: /\b(analy[sz]e|compare|evaluate|summarize|report|trend|insight)\b/i,
  "tool-use": /\b(use (the )?(tool|function)|call (the )?(tool|function)|search|browse|fetch)\b/i,
  creative: /\b(write a (story|poem|song)|brainstorm|creative|imagine|draft)\b/i,
  "agent-step": /\b(continue|next step|then|after that|proceed)\b/i,
};

export function classifyIntent({ messages = [], tools = [] } = {}) {
  const lastUser = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
  const text = typeof lastUser === "string" ? lastUser : JSON.stringify(lastUser);
  const hits = [];
  for (const [task, re] of Object.entries(PATTERNS)) if (re.test(text)) hits.push(task);
  if (tools.length > 0) hits.push("tool-use");
  if (!hits.length) return { task: "chat", confidence: 0.6, hits: [] };
  // Confidence: more distinct signals → higher confidence.
  const unique = [...new Set(hits)];
  const confidence = Math.min(0.95, 0.5 + unique.length * 0.15);
  return { task: unique[0], confidence: Number(confidence.toFixed(2)), hits: unique };
}

// Gate: only use classification when confident enough.
export function useClassification(result, { threshold = 0.65 } = {}) {
  return result.confidence >= threshold;
}
```

**Acceptance criteria:** patterns fire; confidence scales with signals; threshold gate.

### M3 — Difficulty prediction

**Reference code (`src/lib/intent/difficulty.js`):**

```js
// Lightweight difficulty score 0..1 from request features.
export function predictDifficulty({ messages = [], tools = [] } = {}) {
  const lastUser = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
  const text = typeof lastUser === "string" ? lastUser : JSON.stringify(lastUser);
  let score = 0;
  if (text.length > 2000) score += 0.3;
  else if (text.length > 500) score += 0.15;
  if (/\b(code|debug|refactor)\b/i.test(text)) score += 0.25;
  if (/[∑∫√±×÷]|\b(solve|prove|derive)\b/i.test(text)) score += 0.2;
  if (tools.length > 3) score += 0.2;
  else if (tools.length > 0) score += 0.1;
  return { score: Number(Math.min(1, score).toFixed(2)), tier: score > 0.6 ? "strong" : score > 0.3 ? "medium" : "fast" };
}

// Conservative: bump tier only, never downgrade.
export function applyDifficulty(candidates, difficulty, { tierOrder = ["fast", "medium", "strong"] } = {}) {
  const idx = tierOrder.indexOf(difficulty.tier);
  if (idx <= 0) return candidates;
  const stronger = candidates.filter((c) => (c.tierRank ?? 1) >= idx);
  return stronger.length ? stronger : candidates;
}
```

**Acceptance criteria:** difficulty scored; tier derived; conservative bump only.

### M4 — Routing integration + telemetry + tests

**Reference code (`src/lib/intent/integrate.js`):**

```js
import { classifyIntent, useClassification } from "./classifier.js";
import { predictDifficulty } from "./difficulty.js";
import { modelForTask } from "./taxonomy.js";

// One-call entry for src/sse/handlers/chat.js.
export function buildIntentContext({ messages, tools, overrides = {} }) {
  const classification = classifyIntent({ messages, tools });
  const difficulty = predictDifficulty({ messages, tools });
  const preferred = useClassification(classification) ? modelForTask(classification.task, overrides) : null;
  return { classification, difficulty, preferred, used: useClassification(classification) };
}

// Order candidates: preferred model first when classification used.
export function orderByIntent(candidates, ctx) {
  if (!ctx.used || !ctx.preferred) return candidates;
  const match = candidates.find((c) => c.model === ctx.preferred);
  return match ? [match, ...candidates.filter((c) => c.model !== ctx.preferred)] : candidates;
}
```

**Files touched:** `src/lib/intent/` (new: taxonomy, classifier, difficulty, integrate), `open-sse/config/intentConfig.js` (new), `src/sse/handlers/chat.js` (taxonomy-aware selection), dashboard intent page (new), `tests/unit/intent.test.js` (new).

**Acceptance criteria:** classification + difficulty computed; preferred model honored; telemetry recorded.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Misclassification | Wrong model | Confidence threshold + fallback |
| LLM classifier cost | Extra latency/spend | Only when heuristic confidence low |
| Taxonomy rigidity | New task types | Configurable taxonomy |
| Difficulty misprediction | Wrong tier | Conservative bump only |

## Verification

- Unit: classifyIntent, predictDifficulty, orderByIntent
- Manual: code request → code model; low-confidence → default path
- Regression: `tests/__baseline__/verify-no-regression.mjs`