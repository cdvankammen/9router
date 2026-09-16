---
Date: 2026-09-16
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, cascade-judges, frugalgpt, judge-quality, escalation-policy
---

# Implementation Plan 133 — Cascade Judge Quality & Escalation Policy

> Mined from branch docs: `41-branch-learned-routing.md` (Level 2: BA — Cascade Judges, RouterBench cascading / FrugalGPT) and `42-branch-cascades-and-fallbacks.md` (AB — Judge-Based Escalation).

## 1. Goal

Implement cascade judge quality management for 9Router: formalize judge selection, judge thresholds, and escalation policies so cascades escalate only when the judge is confident the stronger model will help — avoiding wasteful escalations.

## 2. Background (from research)

- **9Router current state**: Cascade fallback exists (plan 2); judge logic implicit.
- **Research findings** (41-branch):
  - Judge quality as bottleneck (BAA): judge errors dominate cascade failures.
  - Cascade escalation policies (BAAA): when to escalate.
  - Judge models (AABA): which models make good judges.
  - Judge thresholds (AABB): confidence thresholds.
  - Judge error tolerance (ABA): how much judge error is acceptable.
  - Cascade collapse (ABB): cascades that fail catastrophically.

## 3. Design

### 3.1 Judge Selection

- **Judge registry**: candidate judge models.
- **Judge quality scores**: per-judge accuracy.
- **Judge cost tiers**: cheap/medium/expensive judges.

### 3.2 Judge Thresholds

- **Threshold model**: per-task-type thresholds.
- **Calibration**: threshold calibration from logs.
- **Adaptive thresholds**: adjust based on recent accuracy.

### 3.3 Escalation Policy

- **Escalation triggers**: confidence < threshold.
- **Escalation depth**: max cascade depth.
- **Escalation cost**: cost-aware escalation.
- **Collapse prevention**: circuit breaker on cascade.

### 3.4 Integration

- **Cascade integration**: judges in cascade chain.
- **Observability**: judge decisions, escalations.
- **Dashboard**: judge quality view.

## 4. Implementation Steps

1. Build judge registry.
2. Add judge quality scoring.
3. Add threshold calibration.
4. Add escalation policy.
5. Add collapse prevention.
6. Dashboard: judge view.
7. Tests: judges, thresholds, escalation.

## 5. Files Touched

- `src/lib/judges/` (new: registry, quality, thresholds)
- `open-sse/handlers/chatCore.js` (cascade hooks)
- Dashboard judges page (new)
- `tests/unit/judges.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Judge errors | Quality scoring |
| Threshold drift | Calibration |
| Cascade collapse | Circuit breaker |
| Judge cost | Cost tiers |

## 7. Success Criteria

- Judges scored.
- Thresholds calibrated.
- Escalations cost-aware.
- Collapse prevented.

## 8. Related Plans

- Plan 2 (Cascade Fallback) — cascade foundations.
- Plan 90 (Cascade Coordination) — coordination.
- Plan 82 (Calibration) — thresholds.
- Plan 89 (Error Classification) — judge errors.