# Glossary

**Date:** 2026-08-13
**Author:** Claude Code agent (main session, v1 branch)
**Status:** active
**Tags:** #glossary #reference

Terms used across this knowledge base and the codebase, in one place so they're not redefined inconsistently per-doc.

| Term | Meaning |
|---|---|
| **Combo** | A user-defined ordered list of models (possibly across providers) that 9Router falls back through for one logical request. |
| **Account fallback** | Falling back across multiple credentials/connections for the *same* provider, distinct from combo fallback across models. |
| **Connection** | A stored credential (API key or OAuth tokens) for one provider account. Managed under `/dashboard/providers`. See `connections/CONNECTIONS.md`. |
| **Executor** | Code under `open-sse/executors/` that makes the actual upstream HTTP call for a provider. `default.js` handles any OpenAI-compatible upstream; non-compatible upstreams (kiro, cursor, commandcode) get their own executor. |
| **Translator** | Code under `open-sse/translator/` that converts a request/response between client format and provider format, pivoting through OpenAI as the intermediate format unless a direct `source:target` route is registered. |
| **RTK (token saver)** | `open-sse/rtk/` — pre-translate hooks that compress `tool_result` content to cut tokens. Fail-open: any error leaves the body untouched. |
| **Smart router** | The subsystem that classifies tasks and can "stick" a conversation to a model/combo based on classification and observability signals. |
| **System A / System B** (error visibility) | System A = per-account `lastError` string driving the provider-card chip (no history). System B = the `requestDetails` table grouped into fingerprints, the richer error/history source. See `tracking/decisions/ADR-008-provider-page-observability-reuse.md`. |
| **DATA_DIR** | Env var controlling where the SQLite data layer (`src/lib/db/`) stores its file. Not the same as usage/log storage, which stays under `~/.9router` regardless of `DATA_DIR`. |
| **9Router (`9router-app`)** vs. **CLI (`9router`)** | Two separately-versioned published artifacts in one repo: the dashboard+gateway (root `package.json`) and the launcher package (`cli/`). See `operations/VERSIONING.md`. |

## Related

- `architecture/ARCHITECTURE.md`
- `connections/CONNECTIONS.md`
- root `CLAUDE.md`
