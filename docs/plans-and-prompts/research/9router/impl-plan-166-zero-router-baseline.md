---
Date: 2026-09-16
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, zero-router, baseline-router, router-baseline, routing-baseline
---

# Implementation Plan 166 — Zero Router Baseline & Comparison

> Mined from branch docs: `46-branch-evaluation-and-cost-quality.md` (Level 3: ABA — Zero Router Details, ABA-A — Zero Router Construction, ABA-B — Zero Router Limitations).

## 1. Goal

Implement a zero router baseline for 9Router: build the "always use the best model" baseline, measure its cost/quality, and compare all routing strategies against it — establishing a rigorous baseline for routing evaluation.

## 2. Background (from research)

- **9Router current state**: No formal baseline.
- **Research findings** (46-branch):
  - Zero router (ABA): always-best-model baseline.
  - Zero router construction (ABA-A): baseline setup.
  - Zero router limitations (ABA-B): baseline caveats.
  - Oracle router (ABB): ideal router.

## 3. Design

### 3.1 Baseline Model

- **Zero router**: always route to best model.
- **Zero router config**: best model per task.
- **Zero router metrics**: cost, quality, latency.

### 3.2 Comparison Framework

- **Comparison metrics**: cost, quality, latency.
- **Comparison reports**: strategy vs baseline.
- **Comparison thresholds**: improvement thresholds.

### 3.3 Baseline Maintenance

- **Baseline updates**: best model changes.
- **Baseline validation**: baseline sanity.
- **Baseline documentation**: baseline docs.

### 3.4 Integration

- **Eval harness integration**: baseline comparisons.
- **Observability**: baseline metrics.
- **Dashboard**: baseline view.

## 4. Implementation Steps

1. Build zero router.
2. Add comparison framework.
3. Add baseline maintenance.
4. Integrate eval harness.
5. Dashboard: baseline view.
6. Tests: baseline, comparison.

## 5. Files Touched

- `src/lib/baseline/` (new: zero-router, compare)
- `open-sse/services/eval-harness.js` (integration)
- Dashboard baseline page (new)
- `tests/unit/baseline.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Baseline drift | Maintenance |
| Comparison bias | Fair metrics |
| Cost of baseline | Sampling |
| Complexity | Simple baseline |

## 7. Success Criteria

- Baseline built.
- Comparisons rigorous.
- Improvements measured.
- Baseline documented.

## 8. Related Plans

- Plan 7 (Eval Harness) — evaluation.
- Plan 98 (Oracle Gap) — oracle analysis.
- Plan 91 (Benchmark Hygiene) — benchmarks.
- Plan 149 (Statistical Power) — statistics.