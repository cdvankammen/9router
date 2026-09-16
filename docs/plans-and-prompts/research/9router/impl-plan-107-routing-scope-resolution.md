---
Date: 2026-09-16
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, route-granularity, per-request-routing, per-user-routing, routing-scopes
---

# Implementation Plan 107 — Routing Scope Resolution (Per-Request, Per-User, Per-Route)

> Mined from branch docs: `41-branch-learned-routing.md` (route granularity) and `47-branch-9router-internal-threads.md` (route granularity).

## 1. Goal

Add routing scope resolution to 9Router: resolve routing decisions across scopes (global, per-route, per-user, per-request, per-task) with defined precedence — so routing configuration is expressive and predictable at every granularity.

## 2. Background (from research)

- **9Router current state**: routing config is global + per-route; no scope resolution.
- **Research findings** (41-branch):
  - Route granularity: per-request, per-user, per-route, per-task granularity.
  - Precedence: most-specific scope wins.

## 3. Design

### 3.1 Scope Model

```
SCOPES = ['global', 'route', 'user', 'task', 'request']
PRECEDENCE = request > task > user > route > global
```

### 3.2 Scope Resolution

- **Resolution pipeline**: collect applicable configs → order by precedence → merge.
- **Merge semantics**: most-specific overrides, partial merge.
- **Conflict detection**: conflicting settings flagged.

### 3.3 Scope Sources

- **Global**: default config.
- **Route**: per-route config.
- **User**: per-user preferences.
- **Task**: taxonomy-based config.
- **Request**: per-request overrides (headers, params).

### 3.4 Scope Management

- **Scope CRUD**: per-scope config management.
- **Scope validation**: valid scope references.
- **Scope audit**: config change audit.

### 3.5 Integration

- **Routing integration**: resolution in selection.
- **Observability**: resolved config telemetry.
- **Dashboard**: scope editor.

## 4. Implementation Steps

1. Define scope model (`src/lib/scopes/`).
2. Build resolution pipeline.
3. Add merge semantics.
4. Add scope management.
5. Integrate routing.
6. Dashboard: scope editor.
7. Tests: precedence, merge, conflicts.

## 5. Files Touched

- `src/lib/scopes/` (new: model, resolve, merge, manage)
- `src/sse/handlers/chat.js` (resolution integration)
- `src/lib/db/repos/scopeRepo.js` (new)
- Dashboard scopes page (new)
- `tests/unit/scopes.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Precedence confusion | Clear docs + UI |
| Merge surprises | Conflict flags |
| Config explosion | Validation |
| Audit gaps | Change logging |

## 7. Success Criteria

- Scopes resolved with precedence.
- Merges predictable.
- Conflicts flagged.
- Scope editor functional.

## 8. Related Plans

- Plan 88 (Rule Engine v2) — rule scopes.
- Plan 42 (Config Overhaul) — config system.
- Plan 71 (Governance) — config governance.
- Plan 38 (RBAC) — user scopes.