---
Date: 2026-09-16
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, cascade-evaluation, zero-router, baseline-comparison, routing-benchmark
---

# Implementation Plan 182 — Cascade vs Zero Router Comparison

> Mined from branch docs: `42-branch-cascades-and-fallbacks.md` (Level 4: ABAA — Cascade vs Zero).

## 1. Goal

Implement cascade vs zero router comparison for 9Router: build a rigorous evaluation framework comparing cascade routing against the "always use best model" zero router baseline — quantifying the value of cascading.

## 2. Background (from research)

- **9Router current state**: No formal comparison framework.
- **Research findings** (42-branch):
  - Cascade vs zero (ABAA): comparison methodology.
  - Zero router (46-branch): baseline construction.
  - Cascade vs oracle (ABAB): ideal comparison.

## 3. Design

### 3.1 Comparison Framework

- **Metrics**: cost, quality, latency, reliability.
- **Test scenarios**: diverse query sets.
- **Comparison modes**: head-to-head, A/B.

### 3.2 Zero Router Baseline

- **Zero router**: always best model.
- **Zero router config**: per-task best model.
- **Zero router metrics**: baseline measurements.

### 3.3 Comparison Reports

- **Report types**: summary, detailed, per-task.
- **Report metrics**: cost savings, quality delta.
- **Report visualization**: charts, tables.

### 3.4 Integration

- **Eval harness integration**: comparison runs.
- **Observability**: comparison metrics.
- **Dashboard**: comparison view.

## 4. Implementation Steps

1. Build comparison framework.
2. Add zero router baseline.
3. Add comparison reports.
4. Integrate eval harness.
5. Dashboard: comparison view.
6. Tests: framework, baseline, reports.

## 5. Files Touched

- `src/lib/comparison/` (new: framework, baseline, reports)
- `open-sse/services/eval-harness.js` (integration)
- Dashboard comparison page (new)
- `tests/unit/comparison.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Unfair comparison | Standardized tests |
| Baseline drift | Baseline maintenance |
| Report complexity | Simple reports |
| Cost of baseline | Sampling |

## 7. Success Criteria

- Framework built.
- Baseline stable.
- Reports generated.
- Value quantified.

## 8. Related Plans

- Plan 166 (Zero Router Baseline) — baseline.
- Plan 7 (Eval Harness) — evaluation.
- Plan 98 (Oracle Gap) — oracle.
- Plan 149 (Statistical Power) — statistics.