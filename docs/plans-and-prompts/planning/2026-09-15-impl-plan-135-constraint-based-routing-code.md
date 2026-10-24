# Implementation Plan 135 — Constraint-Based Routing with Hard Requirements — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #constraints #hard-requirements #compliance #rules #allowlist #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (runtime enforcement from plan 13; task classification from plan 56; rule engine from plan 88 (`src/lib/rules/`); safety guardrails from plan 109 (`src/lib/safety/`); pre-routing filter in `open-sse/handlers/chatCore.js`).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — constraints; rule engine; compliance audit.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-135-constraint-based-routing.md`, `../research/9router/impl-plan-88-rule-engine-v2.md`, `../research/9router/impl-plan-109-safety-signals-guardrails.md`.

## Scope

**In scope:** constraint model (types data-residency/latency/cost/model-allowlist/capability, must-all vs any-of evaluation, scope per-request/user/org); rule engine (declarative rules, fast filtering, precedence, conflict resolution); compliance (evaluation audit, reports, admin override with audit); pre-routing filter + dashboard compliance view.
**Out of scope:** rule engine internals (plan 88); safety guardrails (plan 109).

## Milestones

### M1 — Constraint model

**Reference code (`src/lib/constraints/model.js`):**

```js
// Constraint types.
export const CONSTRAINT_TYPES = ["data-residency", "latency", "cost", "model-allowlist", "capability"];

// Constraint: type + predicate + scope.
export function makeConstraint({ id, type, scope = "request", mode = "must-all", check = null } = {}) {
  if (!CONSTRAINT_TYPES.includes(type)) throw new Error(`invalid constraint type: ${type}`);
  return { id, type, scope, mode, check };
}

// Evaluation: must-all vs any-of.
export function evaluateConstraints(constraints, ctx) {
  const results = constraints.map((c) => ({ constraint: c, pass: c.check ? Boolean(c.check(ctx)) : true }));
  const mustAll = results.filter((r) => r.constraint.mode === "must-all");
  const anyOf = results.filter((r) => r.constraint.mode === "any-of");
  const mustAllOk = mustAll.every((r) => r.pass);
  const anyOfOk = anyOf.length === 0 || anyOf.some((r) => r.pass);
  return { ok: mustAllOk && anyOfOk, results };
}
```

**Acceptance criteria:** types; scopes; must-all/any-of.

### M2 — Rule engine

**Reference code (`src/lib/constraints/rules.js`):**

```js
// Rule definition: declarative constraint rules.
export function makeRule({ id, priority = 0, when = null, then = null } = {}) {
  return { id, priority, when, then };
}

// Rule evaluation: fast constraint filtering.
export function evaluateRules(rules, ctx) {
  const sorted = [...rules].sort((a, b) => b.priority - a.priority);
  for (const rule of sorted) {
    if (rule.when && !rule.when(ctx)) continue;
    return { rule, action: rule.then?.(ctx) ?? "allow" };
  }
  return { rule: null, action: "allow" };
}

// Rule precedence: priority ordering.
export function precedence(rules) {
  return [...rules].sort((a, b) => b.priority - a.priority);
}

// Conflict resolution: first-match wins by priority.
export function resolveConflict(rules, ctx) {
  const matched = rules.filter((r) => !r.when || r.when(ctx));
  if (!matched.length) return { action: "allow" };
  return { action: matched.sort((a, b) => b.priority - a.priority)[0].then?.(ctx) ?? "allow" };
}
```

**Acceptance criteria:** declarative rules; fast filtering; precedence; conflicts.

### M3 — Compliance

**Reference code (`src/lib/constraints/audit.js`):**

```js
// Audit: constraint evaluation audit.
export function auditEntry({ requestId, constraints, result, at = Date.now() } = {}) {
  return { requestId, constraints: constraints.map((c) => c.id), ok: result.ok, at };
}

// Reporting: compliance reports.
export function complianceReport(audits) {
  const total = audits.length;
  const passed = audits.filter((a) => a.ok).length;
  return { total, passed, complianceRate: total ? passed / total : 1 };
}

// Override: admin override with audit.
export function adminOverride({ requestId, constraintId, admin, reason, at = Date.now() } = {}) {
  return { requestId, constraintId, admin, reason, overridden: true, at };
}
```

**Acceptance criteria:** audit; reports; override.

### M4 — Integration + tests

**Reference code (`src/lib/constraints/integrate.js`):**

```js
// Pre-routing filter: constraints before provider selection.
export function filterModels({ constraints, ctx, candidates } = {}) {
  const { ok, results } = evaluateConstraints(constraints, ctx);
  if (!ok) return { ok: false, failed: results.filter((r) => !r.pass).map((r) => r.constraint.id), candidates: [] };
  return { ok: true, candidates };
}

// Telemetry: compliance view.
export function makeConstraintTelemetry() {
  const events = [];
  return {
    record(evt) { events.push({ ...evt, at: Date.now() }); },
    report() {
      return {
        evaluated: events.length,
        blocked: events.filter((e) => !e.ok).length,
        overrides: events.filter((e) => e.overridden).length,
        byType: events.reduce((acc, e) => { for (const t of e.types ?? []) acc[t] = (acc[t] ?? 0) + 1; return acc; }, {}),
      };
    },
  };
}
```

**Files touched:** `src/lib/constraints/` (new: model, rules, audit, integrate), `open-sse/handlers/chatCore.js` (pre-routing filter), dashboard compliance page (new), `tests/unit/constraints.test.js` (new).

**Acceptance criteria:** pre-routing; telemetry; tests.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Rule conflicts | Wrong enforcement | Conflict resolution |
| Performance | Slow routing | Fast filtering |
| Override abuse | Compliance gaps | Audit logging |
| Rule maintenance | Stale rules | Declarative rules |

## Verification

- Unit: makeConstraint, evaluateConstraints, makeRule, evaluateRules, resolveConflict, filterModels
- Manual: data-residency constraint blocks non-compliant provider; override logged
- Regression: `tests/__baseline__/verify-no-regression.mjs`