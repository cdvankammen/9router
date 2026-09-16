---
Date: 2026-09-16
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, bradley-terry, preference-model, pairwise-model, elo-routing
---

# Implementation Plan 174 — Bradley-Terry Preference Models

> Mined from branch docs: `41-branch-learned-routing.md` (Level 3: AAB — Bradley-Terry Preference Models).

## 1. Goal

Implement Bradley-Terry preference models for 9Router: model pairwise model preferences (which model wins for a query), compute model strength scores, and use them for routing — turning preference data into routing signals.

## 2. Background (from research)

- **9Router current state**: No preference modeling.
- **Research findings** (41-branch):
  - Bradley-Terry models (AAB): pairwise preference modeling.
  - Win-probability prediction (AA): win probability.
  - Preference data collection (AAAA): data source.

## 3. Design

### 3.1 Preference Model

- **BT model**: pairwise win probabilities.
- **Model strengths**: per-model strength scores.
- **Query features**: query-conditioned strengths.

### 3.2 Training

- **Training data**: pairwise preferences.
- **Training method**: maximum likelihood.
- **Validation**: held-out pairs.

### 3.3 Routing Integration

- **Win-probability routing**: route by win probability.
- **Confidence**: prediction confidence.
- **Fallback**: rule fallback.

### 3.4 Integration

- **Routing integration**: BT scores.
- **Observability**: strength metrics.
- **Dashboard**: preference view.

## 4. Implementation Steps

1. Build BT model.
2. Add training pipeline.
3. Add routing integration.
4. Add validation.
5. Dashboard: preference view.
6. Tests: model, training, routing.

## 5. Files Touched

- `src/lib/preference/` (new: model, train, route)
- `open-sse/handlers/chatCore.js` (integration)
- Dashboard preference page (new)
- `tests/unit/preference.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Data sparsity | Regularization |
| Overfitting | Validation |
| Strength drift | Retraining |
| Complexity | Simple model |

## 7. Success Criteria

- BT model trained.
- Strengths computed.
- Routing improved.
- Validated.

## 8. Related Plans

- Plan 163 (Preference Collection) — data.
- Plan 103 (Human Preference) — learning.
- Plan 173 (Matrix Factorization) — alternative.
- Plan 1 (Learned Routing) — foundations.