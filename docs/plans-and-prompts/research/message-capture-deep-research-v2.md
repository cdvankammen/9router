# EXHAUSTIVE Research: Message Capture & Log-Viewing for 9Router (v2 — deep)

**Date:** 2026-08-07 (v2, exhaustive pass)
**Author:** GitHub Copilot agent (3 parallel research agents + direct repo deep-dives)
**Status:** active (research only — no code changed)
**Tags:** research, observability, message-capture, llm-observability, self-hosted

> v1 (`message-capture-log-viewing.md`) was a survey. This is the exhaustive pass: every
> project was pulled from live GitHub (stars/licenses verified 2026-08-07), plus the
> ProxmoxVE repo was enumerated via code search, plus awesome-lists were read.

---

## 0. TL;DR — what we should actually do

**Build in-app, copy proven UX, integrate nothing heavy:**
- **Messages page**: copy **Bruno/Hoppscotch's** response tabs (Pretty JSON / Raw / Preview / Headers / cURL), **mitmweb's** master-detail flow layout, **OpenObserve's** histogram + field filters, **HyperDX's** property search (`level:err`).
- **Error inbox**: copy **Sentry's** grouping/triage workflow; model the data on Sentry's event schema (GlitchTip is a Sentry-protocol-compatible lightweight reference, MIT).
- **Notifications**: use **Apprise** URL scheme (one string per channel, 100+ services) or direct ntfy/Gotify/Slack webhooks — no new infra; copy Alertmanager dedup/grouping.
- **Optional external viewer later**: **Langfuse** (MIT, LLM-native, docker compose) is the best "ship logs out" target; **OpenObserve** if we want a general log platform; **OpenLIT** if we want a one-command AI-engineering platform (incl. coding-agent hooks).
- **Avoid**: Graylog (SSPL), Sentry self-host (FSL + 20 containers), Phoenix (ELv2 — no longer OSS), Axiom (self-host discontinued), Pipedream (not self-hostable), TensorZero (archived).

---

## 1. Full LLM observability / tracing platforms (deep dive)

| Project | ★ | License | Self-host | Key features (relevant to us) | Copy ideas |
|---|---|---|---|---|---|
| **Langfuse** (langfuse/langfuse) | 32.7k | MIT (ee/ excluded) | ✅ docker compose (Postgres+ClickHouse) | Traces, **sessions/chat trees**, prompt mgmt, LLM-as-judge evals, datasets, playground, cost; OTel-compatible ingest; SDKs JS/Python; telemetry opt-out (`TELEMETRY_ENABLED=false`) | Session tree UI; eval framework; the "ship-out" endpoint of choice |
| **Helicone** (Helicone/helicone) | 6.0k | Apache-2.0 | ✅ docker compose (Supabase+ClickHouse+Minio, 5 services) | **AI Gateway with routing+fallbacks (same as 9Router!)**, sessions, traces, cost, playground, prompt versioning; cloudflare-worker proxy logging | Its request/session viewer is literally the UX we want |
| **Arize Phoenix** (Arize-ai/phoenix) | 10.9k | **ELv2 (NOT OSS)** | ✅ pip/uvx/docker/helm | Tracing (OTel/OpenInference), evals, datasets/experiments, playground, prompt mgmt, **PXI agent**, remote MCP, coding-agent CLI | ⚠️ License changed to Elastic 2.0 — skip as a dependency; borrow ideas only |
| **Weave** (wandb/weave) | 1.1k | Apache-2.0 | ⚠️ needs W&B account (free tier); trace_server OSS | Function tracing via `@weave.op`, evals, boards (paused); strong Claude-agent tracing | Decorator pattern for tracing; eval harness |
| **AgentOps** (AgentOps-AI/agentops) | 5.8k | MIT | ✅ app/ self-host (dashboard+API) | **Session replays**, step-by-step agent graphs, cost mgmt, evals, failure detection, tool-usage stats; Python-first | Session replay + agent-graph visualization; failure detection |
| **OpenLIT** (openlit/openlit) | 2.7k | Apache-2.0 | ✅ docker compose / helm | **Full AI-engineering platform**: observability dashboard, **11 built-in eval types**, rule engine, guardrails, prompt hub, vault, playground, **exceptions/errors dashboard**, cost (incl. custom models), GPU monitoring, **CLI hooks for Claude Code/Cursor/Codex**, OTel-native gen_ai semconv | The exceptions dashboard + coding-agent CLI hooks + rule engine are directly applicable |
| **Langtrace** (Scale3-Labs/langtrace) | 2.1k | Apache-2.0 | ✅ docker | OTel-based traces, evals, prompt mgmt | — |
| **LangWatch** (langwatch/langwatch) | 1.8k | Elastic-2.0 | ✅ docker | Traces, evals, quality gate | ⚠️ ELv2 again |
| **TruLens** (truera/trulens) | 2.5k | MIT | ⚠️ notebook-centric (local dashboards) | Feedback functions (LLM-as-judge), RAG triad evals | Eval feedback-function library |
| **OpenLLMetry** (traceloop/openllmetry) | 3.4k | Apache-2.0 | ⚠️ SDK only (send to any OTLP backend) | OTel instrumentation for LLM apps; GenAI semconv | OTLP export path if we ever ship spans |
| **WhyLabs LangKit** (whylabs/langkit) | 1.6k | Apache-2.0 | ⚠️ library | LLM security/guardrails, schema tracking | — |
| **promptfoo** (promptfoo/promptfoo) | 8.4k | MIT | ✅ CLI/web | Red-teaming, evals, matrix testing | Eval runner for error-analysis prompts |
| **DeepEval** (confident-ai/deepeval) | 9.4k | Apache-2.0 | ⚠️ library | 14+ eval metrics, Pytest integration, LLM-as-judge | Metric library for batch analysis |
| **Comet Opik** (comet-ml/opik) | 14.8k | Apache-2.0 | ✅ docker compose | Traces, evals, datasets, prompt mgmt, playground, cost | Strong OSS alternative to Langfuse |

## 2. AI gateways WITH built-in logging/viewers (direct competitors to learn from)

| Project | ★ | License | Logging/UI |
|---|---|---|---|
| **one-api** (songquanpeng/one-api) | 36.3k | MIT | **`logs` table with per-request log viewer** (prompt/completion/status/model/channel), quota ledger, Message-Pusher (self-host push alerts) integration; SQLite/MySQL; single binary |
| **new-api** (QuantumNous/new-api) | 44.6k | AGPLv3 | one-api fork: **data dashboard, usage analytics, log viewer, billing panel**, OIDC, Midjourney/Suno/rerank support, multi-format conversion |
| **LiteLLM** (BerriAI/litellm) | 55.8k | MIT | Proxy with **logging callbacks** (Langfuse, S3, GCS, BigQuery, Prometheus), UI dashboard (enterprise), spend tracking |
| **Portkey gateway** (Portkey-AI/gateway) | 12.7k | MIT | 1,600+ models, guardrails, **observability SaaS companion** (logs/analytics in cloud), OTel export |
| **Bifrost** (cloudflare/bifrost) | 7.1k | Apache-2.0 | Workers AI gateway — worker-based logging; sub-ms overhead |
| **Kong AI Gateway** (kong/kong) | 43.9k | Apache-2.0 | AI plugins + logs via Kong's standard logging (file/http/tcp) |
| **Envoy AI Gateway** (envoyproxy/ai-gateway) | 1.9k | Apache-2.0 | AI gateway on Envoy; OTel + logging |
| **Higress** (alibaba/higress) | 9.0k | Apache-2.0 | AI-native gateway on Envoy; LLM plugin with logging |
| **TensorZero** (tensorzero/tensorzero) | 11.7k | Apache-2.0 | **ARCHIVED June 2026** ⚠️ — gateway+observability+evals; skip |
| **OmniRoute** (diegosouzapw/OmniRoute) | 42.4k | MIT | Coding-agent token-saver, quota-aware auto-fallback (very close cousin of 9Router) |
| **cli-proxy-api / claude-code-router / sub2api** | 46.4k/36.5k/36.1k | MIT-ish | CLI-provider proxies with usage logs |
| **Chat Nio / coai** (coaidev/coai) | 9.3k | MIT | Multi-tenant gateway with credit billing + admin panel |
| **cuihuan/awesome-ai-gateway** | 77★ | — | **~100+ gateways, daily-CI stars, cost benchmarks (Bifrost 0.62ms / Portkey 2.65ms / LiteLLM 5.83ms), CVE matrix — tracks 9router itself** (decolua/9router ⭐24.8k per its data) |

**Key insight**: one-api/new-api are the closest "router with a built-in per-request log viewer" products. Their log page (request → response, status, model, cost) is exactly the baseline we should match; then we exceed it with format tabs + AI analysis + error inbox.

## 3. Log management (Splunk-class) — verified

| Project | ★ | License | Deploy | Notes |
|---|---|---|---|---|
| **OpenObserve** | 20.6k | AGPL-3.0 | single binary/docker | Rust; Parquet+S3; **logs+metrics+traces+RUM+alerts+incidents+AI/LLM observability**; SQL/PromQL; 140x cheaper than ES; free 50GB/day cloud |
| **SigNoz** | 31.8k | Apache-2.0 (core) | docker/k8s | OTel-native, ClickHouse; **logs+traces+metrics+LLM observability+exceptions**; visual query builder; MCP server |
| **Grafana Loki** | 28.7k | AGPL-3.0 | single binary/helm | label-only indexing; Alloy (3.4k★) replaced Promtail; LogQL |
| **VictoriaLogs** | 2.1k | Apache-2.0 | single binary | schema-free LogsQL; instant search; ships inside VictoriaMetrics Proxmox script as optional add-on |
| **Quickwit** | 11.5k | Apache-2.0 | binary/docker/helm | sub-second search on cold S3; Tantivy; ES-compatible API |
| **Graylog** | 8.1k | **SSPL-1.0** ⚠️ | Java+OpenSearch+Mongo | SIEM-ish; network-restricted license — avoid |
| **ELK** | 77.8k | Elastic-2.0 / AGPLv3 option | docker | heaviest; start-local mode exists |
| **HyperDX** | 9.8k | MIT | ClickStack docker (ClickHouse+OTel+Mongo) | "Kibana for ClickHouse"; **property search (`level:err`), one-click alerts, webhook alerting** |
| **Highlight.io** | 9.4k | Apache-2.0 (core) | run-hobby.sh docker | error monitoring + session replay + **customizable grouping rules**; hobby cap 10k sessions/mo |
| **Logdy** | 2.3k | Apache-2.0 | single Go binary | terminal/local web log viewer; streaming |
| **lnav** | 10.5k | BSD-2 | brew | TUI: **pretty-print JSON-lines, error/warning indexing, SQLite expressions, histogram** |
| **Dozzle** | 14.0k | MIT | docker | realtime live-tail with follow + search (SSE) |
| Vector / Fluent Bit | 22.3k / 8.0k | MPL-2.0 / Apache-2.0 | binary/agent | log pipelines (forwarders, not viewers) |
| **Splunk Enterprise** | — | proprietary | self-host (500MB/day free) | SPL; expensive |
| **Axiom** | — | proprietary | **self-host discontinued** ⚠️ | cloud only |

## 4. Error tracking (Sentry-class) — verified

| Project | ★ | License | Deploy | Notes |
|---|---|---|---|---|
| **Sentry self-hosted** | 9.5k | **FSL-1.1** ⚠️ | ~20 containers, 8GB+ RAM | UX gold standard: **fingerprint grouping, unresolved/resolved/ignored workflow, frequency chart, breadcrumbs, alert rules, ownership** — but heavy + not OSI-OSS |
| **GlitchTip** | ~1k | MIT | **single Docker** (Django+Postgres+Redis) | **Accepts Sentry SDK protocol** — reuse sentry-shaped payloads; triage workflow; logs+uptime+performance; MCP integration; CLI |
| **Exceptionless** | 2.5k | Apache-2.0 | single container (trial) / full stack | realtime errors, notifications, per-event detail |
| **Errbit** | 4.3k | MIT | Rails+MongoDB | Airbrake-compatible; **fingerprint = hash(class+message+backtrace+env)** — simplest dedupe model |

## 5. Notifications / alerting — verified

| Project | ★ | License | Notes |
|---|---|---|---|
| **ntfy** | 33.2k | Apache-2.0/GPLv2 | HTTP PUT pub-sub; topics/attachments/priority/caching; Android+iOS+PWA; zero-config `curl -d "msg" ntfy.sh/topic` |
| **Gotify** | 15.7k | MIT | REST+WebSocket realtime; token-per-app; Android app |
| **Apprise** | 17.0k | BSD-2 | **One URL string per channel across 100+ services** (Slack/Discord/Telegram/ntfy/Gotify/email/webhooks…); tags, priorities, escalation, retries; `apprise-api` docker server |
| **Novu** | 39.5k | MIT (open core) | workflow engine, digest/batching, embeddable `<Inbox/>` + preferences |
| **Bark** | 8.9k | MIT | iOS push (APNs, self-host server) |
| **Uptime Kuma** | 90.0k | MIT | **90+ notification channels picker UI** — reference for a channel-picker |
| **Prometheus Alertmanager** | 8.6k | Apache-2.0 | **grouping/dedup/silencing/routing semantics** to copy |
| **Message Pusher** (songquanpeng) | — | — | one-api's own push-alert integration |

## 6. Request capture / API clients with format viewers (the "Bruno-like" UX)

| Project | ★ | License | What to copy |
|---|---|---|---|
| **Bruno** | 46.2k | MIT | Offline-first API client; **response tabs: Pretty(JSON)/Raw/Preview/Headers + Script Console; SSE/WebSocket tabs; copy-as-cURL; codegen** |
| **Hoppscotch** | 80.0k | MIT | PWA **self-hostable**; raw+preview for JSON/XML/HTML/image; copy-to-clipboard; download-as-file; **request-snippet generation (10+ languages)**; request history; WS/SSE realtime tabs |
| **mitmproxy/mitmweb** | 44.6k | MIT | **Flow list → master-detail inspector: request+response side-by-side, collapsible headers/cookies/body, syntax-highlighted pretty vs raw vs hex, search/filter, export** |
| **Hurl** | 19.1k | Apache-2.0 | **`--curl` export precedent**; `--pretty` JSON; JSONPath/XPath asserts |
| **HTTP Toolkit** | 3.6k | AGPL core | inline header docs/tooltips, content-type tags, error highlighting; Mockttp (TS intercepting proxy lib) |
| **Insomnia** | 39.9k | Apache-2.0 | Preview/JSON/Raw/Timeline/Headers + curl representation |
| **mockbin** (Kong) | 2.0k | MIT | self-hostable request-echo (request capture) |
| **RequestBin / Pipedream / Beeceptor** | — | — | unmaintained or not self-hostable ⚠️ |

## 7. Proxmox helper scripts (`community-scripts/ProxmoxVE`) — exhaustive enumeration

All pairs: `install/<app>-install.sh` + `ct/<app>.sh`, base URL `https://github.com/community-scripts/ProxmoxVE/blob/main/`.

- **Logging**: `loki-install.sh`(+alpine; Promtail removed EOL), `graylog-install.sh`, `openobserve-install.sh`, `signoz-install.sh`, `splunk-enterprise-install.sh`, `telegraf-install.sh`, `victoriametrics-install.sh` (with **optional VictoriaLogs add-on**).
  **Absent (verified by code search)**: vector, fluentd, logdy, quickwit, any ELK, fluent-bit, dozzle.
- **Monitoring (16)**: grafana(+alpine), prometheus(+alpine, alertmanager, blackbox-exporter, pve-exporter), victoriametrics, beszel, gatus(+alpine), uptimekuma, zabbix, checkmk, nagios, librenms, healthchecks, nezha, tianji; plus influxdb, smokeping, wazuh(SIEM), watchyourlan, pialert, domain-monitor, pulse, web-check, speedtest-tracker, myspeed, cockpit. Netdata = host addon only (`tools/addon/netdata.sh`).
- **LLM/AI**: `openwebui`, `lobehub`, `librechat`, `ollama`, `comfyui`, `qdrant`, `localagi`, `hermesagent`, `paperless-ai`, `paperless-gpt`, `libretranslate`, `firecrawl`, `jupyternotebook`, `kima-hub`.
  ⚠️ **`litellm` was ADDED Aug 2025 then REMOVED May 2026** (removal stub in ct/). **No langfuse, no phoenix, no ai-gateway scripts.**
- **Notifications**: `ntfy`(+alpine), `gotify`, `igotify`, `apprise-api`, `notifiarr`.
- **Error tracking**: **NONE** (no sentry/glitchtip/exceptionless — only unrelated `sentry_dsn` string in wallabag script).

## 8. Awesome-lists (read live)

- **awesome-selfhosted** (275k★) → defers log/monitor to **awesome-sysadmin** (Fluentd, Flume, GoAccess, Loki, reaction, rsyslog; metrics: Beats/Collectd/Grafana/Graphite/Statsd/Telegraf/VictoriaMetrics; monitoring: Alerta/Beszel/Cacti/cadvisor/Checkmk/Gatus/glances/Healthchecks/Icinga/Kener/KuvaszUptime/LibreNMS/Monit/Munin/Naemon/Nagios/NetXMS/Nezha/Observium/OneUptime/PCP/PHP Server Monitor/Prometheus/Riemann/rtop/ruptime/Scrutiny/Sensu/Status/Thruk/Uptime Kuma/Wazuh/Zabbix; **GenAI: Agenta, AnythingLLM, GoModel (Go AI gateway w/ cost+dashboard), Khoj, LibreChat, LLM Harbor, LLMKube, LocalAI, Ollama, Onyx, Open-WebUI, Vane**; Langfuse+Opik under IDE tools; GlitchTip under Ticketing).
- **tensorchord/Awesome-LLMOps** (5.9k★) — canonical (mlabonne's is 404). Observability: Helicone, OpenLLMetry, Langfuse, Azure OpenAI Logger, Deepchecks, Evidently, Giskard, whylogs, Maxim AI, onWatch, traceAI, Weco Observe. LLMOps: agenta, AgentField, Arize-Phoenix, Dify, **Glide (LLM routing)**, GPTCache, Laminar, LangWatch, LiteLLM, Literal AI, Lunary, **OpenLIT**, Opik, Pezzo, Portkey, **TensorZero (archived)**, ReliableGPT, Roundtable.
- **awesome-llm-observability**: apptension's is 404; live: ContextJet-ai/awesome-llm-observability (29★, new Jul 2026, 50+ tools + agent skills), agamm/awesome-ai-sre (78★), dyronrh/awesome-agentops-landscape (19★), mikeroyal/Self-Hosting-Guide (22.2k★).
- **awesome-ai-gateway**: **cuihuan/awesome-ai-gateway** (77★, ~100+ gateways, CI-star refresh, cost benchmarks, CVE matrix, tracks 9router). Also howardpen9/awesome-ai-api-proxy (50★), 12britz/awesome-ai-gateways (9★).
- **awesome-splunk-alternatives / awesome-openai-proxy**: don't exist; closest: logpai/awesome-log-analysis (800★, academic AIOps), crazy-canux/awesome-monitoring (730★), go-slog/awesome-slog (256★).

## 9. Gateways/proxies ranked by stars (competitor landscape)

bytedance/deer-flow 79.5k · BerriAI/litellm 55.8k · QuantumNous/new-api 44.6k · Kong/kong 43.9k · OmniRoute 42.4k · songquanpeng/one-api 36.3k · tashfeenahmed/freellmapi 18.0k · apache/apisix 17.0k · casdoor/casdoor 14.1k · Portkey-AI/gateway 12.7k · tensorzero 11.7k (archived) · coaidev/coai 9.3k · higress 9.0k · justlovemaki/AIClient2API 8.6k · lidge-jun/opencodex 8.3k · headroomlabs-ai/headroom 65.4k (token compression, RTK-adjacent) · CLIProxyAPI 46.4k · claude-code-router 36.5k · sub2api 36.1k · katanemo/plano 7.0k · tbphp/gpt-load 6.3k · looplj/axonhub 4.9k.

## 10. Final recommendation (revised with new evidence)

1. **Build the Messages tab in-app** (Phase 1): reuse `requestDetails` capture; add filters (provider/model/status/errorCategory/conversation/date); Bruno/Hoppscotch-style **format tabs (Pretty JSON / Raw / Headers / cURL / Markdown)**, copy & "save to log"; mitmweb-style master-detail; per-conversation thread view; OpenObserve-style quick histogram.
2. **Error inbox** (Phase 2): auto-collect non-success rows; **Sentry-style workflow (open/resolved/snoozed)**; fingerprint dedupe (Errbit model); one-click + **batch** AI analysis (existing analyze-error endpoint); optional webhook via **Apprise-style URL** (Slack/Discord/ntfy/Gotify out of the box); optional background **synthetic scan** with a cheap/local model (scheduler patterns already exist: backgroundTokenRefresh, srComboCleanup).
3. **Enrichment** (Phase 3): capture `x-project`/`x-app`/`x-9r-client` headers + client IP (custom-server.js already derives true IP); schema v3 migration.
4. **Optional external export** (Phase 4): **Langfuse** (MIT, docker compose) as the ship-out target via its API/SDK; or **OpenLIT** (Apache-2.0, one-command, incl. coding-agent hooks); or raw **OTLP** to any backend. Document Proxmox install paths (`openobserve-install.sh`, `signoz-install.sh`) for power users.

**License purity notes**: prefer MIT/Apache-2.0 for anything we vendor (Langfuse, Hoppscotch patterns, mitmweb patterns, Apprise, ntfy, GlitchTip schema). Avoid AGPL/SSPL/ELv2/FSL components inside our own app; AGPL is fine only for fully-separate sidecar services the user chooses to run.

## 11. References (all live 2026-08-07)

- github.com/langfuse/langfuse · github.com/Helicone/helicone · github.com/Arize-ai/phoenix (ELv2) · github.com/wandb/weave · github.com/AgentOps-AI/agentops · github.com/openlit/openlit · github.com/traceloop/openllmetry · github.com/Scale3-Labs/langtrace · github.com/langwatch/langwatch (ELv2) · github.com/truera/trulens · github.com/whylabs/langkit · github.com/promptfoo/promptfoo · github.com/confident-ai/deepeval · github.com/comet-ml/opik · github.com/Portkey-AI/gateway · github.com/cloudflare/bifrost · github.com/songquanpeng/one-api · github.com/QuantumNous/new-api · github.com/BerriAI/litellm · github.com/openobserve/openobserve · github.com/SigNoz/signoz · github.com/grafana/loki · github.com/VictoriaMetrics/VictoriaLogs · github.com/quickwit-oss/quickwit · github.com/Graylog2/graylog2-server · github.com/hyperdxio/hyperdx · github.com/highlight/highlight · github.com/logdyhq/logdy · github.com/tstack/lnav · github.com/docker/dzzle · github.com/getsentry/self-hosted · github.com/glitchtip/glitchtip · github.com/exceptionless/Exceptionless · github.com/errbit/errbit · github.com/binwiederhier/ntfy · github.com/gotify/server · github.com/caronc/apprise · github.com/novuhq/novu · github.com/usebruno/bruno · github.com/hoppscotch/hoppscotch · github.com/mitmproxy/mitmproxy · github.com/Orange-OpenSource/hurl · github.com/httptoolkit/httptoolkit · github.com/Kong/insomnia · github.com/community-scripts/ProxmoxVE · github.com/tensorchord/Awesome-LLMOps · github.com/cuihuan/awesome-ai-gateway · github.com/awesome-selfhosted/awesome-selfhosted · github.com/ContextJet-ai/awesome-llm-observability
