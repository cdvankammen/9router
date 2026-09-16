---
Date: 2026-09-16
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, win-probability, win-rate-prediction, probability-routing, router-prediction
---

# Implementation Plan 175 — Win-Probability Prediction for Routing

> Mined from branch docs: `41-branch-learned-routing.md` (Level 2: AA — Win-Probability Prediction, RouteLLM MF/SW internals).

## 1. Goal

Implement win-probability prediction for 9Router: predict the probability that a model wins (produces the best answer) for a given query, and route to the model with the best expected value — the core RouteLLM-style routing signal.

## 2. Background (from research)

- **9Router current state**: No win-probability modeling.
- **Research findings** (41-branch):
  - Win-probability prediction (AA): RouteLLM MF/SW internals.
  - Matrix factorization (AAA): MF-based prediction.
  - Bradley-Terry (AAB): SW-based prediction.

## 3. Design

### 3.1 Prediction Model

- **Win-probability**: P(model wins | query).
- **Model variants**: MF-based, SW-based.
- **Prediction features**: query features.

### 3.2 Expected Value Routing

- **Expected value**: win-prob × quality − cost.
- **Value ranking**: rank models by EV.
- **EV thresholds**: route above threshold.

### 3.3 Calibration

- **Calibration**: predicted vs actual win rates.
- **Calibration drift**: monitor.
- **Calibration updates**: recalibrate.

### 3.4 Integration

- **Routing integration**: EV routing.
- **Observability**: win-prob metrics.
- **Dashboard**: win-prob view.

## 4. Implementation Steps

1. Build prediction model.
2. Add EV routing.
3. Add calibration.
4. Integrate routing.
5. Dashboard: win-prob view.
6. Tests: prediction, EV, calibration.

## 5. Files Touched

- `src/lib/winprob/` (new: model, ev, calibrate)
- `open-sse/handlers/chatCore.js` (integration)
- Dashboard winprob page (new)
- `tests/unit/winprob.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Poor calibration | Calibration pipeline |
| EV complexity | Simple EV |
| Data needs | Preference data |
| Drift | Monitoring |

## 7. Success Criteria

- Win-prob predicted.
- EV routing works.
- Calibrated.
- Quality improved.

## 8. Related Plans

- Plan 1 (Learned Routing) — foundations.
- Plan 173 (Matrix Factorization) — MF.
- Plan 174 (Bradley-Terry) — SW.
- Plan 171 (Threshold Calibration) — calibration.