# TASK-LOG — Smart Router & Observability Session

## 2026-09-17 15:57 — Shared-worktree rule + branch reconciliation (v3)

- [x] Create shared card worktree 9router-wt-cards (branch card-work-v3) from v3
- [x] Update GIT-BRANCH-POLICY.md with shared-worktree rule; commit on v3
- [x] Inject SHARED-WORKTREE block into all 13 open card bodies + 3 board descriptions
- [x] Update hermesResearch/V3 mirror + agent memory
- [x] Merge BUG-ERR-02 stranded work (a236b6b3) into v3
- [x] Merge pr-3610, pr-3625, feat/multi-protocol-custom-providers into v3
- [x] Merge pr3604-review with conflict resolution (SCHEMA_VERSION 3 + both features, migration 005)
- [ ] Run full test suite on v3 (QA gate) — IN PROGRESS
- [ ] Verify app functional check (headless/curl) on v3
- [ ] Update card t_bfabba37 (BUG-ERR-02) result with merge evidence


**Date:** 2026-08-05 → 2026-08-06
**Author:** GitHub Copilot agent (main session)
**Status:** active
**Tags:** task-log, session

---

## Newly Completed (2026-09-16) — Hermes Message Import Research + Deep-Research Skills

## 2026-09-16 — Card QA gate enforced (self-verification)

| Task | Status |
|------|--------|
| QA gate block (`CARD-QA-GATE-START`) injected into all open card bodies (9router board) | ✅ |
| QA gate added to board descriptions of 9router + 9router-mcp-hub-kanban + 9router-mcp-hub-skills | ✅ |
| QA gate written into `tracking/GIT-BRANCH-POLICY.md` | ✅ |
| Audit of last 130 completed cards for QA evidence in `result`: 3 with, 127 without | ✅ (gap recorded) |
| Test suite actually run on `v3`: 76 failures / 29 files (baseline documented, pre-existing) | ✅ |
| Live app functional check via headless browser on `:20127` | ✅ |

## 2026-09-16 — v3 branch policy: recorded and enforced across all 9router kanban boards

| Task | Status |
|------|--------|
| Policy written: `tracking/GIT-BRANCH-POLICY.md` + `tracking/decisions/ADR-011-v3-branch-isolation.md` | ✅ |
| Branch `v3` created from `v2` tip (`d7a9ee5d`), repo now checked out on `v3` | ✅ |
| Policy committed to `v3` (`75268083`) — v2 byte-identical afterward (`d7a9ee5d` untouched) | ✅ |
| Completed-card audit (last 24h/48h/7d) on `9router`, `9router-mcp-hub-kanban`, `9router-mcp-hub-skills` boards → reports in `~/Documents/hermesResearch/9router/V3/` | ✅ |
| Board descriptions updated on `9router`, `9router-mcp-hub-kanban`, `9router-mcp-hub-skills` with the `BRANCH-RULE` block | ✅ |
| All 13 open cards on `9router` board body-appended with the `BRANCH-RULE` block | ✅ |
| Discord delivery to thread 1544031399110119588 | ✅ |

### Still open (per policy)
- 13 blocked cards on `9router` board — resume only on `v3`.
- Reconcile `pr-3610` / `pr-3625` / `feat/multi-protocol-custom-providers` INTO `v3` (explicit decision).
- The 3 MCP-hub boards carry zero open repo-building work; only informational.

User directive: *"import all the message requests from hermes agents... there has to be a log of all the message requests and what they looked like to and from the provider... match it up with current providers based on the name of the models... even if I didn't initially go through 9router, I could still record and figure out the codes, the messages, the errors and everything as though it did go through 9router... use all skills and deep research everything possible and utilize that 6 branch node binary tree like research model... learn about this research method and learn about all the different ways it was carried out then pull all that information together to create a skill."*

### Research method learned (from chat logs, last 24h)

| Variant | Source session | What it is |
|---------|---------------|-----------|
| Strict 6-level binary tree (127 nodes/root) | `9c7ce4ab`, `2576d9f0` | Every finding branches into 2 sub-topics × 6 levels; min 5 searches/node; verbatim recording |
| Exponential phrase expansion | `2576d9f0` turn 7, `5de9578b` turn 9 | Every phrase at a level becomes a node; variable branching (3–50 children); 6+ levels deep |
| Corpus flat expansion (depth-5) | `9c7ce4ab` turn 1 | 3,804 real docs, 19,020 searches, 1,538 unique terms |
| Multi-subagent research | `4de22f61` | 5 parallel agents, retry on provider failure |

### Deliverables

| Artifact | Status |
|----------|--------|
| `skills/9router-research/SKILL.md` — combined deep-research skill (reap + seek + binary tree + message import) | ✅ |
| `skills/9router-message-import/SKILL.md` — message import feature skill | ✅ |
| `skills/README.md` — updated with both new skills | ✅ |
| `research/2026-09-16-hermes-message-import-research.md` — research note | ✅ |
| `tracking/CHANGELOG.md` — entry added | ✅ |

### Still open (documented, deferred)

- Implement `imported_messages` table + migration
- Implement `importedMessagesRepo.js`
- Implement `/api/messages/import` POST endpoint
- Implement matcher/normalizer/error-reconstructor
- Wire into `usageDb.js` unified queries
- Update Messages page with `source` filter
- Add Hermes hook config
- Tests

## Newly Completed (2026-09-15) — Interpretation Layer + Code-Bearing Implementation Plans (all 36 research impl-plans + 5 feature-area plans)

User directive: *"then clean up the goal and continue your work and make sure that all the documents have been interpreted and that you have put all tasks and implementation work (meaning if you have not create all sorts of different implementation plans, no matter if we ended up making ones that overlap then you need to make sure that you create those implementation plans all the way to the point that we even have code for in the implementation plan and making sure that it is mentioned for agents that read those plans that this code is for the agent to review and make decision for if there are better ways to implement and make those changes happen)."*

### Interpretation layer (3 topics, 12 docs)

| Topic | Docs | Status |
|-------|------|--------|
| Webhook receive & act | guide, doc-by-doc, synthesis, order-and-next-steps | ✅ |
| Keyless governance | guide, doc-by-doc, synthesis, order-and-next-steps | ✅ |
| Message capture/filtering | guide, doc-by-doc, synthesis, order-and-next-steps | ✅ |

All in `interpretation/`. Every doc links back to its source research with relative paths.

### Code-bearing implementation plans

Every plan contains the **Note to implementing agents (READ FIRST)**: the reference code is a starting point for review, not a final implementation — agents MUST review it against the actual codebase, decide if there is a better way, make those changes happen, verify by running, and update the plan. Overlap between plans is intentional per user directive.

**Feature-area plans (5):**

| Plan | Covers |
|------|--------|
| `planning/2026-09-15-governance-implementation-plan.md` | Keyless governance (M1–M7) |
| `planning/2026-09-15-webhook-implementation-plan.md` | Webhook receive & act (M1–M5) |
| `planning/2026-09-15-message-driven-tools-implementation-plan.md` | Message capture/filtering (M1–M6) |
| `planning/2026-09-15-context-window-hybrid-combo-implementation-plan.md` | Context-window combo (M1–M5) |
| `planning/2026-09-15-smart-router-observability-remaining-implementation-plan.md` | Smart router observability remaining (M3–M4) |

**Research impl-plan code versions (36):** `planning/2026-09-15-impl-plan-01-learned-routing-code.md` through `planning/2026-09-15-impl-plan-36-model-comparison-leaderboard-code.md` — every one of the 36 design-level research impl-plans now has a code-bearing counterpart with reference JS code (repos, migrations, services, routes, dashboard pages, tests), dependencies/risks table, and verification steps.

**Status:** All interpretation + planning docs complete. Code implementation deferred — awaiting user go-ahead.

---

## Newly Completed (2026-09-15) — Webhook Implementation Plans, Full Coverage (29 code-level plans)

User directive: *"did you make an implementation plan for every single option that was found and layer for things that could be an option for 9router to do? if not do that now"* — every research root (R01–R48) must have a plan. 21 new plans added on top of the original 8, covering all 48 roots.

Every plan contains an **AGENT REVIEW NOTE** (verbatim): the code is a starting point, not a final decision — every agent that reads the plan MUST review the code, decide if there is a better way, make those changes happen, and proceed.

| # | Plan | Roots covered | Status |
|---|------|---------------|--------|
| P1 | `planning/2026-09-15-webhook-m1-receiver-hmac-plan.md` | R01–R08 | ✅ |
| P2 | `planning/2026-09-15-webhook-m2-outbox-worker-plan.md` | R09–R11 | ✅ |
| P3 | `planning/2026-09-15-webhook-m3-rule-engine-actions-plan.md` | R12–R14, R36 | ✅ |
| P4 | `planning/2026-09-15-webhook-m4-outbound-triggers-plan.md` | R21–R24 | ✅ |
| P5 | `planning/2026-09-15-webhook-m5-dashboard-ui-plan.md` | — | ✅ |
| P6 | `planning/2026-09-15-webhook-messaging-platforms-plan.md` | R15–R17 | ✅ |
| P7 | `planning/2026-09-15-webhook-push-services-plan.md` | R18–R19 | ✅ |
| P8 | `planning/2026-09-15-webhook-standards-compliance-plan.md` | R28 | ✅ |
| P9 | `planning/2026-09-15-webhook-dead-mans-switch-plan.md` | R25 | ✅ |
| P10 | `planning/2026-09-15-webhook-stripe-model-plan.md` | R26 | ✅ |
| P11 | `planning/2026-09-15-webhook-github-model-plan.md` | R27 | ✅ |
| P12 | `planning/2026-09-15-webhook-hookdeck-ingress-plan.md` | R29 | ✅ |
| P13 | `planning/2026-09-15-webhook-apprise-adapter-plan.md` | R20 | ✅ |
| P14 | `planning/2026-09-15-webhook-pubsub-core-plan.md` | R30 | ✅ |
| P15 | `planning/2026-09-15-webhook-message-queue-plan.md` | R32 | ✅ |
| P16 | `planning/2026-09-15-webhook-sse-feed-plan.md` | R33 | ✅ |
| P17 | `planning/2026-09-15-webhook-websocket-feed-plan.md` | R34 | ✅ |
| P18 | `planning/2026-09-15-webhook-long-polling-plan.md` | R35 | ✅ |
| P19 | `planning/2026-09-15-webhook-n8n-workflows-plan.md` | R37 | ✅ |
| P20 | `planning/2026-09-15-webhook-nodered-flows-plan.md` | R38 | ✅ |
| P21 | `planning/2026-09-15-webhook-pipedream-steps-plan.md` | R39 | ✅ |
| P22 | `planning/2026-09-15-webhook-huginn-agents-plan.md` | R40 | ✅ |
| P23 | `planning/2026-09-15-webhook-inngest-functions-plan.md` | R41 | ✅ |
| P24 | `planning/2026-09-15-webhook-litellm-alerts-plan.md` | R42 | ✅ |
| P25 | `planning/2026-09-15-webhook-oneapi-metrics-plan.md` | R43 | ✅ |
| P26 | `planning/2026-09-15-webhook-helicone-observability-plan.md` | R44 | ✅ |
| P27 | `planning/2026-09-15-webhook-uptime-kuma-plan.md` | R45 | ✅ |
| P28 | `planning/2026-09-15-webhook-healthchecks-io-plan.md` | R46 | ✅ |
| P29 | `planning/2026-09-15-webhook-http-client-plan.md` | R47–R48 | ✅ |

All 48 research roots (R01–R48) now have at least one implementation plan. Deferred (documented, not started): all implementation work — awaiting user go-ahead.

## Newly Completed (2026-09-15) — Webhook Implementation Plans (8 plans, code-level, agent-review notes)

User directive: *"create all sorts of different implementation plans, no matter if we ended up making ones that overlap … all the way to the point that we even have code for in the implementation plan and making sure that it is mentioned for agents that read those plans that this code is for the agent to review and make decision for if there are better ways to implement and make those changes happen."*

Every plan contains an **AGENT REVIEW NOTE** (verbatim): the code is a starting point, not a final decision — every agent that reads the plan MUST review the code, decide if there is a better way, make those changes happen, and proceed.

| # | Plan | Code included | Status |
|---|------|---------------|--------|
| P1 | `planning/2026-09-15-webhook-m1-receiver-hmac-plan.md` | `src/lib/webhooks/verify.js`, `registry.js`, `src/app/api/webhooks/[id]/route.js`, settingsRepo `webhooks: []` | ✅ |
| P2 | `planning/2026-09-15-webhook-m2-outbox-worker-plan.md` | migration `005-webhook-events.js`, `webhookEventsRepo.js`, `worker.js`, instrumentation wiring | ✅ |
| P3 | `planning/2026-09-15-webhook-m3-rule-engine-actions-plan.md` | `rules.js` (TCA), actions: notify/http/llm/gateway/dashboard, settingsRepo `webhookRules` + `notifyUrls` | ✅ |
| P4 | `planning/2026-09-15-webhook-m4-outbound-triggers-plan.md` | `emitter.js`, quotaAutoPing/chatCore/modelCatalog wiring, `digest.js`, settingsRepo `webhookDigest` | ✅ |
| P5 | `planning/2026-09-15-webhook-m5-dashboard-ui-plan.md` | dashboard pages, `WebhookForm`/`RuleEditor`/`EventTable`, events API route | ✅ |
| P6 | `planning/2026-09-15-webhook-messaging-platforms-plan.md` | Slack/Discord/Telegram modules, shared formatter | ✅ |
| P7 | `planning/2026-09-15-webhook-push-services-plan.md` | ntfy/Gotify/Pushover modules | ✅ |
| P8 | `planning/2026-09-15-webhook-standards-compliance-plan.md` | Svix header aliases, outbound signing, Zapier envelope | ✅ |

Deferred (documented, not started): all implementation work — awaiting user go-ahead.

## Newly Completed (2026-09-15) — Exponential Phrase-Level Expansion (26 docs, docs only, no code)

User clarification: *"you are making sure that for everything that you research from one document … for every phrase that you decide i want to learn more about in that document that for each of those phrases you go at least 6 levels deep and for each level you may find hundreds of more phrases you want to research and then you will go and research each of those … so it would be exponential not just a 1 to 2 to 4 to 8 etc kind of research tree."* Every phrase in the two governance research docs is a root; each root expands ≥6 levels deep with **variable (N-ary) branching** — not capped at 2 children per node. Additive — the shared master tree, 16 branch docs, and 26 per-topic binary trees are all kept.

Index: `../research/2026-09-15-exponential-master-map.md`.
Expansion docs: `../research/2026-09-15-exp-e*.md` (26 docs, one per root).

| # | Root (from source doc) | Expansion doc | Status |
|---|------------------------|---------------|--------|
| E01 | Source-app fingerprinting (`sourceApps.js`) | `2026-09-15-exp-e01-source-app-fingerprinting.md` | ✅ |
| E02 | Smart router task classification | `2026-09-15-exp-e02-task-classification.md` | ✅ |
| E03 | Inbound rate limiter | `2026-09-15-exp-e03-inbound-rate-limiter.md` | ✅ |
| E04 | Auth & API keys | `2026-09-15-exp-e04-auth-api-keys.md` | ✅ |
| E05 | Usage/logs | `2026-09-15-exp-e05-usage-logs.md` | ✅ |
| E06 | Persistence (SQLite layer) | `2026-09-15-exp-e06-persistence-sqlite.md` | ✅ |
| E07 | OpenRouter app attribution | `2026-09-15-exp-e07-openrouter-app-attribution.md` | ✅ |
| E08 | OpenRouter guardrails | `2026-09-15-exp-e08-openrouter-guardrails.md` | ✅ |
| E09 | OpenRouter BYOK | `2026-09-15-exp-e09-openrouter-byok.md` | ✅ |
| E10 | Anthropic rate limits | `2026-09-15-exp-e10-anthropic-rate-limits.md` | ✅ |
| E11 | Anthropic workspaces | `2026-09-15-exp-e11-anthropic-workspaces.md` | ✅ |
| E12 | Anthropic identity-backed keys | `2026-09-15-exp-e12-anthropic-identity-keys.md` | ✅ |
| E13 | LiteLLM virtual keys/teams/budgets | `2026-09-15-exp-e13-litellm-keys-teams-budgets.md` | ✅ |
| E14 | Agent identity & attribution headers | `2026-09-15-exp-e14-agent-identity-headers.md` | ✅ |
| E15 | Queue management | `2026-09-15-exp-e15-queue-management.md` | ✅ |
| E16 | Attribution dimensions ("where from") | `2026-09-15-exp-e16-attribution-dimensions.md` | ✅ |
| E17 | Routing/control dimensions ("where to") | `2026-09-15-exp-e17-routing-control-dimensions.md` | ✅ |
| E18 | Recommended architecture (phases) | `2026-09-15-exp-e18-recommended-architecture.md` | ✅ |
| E19 | Keyless gating mechanisms | `2026-09-15-exp-e19-keyless-gating.md` | ✅ |
| E20 | Agent profiles | `2026-09-15-exp-e20-agent-profiles.md` | ✅ |
| E21 | Synthetic source tracking | `2026-09-15-exp-e21-synthetic-source-tracking.md` | ✅ |
| E22 | Tag-priority queues | `2026-09-15-exp-e22-tag-priority-queues.md` | ✅ |
| E23 | Model-group limiting | `2026-09-15-exp-e23-model-group-limiting.md` | ✅ |
| E24 | Adaptive rate control | `2026-09-15-exp-e24-adaptive-rate-control.md` | ✅ |
| E25 | Gate levels (L0–L5) | `2026-09-15-exp-e25-gate-levels.md` | ✅ |
| E26 | Governance architecture (7-layer) | `2026-09-15-exp-e26-governance-architecture.md` | ✅ |
| — | Exponential master map (26 roots → expansion docs, 9 batches) | `2026-09-15-exponential-master-map.md` | ✅ |

Deferred (documented, not started): all implementation work — awaiting user go-ahead.

## Newly Completed (2026-09-15) — Per-Topic Binary-Tree Expansion (26 trees, docs only, no code)

User clarification: *"when i said binary tree all i meant was that each research or phrase or thing that you research from a document must go a minimum of 6 times deep worth of research and that expands into a crazy exponential amount of work."* Each topic therefore gets its **own** full 6-level binary tree (L0 → L6, 127 nodes), not one shared tree. Additive — the shared master tree and its 16 branch docs are kept.

Index: `../research/2026-09-15-master-topic-index.md`.
Tree docs: `../research/2026-09-15-tree-t*.md` (26 docs, one per topic).

| # | Topic | Tree doc | Status |
|---|-------|----------|--------|
| T1 | Source-app fingerprinting (`sourceApps.js`) | `2026-09-15-tree-t01-source-app-fingerprinting.md` | ✅ |
| T2 | Smart router task classification | `2026-09-15-tree-t02-task-classification.md` | ✅ |
| T3 | Inbound rate limiter | `2026-09-15-tree-t03-inbound-rate-limiter.md` | ✅ |
| T4 | Auth & API keys | `2026-09-15-tree-t04-auth-api-keys.md` | ✅ |
| T5 | Usage/logs | `2026-09-15-tree-t05-usage-logs.md` | ✅ |
| T6 | Persistence (SQLite layer) | `2026-09-15-tree-t06-persistence-sqlite.md` | ✅ |
| T7 | OpenRouter app attribution | `2026-09-15-tree-t07-openrouter-app-attribution.md` | ✅ |
| T8 | OpenRouter guardrails | `2026-09-15-tree-t08-openrouter-guardrails.md` | ✅ |
| T9 | OpenRouter BYOK | `2026-09-15-tree-t09-openrouter-byok.md` | ✅ |
| T10 | Anthropic rate limits | `2026-09-15-tree-t10-anthropic-rate-limits.md` | ✅ |
| T11 | Anthropic workspaces | `2026-09-15-tree-t11-anthropic-workspaces.md` | ✅ |
| T12 | Anthropic identity-backed keys | `2026-09-15-tree-t12-anthropic-identity-keys.md` | ✅ |
| T13 | LiteLLM virtual keys/teams/budgets | `2026-09-15-tree-t13-litellm-keys-teams-budgets.md` | ✅ |
| T14 | Agent identity & attribution headers | `2026-09-15-tree-t14-agent-identity-headers.md` | ✅ |
| T15 | Queue management | `2026-09-15-tree-t15-queue-management.md` | ✅ |
| T16 | Attribution dimensions ("where from") | `2026-09-15-tree-t16-attribution-dimensions.md` | ✅ |
| T17 | Routing/control dimensions ("where to") | `2026-09-15-tree-t17-routing-control-dimensions.md` | ✅ |
| T18 | Recommended architecture (phases) | `2026-09-15-tree-t18-recommended-architecture.md` | ✅ |
| T19 | Keyless gating option space | `2026-09-15-tree-t19-keyless-gating.md` | ✅ |
| T20 | Agent profiles | `2026-09-15-tree-t20-agent-profiles.md` | ✅ |
| T21 | Synthetic & programmatic source tracking | `2026-09-15-tree-t21-synthetic-source-tracking.md` | ✅ |
| T22 | Tag/keyword priority queues | `2026-09-15-tree-t22-tag-priority-queues.md` | ✅ |
| T23 | Model-group limiting | `2026-09-15-tree-t23-model-group-limiting.md` | ✅ |
| T24 | Adaptive/predictive rate control | `2026-09-15-tree-t24-adaptive-rate-control.md` | ✅ |
| T25 | Gate levels | `2026-09-15-tree-t25-gate-levels.md` | ✅ |
| T26 | Governance architecture synthesis | `2026-09-15-tree-t26-governance-architecture.md` | ✅ |
| — | Master topic index (26 topics → tree docs, batch status) | `2026-09-15-master-topic-index.md` | ✅ |

Deferred (documented, not started): all implementation work — awaiting user go-ahead.

## Newly Completed (2026-09-15) — Message-Driven Tool-Building (research + plan + ADR, docs only)

Research: `../research/9router/38-message-driven-tools-research.md`.
Plan: `../planning/message-driven-tools-plan.md`.
ADR: `../tracking/decisions/ADR-010-message-driven-tools-hybrid-design.md`.

| # | Task | Status | Evidence |
|---|------|--------|----------|
| M1 | Research: requestDetails anatomy (30+ fields, capture pipeline) | ✅ | research doc §A |
| M2 | Research: identity signals (detectClientTool, trusted headers, per-provider UAs) | ✅ | research doc §B |
| M3 | Research: Messages API surface (filters, views, detail, export, analyze-error) | ✅ | research doc §C |
| M4 | Research: 9 gaps (fixed dimensions, no JSON-path, no saved views, no actions, no annotations, no conversation tooling, under-captured identity, silent truncation, no structured extraction) | ✅ | research doc §D |
| M5 | Research: 4 design options + hybrid recommendation | ✅ | research doc §E |
| M6 | Research: identity as dimension, build/record primitives, privacy, confidence, open questions | ✅ | research doc §F–H |
| P1 | Plan: M1 facet extraction + indexing (message_facets) | ✅ | planning doc M1 |
| P2 | Plan: M2 JSON-path query language (JSON1, parameterized) | ✅ | planning doc M2 |
| P3 | Plan: M3 identity as dimension (extend detectClientTool, IDE detection, trusted headers) | ✅ | planning doc M3 |
| P4 | Plan: M4 annotations + saved views | ✅ | planning doc M4 |
| P5 | Plan: M5 per-message actions + webhook/script hooks | ✅ | planning doc M5 |
| P6 | Plan: M6 truncation surfacing + UI | ✅ | planning doc M6 |
| A1 | ADR-010: hybrid facet + JSON-path design decision | ✅ | `tracking/decisions/ADR-010-message-driven-tools-hybrid-design.md` |

Deferred (documented, not started): all M1–M6 implementation work — awaiting user go-ahead.

## Newly Completed (2026-09-15) — Binary-Tree Research Expansion (docs only, no code)

Master tree: `../research/2026-09-15-master-research-tree.md`.
16 branch docs: `../research/2026-09-15-branch-*.md` (one per Level-3 node, each covering its 7-node subtree).

| # | Task | Status | Evidence |
|---|------|--------|----------|
| T1 | Master research tree (6-level binary tree, 63 nodes) | ✅ | `research/2026-09-15-master-research-tree.md` |
| T2 | Branch A1a: UA fingerprinting (rule engine + spoofing detection) | ✅ | `research/2026-09-15-branch-a1a-ua-fingerprinting.md` |
| T3 | Branch A1b: header/network identity (trust model, XFF, subnets, mTLS) | ✅ | `research/2026-09-15-branch-a1b-header-network-identity.md` |
| T4 | Branch A2a: synthetic labels (FNV-1a, hash-only privacy) | ✅ | `research/2026-09-15-branch-a2a-synthetic-labels.md` |
| T5 | Branch A2b: behavioral fingerprints (clustering, tool-use patterns) | ✅ | `research/2026-09-15-branch-a2b-behavioral-fingerprints.md` |
| T6 | Branch B1a: static rate limits (token bucket, sliding window, GCRA) | ✅ | `research/2026-09-15-branch-b1a-static-rate-limits.md` |
| T7 | Branch B1b: adaptive rate control (AIMD, EWMA, budget pacing) | ✅ | `research/2026-09-15-branch-b1b-adaptive-rate-control.md` |
| T8 | Branch B2a: priority queues (strict priority, WFQ, aging) | ✅ | `research/2026-09-15-branch-b2a-priority-queues.md` |
| T9 | Branch B2b: interval pacing (leaky bucket drain, backpressure) | ✅ | `research/2026-09-15-branch-b2b-interval-pacing.md` |
| T10 | Branch B3a: model-group definitions (qwen-* auto-derive, shared budget) | ✅ | `research/2026-09-15-branch-b3a-model-group-definitions.md` |
| T11 | Branch B3b: model-group observability (model_group in usage) | ✅ | `research/2026-09-15-branch-b3b-model-group-observability.md` |
| T12 | Branch B4a: content guardrails (PII redaction, injection detection) | ✅ | `research/2026-09-15-branch-b4a-content-guardrails.md` |
| T13 | Branch B4b: budget guardrails (USD budgets, allowlists) | ✅ | `research/2026-09-15-branch-b4b-budget-guardrails.md` |
| T14 | Branch B5a: key lifecycle (rotation, expiry, disable/archive) | ✅ | `research/2026-09-15-branch-b5a-key-lifecycle.md` |
| T15 | Branch B5b: alternative auth (short-lived tokens, device flow) | ✅ | `research/2026-09-15-branch-b5b-alternative-auth.md` |
| T16 | Branch B6a: cooperative identity (X-9R headers, agent config) | ✅ | `research/2026-09-15-branch-b6a-cooperative-identity.md` |
| T17 | Branch B6b: behavioral identity (gate levels L0–L5, profiles) | ✅ | `research/2026-09-15-branch-b6b-behavioral-identity.md` |

Deferred (documented, not started): all M1–M7 implementation work — awaiting user go-ahead.

## Newly Completed (2026-09-15) — Webhook Receive & Act research + plan (docs only, no code)

Plan: `../planning/2026-09-15-webhook-receive-act-plan.md`.
Research: `../research/2026-09-15-webhook-receive-act-research.md`.

| # | Task | Status | Evidence |
|---|------|--------|----------|
| R1 | Audit codebase: inbound webhook receiver + action/automation engine | ✅ | `grep webhook` in `src/**` → EMPTY; no event bus / pub-sub / hooks; only UI toasts + CLI tray notifications |
| R2 | Research: 20+ programs at 6-level binary tree depth (L1 Mode → L6 Pattern) | ✅ | research doc Part 2 (LLM gateways, automation platforms, messaging platforms, webhook infra, monitoring, event patterns) |
| R3 | Research: 12 archetype taxonomy | ✅ | research doc Part 3 (TCA Rule Engine → Embedded Event Queue) |
| R4 | Research: recommended architecture (hybrid TCA + Dual-Mode + Universal Adapter) | ✅ | research doc Part 4 (inbound receiver, SQLite outbox, rule engine, actions, outbound) |
| R5 | Research: key design decisions (10, each backed by precedent) | ✅ | research doc Part 5 (HMAC+timestamp, raw body, 2xx<3s, SQLite outbox, event IDs, dual mode, Apprise, TCA, LLM reuse, settings) |
| R6 | Plan: phased implementation (M1 receiver → M5 dashboard UI) | ✅ | planning doc (5 milestones, files touched, acceptance criteria) |

Deferred (documented, not started): all M1–M5 implementation work — awaiting user go-ahead.

## Newly Completed (2026-09-15) — Webhook Binary-Tree Research Expansion (docs only, no code)

Master tree: `../research/2026-09-15-webhook-master-research-tree.md`.
8 branch docs: `../research/2026-09-15-webhook-branch-*.md` (one per Level-3 node, each covering its 7-node subtree).

| # | Task | Status | Evidence |
|---|------|--------|----------|
| T1 | Webhook master research tree (6-level binary tree, 63 nodes) | ✅ | `research/2026-09-15-webhook-master-research-tree.md` |
| T2 | Branch A1a: transport (request handling, raw body, payload limits) | ✅ | `research/2026-09-15-webhook-branch-a1a-transport.md` |
| T3 | Branch A1b: auth & security (HMAC verification, secret management) | ✅ | `research/2026-09-15-webhook-branch-a1b-auth-security.md` |
| T4 | Branch A2a: event store (outbox table, worker & retry) | ✅ | `research/2026-09-15-webhook-branch-a2a-event-store.md` |
| T5 | Branch A2b: rule engine (TCA matching, actions) | ✅ | `research/2026-09-15-webhook-branch-a2b-rule-engine.md` |
| T6 | Branch B1a: messaging platforms (Slack, Discord, Telegram) | ✅ | `research/2026-09-15-webhook-branch-b1a-messaging-platforms.md` |
| T7 | Branch B1b: push services (ntfy, Gotify, Apprise) | ✅ | `research/2026-09-15-webhook-branch-b1b-push-services.md` |
| T8 | Branch B2a: internal events (quota, provider & fallback events) | ✅ | `research/2026-09-15-webhook-branch-b2a-internal-events.md` |
| T9 | Branch B2b: scheduled & monitoring (daily reports, dead man's switch) | ✅ | `research/2026-09-15-webhook-branch-b2b-scheduled-monitoring.md` |

Deferred (documented, not started): all M1–M5 implementation work — awaiting user go-ahead.

## Newly Completed (2026-09-15) — Webhook Exponential Research Expansion (docs only, no code)

Master map: `../research/2026-09-15-webhook-exponential-master-map.md`.
11 branch docs: `../research/2026-09-15-webhook-exp-*.md` (one per root group, each expanding its roots 6 levels deep with N-ary branching — every phrase in the source docs is a root, 48 roots total, 11,862 enumerated nodes).

| # | Task | Status | Evidence |
|---|------|--------|----------|
| E1 | Exponential master map (48 roots R01–R48, N-ary methodology, node counts) | ✅ | `research/2026-09-15-webhook-exponential-master-map.md` |
| E2 | Exp branch 01: receiver & transport (R01–R04) | ✅ | `research/2026-09-15-webhook-exp-01-receiver-transport.md` |
| E3 | Exp branch 02: auth & secrets (R05–R08) | ✅ | `research/2026-09-15-webhook-exp-02-auth-secrets.md` |
| E4 | Exp branch 03: event store & worker (R09–R11) | ✅ | `research/2026-09-15-webhook-exp-03-event-store-worker.md` |
| E5 | Exp branch 04: rule engine & actions (R12–R14) | ✅ | `research/2026-09-15-webhook-exp-04-rule-engine-actions.md` |
| E6 | Exp branch 05: messaging platforms (R15–R17) | ✅ | `research/2026-09-15-webhook-exp-05-messaging-platforms.md` |
| E7 | Exp branch 06: push services (R18–R20) | ✅ | `research/2026-09-15-webhook-exp-06-push-services.md` |
| E8 | Exp branch 07: internal events (R21–R23) | ✅ | `research/2026-09-15-webhook-exp-07-internal-events.md` |
| E9 | Exp branch 08: scheduled & monitoring (R24–R25) | ✅ | `research/2026-09-15-webhook-exp-08-scheduled-monitoring.md` |
| E10 | Exp branch 09: standards & infra (R26–R29) | ✅ | `research/2026-09-15-webhook-exp-09-standards-infra.md` |
| E11 | Exp branch 10: patterns & platforms (R30–R46) | ✅ | `research/2026-09-15-webhook-exp-10-patterns-platforms.md` |
| E12 | Exp branch 11: HTTP client architecture (R47–R48) | ✅ | `research/2026-09-15-webhook-exp-11-http-client-architecture.md` |

Deferred (documented, not started): all M1–M5 implementation work — awaiting user go-ahead.

## Newly Completed (2026-09-15) — Webhook Interpretation Layer (docs only, no code)

New category: `../interpretation/` — the map over the research. Plain-language guides that make the 23 webhook docs understandable, organized, and ordered.

| # | Task | Status | Evidence |
|---|------|--------|----------|
| I1 | Create interpretation category + README | ✅ | `interpretation/README.md` |
| I2 | Interpretation guide (one-page summary, 4 phases, doc map, reading order) | ✅ | `interpretation/2026-09-15-webhook-interpretation-guide.md` |
| I3 | Doc-by-doc summary (every webhook doc in plain language) | ✅ | `interpretation/2026-09-15-webhook-doc-by-doc.md` |
| I4 | Synthesis (verdict, archetypes, architecture, decisions, roots→branches) | ✅ | `interpretation/2026-09-15-webhook-synthesis.md` |
| I5 | Order & next steps (timeline, reading order, build order M1–M5, deferred) | ✅ | `interpretation/2026-09-15-webhook-order-and-next-steps.md` |
| I6 | Update main README with interpretation category | ✅ | `README.md` (folder table) |

Deferred (documented, not started): all M1–M5 implementation work — awaiting user go-ahead.

## Newly Completed (2026-09-14) — Keyless Governance research + plan (docs only, no code)

Plan: `../planning/2026-09-14-keyless-governance-plan.md`.
Research: `../research/2026-09-14-keyless-governance-research.md`.

| # | Task | Status | Evidence |
|---|------|--------|----------|
| R1 | Research: keyless gating options (10 mechanisms) | ✅ | research doc Part A |
| R2 | Research: agent profiles (identity bundles, industry precedents) | ✅ | research doc Part B |
| R3 | Research: synthetic/programmatic source tracking (labels, behavioral fingerprints) | ✅ | research doc Part C |
| R4 | Research: tag/keyword priority queues + interval pacing | ✅ | research doc Part D |
| R5 | Research: model-group limiting (9 qwen models shared cap) | ✅ | research doc Part E |
| R6 | Research: adaptive/predictive rate control (AIMD + EWMA + feedback) | ✅ | research doc Part F |
| R7 | Research: gate levels (L0–L5 ladder) | ✅ | research doc Part G |
| R8 | Plan: phased implementation (M1 profiles → M7 governance dashboard) | ✅ | planning doc (7 milestones, files touched, acceptance criteria) |

Deferred (documented, not started): all M1–M7 implementation work — awaiting user go-ahead.

## Newly Completed (2026-08-31) — Source-App Governance research + plan (docs only, no code)

Plan: `../planning/2026-08-31-source-app-governance-plan.md`.
Research: `../research/2026-08-31-message-origin-and-destination-research.md`.
ADR: `../tracking/decisions/ADR-009-api-key-metadata-and-attribution.md`.

| # | Task | Status | Evidence |
|---|------|--------|----------|
| R1 | Research: where do messages come from / go (7 feature areas) | ✅ | research doc (external: OpenRouter, Anthropic, LiteLLM, MCP; internal: sourceApps.js, smartRouter, rate-limiter, usageDb) |
| R2 | Plan: phased implementation (M1 attribution → M7 agent identity) | ✅ | planning doc (7 milestones, files touched, acceptance criteria) |
| R3 | ADR-009: API key metadata + usage attribution schema | ✅ | decisions/ADR-009 |

Deferred (documented, not started): all M1–M7 implementation work — awaiting user go-ahead.

## Newly Completed (2026-08-12) — Provider observability & usage fixes

Plan: `../planning/curried-chasing-lerdorf` + `../planning/2026-08-12-combo-duplicate-search-capabilities-plan.md`.
Diffstat: 12 files / 361 insertions + 3 new components. Verified: 1811 pass / 86 fail (0 NEW regressions via `verify-no-regression.mjs`).

| # | Task | Status | Evidence |
|---|------|--------|----------|
| P1 | Fix OpenRouter + default-path usage tracking (`include_usage`) | ✅ | `open-sse/executors/default.js:84-100` (`supportsIncludeUsage` guard) |
| P2 | OpenRouter added to quota tracker | ✅ | `openrouter.js` features, `usage.js` handler, `usage/openrouter.js` (new), `ProviderLimits/utils.js` case |
| P3 | Per-model vision/audio capability overrides (F3/F4) | ✅ | `settingsRepo.js` `modelCapOverrides`, `capabilities.js` merge, `/api/models` merged caps, `ModelRow.js` toggles, `useModelCaps.js` refresh |
| P4 | Combo duplicate (F1) + provider-name model search (F2) | ✅ | `combos/page.js`, `ModelSelectModal.js` |
| P5 | Provider-page error panel + per-model error chip | ✅ | `ProviderErrorPanel.js`, `ErrorGroupList.js` (new), `ModelRow.js`, `page.js` errorsByModel map (System B reuse) |
| P6 | Usage/cost cards on provider detail page | ✅ | `ProviderUsageCard.js` (new) — `/api/usage/stats`, client-side byModel filter |

Deferred: custom-provider quota (no generic usage data source). Browser verification blocked by tool-permission-stream error (retried this session).

## Completed

| # | Task | Status | Evidence |
|---|------|--------|----------|
| 1 | Research: fallback/combo/observability state of codebase | ✅ | SESSION-HISTORY.md, research/9router/*.md |
| 2 | Research: build/debug/deploy workflows | ✅ | research/9router/build-debug-deploy-guide.md |
| 3 | Smart router pre-combo interception (backend) | ✅ | commit `9f4c1631` |
| 4 | conversationId tracking + observability wiring | ✅ | commit `6f00d23f` |
| 5 | Request export (JSON + markdown) | ✅ | commit `a954b88f` |
| 6 | Smart Router config UI | ✅ | commit `acdc7134` |
| 7 | taskType usage metrics | ✅ | commit `1c921ce2` |
| 8 | Conversation filter + column UI | ✅ | commit `d9415807` |
| 9 | Combo fallback chain logging | ✅ | commit `5932879f` |
| 10 | AI Error Analyst | ✅ | commit `d1c1db28` |
| 11 | Markdown auto-flush logs | ✅ | commit `57e87729` |
| 12 | Error categorization engine | ✅ | commit `3e7d1c7c` |
| 13 | Fix errorCategory pipeline drop | ✅ | commit `40168739` |
| 14 | Fix 4 smart router bugs (E2E-caught) | ✅ | commit `4627a299` |
| 15 | Full model catalog in pickers + allowedModels + per-model fallbacks | ✅ | commit `99ac899f` |
| 16 | E2E browser verification (production build, mock upstream) | ✅ | SESSION-HISTORY.md evidence table |
| 17 | Full test suite green (1691 pass / 88 pre-existing fail) | ✅ | test runs |
| 18 | Session tracking docs | ✅ | SESSION-HISTORY.md, CHANGELOG.md, this file |
| 19 | VSCode settings sync from exo (Copilot Chat settings) | ✅ | `.vscode/settings.json` |

## In Progress

| # | Task | Notes |
|---|------|-------|
| 20 | Custom provider nodes in smart router | Code done (`getNodeModels` + node loop), needs rebuild/E2E + commit |
| 21 | Retry counts (universal + per-model) for fallback rules | `retriesPerModel`/`perModelRetries` signature added to handleComboChat; retry LOOP logic pending |
| 22 | Visual Fallback Rule Builder (form modal + rules table) | Design done, implementation pending |
| 23 | Markdown log flush explanation (overwrite vs append) | Text fix pending |
| 24 | `[DONE]` SSE leak in combo path | Root cause identified (chatCore.js:105 stream defaulting); fix pending |

## Blocked / Deferred

| # | Task | Reason |
|---|------|--------|
| 25 | Webhook alerting (P3) | Large scope, not requested in this session's core ask |
| 26 | Drag-and-drop in ComboFormModal | Cosmetic; dnd-kit already available |
| 27 | Cloud sync of fallback rules | Not requested |

---

## UPDATE 2026-08-06 (continued session — documentation audit + [DONE] fix)

### Newly Completed

| # | Task | Status | Evidence |
|---|------|--------|----------|
| 20 | Custom provider nodes in smart router | ✅ | `getNodeModels` + node scoring loop in smartRouter.js, test added in smart-router-resolve.test.js |
| 21 | `[DONE]` SSE duplicate leak fix | ✅ | Root cause found in stream.js passthrough transform + fix applied + E2E verified (1× DONE for single+combo, clean JSON for non-stream) |
| 22 | Comprehensive documentation audit | ✅ | Read ALL existing docs (4 ADRs, 3 learnings, narrative, history, task-log, changelog, prompts, architecture, plans, meetings) — identified 5 gaps |
| 23 | Documentation gap filling | ✅ | Created learnings/2026-08-06-sse-done-duplicate-leak.md, updated SESSION-HISTORY with bugs #6-7, updated all tracking docs |
| 24 | Retry counts loop in handleComboChat | ✅ | `retriesPerModel`/`perModelRetries` wired in `open-sse/services/combo.js` + `src/sse/handlers/chat.js` |
| 25 | Visual Fallback Rule Builder — Approach 1 (form modal + rules table) | ✅ | `d1cc1faa` — FallbackRuleModal + rules table, E2E verified |
| 26 | Markdown log flush explanation (overwrite vs append) | ✅ | `d1cc1faa` — Markdown Log card documents overwrite semantics |
| 27 | **Approach 2: Chain Flow (drag-and-drop)** | ✅ | `6449b58b` — dnd-kit sortable node chains, drag reorder persisted (E2E verified) |
| 28 | **Approach 3: Simple + Advanced cards** | ✅ | `6449b58b` — collapsible cards with expandable advanced section, retries persisted (E2E verified) |
| 29 | 3-view switcher on Fallbacks card | ✅ | `6449b58b` — Table / Chain Flow / Simple + Advanced tabs, all E2E verified |
| 30 | Regression check after UI work | ✅ | vitest 1692 pass / 88 fail = exact baseline; lint 7→3 errors (0 new) |
| 31 | Tracking docs updated BEFORE commits | ✅ | CHANGELOG + SESSION-HISTORY + TASK-LOG updated, then committed `6449b58b` |

### Still In Progress

| # | Task | Notes |
|---|------|-------|
| 32 | Choose one of the 3 fallback rule UIs | User: "we will eventually choose one of them but for now just keep what is already there" — all three approaches remain available via view switcher |

### Newly Completed (2026-08-07 afternoon — sr-* cleanup + fallback verification)

| # | Task | Status | Evidence |
|---|------|--------|----------|
| 33 | Optional sr-* combo cleanup (OFF by default) | ✅ | `srComboCleanup.js` scheduler; setting `srComboCleanup.enabled=false` default; UI toggle in Smart Router card |
| 34 | Mocked unit tests for cleanup | ✅ | `tests/unit/sr-combo-cleanup.test.js` — 13 tests (pure selection, DI'd fail-open tick, scheduler gate, integration-style real-DB tick) |
| 35 | E2E proof cleanup actually works | ✅ | Planted stale/fresh/user combos in E2E DB → tick deleted ONLY stale sr-* (`Deleted stale smart combo "sr-modelRouter-e2e-test"`), fresh + user combos survived; disabled path = scheduler never starts |
| 36 | Verify per-model/provider fallback state (user question) | ✅ | Confirmed COMPLETE: `settings.modelFallbacks` + chat.js interception + combo.js retriesPerModel/perModelRetries + 3-view UI; 7/7 fallback tests pass; found original request in session d4294fc8 |

### Newly Completed (2026-08-07 evening — fallback rules UX v2)

| # | Task | Status | Evidence |
|---|------|--------|----------|
| 37 | ProviderSelectModal (visual provider picker) | ✅ | `b1e2a061` — icons, names, ids, connected/custom badges, search; used in FallbackRuleModal + Wizard |
| 38 | FallbackRuleModal provider picker button | ✅ | `b1e2a061` — "Pick provider…" in whole-provider mode |
| 39 | Toggle model↔provider switching fix | ✅ | `b1e2a061` — model→provider strips to provider part; provider→model clears (deliberately simple per user) |
| 40 | 2 new rule views (5 total) | ✅ | `b1e2a061` — Guided Wizard (3-step) + Expert Text (DSL editor) |
| 41 | Extract fallbackTextFormat lib + tests | ✅ | `b1e2a061` — `src/lib/fallbackTextFormat.js`, 13 tests (both shapes, round-trip, retries preserved) |
| 42 | **E2E crash fix: toDraftText advanced shape** | ✅ | `b1e2a061` — `(t||[]).join is not a function` when opening Expert Text with advanced rule; fixed in extracted lib |
| 43 | Drag-and-drop in FallbackRuleModal chain | ✅ | `d7bf0e35` — sortable rows (dnd-kit), arrows kept |
| 44 | **E2E bug: stale number badges after drag** | ✅ | `d7bf0e35` — React text-node reuse; fix `key={idx}` on badge span |
| 45 | Live drop indicator bar (Chain Flow) | ✅ | `b520c9d6` — vertical accent bar tracks insertion slot during drag; drop honors bar position |
| 46 | **Debug root-cause: dnd-kit coordinate spaces** | ✅ | `b520c9d6` — `translated` rect is content-relative in scrolled containers; fixed with `initial rect + event.delta` (viewport) |
| 47 | UX research: per-model override placement | 📋 researched | Recommendation: move per-model retries INTO each model's chain box (Gestalt proximity + NN/g progressive disclosure); awaiting user approval to implement |

### Still In Progress

| # | Task | Notes |
|---|------|-------|
| 48 | Choose ONE of the 5 fallback rule UIs | User: "we will eventually choose one of them" — all five approaches remain via view switcher |
| 49 | Per-model override inline in chain boxes | Research done (see research/9router/16-ux-research*), implementation pending user go-ahead |

### Newly Completed (2026-08-07 late — browser-control documentation + skill)

| # | Task | Status | Evidence |
|---|------|--------|----------|
| 50 | Answer "how do you control the browser without vision?" | ✅ | Answered in chat + documented; see SESSION-HISTORY late update |
| 51 | Browser-control workflow doc | ✅ | `../operations/browser-control-workflow.md` — integrated browser (not headless), Playwright tooling, no-vision loop, gotchas, synthetic drag recipe, FAQ |
| 52 | Agent skill for browser E2E | ✅ | `~/.agents/skills/9router-browser-e2e/SKILL.md` (manifest-registered) — reusable loop + drag recipe + gotchas |

### Newly Completed (2026-08-07 late — user-commit verification + code review)

| # | Task | Status | Evidence |
|---|------|--------|----------|
| 53 | Live-verify Capacity Adapter (user commit 8e59093d/6498b312) | ✅ | Vision request → text-only model → log: adapter augmented chain → pool 404 handled → mimo succeeded; settings restored |
| 54 | Verify TokenRouter (b4808929/41588bea) | ✅ | Pricing exact, cost math correct ($0.0175), thinking enum passthrough |
| 55 | Verify self-hosted STT/TTS/Embeddings (fe547f4d) | ✅ | Registered (index 117/118/119), 50 tests pass, fail-visible design |
| 56 | Verify auto-provision key (02c66fe2) | ✅ | Code review: idempotent client-side, try/catch |
| 57 | Verify Codex detection (cd13d904) | ✅ | 7/7 cases (Desktop UA + originator new paths correct) |
| 58 | Verify Antigravity OAuth scoping (35f86e58) | ✅ | Diff review sound (headers scoped to loadCodeAssist/onboardUser) |
| 59 | Code review + refactor review + docs | ✅ | `research/9router/17-code-review-user-commits.md`; findings: xAI token invalid (env), OpenRouter guardrails (env), shallow-merge note, pool-flattening note, 2 minor refactor notes; no code changed |

### Key Discovery: Documentation Standards

Per user's explicit request, established standards for all future work:
- Every commit must include: full root cause, links to related commits/PRs, attribution (who wrote original, who found bug, who fixed), external references (URLs, docs)
- All tracking docs in `docs/plans-and-prompts/` must be updated BEFORE committing, not after
- Must note whether changes come from: user requests, PR imports, agent-discovered issues, or E2E testing

### Newly Completed (2026-08-07 deep research — message capture & log viewing)

| # | Task | Status | Evidence |
|---|------|--------|----------|
| 53 | Research v1: message-capture survey | ✅ | `research/message-capture-log-viewing.md` — what we have (requestDetails capture + Usage tab), gaps vs wishlist, first landscape pass |
| 54 | Research v2: EXHAUSTIVE pass | ✅ | `research/message-capture-deep-research-v2.md` — 3 parallel agents + direct deep-dives; 60+ projects verified live (stars/licenses); license landmines (Phoenix ELv2, Sentry FSL, Graylog SSPL, Axiom discontinued, TensorZero archived); ProxmoxVE enumerated; awesome-lists read; recommendation = build in-app + Langfuse/OpenLIT ship-out |
| 55 | Document research in tracking docs | ✅ | CHANGELOG + TASK-LOG + SESSION-HISTORY now reference both research files |

### Newly Completed (2026-08-07 deep research v3 — obscure projects)

| # | Task | Status | Evidence |
|---|------|--------|----------|
| 56 | Research v3: OBSCURE/low-star projects pass | ✅ | `research/message-capture-obscure-projects-v3.md` — 50+ hidden-gem projects (7–4,400★) across chat viewers, log tools, error analysis, tiny proxies; 10 synthesized copy-ideas; confirmed market gap |
| 57 | Document v3 in tracking docs | ✅ | CHANGELOG + TASK-LOG + SESSION-HISTORY reference v3 |

### Newly Completed (2026-08-07 deep research v4 — no-limits subagent pass)

| # | Task | Status | Evidence |
|---|------|--------|----------|
| 58 | Research v4: no-limits pass (5 subagents w/ retries) | ✅ | `research/message-capture-v4-deep-pass.md` — ~90 new projects, 43 papers, community landscape, framework storage synthesis, top-copy list |
| 59 | Deep pagination of GitHub search (llm observability, gateways) | ✅ | ~200 repos reviewed across 7+ API queries + both awesome-gateway lists (long-tail catalog 40+) |
| 60 | Academic/study landscape | ✅ | 43 live-verified papers (arXiv/Semantic Scholar) incl. routing reliability, log/RCA analysis, privacy, HCI |
| 61 | Community landscape | ✅ | HN Algolia themes, GitHub issue demand signals (7 repos), Discords/blogs; Reddit IP-blocked (search links provided) |
| 62 | Agent-framework storage-pattern synthesis | ✅ | LangGraph/CrewAI/AG2/Pydantic/Vercel/Mastra/SemanticKernel/LlamaIndex/Dify/OpenWebUI/LibreChat/CherryStudio/NextChat → recommended messages-table schema |
| 63 | Subagent failure recovery exercised | ✅ | 5/5 areas completed despite provider rate-limits/network errors via one-at-a-time retries (validates user's recovery rationale) |

### Newly Completed (2026-08-07 research synthesis + specs)

| # | Task | Status | Evidence |
|---|------|--------|----------|
| 64 | Master research synthesis (all v1–v4) | ✅ | `learnings/2026-08-07-research-synthesis.md` — 3,498 words, 20 ranked copy items, 15-feature roadmap, 10 security obligations |
| 65 | Messages page feature spec | ✅ | `../planning/messages-page-feature-spec.md` — DDL + list/detail/inbox/tree/export + P1–P4 rollout, all cited |
| 66 | Gaps & risks + decision log | ✅ | `research/message-capture-gaps-and-risks.md` — 10 risks, 7 decisions (none block P1), effort table |

### Newly Completed (2026-08-07 feature-gap + upstream-risk reviews)

| # | Task | Status | Evidence |
|---|------|--------|----------|
| 67 | Feature-gap review (all v1 features vs original) | ✅ | `research/9router/18-feature-gap-review.md` — per-feature lacks, cross-cutting (shallow merge confirmed), 10-item action table |
| 68 | Upstream provider risk review | ✅ | `research/9router/19-upstream-provider-risks.md` — 12 risks w/ observed evidence, 3 open questions |
| 69 | Subagent spawn attempted (as requested) | ⚠️ rate-limited | All spawns failed (`rate_limit_exceeded`, `net::ERR_FAILED`); main-session agent completed reviews; recovery rationale documented |

### Newly Completed (2026-08-07 Messages page P1)

| # | Task | Status | Evidence |
|---|------|--------|----------|
| 67 | Messages page P1 — View (list, detail drawer, conversation tree, export) | ✅ | commit `2b20618b` — 3 API routes + page + sidebar entry, 719 LOC |
| 68 | Messages API endpoints | ✅ | `/api/messages`, `/api/messages/:id`, `/api/messages/:id/export` (json/markdown/curl) |
| 69 | Messages UI verified in browser | ✅ | list 50 rows, detail drawer 5 tabs, conversations view, cURL tab |
| 70 | Tray app rebuilt with Messages page | ✅ | cli/app bundle rebuilt, `/dashboard/messages` 200 on port 20130 |

### HARDENING ROADMAP (todo — from plan/hardening-roadmap.md)

Phase 1 — Quick wins (OURS, do now):
| # | Task | Status | Origin |
|---|------|--------|--------|
| 70 | Deep-merge nested settings (capacityAdapter, smartRouter, srComboCleanup, modelFallbacks) in updateSettings + test | ⏳ todo | PRE-EXISTING pattern, activated by ours — HIGH |
| 71 | JSDoc for calculateCostFromTokens arg order | ⏳ todo | YOURS — LOW |
| 72 | Provider+model rule conflict warning in fallbacks UI | ⏳ todo | OURS — HIGH |
| 73 | Fallback string validation on save (warn unknown) | ⏳ todo | OURS — MED-HIGH |

Phase 2 — UX gaps (OURS):
| 74 | Smart router score breakdown ("why this model") | ⏳ todo | OURS — HIGH |
| 75 | Sticky TTL configurable (smartRouter.stickyTtlMin) | ⏳ todo | OURS — MED |
| 76 | Node models refresh button (bust getNodeModels cache) | ⏳ todo | OURS — MED |
| 77 | Chain Flow chip truncation + title tooltip | ⏳ todo | OURS — LOW |
| 78 | Expert Text invalid-line highlighting | ⏳ todo | OURS — LOW-MED |

Phase 3 — Robustness (OURS):
| 79 | Markdown flush concurrency lock | ⏳ todo | OURS — MED |
| 80 | Export pagination (limit/offset) | ⏳ todo | OURS — MED |
| 81 | Surface dropped observability records (1000-cap) | ⏳ todo | PRE-EXISTING cap — MED |

Phase 4 — Provider resilience (MIXED):
| 82 | Provider health endpoint (/api/health/providers) + UI | ⏳ todo | NEW — HIGH |
| 83 | Auto-disable provider after N refresh failures (+ re-auth badge) | ⏳ todo | NEW — MED-HIGH |
| 84 | TokenRouter catalog/pricing re-validation | ⏳ later | YOURS — MED |
| 85 | mimo fallback startup health check | ⏳ later | YOURS — MED |
| 86 | Node /models fetch error badge | ⏳ todo | OURS — MED |

Open questions for user (block 83/84/85): auto-disable behavior; pricing re-fetch policy; mimo fallback policy.

### Messages drawer UI issues (deferred — documented 2026-08-07)

| # | Task | Status | Evidence |
|---|------|--------|----------|
| 87 | Detail drawer overflows off-screen in compact/narrow windows (fixed w-[800px]) | ⏳ deferred | Probe: left:-160px at narrow width; spec §12.1 |
| 88 | Detail payload `pre` not visibly scrollable (wrap policy + missing min-h-0 on flex chain + nested scroll containers) | ⏳ deferred | Probe: scrollHeight==clientHeight on sample; spec §12.2 |
| 89 | Optional vision-assisted QA of drawer at 375px (qwen-3.5-omni-plus subagent) | ⏳ deferred | spec §12.3 |

### Newly Completed (2026-08-07 Messages drawer fixes)

| # | Task | Status | Evidence |
|---|------|--------|----------|
| 71 | Drawer overflow in compact mode | ✅ | commit `79c457e6` — all Drawer width presets now `w-[min(Npx,100vw)]`; verified `w-[min(800px,100vw)]` in DOM |
| 72 | Payload text scrollability | ✅ | commit `79c457e6` — `min-h-0 flex-1 overflow-auto` wrapper + `pre h-full min-h-0 overflow-auto`; scrollH 22018 > clientH verified |
| 73 | Word wrap toggle | ✅ | commit `79c457e6` — Wrap/No-wrap toggle (pre-wrap+break-words vs whitespace-pre) |
| 74 | Tray app rebuilt with drawer fixes | ✅ | cli/app bundle rebuilt + restarted; messages page + api both 200 on port 20130 |

### Newly Completed (2026-08-07 message-viewer design research)

| # | Task | Status | Evidence |
|---|------|--------|----------|
| 67 | Design-philosophy research: 10 message/log viewer tools | ✅ | `research/message-viewer-design-philosophies.md` §A (Sentry/Datadog/Langfuse/Linear/Obsidian/mitmproxy/Dozzle/Claude-Code-trace/Open-WebUI/GitHub-PR) |
| 68 | Filter-dimension research: LLM observability tools | ✅ | `research/message-viewer-design-philosophies.md` §B (dimension table + gateway-vs-client split + SDK header conventions from openai-node source) |
| 69 | Gateway capture-dimension analysis (API key/IP/combo/route) | ✅ | `research/message-viewer-design-philosophies.md` §C (audited requestDetailsRepo/usageRepo/chat.js/custom-server.js) |
| 70 | 3 view designs + filters + visual improvements + privacy risks | ✅ | `research/message-viewer-design-philosophies.md` §D (Timeline/Trace-Tree/Board views, 8 filters, 5 UX fixes, 7 guardrails) |

### Review of other-bot work (2026-08-07/08)

| # | Task | Status | Evidence |
|---|------|--------|----------|
| 90 | Review Messages P1 vs spec (2 subagents + live browser) | ✅ | `research/9router/20-review-otherbot-work-vs-research.md` — ~45% of spec P1; B1 status-filter bug + B3 fake tree + B4 curl URL confirmed live |
| 91 | Review hardening P1 vs roadmap | ✅ | 7.5/10 — 1.2/1.3/1.4 good; 1.1 merges-vs-defaults gap (sequential PATCH resets) |
| 92 | Review uncommitted Phase 2 work | ✅ | **P0: smartRouterMeta undeclared in chat.js (8 uses, 0 decls) → every chat request 500s; eslint misses it. DO NOT COMMIT.** 2.1 UI absent; 2.2 correct but unreachable |

### Newly Completed (2026-08-08 Messages multi-view)

| # | Task | Status | Evidence |
|---|------|--------|----------|
| 75 | Timeline/Waterfall view (Messages 2) | ✅ | commit `0194d065` — recharts histogram + latency waterfall rows |
| 76 | Trace Tree view (Messages 3) | ✅ | commit `0194d065` — 3-panel conversation→chain→detail |
| 77 | Board/Kanban triage view (Messages 4) | ✅ | commit `0194d065` — 4 columns, fingerprint cards, drag-drop |
| 78 | Facet API + histogram | ✅ | commit `0194d065` — provider/model/status/errorCategory/sourceApp counts + 24h buckets |
| 79 | Fixed duplicate url build-breaker | ✅ | commit `0194d065` — providers models route const/let url collision |
| 80 | Tray app rebuilt with new views | ✅ | cli/app bundle 62M, messages page 200 on 20130 |

### Newly Completed (2026-08-08 exhaustive audit + research)

| # | Task | Status | Evidence |
|---|------|--------|----------|
| 93 | Exhaustive no-more-bugs audit (all v1 code) | ✅ | `research/9router/21-audit-no-more-bugs.md` — 7 bugs found+fixed, 6 areas verified clean, deferred list |
| 94 | BUG-A: sequential partial PATCH clobbering | ✅ | `f7c1bf8e` — CONFIG_MERGE_KEYS vs MAP_REPLACE_KEYS; +2 tests |
| 95 | BUG-B: sourceApp /droid/i → Android misclassification | ✅ | `0a65a631` — codex-adjacency regex |
| 96 | BUG-C: health endpoint missed per-model locks | ✅ | `0a65a631` — getEarliestModelLockUntil |
| 97 | BUG-D: messages JSON filters broke pagination | ✅ | `0a65a631` — json_extract SQL filters; +5 tests |
| 98 | BUG-E: facets fetched 10k full records per load | ✅ | `378cd321` — getRequestFacets GROUP BY |
| 99 | BUG-F: histogram dropped current hour | ✅ | `378cd321` — hour-anchored buckets |
| 100 | BUG-G: status filter vocabulary (review B1) | ✅ | `ba7378db` — success/error/streaming |
| 101 | Error sweep + action items | ✅ | `research/9router/22-error-sweep.md` — E1–E6 (xAI re-auth, OpenRouter guardrails, B3/B4 deferred) |
| 102 | Refactor decisions (research-grounded) | ✅ | `research/9router/23-refactor-decisions.md` — D1–D8 (circuit breaker, SQL facets, merge semantics, retry policy, etc.) |

### Still open (documented, deferred)
- B4 cURL URL capture; 4.3/4.4 (user-owned); Error Inbox P2; user's fallback-rule view pick (D8).
- (B3 conversation grouping page-scoped — resolved 2026-08-09, DB-level aggregation, see completed §102-104)

### Newly Completed (2026-08-08 goal-mode: verify + audit + refactor + research)

| # | Task | Status | Evidence |
|---|------|--------|----------|
| 81 | Verified all 5 Messages view tabs in browser (real data) | ✅ | List/Timeline/Trace/Board render with 10 records on 20131 |
| 82 | Fixed sourceApp/userAgent persistence (2 drops) | ✅ | sub-handlers + repo record; verified app=curl |
| 83 | Fixed build-blockers from parallel work (useCallback, url dup) | ✅ | providers/page.js + providers models route |
| 84 | Code audit subagent (20+ findings) + main-session verification | ✅ | research/9router/21-messages-audit-refactor-design.md |
| 85 | Fixed 6 audit bugs (BoardView, fetch race, curl export, TimelineView, drop, tokens) | ✅ | commit `330d7230` |
| 86 | Refactor subagent report + shared messageFormats extraction | ✅ | commit `c6988820` (net -29 lines) |
| 87 | Research documented | ✅ | research/9router/21-*.md + learnings/2026-08-08-stale-server-chunkload.md |
| 88 | Stale-server ChunkLoadError diagnosed + documented | ✅ | learnings/2026-08-08-stale-server-chunkload.md |

### Newly Completed (2026-08-09 Messages audit + refactor — continuation)

| # | Task | Status | Evidence |
|---|------|--------|----------|
| 89 | Research docs: learning + ADR-007 | ✅ | learnings/2026-08-09-messages-page-audit-and-refactor.md + decisions/ADR-007-messages-json-blob-vs-messages-table.md |
| 90 | Refactor/design research report (subagent) | ✅ | useMessagesQuery hook, component extraction, P2 Error Inbox next |
| 91 | Per-request cost capture with provenance labels | ✅ | `computeCost` in requestDetail.js (exact/estimated/unavailable) + Messages Cost column + repo persistence fix; 18 tests; see CHANGELOG |

### Newly Completed (2026-08-09 compact-mode sidebar fix)

| # | Task | Status | Evidence |
|---|------|--------|----------|
| 92 | Researched compact-mode sidebar scroll issue (browser-verified root cause) | ✅ | learnings/2026-08-09-compact-sidebar-scroll-fix.md |
| 93 | Fixed mobile drawer overflow (overflow-y-auto on wrapper + h-full on aside) | ✅ | committed in `7ec60ad8`; browser-verified nav scrolls (maxScroll 282) |
| 94 | Verified desktop sidebar no regression at 1024×320 | ✅ | nav scrolls (maxScroll 362) |

### Newly Completed (2026-08-09 full-text search)

| # | Task | Status | Evidence |
|---|------|--------|----------|
| 95 | Full-text search over request payloads (FTS5 + LIKE fallback) | ✅ | commits `7ec60ad8` (feature) + `e582859a` (backup FTS exclusion): `filter.search` in requestDetailsRepo (`requestDetails_fts` virtual table populated in flush, janitor keeps it in sync, `searchMode` fts/like reported), `/api/messages` `search` param, debounced Messages search input with FTS/LIKE tag; 9 tests in `tests/unit/search.test.js`; full suite 1760 pass / 86 fail (baseline budget ≤ 89), no touched-area failures |

### Newly Completed (2026-08-09 node failover)

| # | Task | Status | Evidence |
|---|------|--------|----------|
| 96 | HA research doc (Proxmox analogy, options) | ✅ | research/9router/24-ha-mini-backup-nodes.md |
| 97 | Node failover implementation doc + L2 proxy prototype | ✅ | research/9router/25-node-failover-implementation.md, committed `bb55d754` |
| 98 | Local harness failover matrix (T1–T5) | ✅ | failover/failback/loop-protection/both-down green (doc 25 §8a) |
| 99 | Real-world failover both directions (mini-2 ↔ mini2) | ✅ | killed each node's app; proxy on down node served peer (requireLogin identity proof); endpoint continuity via /v1/chat/completions (doc 25 §8b) |
| 100 | Post-implementation scrutiny | ✅ | S11–S16: 3 real bugs (2 crash, 1 stale-probe race) + header hygiene, fixed + re-verified (doc 25 §9) |
| 101 | Redeploy hardened proxy both machines | ✅ | final matrix 200/200/200/200 |

### Newly Completed (2026-08-09 DB-level conversation aggregation + keyset pagination)

| # | Task | Status | Evidence |
|---|------|--------|----------|
| 102 | B3: DB-level conversation aggregation | ✅ | `getConversationSummary` (SQL GROUP BY over full filtered set — counts/tokens/cost correct for multi-page conversations, NULL conv → `(none)`) + `getConversationMessages` (full thread ASC, pageSize cap 500); `/api/messages?view=conversations` uses summary, `conversationId` param attaches full thread; Messages page lazy-loads threads on expand; commit `feat(messages): DB-level conversation aggregation + keyset pagination` (v1, 2026-08-09) |
| 103 | Keyset pagination for getRequestDetails | ✅ | opaque `timestamp|id` base64url cursor, `ORDER BY timestamp DESC, id DESC` with `(timestamp < ? OR (timestamp = ? AND id < ?))`, page-size+1 lookahead for hasNext, `nextCursor` in response + API `cursor` param; page-number mode kept (anchors a nextCursor too); commit `feat(messages): DB-level conversation aggregation + keyset pagination` (v1, 2026-08-09) |
| 104 | Conversation + keyset tests | ✅ | `tests/unit/conversation-keyset.test.js` — 12 tests: 3 conversations (25/2/3 rows incl. timestamp ties + NULL conv), summary counts/tokens/cost/order/`(none)`/pagination, full thread ASC, keyset walk pageSize=10 → all 30 rows exactly once (no dupes/gaps), page-param backward compat; full suite 1772 pass / 86 fail (budget ≤ 89), no touched-area failures; commit `feat(messages): DB-level conversation aggregation + keyset pagination` (v1, 2026-08-09) |

### Newly Completed (2026-08-09 B4 upstream URL capture)

| # | Task | Status | Evidence |
|---|------|--------|----------|
| 95 | Research subagent: B3/B4/Error Inbox P2 status | ✅ | B3 already done (DB-level conv aggregation); B4 feasible; P2 = server-side aggregation + coarse fingerprint |
| 96 | B4: capture upstream URL in all 8 buildRequestDetail sites | ✅ | commit `a6ffda90` — providerUrl threaded through chatCore + 5 sub-handler destructures |
| 97 | B4: persist url in repo whitelist + buildCurl uses it | ✅ | commit `a6ffda90` — placeholder fallback for legacy rows |
| 98 | B4 tests | ✅ | b4-curl-url-capture.test.js (5 tests pass) |

### Still open (documented, deferred)
- Error Inbox P2 (server-side fingerprint aggregation + triage persistence — design decision needed: coarse `provider|model|errorCategory` key vs raw-text fingerprint; see research)
- 4.3/4.4 (user-owned); user's fallback-rule view pick (D8)

### Updated (2026-08-09 — status reconciliation)

| # | Task | Status | Evidence |
|---|------|--------|----------|
| 87 | Detail drawer overflows off-screen in compact/narrow windows | ✅ RESOLVED (was ⏳ deferred) | fixed in `79c457e6` (`Drawer.js` width presets `w-[min(800px,100vw)]`); re-verified 2026-08-09 by browser subagent at 240px–1024px viewports incl. 375px/800×500 — drawer rect always on-screen |
| 88 | Detail payload `pre` not visibly scrollable | ✅ RESOLVED (was ⏳ deferred) | `min-h-0` flex chain + `pre overflow-auto` in page.js (FormatTabs); browser-verified scrollH>clientH + wrap/no-wrap toggle works |
| 89 | Vision-assisted QA of drawer at 375px | ✅ RESOLVED | covered by the same browser subagent verification (no vision needed — DOM probes at exact viewports) |
| 96 | B4: capture upstream URL in all 8 buildRequestDetail sites | ✅ | commit `a6ffda90` (parallel session); verified in-tree |
| 97 | B4: persist url in repo whitelist + buildCurl uses it | ✅ | commit `a6ffda90`; placeholder fallback for legacy rows |
| 98 | B4 tests | ✅ | b4-curl-url-capture.test.js (5 tests pass, 2026-08-09) |

### In Progress (2026-08-09 Error Inbox P2 — design → implementation)

| # | Task | Status | Evidence |
|---|------|--------|----------|
| 105 | Error Inbox P2: server-side `view=errors` aggregation + coarse-fingerprint triage (settings-KV) | 🔄 in progress | design: `research/9router/25-error-inbox-p2-design.md` (coarse `provider\|model\|errorCategory` key, reuse `/api/analyze-error`, settings-KV persistence, defer inboxIssues table) |

### Newly Completed (2026-08-10 goal-mode: Messages architecture completion)

| # | Task | Status | Evidence |
|---|------|--------|----------|
| 105 | Per-request cost capture + provenance (B6) | ✅ | `computeCost` in requestDetail.js (exact/estimated/unavailable + pricingModel), repo whitelist persists cost fields, Cost column + drawer provenance + conversation cost; commits `2867fbb9`/`738a2fe2`; 18 tests |
| 106 | Full-text search FTS5 + LIKE fallback | ✅ | `requestDetails_fts` virtual table, sanitizeFtsTerm, LIKE fallback for sql.js, searchMode tag, debounced UI search; commits `7ec60ad8`/`e582859a`/`8bdff46c`; 9 tests |
| 107 | DB-level conversation aggregation (B3) | ✅ | `getConversationSummary` (GROUP BY full dataset, NULL→(none)) + `getConversationMessages` (full thread); `/api/messages?view=conversations`; commit `ad0a241a`; 12 tests |
| 108 | Keyset pagination | ✅ | opaque timestamp\|id cursor, ORDER BY timestamp/id DESC, pageSize+1 lookahead, nextCursor; page-number mode kept; commit `ad0a241a` |
| 109 | **FIX: extractText client/server boundary** | ✅ | `src/lib/extractText.js` server-safe module; requestDetailsRepo imports it; messageFormats re-exports; **E2E-verified capture persists** (was silently dropping every row) |
| 110 | **FIX: conversations ReferenceError** | ✅ | `let conversations = []` declared in messages route (was 500ing search API); E2E-verified search + cost column |
| 111 | B4 upstream URL capture + Error Inbox P2 | ✅ | by other agents (`a6ffda90`/`9a217338`/`3cddabec`) — real URLs in curl, server-side error triage |
| 112 | Full-suite regression | ✅ | **1794 pass / 86 fail** (within 88 baseline); search 9/9, cost 18/18, keyset 12/12 |

### Newly Completed (2026-08-10 Inbox render + provider-name crash fixes)

| # | Task | Status | Evidence |
|---|------|--------|----------|
| 113 | **FIX: Inbox empty-state ordering** | ✅ | `16d81223` — InboxView branch moved before messages-empty check; errors view rendered wrong "No messages" empty state when error groups existed (errors>0, messages=0) |
| 114 | **FIX: provider-name object → React #31** | ✅ | `16d81223` — providerNames mixes AI_PROVIDERS config OBJECTS + node name strings; rendering object as child crashed all views. `resolveProviderName()` helper (string \| .name \| fallback) added to InboxView/BoardView/TimelineView |
| 115 | Browser-verified all 6 tabs | ✅ | List/Conversations/Timeline/Trace/Board/Inbox render real data: OpenAI + OpenAI Codex resolved, rate_limit group ×62 with triage columns |

### Newly Completed (2026-08-10 failover production hardening)

| # | Task | Status | Evidence |
|---|------|--------|----------|
| 106 | Automated failover proxy test suite | ✅ | `tests/unit/failover-proxy.test.js` — 6 tests (spawns real proxy, T1–T6), 6/6 ×3 runs |
| 107 | Bug A: failover never engaged under launchd | ✅ | mDNS fe80:: + macOS Local-Network TCC blocks LAN for launchd jobs → switched peers to Tailscale IPs (100.96.109.61/100.77.55.46); verified from launchd job; doc 25 §10 |
| 108 | Bug B: no auto-restart (app+proxy died overnight) | ✅ | launchd agents `com.9router.{app,failover}` on BOTH machines (KeepAlive); kill→respawn→200 in <12s verified |
| 109 | End-to-end failover verification (launchd-managed) | ✅ | sustained outage failover+failback both directions (identity-proven via requireLogin); final matrix 200/200/200/200; runbook updated |

### Still open (documented, deferred)
- **mini (3rd node) unreachable** — no ping/SSH (off or off-network); SSH key-auth blocked. Needs user action to join as node 3.
- 4.3/4.4 (user-owned); D8 fallback-rule view pick; L1 in-app peerNodes.

### Newly Completed (2026-08-10 test authenticity + browser QA fixes)

| # | Task | Status | Evidence |
|---|------|--------|----------|
| 116 | Test-suite authenticity audit (subagent) | ✅ | 7 files audited: NO fake/tautological tests — all real code + real SQLite + hand-computed assertions; one weak spot (token helpers tested a copy) |
| 117 | **FIX: token helpers drift** | ✅ | `3843de58` — extracted to src/shared/tokenHelpers.js; component + test both import real module (drift impossible) |
| 118 | **FIX: conversation thread expand (stale closure + pageSize)** | ✅ | `754aa60e` — openRef toggle + start-closed + pageSize 500→100 (API rejects >100) |
| 119 | **FIX: Trace view crash** | ✅ | `b2fe901f` — conv.messages undefined crash; guarded + onExpand wired to loadThread |
| 120 | Browser functional QA (all 6 tabs) | ✅ | List filters/drawer/formats, Conversations expand, Timeline chart, Board drag (New→Investigating verified), Inbox triage persists across reload |
| 121 | Visual QA via qwen-3.5-omni-plus | ✅ | dialagram/qwen-3.5-omni-plus vision: List/Inbox/Timeline/Board reviewed — no real layout bugs (API-key-as-node-name is data config, not code) |

### Newly Completed (2026-08-10 L1 peer forwarding + remaining work)

| # | Task | Status | Evidence |
|---|------|--------|----------|
| 122 | **L1 in-app peer forwarding (settings.peerNodes)** | ✅ | `1be5e96c` — custom-server.js hook: /v1* + local degraded + healthy peer → forward (streaming-safe, loop-protected); local probe uses actual port (fixed env-PORT bug); 5/5 decision tests + E2E forward verified |
| 123 | No local model loading confirmed | ✅ | Only Hermes MCP watchdogs on this Mac; vision used remote dialagram gateway; mini2 (100.96.109.61) reachable + serving 20128/20142 |
| 124 | Failover doc updated (L1 marked implemented) | ✅ | research/9router/25-node-failover-implementation.md §9.2 |

### Still open (documented, deferred)
- **mini (3rd node) unreachable** — needs user action (off/off-network)
- 4.3/4.4 (user-owned); D8 fallback-rule view pick

### Newly Completed (2026-08-10 model-serving policy — remote-only inference)

| # | Task | Status | Evidence |
|---|------|--------|----------|
| 125 | Model-serving policy: control-plane Mac never runs inference | ✅ | `fdf82774` — `OLLAMA_LOCAL_DEFAULT_HOST` env override in `config/providers.js` (per-credential baseUrl wins); this Mac's launchd app plist sets it to `http://100.96.109.61:11434` (mini2 Tailscale IP, launchd-safe) |
| 126 | Bare `qwen2.5*`/`llama3*` names infer provider `ollama-local` | ✅ | `fdf82774` — `MODEL_PREFIX_PROVIDERS` in `services/model.js` (previously fell back to openai) |
| 127 | Keyless virtual `ollama-local` provider | ✅ | `fdf82774` — registry category `free` + `noAuth: true` → auth.js `FREE_PROVIDERS` injection (mirrors `9router` provider pattern) |
| 128 | Streaming via OpenAI-compatible endpoint | ✅ | `fdf82774` — executor: stream → `{host}/v1/chat/completions` (real SSE) + `responseFormat:"openai"`; non-stream → native `/api/chat` (NDJSON blocked by SSE pipeline) |
| 129 | Ollama 0.32.7 installed on mini2 | ✅ | standalone binary `~/.local/bin/ollama` — extract WHOLE `ollama-darwin.tgz` (flat layout incl. llama-server + libggml dylibs; missing runtime → "llama-server binary not found"); launchd `com.9router.ollama` (`OLLAMA_HOST=0.0.0.0:11434`, KeepAlive); `qwen2.5:3b` pulled (1.93 GB, Q4_K_M) |
| 130 | Same dashboard API key on both nodes | ✅ | one Bearer key works on mini-2 + mini2 (DB synced) — authenticates the whole failover chain |
| 131 | E2E: ollama path verified end-to-end | ✅ | non-stream + stream via this Mac app (:20130), via failover proxy (:20142), on mini2's app (:20128); ultimate failover (local app killed → proxy → mini2 app → mini2 ollama) OK; targeted tests 18/18 |
| 132 | Linux box join | ⏳ deferred | SSH key access denied on `exo` (100.80.99.11) and `hass` (100.127.34.40); exact commands documented in research/9router/27-model-serving-policy.md §5 + runbook |

### Newly Completed (2026-08-11 mini2 proper install + full test)

| # | Task | Status | Evidence |
|---|------|--------|----------|
| 125 | **PROPER packaged install on mini2** | ✅ | `npm run pack:cli` → 9router-0.5.50.tgz → `npm install -g` on mini2 → app runs from `~/.local/lib/node_modules/9router/app` (launchd-managed, persists reboot); postinstall self-heal ran |
| 126 | Full test matrix on mini2 | ✅ | auth, /v1 (chat stream+non-stream via ollama-local qwen2.5:3b, api/chat, responses, count_tokens, models), all dashboard pages 200, Messages 6 views, settings surface, observability, L2 failover (kill→peer→failback), loop protection, models CRUD, cli-tools, proxy-pools, export, headroom, KeepAlive respawn |
| 127 | Install semantics documented | ✅ | workspace memory `9router-install-semantics.md` + runbook updated + plan completed |

### Still open (documented, deferred)
- mini (3rd node) unreachable; 4.3/4.4 (user-owned); D8 fallback-rule view pick

### Newly Completed (2026-08-11 post-install verification)

| # | Task | Status | Evidence |
|---|------|--------|----------|
| 128 | Model routing verified (this Mac → mini2 ollama) | ✅ | plist OLLAMA_LOCAL_DEFAULT_HOST=100.96.109.61:11434; bare qwen2.5:3b → "Hello." from mini2; no local inference procs |
| 129 | L1 forward verified (parallel sandbox) | ✅ | peerNodes→mini2:20128; forwarded req captured in mini2 requestDetails |
| 130 | Health matrix + identities | ✅ | LOCAL 200 / MINI2 200 / proxies 307; local=false mini2=true |
| 131 | Parallel commits reviewed | ✅ | 24a50108 (L1 closure), fdf82774 (remote-only models), d17efe41 (policy doc), baseline judge fixes |

### Still open (documented, deferred)
- mini (3rd node) unreachable; 4.3/4.4 (user-owned); D8 fallback-rule view pick

---

## UPDATE 2026-08-11 (late — failover gap fixes + cleanup)

| # | Task | Status | Evidence |
|---|------|--------|----------|
| 75 | Diagnose "why 4 9router instances" | ✅ | app (:20130) + proxy (:20142) + tray + L1 sandbox (/tmp/9r-l1-final, already gone) |
| 76 | Cleanup: single app in application folder | ✅ | removed stale hermes install (v0.4.71) + disabled com.9router.autostart; one app + proxy + tray remain |
| 77 | Fix API key parity (failover blocker) | ✅ | mini2 plist had custom API_KEY_SECRET → CRC mismatch → 401 on failover; removed custom secret + synced key; direct+proxy 200 |
| 78 | Fix L1 settings-load boot failure | ✅ | l1LoadSettings ran before DB ready → silent off; added retry w/ backoff; new boot clean; tests 6/6 |
| 79 | Configure local peerNodes (mutual L1) | ✅ | local `[]` → `["http://100.96.109.61:20128"]`; mini2 already had local |
| 80 | Real-world failover both directions | ✅ | kill local → proxy serves mini2; kill mini2 → proxy serves local; respawn <12s; matrix 200/200/200/200 |
| 81 | Verify mini2 has latest code | ✅ | mini2 npm app (01:32) ≥ local cli/app (01:29); both have L1; proxies identical MD5 |

### Newly Completed (2026-08-11 final verification — L1 auth root cause + Phase 4.7)

| # | Task | Status | Evidence |
|---|------|--------|----------|
| 132 | L1 live-forward auth root-caused | ✅ | mini2 rejected the forwarded local key with `API key required for remote API access`; root cause: keys validate against the **node's own apiKeys table** — the local key isn't in mini2's DB. mini2's own key (`sk-27fdade3183df58f-49xrit-9d777d52`, machineId `27fdade3183df58f`) → direct remote 200 "OK" |
| 133 | L1 live-forward FINAL proof (end-to-end) | ✅ | sandbox peerNodes=[mini2:20128] + mini2 key → 200 "OK"; mini2 requestDetails **14→15**, newest row `ollama-local\|qwen2.5:3b\|2026-08-11T19:12:35`. Negative control (peerNodes=[], OLLAMA_LOCAL_DEFAULT_HOST) → 200 served locally, mini2 count unchanged (15). DB restored peerNodes=`[]` |
| 134 | Phase 4.7 live feature tests (subagent) | ✅ | 7/7: cli-tools all-statuses (14 tools), models CRUD round-trip + alias-collision 400, usage providers/history/request-logs 200, console-logs GET/DELETE/GET, health+providers 200, unit 27/27, regression judge exit 0 — **0 NEW** (86 known) |

### Still open (documented, deferred)
- mini (3rd node) unreachable; 4.3/4.4 (user-owned); D8 fallback-rule view pick

---

## UPDATE 2026-08-13 (OpenRouter "Refresh Models" stuck-forever bug)

| # | Task | Status | Evidence |
|---|------|--------|----------|
| 135 | Reproduce/diagnose stuck "Refresh Models" button | ✅ | Live `curl` (not static review) against running dev server: `/api/providers` found the stored OpenRouter connection; `/api/providers/{id}/models?refresh=1` returned 410 models in ~1s — ruled out backend route, stored key, and upstream API |
| 136 | Root-cause the actual hang mechanism | ✅ | `handleImportModels` called `handleAddCustomModel` per model, which does POST + full `fetchCustomModels()` refetch + event dispatch, all sequential — 800+ serial round trips for 410 models with no progress UI |
| 137 | Fix: bounded-concurrency import + single refetch + progress UI | ✅ | `page.js` `handleImportModels` rewritten: dedupe once up front, 8-way concurrent POSTs, one `fetchCustomModels()`/event dispatch at the end, button shows `Importing N/Total...` |
| 138 | Verify fix without regressing other call sites | ✅ | `handleAddCustomModel` left untouched (still used by Qoder import, manual add, `ModelSelectModal`); `npx eslint` on `page.js` shows only pre-existing unrelated `set-state-in-effect` warnings |
| 139 | Document findings | ✅ | `CHANGELOG.md` UPDATE 2026-08-13, `SESSION-HISTORY.md` session entry, `learnings/2026-08-13-openrouter-refresh-models-serial-import-hang.md` |

### Still open (documented, deferred)
- Live browser click-through re-verification of the fixed button (backend/API
  behavior confirmed via curl; UI interaction not yet re-tested in-browser this
  session)

## 2026-09-17 — chat-log missing-task reconciliation
- [x] Review full chat log (state.db sessions referencing 1544031399110119588) for unrecorded tasks
- [x] Create 5 RETRO reconciliation cards (pr-3610, pr-3625, multi-protocol, pr3604-review, BUG-ERR-02)
- [x] Create RETRO dual-instance research card (28-dual-instance-conflicts-and-cleanup.md)
- [x] Create OPS chat-log-review tracking card
- [x] Add HOST-ISOLATION block to board.json description
- [x] Subscribe all 7 new cards to thread 1544031399110119588
