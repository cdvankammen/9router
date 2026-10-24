# Webhook Implementation Plan — Helicone-Style Observability (R44)

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (code ready for agent review)
**Tags:** #plan #webhook #implementation #code #r44 #helicone #observability

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

Implement Helicone-style observability (R44): per-request logging with cost/latency/token attribution, custom properties, and webhook alerts on request patterns. Helicone's model is "log everything, alert on anything" — 9router already captures request details; this plan adds the alerting + custom-property layer.

## Scope

**In scope:**
- Custom properties on requests (via headers: `Helicone-Property-*` style → `X-9R-Property-*`)
- Request-level webhook events: `request.completed` with cost/latency/tokens
- Alert on request patterns (slow, expensive, error)
- Feedback endpoint (Helicone's user feedback pattern)

**Out of scope (v1):**
- Helicone's full dashboard
- Prompt caching / session tracking

## Rationale & Design Decisions

**Purpose:** Add Helicone-style observability — custom properties on requests, event hooks, and a feedback endpoint — so LLM traffic is inspectable and improvable.

**Research grounding:** R44 (exp-10 patterns/platforms) — see Related Docs below for the exact experiment documents this plan derives from.

**Key design decisions:**
- **Custom properties** — clients attach metadata to requests; it flows through to logs/events.
- **`request.completed` events** — the M4 event vocabulary already emits completion; observability subscribes to it.
- **Feedback endpoint** — a small API to record human feedback on responses, stored alongside usage data.

**Trade-offs & risks:** Trade-off: observability adds per-request overhead (metadata capture); keep it opt-in per provider/request. Overlaps with existing usage tracking — reuse, don't duplicate.

---
## Grounding in 9router

**Auth registration:** `/api/observability/*` → **`PROTECTED_API_PATHS`**

9router already has `api/observability/status` — extend it rather than adding a parallel surface.

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
| `src/lib/webhooks/observability.js` | new | Request event emission + properties |
| `src/app/api/webhooks/feedback/route.js` | new | Feedback endpoint |
| `open-sse/handlers/chatCore.js` | edit | Emit request.completed with metrics |

## Code

### 1. `src/lib/webhooks/observability.js`

```js
// src/lib/webhooks/observability.js
// Helicone-style request observability: custom properties + request events.
import { emitEvent } from "./emitter.js";

/**
 * Extract custom properties from request headers (X-9R-Property-*).
 * @param {Headers} headers
 * @returns {object}
 */
export function extractProperties(headers) {
  const props = {};
  for (const [key, value] of headers.entries()) {
    const match = key.match(/^x-9r-property-(.+)$/i);
    if (match) props[match[1]] = value;
  }
  return props;
}

/**
 * Emit a request.completed event with metrics.
 * @param {object} input - {model, provider, cost, latencyMs, tokens, status, properties}
 */
export async function emitRequestCompleted(input) {
  await emitEvent({
    type: "request.completed",
    data: {
      model: input.model,
      provider: input.provider,
      cost: input.cost,
      latencyMs: input.latencyMs,
      tokens: input.tokens,
      status: input.status,
      properties: input.properties || {},
      at: new Date().toISOString(),
    },
  });
}
```

### 2. `open-sse/handlers/chatCore.js` — emit with metrics (edit)

```js
// In chatCore.js, after the response completes:
import { emitRequestCompleted, extractProperties } from "@/lib/webhooks/observability.js";

const startedAt = Date.now();
// ... after response:
await emitRequestCompleted({
  model,
  provider: modelInfo.provider,
  cost: usage?.cost,
  latencyMs: Date.now() - startedAt,
  tokens: usage?.totalTokens,
  status: "success",
  properties: extractProperties(request.headers),
});
```

### 3. `src/app/api/webhooks/feedback/route.js`

```js
// src/app/api/webhooks/feedback/route.js
// POST /api/webhooks/feedback — user feedback on a request (Helicone pattern).
import { NextResponse } from "next/server";
import { emitEvent } from "@/lib/webhooks/emitter.js";

export const dynamic = "force-dynamic";

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  if (!body.requestId) {
    return NextResponse.json({ error: "requestId required" }, { status: 400 });
  }
  await emitEvent({
    type: "request.feedback",
    data: {
      requestId: body.requestId,
      rating: body.rating, // "positive" | "negative"
      comment: body.comment,
    },
  });
  return NextResponse.json({ ok: true });
}
```

## Acceptance Criteria

- [ ] Custom properties extracted from `X-9R-Property-*` headers
- [ ] `request.completed` events carry cost/latency/tokens/status
- [ ] Feedback endpoint emits `request.feedback`
- [ ] Rule engine can alert on request patterns

## Testing

```bash
# Unit test (tests/unit/webhook-observability.test.js)
# - extractProperties: header parsing
# - emitRequestCompleted: event shape
```

## Related Docs

- Research: `../research/2026-09-15-webhook-exp-10-patterns-platforms.md` (R44)
- Plan: `../planning/2026-09-15-webhook-m4-outbound-triggers-plan.md` (emitter)
- Interpretation: `../interpretation/2026-09-15-webhook-interpretation-guide.md`