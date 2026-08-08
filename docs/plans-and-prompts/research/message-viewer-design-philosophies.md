# Research — Message Viewer Design Philosophies & Filter Dimensions

**Date:** 2026-08-07
**Author:** GitHub Copilot agent
**Status:** active (research complete — no code changed)
**Tags:** research, observability, messages, design, filter-dimensions, ui
**Sources:** live docs of Sentry, Langfuse, LangSmith, Datadog, Helicone, OpenRouter, OpenAI SDK, Grafana Loki; 9Router codebase audit (messages page, requestDetailsRepo, usageRepo, chat.js, custom-server.js); `plans/messages-page-feature-spec.md`

---

## 0. Executive Summary

9Router is a **gateway** — meaning it sits at the one choke point every LLM client must pass through. Every observability tool researched (Langfuse, LangSmith, Helicone, OpenLLMetry, Datadog) captures dimensions **from the client side** via SDK instrumentation; 9Router can capture the same dimensions **from the wire** with zero client changes, plus a set of gateway-only dimensions (API key used, client IP, route chain, combo/fallback decisions) that *no client-side tool can see*.

This document:
- **A.** Distills design philosophies from 10 reference tools (layout pattern, grouping, filtering, what makes the UX good).
- **B.** Catalogues the filter dimensions LLM observability tools use (session, trace, user, project, model, cost, latency, tags, metadata, environment) and where they're captured.
- **C.** Identifies gateway-only capture dimensions 9Router can add (API key, IP + UA, combo name, smart-router task type, fallback chain, provider account, custom headers, conversation, route).
- **D.** Recommends: 3 distinct view designs, 5+ additional filters we can build today, 5 visual/UX improvements to the current list+detail, and privacy/risk guardrails.

---

## A. Design philosophies for message/log viewers

### A.1 Sentry — Issue Details (error-event detail)

**Layout pattern:** Three zones on one page — a **header** (error title, total event/user counts, resolve/assign/share/archive actions), a **center column** (event details: stack trace, breadcrumbs, HTTP request, tags, contexts, feature flags, suspect commits), and a **right sidebar** (first/last seen, release, linked issues, activity/comment timeline, participants, AI "Seer" analysis).

**How it groups:** Errors are grouped into **Issues via fingerprinting** (hash of class+message+stack), not shown as individual events. Each Issue is one row in a list; the detail page shows one "recommended" event (Sentry picks the most context-rich one) with prev/next event navigation. Similar Issues and merged issues are linked.

**How it filters:** A **search bar with `key:value` syntax** (`browser:chrome env:prod release:1.2.3`), environment selector, time range, and tag facet chips. Every tag is clickable to pivot.

**What makes the UX good:**
- **Event Highlights** — a curated set of tags/contexts *promoted to the top* for fast triage (project admins can customize which).
- **Breadcrumbs** — a chronological timeline of what happened *before* the error (HTTP calls, logs, DOM events) → tells a story, not just a snapshot.
- **Trace Preview** — mini waterfall linking to the full distributed trace, plus "trace-related issues" for cross-issue context.
- **Frequency chart** of events over time + user counts — you see blast radius immediately.
- Event navigation respects the active search filter (recommended/latest/oldest).

### A.2 Datadog Log Explorer & Grafana/Loki (query-driven log viewers)

**Layout pattern:** Log Explorer is a **facets-on-the-left + query-bar-on-top + results-table + histogram** layout. The histogram (event count over time) sits directly under the search bar; clicking a time bucket narrows the range. Results render as a column list you can re-arrange.

**How it groups:** Logs are grouped by **facets** (attributes) and by **patterns** (clustering similar messages into a representative + count). "Transactions" group related logs across services. Loki's model: **only index labels, not content** — the log line stays opaque, and you query by label selectors.

**How it filters:** A full query language:
- `key:value` attribute search (`@http.status_code:400`)
- Reserved attributes without prefix: `service:`, `status:`, `host:`, `trace_id:`, `message:`
- Boolean operators (`AND` / `OR` / `-`), wildcards (`service:web*`, `*test*`)
- **Numerical ranges** (`@http.response_time:>100`, `@http.status_code:[400 TO 499]`)
- **CIDR** for IPs, arrays, `NOT(...)`, `env:(prod OR test)`
- **Saved Views** = search query + columns + time horizon + facet selections (shareable, URL-serializable)

**What makes the UX good:**
- **The histogram is the primary navigation primitive** — you see spikes/outliers first, then drill in.
- Facets are derived from the data itself (no schema pre-declaration) — new fields become filterable automatically.
- One search bar does everything; the query language is learnable but powerful.

### A.3 LangSmith / Langfuse — LLM traces

**Layout pattern:** **Trace tree in the center-left, detail panel on the right.** LangSmith renders each trace as a **hierarchical tree of spans** (root run → LLM calls → tool calls → retrieval → child runs), each row showing name, model, input/output summary, latency, token count, cost. Clicking a span expands a detail panel with inputs, outputs, usage, and metadata. Langfuse uses the same tree-of-observations model with a **timeline/waterfall** rendering — each observation has start time, duration, input/output, cost.

**How it groups:** The **trace** (one logical request) is the primary grouping; **observations** (spans) nest inside it. **Sessions** group multiple traces that share a `sessionId` (a multi-turn chat = one session). Traces can be tied to a **user_id** and grouped by project/environment.

**How it filters (LangSmith):** Query-based filtering with fields for project, session, user, tags, time range, plus **feedback scores**, eval results, and model/provider. Langfuse adds environments, releases/versions, tags, metadata, cost/token filters.

**What makes the UX good:**
- **Nesting preserves causality** — you see the exact order of LLM call → tool → retry within a single request.
- **Session replay** — Langfuse renders a session as a readable transcript; you "replay" the whole conversation instead of inspecting one call.
- **Cost/tokens per span** — expensive branches are visually obvious.
- Trace-level attributes are **propagated down to every observation** (denormalized copy) so filtering is fast and every row is self-contained.

### A.4 Linear / Notion — task organization

**Layout pattern:** **Filterable list + board/kanban + detail pane**, all driven by a shared query model. Linear: keyboard-first, infinite-scroll list with inline editing; every column is a filterable/groupable field.

**How it groups:** By assignee, status, label, priority, project, estimate — arbitrary grouping axes. Notion: database views are the same rows rendered differently (table, board, timeline, gallery, calendar, list).

**How it filters:** **Saved views/filters** (a view is a persisted filter + sort + group), quick filters, and command-K style search.

**What makes the UX good:**
- **Views, not modes** — one data model, many renderings. This is the key idea to steal: *the same message data rendered as a table, a timeline, a tree, or a board*.
- Keyboard navigation everywhere; dense, scannable rows; group headers are sticky.

### A.5 Obsidian / Roam — graph/backlink views

**Layout pattern:** Graph view (force-directed nodes = notes, edges = links) + **backlink panel** (every note that links to the current one) + outline/tree of the current note.

**How it groups:** By **link topology**, not folders. A note's "context" is defined by what points to it.

**How it filters:** Search with query operators; graph filters by tag/link type.

**What makes the UX good:**
- **Backlinks create emergent structure** — you discover related conversations/requests you didn't know were related.
- For messages: *the analogue is "which other messages share this conversation / this API key / this error category"* — a backlinks-style "Related" panel in the detail drawer.

### A.6 mitmproxy / Proxyman / Charles — HTTP capture (request/response pairs)

**Layout pattern:** **Master-detail with a flow list on top and a split request/response viewer below.** The flow list is a table (method, host, path, status, size, time). Clicking a flow splits the bottom panel into **Request | Response** tabs, each with sub-tabs: Pretty (parsed), Raw (bytes), Headers, Form, JSON, and for LLM-specific ones: **cURL**, **Markdown**, **Diff** (compare two requests).

**How it groups:** By flow; flows can be organized by host/session; mitmproxy has "streams" (grouped flows sharing a context).

**How it filters:** Text filter (matches host/path/headers/body), status filter, flow type; **URL history and "replay"** of a flow.

**What makes the UX good:**
- **The request/response pair is the atomic unit** — the whole value is juxtaposing what was sent vs. what came back, side by side.
- **Replay** — re-send a captured request with modifications (huge for debugging).
- Pretty/raw/headers/curl tabs are the standard everyone expects (the existing feature spec's "Bruno-like formats" borrows this).

### A.7 HyperDX / OpenObserve / Dozzle — log viewers (differential)

- **Dozzle:** a **live-tail** log list — essentially just a fast-scrolling, colorized, filterable stream. Great for "watch what's happening now," poor for structured analysis. The "Live tail" idea maps to a streaming Messages page.
- **OpenObserve:** logs + metrics + traces in one; SQL/PromQL query bar; **AI assistant that writes queries** for you; single-binary simplicity.
- **HyperDX:** session replay + logs + traces unified; **AI-powered log analysis** ("why did this error spike?").

Takeaway: the live-tail + AI-query-assistant pattern is increasingly expected; both are cheap to add (SSE for tail; existing `/api/analyze-error` model for natural-language query → SQL).

### A.8 Claude Code trace / Codex trace — conversation trees

**Layout pattern:** **3-panel master-detail**: left = session/conversation tree (branching, indented turns), center = turn list, right = detail of the selected turn (JSON, markdown, tokens). The canonical layout for LLM conversation browsing. Keyboard nav (↑/↓, Enter, ⌘⇧F), resizable panes, thinking blocks shown distinct from regular content.

**How it groups:** By **conversation (session)**, then by **turn**, then by message. Forking is visible as divergent branches (parent_message_id).

**How it filters:** In-session text search, filter by role/status.

**What makes the UX good:**
- **Conversation is the natural mental model** for chat traffic; a flat request log loses the story.
- Thinking blocks rendered distinctly (collapsed by default, gray) so reasoning doesn't drown out answers.
- Diff between consecutive requests in a conversation ("what changed between attempts").

### A.9 Open WebUI / LibreChat — chat transcripts

**Layout pattern:** Full-page chat transcript per session (bubbles/role-colored blocks), sidebar of sessions, inline tool-call blocks, per-message actions (copy, regenerate, edit).

**How it groups:** By session; messages within a session are **parent-linked** (LibreChat uses `parentId` for branching).

**How it filters:** Session search, message search within session.

**What makes the UX good:** The **readable transcript** — for a human, nothing beats a rendered conversation over raw JSON when the goal is *understanding what happened*. This is the "Markdown transcript" tab in the current spec, taken further into a full-page mode.

### A.10 GitHub PR review — diff-like view

**Layout pattern:** Files list on left, **unified/split diff** center, conversation threads inline on the right; comment threads anchored to specific lines; review state (comment/approve/request changes).

**How it groups:** By file, then by hunk, then by thread.

**How it filters:** Diff filter (all/changed/added/deleted), file filter, "viewed" checkbox state.

**What makes the UX good:**
- **Diffing is the highest-signal view for change** — applied to messages: *diff consecutive requests in a conversation* (what did the client change between attempts?) or *diff the same prompt across two models* (A/B). The existing spec already names this (cc-viewer's killer feature).
- **Inline threading** — comment on a specific hunk; for messages: attach a note/triage state to a specific request or a specific part of the payload.

---

## B. Filter dimensions used by observability tools

### B.1 The common dimension set (what LangSmith/Langfuse/Helicone/OpenLLMetry/W&B Weave/AgentOps share)

| Dimension | LangSmith | Langfuse | Helicone | OpenLLMetry (OTel) | Notes |
|---|---|---|---|---|---|
| **trace_id** | ✅ | ✅ | ✅ (request_id) | ✅ `trace_id` | The atomic request unit. OTel: `trace_id`/`span_id` |
| **session_id / thread** | ✅ | ✅ sessions | ✅ `Helicone-Session-Id` | session.id | Multi-turn grouping; propagated client-side |
| **user_id** | ✅ | ✅ | ✅ `Helicone-User-Id` | user.id | Who triggered it |
| **project** | ✅ | ✅ | org/project | deployment.environment | Which app/project it belongs to |
| **application / version / release** | ✅ releases | ✅ releases & versions | ✅ property | service.version | Which deploy of the client |
| **environment** | ✅ | ✅ | ✅ property | deployment.environment | prod/staging/dev |
| **model / provider** | ✅ | ✅ | ✅ | gen_ai.* (OTel gen_ai attributes) | Model + provider are core OTel gen_ai attributes |
| **prompt/response type** | ✅ | ✅ generation types | ✅ | gen_ai.operation.name | chat vs completion vs embedding vs image |
| **latency buckets** | ✅ | ✅ | ✅ | span duration | OTel has duration; tools bucket it |
| **token ranges** | ✅ | ✅ | ✅ | token usage | prompt/completion/cached/reasoning breakdown |
| **cost** | ✅ | ✅ | ✅ | (derived) | OTel has no cost standard — tools derive from usage + price table |
| **tags / labels** | ✅ | ✅ | ✅ `Helicone-Property-*` | attributes | Free-form k/v, indexable, clickable facets |
| **custom metadata** | ✅ | ✅ | ✅ | attributes | Arbitrary JSON |
| **error type / category** | ✅ | ✅ | ✅ | status + attributes | OTel: span status; LLM tools categorize |
| **feedback / evals** | ✅ | ✅ | ✅ | (non-standard) | Human/AI scores on traces |

### B.2 Where each is captured — gateway vs client

- **Client-side (SDK) capture (LangSmith, Langfuse, OpenLLMetry, Weave, AgentOps):** SDK wraps the call; it knows `session_id`, `user_id`, `project`, `tags`, `metadata`, `release`, `environment` because the *application code* supplies them. It does **not** know the provider's actual account, the API key used, the client's real IP, or the routing decisions.
- **Gateway capture (Helicone, 9Router, OpenRouter):** sees the **wire**: `Authorization` header (which API key), client `User-Agent`, client IP, request path, `HTTP-Referer`/`X-Title` app attribution, custom `x-*` headers, and (for 9Router specifically) the full **routing chain** (router → combo → account → fallback) since the gateway *is* the router.
- **The critical insight:** client-side tools are *richer in app-level semantics* (eval scores, feedback, project) but *blind to transport and routing*. A gateway can capture both by **reading the standard headers clients already send** — no client changes required.

### B.3 Standard headers clients already send (source-app identification)

Researched from actual SDK source (openai-node `client.ts`):

| Header | Sent by | Value | Used for |
|---|---|---|---|
| `User-Agent` | **Everything** (openai-node: `OpenAI/JS <version>`; openai-python: `OpenAI/Python <version>`) | SDK/version | Identify SDK + version |
| `Authorization: Bearer <key>` | OpenAI SDKs, LangChain, Vercel AI SDK, curl | API key | **Which API key made the call** (gateway-only dimension) |
| `OpenAI-Organization` | openai-node | org id | Org attribution |
| `OpenAI-Project` | openai-node | project id | **Project attribution** |
| `HTTP-Referer` | OpenRouter-style clients | site URL | App/site attribution |
| `X-OpenRouter-Title` | OpenRouter-style clients | app name | **App name** (leaderboard attribution) |
| `x-conversation-id` | OpenRouter-style / custom clients | conversation id | **Conversation grouping** (9Router already reads this!) |
| `Helicone-User-Id` | Helicone SDK | user id | User attribution |
| `Helicone-Session-Id` | Helicone SDK | session id | Session/thread grouping |
| `Helicone-Property-*` | Helicone SDK | arbitrary k/v | **Custom metadata → facets** (multi-property: environment, app, feature) |
| `Helicone-Prompt-Id` / `Helicone-Prompt-Name` | Helicone SDK | prompt id | Prompt version attribution |
| `Helicone-Session-Path` | Helicone SDK | route path | Where in the app the call happened |

**Known client User-Agents (worth fingerprinting in 9Router):** `Claude-Code/*` (Claude Code CLI), `Cursor/*` (Cursor), `Codex/*` / `codex-cli` / `droid` (Codex CLI — note `streamingHandler.js` already special-cases `droid`/`codex-cli` in the UA), `OpenAI/JS` / `OpenAI/Python` (raw SDKs), `langchain/*` or `langchainjs` (LangChain), `vercel-ai-sdk/*` (Vercel AI SDK), `undici`, `node-fetch`, `curl/*`, `OpenWebUI/*`, `LiteLLM/*` (proxies), `PyCharm` / JetBrains AI, `Continue`, `LobeChat`, `CherryStudio` (Cherry Studio), `LibreChat`. A UA fingerprint → "source app" table is very cheap (regex list) and is the single highest-value filter for "which app is hammering my gateway."

---

## C. Capture dimensions 9Router can add (gateway-only superpowers)

9Router already stores (audited `requestDetailsRepo.js`, `usageRepo.js`, `chat.js`): provider, model, connectionId, status, conversationId, latency, tokens, cost, errorCategory, request/providerRequest/providerResponse bodies, pxpipe stats, and `meta.taskType` (smart-router classification, e.g. `code:generation`, `reasoning`, `general_chat`). The full client API key is already stored on `usageHistory.apiKey` (masked only at read time by `maskApiKey`).

### C.1 Already capturable with ~zero code (present on the wire today)

| Dimension | Where it's available today | Effort |
|---|---|---|
| **API key used** | `request.headers.get("Authorization")` → already parsed in `chat.js:57`; `usageHistory.apiKey` already stores it | 0 (just surface in UI, masked) |
| **Client IP** | `custom-server.js` already computes a **trusted, unspoofable** IP into `x-9r-real-ip` (used by dashboardGuard/loginLimiter) — currently not forwarded into chat.js capture | Low (read header in chat.js → store) |
| **User-Agent / source app** | `request.headers.get("user-agent")` already read in `chat.js` (browsed as `userAgent`, passed to chatCore) but **not persisted** | Low (add to buildRequestDetail) |
| **Conversation id** | Already captured (`x-conversation-id` header / `extra_body.conversation_id`) | 0 |
| **Smart-router task type** | `meta.taskType` in usageHistory (chat.js:96 threads it) | Low (also denormalize onto requestDetails) |
| **Model fallback chain / attempts** | Combo/fallback data flows through handleComboChat; per-attempt status may already be in data (fallbackChain mentioned in log-viewing research) | Low-Medium (persist `attempts[]`) |

### C.2 Needs small capture additions

| Dimension | How to capture | Notes |
|---|---|---|
| **Combo name** | `comboName` already threaded through `handleComboChat` (chat.js:123/139/160) — persist it on the detail | "Which combo served this request" |
| **Route taken** | Build a `route: { router → combo → account → fallback }` chain at each decision point (smartRouter → combo engine → credential loop → model fallback) | Evidence-Bound Provenance (already in spec §5) |
| **Provider account/connection** | `connectionId` already stored ✅ — plus account health at decision time (rate-limited? refreshed?) | Low |
| **`x-project` / `x-app` / `x-9r-client`** | Read and persist custom headers (OpenRouter `HTTP-Referer`/`X-OpenRouter-Title` too) | Low; sanitize/allowlist names |
| **Request path/endpoint** | `endpoint` already on usageHistory; add to requestDetails for `/v1/chat/completions` vs `/v1/embeddings` etc. | Low |
| **Origin/Referer** | `Origin`/`Referer` headers (browser clients) | Low; careful with privacy |
| **SDK fingerprint** | Regex on User-Agent (see B.3 list) → `sourceApp` field | Low |

### C.3 Standardized capture recommendations

1. **Denormalize gateway dimensions onto `requestDetails` as first-class columns** (or a `meta` JSON): `apiKeyId` (FK to apiKeys table or hashed key id, **never raw key**), `clientIp`, `userAgent`, `sourceApp`, `comboName`, `taskType`, `route`, `endpoint`. Rationale: Langfuse denormalizes trace-level attributes onto every observation for fast filtering — do the same.
2. **Fingerprint source apps via a small UA regex table** (`src/lib/constants/sourceApps.js`) — one switch statement, huge filter value.
3. **Add an `apiKeys` join**: 9Router has an `apiKeys` table (`schema.js:78`) with friendly names — join key hash → key name so the Messages page shows "key: my-integration-key" not a secret.

---

## D. Concrete recommendations

### D.1 Three distinct view designs (beyond the current list + conversations)

Each view is a *rendering of the same data model* (Linear/Notion "views, not modes" philosophy — A.4). All three can share the existing `/api/messages` data + filters.

---

#### View 1 — **Timeline / Waterfall View** ("What happened, when")

**Design philosophy:** Sentry's frequency chart + Datadog's histogram as the primary navigation primitive (A.1, A.2); Langfuse's waterfall (A.3).

**Layout:**
- Top: **request volume histogram** (requests/min, colored by status — green/amber/red stack). Click a bucket to zoom the time window.
- Middle: **facets row** (clickable chips with counts: provider, model, status, errorCategory, sourceApp, taskType — click to filter, Datadog-style derived facets).
- Bottom: **chronological timeline** — each request is a horizontal bar/gantt row: `[TTFT ▓▓ total ▓▓▓▓▓]` proportional to latency, colored by status, labeled with model + conversation snippet. Overlapping requests on the same conversation share a row-group.

**What it's good for:** Finding *spikes and outliers* — "there was a 4-second error burst at 14:32"; spotting slow requests (long bars) at a glance; live-tail mode (A.7 Dozzle) where new bars stream in.

**Key UI elements:** histogram, facet chips, gantt rows, live-tail toggle, zoom-to-window, per-row status coloring.

---

#### View 2 — **Trace Tree View** ("How one request flowed")

**Design philosophy:** LangSmith/Langfuse trace tree + Claude Code 3-panel conversation tree (A.3, A.8).

**Layout:**
- **Left panel: conversation/session tree** — sessions as root nodes (collapsible), turns nested, **branches visible via `parent_message_id`** (forks = divergent children).
- **Center panel: request chain** for the selected turn — rendered as a **vertical route chain** `router → combo → account → fallback` (each hop a row with status, latency, model, account health), per spec §5. Plus sibling/adjacent requests in the same conversation.
- **Right panel: detail** — the existing format tabs (pretty/raw/headers/curl/markdown).

**What it's good for:** *Debugging one request end-to-end* — "why did this turn route to provider X on account Y after two fallbacks?"; conversation-level analysis (token/cost/latency rollups per session); understanding forks/retries.

**Key UI elements:** session tree with forks, route-chain breadcrumb, per-session stats header (tokens, cost, P50/P95 latency, model mix), collapse-able thinking blocks, diff-adjacent-requests.

---

#### View 3 — **Board / Kanban Triage View** ("What needs my attention")

**Design philosophy:** Linear/Notion board (A.4) × Sentry error inbox workflow (A.1) — *a triage queue, not a log*.

**Layout:**
- **Columns = triage state:** `New → Investigating → Resolved → Snoozed` (Sentry's open/resolved/snoozed, spec §6).
- **Cards = grouped issues** (fingerprinted by `provider + model + errorCategory + normalized error`), each showing: error message, count of occurrences, first/last seen, mini sparkline of frequency, top sourceApp/API-key tag.
- **Drag card between columns** = change triage state (Linear muscle memory).
- Per-card expand: per-occurrence list (each opens the detail view); "Analyze" button (existing `/api/analyze-error`); snooze-with-timer.
- Optional second board axis: **by provider/account** (columns = account, cards = requests) for capacity/rate-limit triage.

**What it's good for:** *Day-to-day ops* — "what broke, what's still broken, what did I already dismiss." Turns the error inbox from a filter into a workflow with state.

**Key UI elements:** kanban columns, fingerprint-grouped cards, sparklines, drag-to-triage, snooze timers, batch analyze, occurrence drill-down.

---

**Why three views and not one:** each answers a different question — Timeline = *when/what's anomalous*, Trace Tree = *why did this specific request behave that way*, Board = *what do I need to fix*. All three reuse the same data and filters; the board needs the error inbox state (spec §6), the tree needs parent_message_id (spec §7), the timeline needs only the histogram + facets on existing data (cheapest to build — great first step).

### D.2 Five+ additional filter dimensions (buildable with data we have or can capture trivially)

1. **API key used (masked)** — `usageHistory.apiKey` exists; join to `apiKeys.name`. Filter: "which integration key made these calls" — answers *cost attribution by app* when one app uses one key.
2. **Source app (UA fingerprint)** — capture `user-agent` → regex table → `sourceApp`. Filter: "what is Cursor sending me" / "is Claude Code using the combo path". **Highest-value new dimension.**
3. **Client IP (trusted, from `x-9r-real-ip`)** — already computed in custom-server.js; one line to persist. Filter by exact IP or **CIDR** (Datadog's `CIDR()` pattern — great for "all requests from my dev machine" vs "from the server").
4. **Smart-router task type** — `meta.taskType` exists (`code:generation`, `reasoning`, `general_chat`…). Filter: "how much traffic is code:generation vs chat" — reveals workload mix; also enables task-type cost analysis.
5. **Combo name + route chain** — `comboName` is threaded in chat.js; persist it. Filter: "which combos are winning/losing" and "requests that fell back N times" (fallback chain length). 
6. **Latency / token / cost ranges** — numeric range filters (Datadog `@http.response_time:>100` / `[400 TO 499]` pattern): `latency_ms:>5000`, `tokens:[10000 TO 50000]`, `cost:>0.1`. Cheapest possible filter (pure SQL WHERE on existing columns); catches expensive/slow outliers.
7. **Endpoint / request type** — `/v1/chat/completions` vs `/v1/embeddings` vs `/v1/responses`; filter by operation (OTel `gen_ai.operation.name` equivalent).
8. **errorCategory** — already in data; expose as a facet (currently only used in status tooltips).
9. **(Stretch) `x-project` / `x-app` / `x-9r-client` / `Helicone-Property-*` custom headers** — capture any `x-9r-*` / `x-project` / `x-app` header into a `metadata` JSON and render as derived facets. Lets each client self-identify (OpenRouter `HTTP-Referer`/`X-OpenRouter-Title` too).

### D.3 Five specific visual/UX improvements to the current list + detail

1. **Facet sidebar + histogram header (Datadog-style).** Add a collapsible left rail listing *derived facets with counts* (provider, model, status, errorCategory, sourceApp, taskType, API key name) that filter on click, and a compact 24h request-volume histogram above the table with click-to-zoom. This single change transforms "blah table" into "observability tool."
2. **Status-colored latency/token bars in rows.** Add thin inline bars (latency proportional width, tokens as a two-tone prompt/completion bar) instead of bare numbers — the eye catches outliers instantly (Langfuse/gantt affordance). Also right-align numbers for scanability.
3. **Conversation chips, not truncated IDs.** Replace the truncated `conversationId` column with a **first-N-chars chip + full ID on hover/title** and a "jump to conversation" affordance that switches to the conversations view filtered to that ID. Group rows of the same conversation with a subtle alternating background.
4. **Detail drawer → three improvements borrowed from research:**
   - **"Related" panel** (Obsidian backlinks, A.5): in the drawer, show other messages sharing this conversation / API key / errorCategory / combo — one click pivots. This is the highest-leverage drawer addition.
   - **Diff-adjacent button**: "diff with previous request in conversation" (GitHub PR view, A.10; cc-viewer).
   - **Event Highlights-style top strip** (Sentry, A.1): promote the *diagnostic* fields (sourceApp, combo, taskType, API key name, client IP) to a compact strip above the meta grid, not buried in JSON tabs.
5. **Empty-state + density polish:** show a meaningful empty state ("No messages yet — send a request through 9Router"); allow row density (comfortable/compact) and column customization (which columns show) — Linear's "views" affordance makes the page feel intentional instead of default.

### D.4 Risks & privacy guardrails for capturing IP / API keys / headers

| Risk | Guardrail |
|---|---|
| **API key exfiltration** — storing full keys on `usageHistory.apiKey` is already a latent risk | Store only a **key fingerprint/id** (e.g. first-8 + sha256 suffix, or FK to `apiKeys` id) going forward; always mask in UI (existing `maskApiKey`); never include raw keys in exports; consider a migration to hash existing values |
| **Client IP = PII** (esp. for EU/enterprise users) | Make IP capture **opt-in** (settings flag, off by default, mirroring `x-9r-privacy: redact|off` from spec §9); store only on loopback/local installs by default; support IP anonymization (drop last octet) or CIDR-level storage |
| **User-Agent/Referer leakage** | UA is low-risk but can fingerprint a person's exact toolchain; `Referer`/`Origin` can leak internal URLs → capture only a **fingerprinted sourceApp** class, not the raw UA string (store raw UA only under opt-in) |
| **Custom header injection** (`x-9r-client`, `Helicone-Property-*`) | **Allowlist header names** (never echo arbitrary headers); cap value length (mirror `observabilityMaxJsonSize` = 5KB cap); sanitize before render (spec §9 untrusted-content rule) |
| **Sensitive content in captured bodies** (already the big one) | Existing mitigations apply + extend: per-request `x-9r-privacy: redact|off` (spec §9.2), zero-retention toggle, system-prompt ACLs, retention janitor |
| **Rate-limit/IP bypass** — if IP becomes a filter dimension, ensure storing it doesn't reintroduce XFF spoofing | Always use the **trusted `x-9r-real-ip`** computed in custom-server.js (socket-derived, loopback-proxy-only trust) — never client-supplied `X-Forwarded-For` directly |
| **Dashboard auth** | All new dimensions are only visible to authenticated dashboard users (dashboardGuard deny-by-default); capture happens server-side regardless of UI |

**Design rule of thumb:** make every new capture dimension **opt-in by default-off** (settings flag), **allowlisted where possible** (headers, UA classes), and **masked/anonymized in UI** (keys, IPs). The Messages page should show *which* capture tier each row was recorded under (full / redacted / minimal) so privacy behavior is visible, not hidden.

---

## Appendix — quick references

- **9Router current capture:** `requestDetails` (schema.js:140) + `usageHistory` (schema.js:104, incl. `apiKey`, `meta.taskType`, `conversationId`) + `apiKeys` (schema.js:78). Buffered writer `requestDetailsRepo.js`, `saveRequestUsage` in `usageRepo.js:241`.
- **Spec to extend:** `plans/messages-page-feature-spec.md` (§4 list features, §5 detail, §6 error inbox, §7 conversation tree, §9 privacy).
- **Trusted IP already computed:** `custom-server.js:38-61` → `x-9r-real-ip` (socket-derived, strips client XFF).
- **SDK UA formats:** openai-node `OpenAI/JS <version>` (client.ts `getUserAgent()`); openai-python `OpenAI/Python <version>`; 9Router already special-cases `droid`/`codex-cli` UAs (streamingHandler.js).
- **Header conventions:** OpenRouter `HTTP-Referer` + `X-OpenRouter-Title` (app attribution); Helicone `Helicone-User-Id` / `Helicone-Session-Id` / `Helicone-Property-*` (from Helicone/helicone source); `x-conversation-id` already read by 9Router (chat.js:334).
