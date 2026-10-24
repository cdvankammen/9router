# Implementation Plan 114 — RAG-Aware Routing & Hybrid Retrieval — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #rag #retrieval #hybrid #routing #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (RAG cascade from plan 84 (`src/lib/rag/`); encoder management from plan 93 (`src/lib/embeddings/`); context window from plan 55 research).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — detect a RAG request; select RAG-capable model; choose retrieval strategy.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-114-rag-aware-routing.md`, `../research/9router/impl-plan-84-rag-cascade-retrieval.md`, `../research/9router/impl-plan-93-embedding-encoder-management.md`.

## Scope

**In scope:** RAG detection (context blocks, retrieval markers, system prompts; confidence; metadata context size/source count); RAG-aware model selection (long-context + grounding + citation requirements, RAG model mapping, context budget); retrieval strategy selection (dense/sparse/hybrid per request, strategy signals, fallback chain hybrid→dense→sparse); RAG pipeline integration + dashboard.
**Out of scope:** retrieval implementation internals (plan 84); embedding encoder internals (plan 93).

## Milestones

### M1 — RAG detection

**Reference code (`src/lib/ragroute/detect.js`):**

```js
// RAG signals: context blocks, retrieval markers, system prompts.
export const RAG_MARKERS = [
  /\[context\]/i, /<context>/, /retrieved (documents?|chunks?)/i,
  /based (only )?on (the )?(provided|following|above) (context|documents?|sources?)/i,
  /source: /i, /citation/i,
];

export function detectRag({ messages = [], systemPrompt = "" } = {}) {
  let signals = 0;
  let contextSize = 0;
  let sourceCount = 0;
  const text = [systemPrompt, ...messages.map((m) => typeof m.content === "string" ? m.content : JSON.stringify(m.content))].join("\n");
  for (const re of RAG_MARKERS) {
    const m = text.match(re);
    if (m) signals += 1;
  }
  // Context blocks: count large content parts.
  for (const m of messages) {
    if (Array.isArray(m.content)) {
      for (const part of m.content) {
        if (part.type === "text" && part.text?.length > 500) { contextSize += part.text.length; sourceCount += 1; }
      }
    }
  }
  const confidence = Math.min(0.95, 0.4 + signals * 0.2 + (sourceCount > 0 ? 0.2 : 0));
  return { isRag: signals > 0 || sourceCount > 0, confidence, contextSize, sourceCount };
}
```

**Acceptance criteria:** markers; metadata; confidence.

### M2 — RAG-aware model selection

**Reference code (`src/lib/ragroute/select.js`):**

```js
// RAG model requirements: long context, grounding, citation.
export const RAG_REQUIREMENTS = { minContext: 32_000, grounding: true, citation: false };

export function ragCapable(model, { capsOf, requirements = RAG_REQUIREMENTS } = {}) {
  const caps = capsOf(model);
  return (caps.max_context ?? 0) >= requirements.minContext && (caps.grounding ?? false);
}

export function selectRagModels(candidates, { capsOf } = {}) {
  return candidates.filter((m) => ragCapable(m, { capsOf }));
}

// Context budget: retrieved context within model context window.
export function contextBudget({ contextSize, maxContext, reserveForOutput = 4096 } = {}) {
  const available = maxContext - reserveForOutput;
  return { fits: contextSize <= available, budget: available, used: contextSize, overflow: Math.max(0, contextSize - available) };
}

// Mapping: RAG requests → RAG-capable models.
export function mapRagRequest({ candidates, capsOf, contextSize } = {}) {
  const capable = selectRagModels(candidates, { capsOf });
  if (!capable.length) return { ok: false, reason: "no-rag-capable-model" };
  const withBudget = capable.map((m) => ({ model: m, budget: contextBudget({ contextSize, maxContext: capsOf(m).max_context }) }))
    .filter((x) => x.budget.fits);
  if (!withBudget.length) return { ok: false, reason: "context-overflow" };
  return { ok: true, models: withBudget.map((x) => x.model) };
}
```

**Acceptance criteria:** capability filter; context budget; mapping.

### M3 — Retrieval strategy selection

**Reference code (`src/lib/ragroute/strategy.js`):**

```js
// Strategy choice: dense | sparse | hybrid per request.
export function chooseStrategy({ queryType = "general", corpusSize = 1000, latencyBudgetMs = 500, hybridAvailable = true } = {}) {
  if (queryType === "keyword" || queryType === "entity") return "sparse";
  if (queryType === "semantic" || queryType === "conversational") return "dense";
  if (corpusSize > 10_000 && latencyBudgetMs > 300 && hybridAvailable) return "hybrid";
  return "dense";
}

// Strategy signals: query type, corpus size, latency budget.
export function queryTypeOf(text) {
  if (/\b(who|what|where|when|how many|list|name)\b/i.test(text)) return "entity";
  if (/\b(explain|compare|why|how does|summarize)\b/i.test(text)) return "semantic";
  if (/\b(define|meaning of|what is)\b/i.test(text)) return "keyword";
  return "general";
}

// Fallback chain: hybrid → dense → sparse.
export function strategyFallback(preferred, { available = ["hybrid", "dense", "sparse"] } = {}) {
  const order = ["hybrid", "dense", "sparse"];
  const start = order.indexOf(preferred);
  for (let i = start; i < order.length; i++) {
    if (available.includes(order[i])) return order[i];
  }
  return "dense";
}
```

**Acceptance criteria:** strategy choice; signals; fallback chain.

### M4 — Integration + tests

**Reference code (`src/lib/ragroute/integrate.js`):**

```js
// RAG pipeline integration: strategy into retrieval.
export function retrievalPlan({ rag, strategy, budget }) {
  return { useRag: rag.isRag, strategy, contextBudget: budget, confidence: rag.confidence };
}

// Telemetry: RAG routing metrics.
export function makeRagRouteTelemetry() {
  const counts = new Map();
  let ragRequests = 0, total = 0;
  return {
    record({ isRag, strategy }) {
      counts.set(strategy, (counts.get(strategy) ?? 0) + 1);
      total += 1; if (isRag) ragRequests += 1;
    },
    report() {
      return { strategies: Object.fromEntries(counts), ragRate: total ? ragRequests / total : 0 };
    },
  };
}
```

**Files touched:** `src/lib/ragroute/` (new: detect, select, strategy, integrate), `src/lib/rag/` (integration), `src/sse/handlers/chat.js` (RAG routing), `open-sse/config/ragrouteConfig.js` (new), dashboard ragroute page (new), `tests/unit/ragroute.test.js` (new).

**Acceptance criteria:** RAG detected; models selected; strategy chosen; telemetry.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| RAG misdetection | Wrong routing | Conservative detection |
| Context overflow | Truncated context | Context budget |
| Strategy mismatch | Poor retrieval | Fallback chain |
| Cost | Expensive retrieval | Strategy cost tracking |

## Verification

- Unit: detectRag, ragCapable, contextBudget, chooseStrategy, strategyFallback
- Manual: RAG request → long-context model; keyword query → sparse strategy
- Regression: `tests/__baseline__/verify-no-regression.mjs`