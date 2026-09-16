# Webhook Implementation Plan — Healthchecks.io Integration (R46)

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (code ready for agent review)
**Tags:** #plan #webhook #implementation #code #r46 #healthchecks-io #monitoring

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

Implement Healthchecks.io integration (R46): ping Healthchecks.io's `/ping/<uuid>` endpoint on a schedule so 9router appears as a cron job / service. This is the simplest external monitoring — just a GET request on a timer.

## Scope

**In scope:**
- Ping endpoint: `GET https://hc-ping.com/<uuid>` (or self-hosted)
- Periodic ping worker (configurable interval)
- Success/fail/start/log endpoints (Healthchecks.io supports `/start`, `/fail`, `/log`)
- Multiple checks

**Out of scope (v1):**
- Healthchecks.io's full API (projects, integrations)
- Grace time / schedule validation

## Files

| File | Action | Purpose |
|------|--------|---------|
| `src/lib/webhooks/healthchecks-io.js` | new | Ping client + worker |
| `src/instrumentation.js` | edit | Start worker |
| `src/lib/db/repos/settingsRepo.js` | edit | `webhookHealthchecksIo: []` default |

## Code

### 1. `src/lib/webhooks/healthchecks-io.js`

```js
// src/lib/webhooks/healthchecks-io.js
// Healthchecks.io ping client + periodic worker.
import { getSettings } from "@/lib/db/repos/settingsRepo.js";
import { proxyAwareFetch } from "open-sse/utils/proxyFetch.js";

const g = (global.__webhookHealthchecksIo ??= { interval: null });

export function startHealthchecksIoWorker({ intervalMs = 60_000 } = {}) {
  if (g.interval) return g.interval;
  g.interval = setInterval(tick, intervalMs);
  g.interval.unref?.();
  return g.interval;
}

export function stopHealthchecksIoWorker() {
  if (g.interval) {
    clearInterval(g.interval);
    g.interval = null;
  }
}

async function tick() {
  const settings = await getSettings();
  const checks = settings.webhookHealthchecksIo || [];
  for (const c of checks) {
    if (!c.enabled) continue;
    try {
      await pingCheck(c);
    } catch (err) {
      console.error(`[healthchecks.io] ${c.uuid} failed:`, err?.message || err);
    }
  }
}

async function pingCheck(check) {
  const { uuid, baseUrl = "https://hc-ping.com", status = "success" } = check;
  const url = `${baseUrl}/${uuid}/${status}`;
  const res = await proxyAwareFetch(url, { method: "GET" });
  if (!res.ok) throw new Error(`ping failed: ${res.status}`);
}
```

### 2. `src/instrumentation.js` — wire the worker

```js
// In instrumentation.js:
const hc = settings.webhookHealthchecksIo;
if (hc?.some((c) => c.enabled)) {
  const { startHealthchecksIoWorker } = await import("@/lib/webhooks/healthchecks-io.js");
  startHealthchecksIoWorker({ intervalMs: 60_000 });
}
```

### 3. `src/lib/db/repos/settingsRepo.js` — default

```js
// In DEFAULT_SETTINGS:
  // Healthchecks.io checks: [{id, uuid, baseUrl, status, enabled}]
  webhookHealthchecksIo: [],
```

## Acceptance Criteria

- [ ] Ping Healthchecks.io `/ping/<uuid>` on schedule
- [ ] Supports `/start`, `/fail`, `/log` endpoints
- [ ] Multiple checks supported
- [ ] Settings-gated via `webhookHealthchecksIo`

## Testing

```bash
# Manual: curl https://hc-ping.com/<uuid>
# Worker: enable a check → check Healthchecks.io dashboard
```

## Related Docs

- Research: `../research/2026-09-15-webhook-exp-10-patterns-platforms.md` (R46)
- Plan: `../planning/2026-09-15-webhook-uptime-kuma-plan.md` (Uptime Kuma alternative)
- Interpretation: `../interpretation/2026-09-15-webhook-interpretation-guide.md`