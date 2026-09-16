# Branch Research — A2a: Event Store (7-node subtree)

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** active
**Tags:** #research #webhook #event-store #outbox #sqlite #worker #retry #binary-tree #branch-a2a

## Objective

Deep-dive the **event store** subtree of the webhook master tree (`2026-09-15-webhook-master-research-tree.md`). Covers the outbox table (A2a1) and worker & retry (A2a2), down to L6 leaves.

```
A2a EVENT STORE
├─ A2a1: OUTBOX TABLE
│  ├─ A2a1L: schema
│  │  ├─ A2a1LL: event_id idempotency key
│  │  └─ A2a1LR: status machine (pending→processing→delivered/failed)
│  └─ A2a1R: transactional outbox pattern
│     ├─ A2a1RL: same-DB write (9router SQLite)
│     └─ A2a1RR: at-least-once guarantee
└─ A2a2: WORKER & RETRY
   ├─ A2a2L: poller (instrumentation.js pattern)
   │  ├─ A2a2LL: settings-gated startup
   │  └─ A2a2LR: polling interval
   └─ A2a2R: retry policy
      ├─ A2a2RL: exponential backoff (Stripe 3 days)
      └─ A2a2RR: dead-letter after N attempts
```

## Codebase grounding (what exists today)

### `src/lib/db/` — SQLite layer (A2a1RL)

- Adapter chain: `bun:sqlite` → `better-sqlite3` (optional native dep) → `node:sqlite` (Node ≥22.5) → `sql.js` (pure-JS fallback, always works).
- `src/lib/db/index.js` is the entry; per-entity logic in `src/lib/db/repos/*`; schema/migrations in `src/lib/db/migrations/`.
- `src/lib/localDb.js` is a backward-compat shim re-exporting `src/lib/db/index.js`.
- A `webhook_events` table + `webhookEventsRepo.js` follows the exact existing pattern.

### `src/instrumentation.js` — background job startup (A2a2L)

- Starts settings-gated background jobs: console log capture, markdown log flusher, sr-combo cleanup, model catalog sync.
- A webhook outbox worker follows the same pattern: settings-gated (`settings.webhooks.enabled`), started at boot, polls pending events.

### `src/lib/usageDb.js` — request capture precedent (A2a1)

- Captures request details with buffered/batched writes (zero latency, fire-and-forget) — the same "write fast, process later" philosophy as an outbox.

## External research

### A2a1LL — event_id idempotency key

- **Stripe:** events have unique IDs; "ordering NOT guaranteed → dedupe by event ID."
- **GitHub:** `X-GitHub-Delivery` GUID for idempotency.
- **Slack:** `event_id` globally unique across all workspaces.
- **Telegram:** `update_id` for dedupe/ordering.
- **Recommended:** `event_id` = unique constraint on the outbox table; duplicate insert → no-op (INSERT OR IGNORE). This makes retries safe — the sender may redeliver, the receiver never double-processes.

### A2a1LR — status machine

- **Recommended:** `status: pending → processing → delivered / failed`, plus `attempts`, `next_retry_at`, `created_at`, `processed_at`.
- **Healthchecks.io** states: New → Up → Late → Down → Paused (a different machine, but the same idea — explicit state transitions).
- **Hookdeck:** delivery groups per tenant with independent queues and delivery rates.

### A2a1RL — same-DB write (transactional outbox)

- **Pattern:** write the event to the outbox table in the SAME DB transaction as the business logic that created it. A separate poller reads the outbox and publishes.
- **Why:** guarantees at-least-once delivery without distributed transactions. If the business logic commits, the event is durable.
- **For 9router:** the webhook route inserts the outbox row in one transaction; the worker polls. No external message broker needed (single-node local-first).

### A2a1RR — at-least-once guarantee

- At-least-once means the receiver may see duplicates → idempotency keys (A2a1LL) are mandatory.
- **Slack's mandate:** "Avoid actually processing and reacting to events within the same process. Implement a queue." — the outbox IS the queue.
- **Inngest:** durable function execution with automatic retries and idempotency keys — the same guarantee, SDK-based.

### A2a2LL — settings-gated startup

- **9router pattern:** `instrumentation.js` starts jobs only when settings enable them.
- **Recommended:** `settings.webhooks.enabled` gates the worker; `settings.webhooks.pollIntervalMs` (default e.g. 1000ms) controls frequency.

### A2a2LR — polling interval

- **Recommended:** 1s default (near-real-time for a local app); configurable. The worker is a `setInterval` in `instrumentation.js`, same as existing jobs.
- **LiteLLM** uses `report_check_interval: 3600` for its alert checks — but that's for digest reports, not event delivery.

### A2a2RL — exponential backoff

- **Stripe:** retries up to 3 days exponential backoff (live), 3 retries (sandbox).
- **Slack:** 3 retries (immediate, 1min, 5min) with `x-slack-retry-num` (1/2/3) and `x-slack-retry-reason`.
- **Recommended:** `next_retry_at = now + base * 2^attempts` (base 1s, cap 1h); dead-letter after 10 attempts (Stripe's 3-day window ≈ 10-12 attempts at this schedule).

### A2a2RR — dead-letter after N attempts

- **Recommended:** after N attempts (10), mark `status: "dead"` and surface in the dashboard event log (M5). Manual retry button (Hookdeck Console replay model).
- **Hookdeck:** manual/automatic retries; Console inspect/replay.

## L6 Leaf Summary

| Leaf | Finding | Precedent |
|------|---------|-----------|
| A2a1LL | `event_id` unique constraint, INSERT OR IGNORE | Stripe, GitHub, Slack, Telegram |
| A2a1LR | pending→processing→delivered/failed + attempts + next_retry_at | Healthchecks.io states, Hookdeck |
| A2a1RL | Outbox row in same DB transaction as business logic | Transactional Outbox pattern |
| A2a1RR | At-least-once + idempotency keys | Slack queue mandate, Inngest |
| A2a2LL | Settings-gated worker in instrumentation.js | 9router existing jobs |
| A2a2LR | 1s poll default, configurable | LiteLLM report_check_interval |
| A2a2RL | `base * 2^attempts`, cap 1h, 10 attempts | Stripe 3 days, Slack 3 retries |
| A2a2RR | Dead-letter + manual replay in dashboard | Hookdeck Console |

## Related Docs

- Master tree: `2026-09-15-webhook-master-research-tree.md`
- Flat research: `2026-09-15-webhook-receive-act-research.md` (Part 2 D1 Stripe, C1 Slack, D4 Hookdeck, E2 Healthchecks.io, F2 Transactional Outbox, F3 Message Queues, B7 Inngest)
- Plan: `../planning/2026-09-15-webhook-receive-act-plan.md` (M2)