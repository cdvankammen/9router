---
Date: 2026-09-16
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, ensemble-composition, mixture-models, model-combination, parallel-inference
---

# Implementation Plan 134 — Ensemble & Model Composition Routing

> Mined from branch docs: `43-branch-moe-and-expert-routing.md` (Level 3: BBB — Ensemble & Composition).

## 1. Goal

Implement ensemble and model composition routing for 9Router: route requests to multiple models in parallel, aggregate their outputs, and produce a combined result — achieving higher quality than any single model at proportional cost.

## 2. Background (from research)

- **9Router current state**: Single-model routing; no ensemble capabilities.
- **Research findings** (43-branch):
  - Ensemble & composition: multiple models vote/combine.
  - Cost-aware expert selection (BBA): cost-aware composition.
  - Task-expert mapping (BAA): which models for which tasks.

## 3. Design

### 3.1 Composition Strategies

- **Voting**: majority vote on discrete outputs.
- **Averaging**: average continuous outputs.
- **Weighted**: weight by model quality/confidence.
- **Cascading**: best-of-N selection.

### 3.2 Parallel Dispatch

- **Dispatch**: fan-out to N models.
- **Timeout**: per-model timeouts.
- **Aggregation**: combine results.
- **Cost tracking**: per-composition cost.

### 3.3 Quality Control

- **Diversity**: ensure model diversity.
- **Agreement metrics**: measure inter-model agreement.
- **Fallback**: single-model if ensemble fails.

### 3.4 Integration

- **Executor integration**: parallel dispatch.
- **Observability**: ensemble metrics.
- **Dashboard**: ensemble view.

## 4. Implementation Steps

1. Build composition strategies.
2. Add parallel dispatch.
3. Add aggregation logic.
4. Add quality control.
5. Dashboard: ensemble view.
6. Tests: composition, dispatch, aggregation.

## 5. Files Touched

- `src/lib/ensemble/` (new: strategies, dispatch, aggregate)
- `open-sse/executors/` (parallel support)
- Dashboard ensemble page (new)
- `tests/unit/ensemble.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Cost explosion | Cost budgets |
| Latency increase | Timeout |
| Quality degradation | Diversity check |
| Dispatch complexity | Simple fan-out |

## 7. Success Criteria

- Ensemble strategies work.
- Parallel dispatch functional.
- Quality exceeds single-model.
- Cost tracked.

## 8. Related Plans

- Plan 85 (Mixture of Agents) — MoA foundations.
- Plan 87 (Cost Heuristics) — cost awareness.
- Plan 92 (Inference Efficiency) — latency.
- Plan 101 (Sparse Routing) — efficiency.