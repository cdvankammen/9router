---
Date: 2026-09-16
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, panel-coordination, cascade-coordination, stickiness-tradeoffs, strategy-evaluation
---

# Implementation Plan 99 — Panel Coordination & Stickiness Tradeoffs

> Mined from branch docs: `42-branch-cascades-and-fallbacks.md` (panel coordination, stickiness implementation, stickiness tradeoffs, strategy evaluation).

## 1. Goal

Add panel coordination and stickiness tradeoff management to 9Router: coordinate multi-model panels (parallel/sequential/hybrid), implement stickiness with configurable tradeoffs against load balancing, and evaluate panel strategies — so complex multi-model workflows are orchestrated optimally.

## 2. Background (from research)

- **9Router current state**: no panel coordination; stickiness not implemented.
- **Research findings** (42-branch):
  - Panel coordination: multiple models on one request.
  - Stickiness implementation: session-level affinity.
  - Stickiness tradeoffs: stickiness vs. load balancing.
  - Strategy evaluation: compare panel strategies.

## 3. Design

### 3.1 Panel Coordination

- **Panel modes**:
  - Parallel: all models run, merge results.
  - Sequential: chain models (output → input).
  - Hybrid: parallel groups in sequence.
- **Panel merge**: aggregator model, voting, best-of-N.
- **Panel lifecycle**: start → collect → merge → finish.
- **Partial failure**: handle incomplete panel results.

### 3.2 Stickiness

- **Stickiness key**: session + route + task-type.
- **Stickiness policies**:
  - Always: same model for session.
  - On-tool-use: stick during tool calls.
  - On-multi-turn: stick for N turns.
- **Stickiness expiry**: time + model availability.
- **Stickiness tradeoff**: configurable weight vs. load balancing.

### 3.3 Strategy Evaluation

- **Strategy registry**: named panel strategies.
- **A/B evaluation**: traffic split.
- **Metrics**: quality, cost, latency, success.
- **Promotion**: auto-promote winners (opt-in).

### 3.4 Integration

- **Combo integration**: panels as combo modes.
- **Observability**: panel telemetry.
- **Dashboard**: panel config + strategy view.

## 4. Implementation Steps

1. Build panel coordinator (`src/lib/panel/`).
2. Implement stickiness with tradeoffs.
3. Build strategy evaluation.
4. Integrate combo modes.
5. Dashboard: panel + strategy views.
6. Tests: panel modes, stickiness, evaluation.

## 5. Files Touched

- `src/lib/panel/` (new: coordinator, merge, sticky, strategy)
- `src/sse/handlers/chat.js` (panel mode)
- `open-sse/config/panelConfig.js` (new)
- Dashboard panel page (new)
- `tests/unit/panel.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Panel cost | Cost caps |
| Merge failure | Fallback to best |
| Stickiness imbalance | Tradeoff weight |
| Strategy noise | Significance testing |

## 7. Success Criteria

- Panels coordinated in all modes.
- Stickiness works with tradeoffs.
- Strategy evaluation runs.
- Telemetry visible.

## 8. Related Plans

- Plan 85 (Mixture-of-Agents) — panel patterns.
- Plan 90 (Cascade Coordination) — cascade/panel synergy.
- Plan 82 (Calibration) — evaluation stats.
- Plan 68 (Session Management) — stickiness state.