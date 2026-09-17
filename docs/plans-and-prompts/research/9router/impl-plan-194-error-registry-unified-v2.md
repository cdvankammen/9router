---
Date: 2026-09-16
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, error-registry, unified-error-system, error-codes, error-management
---

# Implementation Plan 194 — Error Registry & Unified Error System v2

> Mined from branch docs: `47-branch-9router-internal-threads.md` (Level 4: BAA-A — Error Registry, BAA-B — Unified Error System v2).

## 1. Goal

Implement an error registry and unified error system v2 for 9Router: centralize error definitions, add error codes, add error documentation, and add error evolution — making errors consistent, discoverable, and maintainable.

## 2. Background (from research)

- **9Router current state**: Error system exists (plan 19); registry implicit.
- **Research findings** (47-branch):
  - Error registry (BAA-A): centralized errors.
  - Unified error system v2 (BAA-B): next-gen errors.
  - Error categorization (42-branch): error types.

## 3. Design

### 3.1 Error Registry

- **Error catalog**: all error codes.
- **Error metadata**: code, message, severity, action.
- **Error documentation**: auto-generated docs.

### 3.2 Unified Error v2

- **Error format**: standardized error format.
- **Error propagation**: consistent error flow.
- **Error handling**: unified error handling.

### 3.3 Error Evolution

- **Error versioning**: error code versions.
- **Error deprecation**: deprecate old errors.
- **Error migration**: migrate to new errors.

### 3.4 Integration

- **Code integration**: error registry in code.
- **Observability**: error metrics.
- **Dashboard**: error view.

## 4. Implementation Steps

1. Build error registry.
2. Add unified error v2.
3. Add error evolution.
4. Integrate codebase.
5. Dashboard: error view.
6. Tests: registry, format, evolution.

## 5. Files Touched

- `src/lib/errors/registry.js` (new)
- `src/lib/errors/v2.js` (new)
- `src/shared/errors.js` (integration)
- Dashboard errors page (new)
- `tests/unit/errors.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Registry bloat | Cleanup policy |
| Breaking changes | Versioning |
| Migration cost | Gradual migration |
| Complexity | Simple format |

## 7. Success Criteria

- Registry complete.
- Unified format enforced.
- Evolution managed.
- Errors consistent.

## 8. Related Plans

- Plan 19 (Unified Error System) — error foundations.
- Plan 89 (Error Classification) — classification.
- Plan 122 (Error Categorization) — categorization.
- Plan 62 (User-Facing Errors) — user errors.