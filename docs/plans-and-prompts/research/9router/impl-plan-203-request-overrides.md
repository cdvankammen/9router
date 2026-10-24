---
Date: 2026-09-16
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, per-request-overrides, request-overrides, override-precedence, override-management
---

# Implementation Plan 201 — Per-Request Override Mechanism

> Mined from branch docs: `47-branch-9router-internal-threads.md` (Level 3: ABA — Request Overrides, Level 4: ABAA — Override Hierarchy, ABAB — Override Precedence, ABBA — Override Scope).

## 1. Goal

Implement per-request override mechanism for 9Router: allow requests to explicitly override routing defaults (model, provider, parameters), define override precedence (request > user > org > global), and track override usage — giving advanced users explicit control.

## 2. Background (from research)

- **9Router current state**: No per-request overrides; plan 47 (request params) implicit.
- **Research findings** (47-branch):
  - Request overrides (ABA): override basics.
  - Override hierarchy (ABAA): override levels.
  - Override precedence (ABAB): precedence rules.
  - Override scope (ABBA): scope of overrides.

## 3. Design

### 3.1 Override Model

- **Override fields**: model, provider, parameters.
- **Override syntax**: request-level syntax.
- **Override validation**: valid override values.

### 3.2 Override Hierarchy

- **Hierarchy levels**: request, user, org, global.
- **Hierarchy precedence**: higher level wins.
- **Hierarchy merging**: merge across levels.

### 3.3 Override Governance

- **Override policy**: who can override.
- **Override limits**: override constraints.
- **Override audit**: override logging.

### 3.4 Integration

- **Routing integration**: override hooks.
- **Observability**: override metrics.
- **Dashboard**: override view.

## 4. Implementation Steps

1. Build override model.
2. Add override hierarchy.
3. Add override governance.
4. Integrate routing.
5. Dashboard: override view.
6. Tests: model, hierarchy, governance.

## 5. Files Touched

- `src/lib/overrides/` (new: model, hierarchy, govern)
- `open-sse/handlers/chatCore.js` (override hooks)
- Dashboard override page (new)
- `tests/unit/overrides.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Override abuse | Governance |
| Precedence confusion | Clear hierarchy |
| Invalid overrides | Validation |
| Complexity | Simple model |

## 7. Success Criteria

- Overrides work.
- Precedence correct.
- Governance enforced.
- Usage tracked.

## 8. Related Plans

- Plan 47 (Request Parameters) — params.
- Plan 8 (Routing Policy) — policy.
- Plan 170 (Policy Overrides) — policy overrides.
- Plan 66 (Egress Rules) — egress.