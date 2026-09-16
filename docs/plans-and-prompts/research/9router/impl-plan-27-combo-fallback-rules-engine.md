---
Date: 2026-09-16
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, combos, fallback-rules, decision-points, rule-engine
---

# Implementation Plan 27 — Combo & Fallback Rules Engine

> Written after the binary-tree research expansion (see `39-binary-tree-expansion-master-plan.md`, `47-branch-9router-internal-threads.md` — `16-decision-points.md`).
> This plan covers the "combo/fallback rules" option: a full rules engine for model combos and fallback chains.

## 1. Goal

Build a complete rules engine for model combos and fallback chains: declarative rule definitions, rule evaluation, rule testing, and rule analytics — replacing ad-hoc combo logic with a configurable engine.

## 2. Background (from research)

- **9Router current state**: combo expansion + account-selection loop in `src/sse/handlers/chat.js`; combo/fallback rules UI exists.
- **Research findings** (16-decision-points): routing decisions happen at multiple points; rules should be declarative and testable; decision points should be auditable.

## 3. Design

### 3.1 Rule Model

- **Rule structure**: conditions (task type, model, cost, latency, quota) → actions (select, fallback, skip, transform).
- **Rule types**: combo rules (ordered model lists), fallback rules (error → next), conditional rules (if condition).
- **Rule precedence**: ordered evaluation; first-match wins.

### 3.2 Rule Evaluation

- **Evaluation engine**: fast condition evaluation (compiled).
- **Context**: request context (task type, messages, params, user, quota).
- **Evaluation trace**: which rules matched, why.

### 3.3 Rule Testing

- **Test harness**: test rules against sample requests.
- **Simulation**: simulate rule behavior with historical traffic.
- **Rule coverage**: which rules fire, how often.

### 3.4 Rule Analytics

- **Rule usage**: fires per rule, outcomes.
- **Rule effectiveness**: fallback success rates.
- **Rule conflicts**: overlapping rules flagged.

## 4. Implementation Steps

1. Define rule model + schema.
2. Build evaluation engine.
3. Integrate with chat.js (replace ad-hoc logic).
4. Build rule testing.
5. Add rule analytics.
6. Tests: rule evaluation, precedence, testing.

## 5. Files Touched

- `src/lib/rules/` (new: model, engine, testing)
- `src/sse/handlers/chat.js` (integration)
- `src/app/api/v1/rules/route.js` (new)
- Dashboard rules page (extend)
- `tests/unit/rules-engine.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Engine complexity | Simple model; incremental |
| Rule conflicts | Precedence + conflict detection |
| Migration churn | Backward-compatible rules |
| Evaluation latency | Compiled conditions |

## 7. Success Criteria

- Rules declarative + testable.
- Evaluation trace available.
- Ad-hoc combo logic replaced.
- Rule analytics visible.

## 8. Related Plans
- Plan 2 (Cascade Enhancements) — fallback synergy.
- Plan 13 (Runtime Enforcement) — policy synergy.
- Plan 8 (Observability) — decision telemetry.