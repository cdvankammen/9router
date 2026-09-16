---
Date: 2026-09-16
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, matrix-factorization, routing-mf, preference-matrix, latent-factors
---

# Implementation Plan 173 — Matrix Factorization for Routing

> Mined from branch docs: `41-branch-learned-routing.md` (Level 3: AAA — Matrix Factorization for Routing).

## 1. Goal

Implement matrix factorization for routing in 9Router: factorize the query-model preference matrix into latent factors, use factors to predict model performance for unseen queries, and integrate predictions into routing — enabling learned routing without heavy classifiers.

## 2. Background (from research)

- **9Router current state**: No factorization-based routing.
- **Research findings** (41-branch):
  - Matrix factorization (AAA): preference matrix factorization.
  - Win-probability prediction (AA): MF-based prediction.
  - Bradley-Terry models (AAB): preference modeling.

## 3. Design

### 3.1 Factorization Model

- **Preference matrix**: queries × models.
- **Latent factors**: query factors, model factors.
- **Factorization method**: SVD, ALS.

### 3.2 Prediction

- **Performance prediction**: query-model score.
- **Cold start**: new query handling.
- **Prediction confidence**: uncertainty.

### 3.3 Routing Integration

- **Score-based routing**: factor scores.
- **Hybrid routing**: factors + rules.
- **Factor fallback**: rule fallback.

### 3.4 Integration

- **Routing integration**: factor predictions.
- **Observability**: factor metrics.
- **Dashboard**: factor view.

## 4. Implementation Steps

1. Build factorization model.
2. Add prediction.
3. Add routing integration.
4. Add cold-start handling.
5. Dashboard: factor view.
6. Tests: factorization, prediction, routing.

## 5. Files Touched

- `src/lib/factors/` (new: model, predict, route)
- `open-sse/handlers/chatCore.js` (integration)
- Dashboard factors page (new)
- `tests/unit/factors.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Sparse matrix | Regularization |
| Cold start | Fallback |
| Factor drift | Retraining |
| Complexity | Simple SVD |

## 7. Success Criteria

- Factorization works.
- Predictions accurate.
- Routing improved.
- Cold start handled.

## 8. Related Plans

- Plan 1 (Learned Routing) — foundations.
- Plan 163 (Preference Collection) — data.
- Plan 131 (Classifier) — alternative.
- Plan 136 (Causal Routers) — adaptation.