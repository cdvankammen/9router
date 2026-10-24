# Implementation Plan 68 — Session Management & Persistence — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #sessions #persistence #resume #lifecycle #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (any existing session repo under `src/lib/db/repos/`; request handling in `src/sse/handlers/chat.js`; trace correlation from plan 66; privacy rules from plan 35).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — create a session, restart the server, resume it; confirm state restored.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-68-session-management-persistence.md`, `../research/9router/impl-plan-66-request-tracing-correlation.md`, `../research/9router/impl-plan-17-node-failover.md`.

## Scope

**In scope:** session model (id, user, messages, context, metadata) with lifecycle (create → active → idle → close); persistence (debounced per-turn saves, restore on resume); resume API + context/tool restore + validity checks; session analytics (duration, turns, models used) + cleanup of idle sessions; limits (max sessions, max messages).
**Out of scope:** multi-device sync/cloud session replication; encryption-at-rest beyond the existing DB protections.

## Milestones

### M1 — Session model + lifecycle

**Reference code (`src/lib/sessions/model.js`):**

```js
export const SESSION_STATES = ["active", "idle", "closed"];

export const DEFAULT_LIMITS = {
  maxMessages: Number(process.env.SESSION_MAX_MESSAGES ?? 500),
  idleAfterMs: Number(process.env.SESSION_IDLE_MS ?? 30 * 60_000),
  maxSessionsPerUser: Number(process.env.SESSION_MAX_PER_USER ?? 50),
};

export function createSession({ id, userId = null, metadata = {} }, now = Date.now()) {
  const ts = new Date(now).toISOString();
  return { id, userId, messages: [], context: {}, metadata, state: "active", createdAt: ts, updatedAt: ts, turns: 0 };
}

export function appendMessage(session, message, limits = DEFAULT_LIMITS) {
  if (session.state === "closed") throw new Error("session closed");
  session.messages.push(message);
  session.turns += 1;
  session.updatedAt = new Date().toISOString();
  if (session.messages.length > limits.maxMessages) {
    session.messages = session.messages.slice(-limits.maxMessages);
  }
  return session;
}

export function touchState(session, now = Date.now(), limits = DEFAULT_LIMITS) {
  const idleFor = now - Date.parse(session.updatedAt);
  if (session.state !== "closed" && idleFor > limits.idleAfterMs) session.state = "idle";
  return session;
}
```

**Acceptance criteria:** lifecycle transitions correct; message cap enforced; idle detection works.

### M2 — Persistence

**Reference code (migration `src/lib/db/migrations/20260915-sessions.js` + repo):**

```js
export const up = (db) => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS chat_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      state TEXT NOT NULL DEFAULT 'active',
      turns INTEGER NOT NULL DEFAULT 0,
      messages_json TEXT NOT NULL DEFAULT '[]',
      context_json TEXT NOT NULL DEFAULT '{}',
      metadata_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_sessions_user ON chat_sessions (user_id, state);
    CREATE INDEX IF NOT EXISTS idx_sessions_updated ON chat_sessions (updated_at);
  `);
};
export const down = (db) => { db.exec("DROP TABLE IF EXISTS chat_sessions"); };
```

```js
// src/lib/db/repos/sessionRepo.js
export async function upsertSession(db, s) {
  db.run(`INSERT INTO chat_sessions (id, user_id, state, turns, messages_json, context_json, metadata_json, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            state = excluded.state, turns = excluded.turns, messages_json = excluded.messages_json,
            context_json = excluded.context_json, metadata_json = excluded.metadata_json, updated_at = excluded.updated_at`,
    [s.id, s.userId, s.state, s.turns, JSON.stringify(s.messages), JSON.stringify(s.context), JSON.stringify(s.metadata), s.createdAt, s.updatedAt]);
}
export async function getSession(db, id) {
  const r = db.get("SELECT * FROM chat_sessions WHERE id = ?", [id]);
  if (!r) return null;
  return { ...r, messages: JSON.parse(r.messages_json), context: JSON.parse(r.context_json), metadata: JSON.parse(r.metadata_json) };
}
export async function listSessions(db, { userId, limit = 50 } = {}) {
  const where = userId ? "WHERE user_id = ?" : "";
  const params = userId ? [userId] : [];
  return db.all(`SELECT id, user_id, state, turns, created_at, updated_at FROM chat_sessions ${where} ORDER BY updated_at DESC LIMIT ?`, [...params, limit]);
}
export async function deleteSessionsBefore(db, isoCutoff) {
  return db.run("DELETE FROM chat_sessions WHERE updated_at < ?", [isoCutoff]);
}
```

```js
// src/lib/sessions/persist.js — debounced per-turn saves (never blocks the request path).
const timers = new Map();
export function scheduleSave(session, saveFn, { debounceMs = 250 } = {}) {
  const prior = timers.get(session.id);
  if (prior) clearTimeout(prior);
  const t = setTimeout(() => { timers.delete(session.id); Promise.resolve(saveFn(session)).catch(() => {}); }, debounceMs);
  if (typeof t.unref === "function") t.unref();
  timers.set(session.id, t);
}
export function flushSaves() { for (const [, t] of timers) clearTimeout(t); timers.clear(); }
```

**Acceptance criteria:** sessions upserted; JSON round-trips; saves debounced + unref'd; cleanup query works.

### M3 — Resume

**Reference code (`src/lib/sessions/resume.js`):**

```js
import { getSession } from "@/lib/db/repos/sessionRepo.js";
import { SESSION_STATES } from "./model.js";

// Validate that a session can be resumed.
export function validateResume(session, { allowIdle = true } = {}) {
  if (!session) return { ok: false, reason: "not-found" };
  if (session.state === "closed") return { ok: false, reason: "closed" };
  if (!allowIdle && session.state === "idle") return { ok: false, reason: "idle" };
  return { ok: true };
}

// Resume: load + reactivate + restore context/messages for the next request.
export async function resumeSession(db, id, opts) {
  const session = await getSession(db, id);
  const check = validateResume(session, opts);
  if (!check.ok) return { ok: false, reason: check.reason };
  session.state = "active";
  session.updatedAt = new Date().toISOString();
  return { ok: true, session, restoredMessages: session.messages.length, context: session.context };
}
```

**Acceptance criteria:** closed sessions rejected; idle allowed by default; context restored.

### M4 — Analytics + API + cleanup + tests

**Reference code (`src/app/api/v1/sessions/route.js`):**

```js
import { getAdapter } from "@/lib/db/driver.js";
import { listSessions, deleteSessionsBefore } from "@/lib/db/repos/sessionRepo.js";
import { resumeSession } from "@/lib/sessions/resume.js";

export async function GET(req) {
  const db = getAdapter();
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (id) {
    const res = await resumeSession(db, id, { allowIdle: url.searchParams.get("allow_idle") === "1" });
    if (!res.ok) return Response.json({ error: res.reason }, { status: 404 });
    return Response.json({ session: res.session });
  }
  return Response.json({ sessions: await listSessions(db, { userId: url.searchParams.get("user_id") ?? undefined }) });
}

// Idle cleanup: close sessions untouched past the idle window.
export async function POST(req) {
  const db = getAdapter();
  const { action } = await req.json().catch(() => ({}));
  if (action === "cleanup") {
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60_000).toISOString();
    await deleteSessionsBefore(db, cutoff);
    return Response.json({ ok: true, cutoff });
  }
  return Response.json({ error: "unknown action" }, { status: 400 });
}
```

**Files touched:** `src/lib/sessions/` (new: model, persist, resume), `src/lib/db/migrations/20260915-sessions.js` (new), `src/lib/db/repos/sessionRepo.js` (new or extend), `src/app/api/v1/sessions/route.js` (new), dashboard sessions page (new), `tests/unit/sessions.test.js` (new).

**Acceptance criteria:** sessions persist across restart; resume works; analytics list; cleanup removes old.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Storage growth | DB bloat | Message cap + retention cleanup |
| State corruption | Broken resume | Validation on resume + JSON parse guards |
| Resume complexity | Edge cases | Simple restore path first |
| Privacy | Session data exposure | User scoping + reuse plan 35 protections |

## Verification

- Unit: model, persist debounce, resume validation, repo round-trip
- Manual: create session → restart server → resume by id → messages present
- Regression: `tests/__baseline__/verify-no-regression.mjs`