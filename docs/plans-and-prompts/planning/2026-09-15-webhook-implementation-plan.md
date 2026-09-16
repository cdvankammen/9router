# Webhook Receive & Act — Code-Bearing Implementation Plan

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #webhook #events #automation #notifications #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (imports, function signatures, DB adapter API, settings shape, Next.js route conventions, instrumentation.js pattern).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — run the app, hit the endpoints, check the DB, confirm acceptance criteria.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation (read before implementing each milestone):
> - `../research/2026-09-15-webhook-receive-act-research.md`
> - `../research/2026-09-15-webhook-master-research-tree.md` + `../research/2026-09-15-webhook-branch-*.md`
> - `../research/2026-09-15-webhook-exponential-master-map.md` + `../research/2026-09-15-webhook-exp-*.md`
> - `../interpretation/2026-09-15-webhook-synthesis.md` (distilled knowledge)

## Scope

**In scope:**
- Inbound webhook receiver (`POST /api/webhooks/[id]`) with HMAC verification (Standard Webhooks spec)
- SQLite outbox event store + worker (transactional outbox pattern)
- Trigger→Condition→Action rule engine (Home Assistant model), JSON-configurable via settings
- Actions: notify (Apprise-style URLs), http (outbound POST), llm (reuse analyze-error pipeline), gateway (toggle provider/fallback), dashboard (SSE feed)
- Outbound notification triggers: quota 80%/90%/exhausted, provider error spike, fallback event, new model added, daily spend report

**Out of scope (v1):**
- Visual workflow editor (n8n-style) — JSON rules only
- Long-polling Mode B (Telegram model) — tunnel (Cloudflare/Tailscale) assumed available; revisit if needed
- Socket Mode / WebSocket inbound (Slack model) — HTTP only
- Dead man's switch (Healthchecks.io model) — separate feature
- Apprise as a dependency — implement URL schemes natively (fewer deps, more code)

---

## M1 — Inbound receiver + HMAC verification

**Goal:** `POST /api/webhooks/<id>` with valid `webhook-id`/`webhook-timestamp`/`webhook-signature` headers → 200, event enqueued. Invalid signature → 401; stale timestamp (>5 min) → 401; unknown webhook id → 404.

### Reference code

**`src/lib/webhooks/verify.js` (new):**

```js
import { createHmac, timingSafeEqual } from "node:crypto";

const MAX_AGE_MS = 5 * 60 * 1000; // 5-minute tolerance (Standard Webhooks)

/**
 * Verify a Standard Webhooks signature.
 * Headers: webhook-id, webhook-timestamp, webhook-signature (v1,<hex>[,v1,<hex>...])
 * Signed content: `${id}.${timestamp}.${rawBody}`
 */
export function verifySignature({ id, timestamp, signatureHeader, rawBody, secret }) {
  if (!id || !timestamp || !signatureHeader || !rawBody || !secret) return { ok: false, reason: "missing" };

  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(Date.now() - ts * 1000) > MAX_AGE_MS) {
    return { ok: false, reason: "stale" };
  }

  const expected = createHmac("sha256", secret)
    .update(`${id}.${timestamp}.${rawBody}`)
    .digest("hex");

  const provided = signatureHeader
    .split(" ")
    .filter((s) => s.startsWith("v1,"))
    .map((s) => s.slice(3));

  const ok = provided.some((sig) => {
    const a = Buffer.from(sig, "hex");
    const b = Buffer.from(expected, "hex");
    return a.length === b.length && timingSafeEqual(a, b);
  });

  return ok ? { ok: true } : { ok: false, reason: "invalid" };
}
```

**`src/app/api/webhooks/[id]/route.js` (new):**

```js
import { verifySignature } from "@/lib/webhooks/verify.js";
import { getWebhookConfig } from "@/lib/webhooks/registry.js";
import { enqueueEvent } from "@/lib/webhooks/outbox.js";

export async function POST(req, { params }) {
  const { id } = await params;
  const config = await getWebhookConfig(id);
  if (!config) return Response.json({ error: "unknown webhook" }, { status: 404 });

  const rawBody = await req.text(); // raw body required for HMAC
  const result = verifySignature({
    id,
    timestamp: req.headers.get("webhook-timestamp"),
    signatureHeader: req.headers.get("webhook-signature"),
    rawBody,
    secret: config.secret,
  });
  if (!result.ok) return Response.json({ error: `bad signature: ${result.reason}` }, { status: 401 });

  let payload;
  try { payload = JSON.parse(rawBody); } catch { payload = { raw: rawBody }; }

  await enqueueEvent({ webhookId: id, payload, eventId: req.headers.get("webhook-id") });
  return Response.json({ ok: true }, { status: 200 }); // <3s response (Slack/Discord mandate)
}
```

**Files touched:**
- `src/app/api/webhooks/[id]/route.js` (new) — POST handler
- `src/lib/webhooks/verify.js` (new) — HMAC verification util
- `src/lib/webhooks/registry.js` (new) — webhook config CRUD (in-memory + settings-backed)
- `src/lib/db/repos/settingsRepo.js` — add `webhooks` + `webhookRules` + `notifyUrls` defaults
- `src/app/api/settings/route.js` — PATCH support for new keys (already generic)

**Acceptance criteria:**
- `POST /api/webhooks/<id>` with valid headers → 200, event enqueued
- Invalid signature → 401; stale timestamp (>5 min) → 401; unknown webhook id → 404
- Raw body used for HMAC (`await req.text()`), constant-time compare (`crypto.timingSafeEqual`)
- Respond 2xx in <3s

---

## M2 — SQLite outbox + worker

**Goal:** `webhook_events` table with idempotency; worker polls pending events; exponential backoff; dead-letter.

### Reference code

**Migration** (`src/lib/db/migrations/` — new migration file):

```js
export async function up(db) {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS webhook_events (
      event_id TEXT PRIMARY KEY,          -- idempotency key (webhook-id header)
      webhook_id TEXT NOT NULL,
      payload TEXT NOT NULL,              -- JSON
      status TEXT NOT NULL DEFAULT 'pending',  -- pending → processing → delivered/failed
      attempts INTEGER NOT NULL DEFAULT 0,
      next_retry_at INTEGER,
      created_at INTEGER NOT NULL,
      processed_at INTEGER
    );
  `);
}
export async function down(db) {
  await db.exec(`DROP TABLE IF EXISTS webhook_events;`);
}
```

**`src/lib/webhooks/outbox.js` (new):**

```js
import { getAdapter } from "@/lib/db/driver.js";
import { stringifyJson, parseJson } from "@/lib/db/helpers/jsonCol.js";

export async function enqueueEvent({ webhookId, payload, eventId }) {
  const db = await getAdapter();
  const id = eventId || `evt_${crypto.randomUUID()}`;
  // Idempotency: duplicate event_id → no-op
  await db.run(
    `INSERT OR IGNORE INTO webhook_events (event_id, webhook_id, payload, status, attempts, created_at)
     VALUES (?, ?, ?, 'pending', 0, ?)`,
    [id, webhookId, stringifyJson(payload), Date.now()]
  );
}

export async function claimNextPending() {
  const db = await getAdapter();
  const row = await db.get(
    `SELECT * FROM webhook_events
     WHERE status = 'pending' AND (next_retry_at IS NULL OR next_retry_at <= ?)
     ORDER BY created_at LIMIT 1`, [Date.now()]
  );
  if (!row) return null;
  await db.run(`UPDATE webhook_events SET status = 'processing' WHERE event_id = ?`, [row.event_id]);
  return { ...row, payload: parseJson(row.payload, {}) };
}

export async function markDelivered(eventId) {
  const db = await getAdapter();
  await db.run(`UPDATE webhook_events SET status = 'delivered', processed_at = ? WHERE event_id = ?`,
    [Date.now(), eventId]);
}

export async function markFailed(eventId, attempts) {
  const db = await getAdapter();
  const backoffMs = Math.min(60_000, 1000 * 2 ** attempts); // exponential: 1s, 2s, 4s, ... 60s cap
  await db.run(
    `UPDATE webhook_events SET status = 'pending', attempts = ?, next_retry_at = ? WHERE event_id = ?`,
    [attempts, Date.now() + backoffMs, eventId]
  );
}

export async function deadLetter(eventId) {
  const db = await getAdapter();
  await db.run(`UPDATE webhook_events SET status = 'failed', processed_at = ? WHERE event_id = ?`,
    [Date.now(), eventId]);
}
```

**Worker** (in `src/instrumentation.js`, settings-gated, following the existing instrumentation pattern):

```js
// In instrumentation.js — settings-gated worker polling pending events.
// (Reference sketch — adapt to the existing instrumentation.js structure.)
import { claimNextPending, markDelivered, markFailed, deadLetter } from "@/lib/webhooks/outbox.js";
import { processEvent } from "@/lib/webhooks/processor.js";

const MAX_ATTEMPTS = 5;
let workerTimer = null;

export function startWebhookWorker(intervalMs = 5000) {
  if (workerTimer) return;
  workerTimer = setInterval(async () => {
    try {
      const event = await claimNextPending();
      if (!event) return;
      try {
        await processEvent(event);
        await markDelivered(event.event_id);
      } catch (err) {
        if (event.attempts + 1 >= MAX_ATTEMPTS) await deadLetter(event.event_id);
        else await markFailed(event.event_id, event.attempts + 1);
      }
    } catch (err) {
      console.error("[webhooks] worker error:", err);
    }
  }, intervalMs);
}
```

**Files touched:**
- `src/lib/db/migrations/` — new migration: `webhook_events` table
- `src/lib/db/repos/webhookEventsRepo.js` (new) — CRUD + status transitions (or `src/lib/webhooks/outbox.js` above)
- `src/instrumentation.js` — settings-gated worker polling pending events
- `src/lib/webhooks/processor.js` (new) — event → rule engine dispatch

**Acceptance criteria:**
- `webhook_events` table with idempotency key, status machine, attempts, backoff
- Worker polls every N seconds (settings-gated)
- Exponential backoff on failure; dead-letter after N retries
- Duplicate `event_id` → no-op

---

## M3 — Rule engine (TCA)

**Goal:** Rule JSON `{trigger: {event, filter}, condition: {and: [...]}, actions: [...]}`; conditions field/op/value; actions notify/http/llm/gateway/dashboard.

### Reference code

**`src/lib/webhooks/rules.js` (new):**

```js
import { getSettings } from "@/lib/localDb";

/** Evaluate a rule's condition tree against an event. */
export function matchCondition(cond, event) {
  if (!cond) return true;
  if (cond.and) return cond.and.every((c) => matchCondition(c, event));
  if (cond.or) return cond.or.some((c) => matchCondition(c, event));
  if (cond.not) return !matchCondition(cond.not, event);
  // leaf: {field, op, value}
  const actual = getPath(event, cond.field);
  switch (cond.op) {
    case "eq": return actual === cond.value;
    case "neq": return actual !== cond.value;
    case "gt": return actual > cond.value;
    case "lt": return actual < cond.value;
    case "contains": return String(actual ?? "").includes(cond.value);
    case "regex": return new RegExp(cond.value).test(String(actual ?? ""));
    default: return false;
  }
}

function getPath(obj, path) {
  return path.split(".").reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

/** Find all rules whose trigger matches the event; return their actions. */
export function matchRules(event, rules = null) {
  const all = rules ?? getSettings().webhookRules ?? [];
  const hits = [];
  for (const rule of all) {
    if (rule.trigger?.event !== event.type) continue;
    if (rule.trigger?.filter && !matchCondition(rule.trigger.filter, event)) continue;
    if (rule.condition && !matchCondition(rule.condition, event)) continue;
    hits.push(rule);
  }
  return hits;
}
```

**`src/lib/webhooks/actions/notify.js` (new) — Apprise-style URL sender:**

```js
// URL schemes: ntfy://topic, slack://token/channel, discord://webhook, tgram://bot:chat, gotify://host/token
export async function notify(url, message) {
  const u = new URL(url);
  switch (u.protocol) {
    case "ntfy:": {
      const topic = u.host + u.pathname;
      await fetch(`https://ntfy.sh/${topic}`, {
        method: "POST", body: message,
        headers: { "Content-Type": "text/plain" },
      });
      return;
    }
    case "slack:": {
      const [token, channel] = [u.host, u.pathname.slice(1)];
      await fetch("https://slack.com/api/chat.postMessage", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ channel, text: message }),
      });
      return;
    }
    case "discord:": {
      await fetch(`https://discord.com/api/webhooks/${u.host}${u.pathname}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: message }),
      });
      return;
    }
    case "tgram:": {
      const [bot, chat] = [u.host, u.pathname.slice(1)];
      await fetch(`https://api.telegram.org/bot${bot}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chat, text: message }),
      });
      return;
    }
    case "gotify:": {
      await fetch(`https://${u.host}/message?token=${u.pathname.slice(1)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "9Router", message }),
      });
      return;
    }
    default:
      throw new Error(`unsupported notify scheme: ${u.protocol}`);
  }
}
```

**`src/lib/webhooks/processor.js` (new) — event → rules → actions:**

```js
import { matchRules } from "./rules.js";
import { notify } from "./actions/notify.js";
import { postHttp } from "./actions/http.js";
import { runLlmAction } from "./actions/llm.js";
import { gatewayAction } from "./actions/gateway.js";
import { dashboardAction } from "./actions/dashboard.js";

export async function processEvent(event) {
  const rules = matchRules(event);
  for (const rule of rules) {
    for (const action of rule.actions ?? []) {
      try {
        switch (action.type) {
          case "notify": await notify(action.url, renderTemplate(action.template, event)); break;
          case "http": await postHttp(action.url, action.body, event); break;
          case "llm": await runLlmAction(action, event); break;
          case "gateway": await gatewayAction(action, event); break;
          case "dashboard": await dashboardAction(action, event); break;
        }
      } catch (err) {
        console.error(`[webhooks] action ${action.type} failed:`, err.message);
      }
    }
  }
}

function renderTemplate(tpl, event) {
  return String(tpl ?? "").replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (_, path) => {
    const v = path.split(".").reduce((o, k) => (o == null ? undefined : o[k]), event);
    return v == null ? "" : String(v);
  });
}
```

**Files touched:**
- `src/lib/webhooks/rules.js` (new)
- `src/lib/webhooks/actions/notify.js` (new)
- `src/lib/webhooks/actions/http.js` (new)
- `src/lib/webhooks/actions/llm.js` (new) — reuse analyze-error pipeline
- `src/lib/webhooks/actions/gateway.js` (new)
- `src/lib/webhooks/actions/dashboard.js` (new)
- `src/lib/webhooks/processor.js` (new)

**Acceptance criteria:**
- Rule JSON: `{trigger: {event, filter}, condition: {and: [...]}, actions: [...]}`
- Trigger events: `provider.error`, `quota.warning`, `quota.exhausted`, `request.completed`, `webhook.inbound`, `fallback.used`, `model.added`
- Conditions: field/op/value (eq, neq, gt, lt, contains, regex)
- Actions: notify (ntfy://, slack://, discord://, tgram://, gotify://), http, llm, gateway, dashboard
- Rules stored in `settingsRepo.js` `DEFAULT_SETTINGS.webhookRules`, PATCH-able via `/api/settings`

---

## M4 — Outbound notification triggers

**Goal:** Internal events → outbox → rules → notifications.

### Reference code

**`src/lib/webhooks/emitter.js` (new):**

```js
import { enqueueEvent } from "./outbox.js";

/** Emit an internal event into the outbox (no webhook-id needed). */
export async function emitInternalEvent(type, data) {
  await enqueueEvent({
    webhookId: "internal",
    eventId: `evt_${crypto.randomUUID()}`,
    payload: { type, ...data, ts: Date.now() },
  });
}
```

**Wiring points (reference sketch — adapt to actual code):**
- `src/shared/services/quotaAutoPing.js` — emit `quota.warning` at 80%, `quota.warning` at 90%, `quota.exhausted` at 100%
- `src/sse/handlers/chat.js` / `open-sse/handlers/chatCore.js` — emit `provider.error` (on upstream error), `fallback.used` (on combo fallback), `request.completed` (on completion)
- `src/lib/models.js` or wherever models are added — emit `model.added`
- Daily digest: a settings-gated timer (instrumentation.js) emitting `digest.daily` with spend summary

**Files touched:**
- `src/shared/services/quotaAutoPing.js` — emit quota events at 80%/90%/exhausted
- `src/sse/handlers/chat.js` or `open-sse/handlers/chatCore.js` — emit provider.error / fallback.used / request.completed events
- `src/lib/webhooks/emitter.js` (new) — internal event emitter → outbox

**Acceptance criteria:**
- Quota 80%/90%/exhausted → notify
- Provider error spike → notify (LiteLLM-style)
- Fallback event → notify
- New model added → notify
- Daily spend report → notify (digest mode)

---

## M5 — Dashboard UI (optional, P2)

**Files touched:**
- `src/app/dashboard/webhooks/page.js` (new) — webhook config + rules editor
- `src/app/dashboard/webhooks/events/page.js` (new) — event log viewer
- `src/components/webhooks/` (new) — RuleEditor, WebhookForm, EventTable components

**Acceptance criteria:**
- Create/edit/delete webhook endpoints (generate secret UUID)
- Create/edit/delete rules (JSON editor)
- View event log with status/attempts/retry
- Test button (send sample event)

---

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| DB adapter API (`getAdapter().run/get/all`) | Repo code assumes this shape | Verify against `src/lib/db/driver.js` + existing repos before implementing |
| `instrumentation.js` worker pattern | Must follow existing structure | Read `src/instrumentation.js` first; settings-gate the worker |
| Next.js route params (`{ params }` async) | Newer Next.js requires `await params` | Verify against existing `src/app/api/*/route.js` files |
| Settings shape | New keys must be added to `DEFAULT_SETTINGS` | Follow existing pattern; PATCH via `/api/settings` is generic |
| Outbound fetch timeouts | Notify actions could hang | Add AbortSignal.timeout(10_000) to all outbound fetches |
| Idempotency | Duplicate deliveries | `INSERT OR IGNORE` on event_id |

## Verification

- Unit tests for `verifySignature`, `matchCondition`, `matchRules`, `PriorityQueue`-style outbox transitions (no live calls)
- Manual: `curl -X POST` with valid/invalid signatures; check 200/401/404
- Regression: `tests/__baseline__/verify-no-regression.mjs`