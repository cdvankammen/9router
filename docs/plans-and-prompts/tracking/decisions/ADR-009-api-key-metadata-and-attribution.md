# ADR-009: API Key Metadata + Usage Attribution Schema

**Date:** 2026-08-31
**Author:** Claude Code agent (main session)
**Status:** proposed
**Tags:** #decision #architecture #credentials #attribution

## Context

The user asked "where do my messages come from?" — per-app, per-key, per-user attribution. Today API keys are opaque strings: no name, owner, tags, expiry, or per-key usage breakdown. UA fingerprinting (`src/lib/sourceApps.js`) gives the app dimension but nothing else. LiteLLM (virtual keys with metadata/budgets/rate limits), Anthropic (personal/service-account/workspace keys with expiry), and OpenRouter (per-key guardrail assignments) all treat keys as first-class identities.

## Decision

**Add key metadata + a usage-attribution table to the SQLite layer.**

1. **Migration:** extend the API-keys table with `name`, `owner`, `tags` (JSON), `created_at`, `last_used_at`, `expires_at`, `disabled`; new `usage_attribution` table: `key_id`, `source_app`, `user_id`, `session_id`, `task_type`, `provider`, `model`, `tokens_in`, `tokens_out`, `cost_usd`, `ts`.
2. **Repo:** `src/lib/db/repos/apiKeysRepo.js` (metadata CRUD) + `attributionRepo.js` (write/query).
3. **Wiring:** `src/sse/handlers/chat.js` resolves the key from `Authorization`, threads `key_id` + attribution fields into usage meta (`src/lib/usageDb.js`).
4. **Privacy:** never persist raw UA — only the source-app class (existing `sourceApps.js` convention).

## Why (evidence)

- LiteLLM/Anthropic/OpenRouter all model keys as identities with metadata (research doc Part B).
- `usageDb.js` already captures `meta.taskType`; adding `meta.keyId`/`meta.sourceApp` is the same pattern.
- SQLite layer (`src/lib/db/`) is the established persistence path with migrations.

## Consequences

- Every request can be attributed to app + key + user + task + upstream destination.
- Dashboard "Sources" view becomes possible (M1).
- Per-key rate limits/budgets/allowlists (M2/M4/M5) all hang off this metadata.
- Migration must be additive (existing keys get `name = null`, `owner = null`).

## Alternatives Rejected

- **UA-only attribution** — no per-key/user dimension; can't answer "which key is misbehaving".
- **Separate keys table** — keys already exist in the DB; extending is additive and simpler.
- **In-memory attribution** — lost on restart; usage history is already persisted.

## Reversibility

High — additive columns/tables; can drop the new table without touching existing data.

## References

- Research: `../research/2026-08-31-message-origin-and-destination-research.md` §C.1
- Plan: `../planning/2026-08-31-source-app-governance-plan.md` M1/M6