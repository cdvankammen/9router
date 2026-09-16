# Webhook Implementation Plan — Dead Man's Switch (R25)

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (code ready for agent review)
**Tags:** #plan #webhook #implementation #code #r25 #deadmans-switch #scheduled

---

## ⚠️ AGENT REVIEW NOTE (READ FIRST)

> **The code in this plan is a starting point, not a final decision.**
> Every agent that reads this plan MUST review the code below and make a decision:
> is there a better way to implement this? If yes, **make those changes happen** —
> update the code, note the improvement, and proceed. Do not treat this code as
> sacred. It follows 9router's existing conventions (settingsRepo, instrumentation.js),
> but the agent is the final arbiter of implementation quality.

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