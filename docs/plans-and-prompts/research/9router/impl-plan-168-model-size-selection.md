---
Date: 2026-09-16
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, model-size-selection, model-scaling, size-routing, capability-scaling
---

# Implementation Plan 168 — Model Size Selection & Scaling

> Mined from branch docs: `41-branch-learned-routing.md` (Level 4: ABBB — Model Size Selection).

## 1. Goal

Implement model size selection for 9Router: match query complexity to model size (small/medium/large), track size-quality tradeoffs, and tune size thresholds — routing simple queries to small models and complex queries to large models.

## 2. Background (from research)

- **9Router current state**: No size-based routing.
- **Research findings** (41-branch):
  - Model size selection (ABBB): size-based routing.
  - Query difficulty prediction (BB): difficulty estimation.
  - Cost-quality plane (BAB): size tradeoffs.

## 3. Design

### 3.1 Size Model

- **Size tiers**: small, medium, large, xlarge.
- **Size properties**: cost, speed, quality.
- **Size registry**: per-model size.

### 3.2 Difficulty Estimation

- **Difficulty signals**: length, complexity, domain.
- **Difficulty score**: calibrated difficulty.
- **Difficulty thresholds**: size thresholds.

### 3.3 Size Routing

- **Difficulty → size mapping**: thresholds.
- **Size fallback**: escalate on failure.
- **Size adaptation**: adjust thresholds.

### 3.4 Integration

- **Routing integration**: size selection.
- **Observability**: size metrics.
- **Dashboard**: size view.

## 4. Implementation Steps

1. Build size model.
2. Add difficulty estimation.
3. Add size routing.
4. Add threshold tuning.
5. Dashboard: size view.
6. Tests: size, difficulty, routing.

## 5. Files Touched

- `src/lib/sizes/` (new: model, difficulty, route)
- `open-sse/handlers/chatCore.js` (integration)
- Dashboard sizes page (new)
- `tests/unit/sizes.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Misestimation | Calibration |
| Quality loss | Fallback |
| Threshold drift | Tuning |
| Complexity | Simple tiers |

## 7. Success Criteria

- Sizes catalogued.
- Difficulty estimated.
- Routing size-aware.
- Cost reduced.

## 8. Related Plans

- Plan 97 (Quality Tiers) — tiers.
- Plan 87 (Cost Heuristics) — cost.
- Plan 168 (Size Selection) — this plan.
- Plan 4 (Cost Quality) — tradeoffs.