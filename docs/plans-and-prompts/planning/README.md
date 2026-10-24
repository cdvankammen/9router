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

### Research impl-plan code versions (37–204)

| File | Covers |
|------|--------|
| `2026-09-15-impl-plan-37-webhooks-events-code.md` | Webhooks & events |
| `2026-09-15-impl-plan-38-multiuser-rbac-code.md` | Multi-user RBAC |
| `2026-09-15-impl-plan-39-migration-backup-restore-code.md` | Migration, backup & restore |
| `2026-09-15-impl-plan-40-api-compatibility-sdk-code.md` | API compatibility & SDK |
| `2026-09-15-impl-plan-41-docker-deployment-code.md` | Docker deployment |
| `2026-09-15-impl-plan-42-config-system-overhaul-code.md` | Config system overhaul |
| `2026-09-15-impl-plan-43-sqlite-storage-optimization-code.md` | SQLite storage optimization |
| `2026-09-15-impl-plan-44-dynamic-combo-autoswitch-code.md` | Dynamic combo autoswitch |
| `2026-09-15-impl-plan-45-cost-tracking-budgets-code.md` | Cost tracking & budgets |
| `2026-09-15-impl-plan-46-prompt-templates-optimization-code.md` | Prompt templates optimization |
| `2026-09-15-impl-plan-47-audit-log-traceability-code.md` | Audit log & traceability |
| `2026-09-15-impl-plan-48-plugin-system-extensibility-code.md` | Plugin system extensibility |
| `2026-09-15-impl-plan-49-health-self-healing-code.md` | Health & self-healing |
| `2026-09-15-impl-plan-50-roadmap-release-management-code.md` | Roadmap & release management |
| `2026-09-15-impl-plan-51-model-aliases-virtual-code.md` | Model aliases & virtual models |
| `2026-09-15-impl-plan-52-request-normalization-canonical-code.md` | Request normalization & canonical form |
| `2026-09-15-impl-plan-53-usage-analytics-reporting-code.md` | Usage analytics & reporting |
| `2026-09-15-impl-plan-54-traffic-inspection-debugging-code.md` | Traffic inspection & debugging |
| `2026-09-15-impl-plan-55-context-window-management-code.md` | Context window management |
| `2026-09-15-impl-plan-56-task-classification-intent-code.md` | Task classification & intent |
| `2026-09-15-impl-plan-57-fallback-retry-semantics-code.md` | Fallback & retry semantics |
| `2026-09-15-impl-plan-58-security-audit-hardening-code.md` | Security audit & hardening |
| `2026-09-15-impl-plan-59-model-lifecycle-sunset-code.md` | Model lifecycle & sunset |
| `2026-09-15-impl-plan-60-load-testing-capacity-code.md` | Load testing & capacity |
| `2026-09-15-impl-plan-61-user-facing-error-messages-code.md` | User-facing error messages |
| `2026-09-15-impl-plan-62-data-export-import-code.md` | Data export & import |
| `2026-09-15-impl-plan-63-capability-discovery-negotiation-code.md` | Capability discovery & negotiation |
| `2026-09-15-impl-plan-64-anomaly-detection-alerts-code.md` | Anomaly detection & alerts |
| `2026-09-15-impl-plan-65-provider-redundancy-code.md` | Provider redundancy |
| `2026-09-15-impl-plan-66-request-tracing-correlation-code.md` | Request tracing & correlation |
| `2026-09-15-impl-plan-67-model-quality-evaluation-code.md` | Model quality evaluation |
| `2026-09-15-impl-plan-68-session-management-persistence-code.md` | Session management & persistence |
| `2026-09-15-impl-plan-69-pricing-data-management-code.md` | Pricing data management |
| `2026-09-15-impl-plan-70-gateway-clustering-shared-state-code.md` | Gateway clustering & shared state |
| `2026-09-15-impl-plan-71-routing-governance-standards-code.md` | Routing governance standards |
| `2026-09-15-impl-plan-72-per-model-observability-code.md` | Per-model observability |
| `2026-09-15-impl-plan-73-request-prioritization-qos-code.md` | Request prioritization & QoS |
| `2026-09-15-impl-plan-74-model-version-pinning-rollback-code.md` | Model version pinning & rollback |
| `2026-09-15-impl-plan-75-response-quality-guardrails-code.md` | Response quality guardrails |
| `2026-09-15-impl-plan-76-routing-context-engineering-code.md` | Routing context engineering |
| `2026-09-15-impl-plan-77-model-preference-fallback-order-code.md` | Model preference & fallback order |
| `2026-09-15-impl-plan-78-multi-environment-deployment-code.md` | Multi-environment deployment |
| `2026-09-15-impl-plan-79-per-model-request-adaptation-code.md` | Per-model request adaptation |
| `2026-09-15-impl-plan-80-tool-routing-function-calling-code.md` | Tool routing & function calling |
| `2026-09-15-impl-plan-81-request-intent-classification-code.md` | Request intent classification |
| `2026-09-15-impl-plan-82-router-calibration-confidence-code.md` | Router calibration & confidence |
| `2026-09-15-impl-plan-83-feedback-based-selection-code.md` | Feedback-based selection |
| `2026-09-15-impl-plan-84-rag-cascade-retrieval-code.md` | RAG cascade retrieval |
| `2026-09-15-impl-plan-85-mixture-of-agents-code.md` | Mixture of agents |
| `2026-09-15-impl-plan-86-latency-capacity-routing-code.md` | Latency & capacity routing |
| `2026-09-15-impl-plan-87-cost-heuristics-estimation-code.md` | Cost heuristics & estimation |
| `2026-09-15-impl-plan-88-routing-rule-engine-v2-code.md` | Routing rule engine v2 |
| `2026-09-15-impl-plan-89-error-classification-retry-code.md` | Error classification & retry |
| `2026-09-15-impl-plan-90-cascade-coordination-strategy-code.md` | Cascade coordination strategy |
| `2026-09-15-impl-plan-91-benchmark-hygiene-datasets-code.md` | Benchmark hygiene & datasets |
| `2026-09-15-impl-plan-92-local-inference-acceleration-code.md` | Local inference acceleration |
| `2026-09-15-impl-plan-93-embedding-encoder-management-code.md` | Embedding encoder management |
| `2026-09-15-impl-plan-94-provider-acceptance-load-balancing-code.md` | Provider acceptance & load balancing |
| `2026-09-15-impl-plan-95-cooldown-backoff-tuning-code.md` | Cooldown & backoff tuning |
| `2026-09-15-impl-plan-96-expert-utilization-capacity-code.md` | Expert utilization & capacity |
| `2026-09-15-impl-plan-97-quality-tiers-thresholds-code.md` | Quality tiers & thresholds |
| `2026-09-15-impl-plan-98-oracle-gap-analysis-code.md` | Oracle gap analysis |
| `2026-09-15-impl-plan-99-panel-coordination-stickiness-code.md` | Panel coordination & stickiness |
| `2026-09-15-impl-plan-100-inference-efficiency-toolkit-code.md` | Inference efficiency toolkit |
| `2026-09-15-impl-plan-101-sparse-routing-efficiency-code.md` | Sparse routing efficiency |
| `2026-09-15-impl-plan-102-response-verification-methods-code.md` | Response verification methods |
| `2026-09-15-impl-plan-103-human-preference-learning-code.md` | Human preference learning |
| `2026-09-15-impl-plan-104-capability-matching-detection-code.md` | Capability matching & detection |
| `2026-09-15-impl-plan-105-domain-specialized-routing-code.md` | Domain-specialized routing |
| `2026-09-15-impl-plan-106-step-context-agent-routing-code.md` | Step-context agent routing |
| `2026-09-15-impl-plan-107-routing-scope-resolution-code.md` | Routing scope resolution |
| `2026-09-15-impl-plan-108-hybrid-routing-explainability-code.md` | Hybrid routing explainability |
| `2026-09-15-impl-plan-109-safety-signals-guardrails-code.md` | Safety signals & guardrails |
| `2026-09-15-impl-plan-110-cost-quality-modeling-code.md` | Cost-quality modeling |
| `2026-09-15-impl-plan-111-routing-algorithm-library-code.md` | Routing algorithm library |
| `2026-09-15-impl-plan-112-experiment-design-power-code.md` | Experiment design & power |
| `2026-09-15-impl-plan-113-quantization-aware-routing-code.md` | Quantization-aware routing |
| `2026-09-15-impl-plan-114-rag-aware-routing-code.md` | RAG-aware routing |
| `2026-09-15-impl-plan-115-executor-specialization-selection-code.md` | Executor specialization & selection |
| `2026-09-15-impl-plan-116-db-adapter-chain-hardening-code.md` | DB adapter chain hardening |
| `2026-09-15-impl-plan-117-enforcement-combinations-code.md` | Enforcement combinations |
| `2026-09-15-impl-plan-118-feature-gap-tracking-code.md` | Feature gap tracking |
| `2026-09-15-impl-plan-119-ha-mini-backup-nodes-code.md` | HA mini backup nodes |
| `2026-09-15-impl-plan-120-failover-networking-options-code.md` | Failover networking options |
| `2026-09-15-impl-plan-121-divergence-malformed-handling-code.md` | Divergence & malformed handling |
| `2026-09-15-impl-plan-122-error-categorization-inbox-code.md` | Error categorization inbox |
| `2026-09-15-impl-plan-123-failover-state-machine-code.md` | Failover state machine |
| `2026-09-15-impl-plan-124-translator-direct-routes-code.md` | Translator direct routes |
| `2026-09-15-impl-plan-125-oauth-token-lifecycle-code.md` | OAuth token lifecycle |
| `2026-09-15-impl-plan-126-sse-layer-reliability-code.md` | SSE layer reliability |
| `2026-09-15-impl-plan-127-mitm-hardening-inspection-code.md` | MITM hardening & inspection |
| `2026-09-15-impl-plan-128-api-consistency-versioning-code.md` | API consistency & versioning |
| `2026-09-15-impl-plan-129-rtk-token-optimization-deep-code.md` | RTK token optimization deep dive |
| `2026-09-15-impl-plan-130-provider-registry-governance-code.md` | Provider registry governance |
| `2026-09-15-impl-plan-131-classifier-routing-infrastructure-code.md` | Classifier routing infrastructure |
| `2026-09-15-impl-plan-132-pomdp-self-verification-routing-code.md` | POMDP self-verification routing |
| `2026-09-15-impl-plan-133-cascade-judge-quality-escalation-code.md` | Cascade judge quality escalation |
| `2026-09-15-impl-plan-134-ensemble-model-composition-code.md` | Ensemble model composition |
| `2026-09-15-impl-plan-135-constraint-based-routing-code.md` | Constraint-based routing |
| `2026-09-15-impl-plan-136-causal-llm-routers-online-adaptation-code.md` | Causal LLM routers & online adaptation |
| `2026-09-15-impl-plan-137-cascade-escalation-depth-code.md` | Cascade escalation depth |
| `2026-09-15-impl-plan-138-retry-amplification-control-code.md` | Retry amplification control |
| `2026-09-15-impl-plan-139-account-selection-balancing-code.md` | Account selection & balancing |
| `2026-09-15-impl-plan-140-moe-capacity-overflow-code.md` | MoE capacity overflow |
| `2026-09-15-impl-plan-141-expert-merging-upcycling-code.md` | Expert merging & upcycling |
| `2026-09-15-impl-plan-142-domain-specialized-routing-code.md` | Domain-specialized routing (deep) |
| `2026-09-15-impl-plan-143-virtual-models-abstraction-code.md` | Virtual models abstraction |
| `2026-09-15-impl-plan-144-session-stickiness-affinity-code.md` | Session stickiness & affinity |
| `2026-09-15-impl-plan-145-embedding-encoder-selection-code.md` | Embedding encoder selection |
| `2026-09-15-impl-plan-146-similarity-metrics-nn-search-code.md` | Similarity metrics & NN search |
| `2026-09-15-impl-plan-147-semantic-route-design-code.md` | Semantic route design |
| `2026-09-15-impl-plan-148-benchmark-dataset-construction-code.md` | Benchmark dataset construction |
| `2026-09-15-impl-plan-149-statistical-power-significance-code.md` | Statistical power & significance |
| `2026-09-15-impl-plan-150-prompt-adaptation-cascades-code.md` | Prompt adaptation cascades |
| `2026-09-15-impl-plan-151-llm-approximation-judges-code.md` | LLM approximation judges |
| `2026-09-15-impl-plan-152-cascade-collapse-prevention-code.md` | Cascade collapse prevention |
| `2026-09-15-impl-plan-153-cost-tier-bands-code.md` | Cost tier bands |
| `2026-09-15-impl-plan-154-task-type-classification-code.md` | Task-type classification |
| `2026-09-15-impl-plan-155-draft-model-selection-code.md` | Draft model selection |
| `2026-09-15-impl-plan-156-verification-strategies-speculative-code.md` | Verification strategies & speculative |
| `2026-09-15-impl-plan-157-kv-cache-optimization-code.md` | KV cache optimization |
| `2026-09-15-impl-plan-158-quantization-aware-routing-code.md` | Quantization-aware routing (deep) |
| `2026-09-15-impl-plan-159-per-step-routing-agents-code.md` | Per-step routing agents |
| `2026-09-15-impl-plan-160-tool-enabled-routing-code.md` | Tool-enabled routing |
| `2026-09-15-impl-plan-161-retrieval-routing-hybrid-code.md` | Retrieval-routing hybrid |
| `2026-09-15-impl-plan-162-time-sensitive-routing-code.md` | Time-sensitive routing |
| `2026-09-15-impl-plan-163-preference-data-collection-code.md` | Preference data collection |
| `2026-09-15-impl-plan-164-data-augmentation-ood-code.md` | Data augmentation & OOD |
| `2026-09-15-impl-plan-165-request-pricing-cost-model-code.md` | Request pricing & cost model |
| `2026-09-15-impl-plan-166-zero-router-baseline-code.md` | Zero router baseline |
| `2026-09-15-impl-plan-167-cost-quality-plane-code.md` | Cost-quality plane |
| `2026-09-15-impl-plan-168-model-size-selection-code.md` | Model size selection |
| `2026-09-15-impl-plan-169-few-shot-self-verification-code.md` | Few-shot self-verification |
| `2026-09-15-impl-plan-170-answer-confidence-estimation-code.md` | Answer confidence estimation |
| `2026-09-15-impl-plan-171-threshold-calibration-pipeline-code.md` | Threshold calibration pipeline |
| `2026-09-15-impl-plan-172-cost-per-request-metrics-code.md` | Cost-per-request metrics |
| `2026-09-15-impl-plan-173-matrix-factorization-routing-code.md` | Matrix factorization routing |
| `2026-09-15-impl-plan-174-bradley-terry-preference-models-code.md` | Bradley-Terry preference models |
| `2026-09-15-impl-plan-175-win-probability-prediction-code.md` | Win probability prediction |
| `2026-09-15-impl-plan-176-query-difficulty-prediction-code.md` | Query difficulty prediction |
| `2026-09-15-impl-plan-177-gating-mechanisms-topk-code.md` | Gating mechanisms & top-k |
| `2026-09-15-impl-plan-178-load-balancing-losses-stability-code.md` | Load balancing losses & stability |
| `2026-09-15-impl-plan-179-fallback-chains-triggers-code.md` | Fallback chains & triggers |
| `2026-09-15-impl-plan-180-retry-counts-backoff-strategies-code.md` | Retry counts & backoff strategies |
| `2026-09-15-impl-plan-181-cooldown-timers-state-management-code.md` | Cooldown timers & state management |
| `2026-09-15-impl-plan-182-cascade-vs-zero-comparison-code.md` | Cascade vs zero comparison |
| `2026-09-15-impl-plan-183-cascade-vs-oracle-gap-code.md` | Cascade vs oracle gap |
| `2026-09-15-impl-plan-184-judge-models-selection-code.md` | Judge models selection |
| `2026-09-15-impl-plan-185-judge-thresholds-calibration-code.md` | Judge thresholds calibration |
| `2026-09-15-impl-plan-186-failure-detection-signaling-code.md` | Failure detection & signaling |
| `2026-09-15-impl-plan-187-strategy-evaluation-framework-code.md` | Strategy evaluation framework |
| `2026-09-15-impl-plan-188-rule-based-vs-learned-routing-code.md` | Rule-based vs learned routing |
| `2026-09-15-impl-plan-189-zero-router-limitations-code.md` | Zero router limitations |
| `2026-09-15-impl-plan-190-oracle-properties-analysis-code.md` | Oracle properties analysis |
| `2026-09-15-impl-plan-191-executor-retry-semantics-code.md` | Executor retry semantics |
| `2026-09-15-impl-plan-192-translator-registration-system-code.md` | Translator registration system |
| `2026-09-15-impl-plan-193-db-migrations-schema-evolution-code.md` | DB migrations & schema evolution |
| `2026-09-15-impl-plan-194-error-registry-unified-v2-code.md` | Error registry unified v2 |
| `2026-09-15-impl-plan-195-enforcement-mechanisms-deep-dive-code.md` | Enforcement mechanisms deep dive |
| `2026-09-15-impl-plan-196-cascade-trigger-conditions-code.md` | Cascade trigger conditions |
| `2026-09-15-impl-plan-197-cooldown-tuning-optimization-code.md` | Cooldown tuning optimization |
| `2026-09-15-impl-plan-198-circuit-breaker-patterns-code.md` | Circuit breaker patterns |
| `2026-09-15-impl-plan-199-retry-storm-mitigation-bundling-code.md` | Retry storm mitigation & bundling |
| `2026-09-15-impl-plan-200-load-balancing-strategies-deep-code.md` | Load balancing strategies deep dive |
| `2026-09-15-impl-plan-203-request-overrides-code.md` | Per-request override mechanism |
| `2026-09-15-impl-plan-204-sandbox-environment-coexistence-code.md` | Sandbox environment coexistence |

> Plans 201 and 202 have no research source files (numbering gap in the research series) — no code versions exist for them.

### Research impl-plan code versions (import-01–20)

| File | Covers |
|------|--------|
| `2026-09-15-impl-plan-import-01-db-schema-code.md` | Imported messages DB schema (migration 005, repo, UNION view) |
| `2026-09-15-impl-plan-import-02-provider-matching-code.md` | Model → provider matching (normalizer, lookups, unknown models) |
| `2026-09-15-impl-plan-import-03-import-api-code.md` | Import API (POST route, auth, validation, pipeline) |
| `2026-09-15-impl-plan-import-04-log-file-tail-code.md` | Log file tailing (watcher, parsers, sync state) |
| `2026-09-15-impl-plan-import-05-hermes-hook-code.md` | Hermes hook integration (config route, docs) |
| `2026-09-15-impl-plan-import-06-error-reconstruction-code.md` | Error reconstruction (timeout thresholds, fingerprints, fallbacks) |
| `2026-09-15-impl-plan-import-07-cost-calculation-code.md` | Cost calculation (token extraction, pricing, display) |
| `2026-09-15-impl-plan-import-08-messages-page-ui-code.md` | Messages page UI (source filter, badges, import modal) |
| `2026-09-15-impl-plan-import-09-observability-export-code.md` | Observability export (Langfuse, OTel, webhook, JSONL/CSV) |
| `2026-09-15-impl-plan-import-10-multi-tenant-import-code.md` | Multi-tenant import (tenant columns, import keys, scoping) |
| `2026-09-15-impl-plan-import-11-import-scheduler-code.md` | Import scheduler (jobs table, runner, retries, dead-letter) |
| `2026-09-15-impl-plan-import-12-retention-lifecycle-code.md` | Retention lifecycle (config, archive, purge, restore) |
| `2026-09-15-impl-plan-import-13-deduplication-idempotency-code.md` | Deduplication & idempotency (fingerprints, keys) |
| `2026-09-15-impl-plan-import-14-format-adapters-code.md` | Format adapters (Hermes, Cursor, OpenAI parsers) |
| `2026-09-15-impl-plan-import-15-streaming-realtime-code.md` | Streaming & realtime (NDJSON, SSE, backpressure) |
| `2026-09-15-impl-plan-import-16-analytics-insights-code.md` | Analytics & insights (UNION stats, anomalies) |
| `2026-09-15-impl-plan-import-17-agent-adapters-code.md` | Agent adapters (recipes for Hermes/Claude Code/Cursor/Codex/Aider) |
| `2026-09-15-impl-plan-import-18-model-catalog-sync-code.md` | Model catalog sync (OpenRouter/LiteLLM, resolution) |
| `2026-09-15-impl-plan-import-19-api-contracts-code.md` | API contracts & client SDKs (schemas, errors, Node/Python) |
| `2026-09-15-impl-plan-import-20-quality-rollout-code.md` | Quality, verification & rollout (fixtures, accuracy, checklist) |

## When writing a plan

- Define scope explicitly (what's in AND out)
- Break work into incremental, independently-testable milestones
- List dependencies and risks
- Reference related research (`../research/`) and decisions (`../tracking/decisions/`)
- Use `../templates/WORK-ITEM-TEMPLATE.md` as a starting skeleton

## Conventions

Same as [`../README.md`](../README.md).
