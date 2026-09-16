---
Date: 2026-09-16
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, cost-per-request-metrics, cost-metrics, cost-accounting, cost-reporting
---

# Implementation Plan 172 — Cost-Per-Request Metrics & Accounting

> Mined from branch docs: `41-branch-learned-routing.md` (Level 4: AABB — Cost-Per-Request Metrics).

## 1. Goal

Implement cost-per-request metrics and accounting for 9Router: track cost per request across dimensions (model, provider, task, user), compute cost aggregates, and expose cost accounting reports — enabling precise cost management.

## 2. Background (from research)

- **9Router current state**: Basic cost tracking (plan 45).
- **Research findings** (41-branch):
  - Cost-per-request metrics (AABB): per-request cost.
  - Cost-quality plane (BAB): cost context.
  - Request pricing (plan 165): pricing model.

## 3. Design

### 3.1 Cost Metrics

- **Per-request cost**: tokens × rate.
- **Per-model cost**: model aggregates.
- **Per-task cost**: task aggregates.
- **Per-user cost**: user aggregates.

### 3.2 Cost Accounting

- **Cost ledger**: immutable cost records.
- **Cost reconciliation**: verify totals.
- **Cost allocation**: allocate to users/orgs.

### 3.3 Cost Reporting

- **Report types**: daily, weekly, monthly.
- **Report dimensions**: model, provider, task.
- **Report export**: CSV/JSON export.

### 3.4 Integration

- **Usage DB integration**: cost records.
- **Observability**: cost metrics.
- **Dashboard**: cost reports.

## 4. Implementation Steps

1. Build cost metrics.
2. Add cost ledger.
3. Add cost reporting.
4. Integrate usage DB.
5. Dashboard: cost reports.
6. Tests: metrics, ledger, reports.

## 5. Files Touched

- `src/lib/cost/` (new: metrics, ledger, reports)
- `src/lib/usageDb.js` (integration)
- Dashboard cost page (new)
- `tests/unit/cost.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Ledger drift | Reconciliation |
| Metric noise | Aggregation |
| Report complexity | Simple reports |
| Data volume | Retention policy |

## 7. Success Criteria

- Metrics tracked.
- Ledger accurate.
- Reports generated.
- Costs visible.

## 8. Related Plans

- Plan 45 (Cost Tracking) — foundations.
- Plan 165 (Request Pricing) — pricing.
- Plan 167 (Cost Quality Plane) — analysis.
- Plan 153 (Cost Tiers) — bands.