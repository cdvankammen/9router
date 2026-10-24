# Webhook Implementation Plan — M4: Outbound Triggers + Emitter

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (code ready for agent review)
**Tags:** #plan #webhook #implementation #code #m4 #outbound #triggers #emitter

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

Implement M4 of the webhook system: the internal event emitter + outbound triggers. This wires 9router's existing internals (quota scheduler, chat pipeline) to emit events that the rule engine (M3) can act on.

## Scope

**In scope:**
- `emitter.js` — internal event emitter → outbox
- Wire `quotaAutoPing.js` → quota events (80%/90%/exhausted)
- Wire `chatCore.js` → provider.error / fallback.used / request.completed
- Wire model catalog sync → model.added
- Daily spend report (digest mode, LiteLLM-style)

**Out of scope (v1):**
- Rule engine + actions (M3) — emitter just produces events
- Dashboard UI (M5)

## Rationale & Design Decisions

**Purpose:** Emit outbound webhooks from internal 9router events (provider errors, quota warnings, fallback usage, request completion) so external systems can react to gateway state.

**Research grounding:** R21–R24 (exp-07 internal events) — see Related Docs below for the exact experiment documents this plan derives from.

**Key design decisions:**
- **Event namespacing** (`provider.error`, `quota.warning`, …) — a small, documented vocabulary that maps 1:1 to rule triggers, so rules and outbound hooks share one event model.
- **Hook points in existing code paths** — `chatCore`/analyze-error/quota paths emit events at the same places they already log, minimizing new surface area.
- **Async emission** — events are queued, never awaited inline, so a slow subscriber cannot slow request handling.
- **Settings-gated** — each trigger class can be disabled independently via `settingsRepo`, matching the instrumentation.js gating pattern.

**Trade-offs & risks:** Trade-off: emitting from hot paths adds a tiny per-request cost; mitigated by async queueing. Event vocabulary is v1-minimal — extend as new needs appear.

---
## Grounding in 9router

**Auth registration:** — (no new API route; emitters only)

Emits from existing request paths; reuse the `usageDb` emitter pattern rather than adding a parallel bus.

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
| `src/lib/webhooks/emitter.js` | new | Internal event emitter → outbox |
| `src/shared/services/quotaAutoPing.js` | edit | Emit quota events |
| `open-sse/handlers/chatCore.js` | edit | Emit provider.error / fallback.used |
| `src/lib/modelCatalog/sync.js` | edit | Emit model.added |
| `src/lib/webhooks/digest.js` | new | Daily spend digest |

## Code

### 1. `src/lib/webhooks/emitter.js` — Internal event emitter

```js
// src/lib/webhooks/emitter.js
// Internal event emitter → outbox (M2). Fail-open: never throw out of emit.
import { insertEvent } from "@/lib/db/repos/webhookEventsRepo.js";
import { randomUUID } from "node:crypto";

/**
 * Emit an internal event into the outbox.
 * @param {{type: string, data: object, eventId?: string}} input
 */
export async function emitEvent({ type, data, eventId }) {
  try {
    await insertEvent({
      eventId: eventId || randomUUID(),
      webhookId: "internal", // internal events aren't tied to a webhook endpoint
      payload: { type, data, emittedAt: new Date().toISOString() },
    });
  } catch (err) {
    // Fail-open: log and continue — never break the request path.
    console.error("[webhook-emitter] emit failed:", err?.message || err);
  }
}
```

### 2. `src/shared/services/quotaAutoPing.js` — emit quota events

```js
// In quotaAutoPing.js, after quota is fetched, emit threshold-crossing events.
// Emit-on-transition: only emit when crossing 80%/90%/exhausted (dedupe).
import { emitEvent } from "@/lib/webhooks/emitter.js";

// Track last-emitted threshold per provider:connection (in-memory, like resetCache)
const g = (global.__quotaAutoPing ??= { interval: null, running: false, resetCache: {}, failureCache: {}, emittedThresholds: {} });

function emitQuotaEvents(provider, connectionId, usage) {
  const key = `${provider}:${connectionId}`;
  const prev = g.emittedThresholds[key] || 0;
  const pct = usage?.usedPct ?? 0; // 0-100

  let threshold = 0;
  if (pct >= 100) threshold = 100;
  else if (pct >= 90) threshold = 90;
  else if (pct >= 80) threshold = 80;

  if (threshold > prev) {
    g.emittedThresholds[key] = threshold;
    const type = threshold >= 100 ? "quota.exhausted" : "quota.warning";
    emitEvent({
      type,
      data: { provider, connectionId, usedPct: pct, threshold },
    });
  }
  // Reset when quota resets (new window)
  if (usage?.resetAt && usage.resetAt !== g.resetCache[key]) {
    g.emittedThresholds[key] = 0;
  }
}
```

### 3. `open-sse/handlers/chatCore.js` — emit provider.error / fallback.used

```js
// In chatCore.js, where provider errors are caught and fallbacks are attempted:
import { emitEvent } from "@/lib/webhooks/emitter.js";

// On provider error (after retries exhausted):
await emitEvent({
  type: "provider.error",
  data: { provider, model, error: err?.message || String(err), status: err?.status },
});

// On fallback used:
await emitEvent({
  type: "fallback.used",
  data: { from: originalModel, to: fallbackModel, reason: err?.message || String(err) },
});
```

### 4. `src/lib/modelCatalog/sync.js` — emit model.added

```js
// In modelCatalog sync, when a new model is detected:
import { emitEvent } from "@/lib/webhooks/emitter.js";

// After catalog sync detects a new model:
await emitEvent({
  type: "model.added",
  data: { model: newModel.id, provider: newModel.provider },
});
```

### 5. `src/lib/webhooks/digest.js` — Daily spend digest

```js
// src/lib/webhooks/digest.js
// Daily spend digest (LiteLLM digest_interval pattern). Persists last-sent
// timestamp so restarts don't re-send (better than LiteLLM's in-memory).
import { getSettings, updateSettings } from "@/lib/db/repos/settingsRepo.js";
import { emitEvent } from "./emitter.js";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Check if a digest is due; if so, emit it.
 * @param {object} usageSummary - { totalCost, byProvider, windowStart, windowEnd }
 */
export async function maybeSendDailyDigest(usageSummary) {
  const settings = await getSettings();
  const digest = settings.webhookDigest || {};
  if (!digest.enabled) return;

  const lastSent = digest.lastSentAt ? new Date(digest.lastSentAt).getTime() : 0;
  if (Date.now() - lastSent < DAY_MS) return; // already sent today

  await emitEvent({
    type: "daily.spend",
    data: usageSummary,
  });

  // Persist last-sent (survives restart — better than LiteLLM in-memory)
  await updateSettings({
    webhookDigest: { ...digest, lastSentAt: new Date().toISOString() },
  });
}
```

### 6. `src/lib/db/repos/settingsRepo.js` — add `webhookDigest` default

```js
// In DEFAULT_SETTINGS, add:
  // Daily spend digest. OFF by default.
  webhookDigest: {
    enabled: false,
    lastSentAt: null,
  },
```

## Acceptance Criteria

- [ ] Quota 80%/90%/exhausted → emit `quota.warning` / `quota.exhausted` (emit-on-transition dedupe)
- [ ] Provider error spike → emit `provider.error`
- [ ] Fallback event → emit `fallback.used`
- [ ] New model added → emit `model.added`
- [ ] Daily spend report → emit `daily.spend` (digest mode, persisted last-sent)

## Testing

```bash
# Unit test (tests/unit/webhook-emitter.test.js)
# - emitEvent inserts into outbox with unique eventId
# - emitEvent fails open (never throws)
# - quota threshold transitions: 0→85 emits 80, 85→95 emits 90, 95→100 emits 100
# - digest: enabled+due → emits; enabled+not-due → skips; disabled → skips
```

## Related Docs

- Research: `../research/2026-09-15-webhook-exp-07-internal-events.md` (R21–R23), `../research/2026-09-15-webhook-exp-08-scheduled-monitoring.md` (R24–R25)
- Plan: `../planning/2026-09-15-webhook-receive-act-plan.md` (M4)
- Interpretation: `../interpretation/2026-09-15-webhook-interpretation-guide.md`