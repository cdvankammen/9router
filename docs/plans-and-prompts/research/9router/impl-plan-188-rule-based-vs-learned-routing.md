---
Date: 2026-09-16
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, rule-based-routing, learned-routing, routing-hybrid, routing-strategy
---

# Implementation Plan 188 — Rule-Based vs Learned Routing Hybrid

> Mined from branch docs: `45-branch-semantic-and-embedding-routing.md` (Level 4: BAA-B — Rule-Based vs Learned).

## 1. Goal

Implement a hybrid rule-based and learned routing system for 9Router: combine deterministic rules (fast, explainable) with learned models (adaptive, accurate), use rules as guardrails and learned models for fine-grained decisions — getting the best of both approaches.

## 2. Background (from research)

- **9Router current state**: Rule-based routing; no learned component.
- **Research findings** (45-branch):
  - Rule-based vs learned (BAA-B): hybrid approaches.
  - Rule evaluation (BAA-A): rule systems.
  - Learned routing (41-branch): ML approaches.

## 3. Design

### 3.1 Rule Layer

- **Rule types**: hard constraints, soft preferences.
- **Rule evaluation**: fast rule engine.
- **Rule priority**: rule precedence.

### 3.2 Learned Layer

- **Learned models**: classifiers, predictors.
- **Learned inference**: fast inference.
- **Learned fallback**: rule fallback.

### 3.3 Hybrid Logic

- **Rule-first**: rules filter, learned selects.
- **Learned-first**: learned selects, rules validate.
- **Parallel**: both run, reconcile.

### 3.4 Integration

- **Routing integration**: hybrid routing.
- **Observability**: hybrid metrics.
- **Dashboard**: hybrid view.

## 4. Implementation Steps

1. Build rule layer.
2. Add learned layer.
3. Add hybrid logic.
4. Integrate routing.
5. Dashboard: hybrid view.
6. Tests: rules, learned, hybrid.

## 5. Files Touched

- `src/lib/hybrid/` (new: rules, learned, hybrid)
- `open-sse/handlers/chatCore.js` (hybrid hooks)
- Dashboard hybrid page (new)
- `tests/unit/hybrid.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Rule-learned conflict | Clear precedence |
| Complexity | Simple hybrid |
| Latency | Fast paths |
| Maintenance | Clear ownership |

## 7. Success Criteria

- Rules enforced.
- Learned adaptive.
- Hybrid functional.
- Routing improved.

## 8. Related Plans

- Plan 88 (Rule Engine v2) — rules.
- Plan 1 (Learned Routing) — learned.
- Plan 131 (Classifier) — learned models.
- Plan 135 (Constraint Routing) — rules.