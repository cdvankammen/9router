# Deep Research — "Where do my messages come from?" + "Where do my messages go?"

**Date:** 2026-08-31
**Author:** Claude Code agent (main session)
**Status:** active
**Tags:** #research #observability #attribution #rate-limits #guardrails #identity #routing

## Objective

The user asked two questions about the 9router gateway:

1. **"Where do my messages come from?"** — which client apps, agents, users, and machines are hitting the gateway, and how can we attribute each request to its source?
2. **"Where do my messages go?"** — which upstream providers/models actually serve each request, and how can we control, cap, and audit that flow?

This doc records the raw research: what already exists in the 9router codebase, what the industry (OpenRouter, Anthropic, LiteLLM, MCP, agent tooling) does, and the design space for turning both questions into product features. It deliberately covers *all* plausible interpretations of the questions before any synthesis (see `../planning/` for the phased plan).

---

## Part A — What already exists in 9router

### A.1 Source-app fingerprinting (`src/lib/sourceApps.js`)

Already implemented and referenced by research docs (`message-viewer-design-philosophies.md` §B.3):

- `fingerprintSourceApp(userAgent)` maps a raw User-Agent to a stable class: `Claude Code`, `Cursor`, `Codex CLI`, `GitHub Copilot`, `OpenAI JS SDK`, `OpenAI Python SDK`, `LangChain`, `Vercel AI SDK`, `Open WebUI`, `LiteLLM`, `LobeChat`, `Cherry Studio`, `LibreChat`, `JetBrains`, `Continue`, `curl`, `Node fetch`, `axios`, `Postman`, `Insomnia`, `Hoppscotch`, `9Router`, `Browser`, `unknown`.
- **Privacy stance:** never stores the raw UA (can fingerprint a person's exact toolchain); only the class is persisted.
- Extensible via `addSourceAppRule(re, app)`.

**Gaps:** UA-only. No agent-identity headers, no per-key attribution, no per-user attribution, no machine/device dimension.

### A.2 Smart router task classification (`open-sse/services/smartRouter.js`)

- `classifyTask(messages)` — keyword/regex heuristics on the last user message → task types: `code:debugging`, `code:review`, `code:generation`, `agent:multi_step`, `math`, `reasoning`, `research_report`, `creative_writing`, `summarization`, `translation`, `data_analysis`, `document_processing`, `image_analysis`, `web_search`, `planning`, `general_chat`.
- `scoreModel(provider, modelId, taskType, costQualityTradeoff)` — capability-fit scoring with name-based heuristics (engine layer has no DB access; app layer applies real capability data via `getCapabilitiesForModel`).
- `selectModels(candidates, maxCandidates)` — top-N selection.
- `getStickySession` / `setStickySession` / `conversationFingerprint` — FNV-1a fingerprint of first system/user messages, 5-min TTL, max 500 entries, in-memory Map.
- App-layer wrapper `src/sse/services/smartRouter.js` resolves the `9router` virtual provider's model strings (`auto`, `best-code`, `best-chat`, `best-reasoning`, `best-cheap`) into real provider/model candidates **before** translation (pre-combo interception, avoids double-translation flaw). Threads `taskType` through to usage analytics (`meta.taskType`).

### A.3 Inbound rate limiter (`custom-server.rate-limiter.js`)

- Sliding-window counter per IP, in-memory, zero-dependency.
- Limits: `general` 120 req/min, `chat` 20 req/min; loopback bypasses all limits.
- 429 + `Retry-After` on limit.
- **Gaps:** no token-bucket semantics, no per-key/per-user limits, no per-model limits, no queueing, no spend caps, no response headers (`x-ratelimit-*`), no workspace/team dimension.

### A.4 Auth & API keys

- `JWT_SECRET` (session cookie), `INITIAL_PASSWORD` (default `123456` — must override), `API_KEY_SECRET`, `MACHINE_ID_SALT` (env contract in `.env.example` / ARCHITECTURE.md).
- Dashboard auth via session cookie; `/v1/*` gateway auth via API key.
- **Gaps:** no key metadata (name, owner, scopes, per-key limits/budgets), no key rotation/expiry, no per-key usage attribution, no management API for keys.

### A.5 Usage/logs

- `src/lib/usageDb.js` — `usage.json` + `log.txt` under `~/.9router` (does **not** follow `DATA_DIR`).
- Usage analytics already capture `meta.taskType` and `meta.scores` (see `RequestDetailsTab.js`).
- **Gaps:** no per-key/per-app/per-user breakdown surfaced in the dashboard, no cost attribution, no "which upstream served this" drill-down beyond request details.

### A.6 Persistence

- SQLite layer `src/lib/db/` with adapter fallback chain (`bun:sqlite` → `better-sqlite3` → `node:sqlite` → `sql.js`). Per-entity repos in `src/lib/db/repos/*`, migrations in `src/lib/db/migrations/`.
- `src/lib/localDb.js` is a backward-compat shim re-exporting `src/lib/db/index.js`.

---

## Part B — Industry models (external research)

### B.1 OpenRouter — app attribution, guardrails, BYOK, management keys

**App attribution** (https://openrouter.ai/docs/app-attribution):

- `HTTP-Referer` header (required) — identifies the app's URL; primary identifier for rankings.
- `X-OpenRouter-Title` — display name in rankings/analytics (must be paired with `HTTP-Referer`; `X-Title` is legacy alias).
- `X-OpenRouter-Categories` — comma-separated marketplace categories (max 2 per request, 10 per app): `cli-agent`, `ide-extension`, `cloud-agent`, `programming-app`, `native-app-builder`, `creative-writing`, `video-gen`, `image-gen`, `audio-gen`, `writing-assistant`, `general-chat`, `personal-agent`, `legal`, `roleplay`, `game`.
- `X-OpenRouter-App-Visibility: hidden` — create app hidden from public rankings/marketplace; attribution still works; only applies on first creation.
- Localhost URLs require `X-OpenRouter-Title` to be tracked.
- Apps appear in public rankings, per-model "Apps" tabs, and per-app analytics (`openrouter.ai/apps?url=<referer>`).

**Guardrails** (https://openrouter.ai/docs/guides/features/guardrails):

- Per-account/org guardrails with: **budget limit** (USD, resets daily/weekly/monthly; `include_byok_in_budgets` to count BYOK spend), **model allowlist**, **provider allowlist**, **Zero Data Retention** per model group, **data regions** (global/europe/us), **security** (regex prompt-injection/jailbreak detection), **sensitive info** (PII detection/redaction), **custom content filters** (JS-flavored regex, redact or block; no lookaheads/backreferences; max 100k chars/pattern).
- Assignment levels: member assignments (baseline for all their keys) + API key assignments (granular, layered). Only one guardrail directly assigned per user/key; workspace default guardrail applies to all traffic.
- Hierarchy: provider/model allowlists = **intersection**; ZDR = OR per model group; data regions = intersection; sensitive info = union (block > redact); budgets checked independently per key and per member (lower limit wins).
- Blocked requests → HTTP 403; runtime content checks include `openrouter_metadata` stage details (with `X-OpenRouter-Experimental-Metadata: enabled`).
- API: `GET /api/v1/guardrails?workspace_id=...`, `PATCH /api/v1/guardrails/{id}`; workspace default guardrail named `Workspace <id> Default`.

**BYOK** (https://openrouter.ai/docs/guides/overview/auth/byok): bring-your-own-key; guardrail budgets can optionally count BYOK spend.

**Management keys**: OpenRouter supports management keys for org-level API access (guardrails, keys, members) — distinct from inference keys.

### B.2 Anthropic — rate limits, workspaces, identity-backed keys

**Rate limits** (https://platform.claude.com/docs/en/api/rate-limits):

- **Token bucket algorithm** per model: RPM (requests/min), ITPM (input tokens/min), OTPM (output tokens/min). Bucket refills continuously; burst capacity = bucket size.
- Limits are per-model, per-organization (workspace-level caps can be set lower).
- Response headers: `anthropic-ratelimit-requests-limit`, `anthropic-ratelimit-requests-remaining`, `anthropic-ratelimit-requests-reset`, `anthropic-ratelimit-input-tokens-limit`, `anthropic-ratelimit-input-tokens-remaining`, `anthropic-ratelimit-input-tokens-reset`, `anthropic-ratelimit-output-tokens-limit`, `anthropic-ratelimit-output-tokens-remaining`, `anthropic-ratelimit-output-tokens-reset`, plus `retry-after-ms` on 429.
- 429 responses include `retry-after-ms`; SDKs auto-retry with exponential backoff.
- Rate Limits API: `GET /v1/organizations/rate_limits` (org-level), `GET /v1/organizations/workspaces/{workspace_id}/rate_limits` (workspace-level).

**Workspaces** (https://platform.claude.com/docs/en/manage-claude/workspaces):

- Organize API keys, team access, cost control; `wrkspc_`-prefixed IDs; max 100/org.
- Per-workspace rate limits (RPM/ITPM/OTPM per model tier) and spend limits (monthly cap + alerts).
- `anthropic-workspace-id` request header selects workspace for multi-workspace keys; response header `anthropic-workspace-id` identifies the workspace behind a response.
- Claude Code workspace: auto-created; per-user keys minted at sign-in; keys stop working when owner removed; separate rate limits; only workspace supporting per-user monthly spend limits.

**Identity-backed keys** (https://platform.claude.com/docs/en/manage-claude/authentication):

- **Personal key** — acts as the user; stops when user loses access; archived on removal.
- **Service account key** — acts as a service account; survives creator removal.
- **Workspace key** (legacy) — belongs to workspace; expires/disabled/archived with workspace.
- Key expiration presets (3h/1d/7d/30d/custom/never); emails before expiry; expired keys → 401.
- WIF (Workload Identity Federation) — short-lived tokens exchanged from IdP JWTs; no static secrets.
- App Attest — iOS/macOS device attestation; short-lived tokens scoped to workspace.

### B.3 LiteLLM — virtual keys, teams, budgets, rate limits

- **Virtual keys** (`sk-...`): per-key budgets (USD), rate limits (RPM/TPM), model restrictions, metadata (user, team, tags), spend tracking, key rotation/regeneration, soft/hard limits.
- **Teams**: group keys under a team with shared budgets and rate limits; team-level spend tracking.
- **Users**: per-user budgets and rate limits; `user` field in requests.
- **Budgets**: soft limit (warning) + hard limit (block); resets daily/weekly/monthly; per-key and per-team.
- **Rate limits**: RPM (requests/min) and TPM (tokens/min) per key/team/user; 429 with retry info.
- **Metadata**: arbitrary key-value metadata on keys for attribution (e.g., `{"app": "claude-code", "user": "alice"}`).
- **Management API**: `/key/generate`, `/key/info`, `/key/update`, `/key/delete`, `/team/*`, `/user/*` — full CRUD for keys/teams/users.
- **Model access groups**: restrict which models a key can use.

### B.4 Agent identity & attribution headers (the "who is calling" problem)

**OpenRouter's model** (from B.1): `HTTP-Referer` + `X-OpenRouter-Title` + categories. Apps self-identify; OpenRouter groups by referer URL.

**MCP** (https://modelcontextprotocol.io/specification/2025-06-18): JSON-RPC 2.0; hosts/clients/servers; no standard identity header for LLM API calls (identity is at the MCP layer, not the HTTP layer).

**Claude Code**: sends `User-Agent` like `claude-cli/...` (matches `claude[-_ ]code\//i` in sourceApps). Settings files (`~/.claude/settings.json`, `.claude/settings.json`, `.claude/settings.local.json`, managed) control model/permissions/env — relevant for how a gateway could be configured per-agent.

**Cursor / Codex CLI / Copilot**: distinct UAs (already in sourceApps rules).

**Key insight:** UA fingerprinting is the *only* universal signal today; agent-identity headers are non-standard. The robust design is **per-API-key attribution** (each key = an identity with metadata) + **UA fingerprinting** as a secondary signal + **optional client-supplied identity headers** (e.g., `X-9R-App`, `X-9R-User`) that are *trusted only when the request already authenticated with a key*.

### B.5 Queue management (the "where do my messages go" control plane)

Industry patterns:

- **Token-bucket rate limiting** (Anthropic, OpenAI, LiteLLM): per-key/per-model RPM/TPM; 429 + retry-after; SDK backoff.
- **Queueing**: LiteLLM supports request queueing with priority; OpenAI/Anthropic don't queue (they reject). A gateway can add a bounded queue with per-key priority and TTL.
- **Spend caps**: per-key/per-team/per-workspace budgets with soft/hard limits and reset intervals.
- **Model/provider allowlists**: per-key restrictions (OpenRouter guardrails, LiteLLM model access groups).
- **Fallback combos**: 9router already has this (combo engine, smart router, multi-account fallback).

---

## Part C — Design space: interpretations & feature candidates

### C.1 "Where do my messages come from?" — attribution dimensions

| Dimension | Signal | Status in 9router | Effort |
|---|---|---|---|
| Client app | UA fingerprint (`sourceApps.js`) | ✅ exists | Low |
| Client app (self-identified) | `X-9R-App` / `X-OpenRouter-Title`-style header | ❌ | Low |
| API key identity | key metadata (name/owner/tags) | ❌ (keys are opaque) | Medium |
| User identity | per-key `user` field / `X-9R-User` header | ❌ | Medium |
| Machine/device | IP, hostname header, machine-id | IP only (rate limiter) | Medium |
| Task type | `classifyTask` | ✅ exists (meta.taskType) | Low |
| Conversation | sticky-session fingerprint | ✅ exists (5-min TTL) | Low |

### C.2 "Where do my messages go?" — routing/control dimensions

| Dimension | Signal | Status in 9router | Effort |
|---|---|---|---|
| Upstream provider/model | request details (already logged) | ✅ partial | Low |
| Per-key model/provider allowlist | key metadata | ❌ | Medium |
| Per-key budgets (USD) | key metadata + usageDb | ❌ | Medium |
| Per-key rate limits (RPM/TPM) | rate limiter extension | ❌ | Medium |
| Per-model rate limits | rate limiter extension | ❌ | Medium |
| Queueing with priority | new module | ❌ | High |
| Guardrails (PII, prompt-injection, content filters) | new module | ❌ | High |
| Response headers (`x-ratelimit-*`, `x-9r-*`) | rate limiter extension | ❌ | Low |

### C.3 Recommended architecture (synthesis)

**Phase 1 — Attribution & observability (answers "where do my messages come from?"):**
1. Extend `sourceApps.js` with more agent rules (Codex, Gemini CLI, Aider, Cline, Roo, Windsurf, etc.).
2. Add optional client identity headers (`X-9R-App`, `X-9R-User`, `X-9R-Session`) — trusted only after key auth; stored in usage meta.
3. Add API-key metadata (name, owner, tags) to the DB; persist per-key usage attribution.
4. Dashboard: "Sources" view — per-app/per-key/per-user request counts, token usage, task-type breakdown, upstream provider/model breakdown.

**Phase 2 — Control plane (answers "where do my messages go?"):**
1. Per-key rate limits (RPM/TPM) + per-model limits, token-bucket semantics, `x-ratelimit-*` response headers, 429 + retry-after.
2. Per-key budgets (USD) with soft/hard limits and reset intervals (daily/weekly/monthly).
3. Per-key model/provider allowlists (intersection with global settings).
4. Optional: queueing with priority; guardrails (PII/content filters) as a later phase.

**Phase 3 — Teams/workspaces (optional):**
- Group keys into teams with shared budgets/limits; per-team usage views; workspace-level defaults (mirrors Anthropic workspaces + OpenRouter guardrails + LiteLLM teams).

---

## Part D — Sources consulted

- 9router codebase: `src/lib/sourceApps.js`, `open-sse/services/smartRouter.js`, `src/sse/services/smartRouter.js`, `custom-server.rate-limiter.js`, `src/lib/usageDb.js`, `src/lib/db/`, `src/app/(dashboard)/dashboard/usage/components/RequestDetailsTab.js`, `docs/plans-and-prompts/research/message-viewer-design-philosophies.md`
- OpenRouter: app attribution, guardrails, BYOK, management keys docs
- Anthropic: rate limits, workspaces, authentication docs
- LiteLLM: virtual keys, teams, budgets, rate limits docs
- MCP spec (2025-06-18)
- Claude Code settings docs

## Part E — Open questions & confidence

- **Confidence: high** on the existing-codebase inventory (read directly).
- **Confidence: high** on OpenRouter/Anthropic/LiteLLM feature sets (official docs).
- **Open:** whether the user wants per-key attribution (requires key metadata) or UA-only attribution (already exists).
- **Open:** whether "where do my messages go" means *observability* (drill-down) or *control* (limits/budgets/allowlists) or both.
- **Open:** whether teams/workspaces are in scope.
- **Open:** whether queueing is desired (higher complexity) or 429-with-retry is sufficient.