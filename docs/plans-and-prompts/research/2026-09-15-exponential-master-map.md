# Master Exponential Map — Phrase-Level Research Expansion (26 roots, 6+ levels, variable branching)

**Date:** 2026-09-15
**Author:** Claude Code agent (main session)
**Status:** active
**Tags:** #research #exponential #expansion #phrase-inventory #governance

## Purpose

The user clarified the expansion requirement a second time:

> "when i say a binary tree expansion i am referencing that you're not just building one single binary tree or nodes specifically — you are making sure that for everything that you research from one document (and you can have more than one that you start with) and for every phrase that you decide i want to learn more about in that document that for each of those phrases you go at least 6 levels deep and for each level you may find hundreds of more phrases you want to research and then you will go and research each of those. and from that level you would have 4 more levels left you could go from that level worth of hundreds of phrases you could decide to research on each level so it would be exponential not just a 1 to 2 to 4 to 8 etc kind of research tree."

**Key difference from the prior T1–T26 work:** the T1–T26 docs are *strict binary trees* (exactly 2 children per node, 127 nodes). This expansion is **variable-branching**: every phrase discovered at a level becomes a node, and each node may have **any number** of children (3, 5, 20, hundreds) — the tree is exponential in the number of *phrases*, not in a fixed branching factor.

**Additive:** the T1–T26 strict-binary trees, the 16 branch docs, and the master research tree are all **kept**. This is a new, deeper layer.

## Starting documents (2)

1. `2026-08-31-message-origin-and-destination-research.md` (212 lines) — Parts A–E
2. `2026-09-14-keyless-governance-research.md` (389 lines) — Parts A–J

## Phrase inventory → expansion docs

Every researchable phrase in the two starting docs is inventoried below. Each row is a **root phrase** with its own expansion doc (E01–E26), each going **6+ levels deep with variable branching**.

### From `2026-08-31-message-origin-and-destination-research.md`

| # | Root phrase | Source section | Expansion doc |
|---|-------------|---------------|---------------|
| E01 | Source-app fingerprinting (`src/lib/sourceApps.js`) | A.1 | `2026-09-15-exp-e01-source-app-fingerprinting.md` |
| E02 | Smart router task classification (`open-sse/services/smartRouter.js`) | A.2 | `2026-09-15-exp-e02-task-classification.md` |
| E03 | Inbound rate limiter (`custom-server.rate-limiter.js`) | A.3 | `2026-09-15-exp-e03-inbound-rate-limiter.md` |
| E04 | Auth & API keys (JWT_SECRET, INITIAL_PASSWORD, API_KEY_SECRET, MACHINE_ID_SALT) | A.4 | `2026-09-15-exp-e04-auth-api-keys.md` |
| E05 | Usage/logs (`src/lib/usageDb.js`, usage.json, log.txt) | A.5 | `2026-09-15-exp-e05-usage-logs.md` |
| E06 | Persistence (SQLite adapter chain, repos, migrations) | A.6 | `2026-09-15-exp-e06-persistence-sqlite.md` |
| E07 | OpenRouter app attribution (HTTP-Referer, X-OpenRouter-Title, categories, visibility) | B.1 | `2026-09-15-exp-e07-openrouter-app-attribution.md` |
| E08 | OpenRouter guardrails (budget, allowlists, ZDR, data regions, security, sensitive info, custom filters, hierarchy) | B.1 | `2026-09-15-exp-e08-openrouter-guardrails.md` |
| E09 | OpenRouter BYOK + management keys | B.1 | `2026-09-15-exp-e09-openrouter-byok.md` |
| E10 | Anthropic rate limits (token bucket, RPM/ITPM/OTPM, cache-aware ITPM, spend limits, tiers, headers) | B.2 | `2026-09-15-exp-e10-anthropic-rate-limits.md` |
| E11 | Anthropic workspaces (wrkspc_ IDs, per-workspace limits, Claude Code workspace, header) | B.2 | `2026-09-15-exp-e11-anthropic-workspaces.md` |
| E12 | Anthropic identity-backed keys (personal/service/workspace, expiration, WIF, App Attest) | B.2 | `2026-09-15-exp-e12-anthropic-identity-keys.md` |
| E13 | LiteLLM virtual keys/teams/budgets (key CRUD, budgets, rate limits, metadata, model access groups) | B.3 | `2026-09-15-exp-e13-litellm-keys-teams-budgets.md` |
| E14 | Agent identity & attribution headers (MCP, Claude Code settings, per-key attribution) | B.4 | `2026-09-15-exp-e14-agent-identity-headers.md` |
| E15 | Queue management (token bucket, queueing, spend caps, allowlists, fallback combos) | B.5 | `2026-09-15-exp-e15-queue-management.md` |
| E16 | Attribution dimensions ("where from" — app, key, user, machine, task, conversation) | C.1 | `2026-09-15-exp-e16-attribution-dimensions.md` |
| E17 | Routing/control dimensions ("where to" — provider, model, allowlists, budgets, limits, queueing, guardrails, headers) | C.2 | `2026-09-15-exp-e17-routing-control-dimensions.md` |
| E18 | Recommended architecture (Phase 1 attribution, Phase 2 control, Phase 3 teams) | C.3 | `2026-09-15-exp-e18-recommended-architecture.md` |

### From `2026-09-14-keyless-governance-research.md`

| # | Root phrase | Source section | Expansion doc |
|---|-------------|---------------|---------------|
| E19 | Keyless gating option space (10 mechanisms: network, UA, header, profiles, workspaces, guardrails, gates, tags, short-lived tokens, OAuth/device flow) | A | `2026-09-15-exp-e19-keyless-gating.md` |
| E20 | Agent profiles (identity bundle, industry precedents, resolution order, profile→routing) | B | `2026-09-15-exp-e20-agent-profiles.md` |
| E21 | Synthetic & programmatic source tracking (signal inventory, synthetic labels, behavioral fingerprints, prompt-embedding clusters, privacy) | C | `2026-09-15-exp-e21-synthetic-source-tracking.md` |
| E22 | Tag/keyword priority queues (priority models, tag definitions, queue mechanics, interval pacing) | D | `2026-09-15-exp-e22-tag-priority-queues.md` |
| E23 | Model-group limiting (shared upstream limits, group definitions, group budget/queue/cooldown/observability, group vs combo) | E | `2026-09-15-exp-e23-model-group-limiting.md` |
| E24 | Adaptive/predictive rate control (algorithm inventory, AIMD+EWMA+feedback hybrid, budget-proportional pacing, UI) | F | `2026-09-15-exp-e24-adaptive-rate-control.md` |
| E25 | Gate levels (L0–L5 ladder, gate config, why gates) | G | `2026-09-15-exp-e25-gate-levels.md` |
| E26 | Governance architecture synthesis (7-layer model, keyless-first principle) | H | `2026-09-15-exp-e26-governance-architecture.md` |

## Expansion format (per doc)

Each expansion doc contains:

1. **Root phrase** — the phrase from the starting document, with source section.
2. **L1 — sub-phrases discovered** — every phrase in the root that warrants research (typically 4–12).
3. **L2 — sub-sub-phrases** — every phrase in each L1 node (3–10 each).
4. **L3 … L6+** — continuing expansion; each node lists the phrases it spawns and researches each.
5. **Node research** — for every node: codebase grounding (actual file/line), external research (fetched source), or design note (marked as such). 1–3 lines each.
6. **Confidence levels** and **open questions**.
7. **Sources** — URLs and code paths.

Branching is **variable**: a node may have 2, 5, 15, or 50 children depending on how many phrases it contains. The tree is exponential in phrase count, not fixed-branching.

## Status

| Batch | Docs | Status |
|-------|------|--------|
| 1 | E01–E03 | ✅ |
| 2 | E04–E06 | ✅ |
| 3 | E07–E09 | ✅ |
| 4 | E10–E12 | ✅ |
| 5 | E13–E15 | ✅ |
| 6 | E16–E18 | ✅ |
| 7 | E19–E21 | ✅ |
| 8 | E22–E24 | ✅ |
| 9 | E25–E26 | ✅ |