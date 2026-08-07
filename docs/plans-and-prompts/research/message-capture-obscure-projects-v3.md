# Research v3: OBSCURE / Low-Star Projects (message capture, chat viewers, log tools)

**Date:** 2026-08-07 (third pass — the "hidden gems" pass)
**Author:** GitHub Copilot agent (1 research subagent + direct GitHub API searches)
**Status:** active (research only — no code changed)
**Tags:** research, obscure, low-star, message-capture, chat-viewer, llm-logging

> User directive: *"I would like to find even obscure options not just the ones with a lot of stars… some projects that only have a hundred stars that could be really good baselines… for different parts of what we are looking for."*
> This pass targets **20–1,500★** projects. Giants (Langfuse, Helicone, Phoenix, OpenObserve, SigNoz, one-api, new-api, etc.) are already covered in `message-capture-deep-research-v2.md` — this doc ADDS the under-the-radar layer.

---

## 0. The hidden-gem shortlist (what to actually look at)

| Project | ★ | License | Why it matters for 9Router |
|---|---|---|---|
| **weiesky/cc-viewer** | 1,058 | MIT | Wire-level capture + per-conversation dirs + request body-diff — closest analog to our Messages page |
| **jmuncor/tokentap** | 811 | MIT | Auto-saves prompts as Markdown AND raw JSON (format switching primitive) + context-window gauge |
| **kittors/CliRelay** | 893 | MIT | **A mini-9Router**: self-hosted AI gateway for coding CLIs with web console + request logs + spend quotas |
| **jazzyalex/agent-sessions** | 762 | MIT | Browse/search sessions across 8+ agent CLIs in one local app |
| **d-kimuson/claude-code-viewer** | 1,267 | MIT | Web history browser + live session monitor — proof of the UX |
| **xiufengsun/TokenTracker** | 1,226 | MIT | Local dashboard for 29 AI tools, GitHub-style heatmap, project attribution |
| **nateherkai/token-dashboard** | 654 | MIT | Sessions tab with turn-by-turn view + per-turn tokens/tool calls — ready-made spec |
| **delexw/claude-code-trace** | 362 | MIT | 3-panel layout (session tree → turns → detail) + SSE live tail |
| **matt1398/claude-devtools** | 3,804 | MIT | Visual UI for session logs, tool calls, token usage, subagents, context window |
| **pydantic/logfire** | 4,416 | MIT | Pydantic's AI observability platform (OTel-native) |
| **raga-ai-hub/RagaAI-Catalyst** | 16,142 | Apache-2.0 | Agent tracing + self-hosted dashboard + timeline/execution-graph view |
| **prime-radiant-inc/llm-proxy** | 27 | Apache-2.0 | Transparent logging proxy for LLM traffic — records every req/resp (tiny, exactly our domain) |
| **spanlens/Spanlens** | 11 | MIT | Drop-in proxy for OpenAI/Anthropic/Gemini + request logging + cost tracking, one Docker command |
| **particlesector/SectorFlux** | 7 | GPL-3.0 | Reverse proxy for local LLM agents with real-time dashboard + request logging (single binary) |
| **HillviewCap/clog** | 23 | none | Parent–child conversation threading + live file watch + auto-scroll |
| **S40911120/recensa** | 69 | MIT | SQLite FTS5 full-text search with highlighted snippets + "god-view" noise folding |
| **akivacp/chatgpt-json-tree-viewer** | 56 | MIT | Conversation as branching tree — the "thread/tree view" ask, verbatim |
| **kunwar-shah/claudex** | 92 | MIT | FTS5 index over sessions + MCP-exposable history API + smart titles |
| **avivl/cloud-sre-agent** | 49 | MIT | AI agent that monitors logs and does root-cause analysis automatically — the "synthetic scan" dream |
| **dillionverma/llm.report** | 1,020 | GPL-3.0 (ARCHIVED) | OpenAI request logging + cost analysis + prompt improvement — pattern reference only |

---

## 1. Wire/Proxy-level capture + session grouping (closest to 9Router)

- **weiesky/cc-viewer** (1,058★, MIT, active) — local proxy wrapping Claude Code CLI; captures every raw API request/response; per-session log dirs; **MainAgent vs SubAgent labeling**; **request body-diff JSON** (shows only changed fields vs previous request); inline token stats. → Copy: per-conversationId grouping, body-diff collapsing, wire-faithful capture.
- **jmuncor/tokentap** (811★, MIT, active) — mitm-style intercept of LLM traffic → real-time Rich terminal dashboard; **auto-saves each prompt as Markdown AND raw JSON**; context-window fuel gauge (green/yellow/red). → Copy: markdown+JSON dual export, context gauge.
- **prime-radiant-inc/llm-proxy** (27★, Apache-2.0, active) — transparent logging proxy for Claude/OpenAI traffic, auto-configures clients, records every request/response for debugging/auditing/analysis. → Copy: the "record everything by default + auto client config" pattern. Tiny codebase = easy to study.
- **spanlens/Spanlens** (11★, MIT, active) — drop-in proxy for OpenAI/Anthropic/Gemini with request logging, cost tracking, agent tracing; one Docker command. → Copy: the minimal proxy-with-logs architecture.
- **particlesector/SectorFlux** (7★, GPL-3.0, active) — reverse proxy for local LLM agents (Ollama); real-time dashboard, request logging, perf metrics in a **single C++ binary**. → Copy: the single-binary dashboard concept.
- **kittors/CliRelay** (893★, MIT, active) — self-hosted AI gateway for coding CLIs; one OpenAI/Claude/Gemini/Codex-compatible endpoint; **multi-tenant web console, request logs, spend quotas**. → Copy: request-log page + quota semantics; it's the closest small project to 9Router itself.
- **doublewordai/control-layer** (91★, Apache-2.0, active) — "fastest AI gateway" (Rust); unified endpoints + API key gen + user management + **request logging**. → Copy: lightweight request-logging middleware.
- **dillionverma/llm.report** (1,020★, GPL-3.0, **archived**) — logging/analytics platform for OpenAI: log requests, analyze costs, improve prompts. → Pattern reference only (dead project, GPL).

## 2. Session/transcript viewers (JSONL → browsable conversations)

- **jazzyalex/agent-sessions** (762★, MIT, active) — browse/search/analyze/resume sessions across 8+ agent CLIs (Codex, Claude Code, OpenCode, Cursor, Hermes…). → Copy: multi-source session index + resume action.
- **d-kimuson/claude-code-viewer** (1,267★, MIT, active) — full web client: new/resume conversations, **live monitoring of running tasks**, browse history. → Copy: live-session monitor pattern.
- **delexw/claude-code-trace** (362★, MIT, active) — **3-panel layout: date-grouped session tree → turn list → turn detail**; search by user message; tool-call inspection; **SSE live tail**. → Copy: THE canonical layout + live tail.
- **PixelPaw-Labs/codex-trace** (76★, MIT, active) — same 3-panel design for Codex; **collaboration chains** (multi-turn chained requests). → Copy: collaboration-chain grouping.
- **jerrywu001/cc-sessions-viewer** (269★, no license, active) — faithful replay (thinking chains, tool-call pairings, diffs, screenshots); **global search (⌘⇧F) across projects**; export to HTML; resume sessions. → Copy: jump-to-message search + HTML export.
- **harrylettering/claude-trace-replay** (265★, MIT, active) — **animated call-graph replay** of a session; **compare two sessions side by side**; token-spike review. → Copy: session-diff/compare view.
- **zuoliangyu/AI-Session-Viewer** (166★, MIT, active) — unified browser for Claude/Codex/Grok sessions; multi-node remote sync; privacy boundary (config in localStorage). → Copy: multi-machine aggregation.
- **S40911120/recensa** (69★, MIT, active) — self-hosted transcript viewer; **SQLite FTS5 full-text search (CJK-aware) with snippet highlighting**; "god-view" folds tools/thinking into landmark rows; diff rendering. → Copy: FTS5 search + noise-folding.
- **wesm/archived-agent-session-viewer** (88★, MIT, ARCHIVED) — vim-style keyboard nav, FTS, sessions grouped by codebase, **export HTML / publish to Gist**. → Copy: keyboard-first browsing + export (pattern proven; successor closed-source).
- **prime-radiant-inc/claude-session-viewer** (37★, no license, stale) — **React Router + Express + SQLite** (9Router's exact stack!) for Claude Code + Codex histories. → Copy: the stack shape.
- **HillviewCap/clog** (23★, no license, stale) — **parent–child conversation threading**; token usage per message type; file watching + live updates + auto-scroll. → Copy: threading + live file watch.
- **HizTam/codex-history-viewer** (25★, MIT, active) — VS Code ext; year/month/day tree; agent-run relationship tree (parent/sibling/descendant); interruption cards; bookmarks. → Copy: agent-run tree + interruption timeline.
- **masonc15/codex-transcript-viewer** (22★, MIT, stale) — JSONL → single-file HTML with role-based styling (user=green, final=highlight, commentary=italic, reasoning=gray, tool=expand). → Copy: single-file HTML export + role color-coding.
- **swyxio/claude-compaction-viewer** (71★, MIT, stale) — TUI; compaction boundaries + tokens-before-compaction + project tree/message table/detail panel. → Copy: token-pressure visualization.
- **BlackBeltTechnology/pi-agent-dashboard** (231★, MIT, active) — live chat mirroring of in-flight sessions, multi-session grid, diff viewer, mobile-first remote. → Copy: live streaming mirror.

## 3. Export-JSON → readable chat (rendering patterns)

- **akivacp/chatgpt-json-tree-viewer** (56★, MIT, active) — **conversation as branching tree**, click node → detail panel, search across thousands of chats, export PDF. → Copy: the thread/tree view, verbatim.
- **osteele/claude-chat-viewer** (100★, MIT, stale) — ZIP upload, multi-conversation browse; **regex search + result counter**; thinking toggle; download artifacts. → Copy: regex search w/ counter.
- **Conradqh/scrapemychats** (78★, MIT, active) — exports ChatGPT to searchable offline single-file HTML archive. → Copy: single-file HTML archive export.
- **lohasle/AI-Conversation-Viewer** (39★, Apache-2.0, stale) — unified view across Claude/Qwen/Cursor/Trae/Kiro; global + **scoped (within-session) search**; tool-use cards; role filter chips; Pygments highlighting. → Copy: scoped search + tool cards + role filters.
- **TomzxCode/llm-conversations-viewer** (20★, MIT, stale) — auto-detects OpenAI/Claude/Z.ai export formats → **normalized JSON**; "continue conversation" links; IndexedDB persistence. → Copy: format normalization + open-in-original-client links.
- **Pustur/whatsapp-chat-parser-website** (268★, MIT, dead) — bubble-rendered chat with inline media, 100% local. → Copy: chat-bubble renderer.
- **chylex/Discord-History-Tracker** (584★, MIT, stale) — portable conversation file + offline viewer pair. → Copy: file+viewer portability.
- **GeiserX/Telegram-Archive** (177★, GPL-3.0, active) — incremental backups + web viewer "feels like the real app" (media, polls, forwarded info), real-time listener, Docker. → Copy: familiar-chat-app rendering + incremental capture.

## 4. Conversation search/index + AI digest

- **kunwar-shah/claudex** (92★, MIT, active) — React+Fastify indexing `~/.claude/projects` with **SQLite FTS5**; **MCP server exposing 10 tools** (session search, conversation retrieval, memory CRUD); smart title extraction. → Copy: FTS5 index + MCP-exposable history API.
- **IvyYang1999/swob** (24★, Apache-2.0, active) — "Git graph for AI conversations": **Session Galaxy force-directed lineage graph**, forks/continuations; **Execution Tree** (turns → tool calls → subagents → errors → durations → tokens); **Context Inspector** slicing into user/assistant/tool/system/thinking/image; **provenance labels** (`reported`/`estimated`/`unavailable`). → Copy: context-slice inspector + honest provenance labeling.
- **prime-radiant-inc/engineering-notebook** (247★, Apache-2.0, stale) — ingests session transcripts → **LLM-generated daily summaries** → browsable web journal (SQLite). → Copy: optional LLM-digest of a conversation.

## 5. Usage/cost dashboards with session views

- **xiufengsun/TokenTracker** (1,226★, MIT, active) — local dashboard for 29 AI coding tools; hooks auto-install; GitHub-style activity heatmap; project attribution; native apps. → Copy: hook capture + heatmap.
- **nateherkai/token-dashboard** (654★, MIT, active) — reads JSONL → per-prompt cost ranking; tool/file heatmaps; subagent attribution; cache analytics; **Sessions tab: turn-by-turn view with per-turn tokens and tool calls**. → Copy: the turn-by-turn Sessions spec, ready-made.
- **HduSy/tokenscope** (243★, MIT, active) — **dedup by message.id for streaming/retries**; per-model/MCP/skill breakdowns; "no price" labeling. → Copy: dedup-by-id for streaming + honest no-price labels.
- **foyzulkarim/claude-lens** (246★, MIT, active) — tiered observed/estimated/locked accuracy labels; single Fastify process serving SPA+API+WS. → Copy: accuracy-tier labels.
- **nikitadoudikov/claude-pulse** (243★, MIT, active) — **FTS everywhere + budgets + phone alerts via ntfy** (direct notification hook!). → Copy: budget alerts through ntfy.
- **SirAllap/agentglass** (284★, MIT, active) — live cost/tokens/tool calls across providers; phone companion. → Copy: cross-provider live stats.

## 6. Trace/OTel viewers (waterfall + comparison)

- **logaretm/teley** (61★, Apache-2.0, active) — OTel/Sentry viewer: **time-proportional waterfall traces with real hierarchy**; **side-by-side trace comparison using LCS diff**; local-first IndexedDB. → Copy: the LCS-diff compare — best pattern for "compare two requests".
- **finchvox/finchvox** (30★, MIT, active) — session replay for Pipecat voice agents: **unified replay timeline (audio + OTel traces + logs + metrics)**, interruption detection, per-stage latency. → Copy: unified timeline replay.

## 7. LLM observability platforms (mid-tier, ≤5k★)

- **pydantic/logfire** (4,416★, MIT, active) — Pydantic's AI observability platform; OTel-native; traces + evals for production LLM/agent systems; Python-first. → Copy: OTel-native export path.
- **matt1398/claude-devtools** (3,804★, MIT, active) — "missing DevTools for Claude Code": inspect session logs, tool calls, token usage, subagents, context window in a visual UI (Electron). → Copy: context-window visualization.
- **pezzolabs/pezzo** (3,262★, Apache-2.0, active) — developer-first LLMOps: prompt design/versioning, troubleshooting, observability. → Copy: prompt-versioning tied to logs.
- **raga-ai-hub/RagaAI-Catalyst** (16,142★, Apache-2.0, active) — Agent AI observability SDK + **self-hosted dashboard** + timeline/execution graph view + multi-agent debugging. → Copy: execution-graph view.
- **AgentOps-AI/tokencost** (1,999★, MIT, active) — token price estimates for 400+ LLMs (library). → Copy: cost-estimation library for our cost display.
- **FrigadeHQ/trench** (1,649★, MIT, active) — analytics infrastructure (ClickHouse/Kafka/Node, single image) for building product analytics incl. LLM RAG. → Copy: if we ever outgrow SQLite, this is the analytics substrate.
- **future-agi/future-agi** (1,623★, Apache-2.0, active) — eval/observe/improve platform: tracing, evals, simulations, datasets, gateway, guardrails, self-hostable. → Copy: gateway+observability bundle ideas.

## 8. The AI-analysis / synthetic-scan idea (error triage automation)

- **avivl/cloud-sre-agent** (49★, MIT, active) — autonomous SRE agent monitoring cloud logs across platforms, using AI models to **detect anomalies, root-cause analysis, auto-remediate via GitHub PRs**. → The "local model scanning messages for errors" wish, done. Copy the loop: poll logs → LLM classify → store finding → act.
- **HolmesGPT/holmesgpt** (3,018★, Apache-2.0, CNCF Sandbox) — SRE agent; incident response assistant. (Borderline giant — but the SRE-agent pattern is the same.)
- **Opencode-DCP/opencode-request-logger** (7★, no license) — OpenCode plugin that logs raw LLM fetch request bodies to disk. → Copy: the "log raw bodies to disk" plugin pattern.
- **aotakeda/local-lens** (7★, MIT) — 100% local HTTP/MCP server capturing browser console logs + network requests **for LLM analysis**. → Copy: MCP-served logs for AI analysis.

---

## 9. Synthesized recommendations (new, from obscure pass)

1. **Per-conversation directory grouping + wire-faithful bodies** (cc-viewer) is the #1 architectural pattern — group `requestDetails` by conversationId, guarantee raw payload.
2. **3-panel layout** (claude-code-trace / codex-trace) is the de-facto standard for the Messages page: session tree → turn list → detail.
3. **Branch/tree rendering** (chatgpt-json-tree-viewer) directly answers "chat logs organized by chat."
4. **Body-diff between consecutive requests** (cc-viewer) is a killer feature nobody in our category has.
5. **Dual format save** (tokentap: Markdown + JSON) + **role color-coding** (codex-transcript-viewer) + **single-file HTML export** (scrapemychats) cover the "Bruno-like formats" ask.
6. **FTS5 search + scoped search + snippet highlighting** (recensa, claudex, AI-Conversation-Viewer) — SQLite FTS5 is already available to us.
7. **Honest provenance labels** (`reported`/`estimated`/`unavailable` — agentacct, swob, claude-lens) — align with 9Router's "pricing-table estimates, never invoices" ethos.
8. **LLM-digest + SRE-agent loop** (engineering-notebook, cloud-sre-agent) — the "synthetic scan" background job, with ntfy alerts (claude-pulse).
9. **LCS side-by-side comparison** (teley) — compare two conversations/requests.
10. **The biggest gap confirmed**: *no existing project groups raw OpenAI-compatible proxy traffic into conversation trees with wire-level fidelity* — 9Router sits exactly at the intersection (it IS the proxy), so it can capture at source without MITM tricks. This is our moat.

## 10. References (all live 2026-08-07)

weiesky/cc-viewer · jmuncor/tokentap · kittors/CliRelay · jazzyalex/agent-sessions · d-kimuson/claude-code-viewer · xiufengsun/TokenTracker · nateherkai/token-dashboard · delexw/claude-code-trace · matt1398/claude-devtools · pydantic/logfire · raga-ai-hub/RagaAI-Catalyst · prime-radiant-inc/llm-proxy · spanlens/Spanlens · particlesector/SectorFlux · HillviewCap/clog · S40911120/recensa · akivacp/chatgpt-json-tree-viewer · kunwar-shah/claudex · avivl/cloud-sre-agent · dillionverma/llm.report · doublewordai/control-layer · PixelPaw-Labs/codex-trace · jerrywu001/cc-sessions-viewer · harrylettering/claude-trace-replay · zuoliangyu/AI-Session-Viewer · wesm/archived-agent-session-viewer · prime-radiant-inc/claude-session-viewer · HizTam/codex-history-viewer · masonc15/codex-transcript-viewer · swyxio/claude-compaction-viewer · BlackBeltTechnology/pi-agent-dashboard · osteele/claude-chat-viewer · Conradqh/scrapemychats · lohasle/AI-Conversation-Viewer · TomzxCode/llm-conversations-viewer · Pustur/whatsapp-chat-parser-website · chylex/Discord-History-Tracker · GeiserX/Telegram-Archive · IvyYang1999/swob · prime-radiant-inc/engineering-notebook · HduSy/tokenscope · foyzulkarim/claude-lens · nikitadoudikov/claude-pulse · SirAllap/agentglass · logaretm/teley · finchvox/finchvox · pezzolabs/pezzo · AgentOps-AI/tokencost · FrigadeHQ/trench · future-agi/future-agi · HolmesGPT/holmesgpt · Opencode-DCP/opencode-request-logger · aotakeda/local-lens
