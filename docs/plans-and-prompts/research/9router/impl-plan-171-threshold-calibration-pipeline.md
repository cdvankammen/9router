---
Date: 2026-09-16
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, threshold-calibration, calibration-methods, threshold-tuning, calibration-pipeline
---

# Implementation Plan 171 — Threshold Calibration Pipeline

> Mined from branch docs: `41-branch-learned-routing.md` (Level 4: AABA — Threshold Calibration).

## 1. Goal

Implement a threshold calibration pipeline for 9Router: systematically calibrate routing thresholds (difficulty, confidence, cost, quality) from labeled data, validate calibration, and monitor threshold drift — keeping routing decisions optimal.

## 2. Background (from research)

- **9Router current state**: Thresholds hardcoded.
- **Research findings** (41-branch):
  - Threshold calibration (AABA): systematic calibration.
  - Win-probability prediction (AA): calibration for routing.
  - Router calibration (plan 82): calibration foundations.

## 3. Design

### 3.1 Calibration Framework

- **Threshold types**: difficulty, confidence, cost, quality.
- **Calibration data**: labeled examples.
- **Calibration methods**: grid search, Bayesian optimization.

### 3.2 Calibration Pipeline

- **Data collection**: labeled routing data.
- **Calibration run**: optimize thresholds.
- **Validation**: holdout validation.
- **Deployment**: apply thresholds.

### 3.3 Drift Monitoring

- **Drift detection**: threshold drift.
- **Re-calibration**: periodic recalibration.
- **Drift alerts**: alert on drift.

### 3.4 Integration

- **Config integration**: threshold config.
- **Observability**: calibration metrics.
- **Dashboard**: calibration view.

## 4. Implementation Steps

1. Build calibration framework.
2. Add calibration pipeline.
3. Add drift monitoring.
4. Integrate config.
5. Dashboard: calibration view.
6. Tests: calibration, validation, drift.

## 5. Files Touched

- `src/lib/calibration/` (new: framework, pipeline, drift)
- `src/lib/config/thresholds.js` (new)
- Dashboard calibration page (new)
- `tests/unit/calibration.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Overfitting | Holdout validation |
| Drift | Monitoring |
| Data scarcity | Synthetic data |
| Complexity | Simple methods |

## 7. Success Criteria

- Thresholds calibrated.
- Validation passes.
- Drift monitored.
- Routing improved.

## 8. Related Plans

- Plan 82 (Router Calibration) — foundations.
- Plan 170 (Confidence) — confidence.
- Plan 149 (Statistical Power) — statistics.
- Plan 148 (Dataset Construction) — data.