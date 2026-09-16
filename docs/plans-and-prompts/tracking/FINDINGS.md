# Findings Index

**Date:** 2026-08-13
**Author:** Claude Code agent (main session, v1 branch)
**Status:** active
**Tags:** #tracking #learnings #index

Index of all learnings in `learnings/`, newest first. Update this list when adding a new one — don't let it drift.

| File | Covers |
|---|---|
| `2026-09-16-hermes-message-import-research.md` | Hermes message import: recording external agent traffic in 9Router — provider matching by model name, normalization, error reconstruction, DB schema, integration points (research note in `research/`) |
| `2026-09-15-message-driven-tools-research-pattern.md` | Message-driven tool-building: the "everything is a dimension" research pattern — verify companion docs, update indexes in same commit, ADR for design decisions, flag unverified dependencies |
| `2026-08-13-openrouter-refresh-models-serial-import-hang.md` | Serial per-item POST+refetch loop mistaken for a hang; live-curl diagnosis over static review |
| `2026-08-12-provider-observability-and-usage-fixes.md` | `include_usage` guard, quota-tracker allowlist, System A/B error split, capability overrides + cache invalidation |
| `2026-08-09-messages-page-audit-and-refactor.md` | Messages page audit and refactor (origin of "System B" error grouping) |
| `2026-08-09-compact-sidebar-scroll-fix.md` | Compact sidebar scroll fix |
| `2026-08-08-stale-server-chunkload.md` | Stale server chunk-load error |
| `2026-08-07-sr-cleanup-scheduler-standalone.md` | Smart-router cleanup scheduler, standalone mode |
| `2026-08-07-research-synthesis.md` | Research synthesis |
| `2026-08-07-drop-indicator-dnd-kit-coordinates.md` | dnd-kit coordinate gotchas for the drop indicator |
| `2026-08-06-test-isolation-sqlite-driver.md` | Test isolation, SQLite driver |
| `2026-08-06-sse-done-duplicate-leak.md` | SSE `[DONE]` duplicate/leak |
| `2026-08-06-smart-router-e2e-bugs.md` | Smart router E2E bugs |
| `2026-08-06-errorcategory-pipeline-drop.md` | Error-category pipeline drop |

## When to write a new one

Any bug whose root cause wasn't obvious from the symptom, or any pattern discovered the hard way. Format: situation/symptoms → root cause → detection/prevention → links, per `../AGENTS.md`.
