# Governance & Attribution — Doc-by-Doc

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** active
**Tags:** #interpretation #governance #doc-by-doc #index

Plain-language summary of **every** governance/attribution doc: what it is, what it covers, key takeaways, how it fits, what to read next.

---

## Phase 1 — Research & Plans

### `../research/2026-08-31-message-origin-and-destination-research.md`
- **What it is:** The foundational research answering "where do my messages come from / where do they go?"
- **Covers:** Attribution dimensions ("where from" — source app, key, user, session, task type), routing/control dimensions ("where to" — provider, model, allowlists, budgets, limits, queueing, guardrails, headers), industry models (OpenRouter app attribution + guardrails + BYOK, Anthropic workspaces + identity keys, LiteLLM virtual keys/teams/budgets, MCP), existing-codebase inventory, recommended phased architecture (Phase 1 attribution, Phase 2 control, Phase 3 teams).
- **Key takeaways:** Attribution is partially built; control is entirely missing; industry precedents validate the design.
- **How it fits:** The root of everything. Both plans and all expansions derive from this.
- **Read next:** `../planning/2026-08-31-source-app-governance-plan.md`, `../research/2026-09-14-keyless-governance-research.md`.

### `../research/2026-09-14-keyless-governance-research.md`
- **What it is:** The keyless governance research — control without requiring API keys.
- **Covers:** §A keyless gating mechanisms (network gating, UA fingerprint gating, header identity, agent profiles, workspaces, guardrails, gate levels, tag-based allowance, short-lived tokens, OAuth/device flow, hybrid resolution order), §B agent profiles, §C synthetic source tracking, §D tag-priority queues, §E model-group limiting, §F adaptive rate control, §G gate levels L0–L5, §H 7-layer governance architecture.
- **Key takeaways:** Keyless-first is viable; loopback + trusted subnets + profiles can gate without keys.
- **How it fits:** The second root. All keyless expansions derive from this.
- **Read next:** `../planning/2026-09-14-keyless-governance-plan.md`.

### `../planning/2026-08-31-source-app-governance-plan.md`
- **What it is:** Phased implementation plan for attribution + control.
- **Covers:** M1 attribution & observability, M2 per-key/per-app rate limits, M3 queue management, M4 profile/identity routing, M5 guardrails, M6 credentials, M7 agent identity.
- **Key takeaways:** 7 milestones, each independently testable.
- **How it fits:** The "where from/where to" plan.
- **Read next:** `../planning/2026-09-14-keyless-governance-plan.md`.

### `../planning/2026-09-14-keyless-governance-plan.md`
- **What it is:** Phased implementation plan for keyless governance.
- **Covers:** M1 agent profiles, M2 synthetic source tracking, M3 tag/priority queues, M4 gate levels, M5 model-group limiting, M6 adaptive rate control, M7 unified governance dashboard.
- **Key takeaways:** 7 milestones, each independently testable.
- **How it fits:** The keyless plan.
- **Read next:** `../planning/2026-09-15-governance-implementation-plan.md` (code-bearing).

---

## Phase 2 — 2-Way Binary Tree Expansion

### `../research/2026-09-15-master-research-tree.md`
- **What it is:** Master map of the 2-way binary tree.
- **Covers:** 63 nodes, 16 Level-3 branches, status table.
- **Key takeaways:** Every governance finding expanded 2-way × 6 levels.
- **Read next:** the 16 branch docs.

### `../research/2026-09-15-branch-a1a-ua-fingerprinting.md`
- **What it is:** Branch A1a — UA fingerprinting.
- **Covers:** UA_RULES ordering, most-specific-first, 300-char cap, DEFAULT_APP, addSourceAppRule.
- **Key takeaways:** The rule engine is the foundation of attribution.
- **Read next:** `../research/2026-09-15-branch-a1b-header-network-identity.md`.

### `../research/2026-09-15-branch-a1b-header-network-identity.md`
- **What it is:** Branch A1b — header + network identity.
- **Covers:** X-9R-App/User/Session headers, post-auth trust, loopback/subnet trust, custom-server IP derivation.
- **Key takeaways:** Trust model: key auth → trusted subnet → loopback → default.
- **Read next:** `../research/2026-09-15-branch-a2a-synthetic-labels.md`.

### `../research/2026-09-15-branch-a2a-synthetic-labels.md`
- **What it is:** Branch A2a — synthetic labels.
- **Covers:** hash(uaClass + ipPrefix + sessionId), FNV-1a, salt, hash-only privacy.
- **Key takeaways:** Stable source labels without storing raw inputs.
- **Read next:** `../research/2026-09-15-branch-a2b-behavioral-fingerprints.md`.

### `../research/2026-09-15-branch-a2b-behavioral-fingerprints.md`
- **What it is:** Branch A2b — behavioral fingerprints.
- **Covers:** Request cadence, token patterns, model mix, time-of-day, tool usage.
- **Key takeaways:** Cluster requests into "agents" without identity cooperation.
- **Read next:** `../research/2026-09-15-branch-b1a-static-rate-limits.md`.

### `../research/2026-09-15-branch-b1a-static-rate-limits.md`
- **What it is:** Branch B1a — static rate limits.
- **Covers:** Token bucket, per-key RPM/TPM, per-app RPM, x-ratelimit-* headers.
- **Key takeaways:** Extend the per-IP limiter to per-key/per-app.
- **Read next:** `../research/2026-09-15-branch-b1b-adaptive-rate-control.md`.

### `../research/2026-09-15-branch-b1b-adaptive-rate-control.md`
- **What it is:** Branch B1b — adaptive rate control.
- **Covers:** AIMD, EWMA, 429 feedback, budget-proportional pacing.
- **Key takeaways:** Rate adapts to upstream signals.
- **Read next:** `../research/2026-09-15-branch-b2a-priority-queues.md`.

### `../research/2026-09-15-branch-b2a-priority-queues.md`
- **What it is:** Branch B2a — priority queues.
- **Covers:** Strict priority, WFQ, aging, bounded FIFO, TTL, backpressure.
- **Key takeaways:** Queue instead of hard 429 when opted in.
- **Read next:** `../research/2026-09-15-branch-b2b-interval-pacing.md`.

### `../research/2026-09-15-branch-b2b-interval-pacing.md`
- **What it is:** Branch B2b — interval pacing.
- **Covers:** Leaky bucket, interval ms, burst capacity.
- **Key takeaways:** Smooth upstream load.
- **Read next:** `../research/2026-09-15-branch-b3a-model-group-definitions.md`.

### `../research/2026-09-15-branch-b3a-model-group-definitions.md`
- **What it is:** Branch B3a — model-group definitions.
- **Covers:** Prefix auto-derive (qwen-*), explicit lists, group map.
- **Key takeaways:** Group models share budgets.
- **Read next:** `../research/2026-09-15-branch-b3b-model-group-observability.md`.

### `../research/2026-09-15-branch-b3b-model-group-observability.md`
- **What it is:** Branch B3b — model-group observability.
- **Covers:** model_group field in usage, per-group throughput, 429 counts.
- **Key takeaways:** LiteLLM precedent for model_group.
- **Read next:** `../research/2026-09-15-branch-b4a-content-guardrails.md`.

### `../research/2026-09-15-branch-b4a-content-guardrails.md`
- **What it is:** Branch B4a — content guardrails.
- **Covers:** PII redact/block, prompt-injection detection, regex content filters.
- **Key takeaways:** OpenRouter guardrail hierarchy precedent.
- **Read next:** `../research/2026-09-15-branch-b4b-budget-guardrails.md`.

### `../research/2026-09-15-branch-b4b-budget-guardrails.md`
- **What it is:** Branch B4b — budget guardrails.
- **Covers:** Per-key USD budgets, soft/hard caps, daily/weekly/monthly reset.
- **Key takeaways:** Budget-proportional pacing formula.
- **Read next:** `../research/2026-09-15-branch-b5a-key-lifecycle.md`.

### `../research/2026-09-15-branch-b5a-key-lifecycle.md`
- **What it is:** Branch B5a — key lifecycle.
- **Covers:** Creation, rotation, expiry, revocation, key metadata.
- **Key takeaways:** Keys are the strongest identity for control.
- **Read next:** `../research/2026-09-15-branch-b5b-alternative-auth.md`.

### `../research/2026-09-15-branch-b5b-alternative-auth.md`
- **What it is:** Branch B5b — alternative auth.
- **Covers:** OAuth/device flow, short-lived tokens, mTLS (future).
- **Key takeaways:** Keyless alternatives exist but are future scope.
- **Read next:** `../research/2026-09-15-branch-b6a-cooperative-identity.md`.

### `../research/2026-09-15-branch-b6a-cooperative-identity.md`
- **What it is:** Branch B6a — cooperative identity.
- **Covers:** Trusted headers, agent cooperation, MCP identity gap.
- **Key takeaways:** Cooperative identity requires trust.
- **Read next:** `../research/2026-09-15-branch-b6b-behavioral-identity.md`.

### `../research/2026-09-15-branch-b6b-behavioral-identity.md`
- **What it is:** Branch B6b — behavioral identity.
- **Covers:** Behavioral fingerprints as identity, clustering.
- **Key takeaways:** Identity without cooperation is fuzzy but useful.
- **Read next:** `../research/2026-09-15-master-topic-index.md`.

---

## Phase 3 — Per-Topic Binary Trees

### `../research/2026-09-15-master-topic-index.md`
- **What it is:** Index of 26 per-topic trees.
- **Covers:** T1–T26 → tree docs, 9 batches, all ✅.
- **Key takeaways:** Each topic has its own full 127-node tree.
- **Read next:** the 26 tree docs.

### `../research/2026-09-15-tree-t01-*.md` … `t26-*.md`
- **What it is:** 26 per-topic binary trees.
- **Covers:** T1 source-app fingerprinting, T2 task classification, T3 inbound rate limiter, T4 auth & API keys, T5 usage/logs, T6 persistence (SQLite), T7 OpenRouter app attribution, T8 OpenRouter guardrails, T9 OpenRouter BYOK, T10 Anthropic rate limits, T11 Anthropic workspaces, T12 Anthropic identity keys, T13 LiteLLM keys/teams/budgets, T14 agent identity headers, T15 queue management, T16 attribution dimensions, T17 routing/control dimensions, T18 recommended architecture, T19 keyless gating, T20 agent profiles, T21 synthetic source tracking, T22 tag priority queues, T23 model-group limiting, T24 adaptive rate control, T25 gate levels, T26 governance architecture.
- **Key takeaways:** Each tree is a self-contained deep dive.
- **Read next:** the corresponding expansion doc.

---

## Phase 4 — True Exponential N-ary Expansion

### `../research/2026-09-15-exponential-master-map.md`
- **What it is:** Master map of the N-ary expansion.
- **Covers:** 26 roots E01–E26, methodology, 9 batches.
- **Key takeaways:** Every phrase is a root; N children per node; ≥6 levels.
- **Read next:** the 26 expansion docs.

### `../research/2026-09-15-exp-e01-*.md` … `e26-*.md`
- **What it is:** 26 expansion docs.
- **Covers:** E01 source-app fingerprinting … E26 governance architecture (each ≥6 levels, variable branching).
- **Key takeaways:** The deepest research layer; per-node research, confidence, open questions, sources.
- **Read next:** `2026-09-15-governance-synthesis.md`.

---

## Phase 5 — Interpretation Layer

### `2026-09-15-governance-interpretation-guide.md`
- **What it is:** The one-page-to-understand-everything.
- **Covers:** Intent, 5 phases, complete doc map, key conclusions, reading order, next steps.
- **Read next:** `2026-09-15-governance-doc-by-doc.md`.

### `2026-09-15-governance-doc-by-doc.md`
- **What it is:** This doc — plain-language summary of every governance doc.
- **Read next:** `2026-09-15-governance-synthesis.md`.

### `2026-09-15-governance-synthesis.md`
- **What it is:** The distilled knowledge.
- **Covers:** Verdict, key findings, recommended architecture, design decisions, open questions.
- **Read next:** `2026-09-15-governance-order-and-next-steps.md`.

### `2026-09-15-governance-order-and-next-steps.md`
- **What it is:** The order of everything.
- **Covers:** Timeline, reading order, build order, deferred items.
- **Read next:** `../planning/2026-09-15-governance-implementation-plan.md`.