---
Date: 2026-09-16
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, human-preference-evaluation, preference-learning, user-feedback, quality-signals
---

# Implementation Plan 103 — Human Preference Evaluation & Preference Learning

> Mined from branch docs: `46-branch-evaluation-and-cost-quality.md` (human preference evaluation, feedback-based selection) and `41-branch-learned-routing.md` (feedback loops).

## 1. Goal

Add human preference evaluation to 9Router: collect structured human preference signals (pairwise comparisons, ratings, implicit signals), learn per-user and aggregate preferences, and feed them into routing — so routing aligns with what users actually prefer.

## 2. Background (from research)

- **9Router current state**: no preference collection.
- **Research findings** (46-branch):
  - Human preference evaluation: gold standard quality signal.
  - Feedback-based selection: feedback → selection weights.
  - (41-branch) Feedback loops: continuous improvement.

## 3. Design

### 3.1 Preference Collection

- **Pairwise comparisons**: "which response is better?" UI.
- **Ratings**: star/scale ratings.
- **Implicit signals**: copy, continue, edit, regenerate.
- **Collection points**: chat UI, API feedback endpoint.

### 3.2 Preference Learning

- **Per-user preferences**: user-level preference model.
- **Aggregate preferences**: global preference model.
- **Preference dimensions**: style, depth, format, tone.
- **Learning method**: Bradley-Terry / Elo-style updates.

### 3.3 Preference Application

- **Routing impact**: preference-weighted model selection.
- **Parameter impact**: preference-based parameter tuning (temperature, style).
- **Personalization**: per-user routing profiles.

### 3.4 Evaluation

- **Preference accuracy**: predicted vs. actual preferences.
- **Preference drift**: preference changes over time.
- **Evaluation reports**: preference analytics.

### 3.5 Integration

- **Feedback integration**: plan 83 feedback pipeline.
- **Observability**: preference metrics.
- **Dashboard**: preference UI.

## 4. Implementation Steps

1. Build preference collection (`src/lib/preferences/`).
2. Build preference learning.
3. Build preference application.
4. Add evaluation.
5. Integrate routing.
6. Dashboard: preference UI.
7. Tests: learning, application, drift.

## 5. Files Touched

- `src/lib/preferences/` (new: collect, learn, apply, evaluate)
- `src/sse/handlers/chat.js` (preference integration)
- `src/lib/db/repos/preferenceRepo.js` (new)
- Dashboard preferences page (new)
- `tests/unit/preferences.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Sparse feedback | Aggregate priors |
| Preference noise | Smoothing |
| Privacy | Anonymization |
| Over-personalization | Global fallback |

## 7. Success Criteria

- Preferences collected.
- Learning updates models.
- Routing respects preferences.
- Drift tracked.

## 8. Related Plans

- Plan 83 (Feedback Selection) — feedback pipeline.
- Plan 77 (Preference/Fallback Order) — preference policy.
- Plan 1 (Learned Routing) — learning loop.
- Plan 35 (Privacy) — data protection.