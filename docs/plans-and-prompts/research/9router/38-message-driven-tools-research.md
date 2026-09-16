# Research — Message-Driven Tool-Building in 9Router: Anatomy, Identity, Filter/Build/Record Opportunities

**Date:** 2026-09-14
**Author:** GitHub Copilot (main session)
**Status:** active
**Tags:** #research #messages #observability #tools #ide-detection #agent-identity #filtering #recording #requestDetails

## Question / objective

The user wants 9Router to become a **platform for building tools on top of its own message traffic**:

1. **Look at messages per conversation** — conversation-scoped views of every captured request (already partially built; catalog exactly what exists).
2. **Use everything found in a message request** — every field of the captured payload (headers, body, metadata, response, tokens, cost, latency, error) must be usable for **filtering, building, recording, and more options**.
3. **Use IDE/agent information** — identify which IDE/agent (VS Code, Claude Code, Codex, Gemini CLI, Cursor, etc.) produced each request, and make that a first-class dimension.
4. **Create a home for this idea** — research + plan docs in `docs/plans-and-prompts/`, well organized, capturing everything found, interpreted, and reasoned about (why/how/where/what/when).

This note is the **ground-truth catalog + design-space exploration**. It feeds the companion plan: `../../planning/message-driven-tools-plan.md`.

## Sources consulted

- Code — capture pipeline:
  - `open-sse/handlers/chatCore/requestDetail.js` — `buildRequestDetail()`, `extractRequestConfig()`, `extractUsageFromResponse()`, `computeCost()` (the exact shape of a captured record)
  - `src/lib/db/repos/requestDetailsRepo.js` — buffered writer, `sanitizeHeaders()`, FTS5 index, retention cap, `truncateField()`
  - `src/lib/db/schema.js` — `requestDetails` table columns + indexes
  - `src/sse/handlers/chat.js` — conversationId resolution (header → `extra_body.conversation_id` → generated), userAgent extraction, combo/fallback flow
  - `src/lib/usageDb.js` — re-export shim for the repo
- Code — identity:
  - `open-sse/utils/clientDetector.js` — `detectClientTool()` (UA + `x-app` + `openai-intent` + `x-initiator` + `originator` + body `userAgent`), `isNativePassthrough()`
  - `open-sse/providers/registry/*.js` — per-provider `userAgent` constants (github `GitHubCopilotChat/0.38.0`, codebuddy `CLI/2.63.2`, antigravity `ANTIGRAVITY_IDE_USER_AGENT`, …)
  - `src/lib/auth/trustedPeer.js`, `src/lib/auth/loginLimiter.js`, `src/lib/middleware/headerSanitizer.js` — `x-9r-real-ip` trust model
  - `src/dashboardGuard.js`, `cli/src/cli/api/client.js` — `x-9r-cli-token` (CLI identity)
  - `src/app/api/v1/models/route.js` — `x-9r-internal-models-fetch`
  - `src/sse/handlers/videoGeneration.js` — `x-9router-connection-id`
- Code — API/UI surface:
  - `src/app/api/messages/route.js` — filters: `page, pageSize, cursor, view=conversations|errors, provider, model, status, errorCategory, sourceApp, conversationId, search, startDate, endDate`
  - `src/app/api/messages/[id]/route.js` — detail + formats
  - `src/app/api/export/requests/route.js` — export
  - `src/app/api/analyze-error/route.js` — AI error analyst
  - `src/app/(dashboard)/dashboard/messages/page.js` + `components/{BoardView,InboxView,TraceTreeView}.js` — UI views
  - `src/app/(dashboard)/dashboard/usage/components/RequestDetailsTab.js` — legacy detail tab
- Docs:
  - `../message-capture-deep-research-v2.md`, `../message-capture-v4-deep-pass.md`, `../message-capture-gaps-and-risks.md`, `../message-viewer-design-philosophies.md` — prior capture research
  - `../2026-08-31-message-origin-and-destination-research.md` — attribution dimensions
  - `../planning/messages-page-feature-spec.md` — the messages page spec (P1–P7 principles)
  - `../planning/2026-08-31-source-app-governance-plan.md` — source-app governance (M1 attribution, agent identity)
  - `../tracking/decisions/ADR-007` — messages JSON blob vs. table decision
  - `../tracking/decisions/ADR-002` — observability conversation tracking

## Raw findings

### A. What a captured message request actually contains (ground truth)

Every captured request is one row in `requestDetails` (SQLite). The **columns** (`src/lib/db/schema.js`):

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT PK | `{ISO-timestamp}-{random6}-{model-slug}` (generated in `generateDetailId`) |
| `timestamp` | TEXT | ISO 8601 |
| `provider` | TEXT | upstream provider id |
| `model` | TEXT | resolved model actually served |
| `connectionId` | TEXT | account/credential id used |
| `status` | TEXT | `success` / error status |
| `data` | TEXT | **the fat JSON blob — wire-faithful record** |
| `conversationId` | TEXT | grouping key (see below) |

Indexes: `timestamp DESC`, `provider`, `model`, `connectionId`, `conversationId`.

The **`data` blob** is built by `buildRequestDetail()` (`open-sse/handlers/chatCore/requestDetail.js`):

```js
{
  provider, model, connectionId, timestamp,
  latency: { ttft, total },          // ms
  tokens: { prompt_tokens, completion_tokens, cached_tokens?, reasoning_tokens?, ... },
  request: {                          // the CLIENT request (sanitized headers)
    messages: [...],                  // or input: [...] (responses API)
    model, stream,                   // + OPTIONAL_PARAMS: temperature, top_p, top_k,
    ...                               // max_tokens, thinking, tools, tool_choice,
  },                                  // response_format, metadata, user, n, logprobs, ...
  providerRequest,                    // what was actually sent upstream (post-translation)
  providerResponse,                   // raw upstream response
  response: { content, thinking?, error?, ... },  // normalized response
  pxpipe,                             // passthrough pipe metadata (if used)
  status, conversationId, errorCategory,
  sourceApp,                          // detected source app (see §B)
  userAgent,                          // raw UA string
  url,                                // upstream URL (for cURL export)
  cost, costProvenance, pricingModel, // per-request USD cost + provenance
}
```

Key facts:

- **`request.headers` are sanitized at flush time** (`sanitizeHeaders` deletes keys containing `authorization`, `x-api-key`, `cookie`, `token`, `api-key`). Everything else survives — including `user-agent`, `x-app`, `openai-intent`, `x-initiator`, `originator`, `x-conversation-id`, `x-9r-*` headers, `x-9router-*` headers.
- **`data` is truncated** at `maxJsonSize` (default 5 KB, configurable via `observabilityMaxJsonSize` / `OBSERVABILITY_MAX_JSON_SIZE`) → `{ _truncated: true, _originalSize, _preview }`. Large tool results / images can truncate.
- **Retention cap** `maxRecords` (default 200, `observabilityMaxRecords`) — oldest rows dropped; `droppedRecordsCount` exposed via `/api/observability/status`.
- **FTS5 search index** (`requestDetails_fts`: id, conversationId, provider, model, status, content) with LIKE fallback on sql.js. Content = extracted message text + response + thinking + error, capped 20 KB.
- **Cost** is computed per request (`computeCost`) with provenance `exact | estimated | unavailable` and `pricingModel` label.
- **`conversationId` resolution order** (`src/sse/handlers/chat.js`): explicit `x-conversation-id` header (OpenRouter-style) → `extra_body.conversation_id` → generated. So conversations are already grouped per request.
- **`sourceApp`** is captured at request time (see §B) and is already a **server-side SQL filter** on `/api/messages` (`sourceApp` param, JSON1 filtering so pagination math stays correct).

### B. IDE / agent identification — what exists today

`open-sse/utils/clientDetector.js` — `detectClientTool(headers, body)` returns one of:

| Detected tool | Signals |
|---|---|
| `antigravity` | `body.userAgent === "antigravity"` |
| `github-copilot` | UA contains `githubcopilotchat` OR `openai-intent: conversation-panel` OR `x-initiator: user` |
| `claude` | UA contains `claude-cli` / `claude-code` OR `x-app: cli` |
| `gemini-cli` | UA contains `gemini-cli` |
| `codex` | UA contains `codex-tui` / `codex-cli` / `codex_cli_rs` / `codex desktop` OR `originator` starts with `codex_` |
| `deepseek-tui` | UA contains `deepseek-tui` |
| `null` | unknown |

`isNativePassthrough(clientTool, provider)` — native pairs: claude↔claude/anthropic, gemini-cli↔gemini-cli, antigravity↔antigravity, codex↔codex. Used for lossless passthrough decisions.

Additional identity signals in the codebase:

- **`x-9r-cli-token`** — CLI launcher identity (machine-id derived, `getConsistentMachineId(CLI_TOKEN_SALT)`), used by dashboardGuard + cli-tools APIs.
- **`x-9r-real-ip`** — stamped by `custom-server.js` from the TCP socket; trusted only from loopback reverse proxy (`trustedPeer.js`).
- **`x-9r-internal-models-fetch`** — internal models fetch marker.
- **`x-9router-connection-id`** — set on video generation responses.
- **`x-9r-password`** — profile password change.
- **Per-provider UA constants** in registry: `GitHubCopilotChat/0.38.0` (github), `CLI/2.63.2 CodeBuddy/2.63.2` (codebuddy-cn), `IDE/2.63.2 CodeBuddy/2.63.2` (codebuddy-intl), `ANTIGRAVITY_IDE_USER_AGENT` (antigravity), `AG_CLIENT_NAME` (search).
- **`bypassHandler.js`** — `handleBypassRequest(body, model, userAgent, ccFilterNaming)` — UA-aware bypass logic (Claude Code filter naming).
- **`src/lib/sourceApps.js`** — referenced by the source-app governance plan (M1) as the place to add agent rules (Codex, Gemini CLI, Aider, Cline, Roo Code, Windsurf, Zed, Warp, Continue, OpenRouter SDK, `X-9R-App` header override). **Verified 2026-09-15:** file exists with 22 UA rules; governance M1's Aider/Cline/Roo Code/Windsurf/Zed/Warp/OpenRouter SDK still missing — see plan M3.

**Gap:** `detectClientTool` covers ~6 tools; the governance plan's M1 lists ~12+ (Aider, Cline, Roo Code, Windsurf, Zed, Warp, Continue, OpenRouter SDK). No IDE-level detection (VS Code vs JetBrains vs Neovim) exists yet. No `X-9R-App` / `X-9R-User` / `X-9R-Session` trusted-header capture is implemented yet (planned in governance M1).

### C. What the Messages API already supports (filter/build/record surface)

`GET /api/messages` filters (all server-side SQL):

- `page`, `pageSize` (1–100), `cursor` (keyset)
- `view=conversations|errors` (default flat list)
- `provider`, `model`, `status`, `errorCategory`, `sourceApp`, `conversationId`
- `search` (FTS5 or LIKE), `startDate`, `endDate`

Responses: `messages` (flat, newest first, each = `requestDetails.data`), `conversations` (grouped: `{ conversationId, messages, tokens, cost, messageCount }`), `errors` (fingerprint groups: `{ fingerprint, provider, model, errorCategory, count, firstTimestamp, lastTimestamp, cost, sampleError, detailId }`), `searchMode`, `pagination`.

Detail: `GET /api/messages/[id]` — parsed `data` + `_id`. Export: `GET /api/export/requests`. AI analysis: `POST /api/analyze-error` (uses `getRequestDetailById`).

UI views (`src/app/(dashboard)/dashboard/messages/`): BoardView (rich client-side fingerprinting), InboxView (server-side error groups), TraceTreeView (conversation tree with breadcrumbs), plus the flat list + detail drawer in `page.js` (Pretty JSON / Raw / Headers / cURL / Markdown tabs).

### D. What is NOT yet possible (gaps this research opens)

1. **Filtering is limited to ~10 fixed dimensions.** Everything else in `data` (latency, tokens, cost, errorCategory, request params like `tools`/`temperature`/`max_tokens`, response content, thinking, truncation flag, `pxpipe`, `url`, `costProvenance`) is **not filterable server-side**. The UI does some client-side fingerprinting (BoardView) but that breaks pagination math.
2. **No JSON-path / field-level query language.** Can't ask "all requests where `request.tools` exists" or "`response.thinking` non-empty" or "`latency.total > 5000`".
3. **No saved views / queries / alerts.** The error inbox groups errors, but there's no way to save a filter as a named view, or get alerted when a query matches.
4. **No per-message actions / tool-building hooks.** You can view, export, analyze-error — but you can't *build* on a message: no webhook, no script hook, no "send this message to X", no template expansion from message fields.
5. **No message-level annotations.** Can't tag, star, comment, or attach notes to a message/conversation (needed for "record" workflows).
6. **No conversation-level tooling.** Conversations are grouped and viewable, but not exportable as a unit, not replayable, not summarizable, not forkable.
7. **Identity is under-captured.** `sourceApp` exists but the detector is narrow; IDE-level info, `X-9R-App/User/Session` trusted headers, and per-key identity are not yet wired (governance plan M1).
8. **Truncation is silent in the UI.** `_truncated` flag exists in data but the UI doesn't surface it prominently; large tool results are the common truncation case.
9. **No structured extraction of message content.** `extractFtsContent` exists for search, but there's no per-message structured extraction (roles, tool calls, tool results, thinking blocks, images, file references) exposed via API.

## Synthesis / conclusion

### The opportunity: "message-driven tool-building"

9Router already *is* the proxy — it sees every request with wire fidelity (P1 in the feature spec). The captured `data` blob is a **rich, structured event** with ~30+ usable fields. The product opportunity is to make **every field a first-class dimension** for:

- **Filter** — server-side, pagination-correct filtering on any field (latency, tokens, cost, params, content presence, identity, truncation).
- **Build** — compose new capabilities from message fields: cURL replay, conversation export, summaries, diffs, "send to webhook", template expansion (`{{model}}`, `{{sourceApp}}`, `{{conversationId}}`), script hooks.
- **Record** — annotations (tags/star/notes), saved views, alerts, per-conversation notebooks, structured extraction into a queryable store.
- **More options** — per-message action menus, conversation-level actions, identity-aware routing/limits (ties into the governance plan).

### Design space (options considered)

**Option 1 — Extend the fixed-filter API.** Add `latencyMin/Max`, `tokensMin/Max`, `costMin/Max`, `hasTools`, `hasThinking`, `truncated`, `sourceApp` (exists), `errorCategory` (exists), etc. as explicit query params.
- Pros: simple, pagination-correct, type-safe, fast to ship.
- Cons: every new dimension = new param; doesn't scale to "everything in the message".

**Option 2 — JSON-path query language.** `?jsonPath=request.tools` / `?jsonPath=latency.total>5000` using SQLite JSON1 (`json_extract`). SQLite has JSON1 built in (used already for errorCategory/sourceApp filtering).
- Pros: covers *everything* in `data`; one mechanism; composable with existing filters.
- Cons: needs a small parser + validation; injection risk if not parameterized (must use bound params, never string interpolation); UI needs a query builder to stay approachable.

**Option 3 — Extract-and-index layer.** A `message_facets` table (or columns) populated at capture time: `has_tools`, `tool_count`, `has_thinking`, `thinking_tokens`, `image_count`, `truncated`, `latency_ms`, `prompt_tokens`, `completion_tokens`, `cost_usd`, `source_app`, `client_tool`, `ide`, `error_category`, `request_params` (JSON). Indexed columns → fast, pagination-correct filtering.
- Pros: fast, indexable, survives retention, enables facets UI (counts per value like the error inbox).
- Cons: capture-time schema must be maintained; new fields need migration; duplicates data already in `data`.

**Option 4 — Hybrid (recommended).** Option 3 for the **hot path** (top ~15 dimensions users actually filter on, indexed, facet-counted) + Option 2 for **long-tail** (arbitrary JSON-path queries on `data` via JSON1, parameterized, rate-limited). This mirrors the existing pattern: `requestDetails` columns for hot filters + `data` JSON for everything else, and the error inbox's SQL-aggregation approach.

### Identity as a first-class dimension

- **Client tool** (Claude Code, Codex, Gemini CLI, Copilot, …) — extend `detectClientTool` with the governance plan's M1 list + IDE detection (VS Code / JetBrains / Neovim / Zed / Warp / terminal) from UA patterns.
- **Trusted identity headers** — `X-9R-App`, `X-9R-User`, `X-9R-Session` (governance M1) — only trusted after key auth, mirroring the `x-9r-real-ip` trust model.
- **Per-key identity** — API key metadata (governance M1) joins messages to keys.
- **Store** as facets (`client_tool`, `ide`, `source_app`, `key_id`) so filtering by "all Codex requests from VS Code" is one indexed query.

### Recording / building primitives

- **Annotations table** (`message_annotations`: request_id, conversation_id, kind [tag/star/note], value, created_at) — enables "record" workflows without touching `data`.
- **Saved views** (`saved_views`: name, filter JSON, created_at) — named, shareable queries.
- **Actions** — per-message action menu: copy cURL (exists), export (exists), replay, summarize, send-to-webhook, add-note, tag, alert-on-match.
- **Webhook/script hooks** — `POST /api/hooks` with message-field template expansion; the "build tools within 9Router" primitive.
- **Conversation-level** — export thread, summarize thread, fork/replay, per-conversation annotations.

### Privacy & safety (non-negotiable, per P5)

- Log content is untrusted input. Any new extraction/query/action path must sanitize before render/analyze (existing `sanitizeHeaders` + `analyze-error` patterns).
- JSON-path queries must be parameterized (no string interpolation into SQL).
- Webhooks must be opt-in per message type; never send raw `Authorization` (already stripped).
- Truncation must be surfaced, not silent.

## Confidence level

- **High** on the ground-truth catalog (§A–C) — read directly from source.
- **High** on the gaps (§D) — they follow directly from the API surface.
- **Medium** on the design-space options (§E) — Option 4 (hybrid) was a recommendation; **now decided in ADR-010** (`../tracking/decisions/ADR-010-message-driven-tools-hybrid-design.md`).
- **High** on `src/lib/sourceApps.js` existence — **verified 2026-09-15**: file exists (2,619 bytes), 22 UA rules (Claude Code, Cursor, Codex CLI, GitHub Copilot, OpenAI JS/Python SDK, LangChain, Vercel AI SDK, Open WebUI, LiteLLM, LobeChat, Cherry Studio, LibreChat, JetBrains, Continue, curl, Node fetch, axios, Postman, Insomnia, Hoppscotch, 9Router, Browser fallback). Governance M1's Aider/Cline/Roo Code/Windsurf/Zed/Warp/OpenRouter SDK still missing — see plan M3.

## Open questions

1. Should JSON-path queries be exposed raw (power users) or only via a UI query builder (safe default)? Both? → **Plan: raw + saved views first; builder later (out of scope v1)**
2. Facet extraction at capture time vs. query time — capture-time adds schema, query-time adds latency. Where's the line? → **Plan: capture-time (M1)**
3. Do annotations belong in SQLite (local) or should they sync with cloud sync (if enabled)? → **Plan: local SQLite first; cloud sync deferred**
4. What's the retention story for annotations/saved views when `requestDetails` rows are dropped by the cap? (FK cascade? orphan cleanup?) → **Plan: decide in implementation (ADR)**
5. Should "build" primitives (webhooks/script hooks) be dashboard-only or also exposed via the CLI/MCP surface? → **Plan: dashboard-only v1; CLI/MCP deferred**
6. IDE detection: how far to go (VS Code vs JetBrains vs Neovim vs terminal)? UA patterns are fuzzy; do we need opt-in client headers for precision? → **Plan: VS Code/JetBrains/Neovim/Zed/Warp/terminal from UA; opt-in headers for precision (governance M1)**
7. Does the `X-9R-App/User/Session` trusted-header design belong in this plan or the governance plan (M1)? (Recommend: governance owns the header trust model; this plan consumes it.) → **Plan: governance owns; this plan consumes (M3)**

## Related docs

- Companion plan: `../../planning/message-driven-tools-plan.md`
- Prior capture research: `../message-capture-deep-research-v2.md`, `../message-capture-v4-deep-pass.md`, `../message-capture-gaps-and-risks.md`, `../message-viewer-design-philosophies.md`
- Attribution: `../2026-08-31-message-origin-and-destination-research.md`
- Feature spec: `../planning/messages-page-feature-spec.md`
- Governance: `../planning/2026-08-31-source-app-governance-plan.md`
- Decisions: `../tracking/decisions/ADR-007` (JSON blob vs table), `../tracking/decisions/ADR-002` (conversation tracking), `../tracking/decisions/ADR-010-message-driven-tools-hybrid-design.md` (Option 4 hybrid design)