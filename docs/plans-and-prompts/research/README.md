# Research

**Date:** 2026-08-13
**Author:** Claude Code agent (main session, v1 branch)
**Status:** active
**Tags:** #research #index

Deep-dive research notes, code-tour write-ups, and design-exploration docs. Unchanged from the original `research/` folder — already correctly scoped.

## Contents

| Path | Covers |
|------|--------|
| `9router/` | Repo-specific deep dives (per the parent `README.md`'s cross-repo convention: `research/<repo>/`) — engine, translator, providers, executors, DB, OAuth, SSE, MITM, API routes, plus feature/design research (drop indicator, node failover, messages audit, error inbox) |
| `message-capture-*.md` | Cross-cutting message-capture research (deep research, gaps/risks, log viewing, obscure-project handling, design philosophies) |
| `2026-08-31-context-window-overrides-research.md` | Per-model & per-combo context window overrides — static caps, override plumbing, fake vs real models, storage options, code locations |
| `2026-08-31-hybrid-round-robin-fallback-research.md` | Hybrid round-robin + fallback combo behavior — current strategies, implicit hybrid, temporary rules, code locations |
| `2026-08-31-combo-duplication-verification.md` | Combo duplication verification — implementation, edge cases, live API verification |

## When conducting research

- State the question or objective upfront
- Document sources consulted (URLs, docs, code references)
- Record raw findings before synthesizing conclusions
- Note confidence levels and open questions
- Tag with relevant technologies, providers, or components

## Conventions

Same as [`../README.md`](../README.md). New repos in this workspace get their own subfolder here (`research/<repo>/`), not a new top-level category.
