---
Date: 2026-09-16
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, session-stickiness, session-affinity, conversation-routing, stateful-routing
---

# Implementation Plan 144 — Session Stickiness & Affinity

> Mined from branch docs: `44-branch-gateways-and-serving.md` (Level 3: BBA — Session Stickiness).

## 1. Goal

Implement session stickiness for 9Router: keep a conversation routed to the same provider/model when beneficial (context reuse, consistency), while allowing re-routing when the session fails or quality demands it.

## 2. Background (from research)

- **9Router current state**: No session affinity; every request routed independently.
- **Research findings** (44-branch):
  - Session stickiness (BBA): keep sessions on same model.
  - Strategy selection (AAA-A): per-session strategy.
  - Reliability layers (AB): stickiness vs reliability.

## 3. Design

### 3.1 Stickiness Model

- **Session key**: conversation ID.
- **Sticky target**: provider + model.
- **Sticky TTL**: stickiness duration.
- **Sticky scope**: per-session, per-user.

### 3.2 Stickiness Policies

- **Always sticky**: never re-route.
- **Sticky with failover**: re-route on failure.
- **Sticky with quality**: re-route on quality drop.
- **Non-sticky**: current behavior.

### 3.3 Re-Routing

- **Failure re-route**: failover breaks stickiness.
- **Quality re-route**: quality monitoring.
- **Cost re-route**: cost-based re-routing.
- **Manual re-route**: user override.

### 3.4 Integration

- **Session integration**: session state.
- **Observability**: stickiness metrics.
- **Dashboard**: session view.

## 4. Implementation Steps

1. Build stickiness model.
2. Add stickiness policies.
3. Add re-routing logic.
4. Integrate sessions.
5. Dashboard: session view.
6. Tests: stickiness, re-routing.

## 5. Files Touched

- `src/lib/stickiness/` (new: model, policies, reroute)
- `src/sse/handlers/chat.js` (session integration)
- Dashboard sessions page (new)
- `tests/unit/stickiness.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Stuck on bad model | Quality re-route |
| Context loss | Session state |
| Cost increase | Cost re-route |
| Complexity | Simple policies |

## 7. Success Criteria

- Stickiness works.
- Policies configurable.
- Re-routing functional.
- Sessions tracked.

## 8. Related Plans

- Plan 63 (Session Management) — sessions.
- Plan 99 (Panel Coordination) — coordination.
- Plan 106 (Step Context) — context.
- Plan 44 (Gateway Interop) — gateway patterns.