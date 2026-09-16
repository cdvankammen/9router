# Webhook Implementation Plan — M2: SQLite Outbox + Worker

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (code ready for agent review)
**Tags:** #plan #webhook #implementation #code #m2 #outbox #worker #sqlite

---

## ⚠️ AGENT REVIEW NOTE (READ FIRST)

> **The code in this plan is a starting point, not a final decision.**
> Every agent that reads this plan MUST review the code below and make a decision:
> is there a better way to implement this? If yes, **make those changes happen** —
> update the code, note the improvement, and proceed. Do not treat this code as
> sacred. It follows 9router's existing conventions (migrations, repos, instrumentation.js),
> but the agent is the final arbiter of implementation quality.

---

## Objective

Implement M2 of the webhook system: the SQLite outbox event store + worker (transactional outbox pattern). This gives at-least-once delivery with idempotency, exponential backoff, and dead-lettering.

## Scope

**In scope:**
- Migration: `webhook_events` table
- `webhookEventsRepo.js` — CRUD + status transitions
- Worker in `instrumentation.js` (settings-gated)
- Idempotency (duplicate `event_id` → no-op)
- Exponential backoff + dead-letter

**Out of scope (v1):**
- Rule engine + actions (M3) — worker dispatches to a placeholder for now
- Outbound triggers (M4)
- Dashboard UI (M5)

## Files

| File | Action | Purpose |
|------|--------|---------|
| `src/lib/db/migrations/005-webhook-events.js` | new | Migration |
| `src/lib/db/migrations/index.js` | edit | Register migration |
| `src/lib/db/repos/webhookEventsRepo.js` | new | CRUD + status transitions |
| `src/lib/webhooks/worker.js` | new | Polling worker |
| `src/instrumentation.js` | edit | Start worker (settings-gated) |

## Code

### 1. `src/lib/db/migrations/005-webhook-events.js` — Migration

```js
// src/lib/db/migrations/005-webhook-events.js
export default {
  version: 5,
  name: "webhook-events",
  async up(db) {
    await db.exec(`
      CREATE TABLE IF NOT EXISTS webhook_events (
        event_id     TEXT PRIMARY KEY,          -- idempotency key (unique)
        webhook_id   TEXT NOT NULL,             -- FK to webhook configs
        payload      TEXT NOT NULL,             -- JSON payload
        status       TEXT NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending','processing','delivered','failed','dead')),
        attempts     INTEGER NOT NULL DEFAULT 0,
        next_retry_at TEXT,                     -- ISO timestamp
        created_at   TEXT NOT NULL DEFAULT (datetime('now')),
        processed_at TEXT,
        last_error   TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_webhook_events_status
        ON webhook_events (status, next_retry_at);
    `);
  },
  async down(db) {
    await db.exec(`DROP TABLE IF EXISTS webhook_events;`);
  },
};
```

### 2. `src/lib/db/migrations/index.js` — register migration

```js
// In the migrations array, add:
import migration005 from "./005-webhook-events.js";
// ...and include migration005 in the exported array (order matters).
```

### 3. `src/lib/db/repos/webhookEventsRepo.js` — CRUD + status transitions

```js
// src/lib/db/repos/webhookEventsRepo.js
import { getAdapter } from "../driver.js";
import { parseJson, stringifyJson } from "../helpers/jsonCol.js";

const MAX_ATTEMPTS = 5; // dead-letter after 5 retries

/**
 * Insert an event. Idempotent: duplicate event_id is a no-op.
 * @param {{eventId: string, webhookId: string, payload: object}} input
 * @returns {Promise<{inserted: boolean}>}
 */
export async function insertEvent({ eventId, webhookId, payload }) {
  const db = await getAdapter();
  const existing = await db.get(
    "SELECT event_id FROM webhook_events WHERE event_id = ?",
    [eventId]
  );
  if (existing) return { inserted: false }; // duplicate — no-op (idempotency)

  await db.run(
    `INSERT INTO webhook_events (event_id, webhook_id, payload, status, attempts, next_retry_at)
     VALUES (?, ?, ?, 'pending', 0, datetime('now'))`,
    [eventId, webhookId, stringifyJson(payload)]
  );
  return { inserted: true };
}

/**
 * Claim pending events due for retry (worker poll).
 * @param {number} limit
 * @returns {Promise<Array>}
 */
export async function claimPendingEvents(limit = 10) {
  const db = await getAdapter();
  const rows = await db.all(
    `SELECT * FROM webhook_events
     WHERE status = 'pending' AND (next_retry_at IS NULL OR next_retry_at <= datetime('now'))
     ORDER BY created_at ASC LIMIT ?`,
    [limit]
  );
  // Mark as processing (claim)
  for (const row of rows) {
    await db.run(
      `UPDATE webhook_events SET status = 'processing' WHERE event_id = ?`,
      [row.event_id]
    );
  }
  return rows.map((r) => ({ ...r, payload: parseJson(r.payload) }));
}

/**
 * Mark an event delivered.
 * @param {string} eventId
 */
export async function markDelivered(eventId) {
  const db = await getAdapter();
  await db.run(
    `UPDATE webhook_events SET status = 'delivered', processed_at = datetime('now')
     WHERE event_id = ?`,
    [eventId]
  );
}

/**
 * Mark an event failed (with backoff). Dead-letter after MAX_ATTEMPTS.
 * @param {string} eventId
 * @param {string} error
 */
export async function markFailed(eventId, error) {
  const db = await getAdapter();
  const row = await db.get(
    "SELECT attempts FROM webhook_events WHERE event_id = ?",
    [eventId]
  );
  const attempts = (row?.attempts || 0) + 1;
  if (attempts >= MAX_ATTEMPTS) {
    await db.run(
      `UPDATE webhook_events SET status = 'dead', attempts = ?, last_error = ?,
              processed_at = datetime('now') WHERE event_id = ?`,
      [attempts, error, eventId]
    );
  } else {
    // Exponential backoff: 2^attempts seconds (1s, 2s, 4s, 8s)
    const backoffSec = Math.pow(2, attempts);
    await db.run(
      `UPDATE webhook_events SET status = 'pending', attempts = ?, last_error = ?,
              next_retry_at = datetime('now', '+' || ? || ' seconds') WHERE event_id = ?`,
      [attempts, error, backoffSec, eventId]
    );
  }
}
```

### 4. `src/lib/webhooks/worker.js` — Polling worker

```js
// src/lib/webhooks/worker.js
// Settings-gated outbox worker (instrumentation.js pattern).
import { claimPendingEvents, markDelivered, markFailed } from "@/lib/db/repos/webhookEventsRepo.js";

const POLL_INTERVAL_MS = 5000; // 5s default

// Survive Next.js hot reload — one worker per process.
const g = (global.__webhookWorker ??= { interval: null, running: false });

/**
 * Process one event. M3 replaces this with the rule engine dispatch.
 * @param {object} event
 */
async function processEvent(event) {
  // TODO(M3): dispatch through rule engine (rules.js) — see webhook-m3-plan.md
  console.log(`[webhook-worker] processing ${event.event_id}`, {
    webhookId: event.webhook_id,
    payload: event.payload,
  });
  // Placeholder: always succeed. M3 wires real actions.
  return { ok: true };
}

async function tick() {
  if (g.running) return;
  g.running = true;
  try {
    const events = await claimPendingEvents(10);
    for (const event of events) {
      try {
        const result = await processEvent(event);
        if (result.ok) {
          await markDelivered(event.event_id);
        } else {
          await markFailed(event.event_id, result.error || "processing failed");
        }
      } catch (err) {
        await markFailed(event.event_id, err?.message || String(err));
      }
    }
  } catch (err) {
    console.error("[webhook-worker] tick failed:", err?.message || err);
  } finally {
    g.running = false;
  }
}

/**
 * Start the worker (settings-gated).
 * @param {{enabled?: boolean, intervalMs?: number}} opts
 */
export function startWebhookWorker(opts = {}) {
  if (g.interval) return; // already running
  if (opts.enabled === false) return;
  g.interval = setInterval(tick, opts.intervalMs || POLL_INTERVAL_MS);
  tick(); // immediate first poll
}
```

### 5. `src/instrumentation.js` — start worker (settings-gated)

```js
// In instrumentation.js register(), after the srComboCleanup block:
    // Webhook outbox worker — OFF unless settings.webhookWorker.enabled.
    try {
      const { getSettings } = await import("@/lib/db/repos/settingsRepo.js");
      const settings = await getSettings();
      const wh = settings.webhookWorker || {};
      if (wh.enabled) {
        const { startWebhookWorker } = await import("@/lib/webhooks/worker.js");
        startWebhookWorker({ enabled: true, intervalMs: wh.intervalMs });
      }
    } catch (err) {
      console.error("[WebhookWorker] instrumentation start failed:", err?.message || err);
    }
```

### 6. `src/lib/db/repos/settingsRepo.js` — add `webhookWorker` default

```js
// In DEFAULT_SETTINGS, add:
  // Webhook outbox worker. OFF by default — users opt in.
  webhookWorker: {
    enabled: false,
    intervalMs: 5000,
  },
```

## Acceptance Criteria

- [ ] `webhook_events` table created by migration 005
- [ ] `insertEvent` is idempotent (duplicate `event_id` → no-op)
- [ ] Worker polls pending events every N seconds (settings-gated)
- [ ] Exponential backoff on failure (1s, 2s, 4s, 8s); dead-letter after 5 attempts
- [ ] Status machine: pending → processing → delivered / failed / dead

## Testing

```bash
# Unit test (vitest, tests/unit/webhook-events.test.js)
# - insertEvent dedupes
# - claimPendingEvents claims in order
# - markFailed backoff math (attempts 1→2s, 2→4s, 3→8s, 4→dead)
```

## Related Docs

- Research: `../research/2026-09-15-webhook-exp-03-event-store-worker.md` (R09–R11)
- Plan: `../planning/2026-09-15-webhook-receive-act-plan.md` (M2)
- Interpretation: `../interpretation/2026-09-15-webhook-interpretation-guide.md`