---
Date: 2026-09-16
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, per-step-routing, step-classification, step-context, agent-routing
---

# Implementation Plan 159 — Per-Step Routing for Agents

> Mined from branch docs: `48-branch-emerging-and-frontier.md` (Level 3: BAA — Per-Step Routing, BAA-A — Step Classification, BAA-B — Step Context).

## 1. Goal

Implement per-step routing for agent workloads in 9Router: classify each agent step (reasoning, tool call, code, summary) and route each step to the best model — optimizing cost and quality for multi-step agent conversations.

## 2. Background (from research)

- **9Router current state**: Whole-conversation routing only.
- **Research findings** (48-branch):
  - Per-step routing (BAA): route each step.
  - Step classification (BAA-A): classify step types.
  - Step context (BAA-B): step context features.
  - Agent routing details (BA): agent-native routing.

## 3. Design

### 3.1 Step Classification

- **Step types**: reasoning, tool, code, summary, chat.
- **Step features**: content, tool calls, length.
- **Step classifier**: rule + ML hybrid.

### 3.2 Step Routing

- **Step → model mapping**: per-step model lists.
- **Step context**: conversation context for routing.
- **Step fallback**: general fallback.

### 3.3 Agent Integration

- **Agent protocol**: step-aware API.
- **Step tracking**: step state.
- **Step observability**: per-step metrics.

### 3.4 Integration

- **Routing integration**: step-aware routing.
- **Observability**: step distribution.
- **Dashboard**: step view.

## 4. Implementation Steps

1. Build step classifier.
2. Add step routing.
3. Add step context.
4. Integrate agent protocol.
5. Dashboard: step view.
6. Tests: classification, routing, context.

## 5. Files Touched

- `src/lib/steps/` (new: classify, route, context)
- `src/app/api/v1/` (step-aware API)
- Dashboard steps page (new)
- `tests/unit/steps.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Misclassification | Confidence |
| Context loss | Step state |
| Cost increase | Step budgets |
| Complexity | Coarse steps |

## 7. Success Criteria

- Steps classified.
- Step routing works.
- Context preserved.
- Cost optimized.

## 8. Related Plans

- Plan 106 (Step Context) — context.
- Plan 14 (Goal Systems) — agent goals.
- Plan 85 (Mixture of Agents) — agent routing.
- Plan 154 (Task Classification) — taxonomy.