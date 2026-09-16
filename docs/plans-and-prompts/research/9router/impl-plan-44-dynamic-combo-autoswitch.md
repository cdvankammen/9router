---
Date: 2026-09-16
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, model-combos, auto-switch, dynamic, adaptive
---

# Implementation Plan 44 — Dynamic Model Combo Auto-Switch

> Written after the binary-tree research expansion (see `39-binary-tree-expansion-master-plan.md`, `42-branch-cascades-and-fallbacks.md`).
> This plan covers the "dynamic combo auto-switch" option: adaptive combo selection based on real-time conditions.

## 1. Goal

Add dynamic combo auto-switching: combos that adapt at runtime based on conditions (cost, latency, error rates, quota) — moving from static combos to adaptive strategies.

## 2. Background (from research)

- **9Router current state**: static combos (ordered model lists); `scripts/test-combo-autoswitch.mjs` exists (combo auto-switch testing).
- **Research findings** (42-branch): cascades benefit from dynamic selection; conditions (cost, latency, errors) should drive combo choice; auto-switch needs hysteresis to avoid thrash.

## 3. Design

### 3.1 Dynamic Combo Model

- **Combo variants**: multiple variants per combo (cheap, balanced, quality).
- **Condition signals**: cost, latency, error rate, quota, task type.
- **Selection function**: conditions → variant.

### 3.2 Auto-Switch Logic

- **Switch triggers**: threshold crossings (cost spike, latency breach, error rate).
- **Hysteresis**: switch only after sustained condition (avoid thrash).
- **Switch cooldown**: minimum time between switches.
- **Switch logging**: switch events with reasons.

### 3.3 Learning

- **Outcome tracking**: track outcomes per variant.
- **Variant ranking**: rank variants by outcome.
- **Adaptive defaults**: default variant from ranking.

### 3.4 Integration

- **Combo API**: combos expose variants + conditions.
- **Dashboard**: combo variant management.
- **Testing**: auto-switch test harness (extend test-combo-autoswitch.mjs).

## 4. Implementation Steps

1. Define dynamic combo model.
2. Build selection function.
3. Add hysteresis + cooldown.
4. Add outcome tracking.
5. Extend auto-switch tests.
6. Tests: selection, hysteresis, switching.

## 5. Files Touched

- `src/lib/combos/` (new: dynamic model)
- `src/sse/handlers/chat.js` (selection integration)
- `src/lib/db/repos/comboRepo.js` (variants)
- Dashboard combos page (extend)
- `scripts/test-combo-autoswitch.mjs` (extend)
- `tests/unit/combo-autoswitch.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Switch thrash | Hysteresis + cooldown |
| Wrong variant | Outcome tracking |
| Complexity | Simple conditions first |
| Testing gaps | Harness extension |

## 7. Success Criteria

- Combos adapt to conditions.
- No thrash (hysteresis works).
- Outcomes tracked.
- Auto-switch tested.

## 8. Related Plans
- Plan 2 (Cascade Enhancements) — cascade synergy.
- Plan 27 (Rules Engine) — condition engine.
- Plan 8 (Observability) — switch telemetry.