---
Date: 2026-09-16
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, quality-tiers, quality-thresholds, cost-tier-defaults, task-quality
---

# Implementation Plan 97 — Quality Tiers & Thresholds

> Mined from branch docs: `46-branch-evaluation-and-cost-quality.md` (quality tiers, quality thresholds, cost tier defaults) and `42-branch-cascades-and-fallbacks.md` (quality thresholds).

## 1. Goal

Add quality tiers and thresholds to 9Router: define quality tiers (draft, standard, premium, critical), map task types to required tiers, and enforce quality thresholds with verification — so every request gets the quality it needs without overpaying.

## 2. Background (from research)

- **9Router current state**: no quality tier concept.
- **Research findings** (46-branch):
  - Quality tiers: tiered quality expectations.
  - Quality thresholds: minimum quality gates.
  - Cost tier defaults: tier ↔ cost mapping.

## 3. Design

### 3.1 Quality Tier Model

```
TIERS = {
  draft:     { minQuality: 0.3, models: [cheap], verify: false },
  standard:  { minQuality: 0.6, models: [mid],   verify: false },
  premium:   { minQuality: 0.8, models: [high],  verify: 'sample' },
  critical:  { minQuality: 0.9, models: [best],  verify: 'always' },
}
```

### 3.2 Tier Assignment

- **Task-type mapping**: taxonomy → default tier.
- **User override**: per-user tier preference.
- **Route override**: per-route tier.
- **Dynamic tiering**: difficulty prediction → tier bump.

### 3.3 Quality Verification

- **Verification modes**: none, sample, always.
- **Verification methods**: LLM-judge, self-check, rule checks.
- **Verification failure**: retry on higher tier (escalation).

### 3.4 Tier Enforcement

- **Model gating**: tier restricts model pool.
- **Cost gating**: tier caps cost.
- **Escalation**: verified failure → escalate tier.

### 3.5 Integration

- **Routing integration**: tier-aware selection.
- **Observability**: tier distribution, escalation rate.
- **Dashboard**: tier config UI.

## 4. Implementation Steps

1. Define tier model (`src/lib/tiers/`).
2. Build tier assignment.
3. Build quality verification.
4. Add escalation logic.
5. Integrate routing.
6. Dashboard: tier UI.
7. Tests: assignment, verification, escalation.

## 5. Files Touched

- `src/lib/tiers/` (new: model, assign, verify, escalate)
- `src/sse/handlers/chat.js` (tier integration)
- `open-sse/config/tierConfig.js` (new)
- Dashboard tiers page (new)
- `tests/unit/tiers.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Tier misassignment | Conservative defaults |
| Verification cost | Sample mode |
| Escalation loops | Escalation caps |
| Overpay | Cost gating |

## 7. Success Criteria

- Tiers assigned per task.
- Verification runs per mode.
- Escalation works with caps.
- Tier telemetry visible.

## 8. Related Plans

- Plan 75 (Quality Guardrails) — quality gates.
- Plan 83 (Feedback Selection) — quality feedback.
- Plan 87 (Cost Heuristics) — cost tiers.
- Plan 81 (Intent Classification) — tier input.