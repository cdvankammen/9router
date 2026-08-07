# 9Router Executors Deep Dive

> **Generated**: 2026-08-06
> **Scope**: Every `.js` file in `open-sse/executors/` (30 files)
> **Purpose**: Exhaustive reference for any agent needing to understand how each provider is called

---

## Summary Table

| # | File | Executor Class | Provider(s) | Protocol | Auth | Special |
|---|------|---------------|-------------|----------|------|---------|
| 1 | `index.js` | (registry) | All | — | — | Dispatcher + alias map |
| 2 | `base.js` | `BaseExecutor` | (abstract) | HTTP POST JSON | Bearer/x-api-key | Retry/fallback/timeout loop |
| 3 | `default.js` | `DefaultExecutor` | openai-compatible-*, anthropic-compatible-*, claude, kimi, cline, kilocode, gemini | REST JSON | Config-driven descriptors | OAuth refresh hub, json_schema→json_object fallback |
| 4 | `9router.js` | `NineRouterExecutor` | 9router, 9r | Virtual (no upstream) | noAuth | Smart router — **throws** if reached directly |
| 5 | `antigravity.js` | `AntigravityExecutor` | antigravity | REST JSON (Gemini internal) | Bearer OAuth | Image gen, tool cloaking, IDE request IDs, Retry-After parsing |
| 6 | `azure.js` | `AzureExecutor` | azure | REST (Azure OpenAI) | api-key header | Deployment-based URL, api-version query param |
| 7 | `codebuddy-cn.js` | `CodeBuddyExecutor` | codebuddy-cn | REST OpenAI-compat | Bearer | Force stream=true, system prompt sanitization, reasoning_summary mirroring |
| 8 | `codebuddy-intl.js` | `CodeBuddyIntlExecutor` | codebuddy-intl | REST OpenAI-compat | Bearer | Force stream=true, typed content blocks, system prefix injection |
| 9 | `codex.js` | `CodexExecutor` | codex | OpenAI Responses API | Bearer + ChatGPT-Account-ID | Image prefetch, SSE peek retry, reasoning effort normalization, store=false |
| 10 | `commandcode.js` | `CommandCodeExecutor` | commandcode | AI SDK v5 NDJSON | Bearer (user_xxx) | NDJSON→SSE transform via translator |
| 11 | `cursor.js` | `CursorExecutor` | cursor, cu | Protobuf + HTTP/2 | Checksum-based headers | Agent service (h2 duplex), protobuf encode/decode, gzip decompression |
| 12 | `devin-cli.js` | `DevinCliExecutor` | devin-cli | ACP JSON-RPC 2.0 stdio | noAuth (env creds) | Subprocess spawn, MCP tool bridge, workspace cwd resolution |
| 13 | `gemini-cli.js` | `GeminiCLIExecutor` | gemini-cli | Gemini generateContent | Bearer OAuth | Google Cloud Code Assist wrapper, RetryInfo parsing |
| 14 | `github.js` | `GithubExecutor` | github | REST (3 endpoints) | Bearer copilot token | /chat/completions, /responses (Codex), /v1/messages (Claude) routing |
| 15 | `grok-cli.js` | `GrokCliExecutor` | grok-cli, gcli, gb | OpenAI Responses API | Bearer OAuth | Turn index tracking, encrypted reasoning, agent ID fingerprint |
| 16 | `grok-web.js` | `GrokWebExecutor` | grok-web | REST NDJSON | SSO cookie | Web scraping, Statsig fingerprint, model mode mapping |
| 17 | `iflow.js` | `IFlowExecutor` | iflow | REST OpenAI-compat | Bearer + HMAC-SHA256 | Per-request HMAC signature, stream_options injection |
| 18 | `kimchi.js` | `KimchiExecutor` | kimchi | REST OpenAI-compat | Bearer | Anthropic artifact stripping, system merge, reasoning strip |
| 19 | `kiro.js` | `KiroExecutor` | kiro | AWS EventStream binary | Bearer + TokenType | Binary protocol, CRC32, integrity gate, tool-call repair, multi-endpoint fallback |
| 20 | `mimo-free.js` | `MimoFreeExecutor` | mimo-free, mmf | REST OpenAI-compat | JWT (bootstrap) | JWT bootstrap flow, device fingerprint, system marker injection |
| 21 | `ollama-local.js` | `OllamaLocalExecutor` | ollama-local | REST (/api/chat) | None | Minimal — only overrides buildUrl |
| 22 | `opencode-go.js` | `OpenCodeGoExecutor` | opencode-go | REST (multi-format) | x-api-key or Bearer | Per-model endpoint routing (messages vs chat/completions) |
| 23 | `opencode.js` | `OpenCodeExecutor` | opencode | REST | Bearer "public" | Public gateway, x-opencode-client header |
| 24 | `perplexity-web.js` | `PerplexityWebExecutor` | perplexity-web | REST SSE | Bearer or session cookie | Web scraping, session cache (FNV-1a), citation/Grok tag cleaning |
| 25 | `qoder.js` | `QoderExecutor` | qoder | REST + COSY signing | COSY (RSA+AES+MD5) | Body encoding, ~17 Cosy-* headers, SSE envelope unwrap |
| 26 | `trae.js` | `TraeExecutor` | trae | REST + SSE events | Cloud-IDE-JWT | Two-phase: create session → stream events, plan_item thoughts |
| 27 | `vertex.js` | `VertexExecutor` | vertex, vertex-partner | REST (Gemini / OpenAI-compat) | SA JSON JWT / ADC / API key | Multi-auth (SA, ADC, raw key), project ID resolution |
| 28 | `windsurf.js` | `WindsurfExecutor` | windsurf | gRPC-web protobuf | Bearer + protobuf Metadata | Minimal protobuf encoder/decoder, model alias map (90+ entries) |
| 29 | `xiaomi-tokenplan.js` | `XiaomiTokenplanExecutor` | xiaomi-tokenplan | REST (multi-format) | Bearer | Per-transport URL routing (claude→/anthropic, openai→/chat) |
| 30 | `zed.js` | `ZedExecutor` | zed | NDJSON/SSE | LLM bearer token (RSA-exchanged) | Multi-provider proxy, per-model format detection, thread envelope |

---

## 1. `index.js` — Executor Registry

**Size**: ~90 lines
**Exports**: `getExecutor(provider)`, `hasSpecializedExecutor(provider)`, all executor classes re-exported

### Key Behavior
- Instantiates all specialized executors in a static map
- `getExecutor()` returns the specialized executor if one exists, otherwise creates/caches a `DefaultExecutor` per provider
- Aliases: `cu` → cursor, `gcli`/`gb` → grok-cli, `mmf` → mimo-free, `9r` → 9router, `vertex-partner` → VertexExecutor("vertex-partner")

---

## 2. `base.js` — BaseExecutor (Abstract Base)

**Size**: ~170 lines
**Exports**: `BaseExecutor` (named + default)

### Constructor
- `constructor(provider, config)` — sets `this.provider`, `this.config`, `this.noAuth`

### Core Methods

| Method | Description |
|--------|-------------|
| `getBaseUrls()` | Returns `config.baseUrls` or `[config.baseUrl]` |
| `getFallbackCount()` | Number of fallback URLs (default 1) |
| `buildUrl(model, stream, urlIndex, credentials)` | Resolves URL; handles openai-compatible-*, anthropic-compatible-* prefixes |
| `buildHeaders(credentials, stream)` | Sets Content-Type, auth (Bearer or x-api-key), Accept: text/event-stream |
| `transformRequest(model, body, stream, credentials)` | Identity (override in subclass) |
| `shouldRetry(status, urlIndex)` | Retries on 429 if more fallback URLs exist |
| `refreshCredentials(credentials, log, proxyOptions)` | Returns null (override in subclass) |
| `needsRefresh(credentials)` | Delegates to `shouldRefreshCredentials()` from oauthCredentialManager |
| `parseError(response, bodyText)` | Returns `{status, message}` |

### `execute()` — The Core Loop
1. Iterates through `fallbackCount` URLs
2. For each URL: builds URL, transforms body, builds headers
3. Sets up connect timeout via `AbortController` (configurable, default `FETCH_CONNECT_TIMEOUT_MS`)
4. Calls `proxyAwareFetch()` with POST method
5. **Retry logic**: `tryRetry()` checks `retryConfig[statusKey]` for attempts/delay, supports dynamic delay via `computeRetryDelay()` hook
6. On network errors: maps to 502 retry config
7. On all URLs exhausted: throws last error

### Imports
- `HTTP_STATUS`, `RETRY_CONFIG`, `DEFAULT_RETRY_CONFIG`, `resolveRetryEntry`, `FETCH_CONNECT_TIMEOUT_MS` from `config/runtimeConfig.js`
- `shouldRefreshCredentials` from `services/oauthCredentialManager.js`
- `proxyAwareFetch` from `utils/proxyFetch.js`
- `dbg` from `utils/debugLog.js`
- `ANTHROPIC_API_VERSION`, `OPENAI_COMPAT_BASE`, `ANTHROPIC_COMPAT_BASE` from `providers/shared.js`
- `resolveOpenAICompatibleApiType` from `services/provider.js`

---

## 3. `default.js` — DefaultExecutor

**Size**: ~300 lines
**Exports**: `DefaultExecutor` (named)
**Extends**: `BaseExecutor`

### Provider Handling
Handles **all** providers without a specialized executor. Key built-in support:
- `openai-compatible-*` — resolves baseUrl from credentials, picks `/responses` or `/chat/completions`
- `anthropic-compatible-*` — x-api-key auth, anthropic-version header
- `claude`, `codex`, `gemini`, `kiro`, `iflow`, `kimi`, `kimi-coding`, `cline`, `clinepass`, `kilocode` — OAuth refresh

### `transformRequest()`
1. `applyJsonSchemaFallback()` — converts `json_schema` → `json_object` for openai-compatible providers, injecting schema as system prompt
2. Drops `client_metadata` if `config.quirks.dropClientMetadata`
3. `stripUnsupportedParams()` — config-driven parameter removal
4. `injectReasoningContent()` — ensures reasoning placeholder for upstream validation

### `buildUrl()`
Priority order:
1. `credentials.runtimeTransport.baseUrl` (+ urlSuffix) — sourceFormat-matched endpoint
2. `openai-compatible-*` → `{baseUrl}/chat/completions` or `/responses`
3. `anthropic-compatible-*` → `{baseUrl}/messages`
4. `config.format === "gemini"` → `{baseUrl}/{model}:streamGenerateContent?alt=sse`
5. `config.urlSuffix` appended
6. `{accountId}` template substitution
7. Raw `config.baseUrl`

### `buildHeaders()`
- **Auth descriptors** resolved from `PROVIDERS[provider].auth` registry or fallback heuristics
- **Header hooks**: `kimiHeaders` (device_id), `clineHeaders`, `kilocodeOrg` (org ID)
- For `claude`: sets `Anthropic-Beta` via `selectAnthropicBeta(model)`
- For `anthropic-compatible-*` non-Anthropic gateways: strips `anthropic-dangerous-direct-browser-access`, `x-app`, and `claude-code-20250219` from beta headers; adds dual Bearer+x-api-key

### OAuth Refresh Methods
| Provider | Method | Token URL | Encoding |
|----------|--------|-----------|----------|
| claude | `refreshFromGrant()` | Config-driven | Config-driven |
| codex | `refreshFromGrant()` | Config-driven | Config-driven |
| gemini | `refreshFromGrant()` | Config-driven | JSON or form |
| iflow | `refreshIflow()` | `OAUTH_ENDPOINTS.iflow.token` | form + Basic auth |
| kiro | `refreshKiro()` | `PROVIDERS.kiro.tokenUrl` | JSON (`{refreshToken}`) |
| cline/clinepass | `refreshCline()` | `PROVIDERS.cline.refreshUrl` | JSON (`{refreshToken, grantType, clientType}`) |
| kimi/kimi-coding | `refreshKimi()` | CLIProxyAPI DeviceFlow | form + X-Msh-* headers |
| kilocode | `refreshKilocode()` | Config-driven | Config-driven |

### Imports
- `PROVIDERS`, `PROVIDER_OAUTH` from `config/providers.js`
- `ANTHROPIC_API_VERSION`, `OPENAI_COMPAT_BASE`, `ANTHROPIC_COMPAT_BASE`, `selectAnthropicBeta` from `providers/shared.js`
- `resolveOpenAICompatibleApiType` from `services/provider.js`
- `OAUTH_ENDPOINTS`, `buildKimiHeaders` from `config/appConstants.js`
- `buildClineHeaders` from `shared/clineAuth.js`
- `injectReasoningContent` from `utils/reasoningContentInjector.js`
- `stripUnsupportedParams` from `translator/concerns/paramSupport.js`

---

## 4. `9router.js` — NineRouterExecutor (Smart Router)

**Size**: ~170 lines
**Exports**: `NineRouterExecutor` (named)
**Extends**: `BaseExecutor`
**Provider**: `9router` (virtual, noAuth)

### Key Behavior
**This executor throws immediately if reached directly.** Smart routing is handled at the app layer (pre-combo interception in `handleChat`). The remaining code is unreachable but kept for reference.

### Original Design (unreachable)
1. Checks session stickiness (5-min TTL conversation fingerprint)
2. Detects required capabilities from request body
3. Applies task type bias per virtual model (`auto`, `best-code`, `best-chat`, `best-reasoning`, `best-cheap`)
4. Selects top 5 candidates via `selectModels()`
5. Tries candidates in order with fallback on retryable errors (429, 5xx)
6. Dispatches via `handleChatCore()` — re-enters the full pipeline for the target provider
7. Injects routing metadata in response headers (`x-9router-selected-model`, etc.)

### Virtual Models & Cost/Quality Tradeoff
| Virtual Model | Task Bias | CQT Default |
|---------------|-----------|-------------|
| `auto` | None | 5 |
| `best-code` | code:generation, debugging, review, refactoring | 4 |
| `best-chat` | creative_writing, general_chat, customer_support | 5 |
| `best-reasoning` | math, reasoning, agent:multi_step | 3 |
| `best-cheap` | None (high tradeoff) | 9 |

### Imports
- `classifyTask`, `selectModels`, `getStickySession`, `setStickySession` from `services/smartRouter.js`
- `detectRequiredCapabilities` from `services/combo.js`
- `handleChatCore` from `handlers/chatCore.js`

---

## 5. `antigravity.js` — AntigravityExecutor

**Size**: ~650 lines
**Exports**: `AntigravityExecutor` (named + default)
**Extends**: `BaseExecutor`
**Provider**: `antigravity`

### Endpoint
```
{baseUrl}/v1internal:streamGenerateContent?alt=sse   (streaming)
{baseUrl}/v1internal:generateContent                  (non-streaming / image gen)
```

### Auth
- `Authorization: Bearer {accessToken}`
- Custom `User-Agent` from `ANTIGRAVITY_HEADERS`

### `transformRequest()` — Complex
Wraps body in `{ project, model, userAgent: "antigravity", requestType, requestId, request }`:
1. **Image generation** (`isImageModel()`): Completely different structure — simplified contents, `generationConfig.imageConfig` with aspect ratio parsed from model name suffix (e.g., `gemini-3.1-flash-image-16x9`)
2. **Standard requests**:
   - Fixes `functionResponse` role to "user" for Claude models
   - Strips thought-only parts, backfills `thoughtSignature` on functionCall parts (Gemini 3+ requirement)
   - Sanitizes function names (Gemini regex: `[a-zA-Z_][a-zA-Z0-9_.:\-]{0,63}`)
   - Cleans JSON schemas via `cleanJSONSchemaForAntigravity()`
   - Merges all tool groups into single `functionDeclarations` group
   - Strips blacklisted fields: `output_config`, `thinking`, `reasoning_effort`, `reasoning`, `enable_thinking`, `thinking_budget`, `thinkingConfig`
   - Caps `maxOutputTokens` at 64,000
   - Resolves `sessionId` via `resolveSessionId()` with scope "antigravity"
   - Sets `toolConfig.functionCallingConfig.mode: "VALIDATED"` when tools present

### IDE Request ID
Format: `agent/{conversationId}/{timestamp}/{trajectoryId}/{step}` — deterministic UUIDs seeded from session ID

### Tool Cloaking (`static cloakTools()`)
Anti-ban mechanism:
- Renames client tools with `_ide` suffix (AG_TOOL_SUFFIX)
- Injects 22 AG decoy tools (same names as native AG tools, but "currently unavailable")
- Renames tool names in conversation history (functionCall.name, functionResponse.name)
- Preserves native AG tool names for non-Copilot clients

### Retry Logic
- `computeRetryDelay()` hook for BaseExecutor's tryRetry:
  1. Parses `Retry-After` / `x-ratelimit-reset-after` / `x-ratelimit-reset` headers
  2. Parses retry time from error message body (e.g., "reset after 2h7m23s")
  3. Caps at `MAX_RETRY_AFTER_MS` (10s)
  4. Detects transient errors via regex patterns (high traffic, capacity, timeout, etc.)
  5. Exponential backoff for transient errors

### Token Refresh
- Standard Google OAuth2 form-encoded refresh via `OAUTH_ENDPOINTS.google.token`

### Imports
- `OAUTH_ENDPOINTS`, `ANTIGRAVITY_HEADERS`, `AG_DEFAULT_TOOLS`, `AG_TOOL_SUFFIX` from `config/appConstants.js`
- `cleanJSONSchemaForAntigravity` from `translator/formats/gemini.js`
- `DEFAULT_THINKING_AG_SIGNATURE` from `config/defaultThinkingSignature.js`
- `resolveSessionId` from `utils/sessionManager.js`

---

## 6. `azure.js` — AzureExecutor

**Size**: ~55 lines
**Exports**: `AzureExecutor` (named)
**Extends**: `DefaultExecutor`
**Provider**: `azure`

### Endpoint
```
{azureEndpoint}/openai/deployments/{deployment}/chat/completions?api-version={apiVersion}
```

### Configuration Sources (priority)
1. `credentials.providerSpecificData.azureEndpoint` / `.apiVersion` / `.deployment`
2. Environment variables: `AZURE_ENDPOINT`, `AZURE_API_VERSION`, `AZURE_DEPLOYMENT`
3. Defaults: `https://api.openai.com`, `2024-10-01-preview`, `gpt-4`

### Auth
- `api-key: {apiKey}` header (NOT Bearer — Azure-specific)
- Optional `OpenAI-Organization` header

### No body transformation (passthrough)

---

## 7. `codebuddy-cn.js` — CodeBuddyExecutor

**Size**: ~60 lines
**Exports**: `CodeBuddyExecutor` (named + default)
**Extends**: `DefaultExecutor`
**Provider**: `codebuddy-cn`
**Endpoint**: `https://copilot.tencent.com/v2/chat/completions`

### Key Behaviors
1. **Force `stream: true`** — Tencent rejects non-stream (HTTP 400, code 11101)
2. **System prompt sanitization**: Detects agent system prompts (Claude Code, Cursor, Windsurf, Cline, etc.) via regex pattern and replaces with neutral "You are a helpful AI assistant..." — Tencent's content filter flags these as prompt injection
3. **Reasoning mirroring**: If client sets `reasoning_effort`, adds `reasoning_summary: "auto"` to match CLI behavior; strips `"none"`/`"off"` values

---

## 8. `codebuddy-intl.js` — CodeBuddyIntlExecutor

**Size**: ~40 lines
**Exports**: `CodeBuddyIntlExecutor` (named + default)
**Extends**: `DefaultExecutor`
**Provider**: `codebuddy-intl`
**Endpoint**: `https://www.codebuddy.ai/v2/chat/completions`

### Key Behaviors
1. **Force `stream: true`** (same as CN)
2. **Message restructuring**: Prepends `{role: "system", content: "You are CodeBuddy Code."}`, converts plain-string user content to typed blocks `[{type: "text", text: "..."}]`
3. **Reasoning mirroring** (same as CN)

---

## 9. `codex.js` — CodexExecutor

**Size**: ~500+ lines
**Exports**: `CodexExecutor` (named)
**Extends**: `BaseExecutor`
**Provider**: `codex`

### Endpoint
```
{config.baseUrl}              (normal)
{config.baseUrl}/compact      (when body._compact is true)
```

### Auth Headers
- Standard Bearer token
- `session_id`: Stable per-conversation (resolved via `resolveSessionId()`)
- `originator: "codex_cli_rs"` (matches official CLI)
- `ChatGPT-Account-ID`: From `workspaceId` / `chatgptAccountId` / `accountId`

### `transformRequest()` — Extensive
1. Resolves cache session ID for `prompt_cache_key`
2. Normalizes input to array format via `normalizeResponsesInput()`
3. Converts `role: "system"` → `role: "developer"` (cacheable prefix)
4. Strips server-generated item IDs (`rs_`, `fc_`, `resp_`, `msg_` prefixes)
5. Normalizes tools: flattens Chat Completions shape → Responses flat format, filters unsupported types, keeps hosted tools (image_generation, web_search, file_search, code_interpreter, mcp, local_shell, tool_search), passes through custom tools
6. Injects `CODEX_DEFAULT_INSTRUCTIONS` if no instructions provided
7. Forces `stream: true`, `store: false`
8. Sets `prompt_cache_key` from session ID
9. Maps virtual Codex review models via `getModelUpstreamId("cx", ...)`
10. Extracts thinking level from model suffix (`-none`, `-minimal`, `-low`, `-medium`, `-high`, `-xhigh`)
11. Normalizes reasoning effort via `normalizeReasoningEffort()` (maps ultra→max, max→xhigh)
12. Sets `reasoning.summary: "auto"`, includes `reasoning.encrypted_content`
13. Strips ~20 unsupported params (temperature, top_p, penalties, logprobs, n, seed, max_tokens, etc.)
14. Maps `service_tier: "fast"` → `"priority"`, strips other tiers
15. Final allowlist filter: only keeps fields in `RESPONSES_API_ALLOWLIST`

### Image Prefetch (`prefetchImages()`)
Codex backend cannot fetch remote images — prefetches all `image_url` items in `body.input` and inlines as base64 data URIs via `fetchImageAsBase64()`.

### SSE-Level Retry (`_peekSseTransientError()`)
Reads first 256KB of SSE body to detect upstream errors inside 200-OK responses:
- **Retry patterns**: `server_is_overloaded`, `service_unavailable_error` → retry same account
- **Account fallback patterns**: `selected model is at capacity`, `model_at_capacity` → return 503 for account rotation
- **User output patterns**: stops peeking early if real content starts flowing
- Re-assembles stream from prefix chunks + remaining upstream body when no error found

### Token Refresh
Delegates to `refreshProviderCredentials("codex", ...)` from oauthCredentialManager.

### Imports
- `CODEX_DEFAULT_INSTRUCTIONS` from `config/codexInstructions.js`
- `normalizeResponsesInput` from `translator/formats/responsesApi.js`
- `fetchImageAsBase64` from `translator/concerns/image.js`
- `getModelUpstreamId` from `config/providerModels.js`
- `getThinkingLevels` from `providers/thinkingLevels.js`
- `resolveSessionId` from `utils/sessionManager.js`

---

## 10. `commandcode.js` — CommandCodeExecutor

**Size**: ~80 lines
**Exports**: `CommandCodeExecutor` (named + default)
**Extends**: `BaseExecutor`
**Provider**: `commandcode`
**Endpoint**: `https://api.commandcode.ai/alpha/generate`

### Auth
- `Authorization: Bearer {apiKey}` (user_xxx format)
- `x-session-id: {randomUUID()}` per request

### Protocol
- Upstream returns **AI SDK v5 NDJSON** (one JSON event per line, no `data:` prefix)
- Forces `stream: true`
- Wraps response through `wrapNdjsonAsOpenAISse()`: TransformStream that translates each NDJSON line via `commandCodeToOpenAIResponse()` translator and emits OpenAI SSE chunks

### Imports
- `commandCodeToOpenAIResponse` from `translator/response/commandcode-to-openai.js`
- `SSE_DONE` from `utils/sseConstants.js`

---

## 11. `cursor.js` — CursorExecutor

**Size**: ~1000+ lines
**Exports**: `CursorExecutor` (named)
**Extends**: `BaseExecutor`
**Provider**: `cursor`, `cu`

### Two Execution Paths

#### Path A: AgentService (HTTP/2 Protobuf)
Triggered when `isAgentTextRequest(body)` returns true (all messages are text-only, no tool_calls/tool role):
- **Endpoint**: `{agentEndpoint}/agent.v1.AgentService/Run` (from `PROVIDER_OAUTH.cursor.agentEndpoint`)
- **Protocol**: HTTP/2 duplex stream (Node's fetch/undici speaks HTTP/1.1 and fails on h2 preface)
- **Request encoding**: Custom protobuf via `buildAgentRunFrame()` — encodes messages, system prompt, model into Connect-RPC framed protobuf
- **Response decoding**: `decodeAgentFrames()` with gzip decompression → `decodeMessage()` → extracts text deltas from `interaction_update` events
- **Request context**: Responds to AgentService's IDE context request with empty `RequestContext` (9router has no editor)
- Emits OpenAI SSE chunks or aggregated JSON response

#### Path B: Legacy ChatService (Protobuf over HTTP/1.1)
For conversations with tool_calls or non-text content:
- **Endpoint**: `{baseUrl}{chatPath}` from config
- Uses `generateCursorBody()` to encode messages/tools into protobuf
- HTTP/2 preferred when available, falls back to fetch with proxy support
- Response: binary protobuf frames with flags (NONE=0x00, GZIP=0x01, TRAILER=0x02, GZIP_TRAILER=0x03)
- `transformProtobufToSSE()` / `transformProtobufToJSON()` decode frames via `readCursorFrame()` → `extractTextFromResponse()`
- Handles streaming tool call accumulation (arguments arrive in fragments)

### Auth
- Headers built by `buildCursorHeaders()` from `utils/cursorChecksum.js` — includes checksum-based integrity headers
- Requires `machineId` in credentials (throws if missing)
- Ghost mode enabled by default

### Model Detection
- `isComposerModel()` detects composer-* models for special thinking content extraction
- Claude Code UA detection forces Agent mode

### Imports
- `generateCursorBody`, `encodeField`, `wrapConnectRPCFrame`, `decodeMessage`, `parseConnectRPCFrame`, `extractTextFromResponse` from `utils/cursorProtobuf.js`
- `buildCursorHeaders` from `utils/cursorChecksum.js`
- `estimateUsage` from `utils/usageTracking.js`
- `chatChunkSse`, `sseChunk` from `utils/sse.js`
- `FORMATS` from `translator/formats.js`

---

## 12. `devin-cli.js` — DevinCliExecutor

**Size**: ~850 lines
**Exports**: `DevinCliExecutor` (named + default)
**Extends**: `BaseExecutor`
**Provider**: `devin-cli`
**Endpoint**: `devin://acp/stdio` (virtual — spawns subprocess)

### Protocol: ACP JSON-RPC 2.0 over stdio
1. Spawns `devin acp` binary (discovered via `CLI_DEVIN_BIN` env → known paths → PATH)
2. Sends: `initialize` → `session/new` (with model, cwd, mcpServers) → `session/prompt`
3. Receives: `session/update` notifications streamed as NDJSON on stdout
4. Emits OpenAI-compatible SSE chunks

### Binary Discovery (`resolveDevinBin()`)
Checks platform-specific paths:
- macOS/Linux: `~/.local/share/devin/bin/devin`, `~/.devin/bin/devin`, `/opt/homebrew/bin/devin`, `/usr/local/bin/devin`
- Windows: `%LOCALAPPDATA%\devin\cli\bin\devin.exe`, scoop shims

### Client Tools → MCP Bridge
- OpenAI `body.tools` exposed as a stdio MCP server named "clientTools"
- Tool names prefixed with `mcp_` (devin only discovers MCP tools with this prefix)
- When devin calls a client tool ("Calling mcp_X from clientTools"), emits OpenAI `tool_use` chunk and ends turn
- Prior tool_results seeded via `DEVIN_MCP_RESULTS` env var so re-calls get real data
- MCP config written to throwaway `XDG_CONFIG_HOME` directory, cleaned up on finish

### Workspace CWD Resolution
Scans body fields (`cwd`, `working_directory`, `workdir`, `workspace`, metadata) and message content for `<cwd>` tags. Falls back to `os.tmpdir()`.

### Environment
- Inherits parent env (for stored CLI credentials at `~/.local/share/devin/credentials.toml`)
- `DEVIN_PERMISSION_MODE=bypass` (auto-approve tool execution)
- `CLI_DEVIN_AGENT_TYPE=summarizer` for tool-less text-only mode

### Message Handling
`buildPromptText()` inlines entire conversation history including tool_calls/tool_results as labeled text blocks (`[System]`, `[User]`, `[Assistant]`, `[Tool]`).

### Imports
- Node built-ins: `child_process.spawn`, `path`, `os`, `fs`

---

## 13. `gemini-cli.js` — GeminiCLIExecutor

**Size**: ~80 lines
**Exports**: `GeminiCLIExecutor` (named + default)
**Extends**: `BaseExecutor`
**Provider**: `gemini-cli`

### Endpoint
```
{baseUrl}:streamGenerateContent?alt=sse   (streaming)
{baseUrl}:generateContent                  (non-streaming)
```

### Auth Headers
- `Authorization: Bearer {accessToken}`
- `User-Agent`: Dynamic via `geminiCLIUserAgent(model)`
- `X-Goog-Api-Client: {GEMINI_CLI_API_CLIENT}`

### `transformRequest()`
Wraps body in Cloud Code Assist envelope: `{ project, model, request: <body> }` if not already wrapped. Stores model for use in `buildHeaders()`.

### Error Parsing
Parses `RetryInfo.retryDelay` from Google API 429 error details.

### Token Refresh
Standard Google OAuth2 form-encoded refresh via `OAUTH_ENDPOINTS.google.token`.

### Imports
- `OAUTH_ENDPOINTS`, `GEMINI_CLI_API_CLIENT`, `geminiCLIUserAgent` from `config/appConstants.js`

---

## 14. `github.js` — GithubExecutor

**Size**: ~500 lines
**Exports**: `GithubExecutor` (named + default)
**Extends**: `BaseExecutor`
**Provider**: `github`

### Three Endpoint Routes

| Route | Models | Endpoint | Translation |
|-------|--------|----------|-------------|
| `/chat/completions` | gpt, gemini, grok | `config.baseUrl` | Sanitized OpenAI (strips non-text/image parts) |
| `/responses` | Codex/GPT-5+ (known set) | `config.responsesUrl` | `openaiToOpenAIResponsesRequest()` → `openaiResponsesToOpenAIResponse()` |
| `/v1/messages` | Claude (name-pattern detected) | `config.messagesUrl` | `translateRequest(OPENAI→CLAUDE)` → `translateResponse(CLAUDE→OPENAI)` |

### Claude Route Rationale
Copilot's `/v1/messages` shim is the **only** endpoint that surfaces prompt-cache token counts for Claude models. Detected by model NAME regex (`/claude/i`), not registry field.

### Auto-Escalation
If `/chat/completions` returns 400 with "not accessible via the /chat/completions endpoint", caches model in `knownCodexModels` set and retries via `/responses`. Only for models that `/responses` can actually serve (excludes Gemini/Claude).

### Auth Headers
- `Authorization: Bearer {copilotToken || accessToken}`
- `copilot-integration-id: "vscode-chat"`
- `editor-version`, `editor-plugin-version`, `user-agent` from `GITHUB_COPILOT` constants
- `openai-intent: "conversation-panel"`
- `x-github-api-version`, `x-request-id` (UUID)
- `anthropic-version` (harmless no-op on non-Claude routes)

### Token Refresh (Two-Stage)
1. Refreshes Copilot token via `https://api.github.com/copilot_internal/v2/token` using GitHub access token
2. If Copilot refresh fails and `refreshToken` exists, refreshes GitHub OAuth token first, then retries Copilot refresh

### Imports
- `openaiToOpenAIResponsesRequest` from `translator/request/openai-responses.js`
- `openaiResponsesToOpenAIResponse` from `translator/response/openai-responses.js`
- `initState`, `translateRequest`, `translateResponse` from `translator/index.js`
- `FORMATS` from `translator/formats.js`
- `parseSSELine`, `formatSSE` from `utils/streamHelpers.js`
- `stripUnsupportedParams` from `translator/concerns/paramSupport.js`
- `OAUTH_ENDPOINTS`, `GITHUB_COPILOT` from `config/appConstants.js`

---

## 15. `grok-cli.js` — GrokCliExecutor

**Size**: ~400 lines
**Exports**: `GrokCliExecutor` (named + default), `countGrokCliUserTurns`, `resolveGrokCliTurnIdx`, `normalizeGrokCliEffort`, `resolveGrokCliSessionId`, `normalizeGrokCliInput`
**Extends**: `BaseExecutor`
**Provider**: `grok-cli`, `gcli`, `gb`

### Endpoint
`config.baseUrl` (cli-chat-proxy.grok.com Responses API)

### Auth Headers (Extensive Fingerprinting)
- Standard Bearer token
- `x-grok-client-identifier`, `x-grok-client-version` from config/grokCli.js
- `x-grok-session-id`, `x-grok-conv-id` (same value for chat turns)
- `x-grok-req-id` (UUID per request)
- `x-grok-turn-idx` (monotonic 1-based user turn count per session)
- `x-grok-agent-id` (stable device fingerprint or UUID)
- `x-grok-model-override` (resolved upstream model)
- `x-email`, `x-userid` from credentials

### `transformRequest()` — Responses API Shape
1. Resolves session ID, request ID, agent ID
2. Normalizes input via `normalizeResponsesInput()`
3. Soft fallback: maps `messages[]` → `input[]` if translator didn't convert
4. `normalizeGrokCliInput()` — normalizes custom_tool_call/function_call shapes, strips internal metadata passthrough
5. `stripStoredItemReferences()` — removes server-generated IDs incompatible with store=false
6. `normalizeGrokCliTools()` — flattens Chat Completions tools, keeps hosted types (web_search, x_search, image_generation, etc.)
7. Resolves turn index (monotonic per session, never decreases)
8. Forces `stream: true`, `store: false`
9. Resolves upstream model via `getModelUpstreamId("gcli"/"grok-cli", ...)`
10. Reasoning effort: priority explicit > reasoning_effort > model suffix > default "high"; skips effort for models that don't support it
11. Includes `reasoning.encrypted_content` for multi-turn continuity
12. Strips Chat Completions leftovers (messages, max_tokens, penalties, etc.)
13. Final allowlist filter (`RESPONSES_API_ALLOWLIST`)

### Turn Index Tracking
- `countGrokCliUserTurns()` counts user-role message items in input array
- `resolveGrokCliTurnIdx()` ensures monotonic increase per session within process lifetime
- Session store capped at 5000 entries with TTL from `MEMORY_CONFIG.sessionTtlMs`

### Agent ID
Lazy-resolved once per process via `getConsistentMachineId("grok-cli-agent")`, formatted as UUID-ish string. Falls back to `crypto.randomUUID()`.

### Token Refresh
Delegates to `refreshProviderCredentials("grok-cli", ...)`.

### Imports
- `refreshProviderCredentials`, `shouldRefreshCredentials` from `services/oauthCredentialManager.js`
- `normalizeResponsesInput` from `translator/formats/responsesApi.js`
- `getModelUpstreamId` from `config/providerModels.js`
- `GROK_CLI_CLIENT_IDENTIFIER`, `GROK_CLI_VERSION`, `supportsGrokCliReasoningEffort` from `config/grokCli.js`
- `MEMORY_CONFIG` from `config/runtimeConfig.js`
- `resolveSessionId` from `utils/sessionManager.js`
- `getConsistentMachineId` from `shared/machineId.js`

---

## 16. `grok-web.js` — GrokWebExecutor

**Size**: ~350 lines
**Exports**: `GrokWebExecutor` (default)
**Extends**: `BaseExecutor`
**Provider**: `grok-web`
**Endpoint**: `PROVIDERS["grok-web"].baseUrl` (grok.com chat API)

### Auth
- SSO cookie: `Cookie: sso={token}` (strips "sso=" prefix if present)
- No Bearer token — pure cookie auth

### Request Shape
Completely custom payload (NOT OpenAI-compatible):
```json
{
  "temporary": true,
  "modelName": "grok-4-1-thinking-1129",
  "modelMode": "MODEL_MODE_GROK_4_1_THINKING",
  "message": "flattened conversation text",
  "fileAttachments": [], "imageAttachments": [],
  "disableSearch": false, "enableImageGeneration": false,
  "deviceEnvInfo": { "screenWidth": 2056, ... }
}
```

### Browser Fingerprint Headers
Full Chrome browser simulation: Sec-Ch-Ua, Sec-Fetch-*, Referer, Origin, Baggage (Sentry), x-statsig-id (base64 fake TypeError), traceparent (W3C trace context), x-xai-request-id (UUID).

### Model Map
Maps 14 model aliases to `{grokModel, modelMode, isThinking}` tuples. Unmapped models default to `grok-4.1-fast`.

### Response Protocol
NDJSON stream → parsed via `readGrokNdjsonEvents()` → content extracted via `extractContent()` generator → emitted as OpenAI SSE or aggregated JSON. Thinking content surfaced as `reasoning_content`.

### Imports
- `SSE_DONE`, `SSE_HEADERS_NO_BUFFER` from `utils/sseConstants.js`
- `sseChunk` from `utils/sse.js`

---

## 17. `iflow.js` — IFlowExecutor

**Size**: ~90 lines
**Exports**: `IFlowExecutor` (named + default)
**Extends**: `BaseExecutor`
**Provider**: `iflow`

### Auth
- `Authorization: Bearer {apiKey}`
- **HMAC-SHA256 signature**: `x-iflow-signature` = HMAC-SHA256(apiKey, "{userAgent}:{sessionID}:{timestamp}")
- `session-id: "session-{uuid}"` per request
- `x-iflow-timestamp` in milliseconds

### `transformRequest()`
Injects `stream_options: { include_usage: true }` for streaming requests.

---

## 18. `kimchi.js` — KimchiExecutor

**Size**: ~120 lines
**Exports**: `KimchiExecutor` (named + default), `stripReasoningContent`
**Extends**: `DefaultExecutor`
**Provider**: `kimchi`

### Key Behaviors
1. **Merges top-level `system`** into messages array (string or typed blocks)
2. **Strips Anthropic artifacts**: `cache_control`, `signature` from message parts and tools
3. **Strips top-level fields**: `anthropic_version`, `anthropic_beta`, `client_metadata`, `mcp_servers`, `stop_sequences`, `thinking`, `top_k`
4. **Anthropic-backed models**: Strips `reasoning_effort`, `reasoning`, `thinking` (detected via `getCachedKimchiModelMetadata()` or name pattern)
5. **Strips `reasoning_content`** from assistant messages (but preserves small placeholders ≤8 chars injected by `injectReasoningContent`)

### Imports
- `getCachedKimchiModelMetadata` from `services/kimchiModels.js`

---

## 19. `kiro.js` — KiroExecutor

**Size**: ~1200+ lines (largest executor)
**Exports**: `KiroExecutor` (named)
**Extends**: `BaseExecutor`
**Provider**: `kiro`

### Protocol: AWS EventStream Binary Format
The most complex executor. Kiro uses AWS CodeWhisperer's binary EventStream protocol with CRC32 checksums.

### Endpoints (Multi-Surface Fallback)
Auth-aware ordering via `getOrderedBaseUrls()`:
- **API key / External IdP / IDC**: Amazon Q surface first (`q.*.amazonaws.com`), then CodeWhisperer, then kiro.dev
- **OAuth (social)**: kiro.dev gateway first, then amazonaws.com
- Regional override for non-us-east-1 tokens

### Auth Headers
- `Authorization: Bearer {accessToken}`
- `TokenType: API_KEY` for API key auth
- `TokenType: EXTERNAL_IDP` for enterprise/Microsoft Entra tokens
- `Amz-Sdk-Request: attempt=1; max=3`
- `Amz-Sdk-Invocation-Id: {uuid}`
- `X-Amz-Target` for CodeWhisperer endpoints

### EventStream Frame Parsing
Full implementation of AWS EventStream binary protocol:
- Prelude: total_length (4B) + headers_length (4B) + prelude_crc (4B)
- Headers: name_length + name + type + value (types: bool, byte, short, int, long, bytes, string, timestamp, uuid)
- Payload + message_crc (4B)
- CRC32 validation on both prelude and full message

### Event Types Handled
| Event | Content |
|-------|---------|
| `assistantResponseEvent` | Text content (with `