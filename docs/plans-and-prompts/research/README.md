# Research

**Date:** 2026-08-13
**Author:** Claude Code agent (main session, v1 branch)
**Status:** active
**Tags:** #research #index

Deep-dive research notes, code-tour write-ups, and design-exploration docs. Unchanged from the original `research/` folder — already correctly scoped.

## Contents

| Path | Covers |
|------|--------|
| `9router/` | Repo-specific deep dives (per the parent `README.md`'s cross-repo convention: `research/<repo>/`) — engine, translator, providers, executors, DB, OAuth, SSE, MITM, API routes, plus feature/design research (drop indicator, node failover, messages audit, error inbox, message-driven tools) |
| `9router/38-message-driven-tools-research.md` | Message-driven tool-building: requestDetails anatomy, identity signals, API surface, 9 gaps, 4 design options (hybrid recommended), build/record primitives, privacy |
| `message-capture-*.md` | Cross-cutting message-capture research (deep research, gaps/risks, log viewing, obscure-project handling, design philosophies) |
| `2026-09-15-exponential-master-map.md` | Exponential master map: N-ary (not 2-way) expansion — every phrase in the source docs is a root (26 roots E01–E26), each expanded ≥6 levels deep with variable branching (hundreds of phrases per level possible); 26 expansion docs |
| `2026-09-15-exp-e*.md` | Exponential expansion research (26 docs): E01 source-app fingerprinting, E02 task classification, E03 inbound rate limiter, E04 auth & API keys, E05 usage/logs, E06 persistence (SQLite), E07 OpenRouter app attribution, E08 OpenRouter guardrails, E09 OpenRouter BYOK, E10 Anthropic rate limits, E11 Anthropic workspaces, E12 Anthropic identity keys, E13 LiteLLM keys/teams/budgets, E14 agent identity headers, E15 queue management, E16 attribution dimensions, E17 routing/control dimensions, E18 recommended architecture, E19 keyless gating, E20 agent profiles, E21 synthetic source tracking, E22 tag priority queues, E23 model-group limiting, E24 adaptive rate control, E25 gate levels, E26 governance architecture |
| `2026-09-15-master-topic-index.md` | Master topic index: 26 topics from the two governance research docs, each expanded into its own full 6-level binary tree (127 nodes); 9 batches, all ✅ |
| `2026-09-15-tree-t*.md` | Per-topic binary-tree research (26 docs): T1 source-app fingerprinting, T2 task classification, T3 inbound rate limiter, T4 auth & API keys, T5 usage/logs, T6 persistence (SQLite), T7 OpenRouter app attribution, T8 OpenRouter guardrails, T9 OpenRouter BYOK, T10 Anthropic rate limits, T11 Anthropic workspaces, T12 Anthropic identity keys, T13 LiteLLM keys/teams/budgets, T14 agent identity headers, T15 queue management, T16 attribution dimensions, T17 routing/control dimensions, T18 recommended architecture, T19 keyless gating, T20 agent profiles, T21 synthetic source tracking, T22 tag priority queues, T23 model-group limiting, T24 adaptive rate control, T25 gate levels, T26 governance architecture |
| `2026-09-15-master-research-tree.md` | Master map: 6-level binary tree (63 nodes) expanding all governance research; 16 Level-3 branches, each with its own doc |
| `2026-09-15-branch-*.md` | Binary-tree branch research (16 docs): A1a UA fingerprinting, A1b header/network identity, A2a synthetic labels, A2b behavioral fingerprints, B1a static rate limits, B1b adaptive rate control, B2a priority queues, B2b interval pacing, B3a model-group definitions, B3b model-group observability, B4a content guardrails, B4b budget guardrails, B5a key lifecycle, B5b alternative auth, B6a cooperative identity, B6b behavioral identity |
| `2026-09-15-webhook-receive-act-research.md` | Webhook receive & act: 6-level binary tree across 20+ programs (LiteLLM, One API, Helicone, Home Assistant, n8n, Node-RED, Pipedream, Huginn, Slack, Discord, Telegram, ntfy, Gotify, Apprise, Stripe, GitHub, Svix, Hookdeck, Uptime Kuma, Healthchecks.io), 12 archetypes, recommended hybrid architecture (TCA + Dual-Mode + Universal Adapter), design decisions |
| `2026-09-15-webhook-master-research-tree.md` | Webhook master map: 6-level binary tree (63 nodes) expanding the webhook receive & act research; 8 Level-3 branches, each with its own doc |
| `2026-09-15-webhook-branch-*.md` | Webhook binary-tree branch research (8 docs): A1a transport, A1b auth & security, A2a event store, A2b rule engine, B1a messaging platforms, B1b push services, B2a internal events, B2b scheduled & monitoring |
| `2026-09-15-webhook-exponential-master-map.md` | Webhook exponential master map: N-ary (not 2-way) expansion — every phrase in the source docs is a root (48 roots R01–R48), each expanded 6 levels deep with N children per node; 11 branch docs |
| `2026-09-15-webhook-exp-*.md` | Webhook exponential branch research (11 docs): 01 receiver & transport (R01–R04), 02 auth & secrets (R05–R08), 03 event store & worker (R09–R11), 04 rule engine & actions (R12–R14), 05 messaging platforms (R15–R17), 06 push services (R18–R20), 07 internal events (R21–R23), 08 scheduled & monitoring (R24–R25), 09 standards & infra (R26–R29), 10 patterns & platforms (R30–R46), 11 HTTP client architecture (R47–R48) |
| `2026-09-14-keyless-governance-research.md` | Keyless governance: agent profiles, synthetic source tracking, tag/keyword priority queues, gate levels, model-group limiting, adaptive/predictive rate control |
| `2026-08-31-message-origin-and-destination-research.md` | Message origin ("where do my messages come from") + destination ("where do they go") — attribution dimensions, industry models (OpenRouter/Anthropic/LiteLLM/MCP), existing-codebase inventory, design space |
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
