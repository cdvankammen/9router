# Implementation Plan 18 — Model Serving Policy — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #serving-policy #quotas #priorities #deployment-rules #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (imports, function signatures, `src/lib/db/repos/` conventions, `src/sse/handlers/chat.js` routing, dashboard conventions).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — run the app, hit the endpoints, check the DB, confirm acceptance criteria.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-18-model-serving-policy.md`, `../research/9router/34-serving-policy.md`

## Scope

**In scope:** quotas (requests/tokens/cost per scope: key/user/global); priorities (critical/normal/best-effort); deployment rules (model→route mapping, availability windows, deprecation); serving policy API + dashboard.
**Out of scope:** billing integration; multi-tenant isolation (plan 21).

## Milestones

### M1 — Quota model

**Reference code (`src/lib/serving/quota.js`):**

```js
// Quota: { scope: 'key'|'user'|'global', subject, limits: { requests, tokens, cost }, windowMs }
export class QuotaTracker {
  constructor(db) {
    this.db = db;
  }

  async checkQuota({ scope, subject, limits, windowMs = 86_400_000 }) {
    const since = Date.now() - windowMs;
    const row = await this.db.get(`
      SELECT COUNT(*) as requests, SUM(tokens) as tokens, SUM(cost_usd) as cost
      FROM usage_history WHERE scope = ? AND subject = ? AND timestamp >= ?
    `, [scope, subject, since]);
    const usage = row ?? { requests: 0, tokens: 0, cost: 0 };
    return {
      allowed: usage.requests < limits.requests && usage.tokens < limits.tokens && usage.cost < limits.cost,
      usage,
      limits,
    };
  }

  async consume({ scope, subject, tokens, costUsd }) {
    await this.db.run(`
      INSERT INTO usage_history (scope, subject, tokens, cost_usd, timestamp)
      VALUES (?, ?, ?, ?, ?)
    `, [scope, subject, tokens, costUsd, Date.now()]);
  }
}
```

**Acceptance criteria:** per-scope quota checks; consumption recorded; windowed.

### M2 — Priorities

**Reference code (`src/lib/serving/priority.js`):**

```js
// Priorities: critical (always served, bypass quota), normal (quota-gated), best-effort (only when idle).
export const PRIORITIES = ["critical", "normal", "best-effort"];

export function priorityOf(request) {
  return request.priority ?? "normal";
}

export function canServe(request, { quotaResult, load }) {
  const p = priorityOf(request);
  if (p === "critical") return true;
  if (p === "best-effort") return load < 0.7; // only when under 70% load
  return quotaResult.allowed;
}
```

**Acceptance criteria:** priority classification; critical bypasses quota; best-effort gated by load.

### M3 — Deployment rules

**Reference code (`src/lib/serving/deployment.js`):**

```js
// Deployment rule: { model, route, availability: { start, end }, deprecated, replacement }
export function resolveDeployment(model, rules, now = new Date()) {
  const rule = rules.find((r) => r.model === model);
  if (!rule) return { model, route: null, deprecated: false };
  if (rule.deprecated) return { model, route: null, deprecated: true, replacement: rule.replacement };
  const hour = now.getHours();
  const inWindow = hour >= rule.availability.start && hour < rule.availability.end;
  return { model, route: inWindow ? rule.route : null, deprecated: false, outOfWindow: !inWindow };
}

// Deprecation: warn on use, redirect to replacement after grace period.
export function deprecationStatus(model, rules) {
  const rule = rules.find((r) => r.model === model);
  return rule?.deprecated ? { deprecated: true, replacement: rule.replacement, graceUntil: rule.graceUntil } : { deprecated: false };
}
```

**Acceptance criteria:** model→route mapping; availability windows; deprecation with replacement.

### M4 — API + dashboard + tests

**Reference code (`src/app/api/v1/serving-policies/route.js`):**

```js
export async function GET() {
  const policies = await getServingPolicies();
  return Response.json({ policies });
}

export async function POST(req) {
  const policy = await req.json();
  await saveServingPolicy(policy);
  return Response.json({ ok: true, id: policy.id });
}
```

**Files touched:** dashboard serving page (quota view, priority config, deployment rules); `tests/unit/serving-policy.test.js` (new).

**Acceptance criteria:** API CRUD; dashboard; tests pass.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Quota accuracy | usage_history integration |
| Priority abuse | Critical requires auth |
| Deprecation breakage | Grace period + warnings |

## Verification

- Unit: quota, priority, deployment rules
- Manual: set quota → exceed → verify denial
- Regression: `tests/__baseline__/verify-no-regression.mjs`