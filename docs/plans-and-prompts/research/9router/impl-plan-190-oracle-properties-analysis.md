---
Date: 2026-09-16
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, oracle-router, oracle-properties, ideal-routing, routing-ceiling
---

# Implementation Plan 190 — Oracle Router Properties & Analysis

> Mined from branch docs: `46-branch-evaluation-and-cost-quality.md` (Level 4: ABB-A — Oracle Properties).

## 1. Goal

Implement oracle router properties analysis for 9Router: formally define oracle router properties (perfect knowledge, post-hoc selection), analyze oracle behavior across query distributions, and use oracle analysis to guide routing improvements — understanding the theoretical ceiling.

## 2. Background (from research)

- **9Router current state**: No oracle analysis.
- **Research findings** (46-branch):
  - Oracle properties (ABB-A): oracle characteristics.
  - Oracle gap analysis (ABB-B): gap quantification.
  - Cascade vs oracle (42-branch): comparison.

## 3. Design

### 3.1 Oracle Properties

- **Property definitions**: perfect knowledge, post-hoc, cost-aware.
- **Property analysis**: oracle behavior analysis.
- **Property limitations**: oracle unrealistic assumptions.

### 3.2 Oracle Simulation

- **Simulation method**: post-hoc best selection.
- **Simulation scope**: per-query, per-distribution.
- **Simulation metrics**: oracle cost, quality, latency.

### 3.3 Oracle-Guided Improvement

- **Gap analysis**: where routing falls short.
- **Improvement priorities**: highest-impact fixes.
- **Improvement tracking**: progress toward oracle.

### 3.4 Integration

- **Eval harness integration**: oracle analysis.
- **Observability**: oracle metrics.
- **Dashboard**: oracle view.

## 4. Implementation Steps

1. Define oracle properties.
2. Add oracle simulation.
3. Add oracle-guided improvement.
4. Integrate eval harness.
5. Dashboard: oracle view.
6. Tests: properties, simulation, improvement.

## 5. Files Touched

- `src/lib/oracle/properties.js` (new)
- `open-sse/services/eval-harness.js` (integration)
- Dashboard oracle page (new)
- `tests/unit/oracle.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Oracle unrealistic | Clear documentation |
| Simulation cost | Sampling |
| Gap noise | Smoothing |
| Complexity | Simple analysis |

## 7. Success Criteria

- Properties defined.
- Simulation works.
- Improvement guided.
- Ceiling understood.

## 8. Related Plans

- Plan 98 (Oracle Gap Analysis) — gap.
- Plan 183 (Cascade vs Oracle) — comparison.
- Plan 166 (Zero Router Baseline) — baseline.
- Plan 7 (Eval Harness) — evaluation.