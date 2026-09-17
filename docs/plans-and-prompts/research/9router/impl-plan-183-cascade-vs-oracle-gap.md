---
Date: 2026-09-16
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, oracle-router, oracle-gap, ideal-routing, routing-ceiling
---

# Implementation Plan 183 — Cascade vs Oracle Router Gap Analysis

> Mined from branch docs: `42-branch-cascades-and-fallbacks.md` (Level 4: ABAB — Cascade vs Oracle) and `46-branch-evaluation-and-cost-quality.md` (ABB-B — Oracle Gap Analysis).

## 1. Goal

Implement oracle router gap analysis for 9Router: compare cascade routing against the ideal oracle router (perfect knowledge of which model will produce the best answer), quantify the gap, and identify improvement opportunities — understanding the ceiling for routing quality.

## 2. Background (from research)

- **9Router current state**: No oracle comparison.
- **Research findings** (42-branch):
  - Cascade vs oracle (ABAB): gap analysis.
  - Oracle properties (46-branch): oracle characteristics.
  - Oracle gap analysis (46-branch): gap quantification.

## 3. Design

### 3.1 Oracle Router

- **Oracle definition**: perfect model selection.
- **Oracle simulation**: post-hoc best selection.
- **Oracle metrics**: ideal cost, quality, latency.

### 3.2 Gap Analysis

- **Gap metrics**: cost gap, quality gap, latency gap.
- **Gap decomposition**: where the gap comes from.
- **Gap trends**: gap over time.

### 3.3 Improvement Opportunities

- **Gap sources**: classification errors, model errors.
- **Improvement ranking**: highest-impact fixes.
- **Improvement tracking**: gap reduction over time.

### 3.4 Integration

- **Eval harness integration**: oracle comparisons.
- **Observability**: gap metrics.
- **Dashboard**: gap view.

## 4. Implementation Steps

1. Build oracle router.
2. Add gap analysis.
3. Add improvement opportunities.
4. Integrate eval harness.
5. Dashboard: gap view.
6. Tests: oracle, gap, opportunities.

## 5. Files Touched

- `src/lib/oracle/` (new: oracle, gap, opportunities)
- `open-sse/services/eval-harness.js` (integration)
- Dashboard gap page (new)
- `tests/unit/oracle.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Oracle unrealistic | Clear documentation |
| Gap noise | Smoothing |
| Opportunity noise | Ranking validation |
| Cost of oracle | Sampling |

## 7. Success Criteria

- Oracle simulated.
- Gap quantified.
- Opportunities identified.
- Improvement tracked.

## 8. Related Plans

- Plan 98 (Oracle Gap Analysis) — gap foundations.
- Plan 166 (Zero Router Baseline) — baseline.
- Plan 182 (Cascade vs Zero) — comparison.
- Plan 7 (Eval Harness) — evaluation.