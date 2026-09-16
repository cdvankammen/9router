---
Date: 2026-09-16
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, cost-tracking, billing, budgets, pricing
---

# Implementation Plan 45 — Cost Tracking & Budget Management

> Written after the binary-tree research expansion (see `39-binary-tree-expansion-master-plan.md`, `46-branch-evaluation-and-cost-quality.md`).
> This plan covers the "cost tracking" option: comprehensive cost tracking and budget management.

## 1. Goal

Add comprehensive cost tracking and budget management: accurate per-request cost, cost aggregation, budget alerts, and cost forecasting — so users control spend.

## 2. Background (from research)

- **9Router current state**: usageDb tracks usage; cost estimation is regex-heuristic (per impl-plan-04).
- **Research findings** (46-branch): cost tracking needs accurate pricing (per-model, per-token-type); budgets need alerts + enforcement; forecasting helps planning.

## 3. Design

### 3.1 Cost Tracking

- **Cost model**: per-model pricing (input/output/cache tokens).
- **Cost calculation**: per-request cost from usage.
- **Cost aggregation**: per-model, per-provider, per-user, per-day.

### 3.2 Budget Management

- **Budget types**: total, per-model, per-user, per-period.
- **Budget alerts**: thresholds (80%, 100%).
- **Budget enforcement**: hard stop or warn (configurable).

### 3.3 Cost Forecasting

- **Forecast model**: trend-based forecasting.
- **Forecast horizon**: daily/weekly/monthly.
- **Forecast accuracy**: tracked.

### 3.4 Cost UI

- **Cost dashboard**: spend charts, breakdowns.
- **Cost reports**: exportable reports.
- **Cost alerts**: notification integration.

## 4. Implementation Steps

1. Build cost model.
2. Add cost calculation + aggregation.
3. Add budgets + alerts.
4. Add forecasting.
5. Build cost UI.
6. Tests: cost calc, budgets, forecast.

## 5. Files Touched

- `src/lib/cost/` (new: model, budgets, forecast)
- `src/lib/usageDb.js` (cost integration)
- `src/app/api/v1/costs/route.js` (new)
- Dashboard cost page (new)
- `tests/unit/cost-tracking.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Pricing drift | Pricing updates; config |
| Budget enforcement gaps | Hard-stop option |
| Forecast inaccuracy | Tracked accuracy |
| Cost data volume | Aggregation tables |

## 7. Success Criteria

- Per-request cost accurate.
- Budgets alert + enforce.
- Forecasts available.
- Cost UI functional.

## 8. Related Plans
- Plan 4 (Cost-Quality Optimizer) — supersedes/merges.
- Plan 37 (Webhooks) — cost alerts.
- Plan 8 (Observability) — cost telemetry.