# Plans & Prompts

> **Single source of truth** for all non-code artifacts in this workspace.
> Every agent working in this repository MUST read this file before creating or modifying documentation.

## Purpose

This folder is the centralized knowledge base for research, plans, decisions, learnings, architecture, connections, security, UI/UX, and operations documentation. **Everything that isn't source code lives here.** If you produce a document, note, plan, or research artifact — it belongs in this folder.

## Folder Structure

| Folder | Contents |
|--------|----------|
| `architecture/` | System design docs, diagrams, component relationships. Start at `ARCHITECTURE.md` — a map into the authoritative `docs/ARCHITECTURE.md`, plus narrower design notes. |
| `connections/` | Provider-connection runbook: credential storage, OAuth/token refresh, adding a provider, diagnosing a broken connection. Start at `CONNECTIONS.md`. |
| `security/` | Secrets/env contract, IP-trust boundary, the one hard rule (see below). Start at `SECURITY.md`. |
| `ui-ux/` | Dashboard UI/UX conventions and design decisions. Start at `UI-UX.md`. |
| `operations/` | Runbooks, living test-workflow plans, release process. Start at `OPERATIONS.md` (day-to-day commands), `TESTING.md` (test-workflow index). |
| `planning/` | Project plans, feature specs, roadmaps, task breakdowns. |
| `research/` | Deep-dive research notes, code-tour write-ups, competitive/ecosystem analysis. Repo-specific work goes under `research/<repo>/`. |
| `interpretation/` | The map over the research: plain-language guides, doc-by-doc summaries, syntheses, and reading/build orders that make dense research understandable. Start at `interpretation/README.md`. |
| `tracking/` | The durable historical record: `TASKS.md`, `CHANGELOG.md`, `SESSION-HISTORY.md`, `SESSION-NARRATIVE.md`, `CODE-CHANGES.md`, `DECISIONS.md`/`decisions/` (ADRs), `FINDINGS.md`/`learnings/` (postmortems), `meetings/`. Start at `tracking/README.md`. |
| `templates/` | Reusable skeletons (`WORK-ITEM-TEMPLATE.md`, `RESEARCH-NOTE-TEMPLATE.md`) and prompt-engineering artifacts. |
| `temp/` | Scratch space, WIP drafts, ephemeral notes. Gitignored. Clean up periodically — **not** part of the durable taxonomy above, and never a place to assume secrets are "safe." |

Every folder above has its own `README.md` — read it before adding to that category.

## The one rule that overrides everything else

**Never include a real API key, token, password, private URL, or personal data in a doc, template, screenshot, or commit message.** Not even in `temp/`. See `security/SECURITY.md`.

## Conventions

### File Naming
- Use kebab-case: `provider-oauth-flow.md`, not `Provider_OAuth_Flow.md`
- Prefix with date when chronological order matters: `2026-08-05-kickoff-notes.md`
- Be descriptive: `gemini-thinking-block-translation-research.md`, not `notes.md`

### Document Structure
Every document should start with a frontmatter/header block:

```markdown
# Title

**Date:** 2026-08-05
**Author:** [agent name or human]
**Status:** draft | active | archived
**Tags:** #research #translator #gemini
```

### Cross-Repository Notes
This workspace may hold multiple repositories over time. When documenting something that spans repos, use a subfolder named after the repo inside the relevant category (`research/9router/`, `research/some-other-project/`). Use the top-level category folders for cross-cutting concerns.

### Agent Contributions
1. **Read existing docs first** — avoid duplicating research or decisions already documented
2. **Write everything down** — if you discover something useful, document it here
3. **Update, don't just append** — if new information supersedes an old doc, update it and note what changed
4. **Link liberally** — reference other docs in this folder using relative paths
5. **Tag your work** — use the Status field so others know if a doc is WIP or finalized
6. **Update `tracking/` in the same commit** as any meaningful feature/fix — `CHANGELOG.md`, `TASKS.md`, and (if non-obvious) a new ADR or learnings doc

### What NOT to Put Here
- Secrets, API keys, passwords, or tokens (use `.env` or a secrets manager) — see `security/SECURITY.md`
- Generated build artifacts or compiled output
- Large binary files (link to them instead)
- Anything that changes on every build (use CI artifacts)

## Relationship to other docs in this repo

- `docs/ARCHITECTURE.md` (repo root, referenced by `CLAUDE.md`) — the authoritative whole-system architecture doc. Not duplicated here; `architecture/ARCHITECTURE.md` maps into it.
- `open-sse/AGENTS.md` — code-adjacent conventions for the routing engine, deliberately colocated with that code. Out of scope for this folder.
- Repo root `CHANGELOG.md` — the real, user-facing release changelog. Distinct from `tracking/CHANGELOG.md`, which is this knowledge base's internal dev/session changelog. See `operations/VERSIONING.md`.
