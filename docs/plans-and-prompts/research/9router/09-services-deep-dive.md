# 9Router Services Deep Dive

> **Directory:** `open-sse/services/`
> **Files analyzed:** 33 (20 top-level + 2 tokenRefresh/ + 13 usage/)
> **Date:** 2026-08-05

---

## Summary Table

| Module | Purpose | Key Exports |
|--------|---------|-------------|
| `accountFallback.js` | Error classification, cooldown math, model locks, account filtering | `checkFallbackError`, `getQuotaCooldown`, `filterAvailableAccounts`, `isModelLockActive`, `applyErrorState` |
| `capacityAdapter.js` | Global fallback pools for vision/pdf/audio/video capabilities | `augmentModelsWithCapacityAdapter`, `stripHistoryForContext`, `withCapacityAdapterStripping` |
| `clinepassModels.js` | Live model catalog from Cline's `/models` endpoint | `resolveClinepassModels` |
| `combo.js` | Model combo fallback chains, round-robin rotation, capability reordering, fusion panel+judge | `handleComboChat`, `handleFusionChat`, `detectRequiredCapabilities`, `reorderByCapabilities`, `getRotatedModels` |
| `compact.js` | Legacy/simplified combo handler (subset of combo.js) | `getComboModelsFromData`, `handleComboChat` |
| `copilotModels.js` | Live GitHub Copilot model catalog with auto-refresh on 401 | `resolveCopilotModels`, `clearCopilotModelCache` |
| `cursorModels.js` | Live Cursor model catalog via HTTP/2 protobuf GetUsableModels | `resolveCursorModels`, `parseCursorUsableModels`, `clearCursorModelCache` |
| `grokCliModels.js` | Live Grok CLI model catalog with credential refresh | `resolveGrokCliModels`, `parseGrokCliModels` |
| `kimchiModels.js` | Live Kimchi model catalog with metadata cache | `resolveKimchiModels`, `normalizeKimchiModel`, `getCachedKimchiModelMetadata` |
| `kiroModels.js` | Live Kiro/AWS CodeWhisperer catalog with synthetic `-thinking`/`-agentic` variants | `resolveKiroModels`, `invalidateKiroModelCache`, `clearKiroModelCache` |
| `model.js` | Model string parsing, alias resolution, provider inference | `parseModel`, `getModelInfoCore`, `resolveProviderAlias`, `resolveModelAliasFromMap` |
| `oauthCredentialManager.js` | Credential expiry tracking, proactive refresh, merge logic, refresh locks | `shouldRefreshCredentials`, `refreshProviderCredentials`, `mergeRefreshedCredentials`, `withCredentialRefreshLock` |
| `projectId.js` | Google Cloud project ID fetch/cache for Gemini CLI & Antigravity | `getProjectIdForConnection`, `invalidateProjectId`, `removeConnection` |
| `provider.js` | Request format detection, provider config resolution, transport selection | `detectFormat`, `getTargetFormat`, `resolveTransport`, `resolveOpenAICompatibleApiType` |
| `qoderModels.js` | Live Qoder model catalog with PAT→job-token exchange and COSY signing | `resolveQoderModels`, `getQoderModelConfig`, `resolveQoderCredentials` |
| `smartRouter.js` | Task classification, model scoring, session stickiness for `9router` virtual provider | `classifyTask`, `scoreModel`, `selectModels`, `conversationFingerprint`, `getStickySession` |
| `tokenRefresh.js` | Central token refresh dispatcher with Vertex SA JWT minting | `refreshTokenByProvider`, `getAccessToken`, `refreshVertexToken`, `formatProviderCredentials`, `refreshWithRetry` |
| `tokenRefresh/dedup.js` | In-flight + recent-result deduplication for token refreshes | `dedupRefresh` |
| `tokenRefresh/providers.js` | Per-provider OAuth refresh implementations (17 providers) | `refreshXaiToken`, `refreshGoogleToken`, `refreshCodexToken`, `refreshKiroToken`, `refreshClaudeOAuthToken`, etc. |
| `usage.js` | Usage fetcher dispatcher mapping provider → handler | `getUsageForProvider` |
| `usage/claude.js` | Claude OAuth + legacy org usage with 429 cooldown | `getClaudeUsage` |
| `usage/codebuddy-cn.js` | Tencent CodeBuddy CN/Intl billing with refill vs bonus pack parsing | `getCodeBuddyCnUsage`, `getCodeBuddyIntlUsage` |
| `usage/codex.js` | OpenAI Codex rate limits + reset credit consumption | `getCodexUsage`, `getCodexRateLimitResetCredits`, `consumeCodexRateLimitResetCredit` |
| `usage/deepseek.js` | DeepSeek balance API (credit pots by currency) | `getDeepseekUsage` |
| `usage/github.js` | GitHub Copilot quota snapshots (paid + free formats) | `getGitHubUsage` |
| `usage/google.js` | Gemini CLI per-model buckets + Antigravity model quotas | `getGeminiUsage`, `getAntigravityUsage` |
| `usage/grok-cli.js` | Grok CLI billing (on-demand, prepaid, SuperGrok weekly pool) | `getGrokCliUsage`, `parseGrokCliBilling`, `fetchGrokCliCreditsConfig` |
| `usage/grokCliQuotaFrame.js` | gRPC-web protobuf decoder for SuperGrok credits | `decodeGrokCreditsFrame`, `probeFrameHeader` |
| `usage/kimi.js` | Kimi Coding usage with dual auth (API key / OAuth) | `getKimiUsage`, `formatKimiUsageError` |
| `usage/kiro.js` | Kiro/AWS CodeWhisperer usage with multi-endpoint fallback | `getKiroUsage` |
| `usage/minimax.js` | MiniMax Token/Coding Plan with session + weekly windows | `getMiniMaxUsage` |
| `usage/misc.js` | iFlow, Ollama Cloud, GLM, Vercel AI Gateway, Qoder usage | `getIflowUsage`, `getOllamaUsage`, `getGlmUsage`, `getVercelAiGatewayUsage`, `getQoderUsage` |
| `usage/shared.js` | Cross-provider helpers: URL lookup, time parsing, timeout fetch | `U`, `parseResetTime`, `toFiniteNumber`, `fetchWithTimeout` |

---

## Detailed File Analysis

### 1. `accountFallback.js`

**Purpose:** Determines when an account should be rotated out due to errors, manages cooldown timers, and implements per-model locking.

**Exports:**

| Function | Signature | Description |
|----------|-----------|-------------|
| `getQuotaCooldown` | `(backoffLevel: number) => number` | Exponential backoff: base × 2^(level-1), capped at `BACKOFF_CONFIG.max` (4 min) |
| `checkFallbackError` | `(status, errorText, backoffLevel?) => {shouldFallback, cooldownMs, newBackoffLevel?}` | Matches error against `ERROR_RULES` (text first, then status). Returns cooldown + whether to switch accounts |
| `isAccountUnavailable` | `(unavailableUntil) => boolean` | Checks if cooldown timestamp is still in the future |
| `getUnavailableUntil` | `(cooldownMs) => string` | Returns ISO timestamp for cooldown expiry |
| `getEarliestRateLimitedUntil` | `(accounts[]) => string\|null` | Finds soonest-expiring rate limit across accounts |
| `formatRetryAfter` | `(rateLimitedUntil) => string` | Human-readable "reset after Xm Ys" |
| `getModelLockKey` | `(model) => string` | Builds `modelLock_${model}` or `modelLock___all` |
| `isModelLockActive` | `(connection, model) => boolean` | Checks if a model-specific or global lock is active |
| `getEarliestModelLockUntil` | `(connection) => string\|null` | Earliest active lock expiry across all `modelLock_*` fields |
| `buildModelLockUpdate` | `(model, cooldownMs) => object` | Returns `{modelLock_xxx: isoTimestamp}` for DB update |
| `buildClearModelLocksUpdate` | `(connection) => object` | Nulls all `modelLock_*` fields |
| `filterAvailableAccounts` | `(accounts[], excludeId?) => []` | Filters out accounts in cooldown |
| `resetAccountState` | `(account) => object` | Clears rateLimitedUntil, backoffLevel, lastError; sets status="active" |
| `applyErrorState` | `(account, status, errorText) => object` | Applies cooldown + backoff from `checkFallbackError` |

**Constants:** `MODEL_LOCK_PREFIX = "modelLock_"`, `MODEL_LOCK_ALL = "modelLock___all"`

**Connections:** Used by `combo.js` for fallback decisions; handlers call `applyErrorState` after failed requests; dashboard reads `modelLock_*` fields for cooldown display.

---

### 2. `capacityAdapter.js`

**Purpose:** Appends global fallback models when none of the requested models support required input modalities (vision, pdf, audio, video). Also strips conversation history to fit smaller context windows of adapter models.

**Key Functions:**

| Function | Description |
|----------|-------------|
| `getCapacityAdapterConfig(cap, settings)` | Resolves one capability's config (enabled, roundRobin, models). Falls back to `oc/mimo-v2.5-free` when enabled but empty |
| `getCapacityAdapterModels(settings)` | Flattens enabled models across all 4 capability pools, deduped |
| `getCapacityAdapterStrategy(cap, settings)` | Returns "round-robin" or "fallback" |
| `getActiveAdapterStrategy(requiredCapabilities, settings)` | Picks strategy from first matching hard capability |
| `augmentModelsWithCapacityAdapter(models, requiredCapabilities, settings)` | Prepends adapter models ONLY when no original model satisfies requirements |
| `stripHistoryForContext(body, contextWindow)` | Drops middle messages to fit budget (80% of context window × 4 chars/token). Preserves system messages (head) and current user turn (tail) |
| `withCapacityAdapterStripping(handleSingleModel, adapterModels)` | Wraps callback to auto-strip history for adapter models |

**Special Behavior:** Never overrides a combo that already covers the capability. History stripping uses HEAD_KEEP=6 messages preserved verbatim before dropping middle turns.

---

### 3. `clinepassModels.js`

**Purpose:** Fetches live model catalog from Cline's `https://api.cline.bot/api/v1/models`.

**Key Function:** `resolveClinepassModels(credentials) → {models: [{id, name}]} | null`

- Supports both API key (plain Bearer) and OAuth (WorkOS-prefixed via `buildClineHeaders`)
- 5s fetch timeout
- Filters to models with `cline-pass/` prefix
- Fail-open: returns null on any error

---

### 4. `combo.js`

**Purpose:** The core model combo engine — tries multiple models in sequence (fallback) or parallel (fusion), with capability-aware reordering and round-robin rotation.

**Key Exports:**

| Function | Description |
|----------|-------------|
| `reorderByCapabilities(models, required)` | Stable sort: Tier 0 (all hard+soft), Tier 1 (hard only), Tier 2 (rest) |
| `detectRequiredCapabilities(body)` | Scans trailing user turn for vision/pdf/audio/video blocks. Returns Set |
| `getRotatedModels(models, comboName, strategy, stickyLimit)` | Round-robin rotation with configurable sticky limit (requests per model before switching) |
| `resetComboRotation(comboName?)` | Clears in-memory rotation state |
| `getComboModelsFromData(modelStr, combosData)` | Looks up combo by name, returns model array or null |
| `handleComboChat ` | Sequential fallback chain with observability (`x-9r-fallback-chain` header), transient wait, retry-after tracking |
| `handleFusionChat ` | Parallel fan-out to panel models → judge synthesis. Quorum-grace collection with straggler timeout |

**Fusion Architecture:**
1. Fan out to all panel models in parallel (non-streaming, tools stripped, tool history flattened to prose)
2. Collect with quorum-grace: once `minPanel` succeed, start grace timer (8s default) for stragglers; hard cap 90s
3. Judge model synthesizes one answer from anonymized panel responses using consensus/contradiction/blind-spot analysis
4. Degrades: 0 answers → 503, 1 answer → return directly

**Tool History Flattening:** `flattenToolHistory()` converts tool_use/tool_result blocks into `[Called tools: ...]` / `[Tool result: ...]` prose so panel models retain context without emitting tool_calls.

---

### 5. `compact.js`

**Purpose:** Simplified/legacy combo handler. Subset of `combo.js` without capability reordering, round-robin, or fusion.

**Note:** This appears to be an older version kept for backward compatibility. The main codebase uses `combo.js`.

---

### 6. `copilotModels.js`

**Purpose:** Live GitHub Copilot model catalog from `https://api.githubcopilot.com/models`.

**Key Features:**
- 5-minute per-credential cache
- Auto-refresh on 401/403: calls `refreshCopilotToken` then retries
- Filters to `capabilities.type === "chat"` and `policy.state === "enabled"`
- Calls `onCredentialsRefreshed` callback to persist new Copilot token
- Headers include VS Code version, Copilot Chat version, integration ID

---

### 7. `cursorModels.js`

**Purpose:** Live Cursor model catalog via HTTP/2 protobuf `GetUsableModels` RPC.

**Key Technical Details:**
- Uses raw `http2` module (Node fetch/undici can't speak H2)
- Unframed protobuf body (`application/proto`), not streaming Connect protocol
- Decodes `agent.v1.GetUsableModelsResponse` protobuf manually via `decodeMessage`
- Requires `accessToken` + `machineId` from `providerSpecificData`
- Cursor checksum headers via `buildCursorHeaders`
- 5-minute cache, SHA-256 cache key

---

### 8. `grokCliModels.js`

**Purpose:** Live Grok CLI model discovery from `${GROK_CLI_BASE_URL}/models`.

**Key Features:**
- Auto-refresh on 401/403 via `refreshProviderCredentials("grok-cli", ...)`
- Flexible response parsing: handles arrays, `{data}`, `{models}`, `{results}`, and object entries
- Defaults `GROK_CLI_MODEL` to 500K context / 64K max output
- Custom headers: `x-xai-token-auth`, `x-grok-client-version`, `x-grok-client-mode: headless`

---

### 9. `kimchiModels.js`

**Purpose:** Live Kimchi model catalog from `/v1/models/metadata?include_in_cli=true`.

**Key Features:**
- Dual metadata cache: `catalogCache` (TTL-based) + `metadataByModelId` (persistent lookup)
- `getCachedKimchiModelMetadata(modelId)` for chat-time config lookup
- Normalizes upstream provider info, reasoning flags, input modalities
- Anthropic upstream gets special compat flags (`supportsReasoningEffort: false`, `cacheControlFormat: "anthropic"`)
- 20s fetch timeout, retryable status tracking

---

### 10. `kiroModels.js`

**Purpose:** Live Kiro/AWS CodeWhisperer `ListAvailableModels` with synthetic variant expansion.

**Variant System:** Each upstream model expands to 4 variants:
- `{model}` — base
- `{model}-thinking` — thinking enabled
- `{model}-agentic` — chunked-write prompt prepended
- `{model}-thinking-agentic` — both

The `-thinking` and `-agentic` suffixes are 9router fictions stripped by the `openai-to-kiro` translator before the request leaves.

**Special Cases:**
- `auto` model skips `-agentic` variants (server-side model selection)
- Rate multiplier displayed in name (e.g., "Kiro claude-sonnet (2.0x credit)")
- Fingerprint headers match Kiro IDE UA exactly (upstream rejects malformed UAs with 400)
- Region extracted from `profileArn`
- Auto-refresh on 401 via `refreshKiroToken`

---

### 11. `model.js`

**Purpose:** Core model string parsing and alias resolution.

**Parsing Logic:**
1. If contains `/`: split into `provider/model`, resolve provider alias
2. Otherwise: treat as model alias, look up in aliases map
3. Fallback: infer provider from model name prefix (`claude-` → anthropic, `gpt-` → openai, etc.)

**Alias Sources:** Registry entries (id, alias, aliases[]), `MEDIA_ONLY_ALIASES` (el→elevenlabs, jina→jina-ai, polly→aws-polly), `BUILTIN_MODEL_ALIASES` (grok-build→gcli/grok-build).

---

### 12. `oauthCredentialManager.js`

**Purpose:** Credential lifecycle management — expiry detection, proactive refresh, merge logic, and concurrency-safe refresh locking.

**Key Functions:**

| Function | Description |
|----------|-------------|
| `getCredentialExpiryMs(credentials)` | Parses expiresAt/tokenExpiresAt (seconds or ms or ISO) |
| `getCredentialLastRefreshMs(credentials)` | Parses lastRefreshAt from multiple locations |
| `isCodexRefreshStale(credentials, nowMs, maxAgeMs)` | True if last refresh > maxRefreshAgeMs ago (8 days for Codex) |
| `shouldRefreshCredentials(provider, credentials, nowMs)` | True if within refresh lead window OR stale for trackRefreshAt providers |
| `mergeRefreshedCredentials(provider, current, refreshed, nowMs)` | Merges new tokens into existing credentials, stamps lastRefreshAt |
| `withCredentialRefreshLock(provider, credentials, refreshFn)` | Deduplicates concurrent refreshes per provider:stableId |
| `refreshProviderCredentials(provider, credentials, log)` | Lock-wrapped refresh + merge |

**Constants:** `CODEX_MAX_REFRESH_AGE_MS` from `PROVIDER_OAUTH.codex.maxRefreshAgeMs`

---

### 13. `projectId.js`

**Purpose:** Fetches real Google Cloud project IDs for Gemini CLI and Antigravity connections instead of generating random ones (reduces anti-abuse flagging).

**Architecture:**
- Per-connection cache (1h TTL)
- Pending-fetch deduplication (concurrent requests share one Promise)
- Background cleanup sweep every 10 minutes (evicts stale cache, aborts orphaned fetches)
- Two-stage fetch: `loadCodeAssist` → extract projectId → fallback to `onboardUser` (polls until done)
- `removeConnection()` aborts in-flight fetches and clears cache (prevents memory leaks)
- Timer is `.unref()`'d so it doesn't prevent Node exit

---

### 14. `provider.js`

**Purpose:** Request format detection and provider configuration resolution.

**Format Detection (`detectFormat`):** Priority order:
1. `input` without `messages` → `openai-responses`
2. `request.contents` + `userAgent === "antigravity"` → `antigravity`
3. `contents[]` → `gemini`
4. OpenAI-specific fields (stream_options, response_format, logprobs, etc.) → `openai`
5. Claude indicators (system, anthropic_version, base64 images, tool_use blocks) → `claude`
6. Default → `openai`

**Other Exports:**
- `resolveOpenAICompatibleApiType(provider, credentials)` — checks stored apiType, falls back to ID substring
- `getTargetFormat(provider, credentials)` — resolves target translation format
- `resolveTransport(provider, sourceFormat)` — picks multi-endpoint transport matching source format
- `isLastMessageFromUser(body)` — for thinking config normalization
- `normalizeThinkingConfig(body)` — strips thinking config on non-user turns

---

### 15. `qoderModels.js`

**Purpose:** Live Qoder model catalog with COSY-signed requests and PAT→job-token exchange.

**PAT Flow:**
1. Detect `pt-` prefix → exchange via POST to `jobToken/exchange` (plain JSON, not COSY)
2. Get short-lived `jt-` job token (24h TTL, cached per-PAT)
3. Fetch userId via `/userinfo` for COSY signing
4. Job-token traffic routes to `api2.qoder.sh` (api3 rejects jt- with 403)

**Catalog Cache:**
- 1h TTL, SHA-256 keyed by userId
- In-flight deduplication via `inflight` Map
- Stores both parsed models AND raw `model_config` objects (chat needs exact server-published config)
- `getQoderModelConfig(credentials, modelKey)` returns defensive copy with correct key

---

### 16. `smartRouter.js`

**Purpose:** Task classifier + model scorer for the `9router` virtual provider. Inspired by OpenRouter Auto Beta.

**Task Classification:** 16 task types detected via keyword + regex heuristics on last user message:
- Code: generation, debugging, review, refactoring
- Agent: multi_step, tool_use
- Math, reasoning, research_report, qa_knowledge, creative_writing, translation, summarization, data_analysis, customer_support, general_chat

**Model Scoring:** Capability-weighted scoring per task type:
- Tools weight × 10 if model has tools
- Reasoning weight × 10 if model has reasoning
- Context window normalized (200K = baseline 10)
- Cost penalty based on tradeoff dial (0-10): expensive models penalized at high tradeoff, cheap models boosted

**Session Stickiness:** FNV-1a hash of first system+user messages (first 500 chars each), 5-minute TTL, max 500 entries with LRU eviction.

---

### 17. `tokenRefresh.js`

**Purpose:** Central token refresh dispatcher. Maps provider IDs to refresh handlers and provides Vertex AI service account JWT minting.

**Refresh Handler Map (17 providers):**

gemini-cli, antigravity → refreshGoogleToken
claude → refreshClaudeOAuthToken
codex → refreshCodexToken
iflow → refreshIflowToken
github → refreshGitHubToken
kiro → refreshKiroToken
xai, grok-cli, gcli → refreshXaiToken
codebuddy-cn → refreshCodebuddyToken
codebuddy-intl → refreshCodebuddyIntlToken
trae → refreshTraeToken
zed → refreshZedToken (returns null —  
windsurf → refreshWindsurfToken (returns nullen  
kimi, kimi-coding → refreshKimiToken
vertex, vertex-partner → refreshVertexToken (JWT minting)


**Vertex Token Minting:** Uses `jose` library to sign JWT with service account private key, exchanges at Google token endpoint. Cached per client_email with 5-minute buffer.

**Other Exports:**
- `TOKEN_EXPIRY_BUFFER_MS = 5 min`
- `isUnrecoverableRefreshError(result)` — checks for invalid_grant, refresh_token_reused, etc.
- `getRefreshLeadMs(provider)` — per-provider refresh lead time from config
- `formatProviderCredentials(provider, credentials)` — shapes credentials per provider
- `refreshWithRetry(refreshFn, maxRetries, log)` — linear backoff retry wrapper

---

### 18. `tokenRefresh/dedup.js`

**Purpose:** Prevents duplicate concurrent token refreshes and caches recent results.

**Mechanism:**
- Key: `${provider}:${oldToken}`
- If in-flight promise exists → reuse it
- If recent result (< 10s TTL) → reuse result
- Otherwise → execute refresh, store promise (during execution) then result (after completion)
- Errors evict the cache entry immediately

---

### 19. `tokenRefresh/providers.js`

**Purpose:** Individual OAuth refresh implementations for all 17+ providers.

**Notable Implementations:**

| Provider | Protocol | Special Notes |
|----------|----------|---------------|
| xAI | Dynamic import of `XaiService` singleton | Classifies invalid_grant as permanent |
| Claude | JSON body, no client_secret | Delegates to generic `refreshAccessToken` with profile |
| Google | Form-encoded with client_id + client_secret | Shared by gemini-cli and antigravity |
| Codex | JSON body, classifies permanent errors | Returns `{error: "unrecoverable_refresh_error"}` on invalid_grant |
| Kiro | 3 auth methods: external_idp, IDC, social | External IDP uses `buildExternalIdpRefreshParams`; IDC uses regional OIDC endpoint; resolves profileArn patch |
| Copilot | GET with GitHub access token | Not a refresh — exchanges GitHub token for Copilot token |
| CodeBuddy CN | POST with X-Refresh-Token header | Response wrapped in `{code: 0, data: {accessToken}}` |
| Trae | JSON ExchangeToken with ClientID/ClientSecret | Parses ExpiresAt (unix or ISO) |
| Zed | Returns null | Long-lived token, no refresh possible |
| Windsurf | Returns null | API key is terminal credential |

**Generic Refresh (`refreshAccessToken`):** Config-driven via `REFRESH_PROFILES` — supports form/JSON body format, optional client_secret, custom headers, custom URL resolution. All wrapped in `dedupRefresh`.

**Error Classification (`classifyOAuthRefreshError`):** Detects permanent failures (refresh_token_expired, refresh_token_reused, invalid_grant) from parsed JSON error responses.

---

### 20. `usage.js`

**Purpose:** Dispatcher mapping provider IDs to usage handler functions.

**Handler Map (18 providers):** github, gemini-cli, antigravity, claude, codex, kiro, qoder (with PAT→job-token resolution), iflow, ollama, glm, glm-cn, minimax, minimax-cn, vercel-ai-gateway, codebuddy-cn, codebuddy-intl, grok-cli, kimi, deepseek.

**Context Object:** Each handler receives `{provider, accessToken, apiKey, providerSpecificData, providerDataWithProjectId, proxyOptions}`.

---

### 21–33. Usage Handlers

#### `usage/shared.js`
- `U(id)` — looks up usage endpoints from `PROVIDERS[id].usage`
- `parseResetTime(value)` — handles Date, unix seconds/ms, numeric strings, ISO strings
- `toFiniteNumber(value, fallback)` — safe numeric coercion
- `normalizeCloudCodeProjectId(project)` — extracts string ID from object or string
- `fetchWithTimeout(url, opts, ms, proxyOptions)` — AbortController-wrapped fetch

#### `usage/claude.js`
- Primary: OAuth usage endpoint (`/v1/oauth/usage`) with `anthropic-beta: oauth-2025-04-20`
- Parses `five_hour`, `seven_day`, and model-specific `seven_day_*` utilization windows
- Utilization = % used (87 means 87% consumed)
- 429 cooldown: 3-minute per-token backoff on quota endpoint only (chat still works)
- Fallback: legacy settings + org usage endpoint for API key users

#### `usage/codebuddy-cn.js`
- POST to Tencent billing endpoint, double-wrapped response (`data.Response.Data`)
- Distinguishes refill packs (CycleEndTime << DeductionEndTime, recurring) from bonus packs (one-shot)
- Refill cadence detection: Daily (≤1.5d), Weekly (≤10d), Monthly (default)
- Bonus packs sorted by soonest-expiring first
- Separate handlers for CN and Intl variants

#### `usage/codex.js`
- Primary/session + secondary/weekly rate limit windows
- Review-specific rate limits (code_review_rate_limit, rate_limits_by_limit_id, additional_rate_limits)
- Reset credits system: `getCodexRateLimitResetCredits` lists available credits; `consumeCodexRateLimitResetCredit` spends one (irreversible)
- Requires `ChatGPT-Account-ID` header for account-scoped queries

#### `usage/deepseek.js`
- GET `/user/balance` with Bearer API key
- Parses `balance_infos[]` with currency, total/granted/topped-up balances
- Credit pot display: full remaining against current balance

#### `usage/github.js`
- Uses GitHub OAuth token (not copilotToken) via `copilot_internal/user` API
- Paid format: `quota_snapshots` with entitlement/remaining per category (chat, completions, premium_interactions)
- Free format: `monthly_quotas` + `limited_user_quotas`

#### `usage/google.js`
- **Gemini CLI:** POST `retrieveUserQuota` with project ID → per-model buckets with `remainingFraction` + `resetTime`. Normalized to 1000-base.
- **Antigravity:** Similar quota API but filters to important models list. Includes subscription tier info.
- Both resolve project ID from connection or `loadCodeAssist` fallback

#### `usage/grok-cli.js`
- Parallel fetch of billing (`/v1/billing?format=credits`) + user profile (`/v1/user?include=subscription`)
- Parses protobuf-json `{val: n}` wrappers
- Quota types: Monthly included, On-demand cap, Prepaid balance, Weekly SuperGrok %, opportunistic credit bags
- Exhausted free accounts: synthetic 1/1 depleted bar
- gRPC-web fallback: `GetGrokCreditsConfig` for SuperGrok weekly pool when REST returns cap=0
- Plan detection from JWT tier claim + subscription tier field

#### `usage/grokCliQuotaFrame.js`
- Hand-rolled protobuf decoder for gRPC-web frames
- Extracts field 1 (credits info) → subfield 1 (fixed32 float usage ratio) + subfield 5 (Timestamp)
- Handles varint, length-delimited, fixed32, fixed64 wire types
- Fail-open: any malformed buffer returns null

#### `usage/kimi.js`
- Dual auth: API key (`x-api-key`) or OAuth (Bearer + X-Msh-* headers)
- Parses weekly usage (limit/used/remaining) + ratelimit details
- Plan levels mapped to musical tempo names (Moderato, Allegretto, Allegro, Vivace)
- 403 `REASON_FEATURE_NO_PERMISSION` treated as "no subscription" not "auth expired"

#### `usage/kiro.js`
- Multi-endpoint fallback: codewhisperer GET → codewhisperer POST → q GET
- Auth method awareness: api_key adds `tokentype: API_KEY` header; external_idp adds `TokenType: EXTERNAL_IDP`
- API-key connections never inject default placeholder profileArn (would cause 403)
- Parses `usageBreakdownList` with free trial sub-quotas

#### `usage/minimax.js`
- Multiple endpoint URLs with fallback on 404/405/5xx
- Session (5h) + weekly (7d) windows per model
- M-series shared quota pool: percent-only buckets normalized to total=100
- Snake_case + camelCase field handling throughout
- Coding plan remains endpoint uses count-as-remaining semantics

#### `usage/misc.js`
- **iFlow:** Stub ("tracked per request")
- **Ollama Cloud:** Ratio-based usage (0..1 → 0..100%), plan from `/api/me`
- **GLM:** TOKENS_LIMIT percentage with nextResetTime, region-aware URLs
- **Vercel AI Gateway:** USD credit balance against $5/month free allocation
- **Qoder:** User + organization credit quotas with shared expiresAt timestamp

---

## Token Refresh Flow


Request arrives → handler checks shouldRefreshCredentials()
  ├─ Within refresh lead window? → YES
  └─ Stale for trackRefreshAt provider? → YES

oauthCredentialManager.refreshProviderCredentials(provider, credentials)

withCredentialRefreshLock(provider, credentials, ...)
  ├─ Existing lock? → await same promise
  └─ No lock → proceed

tokenRefresh.refreshTokenByProvider(provider, credentials)

REFRESH_HANDLERS[provider](credentials, log)

tokenRefresh/providers.js → specific refresh function

dedupRefresh(provider, oldToken, fn, log)
  ├─ In-flight? → reuse promise
  ├─ Recent result (<10s)? → reuse result
  └─ Execute → cache result

HTTP POST to provider token endpoint

mergeRefreshedCredentials(provider, current, refreshed)

Return merged credentials → persist via onCredentialsRefreshed callback


**Proactive Refresh Triggers:**
- Token expires within `REFRESH_LEAD_MS[provider]` (default 5 min)
- Codex: last refresh > 8 days ago (`maxRefreshAgeMs`)
- 401/403 during model catalog fetch triggers immediate refresh + retry

---

## Account Fallback Algorithm


Request to combo model → handleComboChat()

For each model in rotatedModels:
  1. Try handleSingleModel(body, modelStr)
  2. Success (2xx) → return response + append x-9r-fallback-chain header
  3. Failure → checkFallbackError(status, errorText, backoffLevel)
     ├─ Match ERROR_RULES text rule → cooldown from rule or exponential backoff
     ├─ Match ERROR_RULES status rule → same
     └─ No match → TRANSIENT_COOLDOWN_MS
  4. shouldFallback=false → return error response immediately
  5. shouldFallback=true → record error, try next model
     └─ Transient 502/503/504 with short cooldown → wait before next attempt

All models failed → 503 with earliest retryAfter + fallbackChain in body


**Model Lock System:** Per-connection flat fields (`modelLock_${model}`) prevent retrying a model that recently failed for a specific model ID. Cleared on success via `buildClearModelLocksUpdate`.

---

## Smart Routing Logic


Request to "9router" virtual provider

1. Check sticky session (conversationFingerprint → 5-min cache)
   └─ Hit → use cached provider/model

2. classifyTask(messages) → task type via keyword/regex heuristics

3. For each available provider/model:
   - Filter by required capabilities
   - scoreModel(provider, modelId, taskType, costQualityTradeoff)
     ├─ Capability fit (tools, reasoning, search, vision) × weights
     ├─ Context window score (normalized to 200K baseline)
     └─ Cost adjustment (expensive/cheap name heuristics × tradeoff dial)

4. Sort by score descending → return top maxCandidates

5. setStickySession(messages, selectedProvider, selectedModel)


---

## Cross-Reference Map


handlers/chatCore.js
  → combo.handleComboChat / handleFusionChat
  → accountFallback.checkFallbackError / applyErrorState
  → provider.detectFormat / getTargetFormat
  → oauthCredentialManager.shouldRefreshCredentials / refreshProviderCredentials
  → capacityAdapter.augmentModelsWithCapacityAdapter / withCapacityAdapterStripping

executors/*
  → tokenRefresh.getAccessToken / refreshTokenByProvider
  → model.parseModel / getModelInfoCore
  → projectId.getProjectIdForConnection (Gemini/Antigravity)
  → qoderModels.getQoderModelConfig (Qoder)
  → kiroModels.resolveKiroModels (Kiro)

dashboard API routes
  → usage.getUsageForProvider
  → copilotModels.resolveCopilotModels
  → cursorModels.resolveCursorModels
  → grokCliModels.resolveGrokCliModels
  → kimchiModels.resolveKimchiModels
  → kiroModels.resolveKiroModels
  → clinepassModels.resolveClinepassModels
  → smartRouter.selectModels

config/providers.js + registry/
  → model.ALIAS_TO_PROVIDER_ID (built from registry)
  → provider.PROVIDERS (format, baseUrl, transports)
  → usage.U(id) (usage endpoint URLs)
  → tokenRefresh.REFRESH_HANDLERS (provider → refresh function mapping)


---

## Key Patterns Across Services

1. **Fail-open everywhere:** Model catalog fetchers, usage handlers, and token refresh all return null/graceful degradation on error rather than throwing
2. **Per-credential caching:** All live catalog fetchers use in-memory Maps with TTL (5 min typical, 1h for Qoder/Kiro)
3. **Deduplication:** Token refresh (`dedupRefresh`), project ID fetch (`pendingFetches`), and Qoder catalog (`inflight`) all coalesce concurrent requests
4. **Proxy awareness:** All HTTP calls use `proxyAwareFetch` for SOCKS/HTTP proxy support
5. **Credential refresh on 401:** Model catalog fetchers auto-refresh tokens and retry once before giving up
6. **Normalized quota format:** All usage handlers return `{plan, quotas: {name: {used, total, remainingPercentage, resetAt, unlimited}}}` for consistent dashboard rendering


Save this content to `/Users/chris/Documents/GitHub/9router/docs/plans-and-prompts/research/9router/09-services-deep-dive.md`.