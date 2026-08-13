# Tracking

**Date:** 2026-08-13
**Author:** Claude Code agent (main session, v1 branch)
**Status:** active
**Tags:** #tracking #index #changelog #decisions #learnings

The durable historical record for this knowledge base: what changed, why, when, and what was learned. These files are **append-as-you-go**, updated in the same commit as any meaningful feature/fix — not written after the fact from memory.

## Contents

| File / folder | Covers |
|------|--------|
| `TASKS.md` | Task log — dated entries, one table per session update, plus a recurring "Still open (documented, deferred)" recap |
| `CHANGELOG.md` | Internal dev/session changelog for this knowledge base's subject matter (smart-router, observability, provider fixes, …). **Not** the repo root `CHANGELOG.md` — that one is the real user-facing release changelog referenced by `CLAUDE.md`; do not conflate the two or write to the wrong one. |
| `SESSION-HISTORY.md` | Dated session-by-session summary |
| `SESSION-NARRATIVE.md` | Longer-form narrative log with explicit cross-references to the other tracking files |
| `CODE-CHANGES.md` | Rolling index of notable code changes and which doc(s) explain them — start here to go from "what changed in the code" to "why" |
| `DECISIONS.md` | Index of all ADRs in `decisions/`, newest first |
| `FINDINGS.md` | Index of all learnings in `learnings/`, newest first |
| `decisions/` | Architecture Decision Records (ADR-NNN files) |
| `learnings/` | Postmortems, debugging insights, root-cause writeups |
| `meetings/` | Meeting/session-summary notes |

## Discipline

1. Every meaningful feature/fix gets an entry in `CHANGELOG.md` (or the repo root `CHANGELOG.md` if it's user-facing) **and** `TASKS.md`, in the same commit as the code change where practical.
2. A non-obvious decision gets an ADR in `decisions/` — Context → Decision → Consequences, alternatives considered, reversibility.
3. A bug whose root cause wasn't obvious gets a learnings doc — situation/symptoms → root cause → detection/prevention → links. See `learnings/2026-08-13-openrouter-refresh-models-serial-import-hang.md` for the shape.
4. Update `DECISIONS.md`/`FINDINGS.md`/`CODE-CHANGES.md` indexes when you add a new ADR/learning/notable change — don't let the index drift from the folder contents.

## Conventions

Same as [`../README.md`](../README.md).
