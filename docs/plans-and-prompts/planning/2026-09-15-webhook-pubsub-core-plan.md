# Webhook Implementation Plan — EventEmitter / Pub-Sub Core (R30)

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (code ready for agent review)
**Tags:** #plan #webhook #implementation #code #r30 #pubsub #eventemitter

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

## Rationale & Design Decisions

**Purpose:** Provide the internal typed event bus that all other webhook features (rules, outbound triggers, feeds) consume — one publish/subscribe core instead of ad-hoc hooks.

**Research grounding:** R30 (exp-10 patterns/platforms) — see Related Docs below for the exact experiment documents this plan derives from.

**Key design decisions:**
- **Typed events with wildcard subscription** — subscribers match exact or `*` patterns; the event vocabulary from M4 is the type system.
- **Fail-open subscribers** — a throwing subscriber is caught and logged; the bus never breaks the publisher.
- **Outbox bridge** — the bus can be backed by the M2 outbox for durable delivery, or run in-memory for speed; the interface is the same.

**Trade-offs & risks:** Trade-off: a bus adds indirection; for a single-process gateway the in-memory mode is nearly free, and the outbox bridge keeps durability when needed.

---
## Grounding in 9router

**Auth registration:** — (internal module)

Mirror the existing `usageDb.statsEmitter` + `api/usage/stream` pattern instead of a parallel bus.

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