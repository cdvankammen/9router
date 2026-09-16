# Implementation Plan 15 — Goal Systems Integration — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #goals #goal-system #lifecycle #verification #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (imports, function signatures, `src/lib/db/` conventions, dashboard conventions, auth middleware).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — run the app, hit the endpoints, check the DB, confirm acceptance criteria.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-15-goal-systems-integration.md`, `../research/9router/32-goal-systems.md`

## Scope

**In scope:** goal model (id, objective, requirements, constraints, scope, status); subgoals; lifecycle (open → checkpoint → finish); verification with evidence; goals API + dashboard.
**Out of scope:** autonomous goal execution engine (agent-side); goal templates.

## Milestones

### M1 — Goal model + repo

**Reference code (`src/lib/db/repos/goalsRepo.js`):**

```js
import { getAdapter } from "@/lib/db/driver.js";

export const GOAL_STATUSES = ["draft", "active", "blocked", "complete", "cancelled"];

export async function createGoal({ objective, requirements = [], constraints = [], scope = [], sessionId }) {
  const db = await getAdapter();
  const id = crypto.randomUUID();
  await db.run(`
    INSERT INTO goals (id, objective, requirements, constraints, scope, status, session_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 'draft', ?, ?, ?)
  `, [id, objective, JSON.stringify(requirements), JSON.stringify(constraints), JSON.stringify(scope), sessionId, Date.now(), Date.now()]);
  return getGoal(id);
}

export async function getGoal(id) {
  const db = await getAdapter();
  const row = await db.get(`SELECT * FROM goals WHERE id = ?`, [id]);
  return row ? { ...row, requirements: JSON.parse(row.requirements), constraints: JSON.parse(row.constraints), scope: JSON.parse(row.scope) } : null;
}

export async function updateGoalStatus(id, status, { blockers = [], evidence = [] } = {}) {
  const db = await getAdapter();
  await db.run(`UPDATE goals SET status = ?, updated_at = ? WHERE id = ?`, [status, Date.now(), id]);
  if (evidence.length) {
    await db.run(`UPDATE goals SET evidence = ? WHERE id = ?`, [JSON.stringify(evidence), id]);
  }
  if (blockers.length) {
    await db.run(`UPDATE goals SET blockers = ? WHERE id = ?`, [JSON.stringify(blockers), id]);
  }
  return getGoal(id);
}
```

**Migration:** `goals` table (id PK, objective, requirements JSON, constraints JSON, scope JSON, status, session_id, evidence JSON, blockers JSON, created_at, updated_at); `goal_checkpoints` table (id, goal_id FK, note, done_so_far JSON, remaining JSON, created_at).

**Acceptance criteria:** CRUD works; statuses constrained; checkpoints recorded.

### M2 — Lifecycle service

**Reference code (`src/lib/goals/lifecycle.js`):**

```js
// Lifecycle: draft -> active -> (checkpoint)* -> complete | blocked | cancelled
export function canTransition(from, to) {
  const allowed = {
    draft: ["active", "cancelled"],
    active: ["blocked", "complete", "cancelled"],
    blocked: ["active", "cancelled"],
    complete: [],
    cancelled: [],
  };
  return allowed[from]?.includes(to) ?? false;
}

export async function checkpointGoal(goalId, { note, doneSoFar, remaining }) {
  const db = await getAdapter();
  await db.run(
    `INSERT INTO goal_checkpoints (id, goal_id, note, done_so_far, remaining, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
    [crypto.randomUUID(), goalId, note, JSON.stringify(doneSoFar), JSON.stringify(remaining), Date.now()]
  );
}

// Completion audit: complete only when requirements covered + evidence recorded + no remaining work.
export async function auditCompletion(goal) {
  const missing = goal.requirements.filter((r) => !goal.evidence?.some((e) => e.covers?.includes(r)));
  return {
    complete: missing.length === 0 && (goal.remaining?.length ?? 0) === 0,
    missingRequirements: missing,
    remainingWork: goal.remaining ?? [],
  };
}
```

**Acceptance criteria:** transitions enforced; checkpoints recorded; completion audit gates `complete`.

### M3 — Goals API + dashboard

**Reference code (`src/app/api/v1/goals/route.js`):**

```js
export async function GET() {
  const db = await getAdapter();
  const rows = await db.all(`SELECT * FROM goals ORDER BY updated_at DESC`);
  return Response.json({ goals: rows.map(parseGoal) });
}

export async function POST(req) {
  const body = await req.json();
  const goal = await createGoal(body);
  return Response.json({ goal }, { status: 201 });
}

export async function PATCH(req) {
  const { id, status, blockers, evidence } = await req.json();
  const goal = await updateGoalStatus(id, status, { blockers, evidence });
  return Response.json({ goal });
}
```

**Files touched:** dashboard goals page (list, create, status transitions, checkpoint timeline, evidence view).

**Acceptance criteria:** API CRUD; dashboard lifecycle UI; evidence display.

### M4 — Tests

**Files touched:** `tests/unit/goals.test.js` (new).

**Acceptance criteria:** model, lifecycle, API tests pass.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Evidence quality | Audit requires covers mapping |
| Status drift | Transition enforcement |
| Checkpoint growth | Retention + summary |

## Verification

- Unit: lifecycle transitions, audit, API
- Manual: create goal → checkpoint → complete with evidence
- Regression: `tests/__baseline__/verify-no-regression.mjs`