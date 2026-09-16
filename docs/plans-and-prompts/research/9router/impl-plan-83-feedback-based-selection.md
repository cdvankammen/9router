---
Date: 2026-09-16
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, feedback-based-selection, human-preference, llm-judge, quality-thresholds
---

# Implementation Plan 83 — Feedback-Based Model Selection

> Mined from branch docs: `46-branch-evaluation-and-cost-quality.md` (feedback-based selection, human preference evaluation, LLM-as-judge, quality thresholds, quality tiers) and `41-branch-learned-routing.md` (feedback loops).

## 1. Goal

Add feedback-based model selection to 9Router: collect user and LLM-judge feedback on responses, learn which models perform best per task type, and adjust routing weights accordingly — so routing continuously improves from real usage.

## 2. Background (from research)

- **9Router current state**: no feedback collection; routing is static.
- **Research findings** (46-branch):
  - Feedback-based selection: use feedback to adjust model selection.
  - Human preference evaluation: gold standard for quality.
  - LLM-as-judge: scalable quality evaluation.
  - Quality thresholds: minimum quality gates.
  - Quality tiers: tiered quality expectations per task.
  - (41-branch) Feedback loops: continuous improvement cycles.

## 3. Design

### 3.1 Feedback Collection

- **Explicit feedback**: thumbs up/down, star ratings, regenerate clicks.
- **Implicit feedback**: copy/continue/edit actions, response abandonment.
- **LLM-judge feedback**: sampled responses scored by a judge model.
- **Feedback store**: SQLite-backed, per (request, model, task-type).

### 3.2 Quality Scoring

- **Judge rubric**: helpfulness, correctness, formatting, safety.
- **Judge sampling**: configurable sampling rate (e.g., 5% of traffic).
- **Score normalization**: 0-1 scale per dimension.
- **Quality thresholds**: per-task-type minimum quality gates.

### 3.3 Selection Weight Adjustment

- **Weight model**: per (task-type, model) quality score with confidence.
- **Adjustment**: Bayesian update on new feedback.
- **Exploration**: epsilon-greedy exploration of untested models.
- **Smoothing**: avoid wild swings (prior + small updates).

### 3.4 Integration

- **Routing integration**: weights influence combo ordering.
- **Override**: explicit user selection bypasses weights.
- **Observability**: weight evolution charts.
- **Dashboard**: feedback review UI.

## 4. Implementation Steps

1. Build feedback collection endpoints (`src/lib/feedback/`).
2. Add LLM-judge service (`src/lib/feedback/judge.js`).
3. Build quality scoring pipeline.
4. Build weight adjustment engine.
5. Integrate weights into combo ordering.
6. Dashboard: feedback UI + weight charts.
7. Tests: feedback capture, scoring, weight updates.

## 5. Files Touched

- `src/lib/feedback/` (new: collect, judge, score, weights)
- `src/app/api/v1/feedback/` (new endpoints)
- `src/sse/handlers/chat.js` (weight integration)
- `src/lib/db/repos/feedbackRepo.js` (new)
- Dashboard feedback page (new)
- `tests/unit/feedback.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Judge bias | Multiple judges + calibration |
| Feedback sparsity | Bayesian priors |
| Weight swings | Smoothing + caps |
| Gaming feedback | Rate limits + anomaly detection |

## 7. Success Criteria

- Feedback collected (explicit + implicit + judge).
- Weights adjust with feedback.
- Quality thresholds enforced.
- Weight evolution visible.
- No regression without opt-in.

## 8. Related Plans

- Plan 82 (Calibration) — outcome feedback.
- Plan 67 (Quality Evaluation) — quality scoring.
- Plan 1 (Learned Routing) — learning loop.
- Plan 75 (Quality Guardrails) — quality gates.