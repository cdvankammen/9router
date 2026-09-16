---
Date: 2026-09-16
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, rag-cascade, retrieval-quality, dense-retrieval, sparse-retrieval, embeddings
---

# Implementation Plan 84 — RAG Cascade & Retrieval Routing

> Mined from branch docs: `45-branch-semantic-and-embedding-routing.md` (RAG cascade, retrieval quality, dense retrieval, sparse retrieval, nearest-neighbor search, similarity thresholds, embedding quality, encoder tradeoffs).

## 1. Goal

Add a RAG cascade to 9Router: route retrieval-augmented requests through a retrieval pipeline (dense + sparse + hybrid), evaluate retrieval quality, and cascade to better retrieval strategies when quality is insufficient — so RAG requests get high-quality context.

## 2. Background (from research)

- **9Router current state**: no retrieval infrastructure; embeddings exist only for semantic routing research.
- **Research findings** (45-branch):
  - RAG cascade: escalate retrieval strategy when quality is low.
  - Dense retrieval: embedding-based semantic search.
  - Sparse retrieval: keyword/BM25 search.
  - Hybrid retrieval: combine dense + sparse.
  - Nearest-neighbor search: ANN indexes (HNSW, IVF).
  - Similarity thresholds: minimum similarity for context inclusion.
  - Retrieval quality: precision/recall of retrieved context.
  - Encoder tradeoffs: embedding model choice (size, quality, cost).

## 3. Design

### 3.1 Retrieval Pipeline

```
Request → detect RAG intent → retrieve:
  Stage 1: sparse (BM25) — fast, cheap
  Stage 2: dense (embeddings + ANN) — semantic
  Stage 3: hybrid (fusion) — best quality
  Cascade: if Stage N quality < threshold → Stage N+1
```

### 3.2 Retrieval Quality Evaluation

- **Quality signals**: query-context similarity, context coherence, answer-grounding (post-hoc).
- **Thresholds**: per-stage minimum quality.
- **Cascade trigger**: quality below threshold → escalate.

### 3.3 Index Management

- **Index types**: BM25 (built-in), HNSW (optional native), IVF.
- **Index updates**: incremental indexing.
- **Index versioning**: versioned indexes for rollback.

### 3.4 Integration

- **Embedding service**: reuse `src/lib/embeddings` infrastructure.
- **Context injection**: retrieved context into system prompt.
- **Observability**: retrieval quality metrics.
- **Dashboard**: retrieval config + quality view.

## 4. Implementation Steps

1. Build retrieval core (`src/lib/rag/`): sparse, dense, hybrid.
2. Add ANN index support.
3. Build quality evaluation.
4. Add cascade logic.
5. Integrate context injection into chat pipeline.
6. Dashboard: RAG config.
7. Tests: retrieval quality, cascade behavior.

## 5. Files Touched

- `src/lib/rag/` (new: sparse, dense, hybrid, quality, cascade)
- `src/lib/embeddings/` (reuse)
- `src/sse/handlers/chat.js` (context injection)
- `src/lib/db/repos/ragRepo.js` (new)
- Dashboard RAG page (new)
- `tests/unit/rag.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Retrieval latency | Stage-1 fast path + caching |
| Index staleness | Incremental updates |
| Quality misjudgment | Multi-signal evaluation |
| Context bloat | Token budget for context |

## 7. Success Criteria

- RAG requests get retrieved context.
- Cascade escalates on low quality.
- Retrieval quality metrics visible.
- No regression for non-RAG requests.

## 8. Related Plans

- Plan 28 (Embeddings/Vectorstore) — embedding infrastructure.
- Plan 45 (Semantic Routing) — embedding reuse.
- Plan 55 (Context Window) — context budget.
- Plan 26 (Token Optimization) — context token cost.