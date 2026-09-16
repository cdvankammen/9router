---
Date: 2026-09-16
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, encoder-tradeoffs, embedding-quality, similarity-thresholds, nearest-neighbor
---

# Implementation Plan 93 — Embedding Encoder Management & Similarity Thresholds

> Mined from branch docs: `45-branch-semantic-and-embedding-routing.md` (encoder tradeoffs, embedding quality, similarity thresholds, nearest-neighbor search, dense retrieval).

## 1. Goal

Add embedding encoder management to 9Router: configurable embedding encoders with quality/cost tradeoffs, similarity threshold tuning, and ANN index management — so semantic routing and RAG use optimal embeddings.

## 2. Background (from research)

- **9Router current state**: embeddings exist for semantic routing research; no encoder management.
- **Research findings** (45-branch):
  - Encoder tradeoffs: model size vs. quality vs. cost vs. latency.
  - Embedding quality: dimension, benchmark scores, domain fit.
  - Similarity thresholds: minimum similarity for matches.
  - Nearest-neighbor search: ANN index choice (HNSW, IVF, flat).

## 3. Design

### 3.1 Encoder Registry

- **Encoder model**: id, provider, dimensions, cost, quality score, latency.
- **Encoder selection**: per-use-case encoder (routing vs. RAG vs. search).
- **Encoder fallback**: fallback encoder on failure.

### 3.2 Quality Evaluation

- **Quality benchmarks**: retrieval benchmarks per encoder.
- **Domain fit**: per-domain quality scores.
- **Quality telemetry**: embedding quality metrics in production.

### 3.3 Similarity Thresholds

- **Threshold config**: per-use-case thresholds.
- **Threshold tuning**: calibration from outcome data.
- **Threshold UI**: dashboard tuning with histograms.

### 3.4 ANN Index Management

- **Index types**: HNSW, IVF, flat.
- **Index lifecycle**: build, update, rebuild.
- **Index metrics**: recall, latency, memory.

### 3.5 Integration

- **Semantic routing integration**: encoder choice per route.
- **RAG integration**: encoder choice per retrieval.
- **Observability**: encoder/quality metrics.
- **Dashboard**: encoder management UI.

## 4. Implementation Steps

1. Build encoder registry (`src/lib/embeddings/encoders.js`).
2. Add quality evaluation.
3. Add threshold management.
4. Add ANN index management.
5. Integrate semantic routing + RAG.
6. Dashboard: encoder UI.
7. Tests: encoder selection, thresholds, indexes.

## 5. Files Touched

- `src/lib/embeddings/` (encoders, quality, thresholds, indexes)
- `src/lib/semantic/` (integration)
- `src/lib/rag/` (integration)
- `open-sse/config/encoderConfig.js` (new)
- Dashboard encoders page (new)
- `tests/unit/encoders.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Encoder mismatch | Per-use-case selection |
| Threshold drift | Calibration |
| Index staleness | Rebuild schedules |
| Cost | Encoder cost tracking |

## 7. Success Criteria

- Encoders configurable per use-case.
- Quality metrics visible.
- Thresholds tunable.
- ANN indexes managed.

## 8. Related Plans

- Plan 28 (Embeddings) — embedding infrastructure.
- Plan 84 (RAG Cascade) — retrieval integration.
- Plan 3 (Semantic Routing) — routing integration.
- Plan 45 (Semantic Routing) — research foundations.