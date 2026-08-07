# 9Router SSE Layer Deep Dive

The `src/sse/` directory is the **app-side glue** between Next.js API routes (`src/app/api/v1/*`) and the provider-agnostic `open-sse/` engine. It handles auth, credential selection, multi-account fallback, combo expansion, token refresh, and smart routing — then delegates actual upstream calls to `open-sse/handlers/*Core.js`.

---

## Architecture Overview

```
Next.js Route (/v1/*)
  → src/sse/handlers/*.js     ← YOU ARE HERE
    → Auth (services/auth.js)
    → Model resolution (services/model.js)
    → Combo/Smart Router expansion
    → Credential loop (getProviderCredentials → checkAndRefreshToken)
    → open-sse/handlers/*Core.js (actual upstream call)
```

---

## Handlers

### `chat.js` — Main Chat Handler

**The most critical file in src/sse/.** This is the entry point for all `/v1/chat/completions`, `/v1/messages`, and `/v1/responses` requests.

**Main Export**: `handleChat(req, res)` — async function that processes the full request lifecycle.

**Processing Flow**:
1. **Parse request** — extract body, headers, API key, user agent
2. **Auth check** — `authenticateRequest()` validates API key or session
3. **Model resolution** — `resolveModel()` maps client model name to provider+model via aliases, combos, or smart router
4. **Combo expansion** — if model is a combo, expand to ordered list of provider/model pairs
5. **Account selection loop** — iterate through available credentials for the provider:
   - `getProviderCredentials()` fetches all active connections
   - For each connection: check cooldown, check quota, check token expiry
   - `checkAndRefreshToken()` refreshes OAuth tokens if needed
6. **Dispatch** — call `handleChatCore()` from open-sse with selected credentials
7. **Fallback** — on retryable errors (429, 5xx), try next account or combo member
8. **Response** — stream SSE back to client or return JSON

**Key Functions**:
| Function | Purpose |
|----------|---------|
| `handleChat(req, res)` | Main entry point |
| `resolveModel(model, apiKey)` | Maps model alias → provider+model |
| `getProviderCredentials(provider)` | Fetches active connections from DB |
| `checkAndRefreshToken(cred)` | Refreshes OAuth if expiring soon |
| `selectAccount(credentials, model)` | Picks best account (cooldown, quota) |

**Cross-references**:
- `open-sse/handlers/chatCore.js` — actual upstream dispatch
- `open-sse/services/combo.js` — combo expansion
- `open-sse/services/accountFallback.js` — account selection
- `src/lib/db/repos/connectionsRepo.js` — credential storage
- `src/sse/services/auth.js` — API key validation
- `src/sse/services/model.js` — model alias resolution

### `embeddings.js` — Embedding Handler

Handles `/v1/embeddings` requests. Similar flow to chat but simpler:
- Resolves model → provider
- Selects credentials
- Delegates to `open-sse/handlers/embeddingsCore.js`
- No streaming, no combo fallback

### `imageGeneration.js` — Image Generation Handler

Handles `/v1/images/generations` requests:
- Resolves model → image provider (DALL-E, Flux, Imagen, etc.)
- Delegates to `open-sse/handlers/imageGenerationCore.js`
- Returns base64 or URL response

### `tts.js` — Text-to-Speech Handler

Handles `/v1/audio/speech` requests:
- Resolves voice + model → TTS provider
- Delegates to `open-sse/handlers/ttsCore.js`
- Returns audio binary stream

### `stt.js` — Speech-to-Text Handler

Handles `/v1/audio/transcriptions` requests:
- Accepts multipart form data with audio file
- Delegates to `open-sse/handlers/sttCore.js`
- Returns transcription text

### `search.js` — Web Search Handler

Handles `/v1/search` requests:
- Routes to SearXNG, Brave, Tavily, Exa, etc.
- Delegates to `open-sse/handlers/search/`
- Returns search results in OpenAI-compatible format

### `fetch.js` — Web Fetch Handler

Handles `/v1/web/fetch` requests:
- Fetches and extracts content from URLs
- SSRF protection via `ssrfGuard.js`
- Returns markdown-extracted content

### `videoGeneration.js` — Video Generation Handler

Handles `/v1/videos/generations` and `/v1/videos/edits`:
- Routes to Runway, Kling, etc.
- Delegates to `open-sse/handlers/videoCore.js`
- Supports async polling for long-running generations

---

## Services

### `auth.js` — Request Authentication

**Exports**:
| Function | Purpose |
|----------|---------|
| `authenticateRequest(req)` | Validates API key from `Authorization: Bearer` header against `api_keys` DB table |
| `validateApiKey(key)` | Hashes and compares against stored keys |
| `getSessionUser(req)` | Checks dashboard session cookie |

**Flow**: API key → SHA256 hash → lookup in `api_keys` table → return user/connection info. Falls back to session cookie for dashboard-originated requests.

### `model.js` — Model Resolution

**Exports**:
| Function | Purpose |
|----------|---------|
| `resolveModel(modelName, apiKey)` | Maps client model name to `{provider, model}` via alias lookup, combo check, or smart router virtual model |
| `getAvailableModels(apiKey)` | Returns all models available to the API key's connections |

**Resolution Priority**:
1. Exact match in provider registry
2. Alias match (e.g., `gpt-4o` → openai/gpt-4o)
3. Combo name (e.g., `my-combo` → combo expansion)
4. Smart router virtual model (e.g., `auto`, `best-code`)
5. Passthrough (model name sent as-is to provider)

### `smartRouter.js` — Smart Router Service

**Exports**:
| Function | Purpose |
|----------|---------|
| `routeRequest(model, body, credentials)` | Selects best provider/model based on task classification, capability matching, and cost/quality tradeoff |

**Virtual Models**: `auto`, `best-code`, `best-chat`, `best-reasoning`, `best-cheap` — each with different task bias and cost-quality tradeoff settings.

### `backgroundTokenRefresh.js` — Background Token Refresh

**Exports**:
| Function | Purpose |
|----------|---------|
| `startBackgroundRefresh()` | Starts 5-minute interval timer that refreshes all OAuth tokens |
| `stopBackgroundRefresh()` | Clears the timer |

**Behavior**: Every 5 minutes, iterates all connections with OAuth tokens, checks expiry, refreshes if within lead time. Mutates credentials in-place so next request uses fresh tokens.

### `tokenRefresh.js` — On-Demand Token Refresh

**Exports**:
| Function | Purpose |
|----------|---------|
| `checkAndRefreshToken(credential)` | Checks if token expires within lead time, refreshes if needed |
| `forceRefreshToken(credential)` | Forces immediate refresh regardless of expiry |

**Cross-references**: `open-sse/services/tokenRefresh.js`, `src/lib/oauth/services/`

---

## Utils

### `logger.js` — Request Logger

**Exports**:
| Function | Purpose |
|----------|---------|
| `createLogger(req)` | Creates a per-request logger with session-based coloring |
| `tagForSession(sessionId)` | Returns a stable color tag for a session |

**Features**: Color-coded console output, session correlation, format-aware logging (SSE vs JSON), error line formatting.

---

## Cross-Reference Map

```
src/app/api/v1/chat/completions/route.js
  └──→ src/sse/handlers/chat.js (handleChat)
         ├──→ src/sse/services/auth.js (authenticateRequest)
         ├──→ src/sse/services/model.js (resolveModel)
         ├──→ src/sse/services/smartRouter.js (routeRequest)
         ├──→ src/sse/services/tokenRefresh.js (checkAndRefreshToken)
         ├──→ open-sse/handlers/chatCore.js (handleChatCore)
         ├──→ open-sse/services/combo.js (expandCombo)
         ├──→ open-sse/services/accountFallback.js (selectAccount)
         └──→ src/lib/db/repos/connectionsRepo.js (getActiveConnections)

src/app/api/v1/embeddings/route.js
  └──→ src/sse/handlers/embeddings.js
         └──→ open-sse/handlers/embeddingsCore.js

src/app/api/v1/images/generations/route.js
  └──→ src/sse/handlers/imageGeneration.js
         └──→ open-sse/handlers/imageGenerationCore.js

src/app/api/v1/audio/speech/route.js
  └──→ src/sse/handlers/tts.js
         └──→ open-sse/handlers/ttsCore.js

src/app/api/v1/audio/transcriptions/route.js
  └──→ src/sse/handlers/stt.js
         └──→ open-sse/handlers/sttCore.js
```
