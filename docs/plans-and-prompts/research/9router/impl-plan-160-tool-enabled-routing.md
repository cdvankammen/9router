---
Date: 2026-09-16
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, tool-enabled-routing, function-calling-routing, tool-fallback, tool-routing
---

# Implementation Plan 160 — Tool-Enabled Routing & Tool Fallback

> Mined from branch docs: `48-branch-emerging-and-frontier.md` (Level 3: BAB — Tool-Enabled Routing, BAB-A — Function Calling, BAB-B — Tool Fallback).

## 1. Goal

Implement tool-enabled routing for 9Router: route requests based on tool/function-calling requirements, ensure tool-capable models are selected when tools are needed, and add tool fallback — preventing tool-call failures.

## 2. Background (from research)

- **9Router current state**: Tool routing exists (plan 80); shallow.
- **Research findings** (48-branch):
  - Tool-enabled routing (BAB): tool-aware routing.
  - Function calling (BAB-A): function-call support.
  - Tool fallback (BAB-B): fallback on tool failure.

## 3. Design

### 3.1 Tool Capability Model

- **Tool registry**: supported tools per model.
- **Tool capability**: function-call support.
- **Tool compatibility**: tool → model mapping.

### 3.2 Tool-Aware Routing

- **Tool detection**: tools in request.
- **Tool routing**: route to tool-capable models.
- **Tool priority**: tool support priority.

### 3.3 Tool Fallback

- **Tool failure**: detect tool failures.
- **Tool fallback**: fallback to capable model.
- **Tool degradation**: degrade gracefully.

### 3.4 Integration

- **Routing integration**: tool-aware selection.
- **Observability**: tool metrics.
- **Dashboard**: tool view.

## 4. Implementation Steps

1. Build tool registry.
2. Add tool detection.
3. Add tool-aware routing.
4. Add tool fallback.
5. Dashboard: tool view.
6. Tests: registry, routing, fallback.

## 5. Files Touched

- `src/lib/tools/` (new: registry, detect, route)
- `open-sse/handlers/chatCore.js` (integration)
- Dashboard tools page (new)
- `tests/unit/tools.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Tool failures | Fallback |
| Capability gaps | Registry |
| Cost | Tool-aware budgets |
| Complexity | Simple defaults |

## 7. Success Criteria

- Tools catalogued.
- Routing tool-aware.
- Fallback works.
- Failures reduced.

## 8. Related Plans

- Plan 80 (Tool Routing) — foundations.
- Plan 15 (Message-Driven Tools) — tools.
- Plan 104 (Capability Matching) — capabilities.
- Plan 159 (Per-Step Routing) — steps.