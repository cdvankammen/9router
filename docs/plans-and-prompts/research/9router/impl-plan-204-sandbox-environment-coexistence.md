---
Date: 2026-09-16
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, sandbox-alongside-gateway, sandbox-parallel-env, sandbox-coexistence, gateway-sandbox
---

# Implementation Plan 204 — Sandbox Environment Coexistence

> Mined from branch docs: `44-branch-gateways-and-serving.md` (Level 3: ABA — Sandbox Alongside Gateway, Level 4: ABAA — Sandbox Patterns, ABAB — Sandbox Lifecycle).

## 1. Goal

Implement sandbox environment coexistence for 9Router: formalize running sandbox environments alongside the production gateway, add sandbox lifecycle management, and add sandbox isolation — enabling safe experimentation without production risk.

## 2. Background (from research)

- **9Router current state**: No sandbox environment.
- **Research findings** (44-branch):
  - Sandbox alongside gateway (ABA): side-by-side sandbox.
  - Sandbox patterns (ABAA): sandbox patterns.
  - Sandbox lifecycle (ABAB): sandbox lifecycle.

## 3. Design

### 3.1 Sandbox Model

- **Sandbox definition**: isolated environment.
- **Sandbox scope**: routing, config, data.
- **Sandbox boundaries**: explicit boundaries.

### 3.2 Sandbox Patterns

- **Parallel sandbox**: full parallel sandbox.
- **Shadow sandbox**: shadow traffic sandbox.
- **Progressive sandbox**: progressive rollout sandbox.

### 3.3 Sandbox Lifecycle

- **Sandbox creation**: create sandbox.
- **Sandbox promotion**: promote to prod.
- **Sandbox retirement**: retire sandbox.

### 3.4 Integration

- **Config integration**: sandbox config.
- **Observability**: sandbox metrics.
- **Dashboard**: sandbox view.

## 4. Implementation Steps

1. Build sandbox model.
2. Add sandbox patterns.
3. Add sandbox lifecycle.
4. Integrate config.
5. Dashboard: sandbox view.
6. Tests: model, patterns, lifecycle.

## 5. Files Touched

- `src/lib/sandbox/` (new: model, patterns, lifecycle)
- `src/lib/config/` (sandbox config)
- Dashboard sandbox page (new)
- `tests/unit/sandbox.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Sandbox drift | Sync |
| Promo failures | Rollback |
| Isolation gaps | Boundaries |
| Cost | Sharing |

## 7. Success Criteria

- Sandbox works.
- Isolation holds.
- Lifecycle managed.
- Experiments safe.

## 8. Related Plans

- Plan 88 (Rule Engine) — rules.
- Plan 60 (Testing) — testing.
- Plan 22 (Config) — config.
- Plan 44 (Canary) — canary.