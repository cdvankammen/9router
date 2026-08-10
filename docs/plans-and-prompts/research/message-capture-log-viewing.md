# Research: Message Capture & Log-Viewing System for 9Router

**Date:** 2026-08-07
**Author:** GitHub Copilot agent
**Status:** active (research complete — implementation not started)
**Tags:** research, observability, message-capture, llm-logging, open-source

---

## 0. Executive Summary

9Router **already captures** every request/response pair (when Observability is enabled) in a `requestDetails` SQLite table with provider, model, connection, conversation, latency, tokens, request/response bodies, error category, and fallback-chain info. What's **missing** is the *viewing/organizing layer*: a dedicated Messages page with filters, format viewers (raw/pretty-JSON/markdown), per-conversation grouping, error triage inbox, and optional AI/notification hooks.

Open-source landscape: the closest turnkey systems are **Langfuse** (LLM-native traces/sessions/evals, MIT), **Helicone** (LLM gateway + observability, Apache-2.0), **OpenObserve** (logs/metrics/traces + AI observability, single Rust binary, AGPL), **SigNoz** (OTel-native logs/traces/LLM, 31.8k★), and the classic **Loki+Grafana** stack. The Proxmox helper-scripts repo (`community-scripts/ProxmoxVE`) has maintained installers for Loki, Graylog, OpenObserve, SigNoz, Grafana, Prometheus, ntfy/Gotify, Apprise, Open WebUI, Ollama, and LiteLLM — but **no** Sentry-class error tracker and **no** Langfuse-class LLM tracer.

**Recommendation:** build the in-app Messages tab first (copy-of-traffic + filters + formats + per-conversation view + error inbox — all doable with our existing SQLite layer), and keep Langfuse/OpenObserve as an optional "ship logs elsewhere" export path for later. Do not pull in a heavy external stack for the v1.

---

## 1. What We Already Have (audited 2026-08-07)

### 1.1 Capture (exists, works)
- **`requestDetails` table** (`src/lib/db/schema.js`) — one row per request/response pair:
  `id, timestamp, provider, model, connectionId, status, conversationId, data` (JSON blob).
  Indexes on timestamp/provider/model/connectionId/conversationId.
- **`usageHistory` table** — aggregate stats per call (tokens, cost, status, meta incl. taskType/errorCategory/fallbackChain).
- **Capture pipeline** — `src/lib/db/repos/requestDetailsRepo.js`: buffered writes (batch + interval flush), config from settings (`enableObservability`, `observabilityMaxRecords`, `observabilityMaxJsonSize` = 5KB default cap per field, header sanitization (Authorization/Cookie stripped), truncation guard.
- **Data captured per request** (in `requestDetails.data`):
  - client request (input messages, model, stream flag, extra_body)
  - provider request (post-translation)
  - provider response (raw)
  - client response (final, incl. thinking blocks)
  - latency (TTFT/total), tokens, status, errorCategory, pxpipe compression stats, conversationId, taskType, fallbackChain (attempts).

### 1.2 Viewing (partial)
- **Usage → Request Details tab** (`src/app/(dashboard)/dashboard/usage/components/RequestDetailsTab.js`):
  - table of captured requests, filters: provider / start-date / end-date / conversationId, pagination.
  - drawer per request with: meta grid (provider name, model, status, latency, tokens), **AI Error Analysis** button (POST `/api/analyze-error` → runs a configured model over the truncated error context), collapsible sections: 1. Client Request, 2. Provider Request (translated), 3. Provider Response (raw), 4. Client Response — all as pretty JSON `<pre>`.
- **Export**: `GET /api/export/requests?format=json|markdown` with provider/model/conversationId/status/date filters; markdown grouped by conversation, chronological.
- **Markdown auto-log**: `src/lib/markdownLog.js` → `~/.9router/logs/YYYY-MM-DD.md` (overwrite-snapshot every N min).
- **Console Log** page (`/dashboard/console-log`): streaming server log lines.

### 1.3 Gaps vs. the user's wishlist
| Wish | Status |
|---|---|
| See ALL messages in/out | Partial (Usage tab, paginated) — no dedicated top-level Messages page |
| Know agent/profile/location/project | ❌ not captured — no client-id/agent-id/ip/project fields |
| Filters (provider/model/status/date/conversation/error) | Partial (provider/date/conversation only in tab; export has more) |
| Organize per conversation/chat | Conversation filter exists; no conversation tree/thread view |
| Raw / pretty-JSON / other formats (Bruno-like) | JSON only; no raw-view toggle, no markdown/curl copy |
| Copy message to a log | ❌ no one-click copy/save-to-log |
| Error inbox (auto-collected errors to review) | ❌ no error-centric inbox; only per-row AI analysis button |
| Notify on errors (ntfy/gotify/email) | ❌ not built |
| Local-model synthetic scan of messages | ❌ not built (analyze-error is manual, on-demand) |

---

## 2. Open-Source Landscape (deep research)

### 2.1 LLM-native platforms (closest fit)
| Project | Stars | License | What it gives | Deploy |
|---|---|---|---|---|
| **Langfuse** | 32.7k | MIT (ee/ excluded) | LLM traces, sessions, prompt mgmt, LLM-as-judge evals, datasets, playground, cost tracking; OpenTelemetry-compatible ingest; SDKs JS/Python | docker compose (Postgres+ClickHouse) |
| **Helicone** | 6.0k | Apache-2.0 | AI Gateway (routing/fallbacks like 9Router!) + observability: sessions, traces, cost, playground; proxy logging via Cloudflare Workers | docker compose (Supabase+ClickHouse+Minio) |
| **LangSmith** | — | proprietary | Anthropic's own eval/observability SaaS | cloud only |
| **LiteLLM** | 28.7k | MIT | Gateway proxy with logging callbacks incl. Langfuse/S3/BigQuery; not a viewer itself | pip |

Key insight: **Helicone is architecturally the same thing as 9Router** (gateway + fallbacks + observability). Its log viewer UX (sessions tree, request drawer with raw/pretty, filters, cost) is exactly the "Bruno-like" experience the user wants. Langfuse is the better *viewer* if we only need to forward events.

### 2.2 General-purpose log/observability (Splunk-class)
| Project | Stars | License | Notes |
|---|---|---|---|
| **OpenObserve (O2)** | 20.6k | AGPL-3.0 | Single Rust binary; logs+metrics+traces+RUM+alerts+incidents+**AI observability (LLM traces/cost)**; SQL/PromQL; Parquet/S3 storage; ~140x cheaper than ES; free tier 50GB/day; has "AI assistant" writing queries |
| **SigNoz** | 31.8k | Apache-2.0 (community) | OTel-native; ClickHouse; logs+traces+metrics+LLM observability; exceptions; alerts; visual query builder |
| **Grafana + Loki** | 66k / 24k | AGPL | Classic; Loki struggles with high cardinality; needs Promtail/Alloy + Grafana; 3 components |
| **ELK (Elastic)** | — | Elastic License | Heavy; cost; setup complexity |
| **Graylog** | 13k | SSPL/AGPL parts | Java/JVM; syslog-oriented; GELF ingest |
| **Splunk Enterprise** | — | proprietary | expensive; has free container for dev |

### 2.3 Notifications / alerting (for the "notify me on errors" wish)
- **ntfy** (self-host push, ~MIT) — `community-scripts/ProxmoxVE` has active `ct/ntfy.sh`.
- **Gotify** (self-host push) — active script.
- **Apprise** — universal gateway (Telegram/Slack/Pushover/email…), script exists.
- Built-in option: 9Router could POST to any webhook (Discord/Slack/ntfy) with zero infra.

### 2.4 Error tracking (Sentry-class)
- **Sentry** self-host — heavy (Kafka/Postgres/ClickHouse/Redis); overkill.
- **GlitchTip** — lightweight Sentry alternative (Django); not in Proxmox repo.
- For 9Router's needs, an **in-app error inbox** (SQLite query on status != success, categorized) is simpler and better than any external tracker.

### 2.5 Proxmox helper-scripts findings (`community-scripts/ProxmoxVE` — the NEW repo, formerly tteck)
Researched via repo search (2026-08-07):
- Logging: **Loki** (active, Promtail removed EOL), **Graylog**, **OpenObserve** (active, arm64), **SigNoz** (systemd, new 2025-09), **Splunk Enterprise** (ct only). No ELK/Vector/Fluentd scripts.
- Monitoring: **Grafana** (active), **Prometheus** (+alertmanager, blackbox, pve-exporter), **Netdata** (host addon), **VictoriaMetrics**, **Beszel**, **Gatus**, **Telegraf/InfluxDB**, Zabbix, Checkmk, Nagios, LibreNMS, Healthchecks, Nezha, Tianji.
- LLM: **Open WebUI**, **Ollama**, **LiteLLM**, LobeHub, LibreChat, LocalAGI, Qdrant. **No Langfuse / no LangSmith / no LLM-tracing script** — gap.
- Notifications: **ntfy** (active, new alpine variant), **Gotify** (active, v3 migration), **iGotify**, **Apprise API**, Notifiarr.
- Error tracking: **none** (no Sentry/GlitchTip) — gap; nearest is Wazuh (SIEM).

URLs: `https://github.com/community-scripts/ProxmoxVE/blob/main/install/<name>-install.sh` (e.g. `loki-install.sh`, `openobserve-install.sh`, `signoz-install.sh`, `ntfy-install.sh`).

---

## 3. Answers to Each Question

1. **"Do we have a page to see messages?"** — Partially. Usage → Request Details tab shows captured requests with a drawer; there is no dedicated top-level "Messages" page. Console Log streams server logs only.
2. **"Know what agents/profiles/locations?"** — Not captured today. We can add: `clientId` (from `x-9r-client`/user-agent/app header), `projectId` (OpenRouter-style `x-project` header or path), `ip` (we already derive client IP in custom-server.js!), `connectionId` (already stored). Feasible with a schema v3 migration + capture in chatCore.
3. **"Filter/track/organize?"** — Filters exist (provider/date/conversation). Missing: status/error-category/model filters in the tab UI, saved views, per-conversation thread view, star/tag.
4. **"Address issues from messages?"** — Partial: per-error "Analyze error with AI" button exists (uses configured model, e.g. oc/mimo-v2.5-free). Missing: batch analysis, error inbox, "mark resolved" state.
5. **"Know projects?"** — No project field today. OpenRouter-style `HTTP_X_PROJECT` header is the standard; easy to add.
6. **"Different formats (Bruno-like)?"** — JSON pretty only. Add: raw toggle, pretty/compact JSON, markdown rendering, cURL copy, SSE/stream reconstruction. This is the single most impactful UX upgrade.
7. **"Chat logs organized by chat?"** — Conversation grouping exists in markdown export only; need a conversation tree in the UI (Langfuse sessions / Helicone sessions as reference).
8. **"How would we do it? copies of everything + organize + filters + easy"** — See §4 plan. We already copy everything; the work is UI + indexes + small schema additions.
9. **"Use our models to analyze messages/errors (single or batch)?"** — analyze-error endpoint exists; extend to batch mode (POST array of detail ids) and to message-level analysis (not just errors).
10. **"Small local model scanning + notifications?"** — Feasible: a background ticker (like srComboCleanup/backgroundTokenRefresh patterns) that runs a cheap/local model over recent failed requests, appends findings to an `errorInbox` table, and optionally fires webhooks (ntfy/Gotify/Discord/Slack). All infrastructure patterns already exist in the codebase.
11. **"Error list/temp log to click and review original error?"** — The error inbox idea; easy with SQLite + new page.
12. **"Open source systems like Splunk?"** — Yes: Langfuse (LLM-native), OpenObserve, SigNoz, Loki+Grafana, Graylog (all above, with stars/licenses/deploy notes). Helicone is the closest analog to 9Router itself.
13. **"Proxmox helper scripts (new repo)?"** — Researched; maintainers' scripts for Loki/OpenObserve/SigNoz/ntfy/etc. exist; no LLM-tracer or error-tracker scripts (gaps we'd fill ourselves anyway).

---

## 4. Proposed Implementation Plan (phased)

### Phase 1 — Messages page (in-app, ~"just works")
- **Sidebar tab**: "Messages" (icon `chat`/`inbox`), route `/dashboard/messages`.
- **Data**: reuse `requestDetailsRepo` + add missing filters: `status`, `errorCategory`, `model`, `hasError`.
- **List**: reverse-chron table with provider/model/status badge (color-coded)/conversationId/tokens/latency/errorCategory; pagination.
- **Drawer** (upgrade RequestDetailsTab's): format tabs — **Raw | Pretty JSON | Markdown | cURL** (Bruno-like); copy-to-clipboard per section; "Copy to Log" button (appends to `~/.9router/logs/saved/…` or a `savedMessages` table); per-conversation siblings navigation.
- **Conversation view**: group by conversationId → thread/tree of request/response turns (Langfuse-sessions style), filterable.

### Phase 2 — Error inbox + AI
- `errorInbox` table: id, detailId, category, message summary, status (open/resolved/snoozed), aiAnalysis, createdAt, resolvedAt.
- Auto-populate from failed requests; page with open/resolved toggle; one-click "Analyze with AI" (existing endpoint), batch "Analyze all".
- Optional: **notification hook** — on new categorized error, POST webhook (settings: URL + optional template); ntfy/Gotify/Discord/Slack compatible with zero extra services.

### Phase 3 — Enrichment (agents/projects/locations)
- Schema v3: `clientId`, `projectId`, `ip` columns on `requestDetails` (and maybe `usageHistory.meta`).
- Capture: `x-9r-client`/`x-project`/`x-app` headers (OpenRouter-compatible) + client IP from the TCP-socket logic in `custom-server.js` (already strips spoofed XFF).
- **Synthetic scan (optional toggle)**: background ticker (reuse scheduler pattern) → for failed requests in window, run configured cheap model → write summary + suggested fix to inbox; interval + model settings (off by default).

### Phase 4 — Optional external export (ship-out)
- Settings: "Forward captured requests to Langfuse (self-hosted)" — POST traces to Langfuse API (they accept OpenAI-style events via SDK/API; MIT, docker compose) — or generic webhook to OpenObserve/SigNoz OTLP. This gives the user the full power-tools (dashboards/alerts/evals) without building them.
- Document Proxmox install paths for Langfuse-less stack: `install/openobserve-install.sh` or `install/signoz-install.sh` on a LXC if self-hosting the viewer.

### Cost/benefit guidance
- Phase 1 + 2 are ~all in-app, reuse existing capture → highest value per effort.
- Phase 3 headers/IP are cheap; synthetic scan is a setting-gated background task.
- Phase 4 optional; Langfuse recommended (MIT, LLM-native, docker compose) if the user wants production-grade analytics without writing more UI.

---

## 5. References

- Langfuse — https://github.com/langfuse/langfuse (MIT; traces/sessions/evals/playground; OTel ingest)
- Helicone — https://github.com/Helicone/helicone (Apache-2.0; AI gateway + LLM observability; sessions/playground)
- OpenObserve — https://github.com/openobserve/openobserve (AGPL; single Rust binary; logs/metrics/traces + AI observability; SQL/PromQL)
- SigNoz — https://github.com/SigNoz/signoz (Apache-2.0; OTel-native; ClickHouse; LLM observability; exceptions)
- Grafana Loki — https://grafana.com/oss/loki/ (AGPL; log aggregation; label-indexed)
- ntfy — https://github.com/binwiederhier/ntfy (MIT; self-host push)
- Gotify — https://github.com/gotify/server (MIT; self-host push)
- Proxmox helper scripts (new repo) — https://github.com/community-scripts/ProxmoxVE
  - `install/loki-install.sh`, `install/openobserve-install.sh`, `install/signoz-install.sh`, `install/graylog-install.sh`, `install/ntfy-install.sh`, `install/gotify-install.sh`, `install/openwebui-install.sh`, `install/ollama-install.sh`, `install/litellm-install.sh`
- UX references: NN/g Progressive Disclosure — https://www.nngroup.com/articles/progressive-disclosure/ ; IxDF Gestalt Principles (proximity/common region) — https://www.interaction-design.org/literature/topics/gestalt-principles
