# Master Topic Index — Per-Topic 6-Level Binary Trees (26 topics)

**Date:** 2026-09-15
**Author:** Claude Code agent (main session)
**Status:** active
**Tags:** #research #index #tree #binary-tree #per-topic

## Purpose

The user clarified the binary-tree requirement: **each research topic / phrase / thing researched from a document must go a minimum of 6 levels deep** — i.e. each topic gets its OWN full 6-level binary tree (L0 root → L6 leaves, 127 nodes), expanding into an exponential amount of research.

This index maps every topic from the two prior research docs to its own tree doc. The earlier shared master tree (`2026-09-15-master-research-tree.md`) and its 16 branch docs are **kept** — this is additive.

## Topic inventory (from the two research docs)

### From `2026-08-31-message-origin-and-destination-research.md`

| # | Topic | Source section | Tree doc |
|---|-------|---------------|----------|
| T1 | Source-app fingerprinting (`sourceApps.js`) | Part A.1 | `2026-09-15-tree-t01-source-app-fingerprinting.md` |
| T2 | Smart router task classification | Part A.2 | `2026-09-15-tree-t02-task-classification.md` |
| T3 | Inbound rate limiter | Part A.3 | `2026-09-15-tree-t03-inbound-rate-limiter.md` |
| T4 | Auth & API keys | Part A.4 | `2026-09-15-tree-t04-auth-api-keys.md` |
| T5 | Usage/logs | Part A.5 | `2026-09-15-tree-t05-usage-logs.md` |
| T6 | Persistence (SQLite layer) | Part A.6 | `2026-09-15-tree-t06-persistence-sqlite.md` |
| T7 | OpenRouter app attribution | Part B.1 | `2026-09-15-tree-t07-openrouter-app-attribution.md` |
| T8 | OpenRouter guardrails | Part B.1 | `2026-09-15-tree-t08-openrouter-guardrails.md` |
| T9 | OpenRouter BYOK | Part B.1 | `2026-09-15-tree-t09-openrouter-byok.md` |
| T10 | Anthropic rate limits | Part B.2 | `2026-09-15-tree-t10-anthropic-rate-limits.md` |
| T11 | Anthropic workspaces | Part B.2 | `2026-09-15-tree-t11-anthropic-workspaces.md` |
| T12 | Anthropic identity-backed keys | Part B.2 | `2026-09-15-tree-t12-anthropic-identity-keys.md` |
| T13 | LiteLLM virtual keys/teams/budgets | Part B.3 | `2026-09-15-tree-t13-litellm-keys-teams-budgets.md` |
| T14 | Agent identity & attribution headers | Part B.4 | `2026-09-15-tree-t14-agent-identity-headers.md` |
| T15 | Queue management | Part B.5 | `2026-09-15-tree-t15-queue-management.md` |
| T16 | Attribution dimensions ("where from") | Part C.1 | `2026-09-15-tree-t16-attribution-dimensions.md` |
| T17 | Routing/control dimensions ("where to") | Part C.2 | `2026-09-15-tree-t17-routing-control-dimensions.md` |
| T18 | Recommended architecture (phases) | Part C.3 | `2026-09-15-tree-t18-recommended-architecture.md` |

### From `2026-09-14-keyless-governance-research.md`

| # | Topic | Source section | Tree doc |
|---|-------|---------------|----------|
| T19 | Keyless gating option space | Part A | `2026-09-15-tree-t19-keyless-gating.md` |
| T20 | Agent profiles | Part B | `2026-09-15-tree-t20-agent-profiles.md` |
| T21 | Synthetic & programmatic source tracking | Part C | `2026-09-15-tree-t21-synthetic-source-tracking.md` |
| T22 | Tag/keyword priority queues | Part D | `2026-09-15-tree-t22-tag-priority-queues.md` |
| T23 | Model-group limiting | Part E | `2026-09-15-tree-t23-model-group-limiting.md` |
| T24 | Adaptive/predictive rate control | Part F | `2026-09-15-tree-t24-adaptive-rate-control.md` |
| T25 | Gate levels | Part G | `2026-09-15-tree-t25-gate-levels.md` |
| T26 | Governance architecture synthesis | Part H | `2026-09-15-tree-t26-governance-architecture.md` |

## Tree format (per topic)

Each topic doc contains:

1. **Objective** — the topic, restated.
2. **Full 6-level binary tree** (127 nodes) — L0 root, L1–L6, every internal node with exactly 2 children, drawn as a compact path listing.
3. **Node research** — for every node: codebase grounding, external research, or design note (1–3 lines each).
4. **Confidence levels** and **open questions**.
5. **Sources**.

## Status

| Batch | Topics | Status |
|-------|--------|--------|
| 1 | T1–T3 | ✅ |
| 2 | T4–T6 | ✅ |
| 3 | T7–T9 | ✅ |
| 4 | T10–T12 | ✅ |
| 5 | T13–T15 | ✅ |
| 6 | T16–T18 | ✅ |
| 7 | T19–T21 | ✅ |
| 8 | T22–T24 | ✅ |
| 9 | T25–T26 | ✅ |