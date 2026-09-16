# Exponential Branch 03 — Event Store & Worker (R09–R11)

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** active
**Tags:** #research #webhook #exponential #event-store #outbox #worker #retry #idempotency #branch-exp-03

## Objective

N-ary exponential expansion (6 levels, N children per node) of the event-store roots: R09 event store / outbox table, R10 worker & retry, R11 idempotency (event IDs).

## R09 — Event store / outbox table

```
L0 R09: EVENT STORE / OUTBOX TABLE
├─ L1: schema design
│  ├─ L2: columns
│  │  ├─ L3: id (event_id, UUID)
│  │  │  ├─ L4: idempotency key
│  │  │  │  ├─ L5: unique constraint
│  │  │  │  │  └─ L6: INSERT OR IGNORE dedupe
│  │  │  │  └─ L5: sender-provided vs generated
│  │  │  │     └─ L6: Stripe event id vs own UUID
│  │  │  └─ L4: UUID v4 vs v7
│  │  │     ├─ L5: v4 random
│  │  │     │  └─ L6: no ordering
│  │  │     └─ L5: v7 time-ordered
│  │  │        └─ L6: index-friendly
│  │  ├─ L3: endpoint_id (FK)
│  │  │  ├─ L4: which webhook endpoint
│  │  │  └─ L4: cascade delete
│  │  ├─ L3: payload (JSON text)
│  │  │  ├─ L4: raw body stored
│  │  │  │  ├─ L5: for replay
│  │  │  │  └─ L5: for rule matching
│  │  │  └─ L4: size guard
│  │  │     └─ L5: 1MB cap (R03)
│  │  ├─ L3: headers (JSON)
│  │  │  ├─ L4: signature headers
│  │  │  └─ L4: content-type
│  │  ├─ L3: received_at (timestamp)
│  │  │  ├─ L4: ISO 8601
│  │  │  └─ L4: index for queries
│  │  ├─ L3: status (state machine)
│  │  │  ├─ L4: pending
│  │  │  │  └─ L5: enqueued, not processed
│  │  │  ├─ L4: processing
│  │  │  │  └─ L5: worker picked up
│  │  │  ├─ L4: delivered
│  │  │  │  └─ L5: actions completed
│  │  │  ├─ L4: failed
│  │  │  │  └─ L5: retries exhausted
│  │  │  └─ L4: dead_letter
│  │  │     └─ L5: manual review
│  │  ├─ L3: attempts (int)
│  │  │  └─ L4: retry counter
│  │  ├─ L3: next_retry_at (timestamp)
│  │  │  └─ L4: backoff schedule
│  │  └─ L3: last_error (text)
│  │     └─ L4: for debugging
│  └─ L2: table name & location
│     ├─ L3: webhook_events
│     │  └─ L4: src/lib/db/migrations/
│     ├─ L3: same DB as settings (transactional outbox)
│     │  ├─ L4: atomic write with rule state
│     │  └─ L4: no distributed tx
│     └─ L3: SQLite adapter chain (bun→better→node→sql.js)
│        └─ L4: driver.js pattern
├─ L1: transactional outbox pattern
│  ├─ L2: write event + state in one tx
│  │  ├─ L3: Stripe-style event log
│  │  │  └─ L4: source of truth
│  │  ├─ L3: outbox as queue
│  │  │  ├─ L4: worker polls
│  │  │  └─ L4: no broker needed
│  │  └─ L3: at-least-once delivery
│  │     ├─ L4: retries on failure
│  │     └─ L4: idempotent consumers
│  └─ L2: vs message queue
│     ├─ L3: RabbitMQ/Redis (overkill)
│     │  └─ L4: single-node local-first
│     └─ L3: SQLite outbox (right fit)
│        └─ L4: zero new infra
├─ L1: retention & cleanup
│  ├─ L2: TTL policy
│  │  ├─ L3: delivered events purged after N days
│  │  │  └─ L4: settings-gated
│  │  └─ L3: failed kept longer
│  │     └─ L4: for debugging
│  ├─ L2: size management
│  │  ├─ L3: payload column bloat
│  │  │  └─ L4: prune old rows
│  │  └─ L3: index maintenance
│  │     └─ L4: VACUUM
│  └─ L2: audit trail
│     ├─ L3: keep last N events per endpoint
│     └─ L3: dashboard history view
└─ L1: observability
   ├─ L2: counts by status
   │  ├─ L3: dashboard widget
   │  └─ L3: usageDb integration
   ├─ L2: latency tracking
   │  ├─ L3: received→delivered
   │  └─ L3: p95 alert
   └─ L2: dead-letter review
      ├─ L3: UI list
      └─ L3: manual replay button
```

## R10 — Worker & retry

```
L0 R10: WORKER & RETRY
├─ L1: worker lifecycle
│  ├─ L2: startup (instrumentation.js pattern)
│  │  ├─ L3: settings-gated
│  │  │  ├─ L4: webhookWorker.enabled
│  │  │  │  └─ L5: DEFAULT_SETTINGS key
│  │  │  └─ L4: start on boot
│  │  │     └─ L5: instrumentation.js register
│  │  ├─ L3: single instance
│  │  │  └─ L4: no multi-node race
│  │  └─ L3: graceful shutdown
│  │     └─ L4: drain in-flight
│  ├─ L2: polling loop
│  │  ├─ L3: interval (default 1s)
│  │  │  ├─ L4: configurable
│  │  │  └─ L4: SELECT pending LIMIT 10
│  │  ├─ L3: claim (processing status)
│  │  │  ├─ L4: UPDATE ... WHERE status=pending
│  │  │  └─ L4: crash recovery (stale processing → pending)
│  │  └─ L3: batch size
│  │     └─ L4: 10 per tick
│  └─ L2: processing
│     ├─ L3: match rules (R12)
│     │  └─ L4: rule engine call
│     ├─ L3: execute actions (R14)
│     │  └─ L4: notify/http/llm/gateway/dashboard
│     └─ L3: mark delivered
│        └─ L4: status transition
├─ L1: retry policy
│  ├─ L2: exponential backoff
│  │  ├─ L3: base 1s, factor 2
│  │  │  ├─ L4: 1s → 2s → 4s → 8s
│  │  │  │  └─ L5: max 5min
│  │  │  └─ L4: jitter
│  │  │     └─ L5: ±20% random
│  │  ├─ L3: max attempts
│  │  │  ├─ L4: default 5
│  │  │  │  └─ L5: configurable
│  │  │  └─ L4: Stripe 3-day window
│  │  │     └─ L5: 9router: shorter (local)
│  │  └─ L3: retry on which errors
│  │     ├─ L4: network (ECONNREFUSED)
│  │     ├─ L4: 5xx upstream
│  │     └─ L4: NOT on 4xx (permanent)
│  │        └─ L5: fail fast
│  └─ L2: dead-letter
│     ├─ L3: after max attempts
│     │  ├─ L4: status=dead_letter
│     │  └─ L4: last_error stored
│     ├─ L3: manual replay
│     │  └─ L4: dashboard action
│     └─ L3: alert on dead-letter
│        └─ L4: notify action (R14)
├─ L1: concurrency
│  ├─ L2: single worker
│  │  ├─ L3: serial processing
│  │  │  └─ L4: simple, ordered
│  │  └─ L3: per-endpoint ordering
│  │     └─ L4: FIFO per endpoint_id
│  ├─ L2: parallel workers (v2)
│  │  ├─ L3: N workers
│  │  │  └─ L4: configurable
│  │  └─ L3: claim-based
│  │     └─ L4: no double-processing
│  └─ L2: backpressure
│     ├─ L3: queue depth metric
│     └─ L3: pause on overload
└─ L1: failure modes
   ├─ L2: worker crash mid-processing
   │  ├─ L3: stale claim recovery
   │  │  └─ L4: timeout-based reset
   │  └─ L3: at-least-once preserved
   │     └─ L4: idempotent actions (R11)
   ├─ L2: DB locked (SQLite)
   │  ├─ L3: busy_timeout
   │  └─ L3: WAL mode
   └─ L2: action hangs
      ├─ L3: per-action timeout
      └─ L3: kill + retry
```

## R11 — Idempotency (event IDs)

```
L0 R11: IDEMPOTENCY (EVENT IDS)
├─ L1: why idempotency
│  ├─ L2: at-least-once delivery
│  │  ├─ L3: retries duplicate events
│  │  │  ├─ L4: Slack retries ×3
│  │  │  │  └─ L5: x-slack-retry-num
│  │  │  └─ L4: Stripe 3-day retries
│  │  │     └─ L5: same event id
│  │  └─ L3: duplicate processing = double actions
│  │     └─ L4: double notify, double http
│  └─ L2: sender-side dedupe
│     ├─ L3: Stripe event id
│     ├─ L3: GitHub delivery GUID
│     └─ L3: Svix webhook-id header
├─ L1: implementation
│  ├─ L2: unique constraint on event_id
│  │  ├─ L3: INSERT OR IGNORE
│  │  │  ├─ L4: first write wins
│  │  │  └─ L4: duplicate → 200 (already known)
│  │  └─ L3: composite (endpoint_id, event_id)
│  │     └─ L4: per-endpoint uniqueness
│  ├─ L2: sender event_id vs own UUID
│  │  ├─ L3: prefer sender id
│  │  │  └─ L4: Stripe/GitHub/Svix provide
│  │  └─ L3: generate if absent
│  │     └─ L4: UUID v4
│  └─ L2: duplicate window
│     ├─ L3: 5-min tolerance (Slack)
│     │  └─ L4: configurable
│     └─ L3: permanent dedupe
│        └─ L4: unique constraint forever
├─ L1: idempotent actions
│  ├─ L2: notify
│  │  ├─ L3: duplicate notification acceptable
│  │  │  └─ L4: low harm
│  │  └─ L3: dedupe by event_id (v2)
│  │     └─ L4: Alertmanager min-interval
│  ├─ L2: http
│  │  ├─ L3: include event_id in body
│  │  │  └─ L4: receiver dedupes
│  │  └─ L3: Idempotency-Key header
│  │     └─ L4: Stripe pattern
│  ├─ L2: gateway toggle
│  │  ├─ L3: set state not flip
│  │  │  └─ L4: idempotent by design
│  │  └─ L3: check current state
│  │     └─ L4: no-op if already
│  └─ L2: llm
│     ├─ L3: expensive, dedupe critical
│     │  └─ L4: event_id in prompt context
│     └─ L3: cache result by event_id
│        └─ L4: v2
└─ L1: edge cases
   ├─ L2: same id different payload
   │  ├─ L3: reject (conflict)
   │  └─ L3: log warning
   ├─ L2: id collision (UUID)
   │  └─ L3: negligible
   └─ L2: replay after purge
      ├─ L3: TTL purged rows
      └─ L3: re-processed (acceptable)
```

## L6 Leaf Summary

| Leaf | Finding | Precedent |
|------|---------|-----------|
| R09-L6-1 | INSERT OR IGNORE dedupe on event_id | Stripe event log |
| R09-L6-2 | UUID v7 time-ordered for index-friendly | UUID spec |
| R09-L6-3 | Raw body stored for replay + rule matching | Svix |
| R09-L6-4 | Status machine: pending→processing→delivered/failed/dead_letter | Outbox pattern |
| R09-L6-5 | Same DB as settings = transactional outbox | Microservices.io |
| R09-L6-6 | SQLite adapter chain for zero new infra | 9router driver.js |
| R10-L6-1 | Settings-gated worker via instrumentation.js | 9router pattern |
| R10-L6-2 | Claim-based polling, stale recovery | SQS visibility timeout |
| R10-L6-3 | Exponential backoff 1s→2s→4s, jitter, max 5 | Stripe |
| R10-L6-4 | Retry network/5xx, not 4xx | HTTP semantics |
| R10-L6-5 | Dead-letter + manual replay + alert | SQS DLQ |
| R11-L6-1 | Unique constraint = permanent dedupe | Stripe/GitHub/Svix |
| R11-L6-2 | Prefer sender event_id, generate if absent | Svix webhook-id |
| R11-L6-3 | 5-min duplicate window configurable | Slack |
| R11-L6-4 | http action carries event_id for receiver dedupe | Stripe Idempotency-Key |
| R11-L6-5 | Gateway toggle = set state, not flip | Idempotent design |

## Related Docs

- Master map: `2026-09-15-webhook-exponential-master-map.md`
- Prior 2-way spine: `2026-09-15-webhook-master-research-tree.md`, `2026-09-15-webhook-branch-a2a-event-store.md`
- Flat research: `2026-09-15-webhook-receive-act-research.md` (Part 4 M2, Part 5 D5, Part 2 F2)
- Plan: `../planning/2026-09-15-webhook-receive-act-plan.md` (M2)