---
Date: 2026-09-16
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, expert-merging, expert-utilization, capacity-tuning, sparse-routing
---

# Implementation Plan 96 — Expert Utilization Tracking & Capacity Tuning

> Mined from branch docs: `43-branch-moe-and-expert-routing.md` (expert utilization, capacity tuning, sparse routing efficiency, expert merging).

## 1. Goal

Add expert utilization tracking and capacity tuning to 9Router: track which specialized models ("experts") are used, measure utilization efficiency, and tune per-expert capacity — so expert routing is efficient and balanced.

## 2. Background (from research)

- **9Router current state**: no expert concept beyond combos.
- **Research findings** (43-branch):
  - Expert utilization: track expert usage.
  - Capacity tuning: per-expert capacity limits.
  - Sparse routing efficiency: only activate relevant experts.
  - Expert merging: combine expert outputs.

## 3. Design

### 3.1 Expert Registry

- **Expert model**: id, domain, models, capacity, cost.
- **Expert assignment**: taxonomy → expert.
- **Expert fallback**: expert failure → general model.

### 3.2 Utilization Tracking

- **Utilization metrics**: requests, tokens, cost, success per expert.
- **Utilization efficiency**: expert vs. general model comparison.
- **Utilization reports**: per-expert dashboards.

### 3.3 Capacity Tuning

- **Capacity limits**: per-expert concurrent/token caps.
- **Capacity alerts**: approaching-capacity warnings.
- **Auto-scaling**: capacity adjustments from demand.

### 3.4 Sparse Activation

- **Activation logic**: only route to expert when confident.
- **Confidence gates**: taxonomy confidence threshold.
- **Fallback**: low confidence → general model.

### 3.5 Integration

- **Expert dispatch integration**: plan 85 expert orchestration.
- **Observability**: utilization metrics.
- **Dashboard**: expert utilization view.

## 4. Implementation Steps

1. Build expert registry (`src/lib/experts/`).
2. Add utilization tracking.
3. Add capacity tuning.
4. Add sparse activation.
5. Integrate expert dispatch.
6. Dashboard: utilization view.
7. Tests: utilization, capacity, activation.

## 5. Files Touched

- `src/lib/experts/` (new: registry, utilization, capacity, activation)
- `src/lib/moa/` (integration)
- `open-sse/config/expertConfig.js` (new)
- Dashboard experts page (new)
- `tests/unit/experts.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Expert underuse | Utilization reports |
| Capacity overload | Alerts + limits |
| Misactivation | Confidence gates |
| Cost | Expert cost tracking |

## 7. Success Criteria

- Expert usage tracked.
- Capacity tuned with alerts.
- Sparse activation works.
- Utilization view visible.

## 8. Related Plans

- Plan 85 (Mixture-of-Agents) — expert orchestration.
- Plan 6 (MoE Dispatch) — expert routing.
- Plan 81 (Intent Classification) — activation input.
- Plan 4 (Cost-Quality) — cost tradeoffs.