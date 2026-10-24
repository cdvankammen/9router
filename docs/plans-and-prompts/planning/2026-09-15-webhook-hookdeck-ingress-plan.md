# Webhook Implementation Plan — Hookdeck-Style Ingress (R29)

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (code ready for agent review)
**Tags:** #plan #webhook #implementation #code #r29 #hookdeck #ingress

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

## Rationale & Design Decisions

**Purpose:** Accept webhooks from Hookdeck (or any catch-all ingress) by registering sources and dispatching per-source formats, so 9router can sit behind a delivery platform.

**Research grounding:** R29 (exp-09 standards/infra) — see Related Docs below for the exact experiment documents this plan derives from.

**Key design decisions:**
- **Catch-all ingress endpoint** — one route receives all sources; a source registry maps sender → expected format/secret.
- **Per-source format dispatch** — each source declares its envelope style (standard, stripe, github, raw), and the receiver normalizes to the internal event model.
- **Source registry in settings** — adding a source is a settings entry, no code change.

**Trade-offs & risks:** Trade-off: catch-all ingress is flexible but shifts trust to the ingress platform — the source registry must be strict about secrets. If no ingress platform is used, M1's per-endpoint model is simpler.

---
## Grounding in 9router

**Auth registration:** `src/app/api/webhooks/ingress/route.js` → **`PUBLIC_API_PATHS`**

Catch-all ingress is called by Hookdeck; per-source secrets in the registry are the auth.

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