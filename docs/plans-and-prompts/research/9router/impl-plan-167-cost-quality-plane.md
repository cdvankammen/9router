---
Date: 2026-09-16
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, cost-quality-plane, cost-quality-tradeoff, pareto-optimal, quality-cost-analysis
---

# Implementation Plan 167 — Cost-Quality Plane Analysis

> Mined from branch docs: `41-branch-learned-routing.md` (Level 3: BAB — Cost-Quality Plane Analysis).

## 1. Goal

Implement cost-quality plane analysis for 9Router: model the cost-quality tradeoff surface, find Pareto-optimal routing strategies, and visualize the cost-quality frontier — enabling data-driven routing decisions.

## 2. Background (from research)

- **9Router current state**: Cost and quality tracked separately.
- **Research findings** (41-branch):
  - Cost-quality plane (BAB): model cost vs quality.
  - FrugalGPT (42-branch): cost optimization.
  - RouteLLM (41-branch): cost-quality routing.

## 3. Design

### 3.1 Cost-Quality Model

- **Cost axis**: per-request cost.
- **Quality axis**: per-request quality.
- **Plane surface**: cost-quality space.

### 3.2 Pareto Analysis

- **Pareto frontier**: optimal points.
- **Pareto dominated**: dominated strategies.
- **Pareto selection**: choose on frontier.

### 3.3 Visualization

- **Plane plot**: cost-quality scatter.
- **Frontier plot**: Pareto curve.
- **Strategy markers**: strategy positions.

### 3.4 Integration

- **Routing integration**: frontier routing.
- **Observability**: plane metrics.
- **Dashboard**: plane view.

## 4. Implementation Steps

1. Build cost-quality model.
2. Add Pareto analysis.
3. Add visualization.
4. Integrate routing.
5. Dashboard: plane view.
6. Tests: model, Pareto, visualization.

## 5. Files Touched

- `src/lib/cost-quality/` (new: model, pareto, visualize)
- `open-sse/handlers/chatCore.js` (frontier routing)
- Dashboard cost-quality page (new)
- `tests/unit/cost-quality.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Sparse data | Synthetic fill |
| Frontier drift | Recomputation |
| Complexity | Simple model |
| Stale analysis | Periodic refresh |

## 7. Success Criteria

- Model built.
- Frontier found.
- Visualization works.
- Routing improved.

## 8. Related Plans

- Plan 110 (Cost Quality Modeling) — modeling.
- Plan 4 (Cost Quality) — foundations.
- Plan 153 (Cost Tiers) — bands.
- Plan 165 (Request Pricing) — pricing.