---
Date: 2026-09-16
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, oracle-gap, oracle-properties, routing-upper-bound, optimal-routing
---

# Implementation Plan 98 — Oracle Gap Analysis & Routing Upper Bounds

> Mined from branch docs: `46-branch-evaluation-and-cost-quality.md` (oracle gap analysis, oracle properties) and `41-branch-learned-routing.md` (oracle gap analysis).

## 1. Goal

Add oracle gap analysis to 9Router: compute the theoretical best routing (oracle) for historical requests, measure the gap between actual routing and oracle routing, and use the gap to prioritize routing improvements — so routing quality improvements are data-driven.

## 2. Background (from research)

- **9Router current state**: no routing quality measurement vs. theoretical best.
- **Research findings** (46-branch):
  - Oracle gap analysis: compare actual vs. best-possible routing.
  - Oracle properties: oracle definition (best model per request given hindsight).

## 3. Design

### 3.1 Oracle Definition

- **Oracle**: for each historical request, the model that would have produced the best outcome (quality/cost/latency).
- **Oracle data**: requires outcome data per (request, model) — from A/B tests or replay.
- **Oracle approximation**: use quality scores + cost + latency to approximate.

### 3.2 Gap Computation

- **Gap metrics**: quality gap, cost gap, latency gap.
- **Gap aggregation**: per task-type, per route, per user.
- **Gap trends**: gap over time.

### 3.3 Improvement Prioritization

- **High-gap segments**: task-types with largest gaps.
- **Improvement suggestions**: suggested routing changes.
- **Impact estimation**: expected improvement from changes.

### 3.4 Integration

- **Analytics integration**: gap in analytics dashboard.
- **Calibration integration**: gap informs calibration.
- **Dashboard**: oracle gap view.

## 4. Implementation Steps

1. Build oracle computation (`src/lib/oracle/`).
2. Build gap metrics.
3. Build prioritization.
4. Integrate analytics.
5. Dashboard: oracle gap view.
6. Tests: oracle computation, gap metrics.

## 5. Files Touched

- `src/lib/oracle/` (new: compute, gap, prioritize)
- `src/lib/analytics/` (integration)
- `src/lib/db/repos/oracleRepo.js` (new)
- Dashboard oracle page (new)
- `tests/unit/oracle.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Oracle data sparsity | Approximation methods |
| Misleading gaps | Confidence intervals |
| Compute cost | Sampled computation |
| Actionability | Prioritization + suggestions |

## 7. Success Criteria

- Oracle computed for historical requests.
- Gaps measured per segment.
- Prioritization produces suggestions.
- Gap view visible.

## 8. Related Plans

- Plan 82 (Calibration) — outcome data.
- Plan 53 (Analytics) — analytics integration.
- Plan 67 (Quality Evaluation) — quality scores.
- Plan 1 (Learned Routing) — improvement loop.