---
Date: 2026-09-16
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, route-granularity, rule-evaluation, rule-based-vs-learned, authorization-rules, safety-signals
---

# Implementation Plan 88 — Routing Rule Engine v2: Granularity & Evaluation

> Mined from branch docs: `41-branch-learned-routing.md` (rule-based vs learned, rule evaluation, route granularity, authorization rules, safety signals) and `42-branch-cascades-and-fallbacks.md` (rule evaluation).

## 1. Goal

Upgrade 9Router's routing rules into a full rule engine v2: fine-grained route granularity (per-request, per-user, per-route, per-task), rule evaluation semantics (priority, conflict resolution, short-circuit), authorization rules, and safety signals — so routing rules are expressive, predictable, and safe.

## 2. Background (from research)

- **9Router current state**: basic combo rules; no rule engine semantics.
- **Research findings** (41-branch):
  - Rule-based vs learned: rules are transparent; learned is adaptive — combine both.
  - Rule evaluation: priority, conflict resolution, short-circuit semantics.
  - Route granularity: per-request, per-user, per-route, per-task granularity.
  - Authorization rules: who can route where.
  - Safety signals: content safety, model safety constraints.

## 3. Design

### 3.1 Rule Model

```
Rule = {
  id, name,
  scope: 'global'|'user'|'route'|'request'|'task',
  conditions: [Condition],   // AND/OR/NOT
  actions: [Action],         // select model, set combo, override params
  priority: number,
  mode: 'enforce'|'soft',
  enabled: bool
}
```

### 3.2 Evaluation Semantics

- **Priority ordering**: higher priority first.
- **Conflict resolution**: first-match-wins (default) or merge actions.
- **Short-circuit**: stop at first matching enforce rule.
- **Soft rules**: log-only, no enforcement.
- **Rule chaining**: rules can trigger other rules.

### 3.3 Granularity

- **Per-request**: request attributes (headers, params, content).
- **Per-user**: user profile, group, tier.
- **Per-route**: route config.
- **Per-task**: taxonomy-based.
- **Precedence**: most-specific scope wins.

### 3.4 Authorization & Safety

- **Authorization rules**: restrict model access per user/group.
- **Safety signals**: content-safety checks (input/output), model safety constraints.
- **Safety override**: admin override with audit log.

### 3.5 Integration

- **Rule store**: SQLite-backed.
- **Rule API**: CRUD endpoints.
- **Dashboard**: rule editor with dry-run.
- **Observability**: rule match telemetry.

## 4. Implementation Steps

1. Define rule model (`src/lib/rules/`).
2. Build evaluation engine (priority, conflict, short-circuit).
3. Add scope resolution.
4. Add authorization rules.
5. Add safety signals.
6. Build rule CRUD API.
7. Dashboard: rule editor.
8. Tests: evaluation semantics, scopes, authorization.

## 5. Files Touched

- `src/lib/rules/` (new: model, engine, scopes, authz, safety)
- `src/app/api/v1/rules/` (new CRUD)
- `src/sse/handlers/chat.js` (engine integration)
- `src/lib/db/repos/ruleRepo.js` (new)
- Dashboard rules page (new)
- `tests/unit/rules.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Rule conflicts | Deterministic priority |
| Rule explosion | Scoping + validation |
| Authorization bypass | Enforce at gateway + API |
| Safety false positives | Configurable thresholds |

## 7. Success Criteria

- Rules evaluated with defined semantics.
- Scopes resolved correctly.
- Authorization enforced.
- Safety signals active.
- Rule editor functional.

## 8. Related Plans

- Plan 27 (Rules Engine) — foundational rules.
- Plan 71 (Governance) — rule governance.
- Plan 38 (RBAC) — authorization.
- Plan 35 (Privacy/Compliance) — safety signals.