# Webhook Implementation Plan — M1: Inbound Receiver + HMAC Verification

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (code ready for agent review)
**Tags:** #plan #webhook #implementation #code #m1 #receiver #hmac

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

Implement M1 of the webhook system: the inbound HTTP receiver with HMAC verification (Standard Webhooks spec). This is the entry point — everything else (outbox, rules, actions) consumes events from here.

## Scope

**In scope:**
- `POST /api/webhooks/[id]` route handler
- HMAC verification util (Standard Webhooks spec: `webhook-id`, `webhook-timestamp`, `webhook-signature`)
- Webhook config registry (settings-backed CRUD)
- Settings defaults for `webhooks` config
- Raw body preservation for HMAC

**Out of scope (v1):**
- Outbox table + worker (M2)
- Rule engine + actions (M3)
- Outbound triggers (M4)
- Dashboard UI (M5)

## Rationale & Design Decisions

**Purpose:** Provide the inbound entry point for the webhook system: a verified HTTP receiver that accepts events from external senders and makes them available to the rest of the pipeline (outbox, rules, actions).

**Research grounding:** R01–R08 (exp-01 receiver transport, exp-02 auth/secrets) — see Related Docs below for the exact experiment documents this plan derives from.

**Key design decisions:**
- **Standard Webhooks spec headers** (`webhook-id`, `webhook-timestamp`, `webhook-signature`) — chosen over custom auth because it is a published, interoperable standard (used by Stripe, GitHub, Svix) and gives replay protection + idempotency for free.
- **HMAC SHA-256 with `crypto.timingSafeEqual`** — constant-time comparison prevents timing attacks; raw-body preservation is required so the signature is computed over exactly what was sent.
- **Settings-backed registry** (via `settingsRepo`) — webhook configs live in the same persistence layer as the rest of 9router's config, no new DB table needed for v1.
- **5-minute timestamp tolerance** — matches the spec's default and rejects stale replays without requiring a full replay-protection store.

**Trade-offs & risks:** Trade-off: settings-backed registry is simpler but not queryable at scale; if webhook counts grow, migrate to a dedicated table (see M2 outbox). HMAC-only auth means the secret must be shared out-of-band — acceptable for a local-first gateway.

---
## Grounding in 9router

**Auth registration:** `src/app/api/webhooks/[id]/route.js` → **`src/dashboardGuard.js` → `PUBLIC_API_PATHS`**

Inbound webhooks are called by third parties with an HMAC signature, NOT a dashboard JWT. The HMAC verify in `verify.js` IS the auth for this route, so it must not also require a session.

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
| `src/lib/webhooks/verify.js` | new | HMAC verification util |
| `src/lib/webhooks/registry.js` | new | Webhook config CRUD (settings-backed) |
| `src/app/api/webhooks/[id]/route.js` | new | POST handler |
| `src/lib/db/repos/settingsRepo.js` | edit | Add `webhooks` default |

## Code

### 1. `src/lib/webhooks/verify.js` — HMAC verification

```js
// src/lib/webhooks/verify.js
// Standard Webhooks spec HMAC verification.
// Headers: webhook-id, webhook-timestamp, webhook-signature (v1,<hmac>)
import crypto from "node:crypto";

const MAX_TIMESTAMP_AGE_MS = 5 * 60 * 1000; // 5 minutes (Stripe/Svix tolerance)

/**
 * Verify a webhook signature.
 * @param {string} secret - the webhook secret (UUID-as-password)
 * @param {string} body - the RAW request body (must be req.text(), NOT parsed JSON)
 * @param {object} headers - request headers
 * @returns {{ok: boolean, reason?: string}}
 */
export function verifyWebhookSignature(secret, body, headers) {
  const id = headers.get("webhook-id");
  const timestamp = headers.get("webhook-timestamp");
  const signatureHeader = headers.get("webhook-signature");

  if (!id || !timestamp || !signatureHeader) {
    return { ok: false, reason: "missing webhook headers" };
  }

  // Timestamp tolerance (replay protection)
  const ts = Number(timestamp);
  if (!Number.isFinite(ts)) {
    return { ok: false, reason: "invalid timestamp" };
  }
  const ageMs = Date.now() - ts * 1000;
  if (Math.abs(ageMs) > MAX_TIMESTAMP_AGE_MS) {
    return { ok: false, reason: "stale timestamp" };
  }

  // Extract v1 signature(s) — spec allows multiple, comma-separated
  const signatures = signatureHeader
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.startsWith("v1,"))
    .map((s) => s.slice(3));

  if (signatures.length === 0) {
    return { ok: false, reason: "no v1 signature" };
  }

  // Compute expected HMAC over: id + "." + timestamp + "." + body
  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${id}.${timestamp}.${body}`)
    .digest("base64");

  // Constant-time compare (timingSafeEqual throws on length mismatch — guard)
  const expectedBuf = Buffer.from(expected);
  for (const sig of signatures) {
    const sigBuf = Buffer.from(sig);
    if (sigBuf.length === expectedBuf.length && crypto.timingSafeEqual(sigBuf, expectedBuf)) {
      return { ok: true };
    }
  }
  return { ok: false, reason: "signature mismatch" };
}
```

### 2. `src/lib/webhooks/registry.js` — Webhook config CRUD

```js
// src/lib/webhooks/registry.js
// Webhook endpoint config, stored in settings (settingsRepo pattern).
import { getSettings, updateSettings } from "@/lib/db/repos/settingsRepo.js";
import { randomUUID } from "node:crypto";

/**
 * List all webhook endpoints.
 * @returns {Promise<Array>}
 */
export async function listWebhooks() {
  const settings = await getSettings();
  return settings.webhooks || [];
}

/**
 * Get one webhook endpoint by id.
 * @param {string} id
 * @returns {Promise<object|null>}
 */
export async function getWebhook(id) {
  const webhooks = await listWebhooks();
  return webhooks.find((w) => w.id === id) || null;
}

/**
 * Create a webhook endpoint.
 * @param {{name?: string, description?: string, enabled?: boolean}} input
 * @returns {Promise<object>} the created webhook (with secret)
 */
export async function createWebhook(input = {}) {
  const webhooks = await listWebhooks();
  const webhook = {
    id: randomUUID(), // the URL secret (UUID-as-password, Home Assistant model)
    secret: randomUUID(), // HMAC secret (whsec_ prefix, Svix convention)
    name: input.name || "Untitled webhook",
    description: input.description || "",
    enabled: input.enabled !== false,
    createdAt: new Date().toISOString(),
  };
  webhooks.push(webhook);
  await updateSettings({ webhooks });
  return webhook;
}

/**
 * Delete a webhook endpoint (soft delete: enabled=false).
 * @param {string} id
 */
export async function deleteWebhook(id) {
  const webhooks = await listWebhooks();
  const next = webhooks.map((w) =>
    w.id === id ? { ...w, enabled: false } : w
  );
  await updateSettings({ webhooks: next });
}

/**
 * Rotate a webhook's secret (dual-secret grace: keep oldSecret for 24h).
 * @param {string} id
 */
export async function rotateWebhookSecret(id) {
  const webhooks = await listWebhooks();
  const next = webhooks.map((w) =>
    w.id === id
      ? { ...w, secret: randomUUID(), oldSecret: w.secret, rotatedAt: new Date().toISOString() }
      : w
  );
  await updateSettings({ webhooks: next });
}
```

### 3. `src/app/api/webhooks/[id]/route.js` — POST handler

```js
// src/app/api/webhooks/[id]/route.js
// Inbound webhook receiver. Respond 2xx <3s, enqueue async (Slack mandate).
import { NextResponse } from "next/server";
import { getWebhook } from "@/lib/webhooks/registry.js";
import { verifyWebhookSignature } from "@/lib/webhooks/verify.js";

export const dynamic = "force-dynamic";

export async function POST(request, { params }) {
  const { id } = await params;

  // 1. Look up webhook config (404 if unknown or disabled)
  const webhook = await getWebhook(id);
  if (!webhook || !webhook.enabled) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // 2. Read RAW body FIRST (req.text()) — parsing JSON before HMAC breaks the signature
  const rawBody = await request.text();

  // 3. Verify HMAC (Standard Webhooks spec)
  const result = verifyWebhookSignature(webhook.secret, rawBody, request.headers);
  if (!result.ok) {
    return NextResponse.json({ error: `Invalid signature: ${result.reason}` }, { status: 401 });
  }

  // 4. Parse body (safe now — signature verified over raw bytes)
  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    payload = { raw: rawBody }; // non-JSON payloads allowed (form-encoded, text)
  }

  // 5. Enqueue event (M2 wires this to the outbox; for now, log + ack)
  // TODO(M2): replace with outbox insert — see webhook-events-plan.md
  console.log(`[webhook] ${id} received event`, {
    eventId: request.headers.get("webhook-id"),
    payload,
  });

  // 6. Respond 2xx in <3s (Slack/Discord/Pipedream mandate)
  return NextResponse.json({ ok: true, received: true }, { status: 200 });
}

// 405 for non-POST (with OPTIONS for CORS)
export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
export async function PUT() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
export async function DELETE() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
```

### 4. `src/lib/db/repos/settingsRepo.js` — add `webhooks` default

```js
// In DEFAULT_SETTINGS, add:
  // Inbound webhook endpoints: [{ id, secret, oldSecret?, name, description,
  // enabled, createdAt, rotatedAt? }]. id = URL secret (UUID-as-password).
  webhooks: [],
```

## Acceptance Criteria

- [ ] `POST /api/webhooks/<id>` with valid `webhook-id`/`webhook-timestamp`/`webhook-signature` → 200, event logged
- [ ] Invalid signature → 401; stale timestamp (>5 min) → 401; unknown webhook id → 404
- [ ] Raw body used for HMAC (`await req.text()`), constant-time compare (`crypto.timingSafeEqual`)
- [ ] Respond 2xx in <3s (Slack/Discord/Pipedream mandate)
- [ ] Non-POST methods → 405; OPTIONS → 204

## Testing

```bash
# Create a webhook (via settings PATCH)
curl -X PATCH http://localhost:20128/api/settings \
  -H "Content-Type: application/json" \
  -d '{"webhooks":[{"id":"test-id","secret":"test-secret","name":"Test","enabled":true}]}'

# Send a valid signed request (compute HMAC with node)
node -e '
const crypto = require("crypto");
const id = "test-id", ts = Math.floor(Date.now()/1000), body = JSON.stringify({hello:"world"});
const sig = crypto.createHmac("sha256","test-secret").update(`${id}.${ts}.${body}`).digest("base64");
console.log(`curl -X POST http://localhost:20128/api/webhooks/test-id -H "webhook-id: ${id}" -H "webhook-timestamp: ${ts}" -H "webhook-signature: v1,${sig}" -d "${body}"`);
'
```

## Related Docs

- Research: `../research/2026-09-15-webhook-exp-01-receiver-transport.md` (R01–R04), `../research/2026-09-15-webhook-exp-02-auth-secrets.md` (R05–R08)
- Plan: `../planning/2026-09-15-webhook-receive-act-plan.md` (M1)
- Interpretation: `../interpretation/2026-09-15-webhook-interpretation-guide.md`