---
Date: 2026-09-16
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, request-pricing, token-pricing, cost-per-request, pricing-model
---

# Implementation Plan 165 — Request Pricing & Cost Model

> Mined from branch docs: `46-branch-evaluation-and-cost-quality.md` (Level 4: BAA-A — Token Pricing, BAA-B — Request Pricing, BAB-A — Historical Cost Estimation).

## 1. Goal

Implement a comprehensive request pricing model for 9Router: track per-request cost (tokens in/out × rate), compute historical cost trends, and expose cost predictions — enabling cost-aware routing and budget management.

## 2. Background (from research)

- **9Router current state**: Cost tracking exists (plan 45); pricing model shallow.
- **Research findings** (46-branch):
  - Token pricing (BAA-A): per-token pricing.
  - Request pricing (BAA-B): per-request pricing.
  - Historical cost estimation (BAB-A): cost trends.
  - Cost prediction (BAB): predict costs.

## 3. Design

### 3.1 Pricing Model

- **Token rates**: per-provider, per-model rates.
- **Request rates**: per-request fixed costs.
- **Rate updates**: pricing refresh.

### 3.2 Cost Tracking

- **Per-request cost**: tokens × rate.
- **Per-conversation cost**: aggregate costs.
- **Per-user/org cost**: user/org budgets.

### 3.3 Cost Prediction

- **Pre-request estimate**: estimate before routing.
- **Post-request actual**: actual cost.
- **Cost variance**: estimate vs actual.

### 3.4 Integration

- **Routing integration**: cost predictions.
- **Observability**: cost metrics.
- **Dashboard**: cost view.

## 4. Implementation Steps

1. Build pricing model.
2. Add cost tracking.
3. Add cost prediction.
4. Integrate routing.
5. Dashboard: cost view.
6. Tests: pricing, tracking, prediction.

## 5. Files Touched

- `src/lib/pricing/` (new: model, track, predict)
- `src/lib/db/repos/usage.js` (integration)
- Dashboard pricing page (new)
- `tests/unit/pricing.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Stale pricing | Auto-refresh |
| Prediction error | Variance tracking |
| Complexity | Simple defaults |
| Provider changes | Rate updates |

## 7. Success Criteria

- Pricing tracked.
- Predictions accurate.
- Costs visible.
- Budgets enforced.

## 8. Related Plans

- Plan 45 (Cost Tracking) — cost foundations.
- Plan 87 (Cost Heuristics) — cost estimation.
- Plan 110 (Cost Quality Modeling) — modeling.
- Plan 45 (Cost Budgets) — budgets.