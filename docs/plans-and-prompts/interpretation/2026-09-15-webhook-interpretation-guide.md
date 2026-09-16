# Webhook Receive & Act — Interpretation Guide

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** active
**Tags:** #interpretation #webhook #guide #index #synthesis

---

## The One-Page Summary

**Question asked:** Does 9router have a place to receive webhooks and act on them? If not, research everything other programs do (popular and not), at minimum binary-tree depth 5, then expanded to depth 6, then expanded to true exponential N-ary (every phrase = root, 6 levels, N children per node).

**Verdict:** **Neither half exists in 9router today.** `grep "webhook"` in `src/**` → EMPTY. No inbound receiver, no outbound sender, no event bus/pub-sub/hooks. Only UI toasts + CLI tray notifications exist.

**What was built (docs only, no code):** 23 documents across 4 phases, additive (nothing removed):

| Phase | What | Docs | Scale |
|-------|------|------|-------|
| 1 | Flat deep research (6-level binary tree across 20+ programs) | 1 research + 1 plan | 48KB research, 12 archetypes, 10 design decisions |
| 2 | 2-way binary tree expansion (recursive: each finding → 2 children × 6 levels) | 1 master tree + 8 branch docs | 63 nodes, 7-node subtrees |
| 3 | True exponential N-ary expansion (every phrase = root, N children, 6 levels) | 1 master map + 11 branch docs | 48 roots, 11,862 enumerated nodes |
| 4 | Interpretation layer (this doc + 3 more) | 4 docs | You are here |

**Recommended architecture (from research):** Hybrid of **TCA Rule Engine** (Home Assistant) + **Dual-Mode Receiver** (Slack/Telegram) + **Universal Adapter** (Apprise).

**Implementation plan (5 milestones, deferred):** M1 inbound receiver + HMAC → M2 SQLite outbox + worker → M3 TCA rule engine + actions → M4 outbound triggers → M5 dashboard UI (P2).

---

## The 4 Phases of Work (Chronological)

### Phase 1 — Flat Deep Research + Plan
**User asked:** "deep research... minimum binary tree depth 5... then double to depth 6"

| Doc | Purpose | Key content |
|-----|---------|-------------|
| `../research/2026-09-15-webhook-receive-act-research.md` | The foundational research | Codebase verdict (empty), 20+ programs analyzed at 6 levels, 12 archetypes, recommended hybrid architecture, 10 design decisions, sources + confidence |
| `../planning/2026-09-15-webhook-receive-act-plan.md` | Phased implementation plan | M1–M5 milestones, files touched, acceptance criteria, dependencies, risks |

### Phase 2 — 2-Way Binary Tree Expansion
**User clarified:** "binary tree = recursive expansion: each finding branches into 2 sub-topics × 6 levels (63 nodes per root)"

| Doc | Purpose | Key content |
|-----|---------|-------------|
| `../research/2026-09-15-webhook-master-research-tree.md` | Master map of the 2-way tree | 63 nodes, 8 Level-3 branches, status table |
| `../research/2026-09-15-webhook-branch-a1a-transport.md` | Branch A1a: transport | POST /api/webhooks/[id], raw body, payload limits, challenge handshake |
| `../research/2026-09-15-webhook-branch-a1b-auth-security.md` | Branch A1b: auth & security | HMAC (Stripe vs Standard Webhooks), timingSafeEqual, 5-min tolerance, secret rotation |
| `../research/2026-09-15-webhook-branch-a2a-event-store.md` | Branch A2a: event store | Outbox table, transactional outbox, worker polling, exponential backoff, dead-letter |
| `../research/2026-09-15-webhook-branch-a2b-rule-engine.md` | Branch A2b: rule engine | TCA model, JSON rules, field/op/value + JSONPath, actions, LLM action, idempotent actions |
| `../research/2026-09-15-webhook-branch-b1a-messaging-platforms.md` | Branch B1a: messaging | Slack, Discord, Telegram inbound/outbound, retry semantics, rate caps |
| `../research/2026-09-15-webhook-branch-b1b-push-services.md` | Branch B1b: push services | ntfy, Gotify, Apprise, tag routing, priority/escalation |
| `../research/2026-09-15-webhook-branch-b2a-internal-events.md` | Branch B2a: internal events | Quota events, provider error spikes, fallback events, emit-on-transition dedupe |
| `../research/2026-09-15-webhook-branch-b2b-scheduled-monitoring.md` | Branch B2b: scheduled | Daily digest, new-model alert, dead man's switch, watchdog |

### Phase 3 — True Exponential N-ary Expansion
**User clarified again:** "every phrase in the source docs is a root, each branches N-ary (3–15+ children), 6 levels deep — exponential, not 1→2→4→8"

| Doc | Purpose | Roots covered |
|-----|---------|---------------|
| `../research/2026-09-15-webhook-exponential-master-map.md` | Master map of N-ary expansion | 48 roots R01–R48, methodology, node counts (11,862 enumerated) |
| `../research/2026-09-15-webhook-exp-01-receiver-transport.md` | Exp branch 01 | R01–R04: receiver modes, raw body, payload limits, response contract, idempotency, replay |
| `../research/2026-09-15-webhook-exp-02-auth-secrets.md` | Exp branch 02 | R05–R08: HMAC variants, timing-safe compare, rotation, dual-secret grace, local-only, TLS/mTLS |
| `../research/2026-09-15-webhook-exp-03-event-store-worker.md` | Exp branch 03 | R09–R11: transactional outbox, status machine, worker, backoff, dead-letter, at-least-once |
| `../research/2026-09-15-webhook-exp-04-rule-engine-actions.md` | Exp branch 04 | R12–R14: TCA, JSON rules, field/op/value, JSONPath, action types, LLM action, idempotent |
| `../research/2026-09-15-webhook-exp-05-messaging-platforms.md` | Exp branch 05 | R15–R17: Slack, Discord, Telegram, retry semantics, rate caps |
| `../research/2026-09-15-webhook-exp-06-push-services.md` | Exp branch 06 | R18–R20: ntfy, Gotify, Apprise, tag routing, priority/escalation, templates |
| `../research/2026-09-15-webhook-exp-07-internal-events.md` | Exp branch 07 | R21–R23: quota events, provider error spikes, fallback events, dedupe, quotaAutoPing wiring |
| `../research/2026-09-15-webhook-exp-08-scheduled-monitoring.md` | Exp branch 08 | R24–R25: daily digest, new-model alert, dead man's switch, watchdog |
| `../research/2026-09-15-webhook-exp-09-standards-infra.md` | Exp branch 09 | R26–R29: Standard Webhooks, Svix, Hookdeck, OpenAPI, event schemas, delivery guarantees |
| `../research/2026-09-15-webhook-exp-10-patterns-platforms.md` | Exp branch 10 | R30–R46: 17 roots — event patterns, automation platforms, gateway precedents, monitoring, messaging |
| `../research/2026-09-15-webhook-exp-11-http-client-architecture.md` | Exp branch 11 | R47–R48: outbound HTTP client, retry/backoff, connection pooling, timeouts, circuit breakers |

### Phase 4 — Interpretation Layer (This Work)
**User asked:** "interpretation of those documents... make sure research is in full working and understandable and organized order... create a set of documents that put everything in clear readable and easy to understand the intent of work and order"

| Doc | Purpose |
|-----|---------|
| `./2026-09-15-webhook-interpretation-guide.md` | **This doc** — one-page summary, 4 phases, complete doc map, key conclusions, reading order |
| `./2026-09-15-webhook-doc-by-doc.md` | Plain-language summary of every webhook doc |
| `./2026-09-15-webhook-synthesis.md` | Distilled knowledge: verdict, archetypes, architecture, decisions, roots→branches, open questions |
| `./2026-09-15-webhook-order-and-next-steps.md` | Chronological timeline, logical reading order, build order (M1–M5), deferred items |

---

## Key Conclusions (What the Research Actually Says)

### 1. The Codebase Has Zero Webhook Infrastructure
- No inbound receiver, no outbound sender, no event bus
- Only UI toasts (`src/store/notificationStore.js`) + CLI tray
- Quota alerts are aspirational in docs only

### 2. The Recommended Architecture Is a Hybrid of 3 Proven Patterns
| Pattern | Source | What 9router Takes |
|---------|--------|-------------------|
| **TCA Rule Engine** | Home Assistant | Trigger→Condition→Action JSON rules, stored in settings, PATCH-able |
| **Dual-Mode Receiver** | Slack (HTTP + Socket Mode), Telegram (webhook + getUpdates) | HTTP receiver + long-polling fallback for localhost-only |
| **Universal Adapter** | Apprise, LiteLLM, Uptime Kuma | One URL scheme → 100+ services (ntfy, Slack, Discord, Telegram, Gotify, generic JSON) |

### 3. The 10 Design Decisions (Each Backed by Precedent)
1. **HMAC + timestamp** (not just secret ID) — Stripe, Slack, Svix, GitHub
2. **Raw body for HMAC** (`req.text()` before parse) — Svix/Standard Webhooks, Next.js
3. **Respond 2xx <3s, queue async** — Slack (3s), Discord (3s), Pipedream
4. **SQLite outbox, not Redis/RabbitMQ** — 9router is single-node local-first
5. **Event IDs for idempotency** — Stripe, GitHub, Slack, Telegram
6. **Dual mode: HTTP + long-polling** — Telegram, Slack
7. **Apprise-style outbound** — 9router's own deferred spec, LiteLLM, Uptime Kuma
8. **Event→Condition→Action rules** — Home Assistant, n8n, Node-RED
9. **LLM action reuse** — 9router's analyze-error pipeline, Slack reacji→LLM
10. **TCA in settings** — 9router's settingsRepo pattern

### 4. The 48 Roots → 11 Branch Docs (Exponential Map)
The exponential expansion took every phrase from the flat research + 2-way tree + plan and made each a root (R01–R48), grouped into 11 branch docs. Each branch doc contains the full N-ary tree (6 levels, N children per node) with finding + precedent + 9router application at every node.

---

## Recommended Reading Order

### If you have 5 minutes → Read this guide + the synthesis doc
1. `./2026-09-15-webhook-interpretation-guide.md` (this doc)
2. `./2026-09-15-webhook-synthesis.md` (distilled knowledge)

### If you have 30 minutes → Read the flat research + plan
1. `../research/2026-09-15-webhook-receive-act-research.md` (Parts 3, 4, 5 — taxonomy, architecture, decisions)
2. `../planning/2026-09-15-webhook-receive-act-plan.md` (M1–M5 milestones)

### If you're implementing → Read the plan + the relevant exp branch docs
1. `../planning/2026-09-15-webhook-receive-act-plan.md` (M1–M5)
2. The exp branch doc matching your milestone:
   - M1 (receiver): `../research/2026-09-15-webhook-exp-01-receiver-transport.md` + `exp-02-auth-secrets.md`
   - M2 (outbox): `../research/2026-09-15-webhook-exp-03-event-store-worker.md`
   - M3 (rules): `../research/2026-09-15-webhook-exp-04-rule-engine-actions.md`
   - M4 (outbound): `../research/2026-09-15-webhook-exp-05-messaging-platforms.md` + `exp-06-push-services.md` + `exp-07-internal-events.md` + `exp-08-scheduled-monitoring.md`
   - M5 (UI): `../research/2026-09-15-webhook-exp-01-receiver-transport.md` (endpoint lifecycle section)

### If you want the full depth → Read the 2-way branch docs
The 8 branch docs (`../research/2026-09-15-webhook-branch-*.md`) are the "spine" — each covers a 7-node subtree with deep research. They're more readable than the exponential branches.

---

## Current Status

| Item | Status |
|------|--------|
| Research (all 3 layers) | ✅ Complete |
| Plan (M1–M5) | ✅ Complete (draft, awaiting go-ahead) |
| Implementation | ⏳ Deferred — awaiting user go-ahead |
| Interpretation layer | ✅ Complete (this work) |

---

## Next Steps (When Implementation Starts)

1. **M1 — Inbound receiver + HMAC** (2–3 days)
   - `src/app/api/webhooks/[id]/route.js` (POST, raw body, HMAC verify)
   - `src/lib/webhooks/verify.js` (Standard Webhooks spec)
   - `src/lib/webhooks/registry.js` (config CRUD)
   - Settings: `webhooks`, `webhookRules`, `notifyUrls` in `settingsRepo.js`

2. **M2 — SQLite outbox + worker** (1–2 days)
   - Migration: `webhook_events` table
   - `src/lib/db/repos/webhookEventsRepo.js`
   - Worker in `src/instrumentation.js` (settings-gated)

3. **M3 — Rule engine + actions** (3–4 days)
   - `src/lib/webhooks/rules.js` (matching + dispatch)
   - Action modules: notify, http, llm, gateway, dashboard
   - Rules in `settingsRepo.js` `DEFAULT_SETTINGS.webhookRules`

4. **M4 — Outbound triggers** (1–2 days)
   - Wire `quotaAutoPing.js` → quota events
   - Wire `chatCore.js` → provider.error / fallback.used
   - Emitter → outbox

5. **M5 — Dashboard UI** (P2, 2–3 days)
   - Webhook config page, rules editor, event log viewer

---

## Related Docs (Quick Links)

| Category | Key Docs |
|----------|----------|
| Research (flat) | `../research/2026-09-15-webhook-receive-act-research.md` |
| Research (2-way tree) | `../research/2026-09-15-webhook-master-research-tree.md` + 8 branch docs |
| Research (exponential) | `../research/2026-09-15-webhook-exponential-master-map.md` + 11 exp branch docs |
| Planning | `../planning/2026-09-15-webhook-receive-act-plan.md` |
| Tracking | `../tracking/TASKS.md` (sections: Webhook Receive & Act, Webhook Binary-Tree, Webhook Exponential) |
| Tracking | `../tracking/CHANGELOG.md` (2026-09-15 entries) |
| Tracking | `../tracking/SESSION-HISTORY.md` (3 webhook sessions) |
| Tracking | `../tracking/SESSION-NARRATIVE.md` (PART 8, 9, 11) |
| Deferred spec | `../planning/messages-page-feature-spec.md` §6 (Apprise/Alertmanager) |
| Gap analysis | `../research/9router/38-message-driven-tools-research.md` (no per-message actions) |