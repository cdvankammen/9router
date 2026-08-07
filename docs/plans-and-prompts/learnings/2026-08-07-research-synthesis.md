# Research Synthesis: Message Capture, Log Viewing & Error Inbox for 9Router

**Date:** 2026-08-07
**Author:** GitHub Copilot agent (synthesis of v1–v4 research passes)
**Status:** active (research complete — implementation not started)
**Tags:** learning, synthesis, observability, message-capture, error-inbox, roadmap

**Sources synthesized:** `research/message-capture-log-viewing.md` (v1) · `research/message-capture-deep-research-v2.md` (v2) · `research/message-capture-obscure-projects-v3.md` (v3) · `research/message-capture-v4-deep-pass.md` (v4). All project stars/licenses were verified live on GitHub 2026-08-07 in the source passes.
*Revision 2 (2026-08-07): tightened to the 2,000–3,500-word spec; all content and citations preserved.*

---

## 0. Executive Summary

Four passes (v1 survey → v2 exhaustive → v3 obscure/low-star → v4 no-limits subagents) covered **300+ projects, 43 papers, community demand signals, and framework storage patterns**. Convergent conclusion:

1. **9Router already owns the capture layer** (`requestDetails` table, buffered writer, header sanitization, error categories, fallback chains — v1 §1); what's missing is the **viewing/organizing layer**: Messages page, error inbox, notifications, search.
2. **Nobody owns this product in OSS** — no project groups raw OpenAI-compatible proxy traffic into conversation trees with wire-level fidelity, because only a gateway that *is* the proxy can do it without MITM hacks (v3 §9, v4 §4). **Build in-app first**, copying proven UX (Bruno/Hoppscotch tabs, mitmweb master-detail, Sentry triage, claude-code-trace 3-panel), with Langfuse/OpenLIT/OTLP as an optional ship-out later (v1 §0, v2 §0).
3. **Security is first-class**: log content is untrusted input for any analyzer (v4 — "When AIOps Become AI Oops"), prompt leakage is a documented attack class; PII redaction + zero-retention are demanded (v4 privacy papers).

---

## 1. What We Learned

### 1.1 The Landscape (by category)

**LLM observability platforms** (v1 §2.1, v2 §1, v4 §1): Langfuse (32.7k★, MIT — traces/sessions/evals; best "ship-out" target), Helicone (6.0k★, Apache-2.0 — **9Router's twin**: gateway + fallbacks + observability; now in maintenance mode after Mintlify acquisition), OpenLIT (2.7k★ — exceptions dashboard + coding-agent hooks), AgentOps (session replay), Opik, promptfoo/DeepEval (evals). Skip Arize Phoenix/LangWatch (ELv2). Langfuse = viewer to *forward to*; Helicone proves gateway+viewer is our product shape (v2 §1).

**AI gateways with built-in logging** (v2 §2, v4 §2): one-api (36.3k★) / new-api (44.6k★) are the closest "router with per-request log viewer" products — their flat log page (request → response, status, model, cost) is the baseline to beat. Long-tail (~40 projects, v4 §2): **ccglass** (665★, MIT — per-message token/cost viewer, top copy), CPA-Manager-Plus (account-health panel), CrossLink (configured-vs-actual routing stats), TokenHub (project attribution + RBAC + audit), RelayPlane (runaway-loop audit + system-prompt view), OpenGateLLM (no-log mode).

**Log management** (v1 §2.2, v2 §3): OpenObserve (20.6k★, AGPL — single Rust binary, logs+metrics+traces+**AI/LLM observability**, ~140× cheaper than Elastic), SigNoz (31.8k★, Apache-2.0 — OTel-native + exceptions), Loki (28.7k★), HyperDX (9.8k★, MIT — property search `level:err`, webhook alerts), Highlight.io (**customizable grouping rules**), lnav (JSON-lines pretty-print + histogram), Dozzle (live-tail SSE). License flags: Graylog SSPL, ELK Elastic-2.0, Axiom self-host discontinued.

**Error tracking** (v1 §2.4, v2 §4): Sentry self-host (9.5k★, FSL-1.1 — UX gold standard: fingerprint grouping, resolved/ignored workflow, breadcrumbs; ~20 containers, too heavy), GlitchTip (MIT — **single container, Sentry-protocol compatible**, MCP integration), Errbit (4.3k★ — **fingerprint = hash(class+message+backtrace)**, simplest dedupe model). Verdict: an in-app SQLite error inbox beats external trackers (v1 §2.4).

**Notifications** (v1 §2.3, v2 §5): ntfy (33.2k★), Gotify (15.7k★, MIT), **Apprise** (17k★ — one URL per channel, 100+ services), Novu (digest/batching), Uptime Kuma (90k★ — channel-picker UI reference), Prometheus Alertmanager (grouping/dedup/silencing semantics).

**Request-capture UX / API clients** (v2 §6): Bruno (46.2k★ — **Pretty/Raw/Preview/Headers tabs + copy-as-cURL**), Hoppscotch (80k★ — codegen in 10+ languages), mitmweb (44.6k★ — **flow list → master-detail inspector**, pretty vs raw vs hex), Hurl (`--curl` export).

### 1.2 The Obscure / Low-Star Gems (v3 — 20–4,400★ targets)

- **cc-viewer** (1,058★, MIT) — wire-level capture + per-conversation dirs + **request body-diff** — closest analog to our Messages page.
- **tokentap** (811★, MIT) — prompts auto-saved as **Markdown AND raw JSON** + context gauge.
- **CliRelay** (893★, MIT) — "a mini-9Router": coding-agent gateway with web console + request logs + spend quotas.
- **claude-code-trace** (362★, MIT) — **canonical 3-panel layout** (session tree → turn list → detail) + SSE live tail; codex-trace (76★) same; claude-code-viewer (1,267★) adds live monitoring.
- **chatgpt-json-tree-viewer** (56★, MIT) — conversation as **branching tree** — the "organized by chat" ask, verbatim.
- **recensa** (69★) / **claudex** (92★) — **SQLite FTS5 search** + snippet highlighting + "god-view" noise folding; claudex adds an **MCP-exposable history API**.
- **token-dashboard** (654★, MIT) — Sessions tab, turn-by-turn view, per-turn tokens/tool calls — ready-made spec.
- **swob** (24★, Apache-2.0) — "Git graph for AI conversations": lineage graph, **Context Inspector**, **provenance labels** (`reported`/`estimated`/`unavailable`).
- **teley** (61★, Apache-2.0) — **LCS side-by-side trace comparison**; claude-trace-replay (265★) — session compare.
- **cloud-sre-agent** (49★, MIT) — AI agent doing log monitoring + **RCA automatically** — the synthetic-scan dream; engineering-notebook (247★) — LLM daily digests.
- **claude-pulse** (243★, MIT) — FTS everywhere + **budgets + phone alerts via ntfy**.
- **agent-prism** (379★, MIT) — MIT React trace-tree/timeline components (embeddable); RagaAI-Catalyst (16.1k★) — execution-graph view.
- Tiny proxies: llm-proxy (27★), Spanlens (11★), SectorFlux (7★) — minimal proxy-with-logs architectures.

### 1.3 Academic Evidence (v4 §3 — 43 papers, live-verified)

- **Routing reliability**: **ContinuityBench** (2607.15899) — naive stateless failover *silently drops conversation history*; its **CPR/CLO metrics** validate our combo/account fallback. **GateScope** (2604.21083) — "was the billed model the served model?" **Evidence-Bound Provenance** (2606.22560) — record WHO decided and WHY. **SEAR** (2603.26728) — SQL-queryable ~100-attribute schema blueprint. RouterEval (2503.10657) — a capable router beats the best single model.
- **Log/error analysis**: TAMO (2504.20462) — give the analyzer **tools**, not one giant prompt. Microsoft RCA (2403.04123) — package the full trace (request → route chain → upstream → error). **"Stalled, Biased, Confused"** (2601.22208) — LLM RCA stalls/biases → **confidence signals, never auto-close without human confirmation**. KRONE (2602.07303) — hierarchical failure clustering beats flat lists. AIOps surveys (2406.11213, 2507.12472) — detection → RCA → mitigation → postmortem pipeline; **self-hosted gateways with real labeled traces are a field gap**.
- **Privacy**: **"When AIOps Become AI Oops"** (2508.06394) — adversaries manipulate telemetry; **log content is untrusted input**. Prompt-leakage attacks (2502.12630, 2404.16251, 2605.18133). **Whistledown** (2511.13319) — PII redaction tiers + "don't log this turn". CacheProbe (2605.30613) — prompt-cache leaks metadata. Traffic fingerprinting (2510.07176) → local access-controlled storage. Routing metadata leaks even encrypted (2604.15728).
- **HCI/UX**: CHI "Design Principles for LLM Observability" — visibility, context preservation, actionable traces, lifecycle coverage. Watson (ASE 2024) — capture agent *reasoning* → log router reasoning (why this model/combo). **Microsoft multi-agent debugging study** (2503.02068) — *reviewing long agent conversations to localize errors is the #1 developer pain*. Fraud/AML compliance (2605.11232) — immutable capture = auditability.

### 1.4 Community Demand Signals (v4 §4)

- **HN** (Algolia, live): "llm logging" (1,172 stories) — *"the same ticket that gets you to install Sentry — see what's happening in production and get alerted"*; demand for P95/P99 latency, timeouts, per-prompt error rates. "ai gateway" (474 stories) — LiteLLM frustration loudest; provider API churn = #1 maintenance burden. Cross-cutting: **nobody has a good story for "see the actual failed request payload + error analysis" in a self-hosted gateway.**
- **GitHub issues** (live-verified): open-webui analytics #21675 (**81 comments — biggest demand in the repo**); new-api stream-error classification #5222 + **terminal failures recorded as successful EOF #6594** (silent error misclassification — directly relevant to our error inbox); litellm payload-capture/log-viewing complaints (#28859/#34099); one-api "detailed request logs like APIPark?" (#2414).
- **Reddit**: ⚠️ IP-blocked (403); "can't see where my tokens went" theme is anecdotal; search URLs in v4 §4.
- **Ecosystem health**: Helicone maintenance mode (Mintlify 2026-03); TensorZero archived June 2026; Phoenix/LangWatch ELv2; LiteLLM supply-chain incident; ProxmoxVE has **no Langfuse / no error-tracker scripts** (v2 §7).

### 1.5 Storage/Architecture Patterns from Agent Frameworks (v4 §5)

Five patterns: snapshot blobs (LangGraph/CrewAI/AG2), relational rows (Dify/Open WebUI/LibreChat/Cherry Studio), append JSONL (AutoGen/chatgpt-next-web), OTel spans (Vercel AI SDK/Pydantic/Mastra), hybrid. Verdict: **hybrid relational** — thin searchable `messages` rows + fat JSON bodies (see §4).

---

## 2. The Confirmed Market Gap

Every pass independently converged on the same gap:

| Pass | Evidence |
|---|---|
| v1 §0 | Proxmox helper-scripts ecosystem has **no Sentry-class error tracker and no Langfuse-class LLM tracer** |
| v2 §2 | one-api/new-api have flat per-request log pages but **no conversation trees, no format viewers, no AI analysis** — "then we exceed it with format tabs + AI analysis + error inbox" |
| v3 §9 | **"No existing project groups raw OpenAI-compatible proxy traffic into conversation trees with wire-level fidelity."** Others need MITM proxies or client hooks; 9Router IS the proxy — capture at source. |
| v4 §4 | HN: "nobody has a good story for 'see the actual failed request payload + error analysis' in a self-hosted gateway"; open-webui = 81-comment demand; new-api EOF misclassification; AIOps survey: "self-hosted gateways generating real labeled production traces are a field gap" |

**The gap in one sentence:** *a self-hosted, OpenAI-compatible gateway that shows every message in/out — organized per conversation, wire-faithful, searchable, with a Sentry-style error inbox and AI-assisted triage — does not exist in OSS.* 9Router sits at that exact intersection (gateway + capture + translator + fallback chains + SQLite), so it can build it in-app with zero new infra.

---

## 3. What 9Router Should Copy (deduplicated across v1–v4, ranked by impact × effort)

**Impact:** H/M/L · **Effort:** H/M/L (relative to our existing SQLite + React stack).

| # | Copy item | Source (file → project/paper) | Impact | Effort |
|---|---|---|---|---|
| 1 | Per-message token/cost log viewer | v4 §6.1 → ccglass; v2 §2 → one-api/new-api; v3 §5 → token-dashboard | H | M |
| 2 | Format tabs: Pretty JSON / Raw / Headers / cURL / Markdown + copy | v2 §6 → Bruno, Hoppscotch, Insomnia, mitmweb; v1 §3 Q6; v3 §1 → tokentap | H | M |
| 3 | 3-panel master-detail: session tree → turn list → detail | v3 §2 → claude-code-trace, codex-trace; v2 §6 → mitmweb; v4 §3 → CHI principles | H | M |
| 4 | Conversation tree/thread view + per-conversation grouping | v3 §1 → cc-viewer; v3 §2 → clog; v3 §3 → chatgpt-json-tree-viewer; v1 §1.3 Q7 → Langfuse/Helicone sessions | H | M |
| 5 | Sentry-style error inbox: open/resolved/snoozed + fingerprint dedup | v1 §4 Phase 2; v2 §4 → Sentry, GlitchTip, Errbit; v4 §1B → error-monitoring-agent, latitude-llm | H | M |
| 6 | Error categorization + hierarchical failure clustering | v1 (errorCategory exists); v4 §3 → KRONE, AIOps survey | H | L |
| 7 | Filters + property search + quick histogram | v2 §3 → HyperDX (`level:err`), OpenObserve histogram; v1 §1.3 Q3; v4 §1A → GoModel | H | M |
| 8 | FTS5 full-text search + snippets + scoped search | v3 §4 → recensa, claudex, AI-Conversation-Viewer; v3 §3 → osteele; v2 §3 → lnav | H | M |
| 9 | Apprise-style notification URLs + Alertmanager dedup/grouping | v2 §5 → Apprise, ntfy, Gotify, Uptime Kuma, Alertmanager; v1 §4 Phase 2; v3 §5 → claude-pulse | M | M |
| 10 | Tool-assisted AI analysis (TAMO) + MCP over trace store | v4 §3 → TAMO, Microsoft RCA; v4 §1E → langfuse-mcp, opik-mcp; v3 §4 → claudex; v1 §1.2 | H | M |
| 11 | Body-diff between consecutive requests | v3 §1 → cc-viewer; v4 §3 → Watson | M | M |
| 12 | Routing-reason telemetry: fallback viz + CPR/CLO + configured-vs-actual + account health | v4 §3 → ContinuityBench, GateScope, Provenance; v4 §2 → CrossLink, CPA-Manager-Plus | H | M |
| 13 | Honest provenance labels (reported/estimated/unavailable) | v3 §4 → swob, claude-lens; v3 §5 → tokenscope; v4 §1C → agentacct | M | L |
| 14 | Session compare (LCS diff) + waterfall | v3 §6 → teley; v3 §2 → claude-trace-replay | M | M |
| 15 | Single-file HTML / JSONL export + copy-as-cURL | v3 §3 → scrapemychats, masonc15; v3 §2 → wesm; v2 §6 → Hurl; v1 §1.2 (export exists) | M | L |
| 16 | Real-time live tail (SSE) of in-flight sessions | v3 §2 → claude-code-trace, pi-agent-dashboard, claude-code-viewer; v2 §3 → Dozzle | M | M |
| 17 | LLM-digest / daily summary of a conversation | v3 §4 → engineering-notebook; v4 §3 → LLM-LADE | M | M |
| 18 | Context-window / token-pressure gauge | v3 §1 → tokentap; v3 §2 → claude-compaction-viewer; v3 §7 → claude-devtools | M | L |
| 19 | Ship-out: Langfuse / OpenLIT / OTLP webhook export | v1 §4 Phase 4; v2 §1 → Langfuse, OpenLIT; v2 §3 → OpenLLMetry; v4 §2 → APIPark | M | M |
| 20 | Privacy suite: redaction, no-log mode, zero-retention, sanitize-before-analyze | v4 §3 → Whistledown, AI-Oops, CacheProbe; v4 §2 → OpenGateLLM, voidllm, nullsink | H | M |

**License guardrails (v2 §0/§10, v4 §2):** prefer MIT/Apache-2.0 for anything vendored (Langfuse, Hoppscotch, mitmweb, Apprise, ntfy, GlitchTip schema, agent-prism). Avoid AGPL/SSPL/ELv2/FSL in-app (Phoenix, LangWatch, Sentry self-host, Graylog, octopus, nullsink); AGPL is OK only as a separate sidecar the user chooses to run.

---

## 4. The Definitive Schema Recommendation

Restated from v4 §5 (agent-framework storage synthesis) as the design for 9Router:

**Hybrid relational pattern** — thin searchable message rows + fat JSON bodies:

```
messages table (new):
  id               TEXT PK
  session_id       TEXT        -- = conversationId (grouping key)
  request_id       TEXT FK → requestDetails.id  -- fat wire-faithful body lives there
  role             TEXT        -- user/assistant/tool/system/thinking
  model            TEXT
  parent_message_id TEXT NULL  -- tree/fork support
  status           TEXT        -- done/error/partial/cancelled
  tokens           INTEGER
  latency_ms       INTEGER
  created_at       TEXT        -- indexed (session_id, created_at)
```

Design rationale:
- **Fat bodies stay in `requestDetails` JSON** (LangGraph-blob style — preserves wire fidelity incl. thinking blocks, translated payloads, fallback attempts); the message row stays projection-thin and searchable.
- **Relational rows** (Dify/Open WebUI/LibreChat/Cherry Studio) give search, joins, aggregation, export — what JSONL blobs can't do.
- **`parent_message_id`** gives free forking/branching (chatgpt-json-tree-viewer tree view; smithers rewind/fork); per-message feedback (Dify) attaches here; per-session token/cost aggregation (Open WebUI) falls out of the join.
- **Cherry Studio's `VACUUM INTO`** for zero-downtime backups; OTel spans only if cross-session traces are ever needed (not for v1).
- Align column names with **SEAR** (v4 §3 #12) so the store stays SQL-queryable and can feed external tooling.

---

## 5. Security / Privacy Obligations

The research surfaced a concrete obligation list — each maps to a design decision:

1. **Log content is untrusted input** (v4 — "When AIOps Become AI Oops", 2508.06394): upstream responses can carry prompt injections; **sanitize before AI analysis or rendering**; the analyzer never acts on captured-content instructions.
2. **System prompts are protected secrets** (v4 — 2502.12630, 2404.16251): access-controlled, excluded from external export by default.
3. **PII redaction tiers + "don't log this turn"** (v4 — Whistledown 2511.13319): per-request redaction (`x-9r-privacy: redact` header) + opt-out flag skipping capture entirely.
4. **Sanitize before rendering** (v4 — 2605.18133): escape HTML; no markdown-render of untrusted content by default.
5. **Local, access-controlled storage** (v4 — 2510.07176, 2604.15728): traffic stays in local SQLite under `~/.9router`; no third-party shipping without explicit opt-in.
6. **Prompt-cache metadata leaks** (v4 — CacheProbe 2605.30613): don't display cache-hit provenance usable for cross-tenant inference.
7. **Zero-retention / no-log mode** (v4 §2 — OpenGateLLM, voidllm, nullsink): capture-nothing toggle + retention janitor (mirrors `observabilityMaxRecords`, v1 §1.1).
8. **Extend existing header sanitization** (v1 §1.1 — Authorization/Cookie stripped) to `x-api-key` and custom auth headers in bodies.
9. **Confidence signals, no auto-close** (v4 — "Stalled, Biased, Confused" 2601.22208): AI output is advisory; inbox items need human confirmation to close; analysis carries provenance labels (v3 §4 swob).
10. **Never auto-send captured prompts to external models** (v2 §0, v4 §3 #34): synthetic scan defaults to a local/self-hosted model; external analysis is explicit per-user opt-in.

---

## 6. Feature Roadmap — Messages Page + Error Inbox (ranked, with justification)

Priority ordering = impact × effort (P1 = ship first; reuse of existing capture makes P1 cheap).

| # | Feature | Justification (file → project/paper) | Why now |
|---|---|---|---|
| 1 | **Messages page: 3-panel master-detail** (session tree → turn list → detail drawer, SSE live tail) | v3 §2 → claude-code-trace, codex-trace; v2 §6 → mitmweb; v4 §3 → Microsoft debugging study | Highest-impact missing layer; UI over existing capture |
| 2 | **Format tabs: Raw / Pretty JSON / Markdown / cURL + copy per section** | v2 §6 → Bruno, Hoppscotch, Insomnia; v1 §3 Q6; v3 §1 → tokentap | v1: "single most impactful UX upgrade" |
| 3 | **Filters: provider/model/status/errorCategory/date/conversation + badges + quick histogram** | v1 §1.3; v2 §3 → HyperDX, OpenObserve histogram; v4 §1A → GoModel | Completes the find loop |
| 4 | **Conversation tree/thread view** (branching via `parent_message_id`) | v3 §3 → chatgpt-json-tree-viewer; v3 §1 → cc-viewer; v3 §2 → clog; v1 §1.3 Q7 | Directly answers "chat logs organized by chat" |
| 5 | **Error inbox: Sentry-style triage (open/resolved/snoozed), fingerprint dedup, category clusters** | v1 §4 Phase 2; v2 §4 → Sentry/GlitchTip/Errbit; v4 §1B → error-monitoring-agent; v4 §3 → KRONE | Demand proven: new-api #6594, open-webui #21675 |
| 6 | **Batch AI analysis with tool access** (analyze-error → batch + MCP over the store) | v1 §4 Phase 2; v4 §3 → TAMO, Microsoft RCA; v4 §1E → langfuse-mcp; v3 §4 → claudex; guardrails: 2601.22208, 2508.06394 | Multiplies value of everything; 50% built |
| 7 | **Webhook notifications: Apprise-style URL + Alertmanager dedup/grouping** | v2 §5 → Apprise/ntfy/Gotify/Alertmanager; v3 §5 → claude-pulse | Zero-infra; the "notify me on errors" wish |
| 8 | **FTS5 full-text search + snippets + scoped search** | v3 §4 → recensa, claudex; v3 §3 → AI-Conversation-Viewer, osteele; v2 §3 → lnav | FTS5 is built into SQLite; cheap |
| 9 | **Per-message token/cost + per-session aggregation + provenance labels** | v4 §1C → ccglass, tokencost, agentacct; v3 §5 → token-dashboard; v3 §4 → swob | Matches "estimates, never invoices" ethos |
| 10 | **Body-diff between consecutive requests in a conversation** | v3 §1 → cc-viewer; v4 §3 → Watson | Nobody in our category has it |
| 11 | **Enrichment: clientId/projectId/ip capture** (`x-9r-client`/`x-project` headers, TCP IP) | v1 §4 Phase 3; v2 §2 → open-webui #28230; v4 §2 → TokenHub | Answers "which agent/project/location" |
| 12 | Routing-reason telemetry: fallback viz + CPR/CLO + configured-vs-actual + account health | v4 §3 → ContinuityBench, GateScope, Provenance; v4 §2 → CrossLink, CPA-Manager-Plus | Makes fallback machinery visible |
| 13 | **Synthetic scan (background, local-model default, off by default)** | v3 §8 → cloud-sre-agent, engineering-notebook; v4 §3 → AIOps survey; privacy: #34 | The "small local model scanning" wish; reuse scheduler patterns |
| 14 | **Export & ship-out: JSON/markdown/HTML/cURL + optional Langfuse/OpenLIT/OTLP webhook** | v1 §4 Phase 4; v3 §3 → scrapemychats; v3 §2 → wesm; v2 §1 → Langfuse/OpenLIT; v4 §2 → APIPark | Export exists (v1 §1.2); power-user path |
| 15 | **Privacy suite: redaction tiers, no-log mode, zero-retention janitor, sanitize-before-analyze/render** | v4 §3 → Whistledown, AI-Oops, CacheProbe, prompt-leakage papers; v4 §2 → OpenGateLLM, voidllm, nullsink; v1 §1.1 | §5 obligations — non-negotiable before AI analysis ships |

---

## 7. What We Still Don't Know (open questions)

1. **Reddit signals** — IP-blocked (403); known themes ("can't see where my tokens went") are anecdotal. Search URLs in v4 §4 need a manual pass.
2. **OTel standard churn** — OTel-vs-OpenInference span-kind incompatibility, unstable gen_ai semconv (HN); unclear which survive for a future OTLP ship-out.
3. **SEAR schema mapping** — ~100 typed attributes are a blueprint, not a drop-in; mapping effort is unestimated.
4. **Ship-out without Docker** — Langfuse/OpenLIT/OpenObserve want docker compose; user prefers native tooling. Is a plain webhook/OTLP path enough?
5. **9Router's own silent-failure rate** — new-api's EOF-success misclassification (#6594) suggests auditing our executors first.
6. **Labeled failure corpus** — AIOps surveys recommend an eval set of real failure traces; none exist yet (v4 — ALPHA).
7. **Analyzer model reliability** — LLM RCA stalls/biases (2601.22208), judges are imperfect (2510.20721); confidence-signal design untested in our domain.
8. **Header standard adoption** — `x-project` is OpenRouter-standard but adoption is spotty; unknown until enrichment ships.
9. **License/ecosystem churn** — Helicone (maintenance), TensorZero (archived), Phoenix/LangWatch (ELv2), LiteLLM supply-chain incident; re-verify the "copy ideas, don't depend" list before any integration.
10. **Agent-session format fragmentation** — 8+ agent CLIs store sessions incompatibly (v3 §2); importing foreign transcripts means unbounded normalization work.
11. **Storage growth economics** — wire-faithful capture grows unboundedly; retention/rollup strategy (raw N days → aggregated forever) is unmodeled.
12. **MCP-over-traces demand** — langfuse-mcp/opik-mcp/claudex prove the pattern; demand for agent-tool queries of 9Router traces is a product guess.

---

## 8. Bottom Line

Build **in-app, in this order**: Messages page (3-panel + format tabs + filters + conversation tree) → error inbox (triage + fingerprint dedup) → batch AI analysis with tools → notifications → FTS5 search → per-message cost → routing-reason telemetry — wrapped in the privacy suite from day one. External viewers (Langfuse/OpenLIT) are optional Phase-4 ship-out. Capture is already built; the moat is 9Router being the only OSS gateway offering wire-faithful, conversation-organized, error-triage-native message viewing without MITM tricks (v3 §9).
