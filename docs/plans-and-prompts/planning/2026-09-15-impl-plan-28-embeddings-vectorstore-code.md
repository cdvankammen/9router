# Implementation Plan 28 — Embeddings & Vector Store — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #embeddings #vectorstore #semantic-routing #rag #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (imports, function signatures, existing `src/lib/embeddings/` (embeddings exist per repo structure), `open-sse/services/smartRouter.js`, `src/lib/db/` conventions).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — run the app, hit the endpoints, confirm acceptance criteria.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-28-embeddings-vectorstore.md`, `../research/9router/43-branch-moe-and-expert-routing.md` (semantic routing tie-in)

## Scope

**In scope:** embedding service (configurable providers, caching by text hash, metrics); SQLite-backed vector store (collections: routing knowledge, task examples, model profiles; brute-force or HNSW); semantic routing integration (embed request → nearest task type); RAG retrieval for routing decisions.
**Out of scope:** external vector DB (Qdrant etc.); training custom embeddings.

## Milestones

### M1 — Embedding service

**Reference code (`src/lib/embeddings/service.js`):**

```js
// Configurable embedding providers; cache by text hash.
const cache = new Map(); // textHash -> embedding

export async function embedText(text, { provider = "default" } = {}) {
  const hash = createHash("sha256").update(text).digest("hex");
  if (cache.has(hash)) return cache.get(hash);
  const embedding = await callEmbeddingProvider(provider, text);
  cache.set(hash, embedding);
  return embedding;
}

async function callEmbeddingProvider(provider, text) {
  // provider config: { baseUrl, model, apiKeyRef }
  const cfg = getEmbeddingConfig(provider);
  const res = await fetch(`${cfg.baseUrl}/v1/embeddings`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${resolveKey(cfg.apiKeyRef)}` },
    body: JSON.stringify({ model: cfg.model, input: text }),
  });
  if (!res.ok) throw new Error(`embedding failed: ${res.status}`);
  const data = await res.json();
  return data.data[0].embedding;
}
```

**Acceptance criteria:** provider configurable; cache by hash; metrics (latency, tokens).

### M2 — SQLite vector store

**Reference code (`src/lib/vectorstore/store.js`):**

```js
// Collections: routing_knowledge, task_examples, model_profiles.
export async function upsertVector(collection, id, embedding, metadata) {
  const db = await getAdapter();
  await db.run(`
    INSERT INTO vectors (collection, id, embedding, metadata, updated_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(collection, id) DO UPDATE SET
      embedding = excluded.embedding, metadata = excluded.metadata, updated_at = excluded.updated_at
  `, [collection, id, JSON.stringify(embedding), JSON.stringify(metadata), Date.now()]);
}

// Brute-force cosine search (fine for <10k vectors; HNSW later).
export async function vectorSearch(collection, queryEmbedding, topK = 5) {
  const db = await getAdapter();
  const rows = await db.all(`SELECT id, embedding, metadata FROM vectors WHERE collection = ?`, [collection]);
  const scored = rows.map((r) => ({
    id: r.id,
    metadata: JSON.parse(r.metadata),
    similarity: cosineSimilarity(queryEmbedding, JSON.parse(r.embedding)),
  }));
  return scored.sort((a, b) => b.similarity - a.similarity).slice(0, topK);
}

export function cosineSimilarity(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1);
}
```

**Acceptance criteria:** upsert/search works; cosine similarity correct; collections isolated.

### M3 — Semantic routing integration

**Reference code (`open-sse/services/smartRouter.js` extension):**

```js
// Semantic routing: embed request -> nearest task type -> route accordingly.
export async function semanticTaskType(prompt, { threshold = 0.7 } = {}) {
  const embedding = await embedText(prompt);
  const neighbors = await vectorSearch("task_examples", embedding, 1);
  const best = neighbors[0];
  if (best && best.similarity >= threshold) {
    return { taskType: best.metadata.taskType, similarity: best.similarity };
  }
  return { taskType: "general_chat", similarity: 0 };
}

// RAG retrieval: pull routing knowledge for decision context.
export async function retrieveRoutingKnowledge(prompt, topK = 3) {
  const embedding = await embedText(prompt);
  return vectorSearch("routing_knowledge", embedding, topK);
}
```

**Acceptance criteria:** task classification via embeddings; RAG retrieval feeds decisions.

### M4 — Config + tests

**Reference code (`src/lib/db/repos/settingsRepo.js` extension):**

```js
// Add to DEFAULT_SETTINGS:
embeddings: { enabled: false, provider: "default", model: "text-embedding-3-small" },
vectorStore: { enabled: false, collections: ["routing_knowledge", "task_examples", "model_profiles"] },
```

**Files touched:** `tests/unit/embeddings-routing.test.js` (new).

**Acceptance criteria:** settings wired; tests pass.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Embedding provider cost | Cache by hash; batch |
| Brute-force scaling | HNSW later; collection pruning |
| Semantic misclassification | Threshold tuning + fallback |

## Verification

- Unit: embedding cache, vector search, semantic routing
- Manual: enable embeddings → verify task classification
- Regression: `tests/__baseline__/verify-no-regression.mjs`