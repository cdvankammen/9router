---
applyTo: "docs/plans-and-prompts/**"
description: "Instructions for all agents working in the plans-and-prompts knowledge base"
---

# Agent Instructions for `docs/plans-and-prompts/`

You are working in the **centralized knowledge base** for this workspace. This folder contains all non-code artifacts: research, plans, decisions, learnings, architecture docs, prompts, and meeting notes.

## Before You Write Anything

1. **Search existing docs first.** Check the relevant subfolder for prior work on the same topic. Update existing docs rather than creating duplicates.
2. **Use the correct subfolder.** See `README.md` for the folder taxonomy. If nothing fits, create a new subfolder and document why.
3. **Follow naming conventions.** Kebab-case filenames. Date-prefix when chronology matters. Be descriptive.
4. **Include metadata.** Every doc needs a title, date, author, status, and tags at the top.

## While Working

- **Document as you go.** Don't wait until the end of a session. Capture decisions, discoveries, and blockers in real time.
- **Be specific.** Vague notes are useless later. Include exact commands, URLs, error messages, config values, and code snippets.
- **Link to sources.** Reference other docs in this folder with relative paths. Link to external resources with full URLs.
- **Mark status clearly.** Use `draft` for WIP, `active` for current/canonical, `archived` for superseded content.
- **Note what didn't work.** Failed approaches are as valuable as successful ones. Document them in `learnings/`.

## Research Notes (`research/`)

When conducting research:
- State the question or objective upfront
- Document sources consulted (URLs, docs, code references)
- Record raw findings before synthesizing conclusions
- Note confidence levels and open questions
- Tag with relevant technologies, providers, or components

## Plans (`plans/`)

When writing plans:
- Define scope explicitly (what's in AND out)
- Break work into incremental, verifiable milestones
- Each milestone should be independently testable
- List dependencies and risks
- Reference related research and decisions

## Decisions (`decisions/`)

When recording decisions:
- Use ADR format: Context → Decision → Consequences
- List alternatives considered and why they were rejected
- Note who made the decision and when
- Mark whether the decision is reversible or irreversible

## Learnings (`learnings/`)

When documenting learnings:
- Describe the situation and symptoms
- Explain root cause, not just the fix
- Note how to detect/prevent recurrence
- Link to related code changes or PRs

## Cross-Repository Awareness

This workspace will grow to include multiple repositories. When your work touches a specific repo:
- Scope docs under that repo's subfolder: `research/9router/`, `plans/cli-tool/`
- Keep cross-cutting concerns at the top level
- Always note which repo(s) a document applies to

## Quality Standards

- **Readable by humans AND agents.** Write clearly enough that someone unfamiliar with the context can understand it.
- **Self-contained.** Each doc should make sense on its own, with links for deeper context.
- **Actionable.** Prefer concrete next steps over abstract observations.
- **Current.** Update or archive docs that become stale. Stale docs are worse than no docs.
