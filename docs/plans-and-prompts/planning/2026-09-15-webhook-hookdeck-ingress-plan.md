# Webhook Implementation Plan — Hookdeck-Style Ingress (R29)

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (code ready for agent review)
**Tags:** #plan #webhook #implementation #code #r29 #hookdeck #ingress

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

Implement a Hookdeck-style ingress layer (R29): a single catch-all endpoint that receives webhooks from ANY sender, verifies per-source secrets, and routes to the outbox. This is the "webhook inbox" pattern — one URL to give out, source-based routing.

## Scope

**In scope:**
- Catch-all endpoint: `POST /api/webhooks/ingress`
- Source registry: `{sourceId, secret, format (standard/github/stripe), enabled}`
- Per-source verification + format dispatch
- Source-based routing to outbox (webhook_id = sourceId)

**Out of scope (v1):**
- Hookdeck's full product (retries UI, CLI, event inspection)
- Source creation UI (settings JSON is fine)

## Files

| File | Action | Purpose |
|------|--------|---------|
| `src/lib/webhooks/sources.js` | new | Source registry (list/get/create/delete) |
| `src/app/api/webhooks/ingress/route.js` | new | Catch-all ingress endpoint |
| `src/lib/db/repos/settingsRepo.js` | edit | `webhookSources: []` default |

## Code

### 1. `src/lib/webhooks/sources.js`

```js
// src/lib/webhooks/sources.js
// Hookdeck-style source registry. Sources live in settings (JSON).
import { getSettings, updateSettings } from "@/lib/db/repos/settingsRepo.js";
import { randomUUID } from "node:crypto";

export async function listSources() {
  const settings = await getSettings();
  return settings.webhookSources || [];
}

export async function getSource(sourceId) {
  const sources = await listSources();
  return sources.find((s) => s.id === sourceId) || null;
}

export async function createSource({ name, secret, format = "standard", enabled = true }) {
  const settings = await getSettings();
  const source = {
    id: randomUUID(),
    name,
    secret: secret || randomUUID(),
    format, // "standard" | "github" | "stripe"
    enabled,
    createdAt: new Date().toISOString(),
  };
  await updateSettings({ webhookSources: [...(settings.webhookSources || []), source] });
  return source;
}

export async function deleteSource(sourceId) {
  const settings = await getSettings();
  await updateSettings({
    webhookSources: (settings.webhookSources || []).filter((s) => s.id !== sourceId),
  });
}
```

### 2. `src/app/api/webhooks/ingress/route.js`

```js
// src/app/api/webhooks/ingress/route.js
// POST /api/webhooks/ingress — catch-all webhook inbox.
// Identify the source via X-9R-Source header (or query ?source=).
import { NextResponse } from "next/server";
import { getSource } from "@/lib/webhooks/sources.js";
import { verifyWebhookSignature } from "@/lib/webhooks/verify.js";
import { verifyGitHubSignature } from "@/lib/webhooks/github.js";
import { insertEvent } from "@/lib/db/repos/webhookEventsRepo.js";
import { randomUUID } from "node:crypto";

export const dynamic = "force-dynamic";

export async function POST(request) {
  const { searchParams } = new URL(request.url);
  const sourceId = request.headers.get("x-9r-source") || searchParams.get("source");
  if (!sourceId) {
    return NextResponse.json({ error: "missing source" }, { status: 400 });
  }

  const source = await getSource(sourceId);
  if (!source || !source.enabled) {
    return NextResponse.json({ error: "unknown source" }, { status: 404 });
  }

  const rawBody = await request.text();
  let ok = false;
  if (source.format === "github") {
    ok = verifyGitHubSignature(
      request.headers.get("x-hub-signature-256") || "",
      rawBody,
      source.secret
    );
  } else {
    ok = verifyWebhookSignature(request.headers, rawBody, source.secret).ok;
  }
  if (!ok) {
    return NextResponse.json({ error: "signature mismatch" }, { status: 401 });
  }

  const body = JSON.parse(rawBody).catch ? JSON.parse(rawBody) : {};
  await insertEvent({
    eventId: randomUUID(),
    webhookId: sourceId,
    payload: { type: body.type || "webhook.inbound", data: body },
  });
  return NextResponse.json({ received: true }, { status: 200 });
}
```

### 3. `src/lib/db/repos/settingsRepo.js` — default

```js
// In DEFAULT_SETTINGS:
  // Hookdeck-style ingress sources: [{id, name, secret, format, enabled}]
  webhookSources: [],
```

## Acceptance Criteria

- [ ] One catch-all URL receives webhooks from any sender
- [ ] Per-source secret + format (standard/github/stripe)
- [ ] Source identified via `X-9R-Source` header or `?source=` query
- [ ] Events routed to outbox with webhook_id = sourceId

## Testing

```bash
# Unit test (tests/unit/webhook-sources.test.js)
# - createSource/getSource/deleteSource round-trip
# - ingress: missing source → 400; unknown → 404; bad sig → 401; good → 200
```

## Related Docs

- Research: `../research/2026-09-15-webhook-exp-09-standards-infra.md` (R29)
- Plan: `../planning/2026-09-15-webhook-m1-receiver-hmac-plan.md` (receiver)
- Interpretation: `../interpretation/2026-09-15-webhook-interpretation-guide.md`