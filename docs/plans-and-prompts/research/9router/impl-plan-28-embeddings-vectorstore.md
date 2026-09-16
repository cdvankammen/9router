---
Date: 2026-09-16
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, embeddings, vector-store, semantic-search, rag
---

# Implementation Plan 28 — Embeddings & Vector Store Integration

> Written after the binary-tree research expansion (see `39-binary-tree-expansion-master-plan.md`, `45-branch-semantic-and-embedding-routing.md`).
> This plan covers the "embeddings/vector store" option: embeddings-based routing and vector store integration.

## 1. Goal

Add embeddings and vector store capabilities to 9Router: embedding-based semantic routing, vector storage for routing knowledge, and RAG-style retrieval for routing decisions.

## 2. Background (from research)

- **9Router current state**: embeddings API exists (`skills/9router-embeddings/`); no vector store.
- **Research findings** (45-branch): semantic routing uses embeddings for task classification; vector stores enable retrieval of routing knowledge; embedding quality determines routing quality.

## 3. Design

### 3.1 Embedding Service

- **Embedding providers**: configurable embedding models (OpenAI, local, etc.).
- **Embedding caching**: cache embeddings by text hash.
- **Embedding metrics**: dimension, latency, cost.

### 3.2 Vector Store

- **Store**: SQLite-backed vector store (with fallback to in-memory).
- **Collections**: routing knowledge, task examples, model profiles.
- **Indexing**: HNSW or brute-force (scale-dependent).

### 3.3 Semantic Routing Integration

- **Task classification**: embed request → nearest task type.
- **Knowledge retrieval**: retrieve routing knowledge for decision support.
- **Example matching**: match request to historical examples.

### 3.4 RAG for Routing

- **Knowledge base**: routing docs, provider quirks, error patterns.
- **Retrieval**: retrieve relevant knowledge at decision time.
- **Grounding**: retrieved knowledge informs routing decisions.

## 4. Implementation Steps

1. Build embedding service.
2. Build vector store.
3. Integrate semantic routing.
4. Add RAG retrieval.
5. Tests: embeddings, retrieval, classification.

## 5. Files Touched

- `src/lib/embeddings/` (extend)
- `src/lib/vectorstore/` (new)
- `open-sse/handlers/chatCore.js` (semantic routing)
- `src/lib/db/repos/vectorRepo.js` (new)
- `tests/unit/embeddings-routing.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Embedding cost | Caching; batching |
| Vector store scale | Indexing strategy |
| Classification errors | Thresholds; fallback |
| RAG staleness | Knowledge refresh |

## 7. Success Criteria

- Embedding service operational.
- Vector store functional.
- Semantic routing active.
- RAG retrieval works.

## 8. Related Plans
- Plan 3 (Semantic Routing) — supersedes/merges.
- Plan 23 (Caching) — embedding cache.
- Plan 8 (Observability) — embedding telemetry.