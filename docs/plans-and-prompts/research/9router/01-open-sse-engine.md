# Open-SSE Routing Engine — Deep Dive

**Date:** 2026-08-05
**Author:** Copilot Agent
**Status:** active
**Tags:** #research #open-sse #routing #translator #architecture

## Overview

`open-sse/` is the provider-agnostic AI routing and translation engine. 358 files, ~46,737 lines. It handles format translation between 40+ upstream providers, credential management, token refresh, retry/fallback logic, and streaming. Also usable standalone outside the Next.js app.

## Entry Point: `index.js`

Barrel export that patches global fetch with proxy support as a side-effect import, then re-exports all public APIs:
- Config: PROVIDERS, OAUTH_ENDPOINTS, model helpers
- Translator: register, translateRequest, translateResponse, needsTranslation
- Services: detectFormat, parseModel, account fallback, token refresh
- Handlers: handleChatCore, isTokenExpiringSoon
- Executors: getExecutor, hasSpecializedExecutor
- Utils: errorResponse, stream helpers

## Config (`config/`) — 15 files

### `appConstants.js`
Application-wide constants derived from provider registry. Gemini CLI version/user-agent, GitHub Copilot metadata, Antigravity IDE enums, Cloud Code API endpoints, system prompts, OAuth endpoints, tool suffixes for anti-ban cloaking.

### `runtimeConfig.js`
HTTP status codes, error types, cache TTLs, timeout values (all env-overridable via `envMs()` helper), retry configs, skip patterns. Key defaults: STREAM_STALL_TIMEOUT_MS=360s, FETCH_CONNECT_TIMEOUT_MS=60s, DEFAULT_MAX_TOKENS=64000.

### `providers.js`
Barrel re-export of PROVIDERS and PROVIDER_OAUTH from registry. Contains Ollama local host resolution and Xiaomi Tokenplan region URL resolution.

### `providerModels.js`
Model lookup/validation layer. Handles dot-version tolerance for Kiro/KR models, upstream model ID resolution, quota family, strip lists. DOT_VERSION_PROVIDERS set tolerates dash/dot version separators.

### `errorConfig.js`
Error classification rules. Text-based rules checked first (substring match), then status-based fallback. Defines cooldown durations and backoff config.

## Executors (`executors/`) — Per-Provider Upstream Callers

Each executor handles the HTTP call to a specific provider's API. `default.js` handles any OpenAI-compatible provider. Specialized executors exist for non-standard APIs:
- `antigravity.js` — Google internal API with MITM support
- `azure.js` — Azure OpenAI with deployment routing
- `codex.js` — OpenAI Codex Responses API
- `commandcode.js` — NDJSON binary format
- `kiro.js` — AWS Kiro EventStream protobuf
- `cursor.js` — Cursor protobuf protocol
- And many more per-provider executors

## Translator (`translator/`) — Format Translation Engine

### Architecture
Pivots through **OpenAI as the intermediate format**. Translators self-register via `register(from, to, reqFn, resFn)` as an import side effect. A translator on exact `source:target` pair runs as a **direct route**, skipping the lossy double-hop.

### Key Direct Routes
- `claude:kiro` — Preserves thinking blocks, tool IDs
- `claude:openai` — Claude↔OpenAI bridge
- `openai:gemini` — OpenAI↔Gemini native
- And others for fragile pairs

### Schema (`translator/schema/`)
Defines canonical message/content block structures. Never hardcode role/block/model strings — use schema constants.

### Registration Pattern
Every translator file MUST be imported in `translator/index.js` or it never runs. Import triggers `register()` side effect.

## RTK Token Saver (`rtk/`)

Pre-translate hooks that compress `tool_result` content in-place to cut tokens. **Fail-open**: any error returns null and leaves body untouched. Skips `is_error`/`status:"error"` results to preserve traces.

## Services (`services/`)

- Account fallback and selection
- Token refresh orchestration
- OAuth credential management
- Model alias resolution
- Format detection

## Shared Utilities (`shared/`, `utils/`)

Common helpers used across the engine: error formatting, stream processing, JSON parsing, data URI encoding, etc.

## Key Patterns & Gotchas

1. **Self-registration**: New translators must be imported in index.js
2. **Fail-open RTK**: Never throw from compression hooks
3. **Direct routes preferred**: For fragile format pairs, avoid double-hop
4. **Config-driven**: Never hardcode provider/model strings
5. **Proxy patching**: Global fetch is patched at import time
6. **Env-overridable timeouts**: All timeouts respect environment variables
