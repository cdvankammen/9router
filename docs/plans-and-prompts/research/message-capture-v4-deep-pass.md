# Research v4: Deep-Pagination + Studies + Community + Frameworks + Gateway Catalog

**Date:** 2026-08-07 (fourth pass — the "no limits" pass)
**Author:** GitHub Copilot agent (5 subagents with retries after provider failures)
**Status:** active (research only — no code changed)
**Tags:** research, deep-pagination, academic, community, frameworks, gateway-catalog

> User directive: *"use subagents again to actually do better job to more thoroughly find all the projects… you don't have to read in depth all 5000 but do better to read all of the options (no limit)… frameworks, studies, categories… forums and other repositories… in addition and on top of the research you just did… also a good reason to use subagents is… when something fails from the provider we are able to recover easier."*
>
> Subagent reliability note: 5 spawned; first batch hit provider rate-limits/network errors (3 rate-limited, 2 network); all 5 areas were eventually completed via retries, one-at-a-time spawning, and a lightweight-catalog fallback. This validates the user's recovery point.

---

## 0. What this pass adds (new, beyond v1/v2/v3)

1. **~90 NEW projects** (LLM observability deep-pagination: 30+; gateway long-tail catalog: 40+; agent-framework observability: 14)
2. **43 academic papers/studies** (arXiv + Semantic Scholar, all live-verified) — surveys, routing reliability, log/error analysis, privacy, HCI
3. **Community landscape** — HN threads w/ themes, GitHub issue demand signals, Discords, blogs (Reddit was IP-blocked — search links provided)
4. **Storage-pattern synthesis** from agent frameworks — the definitive conversation-schema recommendation for our Messages page
5. **Top-copy list** ranked by feature-signal for the Messages page + error inbox

---

## 1. NEW LLM observability / monitoring projects (deep pagination — 30+)

### A. Request viewers, gateway observability & logging platforms
| Project | ★ | License | Status | Copy |
|---|---|---|---|---|
| **latitude-dev/latitude-llm** | 4,565 | MIT | ✅ | Closest existing "AI monitoring with error focus" — study its error clustering/alerting UI |
| **evidentlyai/evidently** | 7,790 | Apache-2.0 | ✅ | Drift/quality signal extraction from prompt+response pairs |
| **katanemo/plano** | 6,980 | Apache-2.0 | ✅ | Direct competitor message-page/observability layout; guardrail hooks |
| **looplj/axonhub** | 4,909 | Other | ✅ | Per-request trace timelines + cost breakdown for 100+ LLMs |
| **theopenco/llmgateway** | 1,511 | Other | ✅ | "Analyze requests" tab patterns — per-request metadata + analytics |
| **ENTERPILOT/GoModel** | 1,043 | MIT | ✅ | Real-time log stream view + per-key usage tracking |
| **vllora/vllora** | 812 | Other | ✅ | Trace-level debugging UI for multi-provider calls |
| **mozilla-ai/otari** | 371 | Apache-2.0 | ✅ | Virtual-key quota/usage ledger (compare with 9Router's quotas) |
| **inference-gateway/inference-gateway** | 229 | Apache-2.0 | ✅ | OTel export of gateway request logs |
| **traceloop/hub** | 225 | Apache-2.0 | ✅ | OTel-native request capture at gateway level (Rust) |
| **microsoft/promptflow** | 11,215 | MIT | ✅ | Production-monitor dashboard patterns for flows/sessions |
| **BricksLLM** | 1,221 | MIT | ☠️ | Per-key cost/rate enforcement UI (YC-backed design reference) |
| **voidmind-io/voidllm** | 124 | Other | ✅ | Privacy-preserving logging (redaction-first storage) |
| **PromptSail/prompt_sail** | 64 | MIT | ☠️ | Minimal MIT capture-proxy reference implementation |

### B. Error inbox & AI error analysis
| Project | ★ | License | Status | Copy |
|---|---|---|---|---|
| **airweave-ai/error-monitoring-agent** | 376 | none | ⚠️ | THE error-inbox recipe: cluster → enrich → alert pipeline |
| **HolmesGPT/holmesgpt** | 3,018 | Apache-2.0 | ✅ | LLM-driven root-cause summaries of repeated failures (CNCF) |
| **langchain-tracer/Axon** | 144 | MIT | ✅ | Terminal-based real-time trace inspector (OTel CLI) |
| **zenml-io/kitaru** | 229 | Apache-2.0 | ✅ | Record → replay → improve production agents |
| **smithersai/smithers** | 355 | MIT | ✅ | Time-travel session viewer (rewind/fork/replay) |
| **cyberark/agentwatch** | 122 | Apache-2.0 | ☠️ | Audit-trail view of agent interactions (UI reference) |

### C. Cost/token dashboards
| Project | ★ | License | Status | Copy |
|---|---|---|---|---|
| **Javis603/token-monitor** | 1,213 | MIT | ✅ | Aggregated cost dashboard + limit-progress widgets |
| **AgentOps-AI/tokencost** | 1,999 | MIT | ⚠️ | Pricing table for 400+ LLMs (drop-in cost data source) |
| **mikehasa/agentacct** | 548 | MIT | ✅ | Per-request breakdown (steps → tokens → cost); honesty labels |
| **VasiHemanth/tokentelemetry** | 303 | MIT | ✅ | Session/tool-call/reasoning token breakdown tables |
| **atopos31/llmio** | 313 | MIT | ✅ | Weighted routing + cost-per-model ledger |
| **mag123c/toktrack** | 181 | MIT | ✅ | Minimal per-request cost computation core |
| **Dicklesworthstone/coding_agent_usage_tracker** | 77 | Other | ✅ | Subscription-quota tracking CLI |
| **tugcantopaloglu/openclaw-dashboard** | 699 | none | ⚠️ | Auth-gated dashboard + live SSE feed patterns |
| **supermemoryai/llm-bridge** | 322 | MIT | ⚠️ | Error-normalization between LLM formats (mirrors translator) |

### D. Trace visualization components (stealable UI)
| Project | ★ | License | Status | Copy |
|---|---|---|---|---|
| **evilmartians/agent-prism** | 379 | MIT | ✅ | **Ready-made MIT React trace-tree/timeline components** — embeddable |
| **agentscope-ai/agentscope-studio** | 629 | Apache-2.0 | ✅ | Reusable trace canvas + JSON inspectors |
| **rajudandigam/agent-inspect** | 342 | MIT | ✅ | JSONL→execution-tree renderer (raw/pretty viewer pattern) |
| **vstorm-co/agentcanvas** | 79 | MIT | ✅ | Static-HTML export of a request trace |

### E. MCP / AI-agent-assisted analysis
| Project | ★ | License | Status | Copy |
|---|---|---|---|---|
| **avivsinai/langfuse-mcp** | 102 | MIT | ✅ | **MCP server over trace data** → AI error analysis gets tool access |
| **comet-ml/opik-mcp** | 216 | Apache-2.0 | ✅ | Same pattern, second reference |
| **tma1-ai/tma1** | 115 | Apache-2.0 | ✅ | Local observability "the agent reads back" via hooks + MCP |
| **hyprmcp/jetski** | 210 | MIT | ⚠️ | MCP-call logging + prompt payload inspection |
| **traccia-ai/traccia-py** | 98 | Apache-2.0 | ✅ | Policy enforcement on observed error patterns |

---

## 2. NEW gateway long-tail catalog (40+; from cuihuan/awesome-ai-gateway + howardpen9/awesome-ai-api-proxy)

**Tier 1 — self-hosted gateways with built-in logging/dashboards:**
- **ccglass** (jianshuo/ccglass, 665★, MIT, ✅) — **the exact "request log viewer w/ token+cost per message" UX for coding agents**; `https_proxy` hijack so agents can't bypass it → TOP COPY
- **gpt-load** (tbphp, 6.3k★, MIT, ✅) — full admin UI: dashboard, real-time stats, health checks, **detailed request logs w/ debugging info**
- **CLIProxyAPI** (46.5k★, MIT, ✅) — coding-subscription→API wrapper with usage stats per account
- **CPA-Manager-Plus** (seakee, 2.4k★, MIT, ✅) — **account-health panel over pooled accounts** (health/failure/ban signals) → directly applicable to 9Router multi-account fallback
- **APIPark** (1.8k★, Apache-2.0, ✅) — real-time monitoring + **request-log export to third-party log platforms**
- **aiproxy (Sealos)** (labring, 523★, MIT, ✅) — audit trails, per-group RPM/TPM quotas, channel performance
- **aurora** (33★, Apache-2.0, ✅) — per-model daily cost rollup dashboard
- **TokenHub** (astaxie, 911★, Apache-2.0, ✅) — project/team cost attribution + RBAC + audit
- **octopus** (2.3k★, AGPL ⚠️) — token consumption + cost stats (AGPL — ideas only)
- **CrossLink** (381★, Apache-2.0, ✅) — **routing-stats API: configured-vs-actual traffic distribution** → proves combo/fallback rules fired (TOP COPY)
- **RelayPlane** (194★, MIT, ✅) — per-request cost, content logging w/ system-prompt view, **runaway-loop kill audit trail**
- **metapi** (3.2k★, MIT, ✅) — balance/utilization-weighted smart routing + channel cooldown/retry
- **workweave/router** (942★, no license ⚠️) — OTLP traces out of the box + built-in dashboard
- **Manifest** (mnfst, 7.4k★, MIT, ✅) — cost tracking + budgets over 300+ models; header routing
- **OrcaRouter-Lite** (412★, MIT, ~) — **savings-vs-baseline analytics endpoint** (cheap model = $ saved)
- **NadirClaw** (636★, no license) — latency stats, tier breakdown, log export API
- **dario** (337★, MIT, ✅) — TUI w/ analytics + **subscription-vs-API drift monitor** + audit-logged admin API
- **ClawRouter** (6.7k★, MIT, ✅) — /stats usage view, sub-ms local routing
- **SMG** (449★, Apache-2.0, ✅) — **chat-history storage** + approval-policy audit + KV-cache-aware routing
- **OpenGateLLM** (180★, MIT, ✅) — "no-log/privacy mode" toggle (privacy-first tenants)
- **Braintrust Proxy** (408★, MIT, ✅) — auto-logs requests to an eval platform
- **uni-api** (1.2k★, Apache-2.0, ✅) — minimal proxy + optional OTel export
- **one-hub / done-hub / VoAPI / Veloera / simple-one-api** — one-api/new-api lineage variants w/ stats UIs (2.9k★/800★/1.1k★/1.6k★/2.3k★)
- **A3M Router** (10★, MIT, ✅) — parallel-ensemble router, 70–95% cost savings
- **nullsink** (12★, AGPL) — anti-logging zero-retention relay (opposite pole)

**Tier 2 — adjacent:** Envoy AI Gateway (1.9k★), kgateway (5.7k★), KrakenD CE (2.7k★), agentgateway (4.3k★), NVIDIA Dynamo (7.7k★), MLflow AI Gateway (27.4k★), optillm (4.2k★), Pydantic AI Gateway (192★, ARCHIVED → Logfire), Glide (160★, dead).

**Flags:** Helicone in maintenance mode (acquired by Mintlify 2026-03 — copy ideas, don't build on it). Avoid GPL/AGPL code (octopus, Helicone ai-gateway, nullsink) into MIT 9Router.

---

## 3. Academic studies (43 papers — all live-verified)

### Surveys & landscape
1. **A Survey of AIOps for Failure Management in the Era of LLMs** (2024, arXiv:2406.11213) — detection → RCA → mitigation → postmortem pipeline; LLMs fill the "intelligence gap" → *error-inbox architecture template + build an eval set of real failure traces early*
2. **A Survey of AIOps in the Era of LLMs** (2025, arXiv:2507.12472) — 183 papers; LLMs strong at semantic log understanding, weak at streaming/cost control; most are PoC → *self-hosted gateways generating real labeled production traces are a field gap*
3. **RAGOps** (2025, arXiv:2506.03401) — ~60% of enterprise LLM systems use RAG; feedback eval loops → *log retrieval context for RAG traffic*
4. **A Survey on LLM-based Autonomous Agents** (2023, arXiv:2308.11432) — agent taxonomy → *group captured requests by agentic patterns*
5. **CAP Principle for LLM Serving** (2024, arXiv:2405.11299) — Context/Accuracy/Performance trilemma → *surface the C/A/P tradeoff of each routing decision*
6. **Rethinking LLMOps for Fraud/AML** (2026, arXiv:2605.11232) — **compliance-grade serving needs output validation + auditability** → *strongest argument for immutable request/response capture*
7. **Blueprint for Real-Time Enterprise LLM Deployments** (2026, arXiv:2608.00419) — HITL feedback loops → *error inbox = human-in-the-loop feedback surface*
8. **Mind the Metrics: Telemetry-Aware IDE Dev using MCP** (2025, arXiv:2506.11019) — metrics/traces/prompts in one pane

### Reliability & routing
9. **ContinuityBench** (2026, arXiv:2607.15899) — **naive stateless failover silently drops conversation history**; introduces Continuity Preservation Rate (CPR) + Continuity Latency Overhead (CLO) → *validates 9Router's combo/account fallback + gives the exact metrics for the viewer*
10. **Evidence-Bound Gateway-Path Provenance** (2026, arXiv:2606.22560) — gateways decide route/fallback/billing invisibly → *record WHO decided and WHY (router → combo → account → fallback chain)*
11. **GateScope** (2026, arXiv:2604.21083) — black-box gateway measurement: "was the billed model the served model?" → *per-request fidelity checks*
12. **SEAR: Schema-Based Evaluation and Routing for LLM Gateways** (2026, arXiv:2603.26728) — **extensible relational schema for eval signals + ops metrics, SQL-queryable ~100 typed attributes** → *published blueprint for our log schema*
13. **CacheProbe** (2026, arXiv:2605.30613) — prompt-cache isolation leaks metadata → *privacy note for captured prompts*
14. **UniRoute** (2025, arXiv:2502.08773) — routing to unseen LLMs → *logged outcomes = training substrate for smart routing*
15. **RouterEval** (2025, arXiv:2503.10657) — a capable router can outperform best single model → *empirical justification for modelRouter*
16. **Privacy-Preserving LLM Routing** (2026, arXiv:2604.15728) — routing-layer privacy risks; metadata leaks even encrypted
17. **OmniRouter** (2025) — budget/performance-controllable routing → *capture cost deltas for budget dials*
18. **Causal LLM Routing** (2025) — routing learned from observational data → *our logs are the dataset*
19. **Measuring Five-Nines Reliability** (2026, arXiv:2605.11209) — saturating benchmarks hide rare failures → *error inbox = sample-efficient failure estimator*
20. **RLM-Cascade** (2026, arXiv:2606.22840) — cheap draft model + complexity router, 88.8% draft-use → *cost-optimization pattern at gateway layer*

### Log/error analysis
21. **TAMO** (2025, arXiv:2504.20462) — tool-assisted LLM RCA → *give the analyzer TOOLS (query log store, diff traces) not one giant prompt*
22. **Exploring LLM-based Agents for RCA** (Microsoft, 2024, arXiv:2403.04123) — agent only as good as incident context → *package full trace (request → route chain → upstream → error)*
23. **COCA** (2025, arXiv:2503.23051) — RCA from issue reports + code knowledge → *provider-side failures: infer from error text + config history*
24. **Stalled, Biased, Confused: Reasoning Failures in LLM RCA** (2026, arXiv:2601.22208) — **cautionary**: LLM RCA stalls/biases → *confidence signals + never auto-close inbox items without human confirmation*
25. **KRONE** (2026, arXiv:2602.07303) — hierarchical log anomaly detection → *hierarchical failure clustering (provider/model/endpoint/error-class) beats flat lists*
26. **LLM-Enhanced Log Anomaly Detection Benchmark** (2026, arXiv:2604.12218) — LLM wins semantic novelty, loses throughput/cost → *LLM for semantic classification, rules for high-volume filtering*
27. **LLM-LADE** (2025) — anomaly detection with natural-language explanations → *every inbox item ships a "what went wrong / what we tried" narrative*
28. **LLMPrism** (2025, arXiv:2505.00342) — black-box perf diagnosis → *diagnosis from HTTP signals (latency curves, retry storms, partial streams)*
29. **When AIOps Become "AI Oops"** (2025, arXiv:2508.06394) — **adversaries manipulate telemetry to misdirect AIOps agents** → *SECURITY-CRITICAL: log content is untrusted input; sanitize before analysis* (⚠️ prompt-injection via upstream responses)
30. **LogLLaMA** (2025, arXiv:2503.14849) — fine-tuned next-event prediction as anomaly signal → *optional self-hosted anomaly detector*
31. **AnomalyGen** (2025, arXiv:2504.12250) — synthetic anomalous log generation → *build synthetic test corpus for the analyzer*
32. **ALPHA** (2025, arXiv:2509.05936) — active learning for anomaly detection → *bootstrap failure classification with few labels*

### Privacy
33. **Whistledown** (2025, arXiv:2511.13319) — PII in prompts; user-level privacy controls → *redaction tiers per request + "don't log this turn"*
34. **User Perceptions vs Proxy LLM Judges** (2025, arXiv:2510.20721) — LLM judges imperfect; logs may contain leaked PII
35. **Traffic Fingerprint Analysis** (2025, arXiv:2510.07176) — encrypted traffic leaks shape info → *local, access-controlled storage*
36. **Automating Prompt Leakage Attacks** (2025, arXiv:2502.12630) — system prompts = protected secrets in the log store
37. **Prompt Leakage in Multi-Turn LLMs** (2024, arXiv:2404.16251) — analyzer sees prompts → *ACL model for prompt content*
38. **Privacy Leakage Chains via Prompt Injection** (2026, arXiv:2605.18133) — injection chains exfiltrate data → *sanitize upstream content before rendering*

### HCI / UX
39. **Design Principles and Guidelines for LLM Observability** (2025, CHI EA) — **4 developer-centric principles** → *build the viewer against them (visibility, context preservation, actionable traces, lifecycle coverage)*
40. **AgentOps: Enabling Observability of LLM Agents** (2024) — trace/eval/analyze framework; span vocabulary
41. **Watson: Cognitive Observability Framework** (2024, ASE) — capture agent *reasoning*, not just I/O → *log router reasoning (why this model/combo)*
42. **StuGPTViz** (2024, arXiv:2407.12423) — visual analytics for large ChatGPT datasets → *transcript timelines, drill-down flows*
43. **Interactive Debugging and Steering of Multi-Agent AI Systems** (Microsoft, 2025, arXiv:2503.02068) — **reviewing long agent conversations to localize errors is the #1 developer pain** → *direct evidence for per-request viewer + error inbox*

---

## 4. Community landscape (HN / GitHub issues / Discords / blogs)

### Hacker News (Algolia API — live)
- **"llm observability"** (273 stories): OTel-vs-OpenInference span-kind incompatibility; Langfuse-vs-Phoenix tradeoffs; evals-as-observability chicken-and-egg; regression detection via LLM-judge completion rate
- **"ai gateway"** (474 stories): **LiteLLM frustration = loudest recurring theme** (perf, code quality, supply-chain incident, license anxiety); demand for per-end-user usage tracking via headers; provider API churn = #1 maintenance burden
- **"llm logging"** (1,172 stories): **"the same ticket that gets you to install Sentry — see what's happening in production and get alerted"**; people want P95/P99 latency, timeouts, error rates per prompt; auto-tracing of RAG
- **Cross-cutting insight: nobody has a good story for "see the actual failed request payload + error analysis" in a self-hosted gateway** — exactly our gap

### GitHub issues = proven demand (live-verified today)
- **langfuse**: cost modeling #14265; Gemini token/cost mismatch #13792/#8020 (most-complained bug class); trace-viewer correctness #5911
- **open-webui**: **analytics #21675 (81 comments — biggest demand in repo)**; per-key usage #28230
- **litellm**: payload capture + role-based log viewing broken #28859/#34099; log search UX #32047/#31695; read-only viewer role shipped #26582
- **one-api**: "capture detailed request logs like APIPark?" #2414; detailed logs #512; latency stats #1412
- **new-api**: **stream-error classification #5222**; real-time usage logs #3008/#6295; **terminal failures recorded as successful EOF #6594** (silent error misclassification — directly relevant to error inbox)
- **helicone**: self-host logging reliability #3549; cloud nudge resentment #5501; hallucination-detection #5662

### Discords/Slacks (invites verified from READMEs)
LlamaIndex, Open WebUI, LocalAI, AnythingLLM, LiteLLM, LibreChat, LangChain, Langfuse Slack (slack.langfuse.ai), n8n forum.

### Blogs/newsletters
Latent Space, The Batch (DeepLearning.AI), Simon Willison, MLOps.community, OpsEra, selfh.st, Arize blog, Langfuse blog, LiteLLM docs, The AI Engineer, Traceloop blog.

### Reddit — ⚠️ IP-blocked from this environment (403)
r/LocalLLaMA, r/selfhosted, r/LLMDevs, r/OpenWebUI, r/ollama — recurring themes known: "can't see where my tokens went", cost tracking across providers. Search URLs provided in the source report for manual browsing.

---

## 5. Agent-framework storage patterns (the schema recommendation)

| Approach | Who | Strength | Weakness |
|---|---|---|---|
| Relational rows (conversation_id + parent_message_id) | Dify, Open WebUI, LibreChat, Cherry Studio | Searchable, joinable, aggregate-able, exportable | Schema rigidity |
| Snapshot blobs (checkpoints/thread) | LangGraph, CrewAI flows, AG2 KV | Perfect resume/fork/retry | Not queryable at message level |
| Append JSONL / localStorage | AutoGen legacy, chatgpt-next-web | Trivial, export-native | No search/concurrency |
| OTel spans/attributes | Vercel AI SDK, Pydantic, Mastra, LlamaIndex | Standardized traces, cheap at scale | Traces ≠ chat history; no user-facing page |
| Hybrid (composite) | Mastra, Pydantic chat apps | Right tool per concern | Two systems to operate |

**Recommendation for 9Router (SQLite + requestDetails):** hybrid relational pattern —
`messages` table: `id, session_id, request_id (FK → requestDetails), role, model, parent_message_id, status/done, tokens, latency, created_at`, indexed `(session_id, created_at)`. Fat bodies stay in `requestDetails` JSON (LangGraph-blob style); message row stays projection-thin + searchable. Add Dify-style per-message feedback + Open WebUI-style usage aggregation (tokens/cost per session). Forking free via `parent_message_id`. Export via JSON or SQL join. Cherry Studio's `VACUUM INTO` backup pattern. OTel spans only if cross-session traces needed later.

---

## 6. Top-copy synthesis (ranked, for the Messages page + error inbox)

1. **ccglass** — per-message token/cost log viewer UX (MIT, small, studyable)
2. **latitude-llm** — error-focused AI monitoring platform (error clustering/alerting)
3. **agent-prism** — ready-made MIT React trace-visualization components
4. **CrossLink routing-stats API** — "configured vs actual traffic distribution" (proves rules fired)
5. **CPA-Manager-Plus account-health panel** — per-account health/quota/failure for multi-account fallback
6. **langfuse-mcp / opik-mcp** — MCP server over the trace store → AI error analysis with tool access
7. **SEAR paper schema** — SQL-queryable typed attributes for requests + ops metrics
8. **ContinuityBench metrics (CPR/CLO)** — surface fallback continuity + latency cost in the viewer
9. **TAMO tool-assisted RCA** + **AIOps survey pipeline** — detection → RCA → mitigation → postmortem inbox
10. **"When AIOps Become AI Oops"** — treat log content as untrusted input for the analyzer (security)

---

## 7. References (all live 2026-08-07)

- Projects: github.com/latitude-dev/latitude-llm · evidentlyai/evidently · katanemo/plano · looplj/axonhub · theopenco/llmgateway · ENTERPILOT/GoModel · vllora/vllora · mozilla-ai/otari · inference-gateway/inference-gateway · traceloop/hub · microsoft/promptflow · bricks-cloud/BricksLLM · voidmind-io/voidllm · PromptSail/prompt_sail · airweave-ai/error-monitoring-agent · HolmesGPT/holmesgpt · langchain-tracer/Axon · zenml-io/kitaru · smithersai/smithers · cyberark/agentwatch · Javis603/token-monitor · AgentOps-AI/tokencost · mikehasa/agentacct · VasiHemanth/tokentelemetry · atopos31/llmio · mag123c/toktrack · Dicklesworthstone/coding_agent_usage_tracker · tugcantopaloglu/openclaw-dashboard · supermemoryai/llm-bridge · evilmartians/agent-prism · agentscope-ai/agentscope-studio · rajudandigam/agent-inspect · vstorm-co/agentcanvas · avivsinai/langfuse-mcp · comet-ml/opik-mcp · tma1-ai/tma1 · hyprmcp/jetski · traccia-ai/traccia-py · jianshuo/ccglass · tbphp/gpt-load · router-for-me/CLIProxyAPI · seakee/CPA-Manager-Plus · APIParkLab/APIPark · labring/aiproxy · aurorallm/aurora · astaxie/TokenHub · bestruirui/octopus · HotRiceNoodles/CrossLink · RelayPlane/proxy · cita-777/metapi · workweave/router · mnfst/manifest · Continuum-AI-Corp/OrcaRouter-Lite · NadirRouter/NadirClaw · askalf/dario · BlockRunAI/ClawRouter · lightseekorg/smg · etalab-ia/OpenGateLLM · braintrustdata/braintrust-proxy · yym68686/uni-api · MartialBE/one-hub · deanxv/done-hub · Das-rebel/a3m-router · nullsink/nullsink
- Lists: cuihuan/awesome-ai-gateway · howardpen9/awesome-ai-api-proxy
- Papers: arXiv ids listed in §3 (2406.11213, 2507.12472, 2506.03401, 2308.11432, 2405.11299, 2605.11232, 2608.00419, 2506.11019, 2607.15899, 2606.22560, 2604.21083, 2603.26728, 2605.30613, 2502.08773, 2503.10657, 2604.15728, 2605.11209, 2606.22840, 2504.20462, 2403.04123, 2503.23051, 2601.22208, 2602.07303, 2604.12218, 2505.00342, 2508.06394, 2503.14849, 2504.12250, 2509.05936, 2511.13319, 2510.20721, 2510.07176, 2502.12630, 2404.16251, 2605.18133, 2407.12423, 2503.02068) + Semantic Scholar entries (§3 items 17, 18, 27, 39, 40, 41)
- Community: hn.algolia.com queries · GitHub issues (langfuse #14265/#13792/#8020/#5911, open-webui #21675/#28230, litellm #28859/#34099/#32047/#31695/#26582, one-api #2414/#512/#1412, new-api #5222/#3008/#6295/#6594, helicone #3549/#5501/#5662) · discord.gg links in §4 · blogs in §4
