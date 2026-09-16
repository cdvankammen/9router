# Message-Driven Tool-Building — Implementation Plan

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #messages #observability #filter #build #record #identity #milestones

## Scope

**In scope:**
- Make every field of the captured `requestDetails.data` blob a first-class dimension for **Filter / Build / Record / More options**
- Hot-path facet extraction + indexing (Option 3) for the top ~15 dimensions users actually filter on
- Long-tail JSON-path query language (Option 2) for arbitrary queries on `data` via SQLite JSON1
- Identity as a first-class dimension: extend `detectClientTool`, IDE detection, trusted `X-9R-App/User/Session` headers (consuming governance M1's trust model)
- Annotations (tags/star/notes), saved views, per-message actions, webhook/script hooks, conversation-level tooling
- Truncation surfacing in the UI

**Out of scope (v1):**
- Implementing the governance plan's M1 header trust model itself (this plan *consumes* it)
- Visual query builder UI (JSON-path text input + saved views first; builder later)
- Cloud sync of annotations/saved views (local SQLite first)
- Multi-instance/Redis-backed anything (single-node local-first, matching webhook plan)

## Milestones

Each milestone is independently verifiable.

### M1 — Facet extraction + indexing (hot path)

**Files touched:**
- `src/lib/db/migrations/` — new migration: `message_facets` table
- `src/lib/db/repos/requestDetailsRepo.js` — populate facets at capture time
- `src/app/api/messages/route.js` — new filter params backed by indexed columns

**Acceptance criteria:**
- `message_facets` columns: `request_id` FK, `has_tools`, `tool_count`, `has_thinking`, `thinking_tokens`, `image_count`, `truncated`, `latency_ms`, `prompt_tokens`, `completion_tokens`, `cost_usd`, `source_app`, `client_tool`, `ide`, `error_category`, `request_params` (JSON)
- Indexed columns → fast, pagination-correct filtering
- New API params: `latencyMin/Max`, `tokensMin/Max`, `costMin/Max`, `hasTools`, `hasThinking`, `truncated`, `clientTool`, `ide`
- Facet counts per value (like the error inbox) for a facets UI

### M2 — JSON-path query language (long tail)

**Files touched:**
- `src/lib/db/repos/requestDetailsRepo.js` — `jsonPath` filter using SQLite JSON1 (`json_extract`)
- `src/app/api/messages/route.js` — `jsonPath` param
- `src/lib/db/queryParser.js` (new) — small parser + validation

**Acceptance criteria:**
- `?jsonPath=request.tools` / `?jsonPath=latency.total>5000` works
- Parameterized queries only (no string interpolation into SQL) — injection-safe
- Rate-limited / validated (whitelist of operators, field path length cap)
- Composable with existing filters

### M3 — Identity as a first-class dimension

**Files touched:**
- `open-sse/utils/clientDetector.js` — extend `detectClientTool` with governance M1 list (Aider, Cline, Roo Code, Windsurf, Zed, Warp, Continue, OpenRouter SDK) + IDE detection (VS Code / JetBrains / Neovim / Zed / Warp / terminal)
- `src/lib/sourceApps.js` — verify existence; add agent rules if missing
- `src/lib/db/repos/requestDetailsRepo.js` — store `client_tool`, `ide` facets

**Acceptance criteria:**
- `detectClientTool` covers 12+ tools + IDE level
- `clientTool` / `ide` filterable server-side
- Trusted `X-9R-App/User/Session` headers consumed post-auth (governance M1 dependency)

### M4 — Annotations + saved views

**Files touched:**
- `src/lib/db/migrations/` — new migration: `message_annotations` + `saved_views` tables
- `src/lib/db/repos/annotationsRepo.js` (new) — CRUD
- `src/lib/db/repos/savedViewsRepo.js` (new) — CRUD
- `src/app/api/messages/[id]/annotations/route.js` (new) — tag/star/note
- `src/app/api/saved-views/route.js` (new) — named, shareable queries

**Acceptance criteria:**
- `message_annotations`: `request_id`, `conversation_id`, `kind` [tag/star/note], `value`, `created_at`
- `saved_views`: `name`, `filter` JSON, `created_at`
- Retention story: annotations/saved views survive `requestDetails` cap (orphan cleanup or FK cascade — decide in ADR)

### M5 — Per-message actions + webhook/script hooks

**Files touched:**
- `src/app/api/messages/[id]/actions/route.js` (new) — action menu backend
- `src/app/api/hooks/route.js` (new) — webhook/script hook with message-field template expansion
- `src/app/(dashboard)/dashboard/messages/components/` — action menu UI (copy cURL exists, export exists, replay, summarize, send-to-webhook, add-note, tag, alert-on-match)

**Acceptance criteria:**
- Per-message action menu: copy cURL, export, replay, summarize, send-to-webhook, add-note, tag, alert-on-match
- `POST /api/hooks` with template expansion (`{{model}}`, `{{sourceApp}}`, `{{conversationId}}`)
- Webhooks opt-in per message type; never send raw `Authorization` (already stripped)
- Conversation-level: export thread, summarize thread, fork/replay, per-conversation annotations

### M6 — Truncation surfacing + UI

**Files touched:**
- `src/app/(dashboard)/dashboard/messages/page.js` + components — surface `_truncated` flag prominently
- `src/app/(dashboard)/dashboard/messages/components/` — facets UI, saved views UI, action menus

**Acceptance criteria:**
- `_truncated` flag visible in list + detail (badge/notice), not silent
- Facets sidebar with counts per value
- Saved views dropdown + apply
- Action menus wired to M5 backend

## Dependencies & risks

- **Governance M1** (trusted headers, key metadata) — this plan consumes it; if not implemented, M3's trusted-header part is blocked (fallback: UA-only detection)
- **`src/lib/sourceApps.js`** — **verified 2026-09-15**: exists with 22 UA rules; governance M1's Aider/Cline/Roo Code/Windsurf/Zed/Warp/OpenRouter SDK still missing (M3 adds them)
- **JSON1 availability** — already used for errorCategory/sourceApp filtering, so low risk; sql.js fallback needs LIKE fallback (existing pattern)
- **Retention cap** — annotations/saved views must survive `requestDetails` cap; orphan cleanup decision needed (ADR)
- **Injection** — JSON-path must be parameterized; whitelist operators; rate-limit
- **Privacy** — log content is untrusted input; sanitize before render/analyze (existing `sanitizeHeaders` + `analyze-error` patterns); truncation surfaced not silent

## Open decisions (from research open questions)

1. **JSON-path exposure** (research Q1): raw text input + saved views first; UI query builder later (out of scope v1).
2. **Facet extraction timing** (research Q2): capture-time (M1) — query-time adds latency; capture-time schema is the committed part.
3. **Annotations storage** (research Q3): local SQLite first; cloud sync deferred (out of scope v1).
4. **Retention story** (research Q4): annotations/saved views survive `requestDetails` cap — orphan cleanup vs FK cascade, decide in implementation (ADR).
5. **Build primitives surface** (research Q5): dashboard-only for v1; CLI/MCP exposure deferred — revisit after M5.
6. **IDE detection depth** (research Q6): VS Code / JetBrains / Neovim / Zed / Warp / terminal from UA patterns; opt-in client headers for precision (governance M1 dependency).
7. **Trusted-header ownership** (research Q7): governance owns the header trust model; this plan consumes it (M3).

## Related

- Research: `../research/9router/38-message-driven-tools-research.md`
- Prior capture research: `../research/message-capture-deep-research-v2.md`, `../research/message-capture-v4-deep-pass.md`, `../research/message-capture-gaps-and-risks.md`, `../research/message-viewer-design-philosophies.md`
- Attribution: `../research/2026-08-31-message-origin-and-destination-research.md`
- Feature spec: `messages-page-feature-spec.md`
- Governance: `2026-08-31-source-app-governance-plan.md`
- Decisions: `../tracking/decisions/ADR-007` (JSON blob vs table), `../tracking/decisions/ADR-002` (conversation tracking), `../tracking/decisions/ADR-010-message-driven-tools-hybrid-design.md` (Option 4 hybrid design)