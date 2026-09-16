# Webhook Receive & Act — Synthesis (Distilled Knowledge)

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** active
**Tags:** #interpretation #webhook #synthesis #distilled

---

## Purpose

This doc distills the entire webhook research body (23 docs) into the essential knowledge. If you read only one research-adjacent doc, read this one. Every claim links to its source.

---

## 1. The Verdict (What Exists Today)

**9router has zero webhook infrastructure.** ([source: flat research Verdict](`../research/2026-09-15-webhook-receive-act-research.md`))

- `grep "webhook"` in `src/**` → **EMPTY** (all 144 matches are docs-only)
- No inbound receiver, no outbound sender, no event bus / EventEmitter / pub-sub / hooks
- Only UI toasts (`src/store/notificationStore.js` — Zustand) + CLI tray notifications
- Quota-alert webhooks: `quotaAlert|quotaThreshold|alertAt|budgetAlert` in `src/` → EMPTY

**Planned-but-not-implemented (docs only):**
- `planning/messages-page-feature-spec.md` §6 — Apprise-style notifications, Alertmanager semantics → **Deferred (P3)**
- `gitbook/content/en/features/quota-tracking.md` — quota warnings 80%/90%/exhausted → **Aspirational**

**Reusable infrastructure exists for a future webhook system:**
| Piece | Location | Reuse for |
|-------|----------|-----------|
| API route pattern | `src/app/api/*/route.js` | New webhooks routes |
| Settings store | `src/lib/db/repos/settingsRepo.js` | Webhook rules + notify URLs config |
| Background-job startup | `src/instrumentation.js` | Outbox worker polling |
| LLM action pipeline | `src/app/api/analyze-error/route.js` | Webhook → LLM action |
| Request capture | `src/lib/usageDb.js` + messages route | Event source data |
| Tunnel exposure | `src/app/api/tunnel/` | Public webhook URL |
| SQLite layer | `src/lib/db/` | Outbox table |
| Quota scheduler | `src/shared/services/quotaAutoPing.js` | Quota-triggered events |

---

## 2. The 12 Archetypes (How Every Program Fits)

Every program researched falls into one of 12 archetypes ([source: flat research Part 3](`../research/2026-09-15-webhook-receive-act-research.md`)):

| # | Archetype | Example | Inbound? | Outbound? | Actions | Auth |
|---|-----------|---------|----------|-----------|---------|------|
| 1 | TCA Rule Engine | Home Assistant | ✅ | ✅ | trigger→condition→action | Secret ID in URL |
| 2 | Visual Workflow Engine | n8n, Make | ✅ | ✅ | Multi-step node graph | Token/JWT |
| 3 | Flow-Based Programming | Node-RED | ✅ | ✅ | Connected node graph | Basic auth |
| 4 | Event Source + Workflow | Pipedream | ✅ | ✅ | Code steps + app actions | Token/OAuth |
| 5 | Agent Graph | Huginn | ✅ | ✅ | Agent chains | Basic auth |
| 6 | HMAC-Signed Receiver | Stripe, GitHub, Svix | ✅ | ❌ | Receiver-side | HMAC + timestamp |
| 7 | Dual-Mode Receiver | Slack, Telegram | ✅ | ✅ | Queue + process | HMAC or WebSocket |
| 8 | Ed25519 Receiver | Discord | ✅ | ✅ | Callback types | Ed25519 signature |
| 9 | Outbound Alert Router | LiteLLM, Uptime Kuma | ❌ | ✅ | Notify only | Webhook URL |
| 10 | Universal Adapter | Apprise | ❌ | ✅ | Notify 100+ services | Schema:// URLs |
| 11 | Dead Man's Switch | Healthchecks.io | ✅ (inverse) | ✅ | Alert on absence | UUID/secret |
| 12 | Embedded Event Queue | Inngest, Trigger.dev | N/A | N/A | SDK in your app | SDK token |

---

## 3. The Recommended Architecture (What 9router Should Build)

**Hybrid of #1 (TCA Rule Engine) + #7 (Dual-Mode Receiver) + #10 (Universal Adapter)** ([source: flat research Part 4](`../research/2026-09-15-webhook-receive-act-research.md`))

```
┌─── INBOUND (Dual-Mode Receiver) ─────────────────────────────┐
│  Mode A: HTTP Receiver                                        │
│  POST /api/webhooks/[id]  (id = secret UUID, HA model)        │
│  • Raw body via req.text() (Svix/Stripe rule — CRITICAL)     │
│  • HMAC verify: webhook-id/timestamp/signature (Std Webhooks) │
│  • 5-min tolerance, constant-time compare                     │
│  • Respond 2xx <3s, enqueue, process async (Slack mandate)    │
│  Mode B: Long-Polling Fallback (Telegram model)               │
│  GET /api/webhooks/poll — for senders that can't reach you    │
│  Mode C: SSE Feed (optional) — GET /api/webhooks/stream       │
└───────────────────────────────────────────────────────────────┘
┌─── EVENT STORE (Transactional Outbox) ───────────────────────┐
│  SQLite table: webhook_events                                 │
│  • event_id (idempotency key, unique)                         │
│  • webhook_id (FK), payload (JSONB)                           │
│  • status: pending → processing → delivered / failed          │
│  • attempts, next_retry_at (exponential backoff)              │
│  • created_at, processed_at                                   │
│  Worker: instrumentation.js pattern (polls every N seconds)   │
└───────────────────────────────────────────────────────────────┘
┌─── RULE ENGINE (Home Assistant TCA) ─────────────────────────┐
│  Rule: { trigger: {event, filter},                            │
│          condition: {and: [{field, op, value}]},              │
│          actions: [{type: notify|http|llm|gateway|dashboard}] }│
│  Stored in: settingsRepo.js DEFAULT_SETTINGS.webhookRules     │
│  Configurable via: PATCH /api/settings                        │
└───────────────────────────────────────────────────────────────┘
┌─── OUTBOUND (Universal Adapter) ─────────────────────────────┐
│  "notifyUrls": ["ntfy://mytopic", "slack://...",              │
│                 "discord://...", "tgram://...",               │
│                 "gotify://...", "json://..."]                 │
│  Triggers: quota 80/90/exhausted, provider error spike,       │
│            fallback event, new model added, daily spend       │
└───────────────────────────────────────────────────────────────┘
```

---

## 4. The 10 Design Decisions (The "Why" Behind Everything)

Each backed by precedent ([source: flat research Part 5](`../research/2026-09-15-webhook-receive-act-research.md`)):

| # | Decision | Precedent | Why |
|---|----------|-----------|-----|
| 1 | **HMAC + timestamp** (not just secret ID) | Stripe, Slack, Svix, GitHub | Secret IDs alone are fine local-only; HMAC needed if exposed via tunnel/public URL |
| 2 | **Raw body for HMAC** (`req.text()`) | Svix/Standard Webhooks, Next.js | Parsing JSON before HMAC breaks the signature — the #1 mistake |
| 3 | **Respond 2xx <3s, queue async** | Slack (3s), Discord (3s), Pipedream | Prevents timeout retries from senders |
| 4 | **SQLite outbox, not Redis/RabbitMQ** | 9router is single-node local-first | No external deps; transactional outbox = at-least-once; instrumentation.js worker |
| 5 | **Event IDs for idempotency** | Stripe, GitHub, Slack, Telegram | Delivery is NOT guaranteed once; receivers MUST dedupe |
| 6 | **Dual mode: HTTP + long-polling** | Telegram, Slack | HTTP for public/tunneled; long-polling for localhost-only |
| 7 | **Apprise-style outbound** | 9router's deferred spec, LiteLLM, Uptime Kuma | Covers 100+ services; aligns with existing plan |
| 8 | **Event→Condition→Action rules** | Home Assistant, n8n, Node-RED | Simplest automation model; JSON-configurable; no visual editor needed initially |
| 9 | **LLM action reuse** | 9router's analyze-error pipeline, Slack reacji→LLM | Webhook→LLM is the same pattern as analyze-error |
| 10 | **TCA in settings** | 9router's settingsRepo pattern | Rules are JSON in DEFAULT_SETTINGS, PATCH-able — same as every other config |

---

## 5. The Exponential Map (48 Roots → 11 Branches)

The exponential expansion took **every phrase** from the source docs and made it a root ([source: exponential master map](`../research/2026-09-15-webhook-exponential-master-map.md`)):

| Branch | Roots | Theme |
|--------|-------|-------|
| exp-01 receiver-transport | R01–R04 | Receiver endpoint, raw body, payload limits, response contract |
| exp-02 auth-secrets | R05–R08 | HMAC, secret management, rotation, timing-safe compare |
| exp-03 event-store-worker | R09–R11 | Outbox table, worker & retry, idempotency |
| exp-04 rule-engine-actions | R12–R14 | TCA, rule matching, actions |
| exp-05 messaging-platforms | R15–R17 | Slack, Discord, Telegram |
| exp-06 push-services | R18–R20 | ntfy, Gotify, Apprise |
| exp-07 internal-events | R21–R23 | Quota events, provider errors, fallback events |
| exp-08 scheduled-monitoring | R24–R25 | Daily digest, dead man's switch |
| exp-09 standards-infra | R26–R29 | Stripe, GitHub, Svix, Hookdeck |
| exp-10 patterns-platforms | R30–R46 | Event patterns, automation platforms, gateway precedents, monitoring, messaging |
| exp-11 http-client | R47–R48 | Outbound HTTP client, timeout & retry |

**Scale:** 48 roots × 6 levels, N-ary branching = **11,862 enumerated nodes** (172 L1 / 439 L2 / 912 L3 / 1,759 L4 / 3,179 L5 / 5,401 L6). With branching factor 4 ≈ 65,520 nodes; factor 6 ≈ 448,000.

**Every node carries:** finding + precedent + 9router application.

---

## 6. The Implementation Plan (M1–M5)

([source: plan](`../planning/2026-09-15-webhook-receive-act-plan.md`)) — **draft, awaiting user go-ahead**

| Milestone | What | Key files | Acceptance |
|-----------|------|-----------|------------|
| **M1** Inbound receiver + HMAC | POST /api/webhooks/[id], HMAC verify, raw body, 2xx <3s | `src/app/api/webhooks/[id]/route.js`, `src/lib/webhooks/verify.js`, `registry.js` | valid → 200 + enqueue; invalid → 401; stale → 401; unknown → 404 |
| **M2** SQLite outbox + worker | webhook_events table, status machine, worker, backoff, dead-letter | migration, `webhookEventsRepo.js`, `instrumentation.js` | duplicate event_id → no-op; backoff; dead-letter after N retries |
| **M3** Rule engine (TCA) | trigger→condition→action JSON rules, 5 action types | `src/lib/webhooks/rules.js`, `actions/*.js` | rules in settingsRepo, PATCH-able |
| **M4** Outbound triggers | quota 80/90/exhausted, provider error spike, fallback, new model, daily spend | `quotaAutoPing.js`, `chatCore.js`, `emitter.js` | each trigger → notify |
| **M5** Dashboard UI (P2) | webhook config, rules editor, event log | `src/app/dashboard/webhooks/*`, `src/components/webhooks/*` | create/edit/delete endpoints + rules; event log; test button |

**Out of scope (v1):** visual workflow editor, long-polling Mode B, Socket Mode/WebSocket, dead man's switch, Apprise as dependency (implement URL schemes natively).

---

## 7. Open Questions (From the Research)

([source: flat research Open Questions](`../research/2026-09-15-webhook-receive-act-research.md`))

- **Tunnel vs local-only:** Should webhooks be exposed via tunnel (cloudflare/tailscale) or stay localhost-only? (HMAC needed either way; tunnel enables public senders)
- **Apprise dependency vs native schemes:** Implement URL schemes natively (fewer deps, more code) or add Apprise as a dependency?
- **Long-polling Mode B:** Needed only if senders can't reach 9router without a tunnel — defer until a real use case appears
- **Dead man's switch:** Separate feature (Healthchecks.io model) — defer
- **Visual workflow editor:** JSON rules first; n8n-style editor later if users need it

---

## 8. Confidence Levels

| Area | Confidence | Why |
|------|-----------|-----|
| Codebase verdict (no webhook infra) | **High** | Direct grep evidence |
| Recommended architecture (hybrid) | **High** | 3 proven patterns, each with strong precedent |
| 10 design decisions | **High** | Each backed by 2+ named programs |
| 12 archetypes | **Medium-High** | Derived from 20+ programs; some general-knowledge (flagged) |
| Exponential node counts | **Medium** | Enumerated nodes are the practically researchable set, not theoretical max |
| Apprise URL scheme details | **Medium** | Some schemes from general knowledge, not fetched |

---

## Related Docs

- Interpretation: `./2026-09-15-webhook-interpretation-guide.md` (start here), `./2026-09-15-webhook-doc-by-doc.md`, `./2026-09-15-webhook-order-and-next-steps.md`
- Research: `../research/2026-09-15-webhook-receive-act-research.md`, `../research/2026-09-15-webhook-master-research-tree.md`, `../research/2026-09-15-webhook-exponential-master-map.md`
- Plan: `../planning/2026-09-15-webhook-receive-act-plan.md`
- Tracking: `../tracking/TASKS.md`, `../tracking/CHANGELOG.md`, `../tracking/SESSION-HISTORY.md`, `../tracking/SESSION-NARRATIVE.md`