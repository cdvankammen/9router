# Webhook Implementation Plan — Message Queue Backend (R32)

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (code ready for agent review)
**Tags:** #plan #webhook #implementation #code #r32 #queue #bullmq #redis

---

## ⚠️ AGENT REVIEW NOTE (READ FIRST)

> **The code in this plan is a starting point, not a final decision.**
> Every agent that reads this plan MUST review the code below and make a decision:
> is there a better way to implement this? If yes, **make those changes happen** —
> update the code, note the improvement, and proceed. Do not treat this code as
> sacred. It follows 9router's existing conventions, but the agent is the final
> arbiter of implementation quality.

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