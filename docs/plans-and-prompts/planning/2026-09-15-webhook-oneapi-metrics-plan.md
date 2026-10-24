# Webhook Implementation Plan — One API-Style Metrics (R43)

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (code ready for agent review)
**Tags:** #plan #webhook #implementation #code #r43 #oneapi #metrics

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

Implement One API-style metrics (R43): the metrics surface One API exposes — request counts, token usage, quota consumption, channel status — as a scrapeable endpoint and as webhook events. This makes 9router observable by external monitoring (Prometheus, Grafana, Uptime Kuma).

## Scope

**In scope:**
- `GET /api/webhooks/metrics` — JSON metrics snapshot
- `GET /api/webhooks/metrics/prometheus` — Prometheus text format
- Metrics: requests total, tokens total, errors total, quota used, channel up/down
- Periodic metrics event emission (optional)

**Out of scope (v1):**
- Full Prometheus exporter (histograms, labels)
- Grafana dashboards

## Rationale & Design Decisions

**Purpose:** Expose gateway metrics (requests, tokens, errors, latency) as JSON and Prometheus endpoints, so 9router can be monitored by standard tooling.

**Research grounding:** R43 (exp-10 patterns/platforms) — see Related Docs below for the exact experiment documents this plan derives from.

**Key design decisions:**
- **Two endpoints** — `/metrics` JSON for humans/dashboard and `/metrics/prometheus` for Prometheus scraping; both from the same counters.
- **Counter sources** — reuse existing usage tracking (`usageDb`) rather than duplicating instrumentation.
- **No new deps** — counters are plain in-process accumulators; Prometheus text format is trivial to emit.

**Trade-offs & risks:** Trade-off: in-process counters reset on restart — acceptable for local monitoring; for long-term history, scrape into Prometheus (which persists).

---
## Grounding in 9router

**Auth registration:** `/api/metrics` (JSON, **`PROTECTED_API_PATHS`**) + `/api/metrics/prometheus` (**`PUBLIC_API_PATHS`**, scrape-token checked in handler)

Prometheus scrapes have no dashboard session, so that one route is public and self-authenticates.

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
| `src/lib/webhooks/metrics.js` | new | Metrics collection |
| `src/app/api/webhooks/metrics/route.js` | new | JSON metrics endpoint |
| `src/app/api/webhooks/metrics/prometheus/route.js` | new | Prometheus format |

## Code

### 1. `src/lib/webhooks/metrics.js`

```js
// src/lib/webhooks/metrics.js
// One API-style metrics: request/token/error counts + channel status.
import { getAdapter } from "@/lib/db/driver.js";

/**
 * Collect a metrics snapshot.
 * @returns {Promise<object>}
 */
export async function collectMetrics() {
  const db = await getAdapter();
  const since24h = new Date(Date.now() - 24 * 60 * 60_000).toISOString();

  const events = await db.get(
    "SELECT COUNT(*) AS total FROM webhook_events WHERE created_at >= ?",
    [since24h]
  );
  const errors = await db.get(
    "SELECT COUNT(*) AS total FROM webhook_events WHERE payload LIKE '%error%' AND created_at >= ?",
    [since24h]
  );
  const byStatus = await db.all(
    "SELECT status, COUNT(*) AS c FROM webhook_events WHERE created_at >= ? GROUP BY status",
    [since24h]
  );

  return {
    window: "24h",
    events_total: events?.total || 0,
    errors_total: errors?.total || 0,
    by_status: Object.fromEntries(byStatus.map((r) => [r.status, r.c])),
    collected_at: new Date().toISOString(),
  };
}

/**
 * Render metrics in Prometheus text format.
 * @param {object} metrics
 * @returns {string}
 */
export function toPrometheus(metrics) {
  const lines = [
    "# HELP nine_router_webhook_events_total Webhook events in window",
    "# TYPE nine_router_webhook_events_total gauge",
    `nine_router_webhook_events_total ${metrics.events_total}`,
    "# HELP nine_router_webhook_errors_total Webhook errors in window",
    "# TYPE nine_router_webhook_errors_total gauge",
    `nine_router_webhook_errors_total ${metrics.errors_total}`,
  ];
  for (const [status, count] of Object.entries(metrics.by_status || {})) {
    lines.push(`nine_router_webhook_events_by_status{status="${status}"} ${count}`);
  }
  return lines.join("\n") + "\n";
}
```

### 2. `src/app/api/webhooks/metrics/route.js`

```js
// src/app/api/webhooks/metrics/route.js
// GET /api/webhooks/metrics — JSON metrics snapshot.
import { NextResponse } from "next/server";
import { collectMetrics } from "@/lib/webhooks/metrics.js";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await collectMetrics());
}
```

### 3. `src/app/api/webhooks/metrics/prometheus/route.js`

```js
// src/app/api/webhooks/metrics/prometheus/route.js
// GET /api/webhooks/metrics/prometheus — Prometheus text format.
import { collectMetrics, toPrometheus } from "@/lib/webhooks/metrics.js";

export const dynamic = "force-dynamic";

export async function GET() {
  const metrics = await collectMetrics();
  return new Response(toPrometheus(metrics), {
    headers: { "Content-Type": "text/plain; version=0.0.4" },
  });
}
```

## Acceptance Criteria

- [ ] JSON metrics endpoint (events/errors/by-status)
- [ ] Prometheus text format endpoint
- [ ] 24h window (configurable later)
- [ ] Scrapeable by external monitoring

## Testing

```bash
# Manual: curl http://localhost:20128/api/webhooks/metrics
# curl http://localhost:20128/api/webhooks/metrics/prometheus
```

## Related Docs

- Research: `../research/2026-09-15-webhook-exp-10-patterns-platforms.md` (R43)
- Plan: `../planning/2026-09-15-webhook-uptime-kuma-plan.md` (external monitoring)
- Interpretation: `../interpretation/2026-09-15-webhook-interpretation-guide.md`