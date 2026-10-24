# Implementation Plan 37 — Webhooks & Event Notifications — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #webhooks #events #notifications #alerting #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (imports, function signatures, `src/lib/db/driver.js` `getAdapter()`, `src/lib/db/repos/settingsRepo.js` `DEFAULT_SETTINGS`, `src/lib/db/index.js` barrel exports, dashboard conventions).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — run the app, emit an event, confirm delivery + retry + signing.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-37-webhooks-events.md`, `../research/9router/47-branch-9router-internal-threads.md` (webhook details). Note: the webhook feature-area plan `2026-09-15-webhook-implementation-plan.md` and the M1–M5 webhook plans already exist in this folder — **this plan is the research-plan code version; reconcile with those before implementing** (they are the deeper, milestone-level versions).

## Scope

**In scope:** in-process event bus with typed events; webhook delivery (HMAC signing, exponential-backoff retry, dead-letter); notification channels (generic HTTP, Slack, dashboard in-app); threshold alert rules (cost spike, error rate, provider down) with dedupe + cooldown; webhook management UI; delivery log.
**Out of scope:** SMTP email channel (optional later); event replay UI; multi-tenant webhook isolation.

## Milestones

### M1 — Event bus

**Reference code (`src/lib/events/bus.js`):**

```js
// Typed in-process event bus. Subscribers are async fns; errors are isolated.
const subscribers = new Map(); // eventType -> Set<fn>

export function on(eventType, fn) {
  if (!subscribers.has(eventType)) subscribers.set(eventType, new Set());
  subscribers.get(eventType).add(fn);
  return () => subscribers.get(eventType)?.delete(fn);
}

export async function emit(eventType, payload) {
  const fns = subscribers.get(eventType);
  if (!fns) return;
  const event = { type: eventType, timestamp: new Date().toISOString(), payload };
  await Promise.allSettled([...fns].map((fn) => fn(event)));
}

// Event types (keep in sync with webhook config validation):
export const EVENT_TYPES = [
  "usage.request", "usage.cost",
  "error.rate_limit", "error.auth", "error.timeout", "error.unknown",
  "health.provider_down", "health.provider_recovered",
  "routing.fallback", "routing.combo_switch",
];
```

**Reference code (`src/lib/events/emitters.js`) — wiring points:**

```js
// Call emit() from existing code paths:
// - src/sse/handlers/chat.js after a request completes → emit("usage.request", {...})
// - open-sse/handlers/chatCore.js on fallback → emit("routing.fallback", {...})
// - src/lib/usageDb.js on cost record → emit("usage.cost", {...})
// - error paths in open-sse/executors/* → emit("error.rate_limit", {...}) etc.
```

**Acceptance criteria:** `emit`/`on` work; subscriber errors don't crash the request; event types documented.

### M2 — Webhook delivery (signing + retry + dead-letter)

**Reference code (`src/lib/events/webhooks.js`):**

```js
import crypto from "node:crypto";
import { getAdapter } from "@/lib/db/driver.js";

export function signPayload(secret, body) {
  return crypto.createHmac("sha256", secret).update(body).digest("hex");
}

export async function deliverWebhook(webhook, event) {
  const body = JSON.stringify(event);
  const signature = signPayload(webhook.secret, body);
  const res = await fetch(webhook.url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-9Router-Signature": `sha256=${signature}`, "X-9Router-Event": event.type },
    body,
    signal: AbortSignal.timeout(webhook.timeoutMs ?? 10_000),
  });
  if (!res.ok) throw new Error(`webhook ${webhook.url} returned ${res.status}`);
  return res;
}

// Retry with exponential backoff; dead-letter after maxAttempts.
export async function deliverWithRetry(webhook, event, { maxAttempts = 5, baseDelayMs = 1000 } = {}) {
  let attempt = 0;
  while (attempt < maxAttempts) {
    try {
      const res = await deliverWebhook(webhook, event);
      await logDelivery(webhook.id, event, { ok: true, attempt: attempt + 1, status: res.status });
      return { ok: true };
    } catch (err) {
      attempt++;
      await logDelivery(webhook.id, event, { ok: false, attempt, error: err.message });
      if (attempt >= maxAttempts) {
        await deadLetter(webhook.id, event, err.message);
        return { ok: false, error: err.message };
      }
      await new Promise((r) => setTimeout(r, baseDelayMs * 2 ** (attempt - 1)));
    }
  }
}

async function logDelivery(webhookId, event, info) {
  const db = await getAdapter();
  await db.run(
    `INSERT INTO webhook_deliveries (id, webhook_id, event_type, ok, attempt, status, error, delivered_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [crypto.randomUUID(), webhookId, event.type, info.ok ? 1 : 0, info.attempt, info.status ?? null, info.error ?? null, new Date().toISOString()]
  );
}

async function deadLetter(webhookId, event, error) {
  const db = await getAdapter();
  await db.run(
    `INSERT INTO webhook_dead_letters (id, webhook_id, event_type, payload, error, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [crypto.randomUUID(), webhookId, event.type, JSON.stringify(event), error, new Date().toISOString()]
  );
}
```

**Reference code (`src/lib/db/repos/webhookRepo.js`):**

```js
import { getAdapter } from "@/lib/db/driver.js";

export async function listWebhooks() {
  const db = await getAdapter();
  return db.all(`SELECT * FROM webhooks ORDER BY created_at DESC`);
}

export async function createWebhook({ url, events, secret, enabled = true, timeoutMs = 10_000 }) {
  const db = await getAdapter();
  const id = crypto.randomUUID();
  await db.run(
    `INSERT INTO webhooks (id, url, events, secret, enabled, timeout_ms, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, url, JSON.stringify(events), secret, enabled ? 1 : 0, timeoutMs, new Date().toISOString()]
  );
  return getWebhook(id);
}

export async function getWebhook(id) {
  const db = await getAdapter();
  const row = await db.get(`SELECT * FROM webhooks WHERE id = ?`, id);
  if (!row) return null;
  return { ...row, events: JSON.parse(row.events) };
}
```

**Migration (`src/lib/db/migrations/20260915-webhooks.js`):**

```js
export const up = async (db) => {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS webhooks (
      id TEXT PRIMARY KEY,
      url TEXT NOT NULL,
      events TEXT NOT NULL,          -- JSON array of event types
      secret TEXT NOT NULL,
      enabled INTEGER DEFAULT 1,
      timeout_ms INTEGER DEFAULT 10000,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS webhook_deliveries (
      id TEXT PRIMARY KEY,
      webhook_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      ok INTEGER NOT NULL,
      attempt INTEGER NOT NULL,
      status INTEGER,
      error TEXT,
      delivered_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS webhook_dead_letters (
      id TEXT PRIMARY KEY,
      webhook_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      payload TEXT NOT NULL,
      error TEXT,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_webhook ON webhook_deliveries(webhook_id);
  `);
};

export const down = async (db) => {
  await db.exec(`DROP TABLE IF EXISTS webhook_dead_letters; DROP TABLE IF EXISTS webhook_deliveries; DROP TABLE IF EXISTS webhooks;`);
};
```

**Acceptance criteria:** signed delivery works; retry backoff works; dead-letter after N; delivery log rows written.

### M3 — Alert rules (thresholds + dedupe + cooldown)

**Reference code (`src/lib/events/alerts.js`):**

```js
import { getAdapter } from "@/lib/db/driver.js";

// Rule: { id, name, eventType, metric, op, threshold, windowMs, cooldownMs, webhookIds }
export async function evaluateAlert(rule, event) {
  const db = await getAdapter();
  const since = new Date(Date.now() - rule.windowMs).toISOString();
  // Aggregate the metric over the window from webhook_deliveries/usage records.
  // Example: error-rate rule counts error.* events in window.
  const row = await db.get(
    `SELECT COUNT(*) as cnt FROM webhook_deliveries WHERE event_type = ? AND delivered_at >= ?`,
    [rule.eventType, since]
  );
  const value = row.cnt;
  const fired = rule.op === ">" ? value > rule.threshold : value < rule.threshold;
  if (!fired) return null;

  // Cooldown: don't re-fire within cooldownMs.
  const last = await db.get(`SELECT fired_at FROM alert_firings WHERE rule_id = ? ORDER BY fired_at DESC LIMIT 1`, rule.id);
  if (last && Date.now() - new Date(last.fired_at).getTime() < rule.cooldownMs) return null;

  await db.run(`INSERT INTO alert_firings (id, rule_id, value, fired_at) VALUES (?, ?, ?, ?)`,
    [crypto.randomUUID(), rule.id, value, new Date().toISOString()]);
  return { rule, value };
}

// Called from a periodic sweep (setInterval in instrumentation.js) or on each event.
export async function runAlertRules(event) {
  const db = await getAdapter();
  const rules = await db.all(`SELECT * FROM alert_rules WHERE enabled = 1`);
  for (const rule of rules) {
    const firing = await evaluateAlert(rule, event);
    if (firing) {
      for (const webhookId of JSON.parse(rule.webhookIds)) {
        const webhook = await getWebhook(webhookId);
        if (webhook?.enabled) await deliverWithRetry(webhook, { type: "alert.fired", payload: firing });
      }
    }
  }
}
```

**Acceptance criteria:** rules fire on threshold; cooldown suppresses duplicates; alert webhooks delivered.

### M4 — API + dashboard + tests

**Reference code (`src/app/api/v1/webhooks/route.js`):**

```js
import { NextResponse } from "next/server";
import { createWebhook, listWebhooks, getWebhook } from "@/lib/db/repos/webhookRepo.js";

export async function GET() {
  return NextResponse.json({ webhooks: await listWebhooks() });
}

export async function POST(req) {
  const body = await req.json();
  const { url, events, secret, enabled, timeoutMs } = body;
  if (!url || !Array.isArray(events) || events.length === 0 || !secret) {
    return NextResponse.json({ error: "url, events[], and secret are required" }, { status: 400 });
  }
  const webhook = await createWebhook({ url, events, secret, enabled, timeoutMs });
  return NextResponse.json({ webhook }, { status: 201 });
}
```

**Files touched:** dashboard webhooks page (list/create/delete webhooks, delivery log view, dead-letter view, alert rule editor), `tests/unit/webhooks.test.js` (new: signing, retry, dead-letter, alert cooldown).

**Acceptance criteria:** API works; dashboard functional; tests pass.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Event wiring in existing paths | Missed events | Emitter checklist in M1 |
| Delivery failures | Lost events | Retry + dead-letter |
| Webhook storms | Alert fatigue | Dedupe + cooldown |
| Secret handling | Leakage | Store hashed; never log |

## Verification

- Unit: bus, signing, retry, dead-letter, alerts
- Manual: emit event → observe delivery log + dead-letter on bad URL
- Regression: `tests/__baseline__/verify-no-regression.mjs`