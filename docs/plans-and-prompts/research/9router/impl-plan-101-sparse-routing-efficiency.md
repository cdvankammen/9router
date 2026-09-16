---
Date: 2026-09-16
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, sparse-routing-efficiency, sparse-upcycling, expert-merging, moe
---

# Implementation Plan 101 — Sparse Routing Efficiency & Upcycling

> Mined from branch docs: `43-branch-moe-and-expert-routing.md` (sparse routing efficiency, sparse upcycling, expert merging, capacity tuning).

## 1. Goal

Add sparse routing efficiency to 9Router's expert dispatch: only activate relevant experts (sparse activation), support expert upcycling (reuse trained experts for new domains), and merge expert outputs efficiently — so expert routing is cost-efficient and scalable.

## 2. Background (from research)

- **9Router current state**: no expert concept beyond combos.
- **Research findings** (43-branch):
  - Sparse routing efficiency: activate only relevant experts.
  - Sparse upcycling: reuse experts for new domains.
  - Expert merging: combine expert outputs.
  - Capacity tuning: per-expert limits.

## 3. Design

### 3.1 Sparse Activation

- **Activation logic**: taxonomy confidence → expert activation.
- **Top-K activation**: activate top-K experts only.
- **Activation thresholds**: per-expert confidence gates.
- **Fallback**: no expert confident → general model.

### 3.2 Expert Upcycling

- **Upcycling registry**: experts reusable across domains.
- **Similarity detection**: domain similarity → expert reuse.
- **Upcycling policy**: reuse vs. new expert decision.

### 3.3 Expert Merging

- **Merge modes**: weighted voting, best-of-N, aggregator.
- **Merge weights**: learned from outcomes.
- **Merge fallback**: single expert fallback.

### 3.4 Efficiency Metrics

- **Activation rate**: experts activated per request.
- **Utilization**: per-expert usage.
- **Cost efficiency**: sparse vs. dense cost comparison.

### 3.5 Integration

- **Expert dispatch integration**: plan 96.
- **Observability**: efficiency metrics.
- **Dashboard**: sparse routing view.

## 4. Implementation Steps

1. Build sparse activation (`src/lib/sparse/`).
2. Add upcycling registry.
3. Build expert merging.
4. Add efficiency metrics.
5. Integrate expert dispatch.
6. Dashboard: sparse view.
7. Tests: activation, upcycling, merging.

## 5. Files Touched

- `src/lib/sparse/` (new: activation, upcycle, merge, metrics)
- `src/lib/experts/` (integration)
- `open-sse/config/sparseConfig.js` (new)
- Dashboard sparse page (new)
- `tests/unit/sparse.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Wrong activation | Confidence gates |
| Upcycling mismatch | Similarity checks |
| Merge noise | Weight learning |
| Efficiency loss | Metrics + tuning |

## 7. Success Criteria

- Sparse activation works.
- Upcycling reuses experts.
- Merging combines outputs.
- Efficiency metrics visible.

## 8. Related Plans

- Plan 96 (Expert Utilization) — utilization.
- Plan 85 (Mixture-of-Agents) — merging.
- Plan 6 (MoE Dispatch) — expert routing.
- Plan 4 (Cost-Quality) — cost efficiency.