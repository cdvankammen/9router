---
Date: 2026-09-16
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, request-prioritization, qos, queues, fairness
---

# Implementation Plan 73 — Request Prioritization & QoS

> Written after the binary-tree research expansion (see `39-binary-tree-expansion-master-plan.md`, `47-branch-9router-internal-threads.md`).
> This plan covers the "prioritization/QoS" option: request prioritization and quality-of-service.

## 1. Goal

Add request prioritization and QoS to 9Router: priority classes, queue management, and fairness — so critical requests get service under load.

## 2. Background (from research)

- **9Router current state**: no prioritization; requests processed FIFO.
- **Research findings**: priority classes (critical, normal, best-effort); queue management (bounded queues, admission control); fairness (no starvation).

## 3. Design

### 3.1 Priority Classes

- **Classes**: critical, normal, best-effort.
- **Class assignment**: per-key, per-route, per-request.
- **Class config**: configurable.

### 3.2 Queue Management

- **Queues**: per-priority queues.
- **Admission control**: queue limits.
- **Scheduling**: priority scheduling (weighted).

### 3.3 Fairness

- **Fairness policy**: no starvation (aging).
- **Fairness enforcement**: weighted fair queuing.
- **Fairness monitoring**: wait times per class.

### 3.4 Integration

- **Routing integration**: priority-aware dispatch.
- **Observability**: queue telemetry.
- **Alerts**: queue overflow.

## 4. Implementation Steps

1. Define priority classes.
2. Build queue management.
3. Add fairness.
4. Integrate dispatch.
5. Tests: priorities, queues, fairness.

## 5. Files Touched

- `src/lib/qos/` (new: classes, queues)
- `src/sse/handlers/chat.js` (dispatch)
- `open-sse/config/qosConfig.js` (new)
- `src/lib/db/repos/qosRepo.js` (new)
- `tests/unit/qos.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Starvation | Aging |
| Queue buildup | Admission control |
| Priority abuse | Class assignment rules |
| Complexity | Simple scheduling |

## 7. Success Criteria

- Priorities enforced.
- Queues bounded.
- Fairness maintained.
- Telemetry visible.

## 8. Related Plans
- Plan 18 (Serving Policy) — priority synergy.
- Plan 24 (Rate Limiting) — admission control.
- Plan 60 (Load Testing) — load behavior.