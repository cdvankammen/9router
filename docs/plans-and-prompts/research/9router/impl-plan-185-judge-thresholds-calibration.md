---
Date: 2026-09-16
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, judge-thresholds, threshold-calibration, escalation-thresholds, judge-tuning
---

# Implementation Plan 185 — Judge Thresholds Calibration

> Mined from branch docs: `42-branch-cascades-and-fallbacks.md` (Level 4: AABB — Judge Thresholds).

## 1. Goal

Implement judge threshold calibration for 9Router: calibrate the confidence thresholds at which judges decide to escalate, optimize thresholds per task type, and monitor threshold drift — reducing wasteful escalations while maintaining quality.

## 2. Background (from research)

- **9Router current state**: Thresholds hardcoded.
- **Research findings** (42-branch):
  - Judge thresholds (AABB): threshold calibration.
  - Judge models (AABA): judge quality.
  - Threshold calibration (41-branch): systematic calibration.

## 3. Design

### 3.1 Threshold Model

- **Threshold types**: confidence, quality, cost.
- **Threshold scope**: per-task, per-judge, per-model.
- **Threshold values**: calibrated values.

### 3.2 Calibration Pipeline

- **Calibration data**: labeled judgments.
- **Calibration method**: threshold optimization.
- **Calibration validation**: holdout validation.

### 3.3 Drift Monitoring

- **Drift detection**: threshold drift.
- **Re-calibration**: periodic recalibration.
- **Drift alerts**: alert on drift.

### 3.4 Integration

- **Judge integration**: calibrated thresholds.
- **Observability**: threshold metrics.
- **Dashboard**: threshold view.

## 4. Implementation Steps

1. Build threshold model.
2. Add calibration pipeline.
3. Add drift monitoring.
4. Integrate judges.
5. Dashboard: threshold view.
6. Tests: thresholds, calibration, drift.

## 5. Files Touched

- `src/lib/judges/thresholds.js` (new)
- `src/lib/calibration/` (integration)
- Dashboard thresholds page (new)
- `tests/unit/thresholds.test.js` (new)

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
- Escalations optimized.

## 8. Related Plans

- Plan 133 (Cascade Judge Quality) — judges.
- Plan 171 (Threshold Calibration) — calibration.
- Plan 82 (Router Calibration) — calibration.
- Plan 184 (Judge Models) — judges.