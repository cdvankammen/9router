# Webhook Implementation Plan — Dead Man's Switch (R25)

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (code ready for agent review)
**Tags:** #plan #webhook #implementation #code #r25 #deadmans-switch #scheduled

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

Implement the dead man's switch (R25): a heartbeat monitor that alerts when 9router stops processing events. If no event has been emitted within a configurable window, fire a `heartbeat.missed` event through the rule engine (M3) so operators get notified.

## Scope

**In scope:**
- Heartbeat tracker: records last-seen event timestamp
- Missed-heartbeat detection loop (settings-gated worker)
- Emits `heartbeat.missed` → rule engine → notify action

**Out of scope (v1):**
- External uptime monitoring (Uptime Kuma / Healthchecks.io — separate plans R45/R46)
- Multiple heartbeat channels

## Rationale & Design Decisions

**Purpose:** Detect when 9router stops processing (crash, hang, silent failure) by requiring periodic heartbeats — a dead man's switch that alerts when the gateway goes silent.

**Research grounding:** R25 (exp-08 scheduled/monitoring) — see Related Docs below for the exact experiment documents this plan derives from.

**Key design decisions:**
- **Heartbeat monitor with missed-window alert** — a scheduled job expects a heartbeat every N minutes; missing 2×N triggers an alert, matching Healthchecks.io's New→Up→Late→Down model.
- **Cooldown dedupe** — after an alert fires, a cooldown prevents alert storms while the system is down.
- **Watchdog over `instrumentation.js` jobs** — the monitor watches the same workers it protects, so a dead worker is caught by the same mechanism.

**Trade-offs & risks:** Trade-off: heartbeats only prove the process is alive, not that it's healthy — combine with the healthchecks-io plan (R46) for external monitoring. False positives are possible if the scheduler stalls; cooldown + grace period mitigate.

---
## Grounding in 9router

**Auth registration:** — (no API route; worker only)

Worker from `instrumentation.js`; alert delivery reuses M3/M4 actions.

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
| `src/lib/webhooks/heartbeat.js` | new | Heartbeat tracker + missed detection |
| `src/instrumentation.js` | edit | Start heartbeat worker when enabled |
| `src/lib/db/repos/settingsRepo.js` | edit | `webhookHeartbeat` default |

## Code

### 1. `src/lib/webhooks/heartbeat.js`

```js
// src/lib/webhooks/heartbeat.js
// Dead man's switch: if no event within the window, emit heartbeat.missed.
import { getSettings } from "@/lib/db/repos/settingsRepo.js";
import { emitEvent } from "./emitter.js";

const g = (global.__webhookHeartbeat ??= {
  interval: null,
  lastEventAt: Date.now(),
  lastMissedAt: 0,
});

/** Record that an event was processed (call from emitter.js). */
export function recordHeartbeat() {
  g.lastEventAt = Date.now();
}

/**
 * Start the heartbeat monitor.
 * @param {{intervalMs?: number}} opts
 */
export function startHeartbeatMonitor({ intervalMs = 60_000 } = {}) {
  if (g.interval) return g.interval;
  g.interval = setInterval(checkHeartbeat, intervalMs);
  g.interval.unref?.();
  return g.interval;
}

export function stopHeartbeatMonitor() {
  if (g.interval) {
    clearInterval(g.interval);
    g.interval = null;
  }
}

async function checkHeartbeat() {
  const settings = await getSettings();
  const cfg = settings.webhookHeartbeat || {};
  if (!cfg.enabled) return;

  const windowMs = cfg.windowMs || 10 * 60 * 1000; // default 10 min
  const now = Date.now();

  // Cooldown: don't re-alert more than once per window
  if (now - g.lastEventAt > windowMs && now - g.lastMissedAt > windowMs) {
    g.lastMissedAt = now;
    await emitEvent({
      type: "heartbeat.missed",
      data: {
        lastEventAt: new Date(g.lastEventAt).toISOString(),
        windowMs,
        message: "No webhook events processed within the configured window",
      },
    });
  }
}
```

### 2. `src/instrumentation.js` — wire the worker

```js
// In instrumentation.js, alongside the other settings-gated workers:
const hb = settings.webhookHeartbeat;
if (hb?.enabled) {
  const { startHeartbeatMonitor } = await import("@/lib/webhooks/heartbeat.js");
  startHeartbeatMonitor({ intervalMs: hb.intervalMs || 60_000 });
}
```

### 3. `src/lib/db/repos/settingsRepo.js` — default

```js
// In DEFAULT_SETTINGS:
  // Dead man's switch: alert when no events processed within windowMs
  webhookHeartbeat: {
    enabled: false,
    intervalMs: 60_000,
    windowMs: 10 * 60 * 1000,
  },
```

## Acceptance Criteria

- [ ] `recordHeartbeat()` called on every emitted event
- [ ] No events for `windowMs` → emits `heartbeat.missed` (once per window, cooldown)
- [ ] Settings-gated via `webhookHeartbeat.enabled`
- [ ] Rule engine (M3) can route `heartbeat.missed` → notify

## Testing

```bash
# Unit test (tests/unit/webhook-heartbeat.test.js)
# - recordHeartbeat updates lastEventAt
# - checkHeartbeat emits when window exceeded, skips within cooldown
# - disabled config → no emit
```

## Related Docs

- Research: `../research/2026-09-15-webhook-exp-08-scheduled-monitoring.md` (R25)
- Plan: `../planning/2026-09-15-webhook-receive-act-plan.md` (M4 scheduled)
- Interpretation: `../interpretation/2026-09-15-webhook-interpretation-guide.md`