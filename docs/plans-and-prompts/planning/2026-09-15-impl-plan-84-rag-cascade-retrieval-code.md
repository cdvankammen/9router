# Implementation Plan 84 — RAG Cascade & Retrieval Routing — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #rag #retrieval #cascade #embeddings #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (embeddings infrastructure in `src/lib/embeddings/`; semantic routing from plan 45 research; context window budget from plan 55; token optimization from plan 26 research).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — index a small corpus; run a RAG request; confirm cascade escalates when quality is low.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-84-rag-cascade-retrieval.md`, `../research/9router/impl-plan-28-embeddings-vectorstore.md`, `../research/9router/impl-plan-55-context-window-management.md`.

## Scope

**In scope:** retrieval pipeline (sparse BM25 → dense embeddings+ANN → hybrid fusion) with cascade escalation on low quality; retrieval quality evaluation (query-context similarity, coherence, post-hoc grounding); index management (BM25 built-in, HNSW optional, incremental updates, versioning); context injection into chat pipeline with token budget; observability + dashboard.
**Out of scope:** external vector DBs (in-process first); document ingestion pipelines beyond basic chunking.

## Milestones

### M1 — Retrieval core (sparse + dense + hybrid)

**Reference code (`src/lib/rag/retrieve.js`):**

```js
// Sparse retrieval: BM25-style scoring over tokenized docs.
export function tokenize(text) {
  return (text.toLowerCase().match(/[a-z0-9]+/g) ?? []);
}

export function bm25(query, docs, { k1 = 1.5, b = 0.75 } = {}) {
  const qTokens = tokenize(query);
  const docTokens = docs.map((d) => tokenize(d.text));
  const N = docs.length;
  const df = new Map();
  for (const toks of docTokens) for (const t of new Set(toks)) df.set(t, (df.get(t) ?? 0) + 1);
  const avgLen = docTokens.reduce((a, t) => a + t.length, 0) / Math.max(1, N);
  return docs.map((doc, i) => {
    const toks = docTokens[i];
    const tf = new Map();
    for (const t of toks) tf.set(t, (tf.get(t) ?? 0) + 1);
    let score = 0;
    for (const t of qTokens) {
      const f = tf.get(t) ?? 0;
      if (!f) continue;
      const idf = Math.log(1 + (N - (df.get(t) ?? 0) + 0.5) / ((df.get(t) ?? 0) + 0.5));
      score += idf * ((f * (k1 + 1)) / (f + k1 * (1 - b + b * (toks.length / avgLen))));
    }
    return { id: doc.id, score, text: doc.text };
  }).sort((a, b) => b.score - a.score);
}

// Dense retrieval: cosine similarity over embeddings.
export function denseSearch(queryEmbedding, docs, { topK = 5 } = {}) {
  const scored = docs
    .filter((d) => d.embedding)
    .map((d) => ({ id: d.id, score: cosine(queryEmbedding, d.embedding), text: d.text }))
    .sort((a, b) => b.score - a.score);
  return scored.slice(0, topK);
}

export function cosine(a, b) {
  const dot = a.reduce((s, v, i) => s + v * (b[i] ?? 0), 0);
  const na = Math.sqrt(a.reduce((s, v) => s + v * v, 0));
  const nb = Math.sqrt(b.reduce((s, v) => s + v * v, 0));
  return na && nb ? dot / (na * nb) : 0;
}

// Hybrid: normalized score fusion.
export function hybridFusion(sparse, dense, { alpha = 0.5 } = {}) {
  const maxS = Math.max(...sparse.map((r) => r.score), 1e-6);
  const maxD = Math.max(...dense.map((r) => r.score), 1e-6);
  const byId = new Map();
  for (const r of sparse) byId.set(r.id, { id: r.id, text: r.text, sparse: r.score / maxS, dense: 0 });
  for (const r of dense) {
    const e = byId.get(r.id) ?? { id: r.id, text: r.text, sparse: 0 };
    e.dense = r.score / maxD;
    byId.set(r.id, e);
  }
  return [...byId.values()]
    .map((e) => ({ ...e, score: alpha * e.sparse + (1 - alpha) * e.dense }))
    .sort((a, b) => b.score - a.score);
}
```

**Acceptance criteria:** BM25 scores; dense cosine; hybrid fusion.

### M2 — Quality evaluation + cascade

**Reference code (`src/lib/rag/quality.js` + `cascade.js`):**

```js
// Retrieval quality signals.
export function retrievalQuality({ query, results, threshold = 0.3 } = {}) {
  if (!results.length) return { score: 0, pass: false, reason: "no-results" };
  const top = results[0].score;
  const coverage = results.filter((r) => r.score > threshold).length / results.length;
  const score = Number((top * 0.6 + coverage * 0.4).toFixed(3));
  return { score, pass: score >= threshold, top, coverage };
}

// Cascade: escalate stage when quality insufficient.
export const STAGES = ["sparse", "dense", "hybrid"];
export function nextStage(current) {
  const i = STAGES.indexOf(current);
  return i >= 0 && i < STAGES.length - 1 ? STAGES[i + 1] : null;
}

export function shouldCascade(quality, { minScore = 0.3 } = {}) {
  return !quality.pass || quality.score < minScore;
}
```

**Acceptance criteria:** quality scored; cascade escalates; terminal stage stops.

### M3 — Index management

**Reference code (`src/lib/rag/index.js`):**

```js
// In-process index with incremental updates + versioning.
export function makeIndex() {
  let docs = [];       // { id, text, embedding?, version }
  let version = 1;
  return {
    add(doc) { docs.push({ ...doc, version }); },
    remove(id) { docs = docs.filter((d) => d.id !== id); },
    update(id, doc) { this.remove(id); this.add(doc); },
    snapshot() { return { version, count: docs.length }; },
    all() { return docs; },
    bumpVersion() { version += 1; },
    // Rollback: restore a previous snapshot (caller keeps snapshots).
    restore(snap) { docs = snap.docs; version = snap.version; },
  };
}

// Token budget for injected context.
export function fitContext(results, { maxTokens = 4000, tokensPerChar = 0.25 } = {}) {
  const out = [];
  let used = 0;
  for (const r of results) {
    const cost = Math.ceil(r.text.length * tokensPerChar);
    if (used + cost > maxTokens) break;
    out.push(r);
    used += cost;
  }
  return { context: out, usedTokens: used };
}
```

**Acceptance criteria:** incremental add/remove/update; versioning + rollback; token budget.

### M4 — Integration + tests

**Reference code (`src/lib/rag/integrate.js`):**

```js
import { bm25, denseSearch, hybridFusion } from "./retrieve.js";
import { retrievalQuality, shouldCascade, nextStage } from "./quality.js";
import { fitContext } from "./index.js";

// Full cascade: run stages until quality passes or stages exhausted.
export async function runCascade({ query, queryEmbedding, index, embed, qualityThreshold = 0.3 }) {
  let stage = "sparse";
  let results = [];
  const trail = [];
  while (stage) {
    if (stage === "sparse") results = bm25(query, index.all());
    else if (stage === "dense") {
      const emb = queryEmbedding ?? (await embed(query));
      results = denseSearch(emb, index.all());
    } else {
      const emb = queryEmbedding ?? (await embed(query));
      results = hybridFusion(bm25(query, index.all()), denseSearch(emb, index.all()));
    }
    const quality = retrievalQuality({ query, results, threshold: qualityThreshold });
    trail.push({ stage, quality });
    if (!shouldCascade(quality, { minScore: qualityThreshold })) break;
    stage = nextStage(stage);
  }
  return { results, trail, finalStage: stage ?? trail.at(-1)?.stage };
}
```

**Files touched:** `src/lib/rag/` (new: retrieve, quality, cascade, index, integrate), `src/lib/embeddings/` (reuse), `src/sse/handlers/chat.js` (context injection), `src/lib/db/repos/ragRepo.js` (new), dashboard RAG page (new), `tests/unit/rag.test.js` (new).

**Acceptance criteria:** cascade runs; quality gates escalation; context injected within budget.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Retrieval latency | Slow requests | Stage-1 fast path + caching |
| Index staleness | Stale context | Incremental updates |
| Quality misjudgment | Wrong escalation | Multi-signal evaluation |
| Context bloat | Token overflow | Token budget |

## Verification

- Unit: bm25, denseSearch, hybridFusion, retrievalQuality, runCascade, fitContext
- Manual: index corpus → RAG request → context injected; low-quality → cascade to dense
- Regression: `tests/__baseline__/verify-no-regression.mjs`