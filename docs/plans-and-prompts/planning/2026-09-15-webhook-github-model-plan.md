# Webhook Implementation Plan — GitHub Webhook Model (R27)

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (code ready for agent review)
**Tags:** #plan #webhook #implementation #code #r27 #github #standards

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

Implement the GitHub webhook model (R27): `X-GitHub-Event` + `X-GitHub-Delivery` headers, HMAC-SHA256 signature (`sha256=<hex>`), ping events, and delivery-id idempotency. GitHub's model is the most widely-copied receiver pattern — supporting it makes 9router instantly compatible with GitHub-style senders.

## Scope

**In scope:**
- `X-GitHub-Event` header → event type
- `X-GitHub-Delivery` header → idempotency key
- `X-Hub-Signature-256: sha256=<hex>` verification (hex, not base64)
- `ping` event handling (respond 200, no processing)
- GitHub-style sender support (9router can *send* GitHub-format webhooks)

**Out of scope (v1):**
- GitHub App tokens / installation auth
- `X-Hub-Signature` (SHA-1, deprecated)

## Rationale & Design Decisions

**Purpose:** Support GitHub's webhook conventions (event/delivery headers, hex HMAC, ping) so GitHub and GitHub-compatible senders integrate without custom adapters.

**Research grounding:** R27 (exp-09 standards/infra) — see Related Docs below for the exact experiment documents this plan derives from.

**Key design decisions:**
- **`X-GitHub-Event` + `X-GitHub-Delivery` headers** — event routing and idempotency without parsing the body.
- **`X-Hub-Signature-256` hex HMAC** — GitHub's SHA-256 hex format verified alongside the Standard Webhooks base64 format, so both sender styles work.
- **Ping handling** — GitHub sends `ping` on setup; the receiver must answer 200 and record it, or integrations appear broken.

**Trade-offs & risks:** Trade-off: GitHub's format is hex-encoded and header-driven, unlike Standard Webhooks' base64 — supporting both means two verification paths. Worth it because GitHub is a common sender.

---
## Grounding in 9router

**Auth registration:** `src/app/api/webhooks/github/[id]/route.js` → **`PUBLIC_API_PATHS`**

GitHub calls with `X-Hub-Signature-256`; that signature is the auth.

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
| `src/lib/webhooks/verify.js` | edit | Accept `X-Hub-Signature-256` hex format |
| `src/lib/webhooks/github.js` | new | GitHub header parsing + ping handling |
| `src/app/api/webhooks/[id]/route.js` | edit | GitHub header branch |

## Code

### 1. `src/lib/webhooks/github.js`

```js
// src/lib/webhooks/github.js
// GitHub webhook model: X-GitHub-Event, X-GitHub-Delivery, X-Hub-Signature-256.
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Verify a GitHub-style signature (hex format: sha256=<hex>).
 * @param {string} signatureHeader - X-Hub-Signature-256 value
 * @param {string} rawBody
 * @param {string} secret
 * @returns {boolean}
 */
export function verifyGitHubSignature(signatureHeader, rawBody, secret) {
  if (!signatureHeader?.startsWith("sha256=")) return false;
  const provided = signatureHeader.slice("sha256=".length);
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Parse GitHub webhook headers.
 * @param {object} headers - lowercased header map
 * @returns {{event: string, deliveryId: string, signature: string}}
 */
export function parseGitHubHeaders(headers) {
  return {
    event: headers["x-github-event"] || "",
    deliveryId: headers["x-github-delivery"] || "",
    signature: headers["x-hub-signature-256"] || "",
  };
}

/**
 * Handle a ping event (GitHub sends these on webhook creation).
 * @returns {{ok: true, ping: true}}
 */
export function handlePing() {
  return { ok: true, ping: true };
}
```

### 2. `src/lib/webhooks/verify.js` — accept hex format (edit)

```js
// Add a GitHub-format branch to verifyWebhookSignature:
// If the signature header starts with "sha256=", use hex comparison
// (delegate to verifyGitHubSignature). Otherwise use the Standard
// Webhooks base64 format (existing logic).
```

### 3. `src/app/api/webhooks/[id]/route.js` — GitHub branch (edit)

```js
// In the POST handler, detect GitHub-style senders:
import { parseGitHubHeaders, verifyGitHubSignature, handlePing } from "@/lib/webhooks/github.js";

const gh = parseGitHubHeaders(request.headers);
if (gh.event) {
  // GitHub-style sender
  if (!verifyGitHubSignature(gh.signature, rawBody, webhook.secret)) {
    return NextResponse.json({ error: "signature mismatch" }, { status: 401 });
  }
  if (gh.event === "ping") {
    return NextResponse.json(handlePing(), { status: 200 });
  }
  // Use delivery id for idempotency
  await insertEvent({
    eventId: gh.deliveryId || randomUUID(),
    webhookId: id,
    payload: { type: gh.event, data: JSON.parse(rawBody) },
  });
  return NextResponse.json({ received: true }, { status: 200 });
}
```

## Acceptance Criteria

- [ ] `X-GitHub-Event` → event type; `X-GitHub-Delivery` → idempotency
- [ ] `X-Hub-Signature-256` hex verification (timing-safe)
- [ ] `ping` → 200 without processing
- [ ] GitHub-style senders accepted alongside Standard Webhooks senders

## Testing

```bash
# Unit test (tests/unit/webhook-github.test.js)
# - verifyGitHubSignature: valid/tampered/old-format
# - parseGitHubHeaders: header extraction
# - ping handling returns ok without insert
```

## Related Docs

- Research: `../research/2026-09-15-webhook-exp-09-standards-infra.md` (R27)
- Plan: `../planning/2026-09-15-webhook-m1-receiver-hmac-plan.md` (receiver)
- Interpretation: `../interpretation/2026-09-15-webhook-interpretation-guide.md`