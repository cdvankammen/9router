# Webhook Receive & Act — Deep Research (6-Level Binary Tree)

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** active
**Tags:** #research #webhook #events #automation #notifications #binary-tree #inbound #outbound

## Objective

1. Does 9router have a place where **webhooks can be received** (inbound) with information?
2. Does 9router have a place that can allow for **things to happen** from those webhooks (actions/automation)?
3. If not: research all the different options that could work — what other programs do (popular and not) — each at a **minimum binary-tree depth of 5**, then expanded to **depth 6**.

## Verdict (codebase audit)

**Neither half exists in 9router today.**

- `grep "webhook"` in `src/**` → **EMPTY**. All 144 matches live in `docs/plans-and-prompts/`, `gitbook/content/`, and `worktrees/` (docs only).
- No inbound webhook receiver, no outbound webhook sender, no event bus / EventEmitter / pub-sub / hooks system in the backend.
- Only UI toasts (`src/store/notificationStore.js` — Zustand) and CLI tray notifications exist.
- No quota-alert webhooks implemented (`quotaAlert|quotaThreshold|alertAt|budgetAlert` in `src/` → EMPTY).

### Planned-but-not-implemented (docs only)

| Doc | Plan | Status |
|-----|------|--------|
| `docs/plans-and-prompts/planning/messages-page-feature-spec.md` §6 | Notifications: optional Apprise-style URL (`apprise://` string or webhook list) → Slack/Discord/ntfy/Gotify/Telegram out of the box; Alertmanager semantics: group by fingerprint, min-interval dedupe, silence window | **Deferred (P3)** — `tracking/TASKS.md`, `2026-08-19-master-continuation-plan.md` item 10 |
| `gitbook/content/en/features/quota-tracking.md` | Alerts & Notifications — Quota warnings at 80%/90%/exhausted; Delivery: Dashboard notification / Email / Webhook | **Aspirational** — no code |

### Reusable infrastructure for a future webhook system

| Piece | Location | Reuse for |
|-------|----------|-----------|
| API route pattern | `src/app/api/*/route.js` | New `webhooks` routes |
| Settings store | `src/lib/db/repos/settingsRepo.js` (`DEFAULT_SETTINGS`, PATCH via `/api/settings`, `PROTECTED_SETTING_KEYS = ["password", "mitmSudoEncrypted"]`) | Webhook rules + notify URLs config |
| Background-job startup | `src/instrumentation.js` (settings-gated: console log capture, markdown log flusher, sr-combo cleanup, model catalog sync) | Outbox worker polling |
| LLM action pipeline | `src/app/api/analyze-error/route.js` (credentials → `handleChatCore` from `open-sse/handlers/chatCore.js`, `settings.analyzeErrorModel`) | Webhook → LLM action |
| Request capture | `src/lib/usageDb.js` + `src/app/api/messages/route.js` (filters, keyset pagination, FTS5, error fingerprint grouping) | Event source data |
| Tunnel exposure | `src/app/api/tunnel/` (cloudflare/tailscale enable/disable/status) | Public webhook URL |
| SQLite layer | `src/lib/db/` (adapter chain: bun:sqlite → better-sqlite3 → node:sqlite → sql.js) | Outbox table |
| Quota scheduler | `src/shared/services/quotaAutoPing.js` (warms 5h windows, no alert sending) | Quota-triggered events |

---

## Part 2 — The Landscape: 6-Level Binary Tree Analysis

Every option analyzed at **6 levels**:
- **L1 — Mode**: Receive / Send / Both
- **L2 — Events**: What triggers webhooks
- **L3 — Transport & Auth**: How payloads move and are secured
- **L4 — Processing & Actions**: What happens after receipt
- **L5 — Configuration & Ops**: How it's set up, monitored, debugged
- **L6 — Pattern Classification**: Architectural archetype it belongs to

### A. LLM GATEWAYS & PROXIES (9router's direct peers)

#### A1. LiteLLM
- **L1 — Mode**: Send-only (outbound alerts, no inbound)
- **L2 — Events**: `llm_exceptions`, `llm_too_slow`, `llm_requests_hanging`, `cooldown_deployment`, `new_model_added`, `outage_alerts`, `region_outage_alerts`, `budget_alerts`, `spend_reports`, `failed_tracking_spend`, `daily_reports`, `fallback_reports`, `db_exceptions`, `new_virtual_key_created`, `virtual_key_updated/deleted`, `new_team_created`, `team_updated/deleted`, `new_internal_user_created/updated/deleted`
- **L3 — Transport & Auth**: `SLACK_WEBHOOK_URL` env + `general_settings.alerting: ["slack"]`; Discord via `/slack` suffix on webhook URL; MS Teams via slack-compatible URL; `ALERTING_WEBHOOK_URL` generic fallback; per-alert-type channel mapping (`alert_to_webhook_url`); digest mode groups by `(alert_type, request_model, api_base)` with `digest_interval` (default 86400s); budget webhooks (BETA) via `WEBHOOK_URL` env + `alerting: ["webhook"]`
- **L4 — Processing & Actions**: Notify-only; no inbound-triggered actions; budget webhook payloads: `spend, max_budget, token, customer_id, internal_user_id, team_id, user_email, key_alias, projected_exceeded_date, projected_spend, event (budget_crossed|threshold_crossed|projected_limit_exceeded), event_group (customer|internal_user|key|team|proxy)`
- **L5 — Configuration & Ops**: `alerting_args` object: `budget_alert_ttl: 86400`, `outage_alert_ttl: 60`, `minor_outage_alert_threshold: 5`, `major_outage_alert_threshold: 10`, `daily_report_frequency: 43200`, `report_check_interval: 3600`; `redact_messages_in_exceptions`; `/health/services?service=slack` test endpoint; in-memory digest (lost on restart)
- **L6 — Pattern**: **Outbound Alert Router** — fan-out from internal events to external notification channels

#### A2. One API / new-api
- **L1 — Mode**: Send-only (no inbound webhook receiver)
- **L2 — Events**: Channel success-rate degradation, test failures, model availability changes
- **L3 — Transport & Auth**: Integrates with **Message Pusher** (github.com/songquanpeng/message-pusher) for cross-app push; `ENABLE_METRIC` env enables auto-disable; `METRIC_SUCCESS_RATE_THRESHOLD=0.8`
- **L4 — Processing & Actions**: Auto-disable channels below success threshold; new-api adds **sandboxed JS task plugins** (`plugins/` dir, "replace built-in task adaptors with a sandboxed JS plugin") — allows user-defined logic in response to events
- **L5 — Configuration & Ops**: `METRIC_QUEUE_SIZE=10`, `CHANNEL_TEST_FREQUENCY`, `CHANNEL_UPDATE_FREQUENCY`; pricing config; OpenAI Responses/Realtime support
- **L6 — Pattern**: **Circuit Breaker + Plugin Sandbox** — auto-degrade failing channels, extensible via sandboxed plugins

#### A3. Helicone
- **L1 — Mode**: Send-only (outbound, per-request webhooks)
- **L2 — Events**: Every completed LLM request (configurable sample rate 0–100%); payload: `request_id, user_id, request_body, response_body, request_response_url, model, provider, metadata, cost, promptTokens, completionTokens, totalTokens, latencyMs`
- **L3 — Transport & Auth**: POST to your endpoint; **HMAC-SHA256 signature** (`helicone-signature` header, `crypto.timingSafeEqual` verification); 2-min delivery timeout; 10KB payload truncation; `request_response_url` (S3 signed URL) expires in 30 min; property filters via `Helicone-Property-*` headers
- **L4 — Processing & Actions**: Receiver-side only; use cases: compliance monitoring (PII detection + policy violation checks), data pipeline integration (stream to warehouses), automated scoring (quality/safety/relevance)
- **L5 — Configuration & Ops**: Dashboard UI or REST API (`/rest/webhooks/post-v1webhooks`); local testing via ngrok; sample rate for cost control; `include_data` toggle for enhanced metadata
- **L6 — Pattern**: **Per-Request Event Emitter** — every completed request becomes a webhook event; receiver does the acting

#### A4. OpenRouter / Portkey / Cloudflare AI Gateway *(general knowledge)*
- **L1 — Mode**: All send-only
- **L2 — Events**: OpenRouter: credit depletion, usage thresholds; Portkey: cost/error rate alerts; Cloudflare AI Gateway: logpush, analytics export
- **L3 — Transport & Auth**: OpenRouter: `X-Webhook-Secret` HMAC; Portkey: webhook URLs in dashboard; CF: integrated with Logpush API
- **L4 — Actions**: Notify only (no inbound-triggered actions)
- **L5 — Config**: Dashboard-based; all three are managed cloud services
- **L6 — Pattern**: **Managed Alert Sender** — cloud-hosted outbound webhooks

#### A5. Kong / APISIX / Traefik *(general knowledge)*
- **L1 — Mode**: Inbound intercept (not webhooks — in-process hooks)
- **L2 — Events**: Request lifecycle (before/after upstream, on error, on rate limit)
- **L3 — Transport & Auth**: Kong: `pre-function`/`post-function` Lua plugins; APISIX: `serverless-pre-function`; Traefik: middleware chains. All in-process, not HTTP webhooks.
- **L4 — Actions**: Transform, rate-limit, auth, route, cache, circuit-break. **No user-defined event→action rules** — only the predefined plugin set.
- **L5 — Config**: Declarative YAML or admin DB; hot-reload without restart
- **L6 — Pattern**: **Gateway Plugin Chain** — synchronous middleware pipeline, not event-driven webhooks

### B. AUTOMATION PLATFORMS (the "things happen" half)

#### B1. Home Assistant ⭐ (best inbound model for local-first)
- **L1 — Mode**: Both (inbound webhook receiver + outbound notifications)
- **L2 — Events**: `POST /api/webhook/<webhook_id>`; payload routing: form data → `trigger.data`, JSON → `trigger.json`, query params → `trigger.query`; `allowed_methods` (POST/PUT/HEAD/GET); `local_only: true` default; one webhook ID = one automation; other triggers: event, mqtt, state, numeric_state, time, time_pattern, sun, template, tag, zone, sentence (voice)
- **L3 — Transport & Auth**: Plain HTTPS; **no signature — secrecy of the webhook ID is the auth** (explicitly: "don't use for destructive actions"); webhook IDs are unique UUIDs treated like passwords; `local_only: true` blocks external access by default
- **L4 — Actions**: **trigger → condition → action** model; trigger IDs group multiple actions; actions can call any HA service (lights, switches, scripts, shell commands, REST calls, LLM via local or cloud); conditions are Jinja2 templates
- **L5 — Config**: YAML automations in `automations.yaml` or UI; webhook ID specified in trigger YAML; debug via "Trace" feature (step-by-step execution log)
- **L6 — Pattern**: **Trigger-Condition-Action (TCA) Rule Engine** — the canonical home automation pattern; simplest possible secure receive+act

#### B2. n8n
- **L1 — Mode**: Both (webhook node receives, workflow nodes act)
- **L2 — Events**: Any HTTP method (DELETE/GET/HEAD/PATCH/POST/PUT); path route params (`/:variable`); "Only Run If" expression on `$json.body`; Raw Body option; Ignore Bots; multipart/form-data
- **L3 — Transport & Auth**: Basic/Header/JWT/None auth per webhook node; IP allowlist; CORS origins; 16MB payload cap (`N8N_PAYLOAD_SIZE_MAX`); Test URL vs Production URL (test = development, production = after activation)
- **L4 — Actions**: Multi-step workflow: HTTP request, LLM (OpenAI, etc.), notification, DB write, code step; respond modes: **Immediately** (return 200 right away), **When Last Node Finishes** (wait for processing), **Respond to Webhook node** (custom response), **Streaming** (SSE); supports error workflows (on-failure branch)
- **L5 — Config**: Visual editor; per-node credentials; environment variables; execution history with replay
- **L6 — Pattern**: **Visual Workflow Engine** — webhook → node graph → actions; the "enterprise Zapier"

#### B3. Node-RED
- **L1 — Mode**: Both (HTTP-in, MQTT-in, WebSocket-in, cron inject)
- **L2 — Events**: Message objects flowing through a directed graph; typed per node (HTTP request, MQTT message, timer tick, etc.)
- **L3 — Transport & Auth**: HTTP-in node with basic auth option; MQTT with TLS; WebSocket native; all in-process
- **L4 — Actions**: Function (full JS), Change (set/change/move/delete), Switch (rule routing to multiple branches), Template (Mustache), HTTP-out, debug; subflows for reusable patterns; link nodes for cross-flow routing
- **L5 — Config**: Flow JSON (editor-in-browser); deploy per-flow; library of reusable nodes; dashboard UI nodes
- **L6 — Pattern**: **Flow-Based Programming** — data flows through a graph of connected nodes; the original IoT rule engine

#### B4. Pipedream ⭐ (best developer-oriented webhook platform)
- **L1 — Mode**: Both (HTTP trigger + 1000s of app actions)
- **L2 — Events**: `steps.trigger.event` object: `{body, client_ip, headers, method, path, query, url}`; JSON auto-parsed; multipart parsed; headers lowercased; also: email trigger, RSS trigger, cron trigger, 1000+ app-based triggers (Twitter, GitHub, Google Calendar, etc.)
- **L3 — Transport & Auth**: Custom token (Bearer) or OAuth built-in, or custom logic (JWT); 512KB default payload, **up to 5TB** via `pipedream_upload_body=1` or `x-pd-upload-body: 1`; large payloads saved to S3 with signed URLs (30 min expiry); 413/404/429 error semantics; CORS open (`Access-Control-Allow-Origin: *`); `x-pd-nostore=1` for privacy, `x-pd-notrigger=1` for test events
- **L4 — Actions**: Code steps (Node.js/Python), 1000s of app actions, **`$.respond({immediate: true})`** to ack-then-process (Slack-bot pattern — critical: respond 200 immediately, continue processing asynchronously); event sources decouple collection from workflows (one source → many workflows); step-level error handling with retry
- **L5 — Config**: Visual workflow builder; step exports (`$return_value`); event inspector with replay; step-level logs; function payload limit 6MB; email payload 30MB; custom domains (`endpoint.yourdomain.com`)
- **L6 — Pattern**: **Event Source + Workflow Decoupling** — the `$.respond(immediate)` pattern is the gold standard for "accept fast, process async"; one event source feeds multiple workflows

#### B5. Huginn (self-hosted IFTTT/Zapier)
- **L1 — Mode**: Both — "Send and receive WebHooks" via agents
- **L2 — Events**: Agents create and consume typed events along a directed graph; 100+ agent types: weather, Twitter, RSS, website scraper, trigger agents, JavaScript agents, command agents
- **L3 — Transport & Auth**: Self-hosted Rails app; egress proxy (Smokescreen) to restrict outbound on shared instances; HTTP basic auth; SSL required for production
- **L4 — Actions**: Agent chains: receive → transform → notify (email/SMS/Slack/Pushbullet) → act; Liquid templating; scenario-based grouping; scheduled operations
- **L5 — Config**: Web UI agent graph editor; `.env` configuration; Docker or Heroku deployment; MIT license, 49.9k★
- **L6 — Pattern**: **Agent Graph** — each agent is a node that emits/consumes events; the graph IS the automation; closest to "self-hosted IFTTT on your own server"

#### B6. Zapier / Make / IFTTT *(general knowledge)*
- **L1 — Mode**: Both (webhook trigger + thousands of integrations)
- **L2 — Events**: Zapier: "Catch Hook" trigger (any HTTP); Make: "Webhooks" module; IFTTT: Maker Webhooks (`/key/event/name`)
- **L3 — Transport & Auth**: Public URL; optional auth token in path/header; Make: basic auth option; IFTTT: `key` in URL
- **L4 — Actions**: 1000s of app integrations (the real product); paths/filters/routers; error handling with retry
- **L5 — Config**: No-code visual builder; paid per-task pricing; teams/sharing
- **L6 — Pattern**: **Hosted iPaaS** — wrong for local-first (data leaves machine, per-seat cost), but the trigger→filter→action mental model is the UX to copy

#### B7. Activepieces / Windmill / Trigger.dev / Inngest *(general knowledge)*
- **Activepieces**: Open-source Zapier (webhook trigger + visual flows + self-hosted)
- **Windmill**: Scripts-as-flows with webhook triggers; TypeScript/Python/Bash/Go
- **Trigger.dev**: Background jobs with webhook delivery; long-running tasks
- **Inngest** ⭐: **Event-driven background jobs** — `inngest.send({name: "user.signup", data})` + `inngest.on("user.signup", handler)`; durable function execution with automatic retries, idempotency keys, sleep/delay, fan-out; SDK-based (runs inside YOUR app, no external service); step functions with memoization
- **L6 — Pattern**: Inngest = **Embedded Event-Driven Job Queue** — the most modern pattern for adding "things that happen" to an existing app without an external platform

### C. MESSAGING PLATFORMS (outbound notification targets)

#### C1. Slack ⭐⭐ (deepest research — HTTP + Socket Mode + verification)
- **L1 — Mode**: Both (Events API receives events from Slack; Incoming Webhooks send to Slack)
- **L2 — Events**: 100+ event types via subscriptions; `message.channels`, `reaction_added`, `file_created`, `app_mention`, `team_join`, `app_installed`, `tokens_revoked`, `enterprise_org_migrated`; each event has `event_id` (globally unique across all workspaces), `event_time`, `event_context`; OAuth scopes gate which events you receive
- **L3 — Transport & Auth**:
  - **HTTP mode**: POST to your Request URL; `url_verification` challenge handshake (echo `challenge` back); **`X-Slack-Signature`**: `v0=<hmac-sha256>` over `v0:<timestamp>:<raw_body>`; **5-minute timestamp tolerance** (replay protection); constant-time compare; case-insensitive header names
  - **Socket Mode** ⭐: **WebSocket connection — NO public endpoint needed**; `apps.connections.open` returns `wss://` URL; max 10 concurrent connections; events arrive as `{payload, envelope_id, type, accepts_response_payload}`; acknowledge via `{envelope_id}` response; **no signature verification needed** (pre-authenticated WebSocket); auto-refresh every ~3600s; `debug_reconnects=true` for testing
  - **Rate limits**: 30,000 events/workspace/hour; `app_rate_limited` event sent when exceeded
  - **Retries**: 3 retries (immediate, 1min, 5min) with `x-slack-retry-num` (1/2/3) and `x-slack-retry-reason` (`http_timeout`, `too_many_redirects`, `connection_failed`, `ssl_error`, `http_error`, `unknown_error`); `x-slack-no-retry: 1` opt-out header; auto-disable if >95% failures/60min (except <1000 events/hour)
  - **Mutual TLS**: Optional; DigiCert root CA; SAN `platform-tls-client.slack.com`; inject `X-Client-Certificate-SAN` header
  - **3-second rule**: Must respond 2xx within 3 seconds or event delivery is considered failed
- **L4 — Actions**: **Explicitly documented: "Avoid actually processing and reacting to events within the same process. Implement a queue."** Their LLM example: `reaction_added` → fetch message from channel → send to HuggingFace LLM → post answer in thread via `chat.postMessage`; Bolt framework auto-handles ack
- **L5 — Config**: App console; manifest YAML for declarative setup; `SLACK_BOT_TOKEN` + `SLACK_APP_TOKEN` (Socket Mode) + `SLACK_SIGNING_SECRET` (HTTP mode); Delayed Events feature (hourly retries for 24h after initial 3 failures)
- **L6 — Pattern**: **Dual-Mode Event Receiver** — HTTP (public, HMAC-verified) + Socket Mode (private, WebSocket-authenticated); the most complete event receive system in the landscape; the "queue it" mandate is the design rule for any webhook receiver

#### C2. Discord ⭐⭐ (interactions + outgoing webhooks)
- **L1 — Mode**: Both (Interactions Endpoint receives user interactions; Outgoing Webhooks post to channels)
- **L2 — Events**: 5 interaction types: `PING` (1), `APPLICATION_COMMAND` (2), `MESSAGE_COMPONENT` (3), `APPLICATION_COMMAND_AUTOCOMPLETE` (4), `MODAL_SUBMIT` (5); 3 contexts: `GUILD`, `BOT_DM`, `PRIVATE_CHANNEL`; webhook events (outgoing): `MESSAGE_CREATE`, etc.
- **L3 — Transport & Auth**:
  - **Interactions**: POST to your Interactions Endpoint URL; **Ed25519 signature verification** using `X-Signature-Ed25519` (message signature) + `X-Signature-Timestamp`; public key from app settings; **or** Gateway WebSocket (mutually exclusive with HTTP)
  - **Outgoing Webhooks**: URL = `https://discord.com/api/v10/webhooks/<id>/<token>`; 3 types: Incoming (1), Channel Follower (2), Application (3); token-based auth
  - **Slack-compatible**: `/webhooks/<id>/<token>/slack` endpoint; GitHub-compatible: `/webhooks/<id>/<token>/github`
  - **Rate limits**: Global + per-route; interaction tokens valid for **15 minutes**
- **L4 — Actions**: Respond via POST to `/interactions/<id>/<token>/callback`; callback types: `PONG` (1), `CHANNEL_MESSAGE_WITH_SOURCE` (4), `DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE` (5), `DEFERRED_UPDATE_MESSAGE` (6), `UPDATE_MESSAGE` (7), `APPLICATION_COMMAND_AUTOCOMPLETE_RESULT` (8), `MODAL` (9), `LAUNCH_ACTIVITY` (12); **must respond within 3 seconds**; followup messages via webhook endpoint (5 followups for user-installed apps); 204 No Content on success
- **L5 — Config**: App settings → Interactions Endpoint URL; Ed25519 public key; manifest for declarative command registration
- **L6 — Pattern**: **Ed25519-Signed Interaction Receiver** — more cryptographically rigorous than HMAC; the `DEFERRED_*` callback types implement the same ack-fast-then-process pattern as Slack/Pipedream

#### C3. Telegram Bot API
- **L1 — Mode**: Both (`setWebhook` receives updates; Bot API sends messages)
- **L2 — Events**: Update types filtered by `allowed_updates` (["message", "callback_query", etc.]); `update_id` for dedupe/ordering; max 24h storage for undelivered
- **L3 — Transport & Auth**: `setWebhook` (HTTPS, ports 443/80/88/8443) **or** `getUpdates` long polling (mutually exclusive); `X-Telegram-Bot-Api-Secret-Token` header (1–256 chars, A-Z a-z 0-9 _ -); retries on non-2xx; `getWebhookInfo` diagnostics
- **L4 — Actions**: Reply via Bot API (pass `method` param in response body for inline response, but can't know if it succeeded); action buttons; inline keyboards
- **L5 — Config**: `max_connections` (1–100, default 40), `drop_pending_updates`, `secret_token`, `certificate` for self-signed; `deleteWebhook` with `drop_pending_updates` to switch modes
- **L6 — Pattern**: **Dual-Mode (Webhook + Long Polling)** — the long-polling fallback eliminates the tunnel problem entirely; perfect for localhost-first

#### C4. ntfy
- **L1 — Mode**: Send-only (outbound notifications via HTTP)
- **L2 — Events**: Message with title/priority/tags/markdown/click/icon/attach/actions; **action buttons (≤3)**: `view` (open URL), `broadcast` (Android intent), `http` (POST, configurable method/headers/body), `copy` (clipboard); templates for github/grafana/alertmanager payloads; dead-man's-switch via re-publish with same sequence ID
- **L3 — Transport & Auth**: PUT/POST `ntfy.sh/<topic>` or self-hosted; topic = password (no sign-up); Basic auth / `tk_` tokens / Bearer; 4096-byte messages; 12h cache; scheduled delivery (`X-Delay`, min 10s, max 3 days); sequence IDs for update/clear/delete
- **L4 — Actions**: Buttons trigger HTTP calls from the client; no server-side actions
- **L5 — Config**: Self-hosted Go binary; message templates; Matrix Push Gateway at `/_matrix/push/v1/notify`; email publishing (`ntfy-$topic@ntfy.sh`)
- **L6 — Pattern**: **Self-Hosted Push Service** — the simplest self-hosted notification target; topic = auth, no database needed

#### C5. Gotify
- **L1 — Mode**: Send-only (push messages via REST API)
- **L2 — Events**: Messages with title/message/priority/extras (client behavior hints); WebSocket stream at `/stream` for real-time delivery
- **L3 — Transport & Auth**: `X-Gotify-Key: <apptoken>` header, or `token` query param, or `Authorization: Bearer <token>`; two token types: **appToken** (sender) and **clientToken** (receiver); tokens shown once on creation/rotation; Basic auth for session login only; OIDC support
- **L4 — Actions**: None inbound; Android app receives push notifications; plugin system for extensibility (Configurer, Displayer plugins)
- **L5 — Config**: WebUI + REST API; plugin YAML configuration; user/app/client management; Swagger/OpenAPI docs
- **L6 — Pattern**: **Self-Hosted Push Server** — simplest self-hosted push target; Gotify + Apprise = universal outbound

#### C6. Apprise ⭐ (universal notification adapter)
- **L1 — Mode**: Send-only: one URL scheme → **100+ services** (Slack, Discord, Telegram, Gotify, ntfy, Pushover, email/SMTP, Matrix, Signal, WhatsApp, WeChat, 46elks SMS, PagerDuty, Opsgenie, Jira, and ~90 more)
- **L2 — Events**: Title + body + attachments (images, files); tags with priority + escalation chains; custom `@notify` plugin hooks (`foobar://` scheme)
- **L3 — Transport & Auth**: `schema://` URLs in config files (YAML/TEXT) or env vars (`APPRISE_URLS`); persistent storage for caching; `auto/flush/memory` modes
- **L4 — Actions**: Notify only (but custom plugins can run arbitrary code); tag-based routing: OR logic (`-g devops -g admin`), AND logic (`-g devops,critical`), priority escalation (`-g alerts` dispatches priority-1 first, escalates on failure), exclusive (`-g "2:alerts"`), per-call retry (`-g "alerts:3"`)
- **L5 — Config**: CLI, Python API, or [Apprise API](https://github.com/caronc/apprise-api) web UI; Docker deployment; 17.3k★
- **L6 — Pattern**: **Universal Notification Adapter** — the "libcurl for push notifications"; 9router's deferred spec already names "Apprise-style" URLs

### D. WEBHOOK INFRASTRUCTURE & STANDARDS

#### D1. Stripe ⭐⭐ (gold standard for inbound webhook security)
- **L1 — Mode**: Receive (inbound webhooks from Stripe)
- **L2 — Events**: Typed events (`invoice.paid`, `payment_intent.succeeded`, etc.) with unique IDs; **ordering NOT guaranteed** → dedupe by event ID; subscribe only to needed event types
- **L3 — Transport & Auth**: `Stripe-Signature` header: `t=<timestamp>,v1=<hmac-sha256>,v0=<test>`; `signed_payload = timestamp + "." + raw body`; constant-time compare (`crypto.timingSafeEqual`); **5-minute timestamp tolerance (replay protection)**; secret `whsec_…`; HTTPS required; IP allowlisting recommended; roll secrets periodically
- **L4 — Actions**: **Return 2xx fast before complex logic; process async (queue)**; retries: up to 3 days exponential backoff (live), 3 retries (sandbox); manual resend ≤15/30 days; exempt from CSRF; local testing: `stripe listen --forward-to localhost:4242/webhook`
- **L5 — Config**: Dashboard endpoint management; event type selector; webhook secret rotation (old remains valid 24h); delivery log with redelivery button; CLI for local testing
- **L6 — Pattern**: **HMAC-Signed Event Receiver with Retry** — the most battle-tested webhook security model; `timestamp + raw_body + HMAC` is the industry standard

#### D2. GitHub
- **L1 — Mode**: Receive (POST to your endpoint); `ping` event on webhook creation
- **L2 — Events**: push, issues, pull_request, workflow_dispatch, repository_dispatch, ~50 types; 25MB payload cap; `X-GitHub-Delivery` GUID for idempotency
- **L3 — Transport & Auth**: `X-Hub-Signature-256` (SHA-256 HMAC) + `X-Hub-Signature` (SHA-1, deprecated); `User-Agent: GitHub-Hookshot/`; JSON or x-www-form-urlencoded
- **L4 — Actions**: Receiver-side; `repository_dispatch` = webhook → CI/CD trigger; GitHub Actions = the "action" layer
- **L5 — Config**: Per-repo webhook settings; secret; events selection; redelivery UI; IP ranges published
- **L6 — Pattern**: **HMAC-Signed Event Receiver** — simpler than Stripe (no timestamp tolerance documented, but uses GUID for dedupe)

#### D3. Svix / Standard Webhooks spec ⭐ (the emerging open standard)
- **L1 — Mode**: Both (Svix sends webhooks; spec defines receive format)
- **L2 — Events**: Typed events with IDs; the spec standardizes headers, not event types
- **L3 — Transport & Auth**: Headers: `webhook-id`, `webhook-timestamp`, `webhook-signature` (Svix aliases: `svix-id`, `svix-timestamp`, `svix-signature`); `whsec_` secrets; **HMAC over raw body**; Next.js App Router example: `await req.text()` for raw body (CRITICAL — parsed JSON breaks HMAC); timestamp tolerance for replay protection
- **L4 — Actions**: Receiver-side; Svix also does outbound delivery with automatic retries, exponential backoff, event log, replay
- **L5 — Config**: SDKs in JS/Python/Go/Rust/Ruby/PHP; spec at standardwebhooks.com
- **L6 — Pattern**: **Open Webhook Standard** — the "USB of webhooks"; adopting it makes 9router compatible with the whole ecosystem; the `req.text()` raw body pattern is critical for Next.js

#### D4. Hookdeck (managed webhook infrastructure)
- **L1 — Mode**: Both (receive via Event Gateway; send via Outpost)
- **L2 — Events**: Sources (who sends) → Connections → Destinations (where events go); **Deduplication** (matching strategies), **Filters** (conditional routing by content), **Transformations** (modify before delivery)
- **L3 — Transport & Auth**: Managed queueing; **Retries** (manual/automatic); delivery groups per tenant (independent queues, delivery rates, observability); CLI for localhost forwarding; Console for inspect/replay; SOC2/HIPAA compliant
- **L4 — Actions**: Delivery to your endpoint (acting stays in your app); issue tracking with notifications; metrics dashboard
- **L5 — Config**: Dashboard/API/Terraform/MCP; webhook skills for AI agents
- **L6 — Pattern**: **Managed Webhook Gateway** — "don't build webhook infra yourself"; overkill for single-node local app, but the architecture (source→connection→destination with dedup/filter/transform) is the reference design

### E. MONITORING & DEAD-MAN'S-SWITCH

#### E1. Uptime Kuma ⭐ (91.4k★ — most popular self-hosted monitor)
- **L1 — Mode**: Send-only (outbound notifications to 90+ services)
- **L2 — Events**: Monitor state changes (up/down/pending); certificate expiry; Docker container status
- **L3 — Transport & Auth**: 90+ notification services (Telegram, Discord, Gotify, Slack, Pushover, Email/SMTP, and many more); **Push monitoring**: unique push URLs for external services to ping
- **L4 — Actions**: Notify only; status page generation
- **L5 — Config**: Vue 3 + WebSocket UI; SQLite/MySQL/PostgreSQL; Docker or Node.js; PM2 for production; 20-second intervals
- **L6 — Pattern**: **Self-Hosted Monitor + Notification Hub** — the Push URL feature (external → Kuma → notification) is a simple webhook receiver for health checks

#### E2. Healthchecks.io
- **L1 — Mode**: Receive (inbound pings) + Send (outbound alerts)
- **L2 — Events**: Ping URLs with states: New → Up → Late → Down → Paused; append `/start`, `/fail`, `/<exitcode>` to base URL for richer signals; UUID-based or slug-based (`/<project-ping-key>/<name-slug>`) with auto-provisioning
- **L3 — Transport & Auth**: HTTP GET/POST to ping URL; treat UUIDs/keys as secrets; self-hosted option available; cron or simple schedule per check
- **L4 — Actions**: **Dead man's switch**: alert when ping DOESN'T arrive (inverse of normal webhooks); integrations: email, webhooks, Slack, PagerDuty, SMS, etc.; configurable grace time (tolerance for late pings)
- **L5 — Config**: Projects group checks and integrations; team access; API keys; Prometheus integration; badges
- **L6 — Pattern**: **Dead Man's Switch / Cron Watchdog** — alerting on ABSENCE of events (inverted webhook); perfect for monitoring 9router's own background jobs

### F. EVENT-DRIVEN PATTERNS (architectural reference)

#### F1. EventEmitter / Pub-Sub (in-process)
- **L1-L6**: Node.js `EventEmitter` or custom pub-sub; zero network overhead; no persistence; no retry; single-process only. **Pattern: In-Process Event Bus** — fine for internal events within 9router's Node.js process, but doesn't solve external webhook receive.

#### F2. Transactional Outbox (database-level)
- **L1-L6**: Write event to `outbox` table in same DB transaction as business logic; separate poller/debezium reads outbox and publishes. **Pattern: Reliable Event Publishing** — guarantees at-least-once delivery; the right choice for 9router's SQLite (no external message broker needed).

#### F3. Message Queues (RabbitMQ/Redis/BullMQ)
- **L1-L6**: Producer → queue → consumer; persistent; retry with backoff; dead-letter queues; priority; delays. **Pattern: Durable Work Queue** — powerful but adds infrastructure; for 9router, a SQLite outbox is simpler and sufficient (single-node app).

#### F4. Server-Sent Events (SSE)
- **L1-L6**: One-way server→client streaming; auto-reconnect; no auth needed (uses cookies/headers). **Pattern: Real-Time Push to Clients** — 9router already uses SSE for streaming responses; could use for dashboard event feed.

#### F5. WebSocket
- **L1-L6**: Bidirectional; stateful; requires connection management. **Pattern: Real-Time Bidirectional Channel** — Slack Socket Mode proves this works for webhook delivery; relevant for 9router's dashboard real-time updates.

#### F6. Long-Polling
- **L1-L6**: Client polls, server holds response until data available; simpler than WebSocket; no firewall issues. **Pattern: Lazy Real-Time** — Telegram's `getUpdates` proves this works for localhost; simplest "no tunnel needed" option.

---

## Part 3 — The Taxonomy: 12 Archetypes

From the 6-level analysis, every program falls into one of these archetypes:

| # | Archetype | Example | Inbound? | Outbound? | Actions | Auth Pattern |
|---|-----------|---------|----------|-----------|---------|--------------|
| 1 | **TCA Rule Engine** | Home Assistant | ✅ | ✅ | trigger→condition→action | Secret ID in URL |
| 2 | **Visual Workflow Engine** | n8n, Make | ✅ | ✅ | Multi-step node graph | Token/JWT |
| 3 | **Flow-Based Programming** | Node-RED | ✅ | ✅ | Connected node graph | Basic auth |
| 4 | **Event Source + Workflow** | Pipedream | ✅ | ✅ | Code steps + app actions | Token/OAuth |
| 5 | **Agent Graph** | Huginn | ✅ | ✅ | Agent chains | Basic auth |
| 6 | **HMAC-Signed Receiver** | Stripe, GitHub, Svix | ✅ | ❌ | Receiver-side | HMAC + timestamp |
| 7 | **Dual-Mode Receiver** | Slack, Telegram | ✅ | ✅ | Queue + process | HMAC or WebSocket |
| 8 | **Ed25519 Receiver** | Discord | ✅ | ✅ | Callback types | Ed25519 signature |
| 9 | **Outbound Alert Router** | LiteLLM, Uptime Kuma | ❌ | ✅ | Notify only | Webhook URL |
| 10 | **Universal Adapter** | Apprise | ❌ | ✅ | Notify 100+ services | Schema:// URLs |
| 11 | **Dead Man's Switch** | Healthchecks.io | ✅ (inverse) | ✅ | Alert on absence | UUID/secret |
| 12 | **Embedded Event Queue** | Inngest, Trigger.dev | N/A | N/A | SDK in your app | SDK token |

---

## Part 4 — What 9router Should Build

**Recommended archetype: Hybrid of #1 (TCA Rule Engine) + #7 (Dual-Mode Receiver) + #10 (Universal Adapter)**

```
ARCHITECTURE: 9router Webhook System

┌─── INBOUND (Dual-Mode Receiver) ─────────────────────────────┐

│  Mode A: HTTP Receiver                                        │
│  POST /api/webhooks/[id]                                      │
│  • webhook_id = secret UUID (Home Assistant model)            │
│  • Raw body via req.text() (Svix/Stripe rule — CRITICAL)     │
│  • HMAC verify: webhook-id/timestamp/signature                │
│    (Standard Webhooks spec)                                   │
│  • 5-min timestamp tolerance, constant-time compare           │
│  • Respond 2xx in <3s, enqueue, process async                 │
│    (Slack's explicit mandate)                                 │

│  Mode B: Long-Polling Fallback                                │
│  GET /api/webhooks/poll (Telegram model)                      │
│  • For senders that can't reach you (no tunnel)               │
│  • Poll for pending events, receive via response body         │

│  Mode C: SSE Feed (optional)                                  │
│  GET /api/webhooks/stream                                     │
│  • Real-time dashboard event feed                             │

┌─── EVENT STORE (Transactional Outbox) ───────────────────────┐

│  SQLite table: webhook_events                                 │
│  • event_id (idempotency key, unique)                         │
│  • webhook_id (FK to webhook_configs)                         │
│  • payload (JSONB)                                            │
│  • status: pending → processing → delivered / failed          │
│  • attempts (count)                                           │
│  • next_retry_at (exponential backoff)                        │
│  • created_at, processed_at                                   │

│  Worker: instrumentation.js pattern                            │
│  • Polls pending events every N seconds                       │
│  • Processes through rule engine                              │
│  • Updates status on success/failure                          │
│  • Dead-letter after N retries                                │

┌─── RULE ENGINE (Home Assistant TCA) ─────────────────────────┐

│  Rule: {                                                      │
│    trigger: {                                                 │
│      event: "provider.error" | "quota.warning" |              │
│             "request.completed" | "webhook.inbound" | ...    │
│      filter: { jsonpath expression }                          │
│    },                                                         │
│    condition: {                                               │
│      and: [                                                   │
│        { field: "provider", op: "eq", value: "openai" },     │
│        { field: "error_count", op: "gt", value: 5 }          │
│      ]                                                        │
│    },                                                         │
│    actions: [                                                 │
│      { type: "notify", url: "ntfy://mytopic" },              │
│      { type: "http", url: "...", method: "POST" },           │
│      { type: "llm", model: "...", prompt: "..." }            │
│    ]                                                          │
│  }                                                            │
│                                                                │
│  Stored in: settingsRepo.js DEFAULT_SETTINGS.webhookRules     │
│  Configurable via: PATCH /api/settings                        │

┌─── ACTIONS (reuse existing infrastructure) ──────────────────┐

│  • notify → Apprise-style URLs (Slack/Discord/ntfy/Gotify/   │
│    Telegram) — the P3-deferred spec, now implemented         │
│  • http → outbound POST (generic webhook action)              │
│  • llm → reuse analyze-error pipeline (webhook →             │
│    LLM → reply/act) — Slack's reacji→LLM pattern             │
│  • gateway → toggle provider/fallback (One API's             │
│    auto-disable, LiteLLM cooldown)                           │
│  • dashboard → show in UI (SSE feed to dashboard)            │

┌─── OUTBOUND (Universal Adapter) ─────────────────────────────┐

│  Apprise-style URL config in settings:                        │
│    "notifyUrls": [                                            │
│      "ntfy://mytopic",                                        │
│      "slack://webhook-url",                                   │
│      "discord://webhook-id/token",                            │
│      "tgram://bottoken/chatid",                               │
│      "gotify://hostname/token",                               │
│      "json://myserver/webhook"                                │
│    ],                                                         │
│    "events": {                                                │
│      "provider.error": ["ntfy", "slack"],                    │
│      "quota.warning": ["ntfy"],                               │
│      "quota.exhausted": ["ntfy", "slack", "tgram"]           │
│    }                                                          │
│                                                                │
│  Triggers:                                                    │
│  • Quota 80%/90%/exhausted (the deferred spec)               │
│  • Provider error spike (LiteLLM-style)                      │
│  • Fallback event                                             │
│  • New model added                                            │
│  • Daily spend report                                         │
```

---

## Part 5 — Key Design Decisions (each backed by research)

| Decision | Precedent | Why |
|----------|-----------|-----|
| **HMAC + timestamp** (not just secret ID) | Stripe, Slack, Svix, GitHub | Secret IDs alone (Home Assistant) are fine for local-only; HMAC is needed if 9router ever exposes via tunnel/public URL |
| **Raw body for HMAC** (`req.text()`) | Svix/Standard Webhooks, Next.js | Parsing JSON before HMAC breaks the signature — this is the #1 mistake |
| **Respond 2xx in <3s, queue the rest** | Slack (3s rule), Discord (3s), Pipedream (`$.respond(immediate)`) | All major platforms mandate this; prevents timeout retries |
| **SQLite outbox, not Redis/RabbitMQ** | 9router is single-node local-first | No external dependencies; transactional outbox guarantees at-least-once; `instrumentation.js` pattern for worker |
| **Event IDs for idempotency** | Stripe (event ID), GitHub (X-GitHub-Delivery), Slack (event_id), Telegram (update_id) | Delivery is NOT guaranteed once; receivers MUST dedupe |
| **Dual mode: HTTP + long-polling** | Telegram (setWebhook vs getUpdates), Slack (HTTP vs Socket Mode) | HTTP for public/tunneled; long-polling for localhost-only (no tunnel needed) |
| **Apprise-style outbound** | 9router's own deferred spec, LiteLLM, Uptime Kuma | Covers 100+ services; aligns with the existing plan |
| **Event→Condition→Action rules** | Home Assistant, n8n, Node-RED | Simplest automation model; JSON-configurable; no visual editor needed initially |
| **LLM action reuse** | 9router's analyze-error pipeline, Slack's reacji→LLM example | The `analyze-error` route already runs LLM through the routing pipeline; webhook→LLM is the same pattern |
| **TCA in settings** | 9router's settingsRepo pattern | Rules are JSON in `DEFAULT_SETTINGS`, PATCH-able via `/api/settings` — same as every other 9router config |

---

## Sources Consulted

### Fetched successfully (primary research)
- `docs.slack.dev/apis/events-api/using-http-request-urls` — HTTP Events API, url_verification, retries, 3s rule
- `docs.slack.dev/apis/events-api/using-socket-mode` — Socket Mode protocol, envelope_id, no signature needed
- `docs.slack.dev/authentication/verifying-requests-from-slack` — HMAC recipe `v0:<timestamp>:<raw_body>`, 5-min tolerance
- `docs.discord.com/developers/interactions/receiving-and-responding` — Ed25519, callback types, 3s rule, 15-min tokens
- `docs.discord.com/developers/resources/webhook` — webhook types, slack/github-compatible endpoints
- `gotify.net/api-docs` — full REST API, appToken/clientToken, OIDC, plugins
- `github.com/louislam/uptime-kuma` — 91.4k★, 90+ notifications, push monitoring
- `healthchecks.io/docs/` — dead man's switch, states, auto-provisioning, integrations
- `docs.litellm.ai/docs/proxy/alerting` — alert types, alerting_args, digest mode, budget webhooks
- `docs.litellm.ai/docs/proxy/webhooks` (redirected to alerting) — budget webhook payloads
- `github.com/songquanpeng/one-api` — Message Pusher, ENABLE_METRIC, auto-disable
- `github.com/QuantumNous/new-api` — sandboxed JS task plugins
- `docs.helicone.ai/features/webhooks` — per-request webhooks, HMAC, sample rate
- `github.com/home-assistant/core` — webhook trigger, local_only, TCA model
- `docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/` — methods, auth, respond modes, 16MB cap
- `nodered.org/docs/user-guide/nodes/` — HTTP-in, Function, Switch, flow-based programming
- `pipedream.com/docs/workflows/steps/triggers/http/` — event object, $.respond(immediate), 5TB uploads
- `github.com/huginn/huginn` — 49.9k★, agent graph, Smokescreen egress proxy
- `stripe.com/docs/webhooks` — Stripe-Signature, 5-min tolerance, retries, stripe listen
- `docs.github.com/en/webhooks/webhook-events-and-payloads` — X-Hub-Signature-256, delivery GUID, 25MB cap
- `docs.svix.com/receiving/verifying-payloads` — webhook-id/timestamp/signature, raw body, req.text()
- `standardwebhooks.com` — the spec itself
- `hookdeck.com/docs` — Event Gateway, Outpost, dedup/filter/transform
- `core.telegram.org/bots/api` — setWebhook vs getUpdates, secret token, allowed_updates
- `docs.ntfy.sh/` — topic=password, action buttons, X-Delay, templates
- `github.com/caronc/apprise` — 17.3k★, 100+ services, tags, escalation

### Dead links / failed fetches (noted for future retries)
- `docs.litellm.ai/docs/proxy/webhooks` → 404 (used `/proxy/alerting`)
- `docs.openwebui.com/features/plugin/functions/` → 404
- `www.librechat.ai/docs/features/webhooks` → "Failed to extract meaningful content"
- `openrouter.ai/docs/features/webhooks` → 404 (OpenRouter/Portkey/Zapier/Make covered from general knowledge)
- `hookdeck.com/docs/webhooks/overview` → 404 (used `hookdeck.com/docs`)
- `discord.com/developers/...` → redirected to `docs.discord.com/developers/...` (re-fetched successfully)

### General knowledge (not fetched — flagged)
- OpenRouter / Portkey / Cloudflare AI Gateway (send-only alerting)
- Kong / APISIX / Traefik (in-process plugin hooks)
- Zapier / Make / IFTTT (hosted iPaaS)
- Activepieces / Windmill / Trigger.dev / Inngest (embedded event queues)

---

## Confidence Levels & Open Questions

| Finding | Confidence | Notes |
|---------|-----------|-------|
| 9router has zero webhook infrastructure | **High** (verified by grep) | `src/**` empty; docs-only plans |
| Slack/Discord/Stripe/Svix security models | **High** (fetched primary docs) | HMAC + timestamp + raw body + 3s rule |
| Home Assistant TCA model | **High** (fetched) | Secret-ID auth, trigger→condition→action |
| Apprise universal adapter | **High** (fetched) | 100+ services, tag routing |
| OpenRouter/Portkey/CF details | **Medium** (general knowledge) | Send-only alerting; no deep dive |
| Kong/APISIX/Traefik details | **Medium** (general knowledge) | In-process hooks, not webhooks |
| Inngest/Trigger.dev details | **Medium** (general knowledge) | Embedded event queues; worth a dedicated fetch |

### Open questions
1. Should inbound webhooks require HMAC even for local-only use, or is secret-ID enough (Home Assistant model)?
2. Should the rule engine be JSON-config only, or also expose a visual editor (n8n-style) later?
3. Should outbound notifications use Apprise as a dependency, or implement the URL schemes natively (fewer deps, more code)?
4. Should the outbox worker live in `instrumentation.js` (settings-gated) or as a standalone module?
5. Is long-polling Mode B worth building, or is the tunnel (Cloudflare/Tailscale) always available in practice?

---

## Related Docs

- `../planning/messages-page-feature-spec.md` §6 — the deferred Apprise/Alertmanager notification spec this research operationalizes
- `../planning/2026-08-19-master-continuation-plan.md` item 10 — "Webhook notifications (Apprise/Alertmanager)" deferred
- `../research/9router/38-message-driven-tools-research.md` — "No per-message actions / tool-building hooks" gap identified
- `../research/message-capture-deep-research-v2.md` — Apprise URL scheme recommendation for message capture
- `../research/2026-09-15-master-research-tree.md` — the master 6-level binary tree index (this doc is a sibling branch)