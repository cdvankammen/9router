# Implementation Plan 47 — Audit Log & Traceability — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #audit-log #traceability #compliance #append-only #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (`src/lib/usageDb.js` request logging; `src/lib/db/repos/auditRepo.js` if it exists (plan 38 added audit.js — check for overlap); `src/sse/handlers/chat.js` request lifecycle for traceability hooks; `src/lib/events/bus.js` from plan 37 for critical-event alerts).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — fire events, confirm append-only, trace a request end-to-end, run audit queries.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-47-audit-log-traceability.md`, `../research/9router/impl-plan-38-multiuser-rbac.md`, `../research/9router/impl-plan-35-privacy.md`.

## Scope

**In scope:** audit event schema (timestamp, actor, action, target, result, metadata, severity); append-only audit store with hash-chain tamper evidence; request traceability (request_id → routing decision → execution → outcome); query API (filter by actor/action/time/severity); export; critical-event alerts via event bus.
**Out of scope:** external SIEM integration; legal hold.

## Milestones

### M1 — Audit event schema + append-only store

**Reference code (migration `src/lib/db/migrations/20260915-audit.js` + repo):**

```js
export const up = (db) => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS audit_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ts TEXT NOT NULL,
      actor TEXT,
      category TEXT NOT NULL,        -- auth | config | routing | credentials | security | admin
      action TEXT NOT NULL,
      target TEXT,
      result TEXT NOT NULL,          -- success | failure | denied
      severity TEXT NOT NULL DEFAULT 'info',  -- info | warning | critical
      request_id TEXT,
      metadata_json TEXT,
      prev_hash TEXT,
      hash TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_audit_ts ON audit_events (ts);
    CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_events (actor);
    CREATE INDEX IF NOT EXISTS idx_audit_request ON audit_events (request_id);
  `);
};
export const down = (db) => { db.exec("DROP TABLE IF EXISTS audit_events"); };
```

```js
// src/lib/audit/store.js — append-only with hash chain.
import { createHash } from "node:crypto";

let lastHash = null;

export function auditHash(payload) {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

export async function logAudit(db, event) {
  const payload = {
    ts: event.ts ?? new Date().toISOString(),
    actor: event.actor ?? null,
    category: event.category,
    action: event.action,
    target: event.target ?? null,
    result: event.result ?? "success",
    severity: event.severity ?? "info",
    request_id: event.request_id ?? null,
    metadata: event.metadata ?? null,
  };
  const prev = lastHash ?? db.get("SELECT hash FROM audit_events ORDER BY id DESC LIMIT 1")?.hash ?? null;
  const hash = auditHash({ ...payload, prev_hash: prev });
  lastHash = hash;
  db.run(`INSERT INTO audit_events (ts, actor, category, action, target, result, severity, request_id, metadata_json, prev_hash, hash)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [payload.ts, payload.actor, payload.category, payload.action, payload.target, payload.result,
     payload.severity, payload.request_id, payload.metadata ? JSON.stringify(payload.metadata) : null, prev, hash]);
  return hash;
}

// Tamper check: recompute chain, report first mismatch.
export function verifyChain(db) {
  const rows = db.all("SELECT id, prev_hash, hash FROM audit_events ORDER BY id");
  let prev = null;
  for (const row of rows) {
    const recomputed = auditHash({ ...JSON.parse(db.get("SELECT metadata_json, ts, actor, category, action, target, result, severity, request_id FROM audit_events WHERE id = ?", [row.id]).metadata_json ?? "null"), prev_hash: prev });
    // NOTE: recompute must use the exact original payload — store payload_json for fidelity.
    if (recomputed !== row.hash) return { ok: false, firstBadId: row.id };
    prev = row.hash;
  }
  return { ok: true, count: rows.length };
}
```

**Acceptance criteria:** events append-only (no UPDATE/DELETE paths); hash chain verifiable; indexes on hot filters.

### M2 — Traceability

**Reference code (`src/lib/audit/trace.js`):**

```js
// Full trace for a request: every audit event sharing request_id, in order.
export async function getTrace(db, requestId) {
  return db.all(`SELECT ts, actor, category, action, target, result, severity, metadata_json
                 FROM audit_events WHERE request_id = ? ORDER BY id`, [requestId]);
}

// Instrumentation points (call sites in chat.js / chatCore.js):
// 1. request.received   — actor, target: model, metadata: { combo, provider }
// 2. routing.decision   — metadata: { selectedProvider, fallbackChain }
// 3. execution.started  — metadata: { provider, model }
// 4. execution.completed— result: success|failure, metadata: { latencyMs, tokens }
// 5. execution.failed   — result: failure, severity: warning, metadata: { error }
```

**Acceptance criteria:** every request produces a complete ordered trace; trace view in dashboard.

### M3 — Audit query API + export

**Reference code (`src/app/api/v1/audit/route.js`):**

```js
import { getAdapter } from "@/lib/db/driver.js";

export async function GET(req) {
  const db = getAdapter();
  const url = new URL(req.url);
  const { actor, category, action, severity, from, to, limit = 100 } = Object.fromEntries(url.searchParams);
  const where = [];
  const params = [];
  if (actor) { where.push("actor = ?"); params.push(actor); }
  if (category) { where.push("category = ?"); params.push(category); }
  if (action) { where.push("action = ?"); params.push(action); }
  if (severity) { where.push("severity = ?"); params.push(severity); }
  if (from) { where.push("ts >= ?"); params.push(from); }
  if (to) { where.push("ts <= ?"); params.push(to); }
  const sql = `SELECT * FROM audit_events ${where.length ? "WHERE " + where.join(" AND ") : ""} ORDER BY id DESC LIMIT ?`;
  const rows = db.all(sql, [...params, Number(limit)]);
  return Response.json({ events: rows, count: rows.length });
}

export async function POST(req) {
  const { action: exportAction } = await req.json();
  if (exportAction === "export") {
    const db = getAdapter();
    const rows = db.all("SELECT * FROM audit_events ORDER BY id");
    return Response.json({ exportedAt: new Date().toISOString(), count: rows.length, events: rows });
  }
  return Response.json({ error: "unknown action" }, { status: 400 });
}
```

**Acceptance criteria:** filters work; export returns full JSON; pagination sane.

### M4 — Critical-event alerts + tests

**Reference code (`src/lib/audit/alerts.js`):**

```js
// Critical events → event bus (plan 37) for webhook delivery.
import { emit, EVENT_TYPES } from "@/lib/events/bus.js";

export async function logAuditWithAlerts(db, event) {
  const hash = await logAudit(db, event);
  if (event.severity === "critical") {
    emit(EVENT_TYPES.AUDIT_CRITICAL, { ...event, hash });
  }
  return hash;
}
```

**Files touched:** `src/lib/audit/` (new: store, trace, alerts), `src/lib/db/migrations/20260915-audit.js` (new), `src/app/api/v1/audit/route.js` (new), `src/sse/handlers/chat.js` + `open-sse/handlers/chatCore.js` (instrumentation), dashboard audit page (new), `tests/unit/audit.test.js` (new).

**Acceptance criteria:** critical events emit to bus; tests cover append-only + chain verify + trace.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Event volume | Table growth | Retention + filtering |
| Tampering | Undetected | Hash chain + verify tool |
| Performance | Sync writes slow requests | Async queue (fire-and-forget) |
| Query complexity | Slow filters | Indexed fields |

## Verification

- Unit: store, chain verify, trace, alerts
- Manual: dashboard audit page; tamper drill (edit row → verify fails)
- Regression: `tests/__baseline__/verify-no-regression.mjs`