---
Date: 2026-09-16
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, rule-based-vs-learned, hybrid-routing, explainable-routing, routing-transparency
---

# Implementation Plan 108 — Hybrid Rule-Based + Learned Routing with Explainability

> Mined from branch docs: `41-branch-learned-routing.md` (rule-based vs learned, rule evaluation) and `46-branch-evaluation-and-cost-quality.md` (router calibration).

## 1. Goal

Add hybrid routing to 9Router: combine rule-based routing (transparent, deterministic) with learned routing (adaptive, data-driven) in a single framework, with explainability for every routing decision — so routing is both adaptive and auditable.

## 2. Background (from research)

- **9Router current state**: rule-based only (combos).
- **Research findings** (41-branch):
  - Rule-based vs learned: rules are transparent; learned is adaptive — combine.
  - Rule evaluation: evaluate rule effectiveness.
  - (46-branch) Calibration: learned components need calibration.

## 3. Design

### 3.1 Hybrid Framework

```
Decision = f(rules, learned_weights, context)
- Rules: hard constraints (auth, safety, compliance)
- Learned: soft preferences (quality, cost, latency)
- Context: request, user, route, task
```

### 3.2 Rule Layer

- **Hard rules**: always enforced.
- **Soft rules**: weighted preferences.
- **Rule evaluation**: rule effectiveness metrics.

### 3.3 Learned Layer

- **Learned weights**: per (context, model) scores.
- **Learning sources**: feedback, outcomes, calibration.
- **Learning updates**: Bayesian/EWMA updates.

### 3.4 Explainability

- **Decision trace**: every decision records contributing factors.
- **Explanation format**: human-readable reasons.
- **Explanation API**: per-decision explanation endpoint.
- **Explanation UI**: dashboard decision inspector.

### 3.5 Integration

- **Routing integration**: hybrid decision in selection.
- **Observability**: rule vs. learned contribution.
- **Dashboard**: hybrid config + decision inspector.

## 4. Implementation Steps

1. Build hybrid framework (`src/lib/hybrid/`).
2. Add rule layer integration.
3. Add learned layer.
4. Build decision tracing.
5. Add explanation API.
6. Dashboard: decision inspector.
7. Tests: hybrid decisions, traces, explanations.

## 5. Files Touched

- `src/lib/hybrid/` (new: framework, rules, learned, trace, explain)
- `src/sse/handlers/chat.js` (hybrid integration)
- `src/app/api/v1/explain/` (new endpoint)
- `open-sse/config/hybridConfig.js` (new)
- Dashboard hybrid page (new)
- `tests/unit/hybrid.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Rule/learned conflict | Rule precedence |
| Explanation cost | Trace sampling |
| Learned instability | Smoothing |
| Opacity | Decision traces |

## 7. Success Criteria

- Hybrid decisions work.
- Rules always enforced.
- Learned weights adapt.
- Every decision explainable.

## 8. Related Plans

- Plan 1 (Learned Routing) — learning loop.
- Plan 88 (Rule Engine v2) — rule layer.
- Plan 82 (Calibration) — learned calibration.
- Plan 66 (Request Tracing) — trace infrastructure.