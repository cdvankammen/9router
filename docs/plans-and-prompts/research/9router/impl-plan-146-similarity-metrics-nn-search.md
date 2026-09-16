---
Date: 2026-09-16
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, similarity-metrics, nearest-neighbor, vector-search, similarity-thresholds
---

# Implementation Plan 146 — Similarity Metrics & Nearest-Neighbor Search

> Mined from branch docs: `45-branch-semantic-and-embedding-routing.md` (Level 3: AAB — Similarity Metrics, AAB-A — Similarity Thresholds, AAB-B — Nearest-Neighbor Search).

## 1. Goal

Implement similarity metrics and nearest-neighbor search for 9Router: formalize metric choice (cosine, dot, euclidean), add threshold calibration, and add efficient nearest-neighbor search — improving semantic routing accuracy and speed.

## 2. Background (from research)

- **9Router current state**: Basic cosine similarity; no metric management.
- **Research findings** (45-branch):
  - Similarity metrics (AAB): metric choice matters.
  - Similarity thresholds (AAB-A): threshold calibration.
  - Nearest-neighbor search (AAB-B): search efficiency.

## 3. Design

### 3.1 Metric Registry

- **Metric catalog**: cosine, dot, euclidean, manhattan.
- **Metric properties**: speed, accuracy, scale.
- **Metric selection**: per-use-case metrics.

### 3.2 Threshold Calibration

- **Threshold model**: per-route thresholds.
- **Calibration**: from labeled data.
- **Adaptive thresholds**: adjust over time.

### 3.3 Nearest-Neighbor Search

- **Search index**: HNSW/IVF index.
- **Search efficiency**: approximate search.
- **Search accuracy**: recall vs speed.

### 3.4 Integration

- **Semantic router integration**: metric + search.
- **Observability**: similarity metrics.
- **Dashboard**: similarity view.

## 4. Implementation Steps

1. Build metric registry.
2. Add threshold calibration.
3. Add NN search index.
4. Integrate semantic router.
5. Dashboard: similarity view.
6. Tests: metrics, thresholds, search.

## 5. Files Touched

- `src/lib/similarity/` (new: metrics, thresholds, search)
- `open-sse/services/semantic-router.js` (integration)
- Dashboard similarity page (new)
- `tests/unit/similarity.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Metric mismatch | Registry + tests |
| Threshold drift | Calibration |
| Search latency | Approximate search |
| Index staleness | Rebuild policy |

## 7. Success Criteria

- Metrics configurable.
- Thresholds calibrated.
- Search fast.
- Accuracy maintained.

## 8. Related Plans

- Plan 3 (Semantic Routing) — semantic foundations.
- Plan 93 (Embedding Management) — embeddings.
- Plan 45 (Semantic Routing) — branch.
- Plan 82 (Calibration) — thresholds.