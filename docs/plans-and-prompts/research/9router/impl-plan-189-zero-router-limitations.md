---
Date: 2026-09-16
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, zero-router, baseline-limitations, baseline-caveats, routing-baseline
---

# Implementation Plan 189 — Zero Router Limitations Analysis

> Mined from branch docs: `46-branch-evaluation-and-cost-quality.md` (Level 4: ABA-B — Zero Router Limitations).

## 1. Goal

Implement zero router limitations analysis for 9Router: document and quantify the limitations of the "always use best model" baseline (cost, latency, availability), add adjusted baselines, and provide context for cascade comparisons — ensuring fair evaluation.

## 2. Background (from research)

- **9Router current state**: No baseline limitations analysis.
- **Research findings** (46-branch):
  - Zero router limitations (ABA-B): baseline caveats.
  - Zero router construction (ABA-A): baseline setup.
  - Zero router (ABA): baseline definition.

## 3. Design

### 3.1 Limitation Model

- **Limitation types**: cost, latency, availability, quality.
- **Limitation quantification**: measure each limitation.
- **Limitation context**: when limitations matter.

### 3.2 Adjusted Baselines

- **Cost-adjusted**: baseline with cost constraints.
- **Latency-adjusted**: baseline with latency constraints.
- **Availability-adjusted**: baseline with availability constraints.

### 3.3 Comparison Context

- **Context documentation**: when to use which baseline.
- **Context reports**: baseline comparison with context.
- **Context alerts**: alert on misleading comparisons.

### 3.4 Integration

- **Eval harness integration**: context-aware comparisons.
- **Observability**: limitation metrics.
- **Dashboard**: limitation view.

## 4. Implementation Steps

1. Build limitation model.
2. Add adjusted baselines.
3. Add comparison context.
4. Integrate eval harness.
5. Dashboard: limitation view.
6. Tests: limitations, baselines, context.

## 5. Files Touched

- `src/lib/baseline/limitations.js` (new)
- `open-sse/services/eval-harness.js` (integration)
- Dashboard limitations page (new)
- `tests/unit/limitations.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Complexity | Simple limitations |
| Misuse | Clear documentation |
| Baseline drift | Maintenance |
| Overhead | Sampling |

## 7. Success Criteria

- Limitations quantified.
- Adjusted baselines work.
- Context provided.
- Comparisons fair.

## 8. Related Plans

- Plan 166 (Zero Router Baseline) — baseline.
- Plan 182 (Cascade vs Zero) — comparison.
- Plan 183 (Oracle Gap) — oracle.
- Plan 7 (Eval Harness) — evaluation.