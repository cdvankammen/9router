# Implementation Plan 13 — Runtime Policy Enforcement — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #policy #enforcement #budget #latency #allow-deny #compliance #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (imports, function signatures, `src/sse/handlers/chat.js` enforcement points, settings shape, dashboard conventions).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — run the app, hit the endpoints, check the DB, confirm acceptance criteria.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-13-runtime-enforcement.md`, `../research/9router/30-policy-engine.md`

## Scope

**In scope:** declarative policy model (budget/latency/allow-deny/compliance; AND/OR/NOT); compiled evaluation (<1ms); enforcement points (pre/post/streaming); policy API + dashboard.
**Out of scope:** policy DSL compilation to native; distributed policy sync.

## Milestones

### M1 — Policy model + compiler

**Reference code (`src/lib/policy/model.js`):**

```js
// Policy: { id, name, enabled, conditions: [...], actions: [...], priority }
// Condition: { op: 'and'|'or'|'not', children } | { field, op: 'eq'|'neq'|'lt'|'lte'|'gt'|'gte'|'in'|'contains', value }
// Action: { type: 'allow'|'deny'|'redirect'|'transform'|'log', ... }
export function compilePolicy(policy) {
  const cond = compileCondition(policy.conditions);
  return (ctx) => cond(ctx);
}

function compileCondition(node) {
  if (!node) return () => true;
  switch (node.op) {
    case "and": {
      const children = node.children.map(compileCondition);
      return (ctx) => children.every((c) => c(ctx));
    }
    case "or": {
      const children = node.children.map(compileCondition);
      return (ctx) => children.some((c) => c(ctx));
    }
    case "not": {
      const child = compileCondition(node.children[0]);
      return (ctx) => !child(ctx);
    }
    default: {
      // leaf: { field, op, value }
      return (ctx) => evaluateLeaf(node, ctx);
    }
  }
}

function evaluateLeaf({ field, op, value }, ctx) {
  const actual = getPath(ctx, field);
  switch (op) {
    case "eq": return actual === value;
    case "neq": return actual !== value;
    case "lt": return actual < value;
    case "lte": return actual <= value;
    case "gt": return actual > value;
    case "gte": return actual >= value;
    case "in": return Array.isArray(value) && value.includes(actual);
    case "contains": return String(actual ?? "").includes(String(value));
    default: return false;
  }
}
```

**Acceptance criteria:** compiler produces closures; evaluation <1ms; nested AND/OR/NOT works.

### M2 — Enforcement points

**Reference code (`src/lib/policy/enforce.js`):**

```js
// Pre-request: budget/latency/allow-deny checks before execution.
export async function enforcePreRequest(ctx, policies) {
  for (const p of policies) {
    if (!p.enabled) continue;
    if (p.compile(ctx)) {
      const result = applyActions(p.actions, ctx, "pre");
      if (result.decision === "deny") return { decision: "deny", policy: p.id, reason: result.reason };
    }
  }
  return { decision: "allow" };
}

// Post-response: compliance checks (content policy, size limits).
export async function enforcePostResponse(ctx, policies) {
  // similar loop; can trigger 'transform' actions (redact, truncate)
}

// Streaming: per-chunk checks (token budget, content policy).
export async function enforceStreamChunk(chunk, ctx, policies) {
  // lightweight per-chunk checks; deny -> inject error chunk
}
```

**Wiring in `chat.js`:** pre-enforcement before routing; post-enforcement after response; streaming hook in SSE loop.

**Acceptance criteria:** all three enforcement points wired; deny returns client-safe error; transform actions applied.

### M3 — Policy API + dashboard

**Reference code (`src/app/api/v1/policies/route.js`):**

```js
export async function GET() {
  const policies = await getPolicies();
  return Response.json({ policies });
}

export async function POST(req) {
  const policy = await req.json();
  const compiled = compilePolicy(policy); // validate compiles
  await savePolicy(policy);
  return Response.json({ ok: true, id: policy.id });
}
```

**Files touched:** dashboard policies page (list, editor with condition builder, enable/disable, test-run with sample context).

**Acceptance criteria:** CRUD API; dashboard editor; test-run shows pass/fail per policy.

### M4 — Tests

**Files touched:** `tests/unit/policy-enforcement.test.js` (new).

**Acceptance criteria:** compiler, enforcement points, API tests pass.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Policy evaluation overhead | Compiled closures; <1ms budget |
| Streaming enforcement | Per-chunk cost | Only run cheap checks per chunk |
| Policy conflicts | Priority ordering; first-match |
| Budget tracking accuracy | usageDb integration |

## Verification

- Unit: compiler, enforcement, API
- Manual: create budget policy → exceed → verify deny
- Regression: `tests/__baseline__/verify-no-regression.mjs`