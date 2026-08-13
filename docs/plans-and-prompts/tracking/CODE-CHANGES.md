# Code Changes Index

**Date:** 2026-08-13
**Author:** Claude Code agent (main session, v1 branch)
**Status:** active
**Tags:** #tracking #code-changes #index

Rolling index from "what changed in the code" → "which doc explains why." New entries go at the top. This is a pointer index, not a diff — the actual diffs live in git history/PRs; this file exists so a future reader can find the *rationale* for a code change without re-deriving it.

| Date | Code touched | Explained in |
|---|---|---|
| 2026-08-13 | `src/app/(dashboard)/dashboard/providers/[id]/page.js` (`handleImportModels` batch import) | `learnings/2026-08-13-openrouter-refresh-models-serial-import-hang.md`, `CHANGELOG.md` UPDATE 2026-08-13 |
| 2026-08-12 | `open-sse/executors/default.js` (`include_usage` guard), `open-sse/services/usage.js` (quota allowlist), `open-sse/providers/capabilities.js` + `src/lib/db/repos/settingsRepo.js` (capability overrides), `src/app/(dashboard)/dashboard/providers/[id]/{page.js,ErrorGroupList.js,ProviderErrorPanel.js,ProviderUsageCard.js}` (System B error/usage panels) | `learnings/2026-08-12-provider-observability-and-usage-fixes.md`, `decisions/ADR-008-provider-page-observability-reuse.md`, `CHANGELOG.md` UPDATE 2026-08-12 |

## Discipline

Add a row here whenever a code change has a non-obvious "why" documented elsewhere in this knowledge base — skip it for changes that are self-explanatory from the diff alone.
