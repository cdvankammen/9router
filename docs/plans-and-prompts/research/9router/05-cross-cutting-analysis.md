# Cross-Cutting Analysis & Synthesis

**Date:** 2026-08-05
**Author:** Copilot Agent
**Status:** active
**Tags:** #research #synthesis #architecture #patterns #gaps

## Repository Scale
- **Total**: 1,090 source files, ~157,448 lines
- **open-sse/**: 358 files, 46,737 lines (routing engine)
- **src/**: 498 files, 75,879 lines (Next.js app)
- **tests/**: 194 files, 28,014 lines (test suite)
- **cli/**: 24 files, 6,447 lines (launcher)
- **scripts/**: 5 files, 815 lines
- **gitbook/**: 16 files, 1,057 lines

## Request Flow (End-to-End)

```
Client → /v1/chat/completions
  → Next.js rewrite → /api/v1/chat/completions
    → proxy.js middleware → dashboardGuard.auth()
      → sse/handlers/chat.js
        → Parse body, validate API key
        → Combo expansion (if combo model)
        → Credential loop (getProviderCredentials)
          → open-sse/handlers/chatCore.js
            → Detect source format
            → Translate request (translator/)
            → Dispatch to executor
              → Executor calls upstream provider
            → Stream response back
            → Translate response (translator/)
          → On error: markAccountUnavailable, retry
        → SSE stream to client
```

## Key Architectural Decisions

### 1. Pivot Through OpenAI
All format translation goes through OpenAI as intermediate format unless a direct route exists. This simplifies N×M translation to N+N but loses fidelity for some pairs.

### 2. Self-Registering Translators
Translators register via side-effect imports. Adding a new translator requires importing it in index.js. This avoids central registration boilerplate but makes discovery implicit.

### 3. SQLite with Fallback Chain
Database driver chain ensures the app always starts: bun:sqlite → better-sqlite3 → node:sqlite → sql.js. Native performance when available, pure-JS fallback always works.

### 4. Deny-by-Default Auth
Every route must be explicitly allowed. Multiple auth mechanisms (JWT, API key, CLI token, local-only). Middleware reads DB directly to avoid deadlock.

### 5. Fail-Open Token Compression
RTK hooks never throw. Errors return null, leaving content uncompressed. Preserves functionality even when compression fails.

### 6. Background Token Refresh
OAuth tokens refreshed proactively on a 5-minute interval, independent of inbound requests. Prevents mid-request token expiry.

## Cross-Cutting Concerns

### Error Handling
- Text-based error classification with status fallback
- Cooldown periods per error type (30s transient, 30min rate limit)
- Exponential backoff with configurable retry
- Account-level failure tracking with rotation

### Security
- IP derivation from TCP socket, not headers
- SSRF guard on fetch handler
- Machine-ID-based CLI tokens
- JWT session cookies
- API key validation per request
- Header sanitization in custom-server.js

### Streaming
- SSE for all chat completions
- Stall timeout (360s default)
- First chunk timeout (200s)
- Binary protocols (Kiro EventStream, Cursor protobuf) handled in executors

### Multi-Account Support
- Mutex-protected credential selection
- Fill-first and round-robin strategies
- Virtual connections for free/noAuth providers
- Proxy pool integration

## Identified Gaps & Risks

### Testing Gaps
1. CLI launcher has zero unit tests
2. Build scripts only validated indirectly
3. Windows code paths largely untested
4. No concurrent translation safety tests
5. Real tests silently skip on missing credentials

### Architecture Risks
1. Implicit translator registration (missing import = silent failure)
2. Global fetch patching (side-effect at import time)
3. CommonJS/ESM boundary in custom-server.js
4. Large codebase with limited type safety (plain JS)

### Maintenance Concerns
1. Known failing tests (26 catalogued, some long-standing)
2. Snapshot staleness risk in golden tests
3. Provider registry auto-generation requires manual script runs
4. Independent versioning of CLI and app adds coordination overhead

## Documentation Artifacts Produced

| File | Contents |
|------|----------|
| 01-open-sse-engine.md | Routing engine architecture, translator system, executors |
| 02-src-nextjs-app.md | Next.js app, dashboard, API routes, DB layer, auth |
| 03-cli-and-tests.md | CLI launcher, test suite, baseline system, coverage gaps |
| 04-infrastructure-config.md | Build pipeline, Docker, config, scripts, gitbook |
| 05-cross-cutting-analysis.md | This file — synthesis, patterns, gaps, risks |
