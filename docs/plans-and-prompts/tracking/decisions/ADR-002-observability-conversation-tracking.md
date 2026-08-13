# ADR-002: Observability — conversationId + requestDetails

**Date:** 2026-08-05
**Author:** GitHub Copilot agent
**Status:** active
**Tags:** #decision #observability #sqlite

## Context

User wanted per-conversation/per-chat logging of everything sent/received, exportable as markdown, filterable in the UI.

## Decision

- Add nullable `conversationId TEXT` columns + indexes to `usageHistory` and `requestDetails` (SCHEMA_VERSION 1→2; additive auto-sync handles migration — no manual migration file needed, version bump triggers pre-change safety backup)
- Resolve conversationId: `x-conversation-id` header → `extra_body.conversation_id` → null
- Thread through `handleChatCore` → `sharedCtx` → all sub-handlers (streaming, non-streaming, SSE→JSON, onStreamComplete)
- `buildRequestDetail()` + repo flush record forward `conversationId` (and later `errorCategory`)

## Why

Early research said `saveRequestDetail()` was "never called" — that was WRONG. Deep audit showed it's wired in 7 of 8 exit paths with buffered/batched writes (zero latency, fire-and-forget). The real gaps were: no conversation grouping, no conversationId filter, no errorCategory persistence.

## Consequences

- Per-conversation grouping + filter UI + JSON/markdown export
- Backward compatible (nullable column, undefined-safe forwarders)
- Streaming non-SSE edge case (the one uncovered exit path) now also captures details

## Commits

- `6f00d23f` — conversationId + streaming non-SSE fix
- `a954b88f` — export endpoint
- `d9415807` — conversation filter UI
- `40168739` — errorCategory pipeline fix (E2E-caught)
