---
Date: 2026-09-16
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, token-dropping, capacity-tuning, overflow-handling, moe-capacity
---

# Implementation Plan 140 — MoE Capacity & Overflow Handling

> Mined from branch docs: `43-branch-moe-and-expert-routing.md` (Level 3: ABB — Capacity & Overflow).

## 1. Goal

Implement MoE capacity and overflow handling for 9Router: understand and manage capacity limits in expert-based routing, handle token dropping, and tune capacity factors — improving quality when routing to MoE models.

## 2. Background (from research)

- **9Router current state**: Routes to MoE models without capacity awareness.
- **Research findings** (43-branch):
  - Capacity & overflow (ABB): MoE capacity limits.
  - Token dropping impact (ABB-A): dropped tokens degrade quality.
  - Capacity tuning (ABB-B): capacity factor tuning.
  - Load-balancing losses (AAB): balance expert load.

## 3. Design

### 3.1 Capacity Model

- **Capacity factor**: per-model capacity config.
- **Overflow detection**: detect expert overflow.
- **Token dropping**: understand drop impact.

### 3.2 Capacity Tuning

- **Capacity tuning**: per-model capacity factors.
- **Load balancing**: balance expert load.
- **Quality monitoring**: quality vs capacity.

### 3.3 Routing Awareness

- **MoE-aware routing**: prefer models with capacity headroom.
- **Overflow avoidance**: avoid models with chronic overflow.
- **Fallback**: fallback on overflow.

### 3.4 Integration

- **Provider config**: MoE capacity config.
- **Observability**: capacity metrics.
- **Dashboard**: MoE view.

## 4. Implementation Steps

1. Build capacity model.
2. Add overflow detection.
3. Add capacity tuning.
4. Add MoE-aware routing.
5. Dashboard: MoE view.
6. Tests: capacity, overflow, tuning.

## 5. Files Touched

- `src/lib/moe/` (new: capacity, overflow, tune)
- `open-sse/config/providerModels.js` (capacity config)
- Dashboard moe page (new)
- `tests/unit/moe.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Quality loss | Overflow avoidance |
| Config complexity | Simple defaults |
| Metric noise | Smoothing |
| Provider opacity | Best-effort |

## 7. Success Criteria

- Capacity tracked.
- Overflow detected.
- Tuning works.
- Quality improved.

## 8. Related Plans

- Plan 5 (MoE Dispatch) — MoE foundations.
- Plan 96 (Expert Utilization) — utilization.
- Plan 101 (Sparse Routing) — efficiency.
- Plan 113 (Quantization) — model config.