---
Date: 2026-09-16
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, cascade-coordination, panel-coordination, stickiness, strategy-evaluation
---

# Implementation Plan 90 — Cascade Coordination & Strategy Evaluation

> Mined from branch docs: `42-branch-cascades-and-fallbacks.md` (cascade coordination, panel coordination, stickiness implementation, stickiness tradeoffs, strategy evaluation) and `41-branch-learned-routing.md` (strategy evaluation).

## 1. Goal

Add cascade coordination and strategy evaluation to 9Router: coordinate multi-stage cascades (retrieval → generation → verification), coordinate multi-model panels, implement stickiness correctly, and evaluate routing strategies — so complex request flows are orchestrated coherently.

## 2. Background (from research)

- **9Router current state**: combos are sequential fallback; no cascade/panel orchestration.
- **Research findings** (42-branch):
  - Cascade coordination: multi-stage pipelines with handoff semantics.
  - Panel coordination: multiple models working on one request.
  - Stickiness implementation: session-level model affinity.
  - Stickiness tradeoffs: stickiness vs. load balancing.
  - Strategy evaluation: compare routing strategies empirically.

## 3. Design

### 3.1 Cascade Coordination

- **Cascade stages**: retrieve → generate → verify → refine.
- **Stage handoff**: structured output passing between stages.
- **Stage failure**: per-stage fallback.
- **Cascade config**: stage definitions, triggers, budgets.

### 3.2 Panel Coordination

- **Panel modes**: parallel (all models), sequential (chain), hybrid.
- **Panel merge**: aggregator or voting.
- **Panel lifecycle**: start, collect, merge, finish.
- **Panel failure**: partial results handling.

### 3.3 Stickiness

- **Stickiness key**: session + route + task-type.
- **Stickiness policy**: always, on-tool-use, on-multi-turn.
- **Stickiness expiry**: time-based + model-availability-based.
- **Stickiness tradeoff**: balance with load balancing (configurable).

### 3.4 Strategy Evaluation

- **Strategy registry**: named routing strategies.
- **A/B evaluation**: traffic split between strategies.
- **Evaluation metrics**: quality, cost, latency, success.
- **Strategy promotion**: promote winning strategies.

### 3.5 Integration

- **Combo integration**: cascades/panels as combo modes.
- **Observability**: cascade/panel telemetry.
- **Dashboard**: cascade config + strategy evaluation view.

## 4. Implementation Steps

1. Build cascade orchestrator (`src/lib/cascade/`).
2. Build panel coordinator (`src/lib/cascade/panel.js`).
3. Implement stickiness (`src/lib/cascade/sticky.js`).
4. Build strategy evaluation framework.
5. Integrate combo modes.
6. Dashboard: cascade + strategy views.
7. Tests: cascade handoff, panel merge, stickiness.

## 5. Files Touched

- `src/lib/cascade/` (new: orchestrator, panel, sticky, strategy)
- `src/sse/handlers/chat.js` (cascade mode)
- `open-sse/config/cascadeConfig.js` (new)
- Dashboard cascade page (new)
- `tests/unit/cascade.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Cascade latency | Stage budgets |
| Panel cost | Cost caps |
| Stickiness imbalance | Expiry + load balancing |
| Strategy noise | Significance testing |

## 7. Success Criteria

- Cascades orchestrated with handoff.
- Panels coordinated.
- Stickiness works with expiry.
- Strategy evaluation runs.
- Telemetry visible.

## 8. Related Plans

- Plan 85 (Mixture-of-Agents) — panel patterns.
- Plan 82 (Calibration) — strategy evaluation stats.
- Plan 2 (Cascade Fallback) — cascade foundations.
- Plan 68 (Session Management) — stickiness state.