# Webhook Implementation Plan — Uptime Kuma Integration (R45)

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (code ready for agent review)
**Tags:** #plan #webhook #implementation #code #r45 #uptime-kuma #monitoring

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

## Rationale & Design Decisions

**Purpose:** Integrate with Uptime Kuma's push API so 9router's health is monitored by an external uptime dashboard.

**Research grounding:** R45 (exp-10 patterns/platforms) — see Related Docs below for the exact experiment documents this plan derives from.

**Key design decisions:**
- **Push API client** — periodic `GET/POST` to the Kuma push URL with status codes (up/start/fail), matching Kuma's push monitor contract.
- **Periodic heartbeat** — the existing scheduler emits the heartbeat; Kuma marks the service down if it stops.
- **Settings-backed URL** — the push URL is a setting; multiple monitors = multiple URLs.

**Trade-offs & risks:** Trade-off: Kuma push is one-directional (9router → Kuma) and needs outbound internet to the Kuma host. Complements the dead-man's-switch plan (R25) which is internal.

---
## Grounding in 9router

**Auth registration:** — (no API route; worker only)

Worker from `instrumentation.js`; the Kuma push URL is a setting.

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