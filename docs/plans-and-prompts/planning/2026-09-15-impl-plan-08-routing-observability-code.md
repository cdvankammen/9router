# Implementation Plan 08 — Routing Observability & Telemetry — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #observability #telemetry #routing-decisions #tracing #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (imports, function signatures, `src/sse/handlers/chat.js` decision points, DB adapter, dashboard conventions).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — run the app, hit the endpoints, check the DB, confirm acceptance criteria.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-08-routing-observability.md`, `../research/9router/47-branch-9router-internal-threads.md`

## Scope

**In scope:** per-request routing decision recording (task type, scores, filters, winner, fallback chain); decision query API; dashboard (decisions, strategy comparison, model win rate, filter analysis, fallback analysis); request tracing.
**Out of scope:** full distributed tracing (OTel); PII in decisions (redact prompts, store hashes only).

## Milestones

### M1 — Decision recording

**Reference code (`src/lib/db/repos/routingDecisionRepo.js`):**

```js
import { getAdapter } from "@/lib/db/driver.js";

export async function recordRoutingDecision(decision) {
  const db = await getAdapter();
  await db.run(`
    INSERT INTO routing_decisions (
      request_id, timestamp, task_type, strategy, candidates, winner,
      filters_applied, fallback_chain, cost, latency, outcome, detail
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    decision.request_id, Date.now(), decision.task_type, decision.strategy,
    JSON.stringify(decision.candidates), decision.winner,
    JSON.stringify(decision.filters_applied), JSON.stringify(decision.fallback_chain),
    decision.cost, decision.latency, decision.outcome, JSON.stringify(decision.detail),
  ]);
}
```

**Migration:** `routing_decisions` table (request_id PK, timestamp, task_type, strategy, candidates JSON, winner, filters_applied JSON, fallback_chain JSON, cost, latency, outcome, detail JSON).

**Recording point (`src/sse/handlers/chat.js`):**

```js
// After routing decision, before execution:
await recordRoutingDecision({
  request_id, task_type, strategy,
  candidates: scoredCandidates, winner: selectedModel,
  filters_applied: appliedFilters, fallback_chain: [],
  cost: null, latency: null, outcome: "pending",
  detail: { scores, rationale },
});
```

**Acceptance criteria:** decision recorded per request; async (non-blocking); PII redacted (prompt hashes only).

### M2 — Decision query API

**Reference code (`src/app/api/v1/routing-decisions/route.js`):**

```js
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const { request_id, model, task_type, strategy, start, end } = Object.fromEntries(searchParams);
  const where = [];
  const params = [];
  if (request_id) { where.push("request_id = ?"); params.push(request_id); }
  if (model) { where.push("winner = ?"); params.push(model); }
  if (task_type) { where.push("task_type = ?"); params.push(task_type); }
  if (strategy) { where.push("strategy = ?"); params.push(strategy); }
  if (start) { where.push("timestamp >= ?"); params.push(Number(start)); }
  if (end) { where.push("timestamp <= ?"); params.push(Number(end)); }
  const sql = `SELECT * FROM routing_decisions ${where.length ? "WHERE " + where.join(" AND ") : ""} ORDER BY timestamp DESC LIMIT 100`;
  const rows = await db.all(sql, ...params);
  return Response.json({ decisions: rows });
}
```

**Aggregations:** strategy usage, model win rate, filter rejection rate.

**Acceptance criteria:** query by request_id/model/task_type/strategy/time; aggregations work.

### M3 — Dashboard + tracing + tests

**Files touched:**
- Dashboard: routing-decisions page (table + expandable rationale), strategy comparison, model win rate, filter analysis, fallback analysis
- `src/lib/db/repos/routingDecisionRepo.js` — request trace (full lifecycle: parse → classify → score → select → execute → fallback)
- `tests/unit/routing-decisions.test.js` (new)

**Acceptance criteria:** dashboard pages work; trace export (JSON per request); unit tests pass.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Storage growth | Retention policy; aggregation tables |
| Recording overhead | Async recording; batched writes |
| PII in decisions | Redact prompts; store hashes only |
| Dashboard complexity | Progressive disclosure; filters |

## Verification

- Unit: decision recording, query API, aggregations
- Manual: send requests → check decisions page → expand rationale
- Regression: `tests/__baseline__/verify-no-regression.mjs`