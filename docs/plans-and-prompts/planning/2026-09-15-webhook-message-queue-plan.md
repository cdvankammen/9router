# Webhook Implementation Plan — Message Queue Backend (R32)

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (code ready for agent review)
**Tags:** #plan #webhook #implementation #code #r32 #queue #bullmq #redis

---

## ⚠️ AGENT REVIEW NOTE (READ FIRST)

> **⚠️ THIS PLAN IS A RESEARCH DOCUMENT — NOT AN IMPLEMENTATION INSTRUCTION.**
>
> **The code in this plan is a SUGGESTION / OPTION for future agents — it is NOT a final decision and NOT an instruction to implement anything.**
>
> Every agent that reads this plan MUST understand:
> - This plan documents **research-grade suggestions** for how a feature *could* be implemented
> - The code snippets show **possible approaches** (file paths, function signatures, patterns) — they are **options**, not requirements
> - **Nothing in this plan should be implemented automatically** — a future agent must evaluate each suggestion, decide if there's a better way, and only then proceed
> - The agent is the final arbiter: if a better approach exists, **make those changes happen** — update the code, note the improvement, and proceed
> - Do not treat this code as sacred. It follows 9router's existing conventions, but the agent decides what to use.

---

## Objective

Implement the message-queue backend option (R32): replace (or complement) the SQLite-polling worker with a real queue (BullMQ/Redis or in-process queue). This is the scale-up path when the outbox worker's 5s poll isn't enough.

## Scope

**In scope:**
- Option A: BullMQ + Redis (external dependency, production scale)
- Option B: in-process queue (p-queue style, zero deps, single instance)
- Queue adapter interface so the worker can swap backends
- Backpressure: bounded queue, drop-oldest policy

**Out of scope (v1):**
- Multi-instance deployment (needs Redis — Option A)
- Dead-letter UI

## Rationale & Design Decisions

**Purpose:** Give the event pipeline a real queue when SQLite polling or in-memory delivery isn't enough — backpressure, retries, and worker isolation.

**Research grounding:** R32 (exp-10 patterns/platforms) — see Related Docs below for the exact experiment documents this plan derives from.

**Key design decisions:**
- **Option A: BullMQ (Redis)** — battle-tested, rich features (delayed jobs, rate limits), but requires Redis.
- **Option B: in-process queue** — zero infra, drop-oldest backpressure, fine for local-gateway scale.
- **Queue adapter interface** — the rest of the system depends on `enqueue/dequeue`, not on the implementation, so the choice can change later.

**Trade-offs & risks:** Trade-off: Redis is operational overhead for a local app; in-process loses durability across restarts. The adapter keeps the decision reversible.

---
## Grounding in 9router

**Auth registration:** — (internal module)

Queue adapter is internal; enqueue happens from the M2 outbox worker started in `instrumentation.js`.

**Conventions this plan must follow:**
- Import `getSettings`/`updateSettings` from `@/lib/localDb` in route handlers (matches `src/app/api/settings/route.js`)
- Start workers from `src/instrumentation.js` (settings-gated, `NEXT_RUNTIME === "nodejs"`) — layout chunks tree-shake in standalone builds
- New migrations start at **006** (`src/lib/db/migrations/` currently ends at `005-seen-models.js`)
- Keep `export const dynamic = "force-dynamic"` on every route
- Strip secrets from request bodies and never return them in GET responses (CWE-915 pattern from `src/app/api/settings/route.js`)
- Reuse `src/shared/hookTemplate.js` for `{{field}}` expansion — it already exists

See `2026-10-03-webhook-grounding-in-9router.md` for the full discrepancy list.

---

## Files

| File | Action | Purpose |
|------|--------|---------|
| `src/lib/webhooks/queue.js` | new | Queue adapter interface |
| `src/lib/webhooks/queue/bullmq.js` | new | Option A: BullMQ backend |
| `src/lib/webhooks/queue/inprocess.js` | new | Option B: in-process backend |
| `src/lib/webhooks/worker.js` | edit | Use queue adapter |

## Code

### 1. `src/lib/webhooks/queue.js` — adapter interface

```js
// src/lib/webhooks/queue.js
// Queue adapter interface. The worker talks to this, not to a backend directly.
// Backends: bullmq.js (Redis) or inprocess.js (zero-dep).
import { getSettings } from "@/lib/db/repos/settingsRepo.js";

let backend = null;

export async function getQueue() {
  if (backend) return backend;
  const settings = await getSettings();
  const cfg = settings.webhookQueue || {};
  if (cfg.backend === "bullmq") {
    const { createBullMqQueue } = await import("./queue/bullmq.js");
    backend = createBullMqQueue(cfg);
  } else {
    const { createInProcessQueue } = await import("./queue/inprocess.js");
    backend = createInProcessQueue(cfg);
  }
  return backend;
}
```

### 2. `src/lib/webhooks/queue/inprocess.js` — Option B

```js
// src/lib/webhooks/queue/inprocess.js
// Zero-dependency in-process queue with bounded capacity + drop-oldest.
export function createInProcessQueue({ maxSize = 1000 } = {}) {
  const items = [];
  const waiting = [];

  return {
    async push(event) {
      if (items.length >= maxSize) items.shift(); // drop-oldest backpressure
      items.push(event);
      waiting.shift?.()?.();
    },
    async pop(timeoutMs = 5000) {
      if (items.length) return items.shift();
      return new Promise((resolve) => {
        const timer = setTimeout(() => resolve(null), timeoutMs);
        waiting.push(() => {
          clearTimeout(timer);
          resolve(items.shift() ?? null);
        });
      });
    },
    get size() {
      return items.length;
    },
  };
}
```

### 3. `src/lib/webhooks/queue/bullmq.js` — Option A

```js
// src/lib/webhooks/queue/bullmq.js
// BullMQ + Redis backend (requires redis connection config).
// NOTE: only implement if the agent decides Redis is warranted —
// adds an external dependency to 9router.
export function createBullMqQueue({ redisUrl, queueName = "webhook-events" }) {
  // const { Queue } = await import("bullmq");
  // const queue = new Queue(queueName, { connection: { url: redisUrl } });
  // return {
  //   async push(event) { await queue.add("deliver", event); },
  //   async pop() { /* worker pattern instead */ },
  // };
  return {
    async push() {
      throw new Error("bullmq backend not implemented — agent decision needed");
    },
    async pop() {
      throw new Error("bullmq backend not implemented — agent decision needed");
    },
  };
}
```

### 4. `src/lib/webhooks/worker.js` — use the adapter (edit)

```js
// Replace the 5s SQLite poll with queue-based consumption:
import { getQueue } from "./queue.js";

export async function startWebhookWorker() {
  const queue = await getQueue();
  // Loop: pop → deliver → markDelivered/markFailed
  // (keep the SQLite outbox as the source of truth; the queue is the delivery channel)
}
```

## Acceptance Criteria

- [ ] Queue adapter interface (worker doesn't know the backend)
- [ ] Option B: in-process bounded queue with drop-oldest
- [ ] Option A: BullMQ stub (agent decides if Redis is warranted)
- [ ] Backpressure policy documented

## Testing

```bash
# Unit test (tests/unit/webhook-queue.test.js)
# - inprocess: push/pop round-trip, bounded size, drop-oldest
# - adapter: default backend is inprocess
```

## Related Docs

- Research: `../research/2026-09-15-webhook-exp-10-patterns-platforms.md` (R32)
- Plan: `../planning/2026-09-15-webhook-m2-outbox-worker-plan.md` (worker)
- Interpretation: `../interpretation/2026-09-15-webhook-interpretation-guide.md`