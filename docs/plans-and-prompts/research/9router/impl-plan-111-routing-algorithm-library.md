---
Date: 2026-09-16
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, selection-algorithms, coordination-algorithms, routing-algorithms, decision-rules
---

# Implementation Plan 111 — Routing Algorithm Library (Selection & Coordination)

> Mined from branch docs: `45-branch-semantic-and-embedding-routing.md` (selection algorithms, coordination algorithms, routing algorithms, decision rules, rule composition, hard requirements).

## 1. Goal

Add a routing algorithm library to 9Router: implement a catalog of selection algorithms (top-1, threshold, weighted, cascade, panel) and coordination algorithms (round-robin, least-loaded, sticky, hybrid), all configurable per route — so routing strategies are swappable and comparable.

## 2. Background (from research)

- **9Router current state**: fixed selection logic (combo order).
- **Research findings** (45-branch):
  - Selection algorithms: top-1, threshold-based, weighted.
  - Coordination algorithms: coordination across models.
  - Decision rules: rule composition, hard requirements.

## 3. Design

### 3.1 Selection Algorithms

```
ALGORITHMS = {
  top1:        pick highest score,
  threshold:   pick first above threshold,
  weighted:    weighted random by score,
  cascade:     try in order with fallback,
  panel:       run multiple, merge,
  learned:     learned weights,
}
```

### 3.2 Coordination Algorithms

```
COORDINATION = {
  round_robin:  distribute evenly,
  least_loaded: pick least in-flight,
  sticky:       session affinity,
  health:       health-weighted,
  hybrid:       combination,
}
```

### 3.3 Decision Rules

- **Rule composition**: AND/OR/NOT composition.
- **Hard requirements**: mandatory constraints (auth, safety, capability).
- **Soft preferences**: weighted preferences.

### 3.4 Algorithm Config

- **Per-route algorithm**: route → algorithm selection.
- **Algorithm params**: per-algorithm parameters.
- **Algorithm validation**: valid algorithm configs.

### 3.5 Integration

- **Routing integration**: algorithm dispatch.
- **A/B support**: algorithm comparison.
- **Observability**: algorithm telemetry.
- **Dashboard**: algorithm config.

## 4. Implementation Steps

1. Build algorithm registry (`src/lib/algorithms/`).
2. Implement selection algorithms.
3. Implement coordination algorithms.
4. Add decision rule composition.
5. Integrate routing.
6. Dashboard: algorithm config.
7. Tests: each algorithm, composition.

## 5. Files Touched

- `src/lib/algorithms/` (new: registry, selection, coordination, rules)
- `src/sse/handlers/chat.js` (algorithm dispatch)
- `open-sse/config/algorithmConfig.js` (new)
- Dashboard algorithms page (new)
- `tests/unit/algorithms.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Algorithm bugs | Per-algorithm tests |
| Config errors | Validation |
| Behavior change | Default = current behavior |
| Comparison noise | A/B framework |

## 7. Success Criteria

- All algorithms implemented.
- Configurable per route.
- A/B comparable.
- Default preserves current behavior.

## 8. Related Plans

- Plan 90 (Cascade Coordination) — cascade algorithms.
- Plan 99 (Panel Coordination) — panel algorithms.
- Plan 82 (Calibration) — algorithm evaluation.
- Plan 88 (Rule Engine) — decision rules.