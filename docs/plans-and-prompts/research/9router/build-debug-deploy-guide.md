# 9Router Build, Debug & Deploy Guide

**Date:** 2026-08-05
**Author:** AI Agent Research
**Status:** Active
**Tags:** build, debug, deploy, development, testing, documentation

---

## Quick Reference Commands

```bash
# Development
npm install                              # Install root deps
cp .env.example .env                     # Create env file (edit JWT_SECRET, INITIAL_PASSWORD)
npm run dev                              # Dev server on port 20127 (Turbopack)
npm run dev:webpack                      # Dev server with Webpack (for debugging)
PORT=20128 NEXT_PUBLIC_BASE_URL=http://localhost:20128 npm run dev  # Custom port

# Production Build
npm run build                            # Webpack production build → .next/standalone/
npm run start                            # Standard Next.js server on port 20127
node custom-server.js                    # Production server with IP extraction + h2c

# Bun Variants
npm run dev:bun                          # Bun dev server
npm run build:bun                        # Bun production build
npm run start:bun                        # Bun standalone (bypasses next start)

# CLI Package
cd cli && npm run dev                    # CLI dev mode (nodemon watch)
npm run cli:pack                         # Build + npm pack from root
npm run cli:publish                      # Build + npm publish

# Docker
docker compose up -d                     # Start 9router + headroom sidecar
./start.sh                               # Rebuild and restart Docker container
docker run -d --name 9router -p 20128:20128 \
  -v "$HOME/.9router:/app/data" -e DATA_DIR=/app/data \
  decolua/9router:latest                 # Standalone Docker

# Testing
npm install                              # ROOT deps first
cd tests && npm install                  # Then test deps
cd tests && npx vitest run               # All tests
cd tests && npx vitest run unit/capabilities.test.js  # Single file
node tests/__baseline__/verify-no-regression.mjs <results.json>  # Regression check
```

---

## Architecture Overview

### Two Published Artifacts

1. **Dashboard + Gateway** (`9router-app`, root `package.json`) — Next.js 16 app that does the actual routing
2. **CLI Launcher** (`9router`, `cli/package.json`) — Separate npm package that installs/starts the server and manages tray

### Request Flow

```
Client POST /v1/chat/completions
  → next.config.mjs rewrite: /v1/* → /api/v1/*
  → src/app/api/v1/[...path]/route.js
  → src/sse/handlers/chat.js (parse, combo expansion, account selection)
  → open-sse/handlers/chatCore.js (detect format, translate, dispatch)
  → open-sse/executors/* (per-provider upstream call)
  → open-sse/translator/* (client format ↔ provider format)
  → SSE back to client
```

### Smart Router Interception Point

The smart router (`src/sse/services/smartRouter.js`) runs in `handleChat()` at line ~88, **before** combo resolution and translation:

```
handleChat()
  → detectRequiredCapabilities(body)
  → resolveSmartRouter(modelStr, body, settings)  ← SMART ROUTER HERE
  → getComboModels(modelStr)                       ← existing combo check
  → handleSingleModelChat() or handleComboChat()
  → handleChatCore() → translate → executor → upstream
```

This avoids the double-translation flaw that would occur if routing happened inside an executor.

---

## Build System Details

### Next.js Configuration (`next.config.mjs`)

- **Output mode:** `standalone` — produces self-contained deployable in `.next/standalone/`
- **Build engine:** Always Webpack for production (`--webpack` flag), Turbopack optional for dev
- **External packages:** `better-sqlite3`, `sql.js`, `node:sqlite`, `bun:sqlite`, `open` — kept external to avoid `import.meta.url` corruption
- **Body size limit:** `NINEROUTER_PROXY_CLIENT_MAX_BODY_SIZE` env var, default `128mb`
- **HMR cache:** `serverComponentsHmrCache: true` — caches fetch responses across HMR refreshes
- **Package optimizations:** Tree-shakes `@xyflow/react`, `@dnd-kit/*`, `material-symbols`, `marked`
- **Webpack watcher excludes:** `node_modules`, `.git`, `logs`, `.next`, `gitbook`, `cli`, `tests`, `docs`
- **URL rewrites:**
  - `/v1/*` → `/api/v1/*`
  - `/codex/*` → `/api/v1/responses`
  - `/v1beta/*` → `/api/v1beta/*`

### Post-Build Asset Copy (`scripts/copy-standalone-assets.mjs`)

Runs automatically after `npm run build`. Copies:
1. `.next/static/` → `.next/standalone/.next/static/`
2. `public/` → `.next/standalone/public/`

Skipped when `NEXT_TRACING_ROOT_MODE=workspace` (CLI build handles its own assets).

### CLI Build Pipeline (`cli/scripts/build-cli.js`)

Multi-step process:
1. **Version sync:** Copies version from `cli/package.json` → root `package.json`
2. **Next.js build:** Runs `npm run build` with `NEXT_DIST_DIR=.next-cli-build` and `NEXT_TRACING_ROOT_MODE=workspace`
3. **Copy standalone:** Resolves standalone output, copies to `cli/app/`
4. **Copy custom-server.js:** Injects real-IP wrapper
5. **SQLite drivers:** Bundles `sql.js` + `open` into `cli/app/node_modules/`; strips `better-sqlite3` (lives in `~/.9router/runtime` instead)
6. **Static files:** Copies `.next/static` and `public/`
7. **Vendor chunks:** Copies `server/vendor-chunks/`
8. **Server artifacts:** Merges complete `server/` tree
9. **Validates:** Asserts critical route files exist

Excludes: `@img`, `sharp`, `detect-libc`, `.env*`, `*.log`, `tmp`, `.DS_Store`

---

## Development Workflow

### Dev Server

```bash
npm run dev          # Turbopack, port 20127
npm run dev:webpack  # Webpack, port 20127 (better for debugging)
```

- Dashboard: `http://localhost:20127/dashboard`
- API: `http://localhost:20127/v1/*`
- HMR enabled with `serverComponentsHmrCache: true`

### Debugging

**No pre-configured VS Code launch.json exists.** Manual debugger attachment:

```bash
NODE_OPTIONS='--inspect' npm run dev:webpack
```

Then attach via Chrome DevTools (`chrome://inspect`) or VS Code "Attach to Node Process".

**Source maps:** Enabled in dev by default (Next.js default). Disabled in production unless configured.

### Console Log Capture

`src/instrumentation.js` registers console log capture on Node.js runtime startup via `initConsoleLogCapture()`. Feeds the dashboard's live console log viewer at `/dashboard/console-log`.

---

## Logging & Observability

### Log Levels (`LOG_LEVEL` env var)

| Level | Value | Prefix | Description |
|-------|-------|--------|-------------|
| `DEBUG` | 0 | 🔍 | Verbose debug output |
| `INFO` | 1 | ℹ️ | Default level |
| `WARN` | 2 | ⚠️ | Warnings |
| `ERROR` | 3 | ❌ | Errors (never suppressed) |

**Enable debug logging:** `LOG_LEVEL=DEBUG`

### Additional Debug Flags

| Env Var | Purpose |
|---------|---------|
| `DEBUG_MITM` | Verbose MITM proxy logging |
| `DEBUG_BACKGROUND_TOKEN_REFRESH` | Token refresh import failures |
| `ENABLE_REQUEST_LOGS=true` | Full request/response detail storage |

### Request Correlation

Color-coded emoji tags (🟢🔵🟣🟡🟠🔴⚪🟤) assigned per session via stable hash. Enables visual log correlation across concurrent requests.

### Request Tracking (SQLite-backed)

- `trackPendingRequest()` / `getActiveRequests()` — live monitoring
- `saveRequestUsage()` / `getUsageHistory()` / `getUsageStats()` — analytics
- `appendRequestLog()` / `getRecentLogs()` — log stream
- `saveRequestDetail()` / `getRequestDetails()` — full detail storage

Controlled by `ENABLE_REQUEST_LOGS` env var (default `false`).

### Health Endpoints

| Endpoint | Purpose |
|----------|---------|
| `POST/GET /api/pxpipe/health` | PxPipe service status |
| `GET /api/tunnel/status` | Tunnel connectivity (3s cache) |

**Note:** No generic `/health` or `/ready` endpoint exists for the main gateway.

---

## Testing

### Setup

```bash
npm install                    # ROOT deps first (tests import from src/)
cd tests && npm install        # Test deps (vitest)
```

### Running Tests

```bash
cd tests && npx vitest run                                    # All tests
cd tests && npx vitest run unit/capabilities.test.js          # Single file
cd tests && npx vitest --reporter=verbose                     # Watch mode
```

> ⚠️ Do NOT use `npm test` in `tests/` — the script hardcodes Unix paths. Use `npx vitest` directly.

### Expected Results

- ~938 pass, ~64 fail on a plain checkout
- 26 failures catalogued in `tests/__baseline__/known-fails.txt`
- `unit/embeddings.cloud.test.js` always fails (imports missing `cloud/` directory)
- `unit/xai-oauth-service.test.js` times out without xAI endpoint access
- `real/*.real.test.js` need live credentials (gated by `RUN_REAL=1`)

### Regression Detection

```bash
node tests/__baseline__/verify-no-regression.mjs <current-results.json>
```

Fails if any previously-passing test now fails. New failures are allowed; regressions are not.

### Test Categories

| Directory | Count | Description |
|-----------|-------|-------------|
| `tests/unit/` | ~150 | Unit tests for executors, translators, DB, providers, OAuth, RTK |
| `tests/translator/` | ~15 | Data-driven translator coverage, golden tests |
| `tests/translator/real/` | 8 | Live provider calls (need credentials) |
| `tests/__baseline__/` | — | Regression snapshots |

### Coverage

No code coverage reporting configured. "Coverage" in test names refers to model/format coverage, not code coverage.

---

## Production Deployment

### Custom Server (`custom-server.js`)

Wraps Next.js standalone server with three critical behaviors:

1. **Real IP extraction:** Derives client IP from TCP socket (`req.socket.remoteAddress`). Strips attacker-controlled `X-Forwarded-For`/`X-Real-IP`. Only trusts forwarding headers when TCP peer is loopback.
2. **Background token refresh:** Starts OAuth token refresh scheduler on server listen.
3. **h2c downgrade:** Handles HTTP/2 Cleartext upgrades from JetBrains IDE clients.

### Docker Deployment

**Dockerfile:** Multi-stage (Node 22 Alpine). Builder installs deps + builds. Runner copies standalone output + custom-server.js + open-sse + MITM + node-forge. Entrypoint fixes volume permissions via su-exec.

**docker-compose.yml:** Two services: `9router` + `headroom` sidecar (port 8787). Named volume `9router-data`.

```bash
docker compose up -d                    # Start both services
./start.sh                              # Rebuild and restart
```

### Data Location

| Platform | Path |
|----------|------|
| macOS/Linux | `~/.9router/db/data.sqlite` |
| Windows | `%APPDATA%/9router/db/data.sqlite` |
| Docker | `/app/data/db/data.sqlite` (mount `$HOME/.9router` to persist) |

### Environment Variables

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `JWT_SECRET` | ✅ Yes | — | Dashboard session cookie signing |
| `INITIAL_PASSWORD` | ✅ Yes | `123456` | Default dashboard password |
| `DATA_DIR` | ✅ Yes | `~/.9router/` | SQLite DB + config storage |
| `PORT` | Recommended | `20128` | Server listen port |
| `API_KEY_SECRET` | Recommended | — | HMAC secret for API keys |
| `MACHINE_ID_SALT` | Recommended | — | Machine ID hashing salt |
| `ENABLE_REQUEST_LOGS` | Optional | `false` | Full request/response logging |
| `LOG_LEVEL` | Optional | `INFO` | DEBUG/INFO/WARN/ERROR |
| `BASE_URL` / `CLOUD_URL` | Optional | — | Server-side cloud sync URLs |
| `HTTP_PROXY` / `HTTPS_PROXY` | Optional | — | Outbound proxy |
| `SEARXNG_URL` | Optional | — | Self-hosted SearXNG endpoint |

---

## CLI Package Architecture

The CLI (`cli/`, published as `9router` on npm) is a separate package that:

- **Installs** the main app's standalone build into `~/.9router/`
- **Self-heals** SQLite runtime deps at postinstall and runtime:
  - Priority: `bun:sqlite` → `better-sqlite3` (native) → `node:sqlite` (Node ≥22.5) → `sql.js` (pure JS WASM)
  - Installed to `~/.9router/runtime/node_modules/` (user-writable, avoids Windows EBUSY)
- **Manages** system tray: `systray2@2.1.4` on macOS/Linux, PowerShell NotifyIcon on Windows
- **Launches** the Next.js standalone server via `custom-server.js`
- **Polls** TCP port for readiness (no blind waits)
- **Default port:** 20128, host: 0.0.0.0

---

## Known Documentation Gaps

| Gap | Impact | Priority |
|-----|--------|----------|
| `docs/ARCHITECTURE.md` is stale (2026-02-06) | References `db.json`, missing SQLite/RTK/MITM | High — use CLAUDE.md instead |
| No CONTRIBUTING.md | No contributor guidelines | Medium |
| No API reference | No formal OpenAI-compatible API docs | Medium |
| No troubleshooting guide | Common issues undocumented | Medium |
| Plans-and-prompts folders mostly empty | Convention infrastructure exists but unused | Low |
| No SECURITY.md | No vulnerability reporting process | Low |

---

## Smart Router Implementation Notes

The smart router uses **pre-combo interception** in `handleChat()` (not an executor) to avoid double-translation:

- **File:** `src/sse/services/smartRouter.js`
- **Settings:** `settings.smartRouter` (enabled, names, allowedProviders, costQualityTradeoff, maxCandidates)
- **Trigger:** Use `modelRouter` as model name when enabled
- **Mechanism:** Classifies task → scores models → creates dynamic combo → existing combo fallback handles retries
- **Concurrency tracking:** In-memory `activeRequests` Map, feeds scoring penalty
- **Session stickiness:** 5-min TTL conversation fingerprint

Existing `open-sse/executors/9router.js` is disabled with early-return guard.
