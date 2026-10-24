# Webhook Implementation Plan — Stripe Webhook Model (R26)

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (code ready for agent review)
**Tags:** #plan #webhook #implementation #code #r26 #stripe #standards

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

Implement the Stripe webhook model (R26): event-type versioning, idempotency keys, signature verification, retries with exponential backoff, and event replay. This is the gold-standard receiver pattern — 9router's inbound webhooks should follow it.

## Scope

**In scope:**
- Event envelope: `{id, object: "event", type, created, data: {object}}`
- Idempotency: `Idempotency-Key` header → dedupe via event_id PK
- Signature verification (already in M1) + event-type allowlist
- Retry semantics: 3 retries, exponential backoff, `Stripe-Signature`-style header
- Event replay endpoint (re-deliver a stored event)

**Out of scope (v1):**
- Stripe-specific payment objects — only the webhook *pattern*
- Account/connect webhooks

## Rationale & Design Decisions

**Purpose:** Adopt Stripe's webhook conventions (envelope, idempotency, typed events, replay) as the inbound contract, giving senders a familiar, robust integration surface.

**Research grounding:** R26 (exp-09 standards/infra) — see Related Docs below for the exact experiment documents this plan derives from.

**Key design decisions:**
- **Envelope with `type` + `data`** — one endpoint, typed events; consumers filter by type, exactly like Stripe's `event.type`.
- **`Idempotency-Key` support** — replay-safe delivery without double-processing, using the outbox event id.
- **Type allowlist** — only configured event types are accepted, reducing attack surface and noise.
- **Replay endpoint** — a dashboard/API action to re-deliver a past event, matching Stripe's dashboard replay.

**Trade-offs & risks:** Trade-off: Stripe's model is sender-centric (they define the envelope); it's the right contract when 9router is the *receiver*. When 9router is the *sender*, the standards-compliance plan (R28) governs instead.

---
## Grounding in 9router

**Auth registration:** `src/app/api/webhooks/stripe/[id]/route.js` → **`PUBLIC_API_PATHS`**

Sender-centric inbound envelope; signature verification is the auth.

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
| `src/lib/webhooks/envelope.js` | new | Stripe-style event envelope builder |
| `src/lib/webhooks/replay.js` | new | Event replay (re-deliver stored event) |
| `src/app/api/webhooks/[id]/route.js` | edit | Envelope + idempotency + type allowlist |
| `src/app/api/webhooks/replay/route.js` | new | POST replay endpoint |

## Code

### 1. `src/lib/webhooks/envelope.js`

```js
// src/lib/webhooks/envelope.js
// Stripe-style event envelope: {id, object, type, created, data}.
import { randomUUID } from "node:crypto";

/**
 * Wrap a payload in a Stripe-style event envelope.
 * @param {string} type - e.g. "provider.error"
 * @param {object} object - the event data
 * @param {string} [id] - optional explicit event id (idempotency)
 * @returns {object}
 */
export function buildEnvelope(type, object, id) {
  return {
    id: id || `evt_${randomUUID().replace(/-/g, "")}`,
    object: "event",
    type,
    created: Math.floor(Date.now() / 1000),
    data: { object },
  };
}

/**
 * Validate an event type against the allowlist.
 * @param {string} type
 * @param {string[]} allowlist
 * @returns {boolean}
 */
export function isAllowedType(type, allowlist) {
  if (!allowlist?.length) return true; // empty allowlist = allow all
  return allowlist.includes(type);
}
```

### 2. `src/lib/webhooks/replay.js`

```js
// src/lib/webhooks/replay.js
// Re-deliver a stored event (Stripe dashboard "resend event" pattern).
import { getAdapter } from "@/lib/db/driver.js";
import { insertEvent } from "@/lib/db/repos/webhookEventsRepo.js";

/**
 * Replay a stored event into the outbox.
 * @param {string} eventId - the stored event's id
 * @returns {Promise<{ok: boolean, error?: string}>}
 */
export async function replayEvent(eventId) {
  const db = await getAdapter();
  const row = await db.get("SELECT * FROM webhook_events WHERE event_id = ?", [eventId]);
  if (!row) return { ok: false, error: "event not found" };

  // Re-insert with a fresh event_id so the worker delivers it again
  await insertEvent({
    eventId: `replay_${eventId}_${Date.now()}`,
    webhookId: row.webhook_id,
    payload: row.payload,
  });
  return { ok: true };
}
```

### 3. `src/app/api/webhooks/replay/route.js`

```js
// src/app/api/webhooks/replay/route.js
// POST /api/webhooks/replay — re-deliver a stored event.
import { NextResponse } from "next/server";
import { replayEvent } from "@/lib/webhooks/replay.js";

export const dynamic = "force-dynamic";

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  if (!body.eventId) {
    return NextResponse.json({ error: "eventId required" }, { status: 400 });
  }
  const result = await replayEvent(body.eventId);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
```

### 4. `src/app/api/webhooks/[id]/route.js` — envelope + idempotency (edit)

```js
// In the POST handler, after signature verification (M1):
import { buildEnvelope, isAllowedType } from "@/lib/webhooks/envelope.js";

// 1. Idempotency: use Idempotency-Key header as event id if present
const idemKey = request.headers.get("idempotency-key");
const eventId = idemKey || undefined;

// 2. Type allowlist from webhook config
const webhook = await getWebhook(id);
if (!isAllowedType(body.type, webhook.allowedTypes)) {
  return NextResponse.json({ error: "event type not allowed" }, { status: 400 });
}

// 3. Wrap in envelope and insert into outbox
const envelope = buildEnvelope(body.type, body, eventId);
await insertEvent({
  eventId: envelope.id,
  webhookId: id,
  payload: envelope,
});
return NextResponse.json({ received: true, id: envelope.id }, { status: 200 });
```

## Acceptance Criteria

- [ ] Inbound events wrapped in Stripe-style envelope
- [ ] `Idempotency-Key` header → dedupe (PK conflict → 200 with existing id)
- [ ] Event-type allowlist per webhook
- [ ] Replay endpoint re-delivers stored events

## Testing

```bash
# Unit test (tests/unit/webhook-envelope.test.js)
# - buildEnvelope shape: id/object/type/created/data
# - isAllowedType: allowlist + empty allowlist
# - replayEvent: missing event → error; existing → re-inserted
```

## Related Docs

- Research: `../research/2026-09-15-webhook-exp-09-standards-infra.md` (R26)
- Plan: `../planning/2026-09-15-webhook-m1-receiver-hmac-plan.md` (receiver)
- Interpretation: `../interpretation/2026-09-15-webhook-interpretation-guide.md`