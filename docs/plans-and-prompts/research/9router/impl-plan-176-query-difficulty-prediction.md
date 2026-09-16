---
Date: 2026-09-16
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, query-difficulty, difficulty-prediction, complexity-estimation, difficulty-routing
---

# Implementation Plan 176 — Query Difficulty Prediction

> Mined from branch docs: `41-branch-learned-routing.md` (Level 2: BB — Query Difficulty Prediction, Hybrid LLM arXiv:2404.14618).

## 1. Goal

Implement query difficulty prediction for 9Router: predict query difficulty before routing, use difficulty to select model tier, and calibrate difficulty predictions — routing easy queries to cheap models and hard queries to strong models.

## 2. Background (from research)

- **9Router current state**: No difficulty prediction.
- **Research findings** (41-branch):
  - Query difficulty prediction (BB): Hybrid LLM approach.
  - Model size selection (ABBB): difficulty → size.
  - Threshold calibration (AABA): difficulty thresholds.

## 3. Design

### 3.1 Difficulty Model

- **Difficulty signals**: length, complexity, domain, novelty.
- **Difficulty score**: 0-1 calibrated.
- **Difficulty features**: extracted features.

### 3.2 Difficulty-Based Routing

- **Difficulty tiers**: easy/medium/hard.
- **Tier mapping**: difficulty → model tier.
- **Tier fallback**: escalate on failure.

### 3.3 Calibration

- **Calibration data**: difficulty labels.
- **Calibration method**: threshold optimization.
- **Calibration drift**: monitor.

### 3.4 Integration

- **Routing integration**: difficulty hooks.
- **Observability**: difficulty metrics.
- **Dashboard**: difficulty view.

## 4. Implementation Steps

1. Build difficulty model.
2. Add difficulty routing.
3. Add calibration.
4. Integrate routing.
5. Dashboard: difficulty view.
6. Tests: difficulty, routing, calibration.

## 5. Files Touched

- `src/lib/difficulty/` (new: model, route, calibrate)
- `open-sse/handlers/chatCore.js` (integration)
- Dashboard difficulty page (new)
- `tests/unit/difficulty.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Misestimation | Calibration |
| Quality loss | Fallback |
| Feature noise | Feature selection |
| Drift | Monitoring |

## 7. Success Criteria

- Difficulty predicted.
- Routing difficulty-aware.
- Calibrated.
- Cost reduced.

## 8. Related Plans

- Plan 168 (Model Size) — size routing.
- Plan 171 (Threshold Calibration) — calibration.
- Plan 87 (Cost Heuristics) — cost.
- Plan 97 (Quality Tiers) — tiers.