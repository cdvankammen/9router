# Implementation Plan 88 — Routing Rule Engine v2: Granularity & Evaluation — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #rule-engine #granularity #authorization #safety #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (rules engine from plan 27 research; governance from plan 71; RBAC from plan 38 research; privacy/safety from plan 35; selection in `src/sse/handlers/chat.js`).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — create rules at different scopes; confirm precedence + short-circuit; confirm authorization blocks.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-88-routing-rule-engine-v2.md`, `../research/9router/impl-plan-71-routing-governance-standards.md`, `../research/9router/impl-plan-27-rules-engine.md`.

## Scope

**In scope:** rule model (id, name, scope global/user/route/request/task, conditions AND/OR/NOT, actions select-model/set-combo/override-params, priority, mode enforce/soft, enabled); evaluation semantics (priority ordering, first-match-wins or merge, short-circuit, soft log-only, chaining); scope resolution (most-specific wins); authorization rules (model access per user/group) + safety signals (content checks, model constraints, admin override with audit); rule store (SQLite) + CRUD API + dashboard editor with dry-run + match telemetry.
**Out of scope:** learned rule generation (explicit rules only); distributed rule sync (plan 70).

## Milestones

### M1 — Rule model + store

**Reference code (`src/lib/rules/model.js` + migration):**

```js
export const RULE_SCOPES = ["global", "user", "route", "request", "task"];
export const RULE_MODES = ["enforce", "soft"];

export function makeRule({ id, name, scope = "global", scopeKey = null, conditions = [], actions = [], priority = 0, mode = "enforce", enabled = true }) {
  return { id, name, scope, scopeKey, conditions, actions, priority, mode, enabled };
}

export function validateRule(rule) {
  const issues = [];
  if (!RULE_SCOPES.includes(rule.scope)) issues.push({ field: "scope", message: "invalid scope" });
  if (!RULE_MODES.includes(rule.mode)) issues.push({ field: "mode", message: "invalid mode" });
  if (!Array.isArray(rule.conditions) || !rule.conditions.length) issues.push({ field: "conditions", message: "at least one condition required" });
  if (!Array.isArray(rule.actions) || !rule.actions.length) issues.push({ field: "actions", message: "at least one action required" });
  return issues;
}
```

```js
// src/lib/db/migrations/20260915-rules.js
export const up = (db) => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS routing_rules (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      scope TEXT NOT NULL,
      scope_key TEXT,
      conditions_json TEXT NOT NULL,
      actions_json TEXT NOT NULL,
      priority INTEGER NOT NULL DEFAULT 0,
      mode TEXT NOT NULL DEFAULT 'enforce',
      enabled INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL
    );
  `);
};
export const down = (db) => { db.exec("DROP TABLE IF EXISTS routing_rules"); };
```

**Acceptance criteria:** rules validated; persisted; scopes/modes constrained.

### M2 — Evaluation engine

**Reference code (`src/lib/rules/engine.js`):**

```js
// Condition evaluation: { field, op, value } with AND/OR/NOT groups.
export function evalCondition(cond, ctx) {
  const { field, op, value } = cond;
  const actual = ctx[field];
  switch (op) {
    case "eq": return actual === value;
    case "neq": return actual !== value;
    case "in": return Array.isArray(value) && value.includes(actual);
    case "gt": return actual > value;
    case "lt": return actual < value;
    case "exists": return actual != null;
    case "regex": return typeof actual === "string" && new RegExp(value).test(actual);
    default: return false;
  }
}

export function evalConditions(conditions, ctx) {
  // Top-level AND; nested { or: [...] } supported.
  return conditions.every((c) => c.or ? c.or.some((sub) => evalCondition(sub, ctx)) : evalCondition(c, ctx));
}

// Evaluate rules: priority order, short-circuit on first enforce match.
export function evaluateRules(rules, ctx, { shortCircuit = true } = {}) {
  const sorted = [...rules].filter((r) => r.enabled).sort((a, b) => b.priority - a.priority);
  const matched = [];
  for (const rule of sorted) {
    if (!evalConditions(rule.conditions, ctx)) continue;
    matched.push(rule);
    if (shortCircuit && rule.mode === "enforce") break;
  }
  return matched;
}

// Merge actions from matched rules (first-match-wins per action type).
export function mergeActions(matched) {
  const out = {};
  for (const rule of matched) for (const action of rule.actions) {
    if (out[action.type] == null) out[action.type] = action.value;
  }
  return out;
}
```

**Acceptance criteria:** conditions evaluated; priority + short-circuit; actions merged.

### M3 — Scope resolution + authorization

**Reference code (`src/lib/rules/scopes.js` + `authz.js`):**

```js
// Scope resolution: most-specific scope wins for conflicting rules.
export const SCOPE_ORDER = ["global", "user", "route", "task", "request"];

export function resolveScope(rules, ctx) {
  const applicable = rules.filter((r) => {
    if (r.scope === "global") return true;
    if (r.scope === "user") return r.scopeKey === ctx.userId;
    if (r.scope === "route") return r.scopeKey === ctx.route;
    if (r.scope === "task") return r.scopeKey === ctx.taskType;
    if (r.scope === "request") return r.scopeKey === ctx.requestId;
    return false;
  });
  // Most specific first.
  return applicable.sort((a, b) => SCOPE_ORDER.indexOf(b.scope) - SCOPE_ORDER.indexOf(a.scope));
}
```

```js
// Authorization: restrict model access per user/group.
export function authorizeModel({ userId, groups = [], model, allowedByUser, allowedByGroup, deniedModels = [] }) {
  if (deniedModels.includes(model)) return { ok: false, reason: "denied" };
  if (allowedByUser?.[userId]?.includes(model)) return { ok: true };
  if (groups.some((g) => allowedByGroup?.[g]?.includes(model))) return { ok: true };
  return { ok: false, reason: "not-allowed" };
}

// Safety override: admin override with audit log.
export function safetyOverride({ admin, ruleId, action }) {
  return { ok: Boolean(admin), audit: { at: new Date().toISOString(), admin, ruleId, action } };
}
```

**Acceptance criteria:** most-specific scope wins; authorization enforced; override audited.

### M4 — API + integration + tests

**Reference code (`src/app/api/v1/rules/route.js`):**

```js
import { getAdapter } from "@/lib/db/driver.js";
import { validateRule } from "@/lib/rules/model.js";

export async function GET() {
  const db = getAdapter();
  return Response.json({ rules: db.all("SELECT * FROM routing_rules ORDER BY priority DESC") });
}

export async function POST(req) {
  const db = getAdapter();
  const body = await req.json();
  const issues = validateRule(body);
  if (issues.length) return Response.json({ error: "invalid rule", issues }, { status: 400 });
  db.run(`INSERT INTO routing_rules (id, name, scope, scope_key, conditions_json, actions_json, priority, mode, enabled, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET name = excluded.name, scope = excluded.scope, scope_key = excluded.scope_key,
            conditions_json = excluded.conditions_json, actions_json = excluded.actions_json, priority = excluded.priority,
            mode = excluded.mode, enabled = excluded.enabled, updated_at = excluded.updated_at`,
    [body.id, body.name, body.scope, body.scopeKey ?? null, JSON.stringify(body.conditions), JSON.stringify(body.actions),
     body.priority ?? 0, body.mode ?? "enforce", body.enabled ? 1 : 0, new Date().toISOString()]);
  return Response.json({ ok: true });
}
```

**Files touched:** `src/lib/rules/` (new: model, engine, scopes, authz, safety), `src/app/api/v1/rules/route.js` (new), `src/sse/handlers/chat.js` (engine integration), `src/lib/db/migrations/20260915-rules.js` (new), `src/lib/db/repos/ruleRepo.js` (new), dashboard rules page (new), `tests/unit/rules.test.js` (new).

**Acceptance criteria:** rules evaluated in selection; authorization enforced; CRUD works; dry-run available.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Rule conflicts | Ambiguous routing | Deterministic priority + scope order |
| Rule explosion | Unmaintainable | Scoping + validation |
| Authorization bypass | Unauthorized access | Enforce at gateway + API |
| Safety false positives | Blocked legit traffic | Configurable thresholds + override |

## Verification

- Unit: evalConditions, evaluateRules, mergeActions, resolveScope, authorizeModel
- Manual: conflicting rules → priority wins; denied model → blocked; dry-run shows matches
- Regression: `tests/__baseline__/verify-no-regression.mjs`