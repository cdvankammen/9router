# Webhook Receive & Act — Implementation Plan

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #webhook #events #automation #notifications #milestones

## Scope

**In scope:**
- Inbound webhook receiver (`POST /api/webhooks/[id]`) with HMAC verification (Standard Webhooks spec)
- SQLite outbox event store + worker (transactional outbox pattern)
- Trigger→Condition→Action rule engine (Home Assistant model), JSON-configurable via settings
- Actions: notify (Apprise-style URLs), http (outbound POST), llm (reuse analyze-error pipeline), gateway (toggle provider/fallback), dashboard (SSE feed)
- Outbound notification triggers: quota 80%/90%/exhausted, provider error spike, fallback event, new model added, daily spend report

**Out of scope (v1):**
- Visual workflow editor (n8n-style) — JSON rules only
- Long-polling Mode B (Telegram model) — tunnel (Cloudflare/Tailscale) assumed available; revisit if needed
- Socket Mode / WebSocket inbound (Slack model) — HTTP only
- Dead man's switch (Healthchecks.io model) — separate feature
- Apprise as a dependency — implement URL schemes natively (fewer deps, more code)

## Milestones

### M1 — Inbound receiver + HMAC verification

**Files touched:**
- `src/app/api/webhooks/[id]/route.js` (new) — POST handler
- `src/lib/webhooks/verify.js` (new) — HMAC verification util
- `src/lib/webhooks/registry.js` (new) — webhook config CRUD (in-memory + settings-backed)
- `src/lib/db/repos/settingsRepo.js` — add `webhooks` + `webhookRules` + `notifyUrls` defaults
- `src/app/api/settings/route.js` — PATCH support for new keys (already generic)

**Acceptance criteria:**
- `POST /api/webhooks/<id>` with valid `webhook-id`/`webhook-timestamp`/`webhook-signature` headers → 200, event enqueued
- Invalid signature → 401; stale timestamp (>5 min) → 401; unknown webhook id → 404
- Raw body used for HMAC (`await req.text()`), constant-time compare (`crypto.timingSafeEqual`)
- Respond 2xx in <3s (Slack/Discord/Pipedream mandate)

### M2 — SQLite outbox + worker

**Files touched:**
- `src/lib/db/migrations/` — new migration: `webhook_events` table
- `src/lib/db/repos/webhookEventsRepo.js` (new) — CRUD + status transitions
- `src/instrumentation.js` — settings-gated worker polling pending events

**Acceptance criteria:**
- `webhook_events` table: `event_id` (unique idempotency key), `webhook_id` FK, `payload` JSON, `status` (pending→processing→delivered/failed), `attempts`, `next_retry_at`, `created_at`, `processed_at`
- Worker polls every N seconds (settings-gated, `instrumentation.js` pattern)
- Exponential backoff on failure; dead-letter after N retries
- Duplicate `event_id` → no-op (idempotency)

### M3 — Rule engine (TCA)

**Files touched:**
- `src/lib/webhooks/rules.js` (new) — rule matching + action dispatch
- `src/lib/webhooks/actions/notify.js` (new) — Apprise-style URL sender
- `src/lib/webhooks/actions/http.js` (new) — outbound POST
- `src/lib/webhooks/actions/llm.js` (new) — reuse analyze-error pipeline
- `src/lib/webhooks/actions/gateway.js` (new) — toggle provider/fallback
- `src/lib/webhooks/actions/dashboard.js` (new) — SSE feed

**Acceptance criteria:**
- Rule JSON: `{trigger: {event, filter}, condition: {and: [...]}, actions: [...]}`
- Trigger events: `provider.error`, `quota.warning`, `quota.exhausted`, `request.completed`, `webhook.inbound`, `fallback.used`, `model.added`
- Conditions: field/op/value comparisons (eq, neq, gt, lt, contains, regex)
- Actions: notify (ntfy://, slack://, discord://, tgram://, gotify://, json://), http, llm, gateway, dashboard
- Rules stored in `settingsRepo.js` `DEFAULT_SETTINGS.webhookRules`, PATCH-able via `/api/settings`

### M4 — Outbound notification triggers

**Files touched:**
- `src/shared/services/quotaAutoPing.js` — emit quota events at 80%/90%/exhausted
- `src/sse/handlers/chat.js` or `open-sse/handlers/chatCore.js` — emit provider.error / fallback.used / request.completed events
- `src/lib/webhooks/emitter.js` (new) — internal event emitter → outbox

**Acceptance criteria:**
- Quota 80%/90%/exhausted → notify (the P3-deferred spec, now implemented)
- Provider error spike → notify (LiteLLM-style)
- Fallback event → notify
- New model added → notify
- Daily spend report → notify (digest mode, LiteLLM-style)

### M5 — Dashboard UI (optional, P2)

**Files touched:**
- `src/app/dashboard/webhooks/page.js` (new) — webhook config + rules editor
- `src/app/dashboard/webhooks/events/page.js` (new) — event log viewer
- `src/components/webhooks/` (new) — RuleEditor, WebhookForm, EventTable components

**Acceptance criteria:**
- Create/edit/delete webhook endpoints (generate secret UUID)
- Create/edit/delete rules (JSON editor)
- View event log with status/attempts/retry
- Test button (send sample event)

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|-----------|------|------------|
| `crypto.timingSafeEqual` | Length mismatch throws | Pad/compare lengths first |
| `req.text()` raw body | Next.js body parsing | Read raw body before any `req.json()` |
| SQLite outbox | Single-node only | Fine for local-first; document limitation |
| Worker in `instrumentation.js` | Settings-gated startup | Follow existing pattern (console log capture etc.) |
| Apprise-style URLs | Many schemes to implement | Start with ntfy/slack/discord/tgram/gotify/json; extend later |

## Related Docs

- Research: `../research/2026-09-15-webhook-receive-act-research.md` (6-level binary tree, 12 archetypes, design decisions)
- Deferred spec: `../planning/messages-page-feature-spec.md` §6 (Apprise/Alertmanager notifications)
- Master plan: `../planning/2026-08-19-master-continuation-plan.md` item 10 (webhook notifications deferred)
- Gap analysis: `../research/9router/38-message-driven-tools-research.md` (no per-message actions / tool-building hooks)