---
Date: 2026-09-16
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, answer-confidence, confidence-estimation, confidence-routing, quality-signal
---

# Implementation Plan 170 — Answer Confidence Estimation & Routing

> Mined from branch docs: `41-branch-learned-routing.md` (Level 4: ABBA — Answer Confidence Estimation).

## 1. Goal

Implement answer confidence estimation for 9Router: estimate model confidence in its response, use confidence to decide whether to escalate or serve, and track confidence accuracy — enabling quality-driven routing decisions.

## 2. Background (from research)

- **9Router current state**: No confidence estimation.
- **Research findings** (41-branch):
  - Answer confidence estimation (ABBA): confidence signals.
  - Self-verification (ABAA): verification for confidence.
  - POMDP formulation (ABAB): confidence in belief state.

## 3. Design

### 3.1 Confidence Model

- **Confidence signals**: logprobs, coherence, length.
- **Confidence scoring**: calibrated score.
- **Confidence thresholds**: per-task thresholds.

### 3.2 Confidence-Based Routing

- **High confidence**: serve.
- **Low confidence**: escalate.
- **Uncertain**: verify first.

### 3.3 Confidence Calibration

- **Calibration data**: responses with labels.
- **Calibration mapping**: raw → calibrated.
- **Calibration drift**: monitor drift.

### 3.4 Integration

- **Routing integration**: confidence hooks.
- **Observability**: confidence metrics.
- **Dashboard**: confidence view.

## 4. Implementation Steps

1. Build confidence model.
2. Add confidence routing.
3. Add calibration.
4. Integrate routing.
5. Dashboard: confidence view.
6. Tests: confidence, routing, calibration.

## 5. Files Touched

- `src/lib/confidence/` (new: model, route, calibrate)
- `open-sse/handlers/chatCore.js` (confidence hooks)
- Dashboard confidence page (new)
- `tests/unit/confidence.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Poor calibration | Calibration pipeline |
| Threshold drift | Monitoring |
| False confidence | Verification |
| Complexity | Simple model |

## 7. Success Criteria

- Confidence estimated.
- Routing confidence-aware.
- Calibrated.
- Quality improved.

## 8. Related Plans

- Plan 82 (Router Calibration) — calibration.
- Plan 132 (POMDP) — belief state.
- Plan 102 (Response Verification) — verification.
- Plan 97 (Quality Tiers) — quality.