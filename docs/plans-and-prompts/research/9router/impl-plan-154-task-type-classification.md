---
Date: 2026-09-16
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, task-type-classification, task-taxonomy, query-classification, workload-classification
---

# Implementation Plan 154 — Task-Type Classification & Workload Taxonomy

> Mined from branch docs: `44-branch-gateways-and-serving.md` (Level 3: BAA — Task-Type Classification).

## 1. Goal

Implement task-type classification for 9Router: build a comprehensive task taxonomy (code, math, writing, analysis, translation, chat, vision, audio), classify every request, and use the classification for routing — improving routing precision.

## 2. Background (from research)

- **9Router current state**: Basic task classification (plan 56).
- **Research findings** (44-branch):
  - Task-type classification (BAA): task taxonomy.
  - Code task routing (BAA-A): code classification.
  - Strategy selection (AAA-A): per-task strategies.

## 3. Design

### 3.1 Task Taxonomy

- **Taxonomy levels**: coarse (8 types) → fine (32 types).
- **Task definitions**: per-type definitions.
- **Task examples**: per-type examples.

### 3.2 Classification

- **Classifier**: rule + ML hybrid.
- **Classification signals**: content, structure, modality.
- **Classification confidence**: calibrated.

### 3.3 Task-Based Routing

- **Task → model mapping**: per-task model lists.
- **Task → strategy mapping**: per-task strategies.
- **Task fallback**: general fallback.

### 3.4 Integration

- **Pre-routing**: classification before selection.
- **Observability**: task distribution.
- **Dashboard**: task view.

## 4. Implementation Steps

1. Build task taxonomy.
2. Add classifier.
3. Add task-based routing.
4. Add fallback.
5. Dashboard: task view.
6. Tests: taxonomy, classification, routing.

## 5. Files Touched

- `src/lib/tasks/` (new: taxonomy, classify, route)
- `open-sse/handlers/chatCore.js` (pre-routing)
- Dashboard tasks page (new)
- `tests/unit/tasks.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Misclassification | Confidence |
| Taxonomy gaps | Extensible taxonomy |
| Overfitting | General fallback |
| Complexity | Coarse-first |

## 7. Success Criteria

- Taxonomy complete.
- Classification accurate.
- Routing improved.
- Distribution visible.

## 8. Related Plans

- Plan 56 (Task Classification) — foundations.
- Plan 142 (Domain Specialized) — domains.
- Plan 81 (Intent Classification) — intents.
- Plan 104 (Capability Matching) — capabilities.