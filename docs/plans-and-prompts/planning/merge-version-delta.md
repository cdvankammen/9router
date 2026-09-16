# MERGE-06: Changelog / Version Delta Review

**Date:** 2026-09-10
**Status:** COMPLETE
**Thread:** 1544031399110119588
**Scope:** Compare upstream CHANGELOG.md + package.json versions (v0.5.50 → v0.5.75) vs local (v0.5.50)

---

## 1. Fork Point Confirmation

| Item | Value |
|------|-------|
| Fork commit | `15223724` — `# v0.5.50 (2026-08-05)` |
| Local branch | `v1-bug-fix` (125 commits ahead of v0.5.50) |
| Upstream branch | `origin/master` (151 commits ahead of v0.5.50) |
| Upstream latest tag | **v0.5.75** (2026-09-10) |
| Local package.json version | `0.5.50` |
| Upstream package.json version | `0.5.75` |

The fork is clean — both branches diverge from the exact same v0.5.50 commit.

---

## 2. Upstream Versions Since Fork Point

| Version | Date | Commits | Key Theme |
|---------|------|---------|-----------|
| **v0.5.55** | 2026-08-14 | ~30 | SAML SSO, OpenCode-Go transport routing, security fixes |
| **v0.5.59** | 2026-08-29 | ~55 | Web search providers, model capabilities sync, Antigravity quota-aware routing |
| **v0.5.65** | 2026-09-03 | ~30 | Gemini 3.8 Flash, Claude Fable 5.1, SSRF hardening, model capability toggles |
| **v0.5.69** | 2026-09-05 | ~25 | GPT 6.0 Astra, Claude Fable quota, OpenCode Go parallel tools |
| **v0.5.75** | 2026-09-10 | ~20 | Video generation, Claude tool type scoping, standalone Qwen, CLI model selector |

**Total: 149 commits across 5 releases over 26 days.**

---

## 3. Features Added Upstream (v0.5.55 → v0.5.75)

### 3.1 v0.5.55 — SAML SSO + Transport Routing (2026-08-14)

**Features:**
- **Auth**: Native SAML 2.0 SSO alongside OIDC (AuthnRequest, ACS assertion, SP metadata, admin config test, replay-protected)
- **Providers**: Alibaba Token Plan (`token-plan.ap-southeast-1`) — fourth Alibaba key type, Singapore-only
- **Providers**: `glm-5.3` added to GLM Coding and GLM (China)
- **Providers**: Kimchi dual auth (API keys + OAuth) with Test Connection for both modes
- **Antigravity**: Gemini 3.7 Flash + tiered high/medium/low variants with pricing and quota tracking
- **TTS**: Fish Audio provider (HTTP `model` header, `reference_id` for preset/cloned voices)
- **OpenCode-Go**: Route by request format via declared transports — Codex/OpenAI clients no longer pay lossy double translation
- **Usage**: Dedup + cache Claude quota calls (120s TTL, in-flight promise dedup, last-good read) to stop multi-tab 429s

**Security (CRITICAL):**
- **x-9r-real-ip trust fix** (GHSA-pjm4-8fpg-f9p6): Remote callers could pose as local to skip API key auth and reach `LOCAL_ONLY_PATHS` (`/api/mcp/*`, `/api/tunnel/enable`, `/api/auth/reset-password`). Now stamps per-process `x-9r-peer-token` and validates origin.
- **SSRF guard** on `/v1/search` baseUrls
- **Default-password remote login** blocked (returns 403)
- **Request-details redaction** on `/api/usage/request-details`

**Fixes (notable):**
- Docker: ship `sql.js` for pure-JS DB fallback
- Claude: re-anchor passthrough cache breakpoints (was re-caching every request)
- Combos: detect images from Hermes and attachment payloads for Vision Adapter
- Kiro: intercept chat via `x-amz-target` for IDE 1.0.228+

### 3.2 v0.5.59 — Web Search + Model Sync (2026-08-29)

**Features:**
- **Search**: Antigravity web search (Google Search grounding on OAuth pool, URL-keyed citations)
- **Search**: Xquik X search (`x-api-key`, cursor pagination, credit-based usage)
- **Search**: ollama-search and zai-search with credential fallback (borrow chat provider's key)
- **Models**: Daily background sync of model capabilities from models.dev (modalities, context/output limits, ETag cache, `MODEL_CATALOG_SYNC=off` to disable)
- **Models**: GLM-5.3-Flash (1M context, multimodal), DeepSeek V4 Vision, Grok 4.5/4.6 (500k context)
- **Usage**: Zed plan quota on dashboard (plan, edit predictions, hosted model requests, billing-cycle reset)
- **Usage**: GPT-5.3-Codex-Spark quota windows (spark_session / spark_weekly)
- **Antigravity**: Quota-aware routing — on 409/429 fetch live quota for exact per-model resetAt, skip only exhausted account/model pair
- **Antigravity**: Image size → aspect-ratio model suffix; Gemini 3.7 Flash tiers in MITM defaultModels
- **Dashboard**: Bulk import Grok CLI accounts from JSON
- **CLI tools**: Endpoint presets shared across every tool card through live-resyncing store
- **Token Saver**: Configurable compression timeout (`headroomTimeoutMs`)
- **i18n**: pt-BR expanded to 1132 terms

**Fixes (notable):**
- Stream: record usage when client closes on terminal event (Responses API)
- Stream: parse trailing NDJSON line from Ollama (was dropping final chunk)
- Session: read Claude Code session id from `x-claude-code-session-id` header (fixes prefix cache splitting)
- Usage: preserve nested `cached_tokens` (was billing cache hits at full input rate)
- Executor: CommandCode in-stream errors → real 4xx/5xx for combo/account fallback
- Search: scope failure locks so search cannot take chat offline
- RTK: system prompt injection format-safe and idempotent
- CLI: install better-sqlite3 without build tools on Node 22+

### 3.3 v0.5.65 — Gemini 3.8 + Claude Fable + SSRF Hardening (2026-09-03)

**Features:**
- **Fetch**: Ollama Cloud web fetch provider
- **Gemini/Antigravity**: Gemini 3.8 Flash, IDE fingerprint 2.11.0
- **Claude**: Claude Fable 5.1 (adaptive thinking with `output_config.effort`), CC fingerprint 2.1.258
- **Providers**: Client-side status filter (All/Active/Inactive/No connection) on Providers dashboard
- **Providers**: Streamlined TokenRouter catalog (22 flagship models), refreshed CodeBuddy-CN
- **Models**: Capability toggles (vision, reasoning) for custom models with upsert and live caps refresh
- **CLI tools**: Save and manage custom API key presets
- **Quota**: Groq usage and rate-limit tracking via `x-ratelimit-*` headers
- **i18n**: Complete Indonesian translation (1391 keys)

**Security:**
- **SSRF guard bypasses closed** (#3714): alternate IPv6 encodings, hostname trailing dots, wildcard DNS resolution, safe redirect handling
- **Auth**: Protect root `/responses` rewrite requiring API key validation
- **Docker**: 503 Service Unavailable when all credentials are rate-limited

**Fixes (notable):**
- Claude: drop `server_tool_use` blocks with foreign IDs; never anchor cache on `defer_loading` tools
- Antigravity: strike-break optimistic quota readings (15m block after 3 strikes)
- Kiro: preserve inline images as OpenAI-compatible `image_url` parts
- Models: single model lookup with provider-prefixed IDs (e.g. `cc/claude-sonnet-5`)
- UI: apply persisted theme before first paint to prevent flash

### 3.4 v0.5.69 — GPT 6.0 Astra + Claude Fable Quota (2026-09-05)

**Features:**
- **Codex**: GPT 6.0 Astra (`gpt-6-astra`) with vision, thinking, search
- **Usage**: Claude Fable quota tracker with weekly window normalization
- **Dashboard**: Group Antigravity Gemini/Claude quotas, prune stale hidden keys
- **OpenCode Go**: `muse-spark-1.3-contributor` model + parallel tool calls on Responses path
- **Providers**: Align CodeBuddy-CN catalog/capabilities; add GPT-5.6 Sol/Terra/Luna image aliases on Codex
- **CLI tools**: Replace Copilot MITM with VS Code extension setup guide
- **Gemini**: Persist and replay `thoughtSignature` scoped by session namespace

**Fixes:**
- Claude: normalize adaptive auto effort
- Antigravity: prevent Google anti-abuse rate limits on multi-account refresh
- Anthropic-compatible: forward Claude beta flags to nodes fronting Anthropic
- Security: guard cowork MCP tools probe against SSRF

### 3.5 v0.5.75 — Video Generation + Qwen Standalone (2026-09-10)

**Features:**
- **Video**: OpenRouter and Vertex AI (Veo) video generation on `/v1/videos/*` via provider adapter layer
- **Antigravity**: Weekly quota tracking (Gemini/Claude/GPT) + free-tier handling from `retrieveUserQuotaSummary`
- **Codex**: GPT Image 2.5, Flare, Sunburst image models with multi-image support
- **Qoder**: Usage surfacing to all clients; images upload via `/api/v2/image/upload`; oversized file stubs; context tier auto-escalation
- **OpenCode Go**: New models (glm-5.3, kimi-k3, deepseek-flash, longcat-2.0, hy4-preview, hy3, grok-4.6, gpt-5.6-luna); deepseek-v4.1-flash listed first
- **CLI tools**: Model selector grouped by provider with full-text search + custom model ID entry
- **CodeBuddy-CN**: deepseek-v4.1-flash replaces deepseek-v4-flash
- **Providers**: Standalone Qwen provider

**Fixes:**
- Tools: scope Claude tool type defaulting to gateways declaring `requireClaudeToolType`
- Claude: cap re-anchored `cache_control` at 4-marker budget
- Cline/Airforce: unwrap `{success,data}` envelope; add live catalog
- Cline: stop `workos:`-prefixing ClinePass API keys (401 on every request)
- Kiro: never send top-level `systemPrompt`; route through current runtime surfaces
- Codex: strip Unicode-property tool schema patterns; restore Version header
- Providers: clear stale connection health state on re-validation
- Video/Vertex: reject URL-escaping job/model IDs (SSRF)
- Usage: parse Fable weekly limit from `limits[]` instead of fabricating
- Auth: 24h maxAge on dashboard session cookie

---

## 4. Dependency Changes (v0.5.50 → v0.5.75)

### New production dependencies (3):
| Package | Version | Added In | Purpose |
|---------|---------|----------|---------|
| `@node-saml/node-saml` | ^5.1.0 | v0.5.55 | SAML 2.0 SSO implementation |
| `chalk` | ^5.6.2 | v0.5.55+ | Terminal string styling |
| `prop-types` | ^15.8.1 | v0.5.55+ | React prop type checking |

### devDependencies: No changes.

---

## 5. Security Fixes (MUST MERGE — blocking)

| ID | Version | Severity | Description |
|----|---------|----------|-------------|
| GHSA-pjm4-8fpg-f9p6 | v0.5.55 | **CRITICAL** | x-9r-real-ip trust: remote callers could bypass API key auth and reach LOCAL_ONLY_PATHS |
| SSRF search baseUrl | v0.5.55 | HIGH | Client-supplied non-public baseUrls on /v1/search |
| SSRF guard bypasses | v0.5.65 | HIGH | IPv6 encodings, trailing dots, wildcard DNS bypass ssrfGuard.js |
| Request-details redaction | v0.5.55 | HIGH | Request/response payloads exposed on /api/usage/request-details |
| Default-password remote | v0.5.55 | MEDIUM | Fresh-install remote login with default password issued JWT |
| SSRF cowork MCP | v0.5.69 | MEDIUM | Cowork MCP tools probe SSRF |
| SSRF video/vertex | v0.5.75 | MEDIUM | Job/model IDs escaping URL path |

---

## 6. Local-Only Work (v0.5.50..v1-bug-fix)

125 local commits with these custom features NOT in upstream:
- **Failover proxy**: multi-peer auto-discovery, IPv4/IPv6/hostname handling, rate limiting
- **Per-IP rate limiter**: bundled into CLI package (48bca50f)
- **WAL checkpoint fixes**: TRUNCATE→PASSIVE for node:sqlite + bun adapters (34f518e4, 06f735c6)
- **Combo duplicate/dev flag/model chooser sorting** (6754d9c0 — uncommitted work)
- **Tray runtime changes** (uncommitted)
- **Plans-and-prompts docs** (docs only, no conflict risk)

---

## 7. Conflict Risk Assessment (Version-Related Files)

| File | Risk | Reason |
|------|------|--------|
| `package.json` | **MEDIUM** | 3 new deps upstream; local may have custom deps (failover-proxy.cjs in files array) |
| `package-lock.json` | **HIGH** | 149 upstream commits modified it; will conflict with local lockfile |
| `CHANGELOG.md` | **LOW** | Local has "Unreleased" section + same v0.5.50 entry; upstream prepended 5 version blocks |
| `cli/package.json` | **MEDIUM** | We added failover-proxy.cjs; upstream may have changed files/deps |

---

## 8. Merge Strategy Implications

### Must-have security patches (cannot skip):
All 7 security fixes listed in Section 5 are non-negotiable. Any merge strategy MUST include these.

### High-value features for our use case:
1. **Claude cache_control budget cap** (v0.5.75) — prevents 400s on spent cache budget
2. **Antigravity quota-aware routing** (v0.5.59) — skip exhausted accounts, better reliability
3. **Stream usage recording on client close** (v0.5.59) — was losing usage data
4. **Search credential fallback** (v0.5.59) — search without separate API keys
5. **Model capabilities sync from models.dev** (v0.5.59) — auto-discover model features
6. **SAML SSO** (v0.5.55) — if we need enterprise auth
7. **Video generation** (v0.5.75) — new API surface

### Features less relevant (but harmless to include):
- Grok CLI bulk import, OpenCode Go models, various i18n translations
- CLI model selector grouping, endpoint presets
- Fish Audio TTS, Ollama Cloud web fetch

---

## 9. Version Bump Required

After merge, local `package.json` version should jump from `0.5.50` to at least `0.5.75` (or a custom version like `1.0.0-merge.1` to distinguish from upstream). The existing v0.5.50 code includes local patches that don't match any upstream release.

---

## 10. Summary

| Metric | Value |
|--------|-------|
| Upstream releases to absorb | 5 (v0.5.55, v0.5.59, v0.5.65, v0.5.69, v0.5.75) |
| Upstream commits since fork | 149 |
| New production deps | 3 |
| Security patches needed | 7 (1 critical, 3 high, 3 medium) |
| Local commits to preserve | 125 |
| Highest-risk conflict files | package-lock.json, combo.js, cli/package.json |
