# 9Router API Routes Deep Dive

> 150 route files across `src/app/api/`. This document covers the routing patterns, auth model, delegation chains, and key behaviors based on reading 35+ representative routes.

---

## 1. Auth Model (`src/dashboardGuard.js`)

There is **no `src/middleware.js`**. Auth is enforced by `dashboardGuard.js`, wired through the custom server layer. Three tiers:

| Tier | Paths | Auth |
|------|-------|------|
| **Public** | `/api/health`, `/api/init`, `/api/locale`, `/api/auth/*`, `/api/version`, `/api/settings/require-login` | None |
| **API-key gated** | `/v1/*`, `/v1beta/*`, `/api/v1/*`, `/api/v1beta/*`, `/codex/*` | Bearer API key validated *inside* each handler via `validateApiKey()` |
| **Dashboard JWT** | `/api/settings`, `/api/keys`, `/api/providers`, `/api/combos`, `/api/models`, `/api/usage`, `/api/oauth`, `/api/tunnel`, `/api/cli-tools`, `/api/mcp`, `/api/translator`, `/api/proxy-pools`, etc. | `auth_token` cookie (JWT) or `x-9r-cli-token` header (machine-ID derived) |

**Special rules:**
- `ALWAYS_PROTECTED` (`/api/shutdown`, `/api/settings/database`, `/api/version/update`, auto-import routes): JWT required even if `requireLogin=false`.
- `LOCAL_ONLY_PATHS` (cli-tools, tunnel, headroom, mcp, auto-import, reset-password): restricted to loopback IPs via `x-9r-real-ip` from `custom-server.js`.
- Tunnel/Tailscale requests blocked from dashboard if `tunnelDashboardAccess !== true`.

**Dashboard auth flow:** `POST /api/auth/login` → bcrypt compare against stored hash (or `INITIAL_PASSWORD` env, default `123456`) → sets `auth_token` JWT cookie. Supports OIDC alternative (`authMode: "oidc"`). Login rate-limiter with IP-based lockout.

---

## 2. V1 LLM/Media Endpoints (the gateway core)

All v1 routes follow an identical pattern — **thin wrappers** that delegate to `src/sse/handlers/*`:

```js
// Canonical pattern (chat/completions, messages, responses)
import { handleChat } from "@/sse/handlers/chat.js";
import { initTranslators } from "open-sse/translator/index.js";
let initialized = false;
async function ensureInitialized() {
  if (!initialized) { await initTranslators(); initialized = true; }
}
export async function OPTIONS() { /* CORS: Allow-Origin: * */ }
export async function POST(request) {
  await ensureInitialized();
  return await handleChat(request);
}


| Route | Handler | Notes |
|-------|---------|-------|
| `POST /v1/chat/completions` | `handleChat()` | OpenAI format. The primary gateway entry point. |
| `POST /v1/messages` | `handleChat()` | Claude format — **same handler**, auto-detected inside. |
| `POST /v1/responses` | `handleChat()` | OpenAI Responses API — same handler, format auto-detected. |
| `POST /v1/responses/compact` | (compact variant) | Responses API compaction. |
| `POST /v1/embeddings` | `handleEmbeddings()` | No translator init needed. |
| `POST /v1/images/generations` | `handleImageGeneration()` | |
| `POST /v1/audio/speech` | `handleTts()` | |
| `POST /v1/audio/transcriptions` | `handleStt()` | `maxDuration = 300` (5 min for large audio). |
| `POST /v1/audio/voices` | (voice listing) | TTS voice discovery. |
| `POST /v1/search` | `handleSearch()` | Web search endpoint. |
| `POST /v1/web/fetch` | (web fetch) | URL fetching endpoint. |
| `GET /v1/models` | inline (200+ lines) | Aggregates models from all connections. Live resolvers for kiro, qoder, kimchi, github, clinepass, grok-cli, cursor, zed. Fetches `/models` from compatible providers. Recursive-loop protection via `x-9r-internal-models-fetch` header. |
| `GET /v1/models/info` | inline | Single model metadata lookup by `{alias}/{modelId}`. Returns kind, endpoint, params, capabilities, contextWindow. |
| `GET /v1/models/[kind]` | (filtered) | Models filtered by kind (llm, image, tts, stt, embedding). |
| `POST /v1/videos/generations` | (video gen) | Video generation. |
| `GET /v1/videos/[id]` | (video status) | Video job polling. |
| `POST /v1/videos/edits` | (video edit) | Video editing. |
| `GET /v1/videos/extensions` | (video exts) | Supported video extensions. |
| `POST /v1/messages/count_tokens` | (token count) | Claude token counting. |
| `GET /v1beta/models/*` | (Gemini compat) | Google v1beta models passthrough. |

**Key insight:** `/v1/chat/completions`, `/v1/messages`, and `/v1/responses` all funnel into the **same** `handleChat()`. The source format (OpenAI, Claude, Responses) is auto-detected inside `open-sse/handlers/chatCore.js` and translated through the OpenAI intermediate format.

**Delegation chain:** `route.js` → `src/sse/handlers/chat.js` → `open-sse/handlers/chatCore.js` → `open-sse/executors/*` → `open-sse/translator/*` → upstream provider.

---

## 3. Auth & OAuth Routes

| Route | Methods | Delegates to | Behavior |
|-------|---------|-------------|----------|
| `/api/auth/login` | POST | `@/lib/localDb`, `bcryptjs`, `@/lib/auth/*` | Password auth with rate limiting, OIDC redirect, tunnel-access check. |
| `/api/auth/status` | GET | `@/lib/auth/dashboardSession` | Returns `authenticated`, `authMode`, `oidcConfigured`, `displayName`. |
| `/api/auth/logout` | POST | cookie clear | Clears `auth_token`. |
| `/api/auth/reset-password` | POST | `@/lib/localDb` | Local-only. Resets to default. |
| `/api/auth/oidc/start` | GET | `@/lib/auth/oidc` | Initiates OIDC flow. |
| `/api/auth/oidc/callback` | GET | `@/lib/auth/oidc` | OIDC callback, sets JWT. |
| `/api/auth/oidc/test` | POST | `@/lib/auth/oidc` | Tests OIDC config. |
| `/api/oauth/[provider]/[action]` | GET, POST | `@/lib/oauth/providers`, `@/lib/oauth/utils/server` | Dynamic OAuth router. Actions: `authorize`, `exchange`, `device-code`, `poll`, `start-proxy`, `stop-proxy`, `poll-status`, `ide-status`. Supports codex, xai, trae, windsurf, zed proxy flows. |
| `/api/oauth/codex/import-token` | POST | | Manual token import. |
| `/api/oauth/codex/bulk-import` | POST | | Bulk token import. |
| `/api/oauth/kiro/*` | various | | Kiro-specific: `auto-import`, `social-authorize`, `social-exchange`, `import`, `import-cli-proxy`, `api-key`. |
| `/api/oauth/cursor/*` | various | | Cursor: `auto-import`, `import`. |
| `/api/oauth/iflow/cookie` | POST | | iFlow cookie auth. |
| `/api/oauth/gitlab/pat` | POST | | GitLab PAT auth. |

---

## 4. Dashboard CRUD Routes

All follow standard REST patterns with `NextResponse.json`, `dynamic = "force-dynamic"`, and sensitive field stripping.

### Providers
| Route | Methods | Delegates to | Notes |
|-------|---------|-------------|-------|
| `/api/providers` | GET, POST | `@/models` (`getProviderConnections`, `createProviderConnection`) | GET strips `apiKey`/`accessToken`/`refreshToken`. POST validates provider type (APIKEY, FREE_TIER, WEB_COOKIE, compatible). Supports proxy config and proxy pool binding. |
| `/api/providers/[id]` | GET, PUT, DELETE | `@/models` | PUT merges `providerSpecificData` carefully. DELETE cascades. |
| `/api/providers/[id]/test` | POST | | Tests a single connection. |
| `/api/providers/[id]/models` | GET | | Lists models for a connection. |
| `/api/providers/[id]/test-models` | POST | | Batch model testing. |
| `/api/providers/test-batch` | POST | | Batch test across providers. |
| `/api/providers/validate` | POST | | Validates provider config. |
| `/api/providers/suggested-models` | GET | | Suggested models for a provider. |
| `/api/providers/client` | GET | | Client-safe provider list. |
| `/api/providers/kilo/free-models` | GET | | Kilo free model catalog. |

### Provider Nodes (compatible LLM endpoints)
| Route | Methods | Notes |
|-------|---------|-------|
| `/api/provider-nodes` | GET, POST | Manages OpenAI-compatible, Anthropic-compatible, and custom-embedding nodes. Auto-generates IDs with prefix. Sanitizes base URLs (strips trailing `/messages`, `/embeddings`). |
| `/api/provider-nodes/[id]` | GET, PUT, DELETE | CRUD on individual nodes. |
| `/api/provider-nodes/validate` | POST | Validates node config. |

### Keys, Combos, Models
| Route | Methods | Delegates to | Notes |
|-------|---------|-------------|-------|
| `/api/keys` | GET, POST | `@/lib/localDb` | API key management. Keys bound to `machineId`. |
| `/api/keys/[id]` | DELETE | | Key deletion. |
| `/api/combos` | GET, POST | `@/lib/localDb` | Combo CRUD. Name regex: `[a-zA-Z0-9_.-]+`. |
| `/api/combos/[id]` | GET, PUT, DELETE | | Individual combo management. |
| `/api/models` | GET | | Model catalog. |
| `/api/models/custom` | GET, POST, DELETE | | Custom model management. |
| `/api/models/alias` | GET, PUT, DELETE | `@/models` | Model alias mapping (`alias → provider/model`). |
| `/api/models/disabled` | GET, POST | | Disable/enable models. |
| `/api/models/availability` | GET | | Model availability check. |
| `/api/models/test` | POST | `./ping` | Pings a model by kind (llm, embedding, etc.). |

### Proxy Pools
| Route | Methods | Notes |
|-------|---------|-------|
| `/api/proxy-pools` | GET, POST | Types: `http`, `vercel`, `cloudflare`, `deno`. GET supports `?includeUsage=true` to count bound connections. |
| `/api/proxy-pools/[id]` | GET, PUT, DELETE | DELETE blocked (409) if connections are bound. |
| `/api/proxy-pools/[id]/test` | POST | Tests proxy connectivity. |
| `/api/proxy-pools/vercel-deploy` | POST | Deploys proxy to Vercel. |
| `/api/proxy-pools/cloudflare-deploy` | POST | Deploys to Cloudflare. |
| `/api/proxy-pools/deno-deploy` | POST | Deploys to Deno Deploy. |

---

## 5. Usage & Observability

| Route | Methods | Delegates to | Notes |
|-------|---------|-------------|-------|
| `/api/usage/stats` | GET | `@/lib/usageDb` | Periods: `today`, `24h`, `7d`, `30d`, `60d`, `all`. |
| `/api/usage/history` | GET | `@/lib/usageDb` | Historical usage data. |
| `/api/usage/logs` | GET | | Request logs. |
| `/api/usage/chart` | GET | | Chart-formatted data. |
| `/api/usage/stream` | GET | | SSE stream of live usage. |
| `/api/usage/providers` | GET | | Per-provider breakdown. |
| `/api/usage/request-logs` | GET | | Detailed request logs. |
| `/api/usage/request-details` | GET | | Single request detail. |
| `/api/usage/[connectionId]` | GET | | Per-connection usage. |
| `/api/usage/[connectionId]/codex-reset-credits` | POST | | Resets Codex credit tracking. |

---

## 6. Infrastructure & System Routes

| Route | Methods | Notes |
|-------|---------|-------|
| `/api/health` | GET, OPTIONS | Returns `{ ok: true }`. No auth. CORS enabled. |
| `/api/init` | GET | Returns `"Initialized"`. Called on app startup. |
| `/api/version` | GET | Compares local `package.json` version vs npm registry (cached 1h). Returns `{ currentVersion, latestVersion, hasUpdate }`. |
| `/api/version/update` | POST | Triggers self-update. ALWAYS_PROTECTED. |
| `/api/version/shutdown` | POST | Graceful shutdown. ALWAYS_PROTECTED. |
| `/api/shutdown` | POST | `process.exit(0)` after 500ms. Requires `SHUTDOWN_SECRET` bearer token. Dev-only (403 in production). |
| `/api/settings` | GET, PATCH | Full settings CRUD. Strips `password`/`oidcClientSecret` from response. PATCH handles password change (bcrypt), outbound proxy hot-reload, combo rotation reset, auto-ping scheduler. Protected keys (`password`, `mitmSudoEncrypted`) stripped from input (CWE-915). |
| `/api/settings/proxy-test` | POST | Tests outbound proxy. |
| `/api/settings/require-login` | GET | Public — returns whether login is required. |
| `/api/settings/database` | GET, POST | DB management. ALWAYS_PROTECTED. |
| `/api/locale` | POST | Sets locale cookie (1-year TTL). No auth. |
| `/api/tags` | GET | Returns Ollama model tags. CORS enabled. |
| `/api/pricing` | GET | Pricing data. |
| `/api/analyze-error` | POST | Error analysis helper. |
| `/api/export/requests` | GET | Request log export. |

---

## 7. Tunnel & Network

| Route | Methods | Notes |
|-------|---------|-------|
| `/api/tunnel/status` | GET | Returns tunnel + tailscale + download status. 3s cache. |
| `/api/tunnel/enable` | POST | Enables Cloudflare tunnel. 8s DNS warmup delay. Local-only. |
| `/api/tunnel/disable` | POST | Disables tunnel. Local-only. |
| `/api/tunnel/tailscale-*` | POST | Tailscale install/enable/disable/check. Local-only. |

---

## 8. CLI Tools Integration

13 routes under `/api/cli-tools/` — each reads/writes config files for external AI CLI tools on the host filesystem:

`claude-settings`, `codex-settings`, `cline-settings`, `copilot-settings`, `openclaw-settings`, `hermes-settings`, `droid-settings`, `kilo-settings`, `opencode-settings`, `jcode-settings`, `devin-settings`, `deepseek-tui-settings`, `grok-build-settings`, `cowork-settings`, `cowork-mcp-tools`, `cowork-mcp-registry`, `antigravity-mitm`, `all-statuses`.

**Pattern:** GET checks if CLI is installed (`which`/`where`) and reads its config file (e.g., `~/.claude/settings.json`). POST writes config (e.g., sets `ANTHROPIC_BASE_URL` to point at 9router). All are **local-only** (loopback restricted).

---

## 9. MCP Bridge

| Route | Methods | Notes |
|-------|---------|-------|
| `/api/mcp/[plugin]/sse` | GET | SSE stream. Registers session with `stdioSseBridge`. Sends `event: endpoint` handshake. `runtime = "nodejs"`. |
| `/api/mcp/[plugin]/message` | POST | Sends JSON-RPC message to child process via `sendToChild()`. Returns 202. |

---

## 10. Translator Debugger

| Route | Methods | Notes |
|-------|---------|-------|
| `/api/translator/translate` | POST | 3-step translation debugger. Step 1: detect format. Step 2: source→OpenAI. Step 3: OpenAI→target + build URL/headers via executor. |
| `/api/translator/send` | POST | Sends translated request to upstream. |
| `/api/translator/load` | GET | Loads translator state. |
| `/api/translator/save` | POST | Saves translator config. |
| `/api/translator/console-logs` | GET | Translator console output. |
| `/api/translator/console-logs/stream` | GET | SSE stream of console logs. |

---

## 11. Headroom & PxPipe (sidecar services)

**Headroom** (`/api/headroom/*`): `status`, `start`, `stop`, `restart`, `extras`, `proxy/[...path]`. Manages a local headroom service process.

**PxPipe** (`/api/pxpipe/*`): `status`, `start`, `stop`, `restart`, `install`, `health`, `stats`, `logs`. Manages a local pxpipe service for text processing.

---

## 12. Dashboard Pages

All dashboard pages live under `src/app/(dashboard)/dashboard/` and followa consistent pattern:

- **Server components** fetch initial data (e.g., `getMachineId()`) and render a client component.
- **Client components** (`"use client"`) handle all interactivity, fetching from `/api/*` routes via `fetch()`.
- No direct DB access from pages — everything goes through the API layer.

| Page | Type | Data Sources | Notes |
|------|------|-------------|-------|
| `/dashboard` | Server → Client | `getMachineId()` | Endpoint overview with machine ID for CLI token auth. |
| `/dashboard/providers` | Client | `/api/providers`, `/api/provider-nodes` | Provider grid with status badges, error tags, connection counts. Add Compatible Modal for OpenAI/Anthropic nodes. |
| `/dashboard/providers/[id]` | Client | `/api/providers/[id]`, `/api/models/*`, `/api/oauth/*` | Most complex page. Connection management, OAuth flows, model testing (one-by-one), custom models, aliases, proxy pool binding, thinking mode config, auto-ping, bulk import (Codex), AG risk confirmation. |
| `/dashboard/combos` | Client | `/api/combos`, `/api/providers`, `/api/settings` | Drag-and-drop combo ordering (`@dnd-kit`). Capacity adapter config (vision/audio fallbacks). Smart router settings. Markdown log config. Filters to LLM combos only. |
| `/dashboard/cli-tools` | Server → Client | `getMachineId()` | CLI tool integration dashboard. Links to individual `/api/cli-tools/*` endpoints. |

---

## 13. Cross-Cutting Patterns

### CORS
All v1 endpoints export `OPTIONS()` with `Access-Control-Allow-Origin: *`. Dashboard API routes do NOT set CORS headers (same-origin only).

### Dynamic Route Params
Next.js App