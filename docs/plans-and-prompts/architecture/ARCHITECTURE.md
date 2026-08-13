# Architecture Map

**Date:** 2026-08-13
**Author:** Claude Code agent (main session, v1 branch)
**Status:** active
**Tags:** #architecture #map

This is a map, not a duplicate. The authoritative whole-system architecture doc is `docs/ARCHITECTURE.md` (repo root, referenced directly by `CLAUDE.md`). Read it there — this page just tells you which section answers which question, plus links to narrower design notes that live in this knowledge base.

## "I need to understand..." → section

| Question | `docs/ARCHITECTURE.md` section |
|---|---|
| What does 9Router do, at a glance? | Executive Summary |
| What's explicitly out of scope? | Scope and Boundaries |
| How does a chat request flow end to end? | Request Lifecycle (`/v1/chat/completions`) |
| How does combo/multi-account fallback work? | Combo + Account Fallback Flow |
| How does OAuth onboarding + token refresh work? | OAuth Onboarding and Token Refresh Lifecycle |
| How does cloud sync work? | Cloud Sync Lifecycle (Enable / Sync / Disable) |
| Where does data live, and in what shape? | Data Model and Storage Map — **note:** the persistence section text is stale (says `db.json`); it's actually SQLite via `src/lib/db/` — see `CLAUDE.md`'s "Persistence" note |
| Which file owns which responsibility? | Module Mapping (Decision-Critical) |
| What upstream providers/formats are supported? | Provider Executor Coverage, Format Translation Coverage |
| What happens when a provider/token/stream fails? | Failure Modes and Resilience |
| What's the security boundary? | Security-Sensitive Boundaries |
| What env vars matter and why? | Environment and Runtime Matrix — see also `../security/SECURITY.md` |

## Request flow, one more level down

For the actual code path (not just the doc section), `CLAUDE.md`'s "Request flow" section is the fastest orientation:

```
src/app/api/v1/*  (Next rewrite: /v1/* → /api/v1/*)
  → src/sse/handlers/chat.js        (parse, combo expansion, account-selection loop)
  → open-sse/handlers/chatCore.js   (detect format, translate, dispatch, retry/refresh, stream setup)
  → open-sse/executors/*            (per-provider upstream call)
  → open-sse/translator/*           (client format ↔ provider format)
  → SSE back to client
```

`src/sse/` is app-side entry glue; `open-sse/` is the provider-agnostic engine. See `open-sse/AGENTS.md` before editing anything under `open-sse/` — it's deliberately colocated with that code and is out of scope for this knowledge base's reorg.

## Narrower design notes (this repo, this folder)

- `smart-router-observability.md` — smart-router task classification, stickiness, observability hooks
- `../tracking/decisions/` — ADRs for specific architectural choices (pre-combo interception, conversation tracking, SSE done-tracking, messages storage shape, …)
- `../research/9router/06-executors-deep-dive.md`, `07-providers-registry-deep-dive.md`, `08-translator-deep-dive.md`, `09-services-deep-dive.md`, `11-db-layer-deep-dive.md`, `12-oauth-deep-dive.md`, `13-sse-layer-deep-dive.md` — code-level deep dives one layer below the architecture doc
