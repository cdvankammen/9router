# Infrastructure & Configuration — Deep Dive

**Date:** 2026-08-05
**Author:** Copilot Agent
**Status:** active
**Tags:** #research #infrastructure #config #docker #build

## Root Configuration

### `package.json` (9router-app v0.5.50)
- **Framework**: Next.js 16, React 19
- **UI**: xyflow, dnd-kit, Monaco editor, Recharts, Zustand, Material Symbols
- **Server**: Express 5, http-proxy-middleware, undici, socks-proxy-agent
- **Auth**: jose (JWT), bcryptjs
- **Database**: sql.js (required), better-sqlite3 (optional native)
- **Utilities**: open, ora, uuid, marked, confbox, node-forge, selfsigned
- **Build**: Tailwind CSS v4, ESLint 9, PostCSS

### `next.config.mjs`
- Standalone output for Docker/CLI
- Server external packages: better-sqlite3, sql.js, node:sqlite, bun:sqlite, open
- Proxy body size: NINEROUTER_PROXY_CLIENT_MAX_BODY_SIZE (default 128mb)
- Rewrites: /v1/* → /api/v1/*, /codex/* → /api/v1/responses, etc.

### `jsconfig.json`
Path aliases: @/* → src/*, open-sse → ./open-sse

### Environment Variables (.env.example)
Security-sensitive: JWT_SECRET, INITIAL_PASSWORD, API_KEY_SECRET, MACHINE_ID_SALT.
Full matrix documented in ARCHITECTURE.md.

## Build Pipeline

### Dev Mode
`npm run dev` — Next.js dev on port 20127 (webpack)
`npm run dev:bun` — Bun variant

### Production Build
`npm run build` → postbuild copies standalone assets
`npm run start` — Production server on port 20128

### CLI Build
`npm run cli:pack` — Builds standalone app + bundles into CLI package
Multi-step: Next.js build → standalone copy → custom server → SQLite config → static assets → MITM server

## Docker Setup

### Dockerfile
Multi-stage build. Node base, standalone output, custom-server.js wrapper.

### docker-compose.yml
Service definition with volume mounts for persistent data.

### captain-definition
Deployment configuration for cloud platforms.

## Scripts (`scripts/`)

| Script | Purpose |
|--------|---------|
| migrate-registry.mjs | Regenerate provider registry imports |
| injectDisplayToRegistry.mjs | Add display names to registry |
| copy-standalone-assets.mjs | Post-build asset copying |
| test-combo-autoswitch.mjs | Combo switching verification |
| translate-readme.js | README translation |

## Gitbook Documentation Site

Separate Next.js app in `gitbook/` with:
- Multi-language content (en, es, ja, vi, zh-CN)
- DocsContent, DocsHeader, DocsLayout, DocsSidebar components
- Markdown processing pipeline
- Language switcher

## Skills Directory

Agent skill definitions for 9router capabilities:
- 9router-chat, 9router-embeddings, 9router-image
- 9router-stt, 9router-tts, 9router-video
- 9router-web-fetch, 9router-web-search

## Key Patterns

1. **Optional native deps**: better-sqlite3 in optionalDependencies, never fails install
2. **Standalone output**: Docker/CLI use Next.js standalone mode
3. **Post-build asset copying**: Static/public assets copied after build
4. **Independent CLI versioning**: CLI and app versioned separately
5. **Multi-runtime support**: Node, Bun, with runtime detection
