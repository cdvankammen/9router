# Webhook Implementation Plan — EventEmitter / Pub-Sub Core (R30)

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (code ready for agent review)
**Tags:** #plan #webhook #implementation #code #r30 #pubsub #eventemitter

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

Implement the EventEmitter / pub-sub core (R30): a typed in-process event bus that decouples producers (quota, chat, model catalog) from consumers (rule engine, dashboard SSE, digest). This is the foundation the M4 emitter builds on — events flow through the bus AND the outbox.

## Scope

**In scope:**
- Typed event bus: `on(type, handler)` / `emit(type, data)` / `off(type, handler)`
- Wildcard listeners (`*`)
- Async handlers with fail-open semantics
- Bridge: bus → outbox (persistence) + bus → rule engine (M3)

**Out of scope (v1):**
- Cross-process pub-sub (Redis, etc.) — separate plan R32
- Event replay from the bus (outbox covers this)

## Files

| File | Action | Purpose |
|------|--------|---------|
| `src/lib/webhooks/bus.js` | new | Typed event bus |
| `src/lib/webhooks/emitter.js` | edit | Route through the bus |

## Code

### 1. `src/lib/webhooks/bus.js`

```js
// src/lib/webhooks/bus.js
// Typed in-process event bus. Fail-open: handler errors never break emit.
const g = (global.__webhookBus ??= { handlers: new Map() });

/**
 * Subscribe to an event type ("*" for all).
 * @param {string} type
 * @param {(event: object) => void | Promise<void>} handler
 * @returns {() => void} unsubscribe
 */
export function on(type, handler) {
  if (!g.handlers.has(type)) g.handlers.set(type, new Set());
  g.handlers.get(type).add(handler);
  return () => g.handlers.get(type)?.delete(handler);
}

/**
 * Emit an event to all matching handlers (exact type + wildcard).
 * @param {{type: string, data: object}} event
 */
export async function emit(event) {
  const targets = new Set([...(g.handlers.get(event.type) || []), ...(g.handlers.get("*") || [])]);
  await Promise.allSettled(
    [...targets].map(async (handler) => {
      try {
        await handler(event);
      } catch (err) {
        console.error(`[webhook-bus] handler error for ${event.type}:`, err?.message || err);
      }
    })
  );
}

/**
 * List subscribed types (debug/observability).
 * @returns {string[]}
 */
export function listSubscriptions() {
  return [...g.handlers.keys()];
}
```

### 2. `src/lib/webhooks/emitter.js` — route through the bus (edit)

```js
// In emitEvent, after inserting into the outbox, also emit on the bus:
import { emit } from "./bus.js";

export async function emitEvent({ type, data, eventId }) {
  try {
    await insertEvent({ eventId: eventId || randomUUID(), webhookId: "internal", payload: { type, data, emittedAt: new Date().toISOString() } });
  } catch (err) {
    console.error("[webhook-emitter] emit failed:", err?.message || err);
  }
  // In-process delivery (rule engine, dashboard SSE, etc.)
  await emit({ type, data });
}
```

### 3. Wiring in `src/instrumentation.js`

```js
// Subscribe the rule engine (M3) to the bus:
const { on } = await import("@/lib/webhooks/bus.js");
const { dispatchEvent } = await import("@/lib/webhooks/rules.js");
on("*", (event) => dispatchEvent(event));
```

## Acceptance Criteria

- [ ] `on`/`emit`/`off` with exact-type + wildcard matching
- [ ] Handler errors fail open (Promise.allSettled)
- [ ] Emitter writes to outbox AND bus
- [ ] Rule engine subscribes via `on("*")`

## Testing

```bash
# Unit test (tests/unit/webhook-bus.test.js)
# - on/emit/off round-trip
# - wildcard receives all events
# - throwing handler doesn't break other handlers
```

## Related Docs

- Research: `../research/2026-09-15-webhook-exp-10-patterns-platforms.md` (R30)
- Plan: `../planning/2026-09-15-webhook-m4-outbound-triggers-plan.md` (emitter)
- Interpretation: `../interpretation/2026-09-15-webhook-interpretation-guide.md`