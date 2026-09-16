---
Date: 2026-09-16
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, hybrid-retrieval, retrieval-routing, rag-aware-routing, context-retrieval
---

# Implementation Plan 114 — RAG-Aware Routing & Hybrid Retrieval

> Mined from branch docs: `48-branch-emerging-and-frontier.md` (RAG-aware routing, retrieval routing, hybrid retrieval) and `45-branch-semantic-and-embedding-routing.md` (dense/sparse retrieval).

## 1. Goal

Add RAG-aware routing to 9Router: detect retrieval-augmented requests, route them to models with long context + grounding ability, and choose retrieval strategy (dense, sparse, hybrid) per request — so RAG requests get models that use retrieved context well.

## 2. Background (from research)

- **9Router current state**: no RAG awareness in routing.
- **Research findings** (48-branch):
  - RAG-aware routing: route RAG requests to suitable models.
  - Retrieval routing: choose retrieval strategy per request.
  - Hybrid retrieval: combine dense + sparse.

## 3. Design

### 3.1 RAG Detection

- **RAG signals**: context blocks in messages, retrieval markers, system prompts.
- **Detection confidence**: per-request RAG confidence.
- **RAG metadata**: context size, source count.

### 3.2 RAG-Aware Model Selection

- **RAG model requirements**: long context, grounding, citation ability.
- **RAG model mapping**: RAG requests → RAG-capable models.
- **Context budget**: retrieved context within model context window.

### 3.3 Retrieval Strategy Selection

- **Strategy choice**: dense, sparse, hybrid per request.
- **Strategy signals**: query type, corpus size, latency budget.
- **Strategy fallback**: hybrid → dense → sparse.

### 3.4 Integration

- **RAG pipeline integration**: plan 84 RAG cascade.
- **Observability**: RAG routing telemetry.
- **Dashboard**: RAG routing view.

## 4. Implementation Steps

1. Build RAG detection (`src/lib/ragroute/`).
2. Build RAG-aware selection.
3. Build retrieval strategy selection.
4. Integrate RAG pipeline.
5. Dashboard: RAG routing view.
6. Tests: detection, selection, strategy.

## 5. Files Touched

- `src/lib/ragroute/` (new: detect, select, strategy)
- `src/lib/rag/` (integration)
- `src/sse/handlers/chat.js` (RAG routing)
- `open-sse/config/ragrouteConfig.js` (new)
- Dashboard ragroute page (new)
- `tests/unit/ragroute.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| RAG misdetection | Conservative detection |
| Context overflow | Context budget |
| Strategy mismatch | Fallback chain |
| Cost | Strategy cost tracking |

## 7. Success Criteria

- RAG requests detected.
- RAG-capable models selected.
- Retrieval strategy chosen per request.
- Telemetry visible.

## 8. Related Plans

- Plan 84 (RAG Cascade) — retrieval pipeline.
- Plan 93 (Encoder Management) — retrieval encoders.
- Plan 55 (Context Window) — context budget.
- Plan 105 (Domain Routing) — domain synergy.