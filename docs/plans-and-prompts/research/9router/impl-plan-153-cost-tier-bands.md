---
Date: 2026-09-16
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, cost-tier-bands, cost-bands, pricing-tiers, cost-classification
---

# Implementation Plan 153 — Cost Tier Bands & Classification

> Mined from branch docs: `44-branch-gateways-and-serving.md` (Level 3: BAB — Cost Tier Bands).

## 1. Goal

Implement cost tier bands for 9Router: classify models into cost bands (free, cheap, medium, expensive), route within bands, and enforce band budgets — making cost control explicit and predictable.

## 2. Background (from research)

- **9Router current state**: Cost tracking exists (plan 45); bands implicit.
- **Research findings** (44-branch):
  - Cost tier bands (BAB): model cost classification.
  - Market-driven routing (BA): cost-driven routing.
  - Strategy selection (AAA-A): per-band strategies.

## 3. Design

### 3.1 Band Model

- **Band definitions**: free/cheap/medium/expensive.
- **Band assignment**: per-model band.
- **Band pricing**: band price ranges.

### 3.2 Band Routing

- **Band routing**: route within band.
- **Band escalation**: escalate across bands.
- **Band budgets**: per-band budgets.

### 3.3 Band Management

- **Band updates**: pricing changes.
- **Band validation**: assignment validation.
- **Band reporting**: band usage reports.

### 3.4 Integration

- **Routing integration**: band-aware routing.
- **Observability**: band metrics.
- **Dashboard**: band view.

## 4. Implementation Steps

1. Build band model.
2. Add band assignment.
3. Add band routing.
4. Add band budgets.
5. Dashboard: band view.
6. Tests: bands, routing, budgets.

## 5. Files Touched

- `src/lib/bands/` (new: model, assign, route)
- `open-sse/config/providerModels.js` (band config)
- Dashboard bands page (new)
- `tests/unit/bands.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Band drift | Validation |
| Budget overrun | Enforcement |
| Pricing changes | Updates |
| Complexity | Simple bands |

## 7. Success Criteria

- Bands defined.
- Routing band-aware.
- Budgets enforced.
- Reports generated.

## 8. Related Plans

- Plan 45 (Cost Tracking) — cost foundations.
- Plan 97 (Quality Tiers) — quality tiers.
- Plan 87 (Cost Heuristics) — cost estimation.
- Plan 110 (Cost Quality Modeling) — modeling.