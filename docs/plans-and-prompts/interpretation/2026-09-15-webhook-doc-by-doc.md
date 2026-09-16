# Webhook Receive & Act — Doc-by-Doc Summary

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** active
**Tags:** #interpretation #webhook #doc-by-doc #summary

---

## How to use this doc

Every webhook-related document in `research/`, `planning/`, and `tracking/` is summarized here in plain language. Each entry tells you: **what it is**, **what it covers**, **key takeaways**, **how it fits**, and **what to read next**. Read this doc to find the right source doc for your question — then go read the source.

---

## Research Docs

### 1. `../research/2026-09-15-webhook-receive-act-research.md` — The Foundation (48KB)

**What it is:** The original deep research. Answers: does 9router have webhook receive/act capability? If not, what do 20+ other programs do?

**What it covers:**
- **Verdict:** `grep "webhook"` in `src/**` → EMPTY. No inbound/outbound/event-bus. Only UI toasts + CLI tray.
- **Part 2 — Landscape:** 20+ programs at 6 levels (L1 Mode → L6 Pattern): LLM gateways (LiteLLM, One API, Helicone, OpenRouter, Kong), automation platforms (Home Assistant, n8n, Node-RED, Pipedream, Huginn, Zapier), messaging (Slack, Discord, Telegram, ntfy, Gotify, Apprise), webhook infra (Stripe, GitHub, Svix, Hookdeck), monitoring (Uptime Kuma, Healthchecks.io), event patterns (EventEmitter, Outbox, MQ, SSE, WebSocket, Long-Polling)
- **Part 3 — 12 Archetypes:** TCA Rule Engine, Visual Workflow, Flow-Based, Event Source + Workflow, Agent Graph, HMAC-Signed Receiver, Dual-Mode Receiver, Ed25519 Receiver, Outbound Alert Router, Universal Adapter, Dead Man's Switch, Embedded Event Queue
- **Part 4 — Recommended Architecture:** Hybrid of TCA + Dual-Mode + Universal Adapter, with full ASCII diagram
- **Part 5 — 10 Design Decisions:** each backed by precedent
- **Sources + confidence levels + open questions**

**Key takeaways:** 9router has zero webhook infra; the hybrid architecture is the recommended build; the 10 decisions are the "why" behind every implementation choice.

**How it fits:** The root of everything. All other docs expand or interpret this one.

**Read next:** `../planning/2026-09-15-webhook-receive-act-plan.md` (the plan), or `./2026-09-15-webhook-synthesis.md` (the distilled version).

---

### 2. `../research/2026-09-15-webhook-master-research-tree.md` — 2-Way Tree Master Map

**What it is:** The master map of the 2-way binary tree expansion (Phase 2). User clarified "binary tree" = recursive: each finding → 2 children × 6 levels (63 nodes per root).

**What it covers:** 63-node tree, 8 Level-3 branches (A1a, A1b, A2a, A2b, B1a, B1b, B2a, B2b), status table, how to read the branch docs.

**Key takeaways:** This is the "spine" — the readable skeleton of the research. Each branch doc covers a 7-node subtree.

**How it fits:** Phase 2 of the research. Additive to the flat research.

**Read next:** The 8 branch docs below.

---

### 3–10. The 8 Branch Docs (2-Way Tree) — `../research/2026-09-15-webhook-branch-*.md`

| Doc | Covers | Key takeaways |
|-----|--------|---------------|
| `branch-a1a-transport.md` | Transport | POST /api/webhooks/[id] with allowed_methods; respond 2xx <3s + enqueue async; raw body via `req.text()` before parse (HMAC requirement); payload size caps with large-payload offload; challenge handshake |
| `branch-a1b-auth-security.md` | Auth & security | HMAC verification (Stripe `t=,v1=` vs Standard Webhooks `v1,`), timingSafeEqual constant-time compare, 5-min timestamp tolerance; secret ID in URL (UUID-as-password, local_only binding); rotation with `whsec_` prefix + dual-secret grace |
| `branch-a2a-event-store.md` | Event store | Outbox table with event_id idempotency key + status machine; transactional outbox (same-DB write, at-least-once); settings-gated worker (instrumentation.js pattern), polling interval, exponential backoff, dead-letter queue |
| `branch-a2b-rule-engine.md` | Rule engine | TCA model (Home Assistant trigger→condition→action); JSON rules in settingsRepo (PATCH-able); field/op/value ops (n8n Only Run If) + JSONPath v2 (Hookdeck Filters); actions: notify/http/llm/gateway/dashboard; LLM action reuses analyze-error pipeline; actions in worker not route (Slack queue mandate); idempotent actions (Stripe dedupe) |
| `branch-b1a-messaging-platforms.md` | Messaging | Slack incoming webhooks (hooks.slack.com/services/T/B/X, blocks/attachments, 30k/hr cap, sender-side retries); Discord (/webhooks/<id>/<token>, slack/github-compatible endpoints — one formatter for both); Telegram (sendMessage, chat_id = user/group/channel) |
| `branch-b1b-push-services.md` | Push services | ntfy (topic=password, action buttons ≤3, X-Delay 10s–3d, templates); Gotify (appToken sender vs clientToken receiver, X-Gotify-Key); Apprise (one URL → 100+ services, schema:// config, tag routing OR/AND/priority/escalation) — operationalizes the P3-deferred messages-page spec §6 |
| `branch-b2a-internal-events.md` | Internal events | Quota events at 80%/90%/exhausted (LiteLLM budget webhooks vocabulary: budget_crossed/threshold_crossed), wired into quotaAutoPing scheduler, emit-on-transition dedupe; provider error spike (5 minor/10 major per window — LiteLLM outage_alerts), auto-disable (One API ENABLE_METRIC), fallback.used, provider.cooldown |
| `branch-b2b-scheduled-monitoring.md` | Scheduled & monitoring | Daily spend digest (LiteLLM digest_interval 86400, report_check_interval 3600, persist last-sent — better than LiteLLM in-memory); new_model_added alert on model catalog sync; dead man's switch (Healthchecks.io model: New→Up→Late→Down, /start /fail /<exitcode> suffixes, watchdog over instrumentation.js jobs, grace = 2× interval) |

**How they fit:** The readable spine of the research. Each is a 7-node subtree of the master tree.

**Read next:** The exponential branch docs (below) for the full N-ary depth.

---

### 11. `../research/2026-09-15-webhook-exponential-master-map.md` — Exponential Master Map

**What it is:** The master map of the true exponential N-ary expansion (Phase 3). User clarified "binary tree" again: NOT 1→2→4→8. Every phrase in the source docs is a root; each root branches N-ary (3–15+ children per node), 6 levels deep.

**What it covers:**
- Methodology table (N-ary vs 2-way)
- Root inventory: 48 roots R01–R48, each mapped to its source section + branch doc
- Expansion structure (per root, L1–L6)
- Node-count summary: 48 roots / 172 L1 / 439 L2 / 912 L3 / 1,759 L4 / 3,179 L5 / 5,401 L6 = **11,862 enumerated nodes**
- How to read the branch docs

**Key takeaways:** This is the "crazy exponential" the user asked for. With branching factor 4 ≈ 65,520 nodes; factor 6 ≈ 448,000. The docs enumerate the practically researchable set (11,862 nodes).

**How it fits:** Phase 3 of the research. Additive — the 2-way tree remains the spine.

**Read next:** The 11 exp branch docs below.

---

### 12–22. The 11 Exponential Branch Docs — `../research/2026-09-15-webhook-exp-*.md`

Each contains the full N-ary tree for its roots: L0 root → L1–L6 expansion with **finding | precedent | 9router application** at every node, plus an L6 Leaf Summary table.

| Doc | Roots | Covers | Key takeaways |
|-----|-------|--------|---------------|
| `exp-01-receiver-transport.md` | R01–R04 | Receiver endpoint, raw body, payload limits, response contract | Route design (UUID-as-password), method handling, middleware chain (rate limit, IP allowlist, logging), endpoint lifecycle, exposure (localhost/tunnel/reverse proxy) |
| `exp-02-auth-secrets.md` | R05–R08 | HMAC, secret management, rotation, timing-safe compare | HMAC variants (Stripe vs Standard Webhooks), timestamp tolerance, dual-secret grace, local-only binding, TLS/mTLS, secret storage in settingsRepo |
| `exp-03-event-store-worker.md` | R09–R11 | Outbox table, worker & retry, idempotency | Transactional outbox, status machine, worker polling + backoff, dead-letter, at-least-once delivery, idempotent consumers |
| `exp-04-rule-engine-actions.md` | R12–R14 | TCA, rule matching, actions | JSON rules, field/op/value ops, JSONPath, action types (notify/http/llm/gateway/dashboard), LLM action reusing analyze-error pipeline, idempotent actions |
| `exp-05-messaging-platforms.md` | R15–R17 | Slack, Discord, Telegram | Inbound/outbound, retry semantics, rate caps, one formatter for slack/github-compatible endpoints |
| `exp-06-push-services.md` | R18–R20 | ntfy, Gotify, Apprise | Tag routing, priority/escalation, templates, action buttons |
| `exp-07-internal-events.md` | R21–R23 | Quota events, provider errors, fallback events | 80/90/exhausted, error spikes, emit-on-transition dedupe, wiring into quotaAutoPing |
| `exp-08-scheduled-monitoring.md` | R24–R25 | Daily digest, dead man's switch | Digest mode, new-model alert, watchdog over instrumentation.js jobs |
| `exp-09-standards-infra.md` | R26–R29 | Stripe, GitHub, Svix, Hookdeck | Standard Webhooks spec, OpenAPI, event schemas, delivery guarantees, retry policies |
| `exp-10-patterns-platforms.md` | R30–R46 | 17 roots: event patterns, automation platforms, gateway precedents, monitoring, messaging | EventEmitter, outbox, MQ, SSE, WebSocket, long-polling; Home Assistant, n8n, Node-RED, Pipedream, Huginn, Inngest; LiteLLM, One API, Helicone; Uptime Kuma, Healthchecks.io |
| `exp-11-http-client-architecture.md` | R47–R48 | Outbound HTTP client, timeout & retry | fetch/undici stack, retry/backoff, connection pooling, timeouts, circuit breakers, idempotent delivery |

**How they fit:** The full exponential body of the research. Each node carries a finding + precedent + 9router application.

**Read next:** The synthesis doc for the distilled version.

---

## Planning Docs

### 23. `../planning/2026-09-15-webhook-receive-act-plan.md` — The Implementation Plan

**What it is:** The phased implementation plan (M1–M5), draft status, awaiting user go-ahead.

**What it covers:**
- **Scope:** inbound receiver + HMAC, SQLite outbox + worker, TCA rule engine + actions, outbound triggers, dashboard UI (P2)
- **Out of scope (v1):** visual workflow editor, long-polling Mode B, Socket Mode/WebSocket, dead man's switch, Apprise as dependency (implement URL schemes natively)
- **M1 — Inbound receiver + HMAC:** files touched, acceptance criteria (valid signature → 200 + enqueue; invalid → 401; stale → 401; unknown → 404; raw body HMAC; 2xx <3s)
- **M2 — SQLite outbox + worker:** migration, repo, instrumentation.js worker, exponential backoff, dead-letter, idempotency
- **M3 — Rule engine (TCA):** rules.js, action modules (notify/http/llm/gateway/dashboard), trigger events, conditions, rules in settingsRepo
- **M4 — Outbound triggers:** quotaAutoPing → quota events, chatCore → provider.error/fallback.used, emitter → outbox
- **M5 — Dashboard UI (P2):** webhook config page, rules editor, event log viewer
- **Dependencies & risks:** timingSafeEqual length mismatch, req.text() raw body, SQLite single-node, worker settings-gated, Apprise URL schemes

**Key takeaways:** This is the actionable plan. Each milestone has files touched + acceptance criteria.

**How it fits:** The bridge from research to implementation.

**Read next:** `./2026-09-15-webhook-order-and-next-steps.md` (build order), or start M1.

---

## Tracking Docs (Webhook Sections)

### 24. `../tracking/TASKS.md` — Webhook sections

Three sections: **Webhook Receive & Act** (R1–R6), **Webhook Binary-Tree Research Expansion** (T1–T9), **Webhook Exponential Research Expansion** (E1–E12). All ✅ complete. Implementation deferred.

### 25. `../tracking/CHANGELOG.md` — 2026-09-15 entries

Three entries: Webhook Receive & Act (research + plan), Webhook Binary-Tree Research Expansion (master tree + 8 branches), Webhook Exponential Research Expansion (master map + 11 branches).

### 26. `../tracking/SESSION-HISTORY.md` — Webhook sessions

Three sessions: Webhook Receive & Act, Webhook Binary-Tree Research Expansion, Webhook Exponential Research Expansion. Each with objective, deliverables, key findings, status.

### 27. `../tracking/SESSION-NARRATIVE.md` — PART 8, 9, 11

PART 8 (Webhook Receive & Act), PART 9 (Webhook Binary-Tree Research Expansion), PART 11 (Webhook Exponential Research Expansion). Narrative accounts of what happened and why.

---

## Interpretation Docs (This Layer)

| Doc | Purpose |
|-----|---------|
| `./2026-09-15-webhook-interpretation-guide.md` | One-page summary, 4 phases, complete doc map, key conclusions, reading order, next steps |
| `./2026-09-15-webhook-doc-by-doc.md` | **This doc** — plain-language summary of every webhook doc |
| `./2026-09-15-webhook-synthesis.md` | Distilled knowledge: verdict, archetypes, architecture, decisions, roots→branches, open questions |
| `./2026-09-15-webhook-order-and-next-steps.md` | Chronological timeline, logical reading order, build order (M1–M5), deferred items |

---

## Quick Reference: Which Doc Answers Which Question

| Question | Read |
|----------|------|
| "Does 9router have webhooks today?" | `../research/2026-09-15-webhook-receive-act-research.md` (Verdict) |
| "What should we build?" | `../research/2026-09-15-webhook-receive-act-research.md` (Part 4) |
| "Why this design?" | `../research/2026-09-15-webhook-receive-act-research.md` (Part 5) |
| "How do we build it, step by step?" | `../planning/2026-09-15-webhook-receive-act-plan.md` (M1–M5) |
| "What did the 2-way tree find?" | `../research/2026-09-15-webhook-master-research-tree.md` + 8 branch docs |
| "What did the exponential expansion find?" | `../research/2026-09-15-webhook-exponential-master-map.md` + 11 exp docs |
| "What's the distilled knowledge?" | `./2026-09-15-webhook-synthesis.md` |
| "What's the order of everything?" | `./2026-09-15-webhook-order-and-next-steps.md` |
| "What's the status?" | `../tracking/TASKS.md` (webhook sections) |