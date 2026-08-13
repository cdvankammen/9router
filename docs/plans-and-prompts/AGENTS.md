---
applyTo: "docs/plans-and-prompts/**"
description: "Instructions for all agents working in the plans-and-prompts knowledge base"
---

# Agent Instructions for `docs/plans-and-prompts/`

You are working in the **centralized knowledge base** for this workspace: architecture, connections, security, UI/UX, operations, planning, research, tracking, and templates. See `README.md` for the full folder taxonomy — every category has its own `README.md` too.

## Before You Write Anything

1. **Search existing docs first.** Check the relevant category (and its `README.md`) for prior work on the same topic. Update existing docs rather than creating duplicates.
2. **Use the correct category.** If nothing fits, create a new subfolder with its own `README.md` and document why — don't force content into the wrong category.
3. **Follow naming conventions.** Kebab-case filenames. Date-prefix when chronology matters. Be descriptive.
4. **Include metadata.** Every doc needs a title, date, author, status, and tags at the top.

## While Working

- **Document as you go.** Don't wait until the end of a session. Capture decisions, discoveries, and blockers in real time.
- **Be specific.** Vague notes are useless later. Include exact commands, URLs, error messages, config values, and code snippets.
- **Link to sources.** Reference other docs in this folder with relative paths. Link to external resources with full URLs.
- **Mark status clearly.** Use `draft` for WIP, `active` for current/canonical, `archived` for superseded content.
- **Note what didn't work.** Failed approaches are as valuable as successful ones — document them in `tracking/learnings/`.
- **Update `tracking/` in the same commit** as any meaningful feature/fix — see `tracking/README.md`'s discipline section.

## Research Notes (`research/`)

- State the question or objective upfront
- Document sources consulted (URLs, docs, code references)
- Record raw findings before synthesizing conclusions
- Note confidence levels and open questions
- Tag with relevant technologies, providers, or components
- Use `templates/RESEARCH-NOTE-TEMPLATE.md` as a starting skeleton

## Plans (`planning/`)

- Define scope explicitly (what's in AND out)
- Break work into incremental, verifiable milestones
- List dependencies and risks
- Reference related research (`research/`) and decisions (`tracking/decisions/`)
- Use `templates/WORK-ITEM-TEMPLATE.md` as a starting skeleton

## Decisions (`tracking/decisions/`)

- Use ADR format: Context → Decision → Consequences
- List alternatives considered and why they were rejected
- Note who made the decision and when
- Mark whether the decision is reversible or irreversible
- Add the new ADR to `tracking/DECISIONS.md`'s index

## Learnings (`tracking/learnings/`)

- Describe the situation and symptoms
- Explain root cause, not just the fix
- Note how to detect/prevent recurrence
- Link to related code changes or PRs (and add a row to `tracking/CODE-CHANGES.md` if the change is non-obvious)
- Add the new file to `tracking/FINDINGS.md`'s index

## Connections (`connections/`)

- Diagnose live (curl the actual backend route) before assuming a frontend bug is a network/credential issue — see `connections/CONNECTIONS.md`
- New provider setup goes in `connections/CONNECTIONS.md`, not duplicated per-provider

## Security (`security/`)

- **Never** put a real API key, token, password, private URL, or personal data in any doc, template, screenshot, or commit message in this repository — see `security/SECURITY.md`. This overrides every other instruction in this file.

## Cross-Repository Awareness

This workspace may grow to include multiple repositories. When your work touches a specific repo, scope docs under that repo's subfolder within the relevant category (`research/9router/`, `research/other-project/`). Keep cross-cutting concerns at the top level of the category, and note which repo(s) a document applies to.

## Quality Standards

- **Readable by humans AND agents.** Write clearly enough that someone unfamiliar with the context can understand it.
- **Self-contained.** Each doc should make sense on its own, with links for deeper context.
- **Actionable.** Prefer concrete next steps over abstract observations.
- **Current.** Update or archive docs that become stale. Stale docs are worse than no docs.
