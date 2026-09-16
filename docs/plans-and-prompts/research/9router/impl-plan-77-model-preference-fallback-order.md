---
Date: 2026-09-16
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, model-fallback-policy, fallback-orders, preference, routing
---

# Implementation Plan 77 — Model Preference & Fallback Order Policy

> Written after the binary-tree research expansion (see `39-binary-tree-expansion-master-plan.md`, `42-branch-cascades-and-fallbacks.md`).
> This plan covers the "preference policy" option: model preference and fallback order policies.

## 1. Goal

Add model preference and fallback order policies to 9Router: declarative preference rules, fallback order management, and policy enforcement — so model selection follows user intent.

## 2. Background (from research)

- **9Router current state**: combos define order; no preference policy layer.
- **Research findings** (42-branch): preferences (cost-first, quality-first, latency-first); fallback orders (preference-driven); policy enforcement (preferences respected unless overridden).

## 3. Design

### 3.1 Preference Model

- **Preference types**: cost-first, quality-first, latency-first, balanced.
- **Preference scope**: per-user, per-route, global.
- **Preference precedence**: most-specific wins.

### 3.2 Fallback Order

- **Order generation**: preference → fallback order.
- **Order override**: explicit orders override.
- **Order validation**: valid model references.

### 3.3 Policy Enforcement

- **Enforcement points**: selection + fallback.
- **Enforcement modes**: strict, soft (warn).
- **Enforcement logging**: policy events.

### 3.4 Integration

- **Combo integration**: preferences shape combos.
- **Observability**: preference telemetry.
- **UI**: preference management.

## 4. Implementation Steps

1. Define preference model.
2. Build fallback order generation.
3. Add enforcement.
4. Integrate combos.
5. Tests: preferences, orders, enforcement.

## 5. Files Touched

- `src/lib/preferences/` (new: model, orders)
- `src/sse/handlers/chat.js` (enforcement)
- `open-sse/config/preferenceConfig.js` (new)
- Dashboard preferences page (new)
- `tests/unit/preferences.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Preference conflicts | Precedence rules |
| Order errors | Validation |
| Enforcement gaps | Tests |
| Complexity | Simple defaults |

## 7. Success Criteria

- Preferences enforced.
- Orders generated correctly.
- Enforcement logged.
- UI functional.

## 8. Related Plans
- Plan 27 (Rules Engine) — rule synergy.
- Plan 44 (Dynamic Combos) — combo synergy.
- Plan 8 (Observability) — preference telemetry.