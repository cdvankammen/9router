---
Date: 2026-09-16
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, documentation, docs, knowledge-base, auto-doc
---

# Implementation Plan 33 — Documentation & Knowledge Base

> Written after the binary-tree research expansion (see `39-binary-tree-expansion-master-plan.md`, `47-branch-9router-internal-threads.md`).
> This plan covers the "documentation" option: comprehensive documentation and knowledge base for 9Router.

## 1. Goal

Build a comprehensive documentation and knowledge base for 9Router: architecture docs, user guides, provider docs, troubleshooting, and auto-generated API docs — kept in sync with code.

## 2. Background (from research)

- **9Router current state**: ARCHITECTURE.md (partially stale per CLAUDE.md), README + translations, docs/plans-and-prompts/ research corpus.
- **Research findings**: docs drift from code; auto-generated docs stay current; troubleshooting guides reduce support load; provider docs must be per-provider.

## 3. Design

### 3.1 Doc Structure

- **Architecture**: ARCHITECTURE.md refreshed (SQLite layer, new flows).
- **User guides**: setup, configuration, routing, providers.
- **Provider docs**: per-provider setup + quirks.
- **Troubleshooting**: common issues + resolutions.

### 3.2 Auto-Generated Docs

- **API docs**: auto-generated from routes.
- **Config docs**: auto-generated from config schemas.
- **Provider registry docs**: auto-generated from registry.

### 3.3 Doc Sync

- **Doc checks**: verify docs match code (scripts).
- **Doc CI**: doc freshness checks in CI.
- **Doc updates**: update on code changes.

### 3.4 Knowledge Base

- **Research corpus**: maintain research docs.
- **Decision records**: ADRs for major decisions.
- **Glossary**: terms maintained.

## 4. Implementation Steps

1. Refresh ARCHITECTURE.md.
2. Build user guides.
3. Add provider docs.
4. Build auto-generated docs.
5. Add doc freshness checks.
6. Tests: doc checks.

## 5. Files Touched

- `docs/ARCHITECTURE.md` (refresh)
- `docs/guides/` (new)
- `docs/providers/` (new)
- `scripts/gen-api-docs.mjs` (new)
- `scripts/check-doc-freshness.mjs` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Doc drift | Freshness checks |
| Doc bloat | Structured; prioritized |
| Auto-gen complexity | Simple generators |
| Maintenance cost | CI enforcement |

## 7. Success Criteria

- ARCHITECTURE.md current.
- User guides complete.
- Provider docs per-provider.
- Doc freshness enforced.

## 8. Related Plans
- Plan 20 (Master Rules) — doc rules.
- Plan 32 (CI) — doc checks in CI.
- Plan 30 (i18n) — translated docs.