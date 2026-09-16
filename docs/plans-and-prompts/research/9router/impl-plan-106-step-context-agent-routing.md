---
Date: 2026-09-16
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, step-context, step-classification, agent-workflows, multi-step-routing
---

# Implementation Plan 106 — Step Context & Multi-Step Agent Routing

> Mined from branch docs: `47-branch-9router-internal-threads.md` (step context, step classification, agent task routing) and `41-branch-learned-routing.md` (agent task routing).

## 1. Goal

Add step context and multi-step agent routing to 9Router: track agent workflow steps, classify each step, carry step context across routing decisions, and route each step to the best model — so multi-step agent workflows are routed coherently.

## 2. Background (from research)

- **9Router current state**: each request routed independently; no step awareness.
- **Research findings** (47-branch):
  - Step context: context across agent steps.
  - Step classification: per-step task classification.
  - Agent task routing: agent workflows need coherent routing.

## 3. Design

### 3.1 Step Tracking

- **Step model**: workflow id, step index, step type, step state.
- **Step detection**: detect agent workflow patterns (tool calls, multi-turn).
- **Step store**: per-workflow step records.

### 3.2 Step Classification

- **Step types**: plan, act, observe, verify, refine, finalize.
- **Classification**: per-step type detection.
- **Step confidence**: classification confidence.

### 3.3 Step-Aware Routing

- **Step → model mapping**: step type → preferred model.
- **Step context**: carry context (goals, constraints, prior steps) into routing.
- **Step stickiness**: stick within workflow steps.
- **Step transitions**: model changes between steps.

### 3.4 Workflow Analytics

- **Workflow metrics**: steps per workflow, model transitions, success.
- **Workflow quality**: end-to-end workflow quality.
- **Workflow reports**: per-workflow-type analytics.

### 3.5 Integration

- **Session integration**: step state in session.
- **Observability**: step telemetry.
- **Dashboard**: workflow view.

## 4. Implementation Steps

1. Build step tracking (`src/lib/steps/`).
2. Build step classification.
3. Build step-aware routing.
4. Add workflow analytics.
5. Integrate session.
6. Dashboard: workflow view.
7. Tests: step tracking, classification, routing.

## 5. Files Touched

- `src/lib/steps/` (new: track, classify, route, analytics)
- `src/sse/handlers/chat.js` (step integration)
- `src/lib/db/repos/stepRepo.js` (new)
- Dashboard workflows page (new)
- `tests/unit/steps.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Step misdetection | Conservative detection |
| Context bloat | Context budgets |
| Stickiness conflicts | Expiry |
| Analytics noise | Aggregation |

## 7. Success Criteria

- Steps tracked per workflow.
- Steps classified.
- Step-aware routing works.
- Workflow analytics visible.

## 8. Related Plans

- Plan 80 (Tool Routing) — tool steps.
- Plan 81 (Intent Classification) — step classification.
- Plan 68 (Session Management) — session state.
- Plan 90 (Cascade Coordination) — workflow orchestration.