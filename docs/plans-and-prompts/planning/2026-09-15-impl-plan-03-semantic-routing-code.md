# Implementation Plan 03 — Semantic Routing (Embedding-based) — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #semantic-routing #embeddings #vector-space #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (imports, function signatures, `open-sse/services/smartRouter.js` classifyTask, FastEmbed/ONNX availability, DB adapter).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — run the app, hit the endpoints, check the DB, confirm acceptance criteria.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-03-semantic-routing.md`, `../research/9router/45-branch-semantic-and-embedding-routing.md`

## Scope

**In scope:** embedding-based task classification (aurelio-labs semantic-router pattern); FastEmbed (ONNX) or OpenAI embeddings; cosine similarity to route centroids; config-gated; vLLM SR-style pipeline as phase 2.
**Out of scope:** full vLLM SR pipeline (signals/projections/decisions/plugins) — phase 2.

## Milestones

### M1 — Semantic router service + encoder abstraction

**Reference code (`open-sse/services/semanticRouter.js`):**

```js
// Encoder abstraction: FastEmbed (ONNX, local, free) or OpenAI embeddings.
export class SemanticRouter {
  constructor({ encoder = "fastembed", routes = TASK_ROUTES } = {}) {
    this.encoder = encoder;
    this.routes = routes; // { taskType: { centroid: Float32Array, examples: string[] } }
    this.encoderFn = this._initEncoder(encoder);
  }

  async _initEncoder(type) {
    if (type === "fastembed") {
      const { Embedding } = await import("@xenova/transformers"); // or fastembed npm
      const model = await Embedding.from_pretrained("Xenova/all-MiniLM-L6-v2");
      return (text) => model.encode(text);
    }
    if (type === "openai") {
      return async (text) => {
        const res = await fetch("https://api.openai.com/v1/embeddings", {
          method: "POST",
          headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({ model: "text-embedding-3-small", input: text }),
        });
        const data = await res.json();
        return new Float32Array(data.data[0].embedding);
      };
    }
    throw new Error(`unknown encoder: ${type}`);
  }

  async classify(text, { threshold = 0.6 } = {}) {
    const embedding = await this.encoderFn(text);
    let best = { task: "general_chat", score: 0 };
    for (const [task, { centroid }] of Object.entries(this.routes)) {
      const score = cosineSimilarity(embedding, centroid);
      if (score > best.score) best = { task, score };
    }
    return best.score >= threshold ? best.task : "general_chat";
  }
}

function cosineSimilarity(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}
```

**Route centroids (pre-computed from utterance examples):**

```js
// TASK_ROUTES — seed with 10–20 examples per task type from usageDb + curated.
const TASK_ROUTES = {
  "code:generation": { centroid: null, examples: ["write a function", "implement a class", "generate code for"] },
  "code:debugging": { centroid: null, examples: ["debug this error", "fix the bug", "why does this fail"] },
  "summarization": { centroid: null, examples: ["summarize this", "tl;dr", "give me a summary"] },
  // ... all 10 task types
};
```

**Acceptance criteria:** encoder loads (FastEmbed local); classify returns task type; threshold fallback to general_chat.

### M2 — Wire into `classifyTask()` (config-gated)

**Reference code (`open-sse/services/smartRouter.js`):**

```js
// In classifyTask(body):
if (settings.semanticRouter?.enabled) {
  const task = await semanticRouter.classify(extractText(body));
  if (task !== "general_chat") return task;
}
// fallback to keyword classification
```

**Acceptance criteria:** semantic classification used when enabled; keyword fallback works.

### M3 — Route management UI + tests

**Files touched:**
- Dashboard: semantic-router page (add/remove routes, edit utterances, recompute centroids)
- `src/app/api/v1/semantic-routes/route.js` (new)
- `tests/unit/semantic-router.test.js` (new)

**Acceptance criteria:** UI manages routes; centroids recompute; classification accuracy test.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| FastEmbed/ONNX | Native dep may fail | Optional; fallback to OpenAI embeddings |
| Centroid quality | Bad centroids = bad classification | Seed from real usageDb; allow manual edit |
| Latency | Embedding adds ~50ms | Cache embeddings; async classify |

## Verification

- Unit: cosine similarity, classification accuracy, threshold behavior
- Manual: enable semantic router → send requests → verify task classification
- Regression: `tests/__baseline__/verify-no-regression.mjs`