# Governance & Attribution — Interpretation Guide

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** active
**Tags:** #interpretation #governance #attribution #guide #index #synthesis

---

## The One-Page Summary

**Question asked:** *"Where do my messages come from, and where do they go?"* — then expanded: *"give me keyless governance — control and gate requests via agent profiles, gate levels, guardrails, tag/keyword priority queues, and model-group limiting with adaptive rate control, while tracking where messages come from programmatically and synthetically."*

**Verdict:** 9router already has the **foundation** (source-app fingerprinting, smart-router task classification, inbound rate limiter, API keys, usage/logs, SQLite persistence) but **none of the governance layer** (profiles, gates, tags, queues, model groups, adaptive rate, budgets, allowlists). The research maps exactly what to build and where.

**What was built (docs only, no code):** 70+ documents across 5 phases, additive (nothing removed):

| Phase | What | Docs | Scale |
|-------|------|------|-------|
| 1 | Flat deep research (origin + destination, keyless governance) | 2 research docs + 2 plans | 2 research docs, 14 milestones |
| 2 | 2-way binary tree expansion (recursive: each finding → 2 children × 6 levels) | 1 master tree + 16 branch docs | 63 nodes, 16 Level-3 branches |
| 3 | Per-topic binary trees (each topic = own 6-level tree) | 1 master topic index + 26 tree docs | 26 trees × 127 nodes |
| 4 | True exponential N-ary expansion (every phrase = root, N children, 6 levels) | 1 exponential master map + 26 expansion docs | 26 roots, thousands of enumerated nodes |
| 5 | Interpretation layer (this doc + 3 more) | 4 docs | You are here |

**Recommended architecture (from research):** A **7-layer governance model** — Identity → Gate → Policy → Queue → Rate → Routing → Observability — with a **keyless-first principle** (loopback and trusted subnets are trusted; keys are optional for control, not required for access).

**Implementation plan (7 milestones, deferred):** M1 agent profiles → M2 synthetic source tracking → M3 tag/priority queues → M4 gate levels → M5 model-group limiting → M6 adaptive rate control → M7 unified governance dashboard. A code-bearing implementation plan exists at `../planning/2026-09-15-governance-implementation-plan.md`.

---

## The 5 Phases of Work (Chronological)

### Phase 1 — Flat Deep Research + Plans
**User asked:** "where do my messages come from / where do they go" → then "keyless governance"

| Doc | Purpose | Key content |
|-----|---------|-------------|
| `../research/2026-08-31-message-origin-and-destination-research.md` | The foundational research | Attribution dimensions ("where from"), routing/control dimensions ("where to"), industry models (OpenRouter/Anthropic/LiteLLM/MCP), codebase inventory, recommended phased architecture |
| `../research/2026-09-14-keyless-governance-research.md` | The keyless governance research | Agent profiles, synthetic source tracking, tag/keyword priority queues, gate levels L0–L5, model-group limiting, adaptive/predictive rate control |
| `../planning/2026-08-31-source-app-governance-plan.md` | Phased implementation plan | M1–M7: attribution, per-key limits, queue, profile routing, guardrails, credentials, agent identity |
| `../planning/2026-09-14-keyless-governance-plan.md` | Phased implementation plan | M1–M7: profiles, synthetic tracking, tag queues, gates, model groups, adaptive rate, dashboard |

### Phase 2 — 2-Way Binary Tree Expansion
**User clarified:** "binary tree = recursive expansion: each finding branches into 2 sub-topics × 6 levels (63 nodes per root)"

| Doc | Purpose | Key content |
|-----|---------|-------------|
| `../research/2026-09-15-master-research-tree.md` | Master map of the 2-way tree | 63 nodes, 16 Level-3 branches, status table |
| `../research/2026-09-15-branch-a1a-ua-fingerprinting.md` | Branch A1a | UA fingerprinting rules, ordering, privacy |
| `../research/2026-09-15-branch-a1b-header-network-identity.md` | Branch A1b | Header + network identity, trust model |
| `../research/2026-09-15-branch-a2a-synthetic-labels.md` | Branch A2a | Synthetic labels, hash-only privacy |
| `../research/2026-09-15-branch-a2b-behavioral-fingerprints.md` | Branch A2b | Behavioral fingerprints, clustering |
| `../research/2026-09-15-branch-b1a-static-rate-limits.md` | Branch B1a | Static rate limits, token bucket |
| `../research/2026-09-15-branch-b1b-adaptive-rate-control.md` | Branch B1b | AIMD/EWMA adaptive rate control |
| `../research/2026-09-15-branch-b2a-priority-queues.md` | Branch B2a | Priority queues, WFQ, aging |
| `../research/2026-09-15-branch-b2b-interval-pacing.md` | Branch B2b | Interval pacing, leaky bucket |
| `../research/2026-09-15-branch-b3a-model-group-definitions.md` | Branch B3a | Model-group definitions, auto-derive |
| `../research/2026-09-15-branch-b3b-model-group-observability.md` | Branch B3b | model_group observability |
| `../research/2026-09-15-branch-b4a-content-guardrails.md` | Branch B4a | PII/injection/content guardrails |
| `../research/2026-09-15-branch-b4b-budget-guardrails.md` | Branch B4b | Budget guardrails, soft/hard caps |
| `../research/2026-09-15-branch-b5a-key-lifecycle.md` | Branch B5a | Key lifecycle, rotation, expiry |
| `../research/2026-09-15-branch-b5b-alternative-auth.md` | Branch B5b | Alternative auth, OAuth/device flow |
| `../research/2026-09-15-branch-b6a-cooperative-identity.md` | Branch B6a | Cooperative identity, headers |
| `../research/2026-09-15-branch-b6b-behavioral-identity.md` | Branch B6b | Behavioral identity, fingerprints |

### Phase 3 — Per-Topic Binary Trees
**User clarified:** "each topic gets its own full 6-level binary tree (127 nodes), not one shared tree"

| Doc | Purpose | Key content |
|-----|---------|-------------|
| `../research/2026-09-15-master-topic-index.md` | Index of 26 per-topic trees | T1–T26 → tree docs, 9 batches, all ✅ |
| `../research/2026-09-15-tree-t01-*.md` … `t26-*.md` | 26 per-topic trees | T1 source-app fingerprinting … T26 governance architecture (each 127 nodes) |

### Phase 4 — True Exponential N-ary Expansion
**User clarified:** "every phrase in the source docs is a root, each branches N-ary (hundreds per level possible), 6 levels deep — exponential, not 1→2→4→8"

| Doc | Purpose | Roots covered |
|-----|---------|---------------|
| `../research/2026-09-15-exponential-master-map.md` | Master map of N-ary expansion | 26 roots E01–E26, methodology, 9 batches |
| `../research/2026-09-15-exp-e01-*.md` … `e26-*.md` | 26 expansion docs | E01 source-app fingerprinting … E26 governance architecture (each ≥6 levels, variable branching) |

### Phase 5 — Interpretation Layer (This Work)
**User asked:** "make sure that all the documents have been interpreted"

| Doc | Purpose |
|-----|---------|
| `./2026-09-15-governance-interpretation-guide.md` | **This doc** — one-page summary, 5 phases, complete doc map, key conclusions, reading order |
| `./2026-09-15-governance-doc-by-doc.md` | Plain-language summary of every governance doc |
| `./2026-09-15-governance-synthesis.md` | The distilled knowledge: verdict, key findings, recommended architecture, design decisions, open questions |
| `./2026-09-15-governance-order-and-next-steps.md` | The order of everything: timeline, reading order, build order, deferred items |

---

## Key Conclusions

1. **Attribution is mostly built.** `sourceApps.js` (24 UA rules), smart-router task classification, usage capture, and SQLite persistence already answer "where from" at the app level. What's missing: trusted identity headers, key metadata, and a Sources dashboard view.
2. **Control is entirely missing.** No per-key limits, budgets, allowlists, queues, gates, or guardrails exist today. The rate limiter is per-IP only.
3. **Keyless-first is viable.** Loopback + trusted subnets + UA fingerprinting + agent profiles can gate requests without keys; keys remain the strongest identity for control.
4. **Industry precedents are clear.** OpenRouter (app attribution, guardrails, BYOK), Anthropic (workspaces, identity-backed keys, tier limits), LiteLLM (virtual keys, teams, budgets, model groups) all validate the design.
5. **Privacy is preserved by design.** Hash-only synthetic labels (`hash(uaClass + ipPrefix + sessionId)`), never storing raw UAs, and prefix-only IPs.

## Reading Order

1. `2026-09-15-governance-interpretation-guide.md` (this doc)
2. `2026-09-15-governance-doc-by-doc.md`
3. `2026-09-15-governance-synthesis.md`
4. `2026-09-15-governance-order-and-next-steps.md`
5. `../research/2026-08-31-message-origin-and-destination-research.md`
6. `../research/2026-09-14-keyless-governance-research.md`
7. `../planning/2026-09-15-governance-implementation-plan.md` (code-bearing)

## Next Steps

- Review the code-bearing implementation plan (`../planning/2026-09-15-governance-implementation-plan.md`)
- Decide milestone order (M1 attribution first — it's the foundation)
- Implementation is deferred — awaiting user go-ahead