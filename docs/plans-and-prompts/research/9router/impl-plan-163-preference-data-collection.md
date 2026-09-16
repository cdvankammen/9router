---
Date: 2026-09-16
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, preference-data-collection, arena-data, preference-labels, feedback-collection
---

# Implementation Plan 163 — Preference Data Collection Pipeline

> Mined from branch docs: `41-branch-learned-routing.md` (Level 4: AAAA — Preference Data Collection, Chatbot Arena).

## 1. Goal

Implement a preference data collection pipeline for 9Router: collect pairwise preference data (which model answered better), store it, and feed it to routing improvements — building a 9Router-specific preference dataset.

## 2. Background (from research)

- **9Router current state**: No preference collection.
- **Research findings** (41-branch):
  - Preference data collection (AAAA): Arena-style collection.
  - Data augmentation for OOD (AAAB): augment data.
  - Bradley-Terry models (AAB): preference modeling.

## 3. Design

### 3.1 Collection

- **Collection points**: dashboard, API, CLI.
- **Collection UI**: thumbs up/down, pairwise.
- **Collection metadata**: query, models, context.

### 3.2 Storage

- **Preference store**: SQLite-backed.
- **Preference schema**: query, model_a, model_b, winner.
- **Preference privacy**: PII filtering.

### 3.3 Pipeline

- **Preference export**: export for training.
- **Preference analysis**: win rates, patterns.
- **Preference feedback**: feed to routers.

### 3.4 Integration

- **Routing integration**: preference signals.
- **Observability**: preference metrics.
- **Dashboard**: preference view.

## 4. Implementation Steps

1. Build collection UI.
2. Add preference store.
3. Add export pipeline.
4. Add analysis.
5. Dashboard: preference view.
6. Tests: collection, storage, export.

## 5. Files Touched

- `src/lib/preferences/` (new: collect, store, export)
- Dashboard preference UI (new)
- `src/lib/db/repos/preferences.js` (new)
- `tests/unit/preferences.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Low volume | Multiple collection points |
| Bias | Balanced collection |
| Privacy | PII filtering |
| Quality | Validation |

## 7. Success Criteria

- Preferences collected.
- Stored securely.
- Exported cleanly.
- Routers improved.

## 8. Related Plans

- Plan 83 (Feedback Selection) — feedback.
- Plan 103 (Human Preference) — preference learning.
- Plan 131 (Classifier) — training data.
- Plan 148 (Dataset Construction) — datasets.