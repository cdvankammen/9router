# Connections

**Date:** 2026-08-13
**Author:** Claude Code agent (main session, v1 branch)
**Status:** active
**Tags:** #connections #index #providers #oauth

Notes on how 9Router connects to upstream providers: credential flows, OAuth/token refresh, adding a new provider, and diagnosing a stuck/broken connection.

## Contents

| File | Covers |
|------|--------|
| `CONNECTIONS.md` | The provider-connection runbook — how connections are stored, how OAuth/refresh works, how to add a provider, how to diagnose a stuck connection |

## Related (not duplicated here)

- `docs/ARCHITECTURE.md` §"OAuth Onboarding and Token Refresh Lifecycle" and §"Combo + Account Fallback Flow"
- `open-sse/AGENTS.md` — "How to add" a provider/executor/translator
- `../architecture/ARCHITECTURE.md` — map into the above
- `../tracking/learnings/2026-08-13-openrouter-refresh-models-serial-import-hang.md` — a real connection-page bug and how it was diagnosed live

## Conventions

Same as [`../README.md`](../README.md).
