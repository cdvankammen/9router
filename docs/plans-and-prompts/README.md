# Plans & Prompts

> **Single source of truth** for all non-code artifacts in this workspace.
> Every agent working in this repository MUST read this file before creating or modifying documentation.

## Purpose

This folder is the centralized knowledge base for:

- Research notes and findings
- Project plans and roadmaps
- Meeting notes and discussions
- Architecture decisions and ADRs
- Lessons learned and postmortems
- Prompt engineering artifacts
- Temporary working documents

**Everything that isn't source code lives here.** If you produce a document, note, plan, or research artifact — it belongs in this folder.

## Folder Structure

| Folder | Contents |
|--------|----------|
| `research/` | Deep-dive research notes, competitive analysis, API exploration, protocol specs, ecosystem mapping |
| `plans/` | Project plans, feature specs, implementation roadmaps, sprint plans, task breakdowns |
| `meetings/` | Meeting notes, discussion summaries, stakeholder conversations, decision logs from syncs |
| `decisions/` | Architecture Decision Records (ADRs), trade-off analyses, technology choices with rationale |
| `learnings/` | Postmortems, debugging insights, patterns discovered, things that didn't work and why |
| `architecture/` | System design docs, diagrams, data flow descriptions, component relationships |
| `prompts/` | Prompt templates, system prompts, evaluation results, prompt engineering experiments |
| `temp/` | Scratch space, WIP drafts, ephemeral notes. Clean up periodically. |

## Conventions

### File Naming
- Use kebab-case: `provider-oauth-flow.md`, not `Provider_OAuth_Flow.md`
- Prefix with date when chronological order matters: `2026-08-05-kickoff-notes.md`
- Be descriptive: `gemini-thinking-block-translation-research.md`, not `notes.md`

### Document Structure
Every document should start with a YAML frontmatter or markdown header block:

```markdown
# Title

**Date:** 2026-08-05
**Author:** [agent name or human]
**Status:** draft | active | archived
**Tags:** #research #translator #gemini
```

### Cross-Repository Notes
This workspace will contain multiple repositories over time. When documenting something that spans repos:
- Create a subfolder named after the repo or project: `research/9router/`, `research/some-other-project/`
- Use the top-level folders for cross-cutting concerns that apply to the whole workspace

### Agent Contributions
All agents are encouraged to:
1. **Read existing docs first** — avoid duplicating research or decisions already documented
2. **Write everything down** — if you discover something useful, document it here
3. **Update, don't just append** — if new information supersedes an old doc, update the old doc and note what changed
4. **Link liberally** — reference other docs in this folder using relative paths
5. **Tag your work** — use the Status field so others know if a doc is WIP or finalized

### What NOT to Put Here
- Secrets, API keys, passwords, or tokens (use `.env` or a secrets manager)
- Generated build artifacts or compiled output
- Large binary files (link to them instead)
- Anything that changes on every build (use CI artifacts)

## Multi-Repo Workspace

As additional repositories are added to this workspace, extend this structure:

```
docs/plans-and-prompts/
├── README.md              ← this file (workspace-level conventions)
├── research/
│   ├── 9router/           ← repo-specific research
│   └── other-project/     ← another repo's research
├── plans/
│   ├── 9router/
│   └── other-project/
└── ...
```

Cross-cutting docs (e.g., shared infrastructure decisions) stay at the top level without a repo subfolder.
