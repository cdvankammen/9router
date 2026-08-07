# Next.js App & Dashboard — Deep Dive

**Date:** 2026-08-05
**Author:** Copilot Agent
**Status:** active
**Tags:** #research #src #nextjs #dashboard #database #architecture

## Overview

`src/` contains the Next.js application: dashboard UI, API routes, SSE handlers, SQLite database layer, authentication, and middleware. 498 files, ~75,879 lines.

## Root-Level Files

### `proxy.js`
Next.js middleware entry point. Delegates all request filtering to `dashboardGuard.proxy()`. First thing that runs for every HTTP request.

### `dashboardGuard.js`
Central authentication & authorization middleware. Deny-by-default security. Auth layers in order:
1. LOCAL_ONLY_PATHS — CLI token or local+authenticated
2. ALWAYS_PROTECTED — JWT or CLI token required
3. Public LLM API (`/v1/*`) — API key, CLI token, or local
4. Protected API paths — JWT, CLI token, or requireLogin=false
5. Dashboard routes — JWT cookie or requireLogin=false
6. Root `/` — redirects to `/dashboard`

CLI token: Machine-ID-based (`x-9r-cli-token` header), salted with `"9r-cli-auth"`.
IP trust: Uses `x-9r-real-ip` stamped by custom-server.js from TCP socket.

### `instrumentation.js`
Next.js instrumentation hook. Initializes console log capture on server start.

### `custom-server.js` (repo root)
Wraps Next.js standalone server. Extracts real client IP from TCP socket, strips attacker-controlled X-Forwarded-For, handles h2c downgrade, starts background token refresh. CommonJS while rest is ESM.

## App Router (`src/app/`)

### Layout & Pages
- Root layout sets up fonts, theme, i18n, analytics, bootstrap side effects
- Dashboard route group with full sidebar navigation
- Landing page separate from dashboard
- Login and OAuth callback pages

### Dashboard Sub-pages
Providers, combos, usage, endpoint, CLI tools, MITM, media providers, proxy pools, token saver, translator diagnostics, skills, console log, quota, profile, basic chat, pxpipe.

### API Routes

#### V1 LLM Gateway Routes
| Route | Handler |
|-------|---------|
| `v1/chat/completions` | handleChat |
| `v1/messages` | handleChat (Claude format) |
| `v1/embeddings` | handleEmbeddings |
| `v1/images/generations` | handleImageGeneration |
| `v1/audio/speech` | handleTts |
| `v1/audio/transcriptions` | handleStt |
| `v1/videos/generations` | handleVideoCreate |
| `v1/search` | handleSearch |
| `v1/web/fetch` | handleFetch |
| `v1/responses` | handleChat (Responses API) |

#### Auth, OAuth, Management Routes
Full CRUD for providers, keys, combos, models, usage, proxy pools, tunnels, MCP plugins, CLI tools, settings, health checks.

## SSE Handlers (`src/sse/`)

### `chat.js` — Primary Gateway Bridge
Flow: Parse body → API key validation → bypass detection → capability detection → combo expansion → credential loop → handleChatCore (from open-sse).

Credential loop: getProviderCredentials → call upstream → on error: markAccountUnavailable → retry with next account.

### Other Handlers
embeddings, imageGeneration, tts, stt, videoGeneration, search, fetch — each follows same auth+fallback pattern, delegates to open-sse core.

### Services
- `auth.js` — Credential selection with mutex, fill-first/round-robin strategies
- `model.js` — Model resolution bridging localDb aliases with open-sse parsing
- `tokenRefresh.js` — OAuth refresh with DB persistence
- `backgroundTokenRefresh.js` — Proactive 5-minute refresh scheduler

## Database Layer (`src/lib/db/`)

### Driver Chain (`driver.js`)
Adapter fallback: bun:sqlite → better-sqlite3 → node:sqlite (≥22.5) → sql.js. Singleton via global._dbAdapter. Survives HMR.

### Schema (`schema.js`)
Tables: _meta, settings, providerConnections, providerNodes, proxyPools, apiKeys, combos, kv, usageHistory, usageDaily, requestDetails. WAL mode, NORMAL sync.

### Repos (`repos/`)
Per-entity CRUD operations. Each repo handles its own table(s).

### Migrations (`migrations/`)
Ordered migration files. Schema version bumped for safety backups.

## Key Patterns

1. **Deny-by-default auth**: Every route explicitly allowed or denied
2. **Credential loop with mutex**: Prevents race conditions in account selection
3. **DB reads in middleware**: Avoids self-fetch deadlock
4. **Background token refresh**: Independent of inbound requests
5. **Driver fallback chain**: Always works, prefers native performance
