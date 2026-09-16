---
Date: 2026-09-16
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, cost-heuristics, historical-cost-estimation, token-pricing, request-pricing, cost-tier-defaults
---

# Implementation Plan 87 — Cost Heuristics & Historical Cost Estimation

> Mined from branch docs: `46-branch-evaluation-and-cost-quality.md` (cost heuristics, historical cost estimation, cost tier defaults, cost tiers in practice, token pricing, request pricing) and `42-branch-cascades-and-fallbacks.md` (cost tiers).

## 1. Goal

Add cost heuristics and historical cost estimation to 9Router: estimate request cost before routing (from token counts + pricing data), track historical costs per model/route, and use cost estimates in routing decisions — so cost-aware routing is accurate and predictable.

## 2. Background (from research)

- **9Router current state**: cost tracking exists (usageDb) but is post-hoc; no pre-routing cost estimation.
- **Research findings** (46-branch):
  - Cost heuristics: estimate cost from tokens + pricing.
  - Historical cost estimation: use past request costs to predict future.
  - Cost tier defaults: tiered pricing (cheap/standard/premium).
  - Cost tiers in practice: real-world tier usage.
  - Token pricing: input/output token price separation.
  - Request pricing: per-request cost models.

## 3. Design

### 3.1 Cost Estimation

- **Token estimation**: estimate input/output tokens pre-routing (message length heuristics, cached token counts).
- **Pricing lookup**: per-model pricing from `config/providerModels.js` + pricing data.
- **Cost formula**: `cost = inputTokens × inputPrice + outputTokens × outputPrice`.
- **Estimate confidence**: confidence interval from historical variance.

### 3.2 Historical Cost Store

- **Cost history**: per (model, route, task-type) cost stats.
- **Aggregation**: daily/weekly/monthly aggregates.
- **Prediction**: EWMA-based cost prediction.

### 3.3 Cost Tiers

- **Tier definitions**: cheap / standard / premium tiers.
- **Tier assignment**: per-model tier from pricing.
- **Tier routing**: route budget-constrained requests to cheaper tiers.

### 3.4 Integration

- **Pre-routing estimate**: attach estimate to routing decision.
- **Budget check**: reject/warn when estimate exceeds budget.
- **Post-hoc reconciliation**: actual vs. estimated cost.
- **Observability**: estimate accuracy metrics.
- **Dashboard**: cost estimation view.

## 4. Implementation Steps

1. Build token estimator (`src/lib/cost/tokens.js`).
2. Build pricing lookup (`src/lib/cost/pricing.js`).
3. Build cost estimator (`src/lib/cost/estimate.js`).
4. Build historical cost store.
5. Add cost tiers.
6. Integrate pre-routing estimates.
7. Dashboard: cost estimation view.
8. Tests: estimation accuracy, tiers.

## 5. Files Touched

- `src/lib/cost/` (new: tokens, pricing, estimate, history, tiers)
- `src/sse/handlers/chat.js` (estimate attach)
- `src/lib/db/repos/costRepo.js` (new)
- `open-sse/config/pricingData.js` (new)
- Dashboard cost page (new)
- `tests/unit/cost.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Token misestimation | Heuristic calibration |
| Pricing staleness | Pricing data refresh |
| Estimate variance | Confidence intervals |
| Budget false alarms | Conservative thresholds |

## 7. Success Criteria

- Pre-routing cost estimates attached.
- Historical cost stats available.
- Cost tiers route budget-constrained requests.
- Estimate accuracy metrics visible.

## 8. Related Plans

- Plan 45 (Cost Tracking) — post-hoc tracking.
- Plan 69 (Pricing Data) — pricing management.
- Plan 4 (Cost-Quality) — cost-aware routing.
- Plan 26 (Token Optimization) — token reduction.