# Implementation Plan 54 — Traffic Inspection & Debugging Tools — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #traffic-inspection #mitm #replay #debugging #redaction #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (`src/mitm/` MITM proxy; `src/proxy.js`; request flow in `src/sse/handlers/chat.js`; redaction needs per plan 35; `src/lib/events/bus.js` from plan 37).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — capture a request, confirm redaction, replay it, compare outcomes.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-54-traffic-inspection-debugging.md`, `../research/9router/14-mitm-deep-dive.md`, `../research/9router/impl-plan-35-privacy.md`.

## Scope

**In scope:** opt-in traffic capture (per provider/route) with redaction; capture store with retention; inspection views (request/response/diff/trace); replay tool (modify params, compare outcomes); debug mode (verbose per-request logging); debug bundle export.
**Out of scope:** full MITM proxy changes (existing `src/mitm/` stays); breakpoint debugging.

## Milestones

### M1 — Traffic capture + redaction

**Reference code (`src/lib/traffic/capture.js`):**

```js
// Opt-in capture: enabled per provider/route via settings (trafficCapture: { providers: [], routes: [] }).
import { getAdapter } from "@/lib/db/driver.js";

const REDACT_KEYS = new Set(["authorization", "api-key", "x-api-key", "cookie", "password", "token", "secret"]);

export function redactHeaders(headers) {
  const out = {};
  for (const [k, v] of Object.entries(headers ?? {})) {
    out[k] = REDACT_KEYS.has(k.toLowerCase()) ? "[REDACTED]" : v;
  }
  return out;
}

export function redactBody(body) {
  // Deep-redact known secret fields in JSON bodies.
  if (!body || typeof body !== "object") return body;
  const out = Array.isArray(body) ? [] : {};
  for (const [k, v] of Object.entries(body)) {
    if (REDACT_KEYS.has(String(k).toLowerCase())) out[k] = "[REDACTED]";
    else if (typeof v === "object") out[k] = redactBody(v);
    else out[k] = v;
  }
  return out;
}

export async function capture(db, { requestId, provider, route, reqHeaders, reqBody, resStatus, resBody, latencyMs }) {
  db.run(`
    INSERT INTO traffic_captures (request_id, provider, route, req_headers_json, req_body_json, res_status, res_body_json, latency_ms, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `, [requestId, provider, route,
      JSON.stringify(redactHeaders(reqHeaders)), JSON.stringify(redactBody(reqBody)),
      resStatus ?? null, JSON.stringify(redactBody(resBody)), latencyMs ?? null]);
}
```

**Acceptance criteria:** capture only when enabled; headers + bodies redacted; retention configurable.

### M2 — Capture store + retention

**Reference code (migration `src/lib/db/migrations/20260915-traffic.js` + repo):**

```js
export const up = (db) => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS traffic_captures (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      request_id TEXT NOT NULL,
      provider TEXT,
      route TEXT,
      req_headers_json TEXT,
      req_body_json TEXT,
      res_status INTEGER,
      res_body_json TEXT,
      latency_ms INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_traffic_request ON traffic_captures (request_id);
    CREATE INDEX IF NOT EXISTS idx_traffic_created ON traffic_captures (created_at);
  `);
};
export const down = (db) => { db.exec("DROP TABLE IF EXISTS traffic_captures"); };
```

```js
// src/lib/db/repos/trafficRepo.js
export async function listCaptures(db, { provider, route, limit = 100 } = {}) {
  const where = [];
  const params = [];
  if (provider) { where.push("provider = ?"); params.push(provider); }
  if (route) { where.push("route = ?"); params.push(route); }
  return db.all(`SELECT id, request_id, provider, route, res_status, latency_ms, created_at
                 FROM traffic_captures ${where.length ? "WHERE " + where.join(" AND ") : ""}
                 ORDER BY id DESC LIMIT ?`, [...params, limit]);
}
export async function getCapture(db, id) {
  return db.get("SELECT * FROM traffic_captures WHERE id = ?", [id]);
}
export async function pruneCaptures(db, olderThanDays = 7) {
  const cutoff = new Date(Date.now() - olderThanDays * 86_400_000).toISOString();
  return db.run("DELETE FROM traffic_captures WHERE created_at < ?", [cutoff]).changes ?? 0;
}
```

**Acceptance criteria:** list/get work; pruning removes old captures; indexes on hot queries.

### M3 — Replay tool

**Reference code (`src/lib/traffic/replay.js`):**

```js
import { getCapture } from "@/lib/db/repos/trafficRepo.js";
import { getAdapter } from "@/lib/db/driver.js";

// Replay a captured request, optionally modifying params.
export async function replayCapture(id, { modify = {}, baseUrl } = {}) {
  const db = getAdapter();
  const cap = await getCapture(db, id);
  if (!cap) throw new Error(`capture ${id} not found`);

  const body = { ...JSON.parse(cap.req_body_json ?? "{}"), ...modify };
  const res = await fetch(`${baseUrl ?? ""}/v1/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer test" },
    body: JSON.stringify(body),
  });
  const resBody = await res.json();
  return { status: res.status, body: resBody, original: { status: cap.res_status, body: JSON.parse(cap.res_body_json ?? "null") } };
}

// Compare original vs replayed outcome.
export function compareOutcomes(original, replayed) {
  const origContent = original.body?.choices?.[0]?.message?.content ?? null;
  const newContent = replayed.body?.choices?.[0]?.message?.content ?? null;
  return {
    sameStatus: original.status === replayed.status,
    sameContent: origContent === newContent,
    origContent: origContent?.slice(0, 200) ?? null,
    newContent: newContent?.slice(0, 200) ?? null,
  };
}
```

**Acceptance criteria:** replay works with param overrides; comparison highlights differences.

### M4 — Debug mode + dashboard + tests

**Reference code (`src/lib/traffic/debug.js`):**

```js
// Debug mode: verbose per-request logging when enabled for a request (header x-9router-debug: 1).
export function debugLog(requestId, stage, data) {
  if (process.env.DEBUG_TRAFFIC !== "1") return;
  console.log(`[traffic:debug] ${requestId} ${stage}`, JSON.stringify(data).slice(0, 2000));
}

// Debug bundle export: capture + trace + logs for a request.
export async function exportDebugBundle(requestId) {
  const db = getAdapter();
  const captures = db.all("SELECT * FROM traffic_captures WHERE request_id = ?", [requestId]);
  const trace = db.all("SELECT * FROM audit_events WHERE request_id = ? ORDER BY id", [requestId]);
  return { requestId, exportedAt: new Date().toISOString(), captures, trace };
}
```

**Files touched:** `src/lib/traffic/` (new: capture, replay, debug), `src/lib/db/migrations/20260915-traffic.js` (new), `src/lib/db/repos/trafficRepo.js` (new), `src/mitm/` (capture integration), dashboard traffic page (new), `src/app/api/v1/traffic/route.js` (new), `tests/unit/traffic.test.js` (new).

**Acceptance criteria:** debug bundle exportable; dashboard shows captures + replay button.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Privacy | Sensitive data captured | Redaction + opt-in + retention |
| Storage | Capture bloat | Retention + size caps |
| Replay cost | Paid API calls | Limits + confirmation |
| Complexity | Over-build | Progressive: capture → views → replay |

## Verification

- Unit: redaction, capture, replay, compare
- Manual: enable capture → request → inspect → replay
- Regression: `tests/__baseline__/verify-no-regression.mjs`