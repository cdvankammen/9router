# Webhook Implementation Plan — Standards Compliance (Standard Webhooks / Svix / Zapier)

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (code ready for agent review)
**Tags:** #plan #webhook #implementation #code #standards #svix #zapier #compliance

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

Implement standards compliance for the webhook system: the Standard Webhooks spec (headers, HMAC, timestamp tolerance), Svix-compatible endpoints, and Zapier-style payload envelopes. This overlaps with M1 (receiver) — this plan goes deeper on the spec details and adds the outbound side.

## Scope

**In scope:**
- Standard Webhooks spec: `webhook-id`, `webhook-timestamp`, `webhook-signature` headers; HMAC SHA-256 over `id.timestamp.rawBody`; 5-min tolerance; `v1,<sig>` format
- Svix-compatible: `svix-id`, `svix-timestamp`, `svix-signature` (same scheme, different names)
- Zapier-style: `X-Zapier-*` headers + `payload` envelope
- Outbound: sign outgoing events with the same scheme (so 9router can be a sender too)

**Out of scope (v1):**
- Svix server (full product) — just the wire format
- Ed25519 signatures (Svix supports them; HMAC is the default)

## Rationale & Design Decisions

**Purpose:** Make 9router's webhook implementation conform to the Standard Webhooks specification end-to-end, so it interoperates with the ecosystem (Svix, Hookdeck, SDKs).

**Research grounding:** R28 (exp-09 standards/infra) — see Related Docs below for the exact experiment documents this plan derives from.

**Key design decisions:**
- **Full spec surface** — signing, `webhook-*` headers, timestamp tolerance, idempotency, and the `message.attempt` retry model all implemented per spec, not approximated.
- **Spec-first verification** — acceptance criteria are written directly from the spec's MUST/SHOULD language.
- **Interop test** — a conformance check against a spec-compliant sender (e.g., Svix CLI) is part of Testing, proving real-world compatibility.

**Trade-offs & risks:** Trade-off: full compliance is more work than a minimal receiver (M1) — but it's the difference between 'works for us' and 'works with the ecosystem'. If strict compliance isn't needed, M1 alone suffices.

---
## Grounding in 9router

**Auth registration:** `src/app/api/webhooks/[id]/route.js` → **`PUBLIC_API_PATHS`**

Extends M1's route; spec compliance changes verification, not authorization.

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
| `src/lib/webhooks/verify.js` | edit | Support Svix header names |
| `src/lib/webhooks/sign.js` | new | Outbound signing (Standard Webhooks) |
| `src/lib/webhooks/worker.js` | edit | Sign outbound deliveries |

## Code

### 1. `src/lib/webhooks/verify.js` — support Svix header names

```js
// src/lib/webhooks/verify.js (updated)
// Standard Webhooks spec + Svix-compatible header names.
import { createHmac, timingSafeEqual } from "node:crypto";

const MAX_AGE_MS = 5 * 60 * 1000; // 5-minute timestamp tolerance

/**
 * Verify a webhook signature.
 * Supports both Standard Webhooks (webhook-*) and Svix (svix-*) header names.
 * @param {object} headers - request headers (lowercased keys)
 * @param {string} rawBody - the raw request body (string)
 * @param {string} secret - the endpoint secret
 * @returns {{ok: boolean, error?: string}}
 */
export function verifyWebhookSignature(headers, rawBody, secret) {
  const id = headers["webhook-id"] || headers["svix-id"];
  const timestamp = headers["webhook-timestamp"] || headers["svix-timestamp"];
  const signature = headers["webhook-signature"] || headers["svix-signature"];

  if (!id || !timestamp || !signature) {
    return { ok: false, error: "missing webhook headers" };
  }

  // Timestamp tolerance (5 min)
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > MAX_AGE_MS / 1000) {
    return { ok: false, error: "timestamp outside tolerance" };
  }

  const expected = createHmac("sha256", secret)
    .update(`${id}.${timestamp}.${rawBody}`)
    .digest("base64");

  // Format: v1,<base64-hmac> — may contain multiple signatures, comma-separated
  const provided = signature
    .split(" ")
    .flatMap((part) => part.split(","))
    .map((s) => s.trim())
    .filter((s) => s.startsWith("v1,"))
    .map((s) => s.slice(3));

  const ok = provided.some((sig) => {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    return a.length === b.length && timingSafeEqual(a, b);
  });

  return ok ? { ok: true } : { ok: false, error: "signature mismatch" };
}
```

### 2. `src/lib/webhooks/sign.js` — outbound signing

```js
// src/lib/webhooks/sign.js
// Outbound signing per Standard Webhooks spec — lets 9router be a sender too.
import { createHmac } from "node:crypto";
import { randomUUID } from "node:crypto";

/**
 * Sign an outbound payload.
 * @param {string} rawBody - raw JSON string to send
 * @param {string} secret - endpoint secret
 * @returns {{id: string, timestamp: string, signature: string, headers: object}}
 */
export function signWebhookPayload(rawBody, secret) {
  const id = randomUUID();
  const timestamp = String(Math.floor(Date.now() / 1000));
  const signature = createHmac("sha256", secret)
    .update(`${id}.${timestamp}.${rawBody}`)
    .digest("base64");

  return {
    id,
    timestamp,
    signature: `v1,${signature}`,
    headers: {
      "webhook-id": id,
      "webhook-timestamp": timestamp,
      "webhook-signature": `v1,${signature}`,
      "content-type": "application/json",
    },
  };
}
```

### 3. `src/lib/webhooks/worker.js` — sign outbound deliveries

```js
// src/lib/webhooks/worker.js (updated)
// When delivering an event to an outbound URL, sign it first.
import { signWebhookPayload } from "./sign.js";

// Inside the delivery function, before proxyAwareFetch:
const rawBody = JSON.stringify(event.payload);
const signed = signWebhookPayload(rawBody, webhook.secret);
const res = await proxyAwareFetch(webhook.url, {
  method: "POST",
  headers: signed.headers,
  body: rawBody,
});
```

### 4. Zapier-style envelope (optional)

```js
// Zapier-style: X-Zapier-* headers + payload envelope.
// If a webhook has `zapier: true`, wrap the payload:
const zapierEnvelope = {
  payload: event.payload,
  meta: {
    event_id: event.event_id,
    webhook_id: event.webhook_id,
    created_at: event.created_at,
  },
};
// Headers: X-Zapier-Event-Type: <event.type>, X-Zapier-Event-Id: <event.event_id>
```

## Acceptance Criteria

- [ ] Standard Webhooks headers verified (id/timestamp/signature, 5-min tolerance)
- [ ] Svix header names accepted (`svix-*` aliases)
- [ ] Outbound events signed per spec (9router as sender)
- [ ] Zapier-style envelope optional per webhook

## Testing

```bash
# Unit test (tests/unit/webhook-standards.test.js)
# - verify: valid signature passes; tampered body fails; old timestamp fails
# - verify: svix-* headers accepted
# - sign: output verifies with verify()
# - round-trip: sign → verify passes
```

## Related Docs

- Research: `../research/2026-09-15-webhook-exp-02-standards-specs.md` (R04–R06), `../research/2026-09-15-webhook-exp-03-ecosystem-tools.md` (R07–R11)
- Plan: `../planning/2026-09-15-webhook-receive-act-plan.md` (M1 receiver)
- Interpretation: `../interpretation/2026-09-15-webhook-interpretation-guide.md`