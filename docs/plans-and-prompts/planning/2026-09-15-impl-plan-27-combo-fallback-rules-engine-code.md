# Implementation Plan 27 — Combo & Fallback Rules Engine — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #rules-engine #combo-rules #fallback-rules #conditional-rules #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (imports, function signatures, `src/sse/handlers/chat.js` combo expansion, `src/lib/db/repos/combosRepo.js`, existing fallback-rules-ux-plan, dashboard rules page).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — run the app, hit the endpoints, confirm acceptance criteria.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-27-combo-fallback-rules-engine.md`, `../research/9router/42-rules-engine.md`
>
> **Note on overlap:** `fallback-rules-ux-plan.md` covers the *UX* for fallback rules. This plan covers the *declarative rules engine* (model, compiler, evaluation, analytics). They compose.

## Scope

**In scope:** declarative rule model (conditions: task type/model/cost/latency/quota → actions: select/fallback/skip/transform; combo rules, fallback rules, conditional rules; ordered first-match precedence); compiled evaluation with trace; rule testing harness + simulation; rule analytics (fires, outcomes, conflicts).
**Out of scope:** natural-language rule authoring; distributed rule sync.

## Milestones

### M1 — Rule model + compiler

**Reference code (`src/lib/rules/model.js`):**

```js
// Rule: { id, name, type: 'combo'|'fallback'|'conditional', enabled, priority, conditions, actions }
// Condition: { field, op, value } | { op: 'and'|'or'|'not', children }
// Action: { type: 'select'|'fallback'|'skip'|'transform', ... }
export function compileRule(rule) {
  const cond = compileCondition(rule.conditions);
  return (ctx) => cond(ctx);
}

function compileCondition(node) {
  if (!node) return () => true;
  if (node.op === "and") {
    const children = node.children.map(compileCondition);
    return (ctx) => children.every((c) => c(ctx));
  }
  if (node.op === "or") {
    const children = node.children.map(compileCondition);
    return (ctx) => children.some((c) => c(ctx));
  }
  if (node.op === "not") {
    const child = compileCondition(node.children[0]);
    return (ctx) => !child(ctx);
  }
  // Leaf: { field, op, value }
  return (ctx) => {
    const actual = getPath(ctx, node.field);
    switch (node.op) {
      case "eq": return actual === node.value;
      case "neq": return actual !== node.value;
      case "lt": return actual < node.value;
      case "lte": return actual <= node.value;
      case "gt": return actual > node.value;
      case "gte": return actual >= node.value;
      case "in": return Array.isArray(node.value) && node.value.includes(actual);
      case "matches": return new RegExp(node.value).test(String(actual ?? ""));
      default: return false;
    }
  };
}

// Evaluation with trace: record which rules fired and why.
export function evaluateRules(rules, ctx) {
  const trace = [];
  for (const rule of rules) {
    if (!rule.enabled) continue;
    const matched = rule.compile(ctx);
    trace.push({ ruleId: rule.id, name: rule.name, matched, priority: rule.priority });
    if (matched) {
      return { action: rule.actions, trace, rule };
    }
  }
  return { action: null, trace };
}
```

**Acceptance criteria:** compiler works; first-match precedence; trace recorded.

### M2 — Rule types

**Reference code (`src/lib/rules/actions.js`):**

```js
// Combo rule: select a combo when conditions match.
export function applyComboRule(action, ctx) {
  return { type: "combo", comboId: action.comboId, models: action.models, strategy: action.strategy };
}

// Fallback rule: override fallback chain.
export function applyFallbackRule(action, ctx) {
  return { type: "fallback", chain: action.chain, maxFallbacks: action.maxFallbacks };
}

// Skip rule: skip a model/provider.
export function applySkipRule(action, ctx) {
  return { type: "skip", target: action.target, reason: action.reason };
}

// Transform rule: modify request (e.g., force temperature, add system prompt).
export function applyTransformRule(action, ctx) {
  return { type: "transform", changes: action.changes };
}
```

**Acceptance criteria:** all four action types applied; wired into chat.js combo expansion.

### M3 — Testing harness + simulation

**Reference code (`src/lib/rules/simulate.js`):**

```js
// Simulate rules against historical requests (from usageDb).
export async function simulateRules(rules, { sampleSize = 1000 } = {}) {
  const requests = await sampleRequests(sampleSize);
  const outcomes = [];
  for (const req of requests) {
    const ctx = buildContext(req);
    const { action, trace } = evaluateRules(rules, ctx);
    outcomes.push({ requestId: req.id, action, trace, wouldChange: action !== null });
  }
  return {
    wouldChangeRate: outcomes.filter((o) => o.wouldChange).length / outcomes.length,
    outcomes,
  };
}

// Rule testing harness: assert rule behavior with synthetic contexts.
export function testRule(rule, contexts, { expectAction = true } = {}) {
  const compiled = compileRule(rule);
  return contexts.map((ctx) => ({
    ctx,
    matched: compiled(ctx),
    expected: expectAction,
    pass: compiled(ctx) === expectAction,
  }));
}
```

**Acceptance criteria:** simulation reports would-change rate; harness asserts behavior.

### M4 — Analytics + API + tests

**Reference code (`src/lib/db/repos/ruleAnalyticsRepo.js`):**

```js
export async function recordRuleFire({ ruleId, outcome, requestId }) {
  const db = await getAdapter();
  await db.run(`
    INSERT INTO rule_analytics (id, rule_id, outcome, request_id, timestamp)
    VALUES (?, ?, ?, ?, ?)
  `, [crypto.randomUUID(), ruleId, outcome, requestId, Date.now()]);
}

export async function ruleStats(ruleId) {
  const db = await getAdapter();
  const row = await db.get(`
    SELECT COUNT(*) as fires, SUM(outcome = 'success') as successes,
           SUM(outcome = 'fallback') as fallbacks, SUM(outcome = 'error') as errors
    FROM rule_analytics WHERE rule_id = ?
  `, [ruleId]);
  return row;
}
```

**Files touched:** `src/app/api/v1/rules/route.js` (CRUD + simulate), dashboard rules page (editor, test-run, analytics), `tests/unit/rules-engine.test.js` (new).

**Acceptance criteria:** analytics recorded; API + dashboard; tests pass.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Rule conflicts | Priority ordering + conflict detection |
| Simulation accuracy | Sample size + recency |
| Rule explosion | Analytics prune unused |

## Verification

- Unit: compiler, actions, harness, analytics
- Manual: create rule → simulate → verify fires in analytics
- Regression: `tests/__baseline__/verify-no-regression.mjs`