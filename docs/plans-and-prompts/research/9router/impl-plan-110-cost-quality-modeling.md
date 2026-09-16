---
Date: 2026-09-16
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, cost-modeling, cost-measurement, cost-prediction, quality-modeling
---

# Implementation Plan 110 — Cost & Quality Modeling (Measurement + Prediction)

> Mined from branch docs: `46-branch-evaluation-and-cost-quality.md` (cost modeling, cost measurement, cost prediction, quality modeling, quality measurement, quality prediction).

## 1. Goal

Add cost and quality modeling to 9Router: measure actual cost and quality per (model, task-type), build prediction models for both, and use predictions in routing — so routing optimizes the cost-quality frontier with real data.

## 2. Background (from research)

- **9Router current state**: cost tracked post-hoc; quality not modeled.
- **Research findings** (46-branch):
  - Cost modeling: cost as function of request features.
  - Cost measurement: accurate cost capture.
  - Cost prediction: predict cost before routing.
  - Quality modeling: quality as function of (model, task).
  - Quality measurement: reliable quality capture.
  - Quality prediction: predict quality before routing.

## 3. Design

### 3.1 Cost Model

- **Cost features**: tokens (input/output), model pricing, caching, retries.
- **Cost measurement**: accurate per-request cost capture.
- **Cost prediction**: regression model on features.
- **Cost calibration**: predicted vs. actual.

### 3.2 Quality Model

- **Quality features**: model, task-type, difficulty, context, params.
- **Quality measurement**: judge scores, feedback, outcomes.
- **Quality prediction**: model per (model, task-type).
- **Quality calibration**: predicted vs. actual.

### 3.3 Cost-Quality Frontier

- **Frontier computation**: Pareto frontier of (cost, quality) per task-type.
- **Frontier routing**: select on frontier given budget/quality constraints.
- **Frontier updates**: continuous frontier refresh.

### 3.4 Integration

- **Routing integration**: frontier-aware selection.
- **Observability**: model accuracy metrics.
- **Dashboard**: cost-quality frontier view.

## 4. Implementation Steps

1. Build cost model (`src/lib/models/cost.js`).
2. Build quality model (`src/lib/models/quality.js`).
3. Build frontier computation.
4. Integrate routing.
5. Dashboard: frontier view.
6. Tests: model accuracy, frontier.

## 5. Files Touched

- `src/lib/models/` (new: cost, quality, frontier)
- `src/sse/handlers/chat.js` (frontier integration)
- `src/lib/db/repos/modelRepo.js` (new)
- Dashboard models page (new)
- `tests/unit/models.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Model drift | Recalibration |
| Sparse data | Priors |
| Frontier staleness | Refresh schedule |
| Overfitting | Holdout validation |

## 7. Success Criteria

- Cost measured and predicted.
- Quality measured and predicted.
- Frontier computed.
- Frontier routing works.

## 8. Related Plans

- Plan 87 (Cost Heuristics) — cost estimation.
- Plan 67 (Quality Evaluation) — quality measurement.
- Plan 82 (Calibration) — calibration.
- Plan 4 (Cost-Quality) — cost-quality routing.