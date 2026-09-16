---
Date: 2026-09-16
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, retrieval-routing, rag-routing, retrieval-quality, hybrid-retrieval
---

# Implementation Plan 161 — Retrieval Routing & Hybrid Retrieval

> Mined from branch docs: `48-branch-emerging-and-frontier.md` (Level 3: BBA — Retrieval Routing, BBB — Hybrid Retrieval, BBA-A — Retrieval Quality).

## 1. Goal

Implement retrieval routing for 9Router: route retrieval requests to the best retrieval strategy (vector, keyword, hybrid), monitor retrieval quality, and tune retrieval parameters — improving RAG quality.

## 2. Background (from research)

- **9Router current state**: Basic RAG support (plan 84).
- **Research findings** (48-branch):
  - Retrieval routing (BBA): retrieval strategy selection.
  - Hybrid retrieval (BBB): combine strategies.
  - Retrieval quality (BBA-A): quality metrics.

## 3. Design

### 3.1 Retrieval Registry

- **Strategy catalog**: vector, keyword, hybrid.
- **Strategy properties**: speed, quality, cost.
- **Strategy availability**: per-vectorstore.

### 3.2 Retrieval Routing

- **Query classification**: retrieval query type.
- **Strategy selection**: best strategy per query.
- **Strategy fallback**: fallback strategies.

### 3.3 Hybrid Retrieval

- **Fusion**: combine results (RRF).
- **Weighting**: strategy weights.
- **Deduplication**: dedupe results.

### 3.4 Integration

- **RAG integration**: retrieval routing.
- **Observability**: retrieval metrics.
- **Dashboard**: retrieval view.

## 4. Implementation Steps

1. Build retrieval registry.
2. Add strategy selection.
3. Add hybrid fusion.
4. Integrate RAG.
5. Dashboard: retrieval view.
6. Tests: selection, fusion, quality.

## 5. Files Touched

- `src/lib/retrieval/` (new: registry, select, fuse)
- `open-sse/services/rag.js` (integration)
- Dashboard retrieval page (new)
- `tests/unit/retrieval.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Quality loss | Monitoring |
| Latency | Strategy speed |
| Fusion complexity | Simple RRF |
| Cost | Strategy cost |

## 7. Success Criteria

- Strategies catalogued.
- Selection works.
- Fusion functional.
- Quality improved.

## 8. Related Plans

- Plan 84 (RAG Cascade) — RAG foundations.
- Plan 114 (RAG-Aware Routing) — RAG routing.
- Plan 145 (Encoder Selection) — encoders.
- Plan 146 (Similarity Metrics) — metrics.