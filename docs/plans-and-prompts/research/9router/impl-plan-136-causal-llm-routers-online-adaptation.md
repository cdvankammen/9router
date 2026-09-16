---
Date: 2026-09-16
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, causal-routing, adaptive-routing, online-learning, routing-evolution
---

# Implementation Plan 136 — Causal LLM Routers & Online Adaptation

> Mined from branch docs: `41-branch-learned-routing.md` (Level 3: ABB — Causal LLM Routers).

## 1. Goal

Implement causal LLM routers for 9Router: build routers that understand causal relationships between query features and model performance, enabling online adaptation as the model landscape evolves — without full retraining.

## 2. Background (from research)

- **9Router current state**: Static routing rules; no causal modeling.
- **Research findings** (41-branch):
  - Causal LLM Routers (ABB): routers that learn causal relationships.
  - Online adaptation: update routing decisions from feedback.
  - OOD generalization (AAAB): out-of-distribution robustness.

## 3. Design

### 3.1 Causal Model

- **Causal graph**: query features → model performance.
- **Feature extraction**: query complexity, domain, format.
- **Causal inference**: do-calculus for intervention.
- **Counterfactuals**: what-if analysis.

### 3.2 Online Adaptation

- **Feedback loop**: route → response → quality signal.
- **Incremental updates**: update causal model incrementally.
- **Stability**: prevent routing oscillation.
- **Exploration**: explore/exploit balance.

### 3.3 Robustness

- **OOD detection**: detect out-of-distribution queries.
- **Graceful degradation**: fallback on uncertainty.
- **Drift detection**: detect concept drift.

### 3.4 Integration

- **Pre-routing**: causal model for provider selection.
- **Post-routing**: feedback collection.
- **Observability**: causal model metrics.
- **Dashboard**: causal routing view.

## 4. Implementation Steps

1. Build causal model.
2. Add online adaptation.
3. Add OOD detection.
4. Add feedback loop.
5. Dashboard: causal view.
6. Tests: causal, adaptation, OOD.

## 5. Files Touched

- `src/lib/causal-routing/` (new: model, adapt, detect)
- `open-sse/handlers/chatCore.js` (hooks)
- Dashboard causal page (new)
- `tests/unit/causal.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Complexity | Simple features |
| Oscillation | Stability control |
| OOD failures | Graceful degradation |
| Feedback delay | Async updates |

## 7. Success Criteria

- Causal model trained.
- Online adaptation works.
- OOD detected.
- Routing improves over time.

## 8. Related Plans

- Plan 1 (Learned Routing) — foundations.
- Plan 83 (Feedback Selection) — feedback.
- Plan 103 (Human Preference) — quality signals.
- Plan 112 (Experiment Design) — evaluation.