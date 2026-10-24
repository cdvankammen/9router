# Grounding the Webhook Plans in the Real 9router Codebase

**Date:** 2026-10-03
**Author:** GitHub Copilot agent (main session)
**Status:** grounding reference for all 31 webhook plans
**Tags:** #plan #webhook #grounding #codebase #conventions

---

## ⚠️ AGENT REVIEW NOTE (READ FIRST)

> **⚠️ THIS IS A RESEARCH DOCUMENT — NOT AN IMPLEMENTATION INSTRUCTION.**
>
> **Everything here is a SUGGESTION / OPTION for future agents — NOT a final decision and NOT an instruction to implement anything.**
>
> The codebase facts below were verified against the real repository on 2026-10-03, but the
> codebase will drift. Re-verify each fact before relying on it. If the code has moved on,
> **the code wins over this document**.

---

## Purpose

The 31 webhook plans were written from research + earlier codebase inspection. This document
grounds them in the **actual** 9router codebase and records every discrepancy found, so a
future agent implementing any plan starts from reality rather than from a stale assumption.

## Research grounding

Derived from the 48 research roots (R01–R48) across `research/2026-09-15-webhook-exp-01`
through `exp-11`, plus a direct read of the 9router source on 2026-10-03.

---

## Discrepancies Found (Plans vs. Reality)

### D1 — Auth is enforced centrally in `dashboardGuard.js`, not per-route ❌ CRITICAL

**Reality:** Auth is *not* enforced inside individual route handlers. It is enforced by
`src/dashboardGuard.js` (mounted via `src/proxy.js`), which classifies every path against
four lists:

| List | Effect | Example |
|---|---|---|
| `PUBLIC_API_PATHS` | always allowed | `/api/health`, `/api/auth/login` |
| `PUBLIC_PREFIXES` | allowed, own key auth in handler | `/v1`, `/api/v1beta`, `/codex` |
| `ALWAYS_PROTECTED` | JWT required even if `requireLogin=false` | `/api/shutdown`, `/api/settings/database` |
| `PROTECTED_API_PATHS` | JWT unless `requireLogin=false` | `/api/settings`, `/api/keys`, `/api/usage` |
| `LOCAL_ONLY_PATHS` | loopback + CLI token + auth | `/api/mcp/`, `/api/tunnel/*` |

**What the plans said:** 0/31 mentioned `dashboardGuard`, `verifyDashboardAuthToken`, or
`auth_token`. Most implied a route-level auth call that may not exist.

**Correction applied:** Every plan that adds an API route now carries a **Auth registration**
block naming the exact `dashboardGuard` list its path belongs in.

**Key insight for inbound webhooks:** an *inbound* webhook endpoint is called by a third party
with an HMAC signature — it must NOT require a dashboard JWT. It therefore needs either a
`PUBLIC_API_PATHS` entry (auth handled by its own HMAC verify) or `LOCAL_ONLY_PATHS` if it
should only be reachable locally.

### D2 — `POST /api/hooks` already exists ❌ CRITICAL

**Reality:** `src/app/api/hooks/route.js` already POSTs a message to a webhook/script URL with
`{{field}}` template expansion (`buildHookContext`, `expandTemplate`, `extractText` from
`src/shared/hookTemplate.js`). It already has a URL scheme whitelist (http/https only) and
strips `Authorization` from outbound headers.

**What the plans said:** 0/31 mentioned `api/hooks` or `hookTemplate`.

**Correction applied:** The plans now treat `src/shared/hookTemplate.js` as the **existing
template engine to reuse**, not something to rebuild. The `{{field}}` templating proposed by
several plans already exists — extend it rather than duplicating.

### D3 — Migration numbering was stale ❌ MINOR

**Reality:** Migrations are `001-initial.js`, `002-fk-provider-connections.js`,
`003-message-facets.js`, `004-message-annotations.js`, `005-seen-models.js` + `index.js`.
New migrations start at **006**, not 005.

**Correction applied:** Plans that add tables now say migration `006-...`.

### D4 — `settingsRepo` is imported from `@/lib/localDb` in routes ❌ MINOR

**Reality:** Route handlers import `import { getSettings, updateSettings } from "@/lib/localDb"`
(a compat shim re-exporting `@/lib/db/index.js`), while `instrumentation.js` imports
`@/lib/db/repos/settingsRepo.js` directly. Both work; routes conventionally use the shim.

**Correction applied:** Route code snippets use `@/lib/localDb`; worker/instrumentation code uses
`@/lib/db/repos/settingsRepo.js` — matching the existing convention in each context.

### D5 — EventEmitter is the established in-process bus ✅ CONFIRMED

**Reality:** `src/lib/usageDb.js` exports a `statsEmitter` consumed by
`src/app/api/usage/stream/route.js`, which is an existing SSE endpoint
(`ReadableStream` + `controller.enqueue("data: ...\n\n")` + `setInterval` keepalive +
`statsEmitter.on("update"|"pending")` + teardown in `catch`).

**What the plans said:** The pub/sub plan proposed a *new* typed event bus.

**Correction applied:** The pub/sub plan now follows the **existing emitter + SSE stream**
pattern rather than inventing a parallel one, and explicitly notes `usage/stream` as the
template to copy.

### D6 — Worker startup must be in `instrumentation.js`, and it IS standalone-safe ❌ IMPORTANT

**Reality:** `src/instrumentation.js` gates on `process.env.NEXT_RUNTIME === "nodejs"` and uses
settings-gated dynamic imports. The file carries an explicit warning (comment + learnings
reference) that **layout bootstrap chunks get tree-shaken in Next.js 16 standalone builds**, so
workers must be started from `instrumentation.js`, not from a layout.

**Correction applied:** Every plan that adds a worker now specifies `instrumentation.js` startup
with the settings gate and the tree-shaking reason.

### D7 — Route handler boilerplate is consistent ✅ CONFIRMED

**Reality:** Routes use `export const dynamic = "force-dynamic"` (often also
`export const revalidate = 0`), import `NextResponse` from `next/server`, and return
`NextResponse.json(...)` with `Cache-Control: no-store` where appropriate.

**Correction applied:** Snippets keep this boilerplate.

### D8 — Secrets must not be mass-assigned (CWE-915 pattern) ❌ IMPORTANT

**Reality:** `src/app/api/settings/route.js` defines `PROTECTED_SETTING_KEYS` and strips them
from request bodies before any write. Webhook secrets stored in settings must follow this.

**Correction applied:** Plans that store secrets say to strip them from request bodies and never
return them in GET responses.

---

## Grounding Rules (apply to every plan)

1. **Register the route in `dashboardGuard.js`** — pick the correct list
   (`PUBLIC_API_PATHS` for HMAC-authenticated inbound, `PROTECTED_API_PATHS` for
   dashboard CRUD, `ALWAYS_PROTECTED` for destructive ops). Do not hand-roll auth in the route.
2. **Reuse `src/shared/hookTemplate.js`** for `{{field}}` expansion — it already exists.
3. **Import `getSettings`/`updateSettings` from `@/lib/localDb` in routes**, and
   `@/lib/db/repos/settingsRepo.js` in `instrumentation.js` workers.
4. **New migrations start at `006`.**
5. **Start workers from `instrumentation.js`** (settings-gated, `NEXT_RUNTIME === "nodejs"`),
   never from a layout — layout chunks tree-shake in standalone builds.
6. **Follow the emitter + SSE pattern** from `usageDb.statsEmitter` →
   `api/usage/stream/route.js` for any in-process events or streams.
7. **Strip secrets from request bodies and GET responses** (CWE-915).
8. **Keep `export const dynamic = "force-dynamic"`** on every route.

---

## Where Each Plan Lands

| Plan | Lands at | Registered in | Notes |
|---|---|---|---|
| M1 receiver | `src/app/api/webhooks/[id]/route.js`, `src/lib/webhooks/verify.js` | `dashboardGuard.PUBLIC_API_PATHS` | Inbound → HMAC is its own auth |
| M2 outbox | `src/lib/webhooks/outbox.js`, migration `006-webhook-events` | — | Worker from `instrumentation.js` |
| M3 rules | `src/lib/webhooks/rules.js` | `dashboardGuard.PROTECTED_API_PATHS` | CRUD via `/api/webhooks/rules` |
| M4 triggers | emitters in `chatCore`/analyze-error/quota paths | — | Reuse `usageDb` emitter pattern |
| M5 dashboard | `src/app/dashboard/webhooks/*` | — | Reads the same repos |
| messaging / push / apprise | `src/lib/webhooks/actions/*.js` | `PROTECTED_API_PATHS` for CRUD | Reuse `hookTemplate` |
| standards / stripe / github | extend M1 `verify.js` | same as M1 | Format adapters, not new routes |
| hookdeck | `src/app/api/webhooks/ingress/route.js` | `PUBLIC_API_PATHS` | Catch-all ingress |
| pubsub | `src/lib/webhooks/bus.js` | — | Mirror `usageDb.statsEmitter` |
| SSE / WS / long-poll | `src/app/api/webhooks/events/route.js` | `PROTECTED_API_PATHS` | Copy `api/usage/stream` |
| workflows (n8n/Node-RED/Pipedream/Inngest/Huginn) | `src/lib/workflows/*` | `PROTECTED_API_PATHS` for CRUD | Overlap M3 — pick one |
| alerts / metrics / observability | `src/lib/webhooks/alerts.js`, `src/app/api/metrics/*` | `PROTECTED_API_PATHS` / `PUBLIC` for Prometheus | Reuse `usageDb` counters |
| uptime-kuma / healthchecks / dead-man | `src/lib/webhooks/monitors.js` | — | Worker from `instrumentation.js` |
| http-client | `src/lib/webhooks/fetch.js` | — | Wraps `open-sse/utils/proxyFetch` |

---

## Acceptance Criteria for Grounding

A plan is only ready to implement when a future agent can answer, from the plan alone:

- [ ] Which file(s) does this create or edit? (Files table)
- [ ] Which `dashboardGuard` list does each new route join?
- [ ] Which existing module does this reuse (rather than rebuild)?
- [ ] Where does the worker start, and why there?
- [ ] What research root does it derive from, and what trade-offs were accepted?
- [ ] What must be verified to call it done?

---

## Related Docs

- All 31 plans: `planning/2026-09-15-webhook-*-plan.md`
- Research: `research/2026-09-15-webhook-exp-01` … `exp-11`, master map `…-exponential-master-map.md`
- Interpretation: `interpretation/2026-09-15-webhook-interpretation-guide.md`
- Verified sources: `src/dashboardGuard.js`, `src/app/api/hooks/route.js`,
  `src/shared/hookTemplate.js`, `src/instrumentation.js`, `src/lib/db/migrations/` (001–005),
  `src/lib/db/repos/settingsRepo.js`, `src/app/api/settings/route.js`,
  `src/app/api/usage/stream/route.js`, `src/lib/usageDb.js`