# Implementation Plan 66 — Request Tracing & Correlation — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #request-tracing #correlation #spans #timeline #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (request_id handling in `src/sse/handlers/chat.js` / `open-sse/handlers/chatCore.js`; audit events from plan 47; traffic captures from plan 54; usage logging in `src/lib/usageDb.js`).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — trace a request end-to-end; correlate logs/errors; view timeline.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-66-request-tracing-correlation.md`, `../research/9router/impl-plan-47-audit-log-traceability.md`, `../research/9router/impl-plan-54-traffic-inspection-debugging.md`.

## Scope

**In scope:** trace model (request_id → spans: parse, classify, route, execute, stream, fallback) with start/end/duration/status/metadata; tracing pipeline (start at entry, record at each stage, end at completion); correlation keys (request_id, session_id, user_id) across logs/DB/errors/usage; trace views (timeline, detail, correlated logs); trace export; sampling to bound overhead.
**Out of scope:** distributed tracing protocols (W3C traceparent export); trace propagation to upstream providers.

## Milestones

### M1 — Trace model + pipeline

**Reference code (`src/lib/tracing/model.js`):**

```js
// Trace: request_id → spans.
export const SPAN_TYPES = ["parse", "classify", "route", "execute", "stream", "fallback"];

export function startTrace(requestId, { sessionId = null, userId = null, sampled = true } = {}) {
  return { requestId, sessionId, userId, sampled, spans: [], startedAt: Date.now(), status: "active" };
}

export function startSpan(trace, type, metadata = {}) {
  if (!trace.sampled) return null;
  const span = { type, start: Date.now(), end: null, durationMs: null, status: "active", metadata };
  trace.spans.push(span);
  return span;
}

export function endSpan(span, { status = "ok", metadata = {} } = {}) {
  if (!span) return;
  span.end = Date.now();
  span.durationMs = span.end - span.start;
  span.status = status;
  span.metadata = { ...span.metadata, ...metadata };
}

export function endTrace(trace, { status = "ok" } = {}) {
  trace.status = status;
  trace.endedAt = Date.now();
  trace.totalMs = trace.endedAt - trace.startedAt;
  return trace;
}
```

**Acceptance criteria:** spans recorded with durations; sampling skips work; trace completes with status.

### M2 — Trace storage

**Reference code (migration `src/lib/db/migrations/20260915-traces.js` + repo):**

```js
export const up = (db) => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS traces (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      request_id TEXT NOT NULL UNIQUE,
      session_id TEXT,
      user_id TEXT,
      status TEXT NOT NULL,
      total_ms INTEGER,
      spans_json TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_traces_request ON traces (request_id);
    CREATE INDEX IF NOT EXISTS idx_traces_session ON traces (session_id);
    CREATE INDEX IF NOT EXISTS idx_traces_created ON traces (created_at);
  `);
};
export const down = (db) => { db.exec("DROP TABLE IF EXISTS traces"); };
```

```js
// src/lib/db/repos/traceRepo.js
export async function saveTrace(db, trace) {
  db.run(`INSERT INTO traces (request_id, session_id, user_id, status, total_ms, spans_json)
          VALUES (?, ?, ?, ?, ?, ?)
          ON CONFLICT(request_id) DO UPDATE SET
            status = excluded.status, total_ms = excluded.total_ms, spans_json = excluded.spans_json`,
    [trace.requestId, trace.sessionId ?? null, trace.userId ?? null, trace.status, trace.totalMs ?? null, JSON.stringify(trace.spans)]);
}
export async function getTrace(db, requestId) {
  const row = db.get("SELECT * FROM traces WHERE request_id = ?", [requestId]);
  return row ? { ...row, spans: JSON.parse(row.spans_json) } : null;
}
export async function listTraces(db, { limit = 100, status } = {}) {
  const where = status ? "WHERE status = ?" : "";
  const params = status ? [status] : [];
  return db.all(`SELECT request_id, session_id, user_id, status, total_ms, created_at
                 FROM traces ${where} ORDER BY id DESC LIMIT ?`, [...params, limit]);
}
```

**Acceptance criteria:** traces upserted by request_id; list/get work; indexes on correlation keys.

### M3 — Correlation

**Reference code (`src/lib/tracing/correlate.js`):**

```js
import { getAdapter } from "@/lib/db/driver.js";

// Correlate all events for a request across stores.
export async function correlateRequest(requestId) {
  const db = getAdapter();
  const [trace, audit, captures, usage] = await Promise.all([
    getTrace(db, requestId),
    db.all("SELECT * FROM audit_events WHERE request_id = ? ORDER BY id", [requestId]),
    db.all("SELECT * FROM traffic_captures WHERE request_id = ? ORDER BY id", [requestId]),
    db.all("SELECT * FROM usage WHERE request_id = ? ORDER BY id", [requestId]),
  ]);
  return { trace, audit, captures, usage };
}

// Correlation by session: all requests in a session.
export async function correlateSession(sessionId) {
  const db = getAdapter();
  return db.all("SELECT request_id, status, total_ms, created_at FROM traces WHERE session_id = ? ORDER BY id", [sessionId]);
}
```

**Acceptance criteria:** request correlation returns all stores; session correlation lists requests.

### M4 — Trace views + export + tests

**Reference code (`src/app/api/v1/traces/route.js`):**

```js
import { getAdapter } from "@/lib/db/driver.js";
import { getTrace, listTraces } from "@/lib/db/repos/traceRepo.js";
import { correlateRequest } from "@/lib/tracing/correlate.js";

export async function GET(req) {
  const db = getAdapter();
  const url = new URL(req.url);
  const requestId = url.searchParams.get("request_id");
  if (requestId) {
    const correlated = await correlateRequest(requestId);
    if (!correlated.trace) return Response.json({ error: "trace not found" }, { status: 404 });
    return Response.json(correlated);
  }
  const status = url.searchParams.get("status") ?? undefined;
  return Response.json({ traces: await listTraces(db, { status }) });
}

export async function POST(req) {
  const { requestId } = await req.json();
  const correlated = await correlateRequest(requestId);
  return Response.json({ exportedAt: new Date().toISOString(), ...correlated });
}
```

**Files touched:** `src/lib/tracing/` (new: model, correlate), `src/lib/db/migrations/20260915-traces.js` (new), `src/lib/db/repos/traceRepo.js` (new), `open-sse/handlers/chatCore.js` (span recording), `src/app/api/v1/traces/route.js` (new), dashboard traces page (new), `tests/unit/tracing.test.js` (new).

**Acceptance criteria:** spans recorded at each stage; API returns correlated trace; dashboard timeline functional.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Overhead | Slower requests | Sampling + async writes |
| Storage | Table growth | Retention + pruning |
| Correlation gaps | Missing links | Key discipline (request_id everywhere) |
| Privacy | Sensitive spans | Redaction (plan 54 patterns) |

## Verification

- Unit: model, spans, correlate
- Manual: request → trace timeline → correlated logs
- Regression: `tests/__baseline__/verify-no-regression.mjs`