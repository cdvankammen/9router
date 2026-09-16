---
Date: 2026-09-16
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, encoder-selection, embedding-quality, embedding-models, encoder-tradeoffs
---

# Implementation Plan 145 — Embedding Encoder Selection & Quality

> Mined from branch docs: `45-branch-semantic-and-embedding-routing.md` (Level 3: AAA — Encoder Selection, AAA-A — Encoder Tradeoffs, AAA-B — Embedding Quality).

## 1. Goal

Implement embedding encoder selection and quality management for 9Router: formalize encoder choice (model, dimensions, cost), add embedding quality monitoring, and add encoder fallback — ensuring semantic routing quality.

## 2. Background (from research)

- **9Router current state**: Embeddings exist (plan 27); encoder choice ad hoc.
- **Research findings** (45-branch):
  - Encoder selection (AAA): which encoder.
  - Encoder tradeoffs (AAA-A): quality vs cost vs speed.
  - Embedding quality (AAA-B): embedding quality metrics.
  - Similarity metrics (AAB): metric choice.

## 3. Design

### 3.1 Encoder Registry

- **Encoder catalog**: available encoders.
- **Encoder properties**: dimensions, cost, speed.
- **Encoder quality**: quality benchmarks.

### 3.2 Encoder Selection

- **Selection strategy**: quality/cost/speed tradeoffs.
- **Per-task encoders**: task-specific encoders.
- **Encoder fallback**: fallback on failure.

### 3.3 Quality Monitoring

- **Quality metrics**: retrieval quality.
- **Drift detection**: embedding drift.
- **Quality alerts**: quality degradation.

### 3.4 Integration

- **Embedding integration**: encoder selection.
- **Observability**: encoder metrics.
- **Dashboard**: encoder view.

## 4. Implementation Steps

1. Build encoder registry.
2. Add selection strategy.
3. Add quality monitoring.
4. Add encoder fallback.
5. Dashboard: encoder view.
6. Tests: selection, quality, fallback.

## 5. Files Touched

- `src/lib/encoders/` (new: registry, select, quality)
- `open-sse/services/embeddings.js` (integration)
- Dashboard encoders page (new)
- `tests/unit/encoders.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Quality loss | Monitoring |
| Cost increase | Cost-aware selection |
| Drift | Drift detection |
| Encoder failure | Fallback |

## 7. Success Criteria

- Encoders catalogued.
- Selection works.
- Quality monitored.
- Fallback functional.

## 8. Related Plans

- Plan 27 (Embeddings Vectorstore) — embeddings.
- Plan 93 (Embedding Management) — management.
- Plan 84 (RAG Cascade) — retrieval.
- Plan 114 (RAG-Aware Routing) — RAG routing.