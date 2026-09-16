---
Date: 2026-09-16
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, llm-approximation, judge-approximation, cheap-judges, approximation-models
---

# Implementation Plan 151 — LLM Approximation for Judges & Routers

> Mined from branch docs: `42-branch-cascades-and-fallbacks.md` (Level 3: AAB — LLM Approximation) and `41-branch-learned-routing.md` (BABA — LLM Approximation).

## 1. Goal

Implement LLM approximation for 9Router: use small/cheap LLMs to approximate expensive judge and router decisions — cutting evaluation cost while maintaining decision quality through calibration.

## 2. Background (from research)

- **9Router current state**: Judges use expensive models.
- **Research findings** (42-branch):
  - LLM approximation (AAB): cheap models approximate expensive ones.
  - Judge error tolerance (ABA): acceptable approximation error.
  - Judge models (AABA): which models approximate well.

## 3. Design

### 3.1 Approximation Model

- **Approximator registry**: cheap judge models.
- **Approximation quality**: quality vs expensive judge.
- **Approximation cost**: cost savings.

### 3.2 Approximation Strategy

- **Full approximation**: always use cheap judge.
- **Hybrid**: cheap first, expensive on disagreement.
- **Confidence-based**: expensive when uncertain.

### 3.3 Calibration

- **Calibration data**: paired cheap/expensive judgments.
- **Calibration mapping**: cheap → expensive mapping.
- **Calibration drift**: monitor drift.

### 3.4 Integration

- **Judge integration**: approximation in judges.
- **Observability**: approximation metrics.
- **Dashboard**: approximation view.

## 4. Implementation Steps

1. Build approximator registry.
2. Add approximation strategies.
3. Add calibration.
4. Integrate judges.
5. Dashboard: approximation view.
6. Tests: approximation, calibration.

## 5. Files Touched

- `src/lib/approximation/` (new: registry, strategies, calibrate)
- `src/lib/judges/` (integration)
- Dashboard approximation page (new)
- `tests/unit/approximation.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Quality loss | Calibration |
| Drift | Monitoring |
| Cost creep | Strategy control |
| Complexity | Simple defaults |

## 7. Success Criteria

- Approximation works.
- Cost reduced.
- Quality maintained.
- Calibration tracked.

## 8. Related Plans

- Plan 133 (Cascade Judges) — judges.
- Plan 87 (Cost Heuristics) — cost.
- Plan 82 (Calibration) — calibration.
- Plan 131 (Classifier) — cheap decisions.