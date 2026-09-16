# Planning

**Date:** 2026-08-13
**Author:** Claude Code agent (main session, v1 branch)
**Status:** active
**Tags:** #planning #index

Project plans, feature specs, implementation roadmaps, and task breakdowns (formerly `plans/`).

## Contents

| File | Covers |
|------|--------|
| `2026-09-15-webhook-dead-mans-switch-plan.md` | Webhook R25: dead man's switch heartbeat monitor — code-level, agent-review note |
| `2026-09-15-webhook-stripe-model-plan.md` | Webhook R26: Stripe-style envelope + idempotency + replay — code-level, agent-review note |
| `2026-09-15-webhook-github-model-plan.md` | Webhook R27: GitHub headers + hex signature + ping — code-level, agent-review note |
| `2026-09-15-webhook-hookdeck-ingress-plan.md` | Webhook R29: catch-all ingress + source registry — code-level, agent-review note |
| `2026-09-15-webhook-apprise-adapter-plan.md` | Webhook R20: Apprise URL adapter (npm vs native — agent decides) — code-level, agent-review note |
| `2026-09-15-webhook-pubsub-core-plan.md` | Webhook R30: typed event bus + outbox bridge — code-level, agent-review note |
| `2026-09-15-webhook-message-queue-plan.md` | Webhook R32: queue adapter (BullMQ vs in-process) — code-level, agent-review note |
| `2026-09-15-webhook-sse-feed-plan.md` | Webhook R33: SSE real-time feed — code-level, agent-review note |
| `2026-09-15-webhook-websocket-feed-plan.md` | Webhook R34: WebSocket feed — code-level, agent-review note |
| `2026-09-15-webhook-long-polling-plan.md` | Webhook R35: long-polling fallback — code-level, agent-review note |
| `2026-09-15-webhook-n8n-workflows-plan.md` | Webhook R37: n8n-style workflow DAG executor — code-level, agent-review note |
| `2026-09-15-webhook-nodered-flows-plan.md` | Webhook R38: Node-RED-style message flows — code-level, agent-review note |
| `2026-09-15-webhook-pipedream-steps-plan.md` | Webhook R39: Pipedream-style step runner — code-level, agent-review note |
| `2026-09-15-webhook-huginn-agents-plan.md` | Webhook R40: Huginn-style scheduled agents — code-level, agent-review note |
| `2026-09-15-webhook-inngest-functions-plan.md` | Webhook R41: Inngest-style event functions — code-level, agent-review note |
| `2026-09-15-webhook-litellm-alerts-plan.md` | Webhook R42: LiteLLM-style alerts — code-level, agent-review note |
| `2026-09-15-webhook-oneapi-metrics-plan.md` | Webhook R43: One API-style metrics — code-level, agent-review note |
| `2026-09-15-webhook-helicone-observability-plan.md` | Webhook R44: Helicone-style observability — code-level, agent-review note |
| `2026-09-15-webhook-uptime-kuma-plan.md` | Webhook R45: Uptime Kuma push integration — code-level, agent-review note |
| `2026-09-15-webhook-healthchecks-io-plan.md` | Webhook R46: Healthchecks.io ping integration — code-level, agent-review note |
| `2026-09-15-webhook-http-client-plan.md` | Webhook R47–R48: HTTP client stack (timeout/retry/backoff) — code-level, agent-review note |
| `2026-09-15-webhook-m1-receiver-hmac-plan.md` | Webhook M1: receiver + HMAC verification (verify.js, registry.js, route, settings default) — code-level, agent-review note |
| `2026-09-15-webhook-m2-outbox-worker-plan.md` | Webhook M2: outbox + worker (migration 005, webhookEventsRepo, worker.js, instrumentation) — code-level, agent-review note |
| `2026-09-15-webhook-m3-rule-engine-actions-plan.md` | Webhook M3: TCA rule engine + 5 actions (rules.js, actions/*) — code-level, agent-review note |
| `2026-09-15-webhook-m4-outbound-triggers-plan.md` | Webhook M4: emitter + quota/chat/model wiring + daily digest — code-level, agent-review note |
| `2026-09-15-webhook-m5-dashboard-ui-plan.md` | Webhook M5: dashboard UI (pages, components, events API) — code-level, agent-review note |
| `2026-09-15-webhook-messaging-platforms-plan.md` | Webhook overlapping: Slack/Discord/Telegram modules + shared formatter — code-level, agent-review note |
| `2026-09-15-webhook-push-services-plan.md` | Webhook overlapping: ntfy/Gotify/Pushover modules — code-level, agent-review note |
| `2026-09-15-webhook-standards-compliance-plan.md` | Webhook overlapping: Svix aliases + outbound signing + Zapier envelope — code-level, agent-review note |
| `2026-09-14-keyless-governance-plan.md` | Keyless governance: agent profiles, synthetic tracking, tag priority queues, gate levels, model-group limiting, adaptive rate control (7 milestones) |
| `2026-08-31-source-app-governance-plan.md` | Source-app governance: attribution, per-key/per-app rate limits, queue, profile routing, guardrails, credentials, agent identity (7 milestones) |
| `2026-08-12-combo-duplicate-search-capabilities-plan.md` | Combo duplicate search + capabilities plan |
| `2026-08-10-mini2-install-and-test-plan.md` | Mini2 node install + test plan |
| `2026-08-31-context-window-and-hybrid-combo-plan.md` | Per-model & per-combo context window overrides + hybrid round-robin/fallback (5 milestones) |
| `fallback-rules-ux-plan.md` | Fallback rules UX plan |
| `message-driven-tools-plan.md` | Message-driven tool-building: facet extraction, JSON-path queries, identity dimensions, annotations, saved views, webhook/script hooks, UI (6 milestones) |
| `hardening-roadmap.md` | Security/hardening roadmap |
| `messages-page-feature-spec.md` | Messages page feature spec |
| `smart-router-observability-plan.md` | Smart router observability plan |

## Code-bearing implementation plans (2026-09-15)

Every plan below contains **reference code** (down to file level) plus the mandatory **Note to implementing agents (READ FIRST)** — the code is a starting point for review; agents MUST review it against the actual codebase, decide if there is a better way, make those changes happen, and update the plan. Overlap between plans is intentional.

### Feature-area plans

| File | Covers |
|------|--------|
| `2026-09-15-governance-implementation-plan.md` | Keyless governance implementation (M1–M7) — code-bearing |
| `2026-09-15-webhook-implementation-plan.md` | Webhook receive & act (M1–M5) — code-bearing |
| `2026-09-15-message-driven-tools-implementation-plan.md` | Message capture/filtering for messages page (M1–M6) — code-bearing |
| `2026-09-15-context-window-hybrid-combo-implementation-plan.md` | Context-window-aware combo selection (M1–M5) — code-bearing |
| `2026-09-15-smart-router-observability-remaining-implementation-plan.md` | Smart router observability remaining work (M3–M4) — code-bearing |

### Research impl-plan code versions (01–36)

| File | Covers |
|------|--------|
| `2026-09-15-impl-plan-01-learned-routing-code.md` | Learned routing: task classification, per-task model scoring, learned weights, feedback loop |
| `2026-09-15-impl-plan-02-cascade-fallback-code.md` | Cascade fallback: viability gate, cascade chain, judge, cost-quality plane |
| `2026-09-15-impl-plan-03-semantic-routing-code.md` | Semantic routing: embeddings, task-type classification, semantic combo selection |
| `2026-09-15-impl-plan-04-cost-quality-optimizer-code.md` | Cost-quality optimizer: c-q plane, Pareto frontier, budget-aware selection |
| `2026-09-15-impl-plan-05-gateway-interop-code.md` | Gateway interop: traffic mirroring, model caching, spend-share ranking, virtual models |
| `2026-09-15-impl-plan-06-moe-aware-dispatch-code.md` | MoE-aware dispatch: MoE metadata, expert scoring, specialization matching |
| `2026-09-15-impl-plan-07-eval-harness-code.md` | Routing evaluation harness: dataset, runner, Zero/Oracle baselines, AIQ |
| `2026-09-15-impl-plan-08-routing-observability-code.md` | Routing observability: decision recording, query API, dashboard, tracing |
| `2026-09-15-impl-plan-09-error-failover-hardening-code.md` | Error taxonomy, cooldowns, circuit breakers, failover hardening |
| `2026-09-15-impl-plan-10-security-mitm-hardening-code.md` | TLS/cert hardening, interception safety, credential redaction, audit |
| `2026-09-15-impl-plan-11-oauth-credential-lifecycle-code.md` | OAuth framework, single-flight refresh, credential lifecycle states |
| `2026-09-15-impl-plan-12-ux-dashboard-code.md` | Dashboard UX: combo builder, health indicators, usage viz, settings search |
| `2026-09-15-impl-plan-13-runtime-enforcement-code.md` | Policy engine: budget/latency/allow-deny, compiled evaluation, enforcement points |
| `2026-09-15-impl-plan-14-message-driven-tools-protocol-code.md` | Message-driven tools protocol: tool message types, chaining, handoff |
| `2026-09-15-impl-plan-15-goal-systems-integration-code.md` | Goal model, lifecycle, checkpoints, verification with evidence |
| `2026-09-15-impl-plan-16-divergence-malformed-response-code.md` | Response validation, divergence registry, salvage, quarantine |
| `2026-09-15-impl-plan-17-node-failover-networking-code.md` | HA failover, health checks, promotion, session restore |
| `2026-09-15-impl-plan-18-model-serving-policy-code.md` | Quotas, priorities, deployment rules |
| `2026-09-15-impl-plan-19-unified-error-system-code.md` | Error codes, envelope, centralized handling |
| `2026-09-15-impl-plan-20-gap-merge-master-coding-rule-code.md` | Gap inventory, master coding rules, coverage check |
| `2026-09-15-impl-plan-21-multi-account-quota-code.md` | Account health, quota-aware selection, rotation |
| `2026-09-15-impl-plan-22-streaming-reliability-code.md` | SSE validation, backpressure, heartbeats, stall detection |
| `2026-09-15-impl-plan-23-prompt-response-caching-code.md` | Provider prompt caching, response cache, semantic cache |
| `2026-09-15-impl-plan-24-rate-limiting-abuse-code.md` | Token bucket, multi-dimensional limits, abuse detection |
| `2026-09-15-impl-plan-25-cloud-sync-multidevice-code.md` | Sync units, conflict resolution, E2E encryption |
| `2026-09-15-impl-plan-26-token-optimization-context-code.md` | RTK enhancements, truncation, token budgeting |
| `2026-09-15-impl-plan-27-combo-fallback-rules-engine-code.md` | Declarative rules engine, compiler, simulation, analytics |
| `2026-09-15-impl-plan-28-embeddings-vectorstore-code.md` | Embedding service, SQLite vector store, semantic routing |
| `2026-09-15-impl-plan-29-cli-launcher-packaging-code.md` | Postinstall audit, tray recovery, pack audit, version alignment |
| `2026-09-15-impl-plan-30-i18n-localization-code.md` | i18n framework, detection, translation files, coverage check |
| `2026-09-15-impl-plan-31-performance-latency-code.md` | Per-stage profiling, budgets, benchmark suite |
| `2026-09-15-impl-plan-32-test-coverage-ci-code.md` | Coverage gates, known-fail registry, CI pipeline |
| `2026-09-15-impl-plan-33-documentation-knowledge-base-code.md` | ARCHITECTURE refresh, guides, auto-generated docs, freshness checks |
| `2026-09-15-impl-plan-34-provider-registry-models-code.md` | Registry schema, model metadata, onboarding, health tracking |
| `2026-09-15-impl-plan-35-data-privacy-compliance-code.md` | Redaction, retention, privacy modes, export/delete |
| `2026-09-15-impl-plan-36-model-comparison-leaderboard-code.md` | Comparison engine, LLM-judge scoring, leaderboard |

## When writing a plan

- Define scope explicitly (what's in AND out)
- Break work into incremental, independently-testable milestones
- List dependencies and risks
- Reference related research (`../research/`) and decisions (`../tracking/decisions/`)
- Use `../templates/WORK-ITEM-TEMPLATE.md` as a starting skeleton

## Conventions

Same as [`../README.md`](../README.md).
