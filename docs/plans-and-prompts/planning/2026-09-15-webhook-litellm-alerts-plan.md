# Webhook Implementation Plan — LiteLLM-Style Alerts (R42)

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (code ready for agent review)
**Tags:** #plan #webhook #implementation #code #r42 #litellm #alerts

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

Implement LiteLLM-style alerts (R42): the alert types LiteLLM ships — budget alerts, spend tracking, error rate spikes, slow responses, and daily reports. This is the "what to alert on" catalog that maps directly onto 9router's quota/usage data.

## Scope

**In scope:**
- Alert types: budget (spend threshold), error-rate (spike), latency (slow), daily report
- Alert config: `{type, threshold, windowMs, notifyUrl}`
- Alert evaluation loop (settings-gated worker)
- Emits `alert.*` events → rule engine → notify

**Out of scope (v1):**
- LiteLLM's Slack/Discord/Webhook alert channels (9router's notify action covers these)
- Team-scoped alerts

## Rationale & Design Decisions

**Purpose:** Provide LiteLLM-style alerting (budget, error rate, latency, daily spend reports) so gateway operators get proactive cost and health notifications.

**Research grounding:** R42 (exp-10 patterns/platforms) — see Related Docs below for the exact experiment documents this plan derives from.

**Key design decisions:**
- **Alert types** — budget exceeded, error-rate spike, latency degradation, daily spend digest — matching LiteLLM's alert surface.
- **Thresholds in settings** — all thresholds are configurable via settingsRepo, with sensible defaults.
- **Delivery via existing notification adapters** — alerts are events; the M3/M4 action registry delivers them, so no new delivery code.

**Trade-offs & risks:** Trade-off: alerting is only as good as its thresholds — defaults may need tuning per deployment. Digest cadence (daily) avoids notification fatigue.

---
## Grounding in 9router

**Auth registration:** `/api/webhooks/alerts` → **`PROTECTED_API_PATHS`**

Alert config is dashboard surface; delivery reuses M3/M4 actions.

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
| `src/lib/webhooks/alerts.js` | new | Alert config + evaluation |
| `src/lib/webhooks/alerts/checks.js` | new | Alert check implementations |
| `src/instrumentation.js` | edit | Start alert worker |
| `src/lib/db/repos/settingsRepo.js` | edit | `webhookAlerts: []` default |

## Code

### 1. `src/lib/webhooks/alerts.js`

```js
// src/lib/webhooks/alerts.js
// LiteLLM-style alert evaluation loop.
import { getSettings } from "@/lib/db/repos/settingsRepo.js";
import { runAlertCheck } from "./alerts/checks.js";
import { emitEvent } from "./emitter.js";

const g = (global.__webhookAlerts ??= { interval: null, lastCheck: new Map() });

export function startAlertWorker({ intervalMs = 60_000 } = {}) {
  if (g.interval) return g.interval;
  g.interval = setInterval(tick, intervalMs);
  g.interval.unref?.();
  return g.interval;
}

export function stopAlertWorker() {
  if (g.interval) {
    clearInterval(g.interval);
    g.interval = null;
  }
}

async function tick() {
  const settings = await getSettings();
  const alerts = settings.webhookAlerts || [];
  const now = Date.now();
  for (const alert of alerts) {
    if (!alert.enabled) continue;
    const last = g.lastCheck.get(alert.id) || 0;
    const intervalMs = alert.intervalMs || 60_000;
    if (now - last < intervalMs) continue;
    g.lastCheck.set(alert.id, now);
    try {
      const result = await runAlertCheck(alert, { now });
      if (result?.triggered) {
        await emitEvent({
          type: `alert.${alert.type}`,
          data: { alertId: alert.id, ...result.data },
        });
      }
    } catch (err) {
      console.error(`[webhook-alerts] ${alert.id} failed:`, err?.message || err);
    }
  }
}
```

### 2. `src/lib/webhooks/alerts/checks.js`

```js
// src/lib/webhooks/alerts/checks.js
// Alert check implementations (LiteLLM alert catalog).
import { getAdapter } from "@/lib/db/driver.js";

export async function runAlertCheck(alert, { now }) {
  switch (alert.type) {
    case "budget":
      return checkBudget(alert, now);
    case "error-rate":
      return checkErrorRate(alert, now);
    case "latency":
      return checkLatency(alert, now);
    case "daily-report":
      return checkDailyReport(alert, now);
    default:
      return { triggered: false };
  }
}

// Budget: spend in window >= threshold
async function checkBudget(alert, now) {
  const { threshold, windowMs = 24 * 60 * 60_000 } = alert;
  const since = new Date(now - windowMs).toISOString();
  const db = await getAdapter();
  const row = await db.get(
    "SELECT COALESCE(SUM(CAST(payload ->> '$.cost' AS REAL)), 0) AS total FROM webhook_events WHERE payload LIKE '%cost%' AND created_at >= ?",
    [since]
  );
  const total = row?.total || 0;
  return { triggered: total >= threshold, data: { spend: total, threshold, windowMs } };
}

// Error rate: errors in window / total >= threshold
async function checkErrorRate(alert, now) {
  const { threshold = 0.1, windowMs = 5 * 60_000 } = alert;
  const since = new Date(now - windowMs).toISOString();
  const db = await getAdapter();
  const total = await db.get("SELECT COUNT(*) AS c FROM webhook_events WHERE created_at >= ?", [since]);
  const errors = await db.get("SELECT COUNT(*) AS c FROM webhook_events WHERE payload LIKE '%provider.error%' AND created_at >= ?", [since]);
  const rate = total.c ? errors.c / total.c : 0;
  return { triggered: rate >= threshold, data: { rate, errors: errors.c, total: total.c, windowMs } };
}

// Latency: slow responses in window (placeholder — needs request timing data)
async function checkLatency(alert, now) {
  // TODO: wire to request timing (usageDb or requestDetails)
  return { triggered: false, data: { note: "needs request timing data" } };
}

// Daily report: always triggered once per day (digest)
async function checkDailyReport(alert, now) {
  return { triggered: true, data: { at: new Date(now).toISOString() } };
}
```

### 3. `src/instrumentation.js` — wire the worker

```js
// In instrumentation.js:
const alerts = settings.webhookAlerts;
if (alerts?.some((a) => a.enabled)) {
  const { startAlertWorker } = await import("@/lib/webhooks/alerts.js");
  startAlertWorker({ intervalMs: 60_000 });
}
```

### 4. `src/lib/db/repos/settingsRepo.js` — default

```js
// In DEFAULT_SETTINGS:
  // LiteLLM-style alerts: [{id, type, threshold, windowMs, intervalMs, enabled}]
  webhookAlerts: [],
```

## Acceptance Criteria

- [ ] Alert types: budget, error-rate, latency, daily-report
- [ ] Threshold + window per alert
- [ ] Emits `alert.<type>` events → rule engine → notify
- [ ] Settings-gated via `webhookAlerts`

## Testing

```bash
# Unit test (tests/unit/webhook-alerts.test.js)
# - budget: spend >= threshold triggers
# - error-rate: rate >= threshold triggers
# - disabled alert skipped
```

## Related Docs

- Research: `../research/2026-09-15-webhook-exp-10-patterns-platforms.md` (R42)
- Plan: `../planning/2026-09-15-webhook-m4-outbound-triggers-plan.md` (emitter)
- Interpretation: `../interpretation/2026-09-15-webhook-interpretation-guide.md`