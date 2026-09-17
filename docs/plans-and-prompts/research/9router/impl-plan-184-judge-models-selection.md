---
Date: 2026-09-16
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, judge-models, judge-selection, judge-quality, evaluation-models
---

# Implementation Plan 184 — Judge Models Selection & Quality

> Mined from branch docs: `42-branch-cascades-and-fallbacks.md` (Level 4: AABA — Judge Models).

## 1. Goal

Implement judge model selection for 9Router: formalize which models make good judges (evaluators of other models' outputs), add judge quality scoring, and add judge selection logic — improving cascade escalation decisions.

## 2. Background (from research)

- **9Router current state**: Judges implicit (plan 133).
- **Research findings** (42-branch):
  - Judge models (AABA): which models judge well.
  - Judge quality (BAA): quality as bottleneck.
  - Judge thresholds (AABB): confidence thresholds.

## 3. Design

### 3.1 Judge Registry

- **Judge catalog**: candidate judge models.
- **Judge properties**: cost, speed, accuracy.
- **Judge specialization**: per-task judges.

### 3.2 Judge Quality Scoring

- **Quality metrics**: accuracy, calibration, consistency.
- **Quality tracking**: per-judge quality over time.
- **Quality alerts**: quality degradation.

### 3.3 Judge Selection

- **Selection criteria**: quality, cost, speed.
- **Selection strategy**: per-task selection.
- **Selection fallback**: fallback judges.

### 3.4 Integration

- **Cascade integration**: judge selection.
- **Observability**: judge metrics.
- **Dashboard**: judge view.

## 4. Implementation Steps

1. Build judge registry.
2. Add quality scoring.
3. Add selection logic.
4. Integrate cascades.
5. Dashboard: judge view.
6. Tests: registry, quality, selection.

## 5. Files Touched

- `src/lib/judges/` (new: registry, quality, select)
- `open-sse/handlers/chatCore.js` (judge hooks)
- Dashboard judges page (new)
- `tests/unit/judges.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Judge errors | Quality scoring |
| Judge cost | Cost-aware selection |
| Judge drift | Monitoring |
| Complexity | Simple selection |

## 7. Success Criteria

- Judges catalogued.
- Quality scored.
- Selection works.
- Cascades improved.

## 8. Related Plans

- Plan 133 (Cascade Judge Quality) — judge foundations.
- Plan 82 (Router Calibration) — calibration.
- Plan 151 (LLM Approximation) — cheap judges.
- Plan 2 (Cascade Fallback) — cascades.