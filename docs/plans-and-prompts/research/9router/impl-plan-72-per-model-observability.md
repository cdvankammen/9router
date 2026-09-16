---
Date: 2026-09-16
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, model-observability, token-usage, cost-per-model, insights
---

# Implementation Plan 72 — Per-Model Observability

> Written after the binary-tree research expansion (see `39-binary-tree-expansion-master-plan.md`, `46-branch-evaluation-and-cost-quality.md`).
> This plan covers the "per-model observability" option: detailed per-model observability.

## 1. Goal

Add detailed per-model observability to 9Router: per-model metrics (usage, cost, latency, errors, quality), model comparison views, and model insights — so model performance is fully visible.

## 2. Background (from research)

- **9Router current state**: usageDb tracks requests; no per-model analytics.
- **Research findings** (46-branch): per-model metrics drive model decisions; comparison views aid selection; insights (trends, anomalies) aid management.

## 3. Design

### 3.1 Per-Model Metrics

- **Metrics**: requests, tokens, cost, latency, errors, quality.
- **Dimensions**: per-model, per-provider, per-user, per-task.
- **Time series**: hourly/daily/weekly.

### 3.2 Model Views

- **Model detail**: full metrics per model.
- **Model comparison**: side-by-side metrics.
- **Model ranking**: ranked by metric.

### 3.3 Model Insights

- **Trends**: usage/cost trends.
- **Anomalies**: metric anomalies.
- **Recommendations**: model suggestions.

### 3.4 Integration

- **Dashboard**: model observability page.
- **API**: model metrics API.
- **Alerts**: model metric alerts.

## 4. Implementation Steps

1. Define per-model metrics.
2. Build metrics collection.
3. Build model views.
4. Add insights.
5. Tests: metrics, views.

## 5. Files Touched

- `src/lib/modelobs/` (new: metrics, views)
- `src/lib/usageDb.js` (metrics collection)
- `src/app/api/v1/model-metrics/route.js` (new)
- Dashboard models page (extend)
- `tests/unit/model-observability.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Data volume | Aggregation |
| Metric noise | Smoothing |
| View complexity | Progressive |
| Insight bias | Data-driven |

## 7. Success Criteria

- Per-model metrics complete.
- Views functional.
- Insights actionable.
- API available.

## 8. Related Plans
- Plan 53 (Usage Analytics) — analytics synergy.
- Plan 36 (Comparison) — comparison views.
- Plan 64 (Anomaly Detection) — anomalies.