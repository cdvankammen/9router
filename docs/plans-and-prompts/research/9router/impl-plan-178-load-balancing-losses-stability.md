---
Date: 2026-09-16
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, load-balancing-losses, expert-balance, moe-stability, load-balance-routing
---

# Implementation Plan 178 — Load-Balancing Losses & MoE Stability

> Mined from branch docs: `43-branch-moe-and-expert-routing.md` (Level 3: AAB — Load-Balancing Losses, AAB-A — Load Balancing in Practice).

## 1. Goal

Implement load-balancing awareness for MoE models in 9Router: track expert load balance, detect imbalanced models, and route around unstable MoE models — improving reliability when routing to MoE providers.

## 2. Background (from research)

- **9Router current state**: No MoE stability awareness.
- **Research findings** (43-branch):
  - Load-balancing losses (AAB): balance training.
  - Load balancing in practice (AAB-A): real-world balance.
  - Expert utilization (AAB-B): utilization metrics.

## 3. Design

### 3.1 Load-Balance Model

- **Balance metrics**: expert load variance.
- **Balance tracking**: per-model balance.
- **Balance thresholds**: imbalance detection.

### 3.2 Stability Routing

- **Stability scoring**: model stability scores.
- **Stability routing**: prefer stable models.
- **Stability fallback**: fallback on instability.

### 3.3 Monitoring

- **Balance monitoring**: continuous tracking.
- **Balance alerts**: imbalance alerts.
- **Balance reports**: periodic reports.

### 3.4 Integration

- **Routing integration**: stability signals.
- **Observability**: balance metrics.
- **Dashboard**: balance view.

## 4. Implementation Steps

1. Build load-balance model.
2. Add stability routing.
3. Add monitoring.
4. Integrate routing.
5. Dashboard: balance view.
6. Tests: balance, stability, alerts.

## 5. Files Touched

- `src/lib/balance/` (new: model, stability, monitor)
- `open-sse/handlers/chatCore.js` (integration)
- Dashboard balance page (new)
- `tests/unit/balance.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Metric noise | Smoothing |
| False alerts | Thresholds |
| Provider opacity | Best-effort |
| Complexity | Simple model |

## 7. Success Criteria

- Balance tracked.
- Stability scored.
- Alerts fire.
- Reliability improved.

## 8. Related Plans

- Plan 5 (MoE Dispatch) — MoE.
- Plan 96 (Expert Utilization) — utilization.
- Plan 140 (MoE Capacity) — capacity.
- Plan 177 (Gating Mechanisms) — gating.