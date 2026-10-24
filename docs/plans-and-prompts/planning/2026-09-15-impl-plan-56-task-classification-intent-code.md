# Implementation Plan 56 — Task Classification & Intent Detection — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #task-classification #intent #routing #confidence #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (existing task-type detection in `src/sse/handlers/chat.js` / `open-sse/handlers/chatCore.js`; `open-sse/config/` constants; embeddings service from plan 28; rules engine from plan 27).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — classify sample requests with each method; confirm thresholds; check routing uses task type.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-56-task-classification-intent.md`, `../research/9router/45-branch-semantic-and-embedding-routing.md`, `../research/9router/impl-plan-03-semantic-routing.md`.

## Scope

**In scope:** task taxonomy (code, chat, reasoning, translation, summarization, extraction, creative, analysis) with per-type routing preferences; keyword classifier (fast baseline); embedding classifier (semantic, opt-in); LLM classifier (opt-in, expensive); ensemble with confidence scores; confidence thresholds with default-routing fallback; classification telemetry.
**Out of scope:** online learning of the classifier; per-user personalization.

## Milestones

### M1 — Task taxonomy + keyword classifier

**Reference code (`open-sse/config/taskConfig.js`):**

```js
// Task taxonomy with routing preferences.
export const TASK_TYPES = {
  code: { keywords: ["function", "bug", "refactor", "typescript", "python", "error:", "stack trace", "syntax"], routing: { prefer: ["code-models"] } },
  chat: { keywords: ["hello", "hi", "how are you", "thanks"], routing: { prefer: ["fast-models"] } },
  reasoning: { keywords: ["explain why", "prove", "logic", "math", "derive", "compare"], routing: { prefer: ["reasoning-models"] } },
  translation: { keywords: ["translate", "translation", "in french", "in spanish", "日本語で"], routing: { prefer: ["quality-models"] } },
  summarization: { keywords: ["summarize", "summary", "tl;dr", "condense"], routing: { prefer: ["cheap-models"] } },
  extraction: { keywords: ["extract", "parse", "json", "list the", "fields"], routing: { prefer: ["structured-models"] } },
  creative: { keywords: ["write a story", "poem", "brainstorm", "idea"], routing: { prefer: ["creative-models"] } },
  analysis: { keywords: ["analyze", "evaluate", "assess", "review this"], routing: { prefer: ["quality-models"] } },
};

export const DEFAULT_TASK = "chat";
```

**Reference code (`src/lib/classify/keyword.js`):**

```js
import { TASK_TYPES, DEFAULT_TASK } from "../../../open-sse/config/taskConfig.js";

// Fast keyword classifier: score each task by keyword hits in the last user message.
export function classifyByKeywords(messages) {
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  const text = (lastUser?.content ?? "").toLowerCase();
  if (!text) return { task: DEFAULT_TASK, confidence: 0, scores: {} };

  const scores = {};
  for (const [task, cfg] of Object.entries(TASK_TYPES)) {
    scores[task] = cfg.keywords.reduce((acc, kw) => acc + (text.includes(kw) ? 1 : 0), 0);
  }
  const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
  const total = Object.values(scores).reduce((a, b) => a + b, 0);
  return {
    task: best[1] > 0 ? best[0] : DEFAULT_TASK,
    confidence: total > 0 ? best[1] / total : 0,
    scores,
  };
}
```

**Acceptance criteria:** taxonomy extensible; keyword classifier returns task + confidence + scores.

### M2 — Embedding + LLM classifiers (opt-in)

**Reference code (`src/lib/classify/embedding.js`):**

```js
// Semantic classifier: cosine similarity of last user message vs per-task exemplars.
// Requires embeddings service (plan 28). Fail-open to keyword classifier.
export async function classifyByEmbeddings(messages, { embed } = {}) {
  if (!embed) return null; // not configured — caller falls back
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  if (!lastUser) return null;

  const EXEMPLARS = {
    code: "write a function to parse json",
    chat: "hello, how are you today",
    reasoning: "explain why this proof is valid",
    translation: "translate this paragraph to french",
    summarization: "summarize this article",
    extraction: "extract the fields from this text",
    creative: "write a short story about a robot",
    analysis: "analyze the pros and cons of this proposal",
  };

  const [queryVec, ...taskVecs] = await Promise.all([
    embed(lastUser.content),
    ...Object.values(EXEMPLARS).map((t) => embed(t)),
  ]);
  const scores = {};
  Object.keys(EXEMPLARS).forEach((task, i) => {
    scores[task] = cosine(queryVec, taskVecs[i]);
  });
  const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
  return { task: best[0], confidence: best[1], scores };
}

function cosine(a, b) {
  const dot = a.reduce((acc, v, i) => acc + v * b[i], 0);
  const na = Math.sqrt(a.reduce((acc, v) => acc + v * v, 0));
  const nb = Math.sqrt(b.reduce((acc, v) => acc + v * v, 0));
  return na && nb ? dot / (na * nb) : 0;
}
```

**Reference code (`src/lib/classify/llm.js`):**

```js
// LLM classifier (opt-in, expensive): ask a cheap model to classify.
// Fail-open: any error → null → caller falls back.
export async function classifyByLlm(messages, { classify } = {}) {
  if (!classify) return null;
  try {
    const result = await classify(messages);
    return { task: result.task, confidence: result.confidence ?? 0.9, scores: result.scores ?? {} };
  } catch {
    return null;
  }
}
```

**Acceptance criteria:** embedding classifier fail-open; LLM classifier opt-in + fail-open; ensemble combines.

### M3 — Ensemble + confidence thresholds

**Reference code (`src/lib/classify/ensemble.js`):**

```js
import { classifyByKeywords } from "./keyword.js";
import { classifyByEmbeddings } from "./embedding.js";
import { classifyByLlm } from "./llm.js";
import { DEFAULT_TASK } from "../../../open-sse/config/taskConfig.js";

// Ensemble: weighted vote. Weights: keyword 1, embedding 2, llm 3 (configurable).
export async function classify(messages, { embed, classifyLlm, weights = { keyword: 1, embedding: 2, llm: 3 } } = {}) {
  const results = [classifyByKeywords(messages)];
  const emb = await classifyByEmbeddings(messages, { embed });
  if (emb) results.push({ ...emb, method: "embedding" });
  const llm = await classifyByLlm(messages, { classify: classifyLlm });
  if (llm) results.push({ ...llm, method: "llm" });

  const votes = {};
  for (const r of results) {
    const w = weights[r.method ?? "keyword"];
    votes[r.task] = (votes[r.task] ?? 0) + w * (r.confidence || 0.5);
  }
  const best = Object.entries(votes).sort((a, b) => b[1] - a[1])[0];
  const total = Object.values(votes).reduce((a, b) => a + b, 0);
  const confidence = total > 0 ? best[1] / total : 0;

  // Threshold: below CONFIDENCE_THRESHOLD → default routing.
  const threshold = Number(process.env.CLASSIFY_THRESHOLD ?? 0.4);
  return { task: confidence >= threshold ? best[0] : DEFAULT_TASK, confidence, usedMethods: results.map((r) => r.method ?? "keyword") };
}
```

**Acceptance criteria:** ensemble votes; threshold gates routing; telemetry records used methods.

### M4 — Routing integration + telemetry + tests

**Reference code (integration in `src/sse/handlers/chat.js`):**

```js
// Before combo expansion: classify → attach taskType to context.
import { classify } from "@/lib/classify/ensemble.js";

export async function withTaskType(messages, context) {
  const result = await classify(messages, {
    embed: context.embeddingsEnabled ? context.embed : null,
    classifyLlm: context.llmClassifierEnabled ? context.classifyLlm : null,
  });
  context.taskType = result.task;
  context.classifyConfidence = result.confidence;
  // Telemetry: record classification (classifyRepo).
  return context;
}
```

**Files touched:** `src/lib/classify/` (new: keyword, embedding, llm, ensemble), `open-sse/config/taskConfig.js` (new), `src/sse/handlers/chat.js` (integration), `src/lib/db/repos/classifyRepo.js` (new: telemetry), `tests/unit/classification.test.js` (new).

**Acceptance criteria:** task type attached pre-routing; telemetry recorded; tests cover all methods + thresholds.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Misclassification | Wrong routing | Confidence thresholds + fallback |
| Classifier cost | Expensive calls | Method tiers (keyword free) |
| Taxonomy gaps | Unknown tasks | Extensible taxonomy + default |
| Feedback loops | Degradation | Outcome tracking |

## Verification

- Unit: keyword, embedding, ensemble, thresholds
- Manual: sample requests → classification shown in dashboard
- Regression: `tests/__baseline__/verify-no-regression.mjs`