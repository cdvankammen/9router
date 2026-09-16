---
Date: 2026-09-16
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, gating-mechanisms, top-k-gating, moe-gating, gating-routing
---

# Implementation Plan 177 — Gating Mechanisms & Top-K Gating

> Mined from branch docs: `43-branch-moe-and-expert-routing.md` (Level 3: AAA — Top-k Gating Details).

## 1. Goal

Implement gating mechanism awareness for 9Router: understand top-k gating in MoE models, expose gating parameters, and route to models with favorable gating behavior — improving quality when routing to MoE models.

## 2. Background (from research)

- **9Router current state**: Routes to MoE models without gating awareness.
- **Research findings** (43-branch):
  - Top-k gating (AAA): gating details.
  - Load-balancing losses (AAB): gating balance.
  - Expert specialization (ABA): gating specialization.

## 3. Design

### 3.1 Gating Model

- **Gating parameters**: top-k, temperature, capacity.
- **Gating behavior**: per-model gating stats.
- **Gating registry**: gating configs.

### 3.2 Gating-Aware Routing

- **Gating quality**: gating quality metrics.
- **Gating routing**: prefer good gating.
- **Gating fallback**: fallback on gating issues.

### 3.3 Gating Tuning

- **Parameter tuning**: top-k tuning.
- **Tuning evaluation**: quality impact.
- **Tuning registry**: tuned configs.

### 3.4 Integration

- **Provider config**: gating config.
- **Observability**: gating metrics.
- **Dashboard**: gating view.

## 4. Implementation Steps

1. Build gating model.
2. Add gating-aware routing.
3. Add gating tuning.
4. Integrate provider config.
5. Dashboard: gating view.
6. Tests: gating, routing, tuning.

## 5. Files Touched

- `src/lib/gating/` (new: model, route, tune)
- `open-sse/config/providerModels.js` (gating config)
- Dashboard gating page (new)
- `tests/unit/gating.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Provider opacity | Best-effort |
| Tuning risk | Evaluation |
| Complexity | Simple defaults |
| Metric noise | Smoothing |

## 7. Success Criteria

- Gating tracked.
- Routing gating-aware.
- Tuning works.
- Quality improved.

## 8. Related Plans

- Plan 5 (MoE Dispatch) — MoE foundations.
- Plan 140 (MoE Capacity) — capacity.
- Plan 96 (Expert Utilization) — utilization.
- Plan 101 (Sparse Routing) — efficiency.