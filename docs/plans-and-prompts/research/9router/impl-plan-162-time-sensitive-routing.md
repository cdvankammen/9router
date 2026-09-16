---
Date: 2026-09-16
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, time-sensitive-routing, latency-routing, urgency-classification, deadline-routing
---

# Implementation Plan 162 — Time-Sensitive Routing & Deadline Management

> Mined from branch docs: `41-branch-learned-routing.md` (Level 3: BBB — Time-Sensitivity in Routing).

## 1. Goal

Implement time-sensitive routing for 9Router: classify request urgency, route urgent requests to faster models, and enforce deadlines — ensuring latency-sensitive requests meet their SLAs.

## 2. Background (from research)

- **9Router current state**: No urgency awareness; all requests treated equally.
- **Research findings** (41-branch):
  - Time-sensitivity in routing (BBB): urgency affects routing.
  - Latency-capacity routing (plan 86): latency-aware routing.
  - Latency monitoring (plan 31): latency tracking.

## 3. Design

### 3.1 Urgency Classification

- **Urgency levels**: critical, high, normal, low.
- **Urgency signals**: explicit, inferred, deadline.
- **Urgency confidence**: calibrated urgency.

### 3.2 Deadline Management

- **Deadline setting**: per-request deadlines.
- **Deadline tracking**: monitor deadlines.
- **Deadline enforcement**: fail on deadline miss.

### 3.3 Time-Aware Routing

- **Urgency → model mapping**: fast models for urgent.
- **Latency prediction**: estimated latency.
- **Deadline-aware selection**: select within deadline.

### 3.4 Integration

- **Routing integration**: urgency hooks.
- **Observability**: urgency metrics.
- **Dashboard**: urgency view.

## 4. Implementation Steps

1. Build urgency classifier.
2. Add deadline management.
3. Add time-aware routing.
4. Integrate routing.
5. Dashboard: urgency view.
6. Tests: urgency, deadlines, routing.

## 5. Files Touched

- `src/lib/urgency/` (new: classify, deadline, route)
- `open-sse/handlers/chatCore.js` (urgency hooks)
- Dashboard urgency page (new)
- `tests/unit/urgency.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Misclassification | Confidence |
| Deadline misses | Enforcement |
| Cost increase | Urgency budgets |
| Complexity | Simple levels |

## 7. Success Criteria

- Urgency classified.
- Deadlines managed.
- Routing time-aware.
- SLAs met.

## 8. Related Plans

- Plan 86 (Latency Capacity) — latency.
- Plan 31 (Performance) — performance.
- Plan 73 (Request Prioritization) — prioritization.
- Plan 154 (Task Classification) — classification.