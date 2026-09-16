# Webhook Implementation Plan — Uptime Kuma Integration (R45)

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (code ready for agent review)
**Tags:** #plan #webhook #implementation #code #r45 #uptime-kuma #monitoring

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

Implement Uptime Kuma integration (R45): push heartbeat/status to Uptime Kuma's push API so 9router appears as a monitored service. This is the external monitoring path — Uptime Kuma watches 9router, not the other way around.

## Scope

**In scope:**
- Push endpoint: `POST /api/push/<slug>?status=up&msg=OK&ping=123`
- Heartbeat worker: periodic push (configurable interval)
- Status: up/down/maintenance + response time
- Multiple monitors (one per webhook endpoint, or one for the gateway)

**Out of scope (v1):**
- Uptime Kuma's full API (status pages, incidents)
- Pull-based monitoring (Uptime Kuma polling 9router)

## Files

| File | Action | Purpose |
|------|--------|---------|
| `src/lib/webhooks/uptime-kuma.js` | new | Push client + worker |
| `src/instrumentation.js` | edit | Start worker |
| `src/lib/db/repos/settingsRepo.js` | edit | `webhookUptimeKuma: []` default |

## Code

### 1. `src/lib/webhooks/uptime-kuma.js`

```js
// src/lib/webhooks/uptime-kuma.js
// Uptime Kuma push API client + periodic heartbeat.
import { getSettings } from "@/lib/db/repos/settingsRepo.js";
import { proxyAwareFetch } from "open-sse/utils/proxyFetch.js";

const g = (global.__webhookUptimeKuma ??= { interval: null });

export function startUptimeKumaWorker({ intervalMs = 60_000 } = {}) {
  if (g.interval) return g.interval;
  g.interval = setInterval(tick, intervalMs);
  g.interval.unref?.();
  return g.interval;
}

export function stopUptimeKumaWorker() {
  if (g.interval) {
    clearInterval(g.interval);
    g.interval = null;
  }
}

async function tick() {
  const settings = await getSettings();
  const monitors = settings.webhookUptimeKuma || [];
  for (const m of monitors) {
    if (!m.enabled) continue;
    try {
      await pushHeartbeat(m);
    } catch (err) {
      console.error(`[uptime-kuma] ${m.slug} failed:`, err?.message || err);
    }
  }
}

async function pushHeartbeat(monitor) {
  const { pushUrl, slug, status = "up", msg, pingMs } = monitor;
  const url = pushUrl || `https://uptime.kuma.example.com/api/push/${slug}`;
  const params = new URLSearchParams({ status });
  if (msg) params.set("msg", msg);
  if (pingMs) params.set("ping", String(pingMs));
  const res = await proxyAwareFetch(`${url}?${params}`, { method: "POST" });
  if (!res.ok) throw new Error(`push failed: ${res.status}`);
}
```

### 2. `src/instrumentation.js` — wire the worker

```js
// In instrumentation.js:
const uk = settings.webhookUptimeKuma;
if (uk?.some((m) => m.enabled)) {
  const { startUptimeKumaWorker } = await import("@/lib/webhooks/uptime-kuma.js");
  startUptimeKumaWorker({ intervalMs: 60_000 });
}
```

### 3. `src/lib/db/repos/settingsRepo.js` — default

```js
// In DEFAULT_SETTINGS:
  // Uptime Kuma push monitors: [{id, slug, pushUrl, status, msg, pingMs, enabled}]
  webhookUptimeKuma: [],
```

## Acceptance Criteria

- [ ] Push to Uptime Kuma's `/api/push/<slug>` with status/ping/msg
- [ ] Periodic heartbeat (configurable interval)
- [ ] Multiple monitors supported
- [ ] Settings-gated via `webhookUptimeKuma`

## Testing

```bash
# Manual: curl "https://uptime.kuma.example.com/api/push/test?status=up&ping=50"
# Worker: enable a monitor → check Uptime Kuma dashboard
```

## Related Docs

- Research: `../research/2026-09-15-webhook-exp-10-patterns-platforms.md` (R45)
- Plan: `../planning/2026-09-15-webhook-healthchecks-io-plan.md` (Healthchecks.io alternative)
- Interpretation: `../interpretation/2026-09-15-webhook-interpretation-guide.md`