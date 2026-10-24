# Implementation Plan 154 — Task-Type Classification & Workload Taxonomy — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #tasks #taxonomy #classification #routing #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (task classification from plan 56 (`src/lib/tasks/`); domain routing from plan 142 (`src/lib/domains/`); intent classification from plan 81; capability matching from plan 104 (`src/lib/capabilities/`); pre-routing in `open-sse/handlers/chatCore.js`).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — taxonomy; classification; task-based routing.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-154-task-type-classification.md`, `../research/9router/impl-plan-56-task-classification-intent.md`, `../research/9router/impl-plan-142-domain-specialized-routing.md`.

## Scope

**In scope:** task taxonomy (coarse 8 types → fine 32); classifier (rule + ML hybrid, signals, confidence); task-based routing (task → model/strategy mapping, fallback); integration.
**Out of scope:** domain detection internals (plan 142); capability matching (plan 104).

## Milestones

### M1 — Task taxonomy

**Reference code (`src/lib/tasks/taxonomy.js`):**

```js
// Task taxonomy: coarse (8) → fine (32).
export const COARSE_TASKS = ["code", "math", "writing", "analysis", "translation", "chat", "vision", "audio"];

export const FINE_TASKS = {
  code: ["debug", "refactor", "generate", "explain", "review"],
  math: ["solve", "proof", "derive", "calculate", "statistics"],
  writing: ["draft", "edit", "summarize", "rewrite", "translate"],
  analysis: ["compare", "evaluate", "extract", "classify", "reason"],
  translation: ["translate", "localize", "transliterate"],
  chat: ["converse", "advise", "brainstorm", "clarify"],
  vision: ["describe", "ocr", "diagram", "chart", "screenshot"],
  audio: ["transcribe", "summarize-audio", "translate-audio"],
};

// Task definitions + examples.
export const TASK_EXAMPLES = {
  code: ["fix this bug", "write a function", "explain this code"],
  math: ["solve for x", "prove this theorem", "calculate the integral"],
  vision: ["what's in this image", "read this screenshot"],
  chat: ["how are you", "what do you think about"],
};

// Extensible: register new tasks.
export function extendTaxonomy(extra) {
  Object.assign(FINE_TASKS, extra);
}
```

**Acceptance criteria:** taxonomy; examples; extensibility.

### M2 — Classification

**Reference code (`src/lib/tasks/classify.js`):**

```js
// Classifier: rule-based signals + confidence.
export const TASK_PATTERNS = {
  code: [/function|class|import|const |def |=>|```|bug|debug|compile|syntax|api|sql|regex/i],
  math: [/solve|equation|integral|derivative|proof|theorem|calculate|algebra|calculus|probability/i],
  writing: [/write|draft|essay|summarize|rewrite|edit|polish/i],
  analysis: [/compare|evaluate|analyze|extract|classify|reason|explain why/i],
  translation: [/translate|translate to|in french|in spanish|in japanese/i],
  chat: [/hi|hello|how are you|what do you think|opinion/i],
  vision: [/image|picture|photo|diagram|chart|screenshot|ocr/i],
  audio: [/transcribe|audio|podcast|recording/i],
};

export function classifyTask({ text = "", hasImage = false, hasAudio = false, patterns = TASK_PATTERNS } = {}) {
  if (hasImage) return { task: "vision", confidence: 0.9, signals: ["image"] };
  if (hasAudio) return { task: "audio", confidence: 0.9, signals: ["audio"] };
  const hits = Object.entries(patterns)
    .map(([task, res]) => ({ task, count: res.filter((re) => re.test(text)).length }))
    .filter((h) => h.count > 0)
    .sort((a, b) => b.count - a.count);
  if (!hits.length) return { task: "chat", confidence: 0.5, signals: [] };
  const top = hits[0];
  return { task: top.task, confidence: Math.min(0.95, 0.5 + top.count * 0.15), signals: hits.map((h) => `${h.task}:${h.count}`) };
}

// Fine-grained: refine within a coarse task.
export function refineTask({ task, text, fine = FINE_TASKS } = {}) {
  const options = fine[task] ?? [];
  const hit = options.find((f) => new RegExp(f, "i").test(text));
  return hit ?? options[0] ?? task;
}
```

**Acceptance criteria:** classifier; confidence; refinement.

### M3 — Task-based routing

**Reference code (`src/lib/tasks/route.js`):**

```js
// Task → model mapping.
export function makeTaskRouter() {
  const mapping = new Map(); // task -> [modelIds]
  return {
    set(task, models) { mapping.set(task, models); },
    modelsFor(task) { return mapping.get(task) ?? []; },
    // Select: task models ∩ candidates, else general.
    select({ task, candidates = [], general = [] } = {}) {
      const specialized = this.modelsFor(task).filter((m) => candidates.includes(m));
      return specialized.length ? specialized : general.filter((m) => candidates.includes(m));
    },
    // Task → strategy mapping.
    strategyFor(task, strategies = {}) { return strategies[task] ?? "balanced"; },
  };
}

// Fallback: general fallback on unknown tasks.
export function fallbackFor({ task, known = [], general = [] } = {}) {
  return known.includes(task) ? null : general;
}
```

**Acceptance criteria:** mapping; selection; fallback.

### M4 — Integration + tests

**Reference code (`src/lib/tasks/integrate.js`):**

```js
// Pre-routing: classify before selection.
export function preRouteTask({ text, hasImage = false, hasAudio = false, router, candidates = [], general = [] } = {}) {
  const { task, confidence } = classifyTask({ text, hasImage, hasAudio });
  const models = router.select({ task, candidates, general });
  return { task, confidence, models, source: models.length ? "task" : "general" };
}

// Observability: task distribution.
export function makeTaskTelemetry() {
  const counts = new Map();
  return {
    record(task) { counts.set(task, (counts.get(task) ?? 0) + 1); },
    report() { return Object.fromEntries(counts); },
  };
}

// Fail-open.
export function safeTask(fn, fallback = null) {
  try { return fn(); } catch { return fallback; }
}
```

**Files touched:** `src/lib/tasks/` (new: taxonomy, classify, route, integrate), `open-sse/handlers/chatCore.js` (pre-routing), dashboard tasks page (new), `tests/unit/tasks.test.js` (new).

**Acceptance criteria:** integration; telemetry; tests.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Misclassification | Wrong routing | Confidence |
| Taxonomy gaps | Uncovered tasks | Extensible taxonomy |
| Overfitting | Narrow routing | General fallback |
| Complexity | Confusion | Coarse-first |

## Verification

- Unit: classifyTask, refineTask, makeTaskRouter, fallbackFor, preRouteTask, makeTaskTelemetry
- Manual: code query → code models; image → vision
- Regression: `tests/__baseline__/verify-no-regression.mjs`