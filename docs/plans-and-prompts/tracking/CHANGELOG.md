# CHANGELOG — Smart Router & Observability Session

## 2026-09-21 — Final verification pass (routing-exp structure + import plans review note)

**Actions taken:**
- Re-ran structural verification on all **61 routing-exp docs** (`2026-09-17-routing-exp-*.md`): every doc has exactly 1× `## L1` … `## L6`, 1× `## Confidence`, 1× `## Sources` — **61/61 pass**.
- Re-ran review-note verification on all **20 import plans** (`impl-plan-import-*.md`): every plan carries the **AGENT REVIEW NOTE** — **20/20 pass**.
- Mapped routing-exp roots (R01–R61) to code-bearing plan coverage: all topics are covered by the 222-plan series (e.g. session-affinity → plan 144, win-probability → plan 175, POMDP → plan 132, eval → plans 07/148/149/187, cascade → plans 02/90/133/137/152/182/183/196). External-system roots (RouteLLM, RouterBench, FrugalGPT, AutoMix, Tryage, ClawRouter, coai, OpenRouter, LiteLLM) are research sources whose findings feed the impl-plan series — no separate code-bearing plans needed.

**Status:** All research streams verified gapless and structurally complete. Implementation deferred — awaiting user go-ahead.

## 2026-09-20 — Hermes import plans 01–20 grounding pass complete (all verified against real codebase)

**Directive (Chris):** "make sure that the plans are grounded and fully complete then with all the needed parts of what a plan for programming would require all the way down to the individual functions code and what each is supposed to do and set up and be there for and framework architectures etc."

**Actions taken:**
- Rewrote all 20 implementation plans (`research/9router/impl-plan-import-01…20-*.md`) with the full grounding treatment:
  - **AGENT REVIEW NOTE (READ FIRST)** block — research document, code is SUGGESTION/OPTION, nothing implemented automatically
  - **Grounding table** — verified facts with real file paths (adapter API, migration format, real module locations)
  - **Function-by-function breakdown tables** — every function's purpose + return value
  - **Per-part Steps with verification commands** — each step has a runnable check
  - **Dependencies & Risks** table + **Verification commands** + **Note to Implementing Agents** footer
- Verified every code snippet against the real codebase; fixed grounding errors:
  - Migration format `export default {version, name, up(db)}` (not `export const up`)
  - Adapter API `db.run/get/all/exec` positional params (no `.prepare()`, no named `@param`)
  - `all_messages` view uses JSON1 `json_extract` on `requestDetails.data` (no `request_json` columns)
  - `SCHEMA_VERSION` bump 3→4 required
  - Real matcher source: `open-sse/providers/index.js` `PROVIDER_MODELS` (registry is `export default [...]`, no `getRegistry()`)
  - `src/config/providerModels.js` doesn't exist — real is `open-sse/config/providerModels.js`
  - Zod NOT installed — hand-rolled validation in plans 03/17/19
  - `categorizeError(status, text)` positional, lowercase categories
  - `getPricingForModel(provider, model)` — $/1M tokens (÷1,000,000)
  - `usage.json`/`log.txt` are LEGACY (`appendRequestLog` is a no-op) — live source is `usageHistory`
  - `comboRules` doesn't exist — use `getComboModelsFromData` from `open-sse/services/combo.js`
  - `decodeCursorProtobuf` doesn't exist — real exports `decodeMessage`/`parseConnectRPCFrame`
  - Existing models.dev sync (`src/lib/modelCatalog/sync.js`) — plan 18 extends, doesn't duplicate
  - Migration version collisions resolved (5–12 assigned across plans 01/02/04/10/11/12/13)
  - `matchModelToProvider` is synchronous (plan 20 tests fixed)
- Updated master map (`2026-09-17-hermes-import-master-map.md`): component map corrected to real paths, grounding-pass status table + per-plan fix table added.

**Status:** Complete. All 20 plans grounded + gapless. Implementation still deferred (code in plans is suggestions only).

## 2026-09-19 — Routing exponential expansion complete (60 roots R01–R60 + R61, all 6+ levels)

**Directive (Chris):** "binary tree expansion" means a true **exponential N-ary expansion** — every phrase in a source document is a root, each root goes at least 6 levels deep, and each level can spawn hundreds of phrases to research (exponential, not 1→2→4→8).

**Actions taken:**
- Created `research/9router/2026-09-17-routing-exponential-master-map.md` (new): master map enumerating **60 roots (R01–R60)** from the main routing research — doc `37-ai-model-routing-deep-research.md` (R01–R19) + branch docs `41`–`48` (R20–R60). Additive to the strict binary trees (193 roots / 24,511 nodes / 242,852 searches); this is the full exponential body. R61 (Wu's LLM Router) added later.
- Created **61 expansion docs** `research/9router/2026-09-17-routing-exp-*.md` (R01–R61), each with L1–L6 (6+ levels), variable N-ary branching (3–15 children per node typical), Confidence & open questions, and Sources:
  - R01–R19: core decision problem, RouteLLM, RouterBench, Shnitzer, Tryage, AutoMix, FrugalGPT, Hybrid LLM, semantic routers, OpenRouter Auto Router, ClawRouter, LiteLLM gateway, coai, 9Router decision points, other repos, universal pipeline, three philosophies, key findings, 9Router implications.
  - R20–R25: learned routing (preference/benchmark data, win-probability, POMDP, data augmentation, cost-aware adaptive).
  - R26–R33: cascades & fallbacks (model cascades, provider fallbacks, escalation policies, weighted failover, cooldown/retry, retry amplification, account selection, executor retry config).
  - R34–R36: MoE (architecture, expert selection/sparse routing, MoE-aware dispatch).
  - R37–R41: gateways (architecture, load balancing, virtual models/groups, session affinity, observability).
  - R42–R45: semantic routing (vector-space, embedding, prompt routing, vLLM Semantic Router).
  - R46–R49: evaluation (RouterBench, cost-quality tradeoffs, model ranking, eval harness).
  - R50–R57: 9Router internals (executors, translator engine, providers registry, OAuth lifecycle, error systems, MITM security, enforcement layers, gap/divergence).
  - R58–R60: frontier (emerging techniques, frontier research, future directions).
  - R61: Wu's LLM Router (renamed from an earlier R16 draft to resolve the naming conflict).
- Master map status table updated: all 12 batches ✅.
- `research/README.md` updated: routing exponential family (master map + 60 expansion docs) added to contents.
- **Audit verified:** 61/61 docs have L1–L6 + Confidence + Sources sections (grep-verified).

**Key findings:**
- The main routing research previously had ONLY the strict binary tree — the exponential N-ary expansion was the missing piece the user's clarification targeted (governance E01–E26 and webhook R01–R48 families already had theirs).
- With average branching 4: 60 × (4^6 − 1)/3 ≈ 81,900 nodes; branching 6: ≈ 560,000 nodes.

**Status:** Complete. All 61 expansion docs exist and are format-verified.

## 2026-09-18 — All 222 research impl-plans now have code-bearing counterparts (gap-filling complete)

**Directive (Chris):** every research implementation plan must have a code-bearing counterpart — reference code down to file level, plus the mandatory "Note to implementing agents (READ FIRST)" block telling agents the code is for review, that they should decide if there are better ways to implement, and make those changes happen.

**Actions taken:**
- Created code-bearing plans **37–198** (research impl-plan series) — reference JS code (repos, migrations, services, routes, dashboard pages, tests), Dependencies & Risks tables, Verification steps.
- Created code-bearing plans **199, 200, 203, 204** (final numbered gaps): retry-storm mitigation & bundling, load-balancing strategies deep dive, per-request override mechanism, sandbox environment coexistence.
- Created code-bearing plans **import-01–20** (Hermes message import series): DB schema, provider matching, import API, log-file tail, Hermes hook, error reconstruction, cost calculation, messages-page UI, observability export, multi-tenant import, scheduler, retention lifecycle, deduplication/idempotency, format adapters, streaming/realtime, analytics, agent adapters, model catalog sync, API contracts/SDKs, quality & rollout.
- **Gap audit verified:** 222 research plans (impl-plan-01…204 minus 201/202, plus import-01…20) → **222 code-bearing counterparts, ZERO remaining gaps**.
- `planning/README.md` index extended with "Research impl-plan code versions (37–204)" and "(import-01–20)" tables.
- Tracking files updated (TASKS.md, CHANGELOG.md, SESSION-HISTORY.md).

**Key findings:**
- Research plans 201 and 202 have no source files (numbering gap) — no code versions exist.
- Three apparent "missing" counterparts were false positives from slug renames (`02-cascade-fallback`, `14-message-driven-tools-protocol`, `74-model-version-pinning-rollback`).
- Every code-bearing plan carries the agent-review note; overlap between plans is intentional per user directive.

**Status:** All 222 code-bearing plans complete. Code implementation deferred — awaiting user go-ahead.

## 2026-09-17 15:57 — Shared-worktree rule + branch reconciliation (v3)

**Directive (Chris, 2026-09-17):** All cards work in ONE shared card worktree
`/Users/chris/Documents/GitHub/9router-wt-cards` (branch `card-work-v3`, branched from v3).
Cards are FORBIDDEN from the main worktree (`/Users/chris/Documents/GitHub/9router`), from
changing its branch, and from creating branches there. Feature branches allowed ONLY inside
the shared worktree; all tested work merged into v3 from the shared worktree.

**Actions taken:**
- Created shared card worktree `9router-wt-cards` on branch `card-work-v3` from v3.
- Policy doc updated with shared-worktree rule; committed on v3 (0d666c2d, merge 7f8717eb).
- All 13 open card bodies + all 3 board descriptions updated with SHARED-WORKTREE block.
- hermesResearch mirror + agent memory updated.
- Reconciled stranded branches into v3 (policy: reconcile INTO v3, never master):
  - BUG-ERR-02 (`a236b6b3`) -> merged (fd50eeb4) — card t_bfabba37 done but stranded
  - pr-3610 (`f9b271d8`) -> merged (c9d9bfc4)
  - pr-3625 (`13784656`) -> merged (aa529821)
  - feat/multi-protocol-custom-providers (`7d669a44`) -> merged (4dc8da37)
  - pr3604-review (New Models discovery) -> merged (d1b889b3) with conflicts resolved:
    kept SCHEMA_VERSION 3 + both message-facets/annotations AND seen-models;
    renamed migration 002-seen-models.js -> 005-seen-models.js (internal version 2 -> 5)
    to avoid collision with 002-fk-provider-connections.
- Main worktree left on v4-vscode-works with branch UNCHANGED; my erroneous merge aborted + residue unstaged/restored.


**Date:** 2026-08-05 → 2026-08-06
**Author:** GitHub Copilot agent (main session)
**Status:** active
**Tags:** changelog, session

---

## 2026-09-17 — Definitive branch/worktree audit (answers: did cards create branches?)

### audit result
- **Branches created in this repo (reflog evidence, `git reflog --all`):**
  - `v3` created from `v2` on 2026-09-16 16:52 (policy action — intended).
  - `master-backup-20260914`, `v2` (from v1), and ~45 task branches (gap-*/bug-*/sec-*/9router/t_*)
    all created **2026-09-10 → 2026-09-14, BEFORE the v3 policy** — merged into `v2` on 09-14 and
    left behind. They are frozen leftovers, NOT active work.
  - **No branch and no worktree was created on or after 2026-09-16 16:52 (policy moment) by any card.**
- **Worktrees present (36 total):** all registered before the policy; belong to the same frozen
  leftovers. `v2-wt` (detached at v2 tip) + `pr3607-wt` (feat/multi-protocol) exist but were not
  touched by this session.
- **Master / v2 / v3:**
  - `master = 17c4cc76` (dates from 2026-09-14 origin/master) — never committed to after policy.
  - `v2 = d7a9ee5d` — byte-identical to policy-moment (frozen, verified repeatedly).
  - `v3 = 1d12566e` — sole write branch; carries 10 policy/QA commits on top of v2 tip.
  - `git log v2..v3` = only the 6 policy/QA commits + 4 PR-3599 memory-module commits (additive
    feature work done on v3 after policy — intended).
- **Open cards with pre-policy worktrees flagged (kanban comments):** `t_02fa41a6`
  (security/3673-settings-mass-assignment), `t_828425aa` (bug-3692/claude-model-echo) — bodies +
  comments now say DO NOT use the old worktree; work on v3 only.

## 2026-09-16 — Mandatory QA gate added to branch policy (card self-verification)

### directive: cards must verify their own work
- Chris directive: every card must scrupulously QA its own work before `done` — run the test
  suite on `v3`, functionally exercise the change against the running app (headless browser /
  curl / CLI), and record the evidence in `result`.
- QA gate added to `tracking/GIT-BRANCH-POLICY.md` ("Mandatory QA gate") and injected as a
  `<!-- CARD-QA-GATE-START -->` block into every open card body on the `9router` board plus the
  board descriptions of `9router`, `9router-mcp-hub-kanban`, `9router-mcp-hub-skills`.
- Audit finding (evidence): of the last 130 completed cards, only **3** carry explicit test/QA
  evidence in their `result`; **127** record only a title-level summary. Historical gap recorded
  so future cards are held to the gate.
- Test suite state on `v3` (measured): `tests/` vitest run → **76 failing tests across 29 files**
  (pre-existing; e.g. `unit/cursor-agent-proto.test.js` fails identically on `v2` because
  upstream `open-sse/utils/cursorProtobuf.js` lacks `encodeAgentValue`/`encodeMcpToolDefinition`;
  `unit/security-audit.test.js` has a path bug expecting `tests/src/...`). No card may report
  green while these are unbaselined — baseline them first.
- Functional check (live): dashboard on `:20127` — `/api/health` 200, `/` 307→login, `/login` 200,
  rendered title "9Router - AI Infrastructure Management" (headless Edge via CDP).

## 2026-09-16 — v3 branch policy (branch isolation) + completed-card record

### docs(policy): branch isolation
- `tracking/GIT-BRANCH-POLICY.md` (new): canonical branch policy — ALL work on `v3`; NO agent-created branches or worktrees; NO merge to `master` without explicit Chris instruction; `v2` frozen read-only.
- `tracking/decisions/ADR-011-v3-branch-isolation.md` (new): ADR for v3 sole-write-branch decision (context, alternatives, reversibility).
- Branch `v3` created 2026-09-16 as exact copy of `v2` (`d7a9ee5d`, tree `7b164f57`).
- Completed-card records written to `~/Documents/hermesResearch/9router/V3/` (24h/48h verdict = ZERO; 7-day list = 130 cards; merge disposition).

## 2026-09-16 — Hermes Message Import Research + Deep-Research Skills

### docs(research): Hermes message import research
- `research/2026-09-16-hermes-message-import-research.md` (new): import external agent traffic (Hermes/Claude Code/Cursor/Codex) into 9Router observability — provider matching by model name, normalization, error reconstruction, DB schema, integration points.

### skills: 2 new skills
- `skills/9router-research/SKILL.md` (new): combined deep-research skill — Skill Reaping (harvest chat logs/session store/debug logs/research docs), Skill Seeking (discover tools/skills), 6-Level Binary Tree Research Method (4 evolutionary variants), Hermes Message Import design.
- `skills/9router-message-import/SKILL.md` (new): message import feature skill — import sources, API, provider matching pipeline, normalization, error reconstruction, DB schema, implementation steps.
- `skills/README.md` (updated): both new skills added to the table.

## 2026-09-15 — Interpretation Layer + Code-Bearing Implementation Plans (all 36 research impl-plans + 5 feature-area plans)

### docs(interpretation): 3 topics interpreted — 12 docs
- `interpretation/2026-09-15-governance-interpretation-guide.md` (new): keyless governance — intent, doc map, summary, reading order, next steps.
- `interpretation/2026-09-15-governance-doc-by-doc.md` (new): plain-language summary of every governance doc.
- `interpretation/2026-09-15-governance-synthesis.md` (new): distilled governance knowledge + design decisions + open questions.
- `interpretation/2026-09-15-governance-order-and-next-steps.md` (new): timeline, reading order, build order.
- `interpretation/2026-09-15-message-capture-interpretation-guide.md` (new): message capture/filtering — intent, doc map, summary, reading order, next steps.
- `interpretation/2026-09-15-message-capture-doc-by-doc.md` (new): plain-language summary of every message-capture doc.
- `interpretation/2026-09-15-message-capture-synthesis.md` (new): distilled message-capture knowledge + design decisions + open questions.
- `interpretation/2026-09-15-message-capture-order-and-next-steps.md` (new): timeline, reading order, build order.
- `interpretation/README.md` (updated): contents table now lists all 3 topics (webhook, governance, message-capture); conventions updated.

### docs(planning): 36 code-bearing impl-plans (research impl-plan 01–36 counterparts)
Every plan includes reference JS code (repos, migrations, services, routes, dashboard pages, tests), a Dependencies & Risks table, Verification steps, and the mandatory **Note to implementing agents (READ FIRST)** — code is a starting point for review; agents MUST review, decide better ways, make changes, verify, and update the plan.
- `planning/2026-09-15-impl-plan-01-learned-routing-code.md` (new)
- `planning/2026-09-15-impl-plan-02-cascade-fallback-code.md` (new)
- `planning/2026-09-15-impl-plan-03-semantic-routing-code.md` (new)
- `planning/2026-09-15-impl-plan-04-cost-quality-optimizer-code.md` (new)
- `planning/2026-09-15-impl-plan-05-gateway-interop-code.md` (new)
- `planning/2026-09-15-impl-plan-06-moe-aware-dispatch-code.md` (new)
- `planning/2026-09-15-impl-plan-07-eval-harness-code.md` (new)
- `planning/2026-09-15-impl-plan-08-routing-observability-code.md` (new)
- `planning/2026-09-15-impl-plan-09-error-failover-hardening-code.md` (new)
- `planning/2026-09-15-impl-plan-10-security-mitm-hardening-code.md` (new)
- `planning/2026-09-15-impl-plan-11-oauth-credential-lifecycle-code.md` (new)
- `planning/2026-09-15-impl-plan-12-ux-dashboard-code.md` (new)
- `planning/2026-09-15-impl-plan-13-runtime-enforcement-code.md` (new)
- `planning/2026-09-15-impl-plan-14-message-driven-tools-protocol-code.md` (new)
- `planning/2026-09-15-impl-plan-15-goal-systems-integration-code.md` (new)
- `planning/2026-09-15-impl-plan-16-divergence-malformed-response-code.md` (new)
- `planning/2026-09-15-impl-plan-17-node-failover-networking-code.md` (new)
- `planning/2026-09-15-impl-plan-18-model-serving-policy-code.md` (new)
- `planning/2026-09-15-impl-plan-19-unified-error-system-code.md` (new)
- `planning/2026-09-15-impl-plan-20-gap-merge-master-coding-rule-code.md` (new)
- `planning/2026-09-15-impl-plan-21-multi-account-quota-code.md` (new)
- `planning/2026-09-15-impl-plan-22-streaming-reliability-code.md` (new)
- `planning/2026-09-15-impl-plan-23-prompt-response-caching-code.md` (new)
- `planning/2026-09-15-impl-plan-24-rate-limiting-abuse-code.md` (new)
- `planning/2026-09-15-impl-plan-25-cloud-sync-multidevice-code.md` (new)
- `planning/2026-09-15-impl-plan-26-token-optimization-context-code.md` (new)
- `planning/2026-09-15-impl-plan-27-combo-fallback-rules-engine-code.md` (new)
- `planning/2026-09-15-impl-plan-28-embeddings-vectorstore-code.md` (new)
- `planning/2026-09-15-impl-plan-29-cli-launcher-packaging-code.md` (new)
- `planning/2026-09-15-impl-plan-30-i18n-localization-code.md` (new)
- `planning/2026-09-15-impl-plan-31-performance-latency-code.md` (new)
- `planning/2026-09-15-impl-plan-32-test-coverage-ci-code.md` (new)
- `planning/2026-09-15-impl-plan-33-documentation-knowledge-base-code.md` (new)
- `planning/2026-09-15-impl-plan-34-provider-registry-models-code.md` (new)
- `planning/2026-09-15-impl-plan-35-data-privacy-compliance-code.md` (new)
- `planning/2026-09-15-impl-plan-36-model-comparison-leaderboard-code.md` (new)
- `planning/README.md` (updated): contents table now lists all 5 feature-area code-bearing plans + all 36 impl-plan code versions.

### docs(tracking): TASKS.md updated with interpretation + code-bearing plan sections.

---

## 2026-09-15 — Webhook Implementation Plans, Full Coverage (29 code-level plans)

### docs(planning): 21 new plans — every research root R01–R48 now covered
- `planning/2026-09-15-webhook-dead-mans-switch-plan.md` (new): R25 — heartbeat monitor, missed-window alert, cooldown dedupe. AGENT REVIEW NOTE included.
- `planning/2026-09-15-webhook-stripe-model-plan.md` (new): R26 — Stripe-style envelope, Idempotency-Key, type allowlist, replay endpoint. AGENT REVIEW NOTE included.
- `planning/2026-09-15-webhook-github-model-plan.md` (new): R27 — X-GitHub-Event/Delivery, X-Hub-Signature-256 hex, ping handling. AGENT REVIEW NOTE included.
- `planning/2026-09-15-webhook-hookdeck-ingress-plan.md` (new): R29 — catch-all ingress, source registry, per-source format dispatch. AGENT REVIEW NOTE included.
- `planning/2026-09-15-webhook-apprise-adapter-plan.md` (new): R20 — Apprise URL adapter, Option A (npm) vs Option B (native) — agent decides. AGENT REVIEW NOTE included.
- `planning/2026-09-15-webhook-pubsub-core-plan.md` (new): R30 — typed event bus, wildcard, fail-open, outbox bridge. AGENT REVIEW NOTE included.
- `planning/2026-09-15-webhook-message-queue-plan.md` (new): R32 — queue adapter, BullMQ (Redis) vs in-process, drop-oldest backpressure. AGENT REVIEW NOTE included.
- `planning/2026-09-15-webhook-sse-feed-plan.md` (new): R33 — SSE stream endpoint, heartbeat, client hook. AGENT REVIEW NOTE included.
- `planning/2026-09-15-webhook-websocket-feed-plan.md` (new): R34 — WS hub, broadcast, ping/pong cleanup. AGENT REVIEW NOTE included.
- `planning/2026-09-15-webhook-long-polling-plan.md` (new): R35 — cursor-based long-poll, 25s hold, batch return. AGENT REVIEW NOTE included.
- `planning/2026-09-15-webhook-n8n-workflows-plan.md` (new): R37 — workflow DAG executor, trigger/transform/condition/action nodes. AGENT REVIEW NOTE included.
- `planning/2026-09-15-webhook-nodered-flows-plan.md` (new): R38 — message-passing flows, inject/function/switch/http/notify nodes. AGENT REVIEW NOTE included.
- `planning/2026-09-15-webhook-pipedream-steps-plan.md` (new): R39 — linear step runner, steps.<name> state, $ context. AGENT REVIEW NOTE included.
- `planning/2026-09-15-webhook-huginn-agents-plan.md` (new): R40 — scheduled agents, watch/schedule/digest types, event chaining. AGENT REVIEW NOTE included.
- `planning/2026-09-15-webhook-inngest-functions-plan.md` (new): R41 — code-first functions, trigger matching, retries, step.run. AGENT REVIEW NOTE included.
- `planning/2026-09-15-webhook-litellm-alerts-plan.md` (new): R42 — budget/error-rate/latency/daily-report alerts. AGENT REVIEW NOTE included.
- `planning/2026-09-15-webhook-oneapi-metrics-plan.md` (new): R43 — JSON + Prometheus metrics endpoints. AGENT REVIEW NOTE included.
- `planning/2026-09-15-webhook-helicone-observability-plan.md` (new): R44 — custom properties, request.completed events, feedback endpoint. AGENT REVIEW NOTE included.
- `planning/2026-09-15-webhook-uptime-kuma-plan.md` (new): R45 — push API client, periodic heartbeat. AGENT REVIEW NOTE included.
- `planning/2026-09-15-webhook-healthchecks-io-plan.md` (new): R46 — ping client, start/fail/log endpoints. AGENT REVIEW NOTE included.
- `planning/2026-09-15-webhook-http-client-plan.md` (new): R47–R48 — webhookFetch wrapper, timeout/retry/backoff/jitter. AGENT REVIEW NOTE included.

## 2026-09-15 — Webhook Implementation Plans (code-level, agent-review notes)

### docs(planning): 8 webhook implementation plans — real code down to file level
- `planning/2026-09-15-webhook-m1-receiver-hmac-plan.md` (new): M1 receiver — `src/lib/webhooks/verify.js` (Standard Webhooks HMAC, timingSafeEqual, 5-min tolerance), `registry.js` (list/get/create/delete/rotate), `src/app/api/webhooks/[id]/route.js` (POST raw body, 401/404/405/OPTIONS), settingsRepo `webhooks: []` default. AGENT REVIEW NOTE included.
- `planning/2026-09-15-webhook-m2-outbox-worker-plan.md` (new): M2 outbox — migration `005-webhook-events.js` (webhook_events table + status index), `webhookEventsRepo.js` (insertEvent idempotent, claimPendingEvents, markDelivered/markFailed, exponential backoff 2^attempts, MAX_ATTEMPTS=5), `worker.js` (global singleton, 5s poll), instrumentation.js wiring, settingsRepo `webhookWorker` default. AGENT REVIEW NOTE included.
- `planning/2026-09-15-webhook-m3-rule-engine-actions-plan.md` (new): M3 TCA rule engine — `rules.js` (evaluateCondition and/or trees, getField dot-path, compare ops, ruleMatches, dispatchEvent with ACTION_HANDLERS), actions notify (6 Apprise schemes)/http/llm (handleChatCore reuse)/gateway/dashboard (SSE listeners), settingsRepo `webhookRules` + `notifyUrls`. AGENT REVIEW NOTE included.
- `planning/2026-09-15-webhook-m4-outbound-triggers-plan.md` (new): M4 outbound — `emitter.js` (fail-open → insertEvent), quotaAutoPing emit-on-transition dedupe (80/90/100), chatCore provider.error + fallback.used, modelCatalog model.added, `digest.js` daily spend (persisted lastSentAt), settingsRepo `webhookDigest`. AGENT REVIEW NOTE included.
- `planning/2026-09-15-webhook-m5-dashboard-ui-plan.md` (new): M5 dashboard UI — `src/app/dashboard/webhooks/page.js` + `events/page.js`, components `WebhookForm`/`RuleEditor`/`EventTable`, `src/app/api/webhooks/events/route.js` event log API. AGENT REVIEW NOTE included.
- `planning/2026-09-15-webhook-messaging-platforms-plan.md` (new): overlapping plan — Slack/Discord/Telegram platform modules, shared Slack/Discord formatter (blocks + context). AGENT REVIEW NOTE included.
- `planning/2026-09-15-webhook-push-services-plan.md` (new): overlapping plan — ntfy (public + auth), Gotify, Pushover modules via proxyAwareFetch. AGENT REVIEW NOTE included.
- `planning/2026-09-15-webhook-standards-compliance-plan.md` (new): overlapping plan — Svix header aliases, outbound signing (9router as sender), Zapier envelope. AGENT REVIEW NOTE included.

## 2026-09-15 — Exponential Phrase-Level Expansion (docs only)

### docs(research): exponential master map — N-ary expansion, 26 roots, 26 expansion docs
- `research/2026-09-15-exponential-master-map.md` (new): user clarified the expansion requirement — *every phrase in the source docs is a root*, each expanded ≥6 levels deep with **variable (N-ary) branching** (hundreds of phrases per level possible, exponential, not 1→2→4→8). 26 roots E01–E26 mapped to expansion docs; format spec (L1 sub-phrases → L2 → L3 → L4 → L5 → L6+, variable branching, node research, confidence, open questions, sources); status table with 9 batches. Additive — flat research, master tree, 16 branch docs, and 26 per-topic binary trees all kept.

### docs(research): 26 exponential expansion docs — full N-ary subtree coverage
- `research/2026-09-15-exp-e01-source-app-fingerprinting.md` (new): E01 — sourceApps.js rule engine, UA_RULES ordering, fingerprintSourceApp, DEFAULT_APP, addSourceAppRule
- `research/2026-09-15-exp-e02-task-classification.md` (new): E02 — smartRouter classifyTask, 16 task types, scoreModel, selectModels, conversationFingerprint, sticky sessions
- `research/2026-09-15-exp-e03-inbound-rate-limiter.md` (new): E03 — sliding window, LOOPBACK bypass, 429+Retry-After, sweep
- `research/2026-09-15-exp-e04-auth-api-keys.md` (new): E04 — API-key lifecycle, JWT sessions, API_KEY_SECRET, key metadata
- `research/2026-09-15-exp-e05-usage-logs.md` (new): E05 — usageDb capture pipeline, usage.json, log.txt, retention
- `research/2026-09-15-exp-e06-persistence-sqlite.md` (new): E06 — SQLite adapter chain (bun → better-sqlite3 → node → sql.js), repos, migrations
- `research/2026-09-15-exp-e07-openrouter-app-attribution.md` (new): E07 — X-App header, openrouter_metadata, app IDs
- `research/2026-09-15-exp-e08-openrouter-guardrails.md` (new): E08 — guardrail hierarchy, budget enforcement, regex constraints, 403 semantics
- `research/2026-09-15-exp-e09-openrouter-byok.md` (new): E09 — BYOK, key passthrough, provider keys
- `research/2026-09-15-exp-e10-anthropic-rate-limits.md` (new): E10 — RPM/ITPM/OTPM, tier limits, spend-cap 429 semantics
- `research/2026-09-15-exp-e11-anthropic-workspaces.md` (new): E11 — wrkspc_ keys, per-workspace limits, anthropic-workspace-id header
- `research/2026-09-15-exp-e12-anthropic-identity-keys.md` (new): E12 — WIF/App Attest, key types, expiration
- `research/2026-09-15-exp-e13-litellm-keys-teams-budgets.md` (new): E13 — virtual keys, teams, shared budgets, model groups
- `research/2026-09-15-exp-e14-agent-identity-headers.md` (new): E14 — X-9R-App/User/Session, trust model, MCP identity gap
- `research/2026-09-15-exp-e15-queue-management.md` (new): E15 — priority classes, WFQ, aging, backpressure, TTL
- `research/2026-09-15-exp-e16-attribution-dimensions.md` (new): E16 — "where from" dimensions, signal inventory, privacy
- `research/2026-09-15-exp-e17-routing-control-dimensions.md` (new): E17 — "where to" dimensions, allowlists, budgets, limits, headers
- `research/2026-09-15-exp-e18-recommended-architecture.md` (new): E18 — Phase 1 attribution, Phase 2 control, Phase 3 teams
- `research/2026-09-15-exp-e19-keyless-gating.md` (new): E19 — 10 keyless mechanisms, hybrid resolution order
- `research/2026-09-15-exp-e20-agent-profiles.md` (new): E20 — profile JSON, precedents, resolution order, profile→routing
- `research/2026-09-15-exp-e21-synthetic-source-tracking.md` (new): E21 — signal inventory, hash-only labels, behavioral fingerprints, embedding clusters
- `research/2026-09-15-exp-e22-tag-priority-queues.md` (new): E22 — strict priority/WFQ/aging, bounded FIFO, TTL 60s, 503+Retry-After, leaky bucket
- `research/2026-09-15-exp-e23-model-group-limiting.md` (new): E23 — qwen-* auto-derive, shared RPM/TPM, group cooldown, group vs combo
- `research/2026-09-15-exp-e24-adaptive-rate-control.md` (new): E24 — AIMD+EWMA+feedback hybrid, budget-proportional pacing, UI exposure
- `research/2026-09-15-exp-e25-gate-levels.md` (new): E25 — L0–L5 ladder, gate config JSON, highest-cleared-level-wins
- `research/2026-09-15-exp-e26-governance-architecture.md` (new): E26 — 7-layer model (Identity/Gate/Policy/Queue/Rate/Routing/Observability), keyless-first

---

## 2026-09-15 — Webhook Interpretation Layer (docs only)

### docs(interpretation): new category — the map over the research
- `interpretation/README.md` (new): new category explaining the interpretation layer — plain-language guides, doc-by-doc summaries, syntheses, reading/build orders. Not new research, not a plan — the map over research/planning/tracking.

### docs(interpretation): 4 webhook interpretation docs — clear, readable, ordered
- `interpretation/2026-09-15-webhook-interpretation-guide.md` (new): one-page summary, the 4 phases of work, complete doc map (23 docs), key conclusions, recommended reading order, next steps
- `interpretation/2026-09-15-webhook-doc-by-doc.md` (new): plain-language summary of every webhook doc — what it is, what it covers, key takeaways, how it fits, what to read next
- `interpretation/2026-09-15-webhook-synthesis.md` (new): distilled knowledge — verdict, 12 archetypes, recommended architecture, 10 design decisions, 48 roots → 11 branches, open questions, confidence levels
- `interpretation/2026-09-15-webhook-order-and-next-steps.md` (new): chronological timeline, logical reading order, build order (M1–M5), deferred items, open decision points

---

## 2026-09-15 — Webhook Exponential Research Expansion (docs only)

### docs(research): webhook exponential master map — N-ary expansion, 48 roots, 11 branch docs
- `research/2026-09-15-webhook-exponential-master-map.md` (new): user clarified the binary-tree requirement — *every phrase in the source docs is a root*, each expanded 6 levels deep with N children per node (not 2-way). 48 roots R01–R48 grouped into 11 branch docs; methodology table (N-ary vs 2-way), node-count summary (48 roots / 172 L1 / 439 L2 / 912 L3 / 1,759 L4 / 3,179 L5 / 5,401 L6 / 11,862 enumerated nodes); with branching factor 4 ≈ 65,520 nodes, factor 6 ≈ 448,000. Additive — flat research + 2-way master tree + 8 branch docs kept.

### docs(research): 11 exponential branch docs — full N-ary subtree coverage
- `research/2026-09-15-webhook-exp-01-receiver-transport.md` (new): R01–R04 — receiver modes, raw body, payload limits, response contract, idempotency keys, replay protection
- `research/2026-09-15-webhook-exp-02-auth-secrets.md` (new): R05–R08 — HMAC, timing-safe compare, secret rotation, dual-secret grace, local-only, TLS/mTLS
- `research/2026-09-15-webhook-exp-03-event-store-worker.md` (new): R09–R11 — transactional outbox, status machine, worker polling, backoff, dead-letter, at-least-once
- `research/2026-09-15-webhook-exp-04-rule-engine-actions.md` (new): R12–R14 — TCA model, JSON rules, field/op/value ops, JSONPath, action types, LLM action, idempotent actions
- `research/2026-09-15-webhook-exp-05-messaging-platforms.md` (new): R15–R17 — Slack, Discord, Telegram inbound/outbound, retry semantics, rate caps
- `research/2026-09-15-webhook-exp-06-push-services.md` (new): R18–R20 — ntfy, Gotify, Apprise, tag routing, priority/escalation
- `research/2026-09-15-webhook-exp-07-internal-events.md` (new): R21–R23 — quota events, provider error spikes, fallback events, emit-on-transition dedupe
- `research/2026-09-15-webhook-exp-08-scheduled-monitoring.md` (new): R24–R25 — daily digests, dead man's switch, watchdog over instrumentation.js jobs
- `research/2026-09-15-webhook-exp-09-standards-infra.md` (new): R26–R29 — Standard Webhooks, Svix, Hookdeck, OpenAPI, event schemas, delivery guarantees
- `research/2026-09-15-webhook-exp-10-patterns-platforms.md` (new): R30–R46 — 17 roots: event-driven patterns, automation platforms, gateway precedents, monitoring, messaging archetypes
- `research/2026-09-15-webhook-exp-11-http-client-architecture.md` (new): R47–R48 — outbound HTTP client, retry/backoff, connection pooling, timeouts, circuit breakers

---

## 2026-09-15 — Per-Topic Binary-Tree Expansion (docs only)

### docs(research): master topic index — 26 topics, each with its own 6-level binary tree
- `research/2026-09-15-master-topic-index.md` (new): user clarified the binary-tree requirement — *each research topic/phrase must go a minimum of 6 levels deep*, i.e. each topic gets its OWN full 6-level binary tree (L0 → L6, 127 nodes), exponential expansion. Index maps all 26 topics from the two prior research docs (2026-08-31 message-origin, 2026-09-14 keyless-governance) to their tree docs; 9 batches, all ✅. Additive — shared master tree + 16 branch docs kept.

### docs(research): 26 per-topic tree docs — full 127-node trees
- `research/2026-09-15-tree-t01-source-app-fingerprinting.md` (new): sourceApps.js rule engine, UA_RULES ordering, 300-char cap, spoofing detection
- `research/2026-09-15-tree-t02-task-classification.md` (new): smartRouter classifyTask 16 task types, scoring, sticky sessions
- `research/2026-09-15-tree-t03-inbound-rate-limiter.md` (new): custom-server.rate-limiter.js sliding window, LOOPBACK bypass, 429/Retry-After
- `research/2026-09-15-tree-t04-auth-api-keys.md` (new): API key lifecycle, JWT sessions, key metadata/attribution
- `research/2026-09-15-tree-t05-usage-logs.md` (new): usageDb capture, requestDetails, log.txt, quota tracking
- `research/2026-09-15-tree-t06-persistence-sqlite.md` (new): SQLite adapter chain (bun → better-sqlite3 → node → sql.js), repos, migrations
- `research/2026-09-15-tree-t07-openrouter-app-attribution.md` (new): X-App/User-Agent attribution, app metadata, BYOK attribution
- `research/2026-09-15-tree-t08-openrouter-guardrails.md` (new): moderation, content policies, provider allow/deny, data policies
- `research/2026-09-15-tree-t09-openrouter-byok.md` (new): bring-your-own-key, key routing, credit vs BYOK billing
- `research/2026-09-15-tree-t10-anthropic-rate-limits.md` (new): RPM/ITPM/OTPM, 429 semantics, retry-after, org limits
- `research/2026-09-15-tree-t11-anthropic-workspaces.md` (new): workspace isolation, member roles, per-workspace keys/limits
- `research/2026-09-15-tree-t12-anthropic-identity-keys.md` (new): identity-backed keys, admin keys, key scopes
- `research/2026-09-15-tree-t13-litellm-keys-teams-budgets.md` (new): virtual keys, teams, budgets, spend tracking, key aliases
- `research/2026-09-15-tree-t14-agent-identity-headers.md` (new): X-9R-App/User/Session, OpenRouter header aliases, MCP identity gap
- `research/2026-09-15-tree-t15-queue-management.md` (new): priority queues, WFQ, aging, backpressure, head-of-line protection
- `research/2026-09-15-tree-t16-attribution-dimensions.md` (new): "where from" — app, user, session, IP, device, synthetic labels
- `research/2026-09-15-tree-t17-routing-control-dimensions.md` (new): "where to" — model, provider, combo, group, gate level
- `research/2026-09-15-tree-t18-recommended-architecture.md` (new): phased architecture synthesis (M1–M7), dependencies, risks
- `research/2026-09-15-tree-t19-keyless-gating.md` (new): keyless governance option space, gate levels L0–L5
- `research/2026-09-15-tree-t20-agent-profiles.md` (new): profile identity bundles, per-profile limits/priorities
- `research/2026-09-15-tree-t21-synthetic-source-tracking.md` (new): programmatic + synthetic source labels, FNV-1a hash-only privacy
- `research/2026-09-15-tree-t22-tag-priority-queues.md` (new): tag/keyword → priority mapping, queue math, predictive amounts
- `research/2026-09-15-tree-t23-model-group-limiting.md` (new): qwen-* group auto-derive, shared budgets, group cooldown
- `research/2026-09-15-tree-t24-adaptive-rate-control.md` (new): AIMD, EWMA surge detection, messages/s math, programmatic rate changes
- `research/2026-09-15-tree-t25-gate-levels.md` (new): gate ladder, highest-cleared-level-wins, per-gate enforcement
- `research/2026-09-15-tree-t26-governance-architecture.md` (new): full governance synthesis — profiles + gates + queues + groups + budgets

---

## 2026-09-15 — Message-Driven Tool-Building (research + plan + ADR, docs only)

### docs(research): message-driven tool-building — anatomy, identity, filter/build/record opportunities
- `research/9router/38-message-driven-tools-research.md` (new): requestDetails anatomy (30+ fields), identity signals (detectClientTool, trusted headers, per-provider UAs), Messages API surface (filters, views, detail, export, analyze-error), 9 gaps (fixed dimensions, no JSON-path, no saved views, no actions, no annotations, no conversation tooling, under-captured identity, silent truncation, no structured extraction), 4 design options (fixed-filter / JSON-path / extract-index / hybrid), identity as first-class dimension, build/record primitives, privacy, confidence levels, open questions

### docs(plan): phased implementation — facets → JSON-path → identity → annotations → actions → UI
- `planning/message-driven-tools-plan.md` (new): M1 facet extraction + indexing (message_facets table, hot-path filters), M2 JSON-path query language (JSON1, parameterized), M3 identity as dimension (extend detectClientTool, IDE detection, trusted headers), M4 annotations + saved views, M5 per-message actions + webhook/script hooks, M6 truncation surfacing + UI; scope, dependencies, risks

### docs(decision): ADR-010 — hybrid facet + JSON-path design
- `tracking/decisions/ADR-010-message-driven-tools-hybrid-design.md` (new): Option 4 hybrid (extract-and-index hot path + JSON-path long tail), identity facets, build/record primitives, alternatives rejected, reversibility

---

## 2026-09-15 — Binary-Tree Research Expansion (docs only)

### docs(research): master research tree — 6-level binary tree (63 nodes)
- `research/2026-09-15-master-research-tree.md` (new): master map expanding both prior research docs into a 6-level binary tree; 16 Level-3 branches, each with its own doc covering its 7-node subtree; status table

### docs(research): 16 branch docs — full subtree coverage
- `research/2026-09-15-branch-a1a-ua-fingerprinting.md` (new): sourceApps.js rule engine (ordering, 300-char cap, extensibility) + spoofing detection (header/behavior cross-checks, JA3/JA4 TLS fingerprints)
- `research/2026-09-15-branch-a1b-header-network-identity.md` (new): X-9R-App/User/Session trust model (post-auth), OpenRouter/LiteLLM header precedents, loopback/subnet trust, XFF stripping, mTLS
- `research/2026-09-15-branch-a2a-synthetic-labels.md` (new): FNV-1a derived labels (identity/workload/conversation), hash-only privacy, session fingerprints
- `research/2026-09-15-branch-a2b-behavioral-fingerprints.md` (new): token-count histograms, burst detection, EWMA arrival rate, k-means/DBSCAN clustering, tool-use patterns, task-type distribution
- `research/2026-09-15-branch-b1a-static-rate-limits.md` (new): token bucket (Anthropic RPM/ITPM/OTPM), fixed vs sliding window, GCRA/Redis, boundary-burst analysis
- `research/2026-09-15-branch-b1b-adaptive-rate-control.md` (new): AIMD (Reno/CUBIC), 429-as-congestion-signal, EWMA surge detection, budget-proportional pacing
- `research/2026-09-15-branch-b2a-priority-queues.md` (new): strict priority + starvation, tag/keyword → priority, WFQ proportional fairness, aging
- `research/2026-09-15-branch-b2b-interval-pacing.md` (new): leaky-bucket drain, token dispenser, 503+Retry-After backpressure, TTL→429, head-of-line protection
- `research/2026-09-15-branch-b3a-model-group-definitions.md` (new): qwen-* auto-derive, explicit lists, shared RPM/TPM budget, group cooldown (LiteLLM precedent)
- `research/2026-09-15-branch-b3b-model-group-observability.md` (new): model_group in usage, attempted_fallbacks, per-group dashboard, group vs combo distinction
- `research/2026-09-15-branch-b4a-content-guardrails.md` (new): regex PII redaction, NER tier, prompt-injection detection, fail-open convention
- `research/2026-09-15-branch-b4b-budget-guardrails.md` (new): USD budgets (daily/weekly/monthly), soft/hard limits, model/provider allowlists with wildcards
- `research/2026-09-15-branch-b5a-key-lifecycle.md` (new): rotation with grace period, expiry presets (Anthropic), disable/archive states
- `research/2026-09-15-branch-b5b-alternative-auth.md` (new): short-lived tokens (WIF precedent), device attestation, device flow, OAuth reuse
- `research/2026-09-15-branch-b6a-cooperative-identity.md` (new): validated X-9R-App, OpenRouter header aliases, Claude Code settings integration, MCP identity gap
- `research/2026-09-15-branch-b6b-behavioral-identity.md` (new): gate levels L0–L5 ladder, highest-cleared-level-wins, profile identity bundles, resolution order

---

## 2026-09-15 — Webhook Binary-Tree Research Expansion (docs only)

### docs(research): webhook master research tree — 6-level binary tree (63 nodes)
- `research/2026-09-15-webhook-master-research-tree.md` (new): master map expanding the webhook receive & act research into a 6-level binary tree; 8 Level-3 branches, each with its own doc covering its 7-node subtree; status table

### docs(research): 8 branch docs — full subtree coverage
- `research/2026-09-15-webhook-branch-a1a-transport.md` (new): request handling (POST /api/webhooks/[id], allowed_methods), response contract (2xx <3s, challenge handshake), raw body for HMAC (req.text() before parse), payload limits (size caps, large-payload offload)
- `research/2026-09-15-webhook-branch-a1b-auth-security.md` (new): HMAC verification (Stripe t=,v1= vs Standard Webhooks), timingSafeEqual, 5-min tolerance, secret ID in URL (UUID-as-password), local_only, rotation (whsec_ prefix, dual-secret grace)
- `research/2026-09-15-webhook-branch-a2a-event-store.md` (new): outbox table (event_id idempotency key, status machine), transactional outbox (same-DB write, at-least-once), settings-gated worker, polling interval, exponential backoff, dead-letter
- `research/2026-09-15-webhook-branch-a2b-rule-engine.md` (new): TCA model (Home Assistant trigger→condition→action), JSON rules in settingsRepo, field/op/value ops (n8n Only Run If), JSONPath (Hookdeck Filters), action types (notify/http/llm/gateway/dashboard), LLM action reusing analyze-error pipeline, async queue (Slack mandate), idempotent actions
- `research/2026-09-15-webhook-branch-b1a-messaging-platforms.md` (new): Slack incoming webhooks (hooks.slack.com/services URL, blocks/attachments, 30k/hr cap, x-slack-retry-num semantics), Discord (/webhooks/<id>/<token>, slack/github-compatible endpoints), Telegram (sendMessage, chat_id targeting)
- `research/2026-09-15-webhook-branch-b1b-push-services.md` (new): ntfy (topic=password, action buttons, X-Delay, templates), Gotify (appToken vs clientToken, X-Gotify-Key), Apprise (one URL → 100+ services, schema:// config, tag routing OR/AND/priority/escalation, deferred-spec alignment)
- `research/2026-09-15-webhook-branch-b2a-internal-events.md` (new): quota events (80%/90%/exhausted, LiteLLM budget webhooks vocabulary, quotaAutoPing wiring, emit-on-transition dedupe), provider & fallback events (error spike 5/10 per window, auto-disable ENABLE_METRIC, fallback.used, cooldown)
- `research/2026-09-15-webhook-branch-b2b-scheduled-monitoring.md` (new): daily spend digest (LiteLLM digest_interval, report_check_interval), new-model-added alert (model catalog sync), dead man's switch (Healthchecks.io model, /start /fail /<exitcode> suffixes, watchdog over instrumentation.js jobs, grace time)

---

## 2026-09-15 — Webhook Receive & Act (research + plan, docs only)

### docs(research): webhook receive & act — 6-level binary tree across 20+ programs
- `research/2026-09-15-webhook-receive-act-research.md` (new): codebase verdict (zero webhook infra in `src/`; docs-only plans), 6-level analysis (L1 Mode → L6 Pattern) of LLM gateways (LiteLLM, One API/new-api, Helicone, OpenRouter/Portkey/CF, Kong/APISIX/Traefik), automation platforms (Home Assistant, n8n, Node-RED, Pipedream, Huginn, Zapier/Make/IFTTT, Activepieces/Windmill/Trigger.dev/Inngest), messaging platforms (Slack HTTP+Socket Mode, Discord Ed25519, Telegram, ntfy, Gotify, Apprise), webhook infra (Stripe, GitHub, Svix/Standard Webhooks, Hookdeck), monitoring (Uptime Kuma, Healthchecks.io), event patterns (EventEmitter, Transactional Outbox, MQ, SSE, WebSocket, Long-Polling); 12-archetype taxonomy; recommended hybrid architecture (TCA Rule Engine + Dual-Mode Receiver + Universal Adapter); 10 key design decisions; sources + confidence levels

### docs(plan): phased implementation — receiver → rule engine → outbound
- `planning/2026-09-15-webhook-receive-act-plan.md` (new): M1 inbound receiver + HMAC verification (Standard Webhooks spec, `req.text()` raw body, 2xx<3s), M2 SQLite outbox + worker (`instrumentation.js` pattern), M3 TCA rule engine + actions (notify/http/llm/gateway/dashboard), M4 outbound triggers (quota 80/90/exhausted, provider error spike, fallback, new model, daily spend), M5 dashboard UI (P2); scope, dependencies, risks

---

## 2026-09-14 — Keyless Governance (research + plan, docs only)

### docs(research): keyless governance — profiles, synthetic tracking, queues, gates, model groups, adaptive rate
- `research/2026-09-14-keyless-governance-research.md` (new): 10 keyless gating mechanisms, agent profiles (identity bundles + industry precedents), synthetic source labels + behavioral fingerprints, tag/keyword priority queues + interval pacing, model-group limiting (shared RPM/TPM + cooldown), adaptive/predictive rate control (AIMD + EWMA + 429 feedback + budget-proportional), gate levels L0–L5, layered architecture synthesis, sources, confidence levels

### docs(plan): phased implementation — profiles → governance dashboard
- `planning/2026-09-14-keyless-governance-plan.md` (new): M1 agent profiles, M2 synthetic source tracking, M3 tag/keyword priority queues, M4 gate levels, M5 model-group limiting + interval pacing, M6 adaptive/predictive rate control, M7 unified governance dashboard; scope, dependencies, risks

---

## 2026-08-31 — Source-App Governance (research + plan, docs only)

### docs(research): message origin & destination — 7 feature areas
- `research/2026-08-31-message-origin-and-destination-research.md` (new): attribution dimensions, industry models (OpenRouter app-attribution/guardrails/BYOK, Anthropic rate-limits/workspaces/identity keys, LiteLLM virtual keys/teams, MCP), existing-codebase inventory (sourceApps.js, smartRouter, rate-limiter, usageDb), design space + confidence levels

### docs(plan): phased implementation — attribution → agent identity
- `planning/2026-08-31-source-app-governance-plan.md` (new): M1 attribution/observability, M2 per-key+per-app rate limits (token-bucket), M3 opt-in priority queue, M4 profile-based routing, M5 guardrails (budgets/allowlists/content filters), M6 key lifecycle, M7 trusted identity headers; scope, dependencies, risks

### docs(decision): ADR-009 — API key metadata + usage attribution schema
- `tracking/decisions/ADR-009-api-key-metadata-and-attribution.md` (new): additive migration (key name/owner/tags/expiry + usage_attribution table), repos, wiring, privacy (no raw UA)

---

## v1 (branch `v1`, local only — NOT pushed)

### feat(smart-router): pre-combo interception router — `9f4c1631`
- `src/sse/services/smartRouter.js` (new): classify task → score PROVIDER_MODELS → create/reuse `sr-*` dynamic combo → sticky session (5-min TTL)
- `src/sse/handlers/chat.js`: interception before combo resolution/translation (ADR-1)
- `settingsRepo.js`: `smartRouter` defaults (`enabled`, `names`, `allowedProviders`, `costQualityTradeoff`, `maxCandidates`)

### feat(observability): conversationId + streaming non-SSE fix — `6f00d23f`
- Schema v1→2: `conversationId` + indexes on usageHistory/requestDetails
- `handleChat` resolves conversationId from header/extra_body; threads through chatCore → sub-handlers
- streamingHandler non-SSE path now captures requestDetail (was the only uncovered exit)

### feat(observability): export endpoint — `a954b88f`
- `GET /api/export/requests?format=json|markdown` with provider/model/conversationId/status/date filters
- Markdown grouped by conversation, chronological sections (test caught ordering bug)
- `getRequestDetails` supports conversationId filter

### feat(ui): Smart Router config card — `acdc7134`
- Enable toggle, trigger names, allowed providers, cost/quality slider, fallback chain size

### feat(observability): taskType metrics — `1c921ce2`
- `resolveSmartRouter` returns `{comboName, taskType}`; stored in `usageHistory.meta.taskType`

### feat(ui): conversation filter + column — `d9415807`
- RequestDetailsTab: Conversation ID text filter + Conversation column

### feat(observability): fallback chain logging — `5932879f`
- `handleComboChat` accumulates `fallbackChain`; header on fallback success, body on total failure, `onFallbackEvent` log lines

### feat(observability): AI Error Analyst — `d1c1db28`
- `POST /api/analyze-error` + drawer button; uses `settings.analyzeErrorModel`

### feat(observability): markdown auto-flush — `57e87729`
- `src/lib/markdownLog.js` timer → `~/.9router/logs/YYYY-MM-DD.md`; `src/lib/markdownReport.js` shared renderer; Markdown Log card on combos page

### feat(observability): error categorization — `3e7d1c7c`
- `open-sse/utils/errorCategorizer.js` (9 stable categories); attached in chatCore error paths + streaming non-SSE; shown in markdown report

### fix(observability): errorCategory pipeline — `40168739`
- BUG: errorCategory computed but dropped before storage (buildRequestDetail + repo flush). E2E-caught.
- Integration test `error-category-detail.test.js`

### test: isolation fix — `3f678deb`
- DB driver module-cached across test files → unique per-run conversationId assertions

### fix(smart-router): 4 E2E-caught bugs — `4627a299`
1. PROVIDERS (transport-only) vs PROVIDER_MODELS (alias-keyed) enumeration
2. JSON.parse on already-parsed combo models
3. Sticky-session wrapper stored/returned wrong shape
4. `const modelStr` assignment crash
- Tests: `smart-router-resolve.test.js` (5→7 tests)

### feat(routing): full picker + allowedModels + per-model fallbacks — `99ac899f`
- ModelSelectModal shows FULL catalog (40+ providers, connected or not) + amber "not connected" badge
- Smart Router `allowedModels` wildcard subset (openai/*, */claude-*)
- Per-Model/Per-Provider Fallbacks card: `settings.modelFallbacks` `{target: [models]}` + textarea editor
- Tests: `model-fallbacks.test.js` (4)

## Uncommitted (in progress)

- **Custom provider nodes in smart router** — `getNodeModels` (live /models fetch, 5-min cache) + node candidate loop (prefix-based model strings)
- **Advanced fallback config** — `{models, retries, perModelRetries}` shape; `retriesPerModel` param on handleComboChat (signature added, loop pending)
- **Visual Fallback Rule Builder** — form modal + rules table (PENDING)
- **Markdown log explanation** — clarify overwrite vs append (PENDING)
- **VSCode settings** — Copilot Chat settings synced from exo workspace (chat continuation fix)
- **ModelSelectModal full-catalog change** was committed in `99ac899f`; custom-node test added in `smart-router-resolve.test.js` (8 tests)

---

## UPDATE 2026-08-06 (continued session)

### Uncommitted Changes (detailed with attribution)

#### fix(streaming): prevent duplicate [DONE] in passthrough mode
- **File:** `open-sse/utils/stream.js` (+6 lines)
- **Bug:** All passthrough streaming (single-model AND combo) sent `data: [DONE]` twice
- **Root cause:** Passthrough `transform()` forwarded the upstream `[DONE]` line but never set `streamDoneSent = true`; `flush()` added a second one
- **Fix:** Added `if (trimmed === "data: [DONE]") streamDoneSent = true;` after passthrough enqueue
- **Verified:** Single stream=1×, combo stream=1×, non-stream=clean JSON (all via curl on port 20130 with mock on 24000)
- **Origin:** Internal implementation gap — passthrough mode added without extending DONE tracking from translate mode
- **Found by:** GitHub Copilot agent during E2E testing
- **No external PRs referenced**
- **Learning doc:** `learnings/2026-08-06-sse-done-duplicate-leak.md`

#### feat(smart-router): custom provider node support
- **File:** `src/sse/services/smartRouter.js` (+37 lines)
- **Bug:** Smart router ignored user-defined OpenAI/Anthropic-compatible provider nodes
- **Root cause:** `resolveSmartRouter` only iterated static `PROVIDER_MODELS` registry; custom nodes have no registry entry
- **Fix:** Added `getNodeModels(node)` with 5-min TTL cache fetching `{baseUrl}/models`; node scoring loop with prefix-based model strings
- **Test:** `smart-router-resolve.test.js` — custom node test (unreachable upstream → graceful null, no crash)
- **Found by:** E2E testing with `allowedModels: ["mockreal/*"]`

#### feat(fallbacks): advanced modelFallbacks shape + retriesPerModel
- **Files:** `src/sse/handlers/chat.js`, `open-sse/services/combo.js`
- **Enhancement:** `settings.modelFallbacks` supports `{ models: [...], retries: N, perModelRetries: {...} }` alongside simple arrays (backward compatible)
- **Signature:** `handleComboChat` gains `retriesPerModel` + `perModelRetries` params (loop logic pending)
- **User requested:** Visual rule builder with retry counts per model

#### chore: VSCode settings + CLAUDE.md
- `.vscode/settings.json`: Copilot Chat settings synced from exo workspace
- `CLAUDE.md`: Next.js agent rules block (auto-generated by `next dev`)

---

## UPDATE 2026-08-07 (final — fallback rule UX complete)

### feat(ui): visual fallback rule builder (Approach 1) — `d1cc1faa`
- `FallbackRuleModal`: form-style popup (target model/provider toggle, full-catalog `ModelSelectModal` picker, ordered chain with up/down/remove, universal retries, per-model retry overrides)
- Rules table on the Fallbacks card: Target | Fallback Chain | Retries | Delete
- Markdown log card explains **overwrite** semantics (daily snapshot, not append)

### feat(ui): 3-view fallback rule manager — `6449b58b`
User asked for **three alternative ways** to build fallback rules so they can compare and pick one later. All three views edit the same underlying `settings.modelFallbacks` — no data model change:
1. **Table** (Approach 1) — original modal + rules table
2. **Chain Flow** (Approach 2) — fluid drag-and-drop node chains: target node → sortable fallback chips (dnd-kit), inline per-model retry inputs, dashed "Add" buttons; drag to reorder persists immediately
3. **Simple + Advanced** (Approach 3) — collapsible rule cards: simple header (target, chain count, retries) + expandable advanced section (ordered chain with remove, universal retries, per-model overrides); notes it runs through the same combo engine as named combos
- View switcher tabs at top of the Fallbacks card

### fix(ui): lint in fallback section
- Escaped `"` in empty-state JSX text (`react/no-unescaped-entities`) — 4 pre-existing errors also resolved in the rewrite (file went 7 → 3 errors, remaining 3 pre-existing)

### E2E verification (production standalone, port 20130, mock upstream 24000)
- Table view: reordered chain + `(mockreal/model-id:5)` override + retries 3 render from persisted settings
- Chain Flow: drag `mockreal/model-id` onto `deepseek` → order flipped in UI **and** persisted (`PATCH /api/settings` verified via API)
- Simple + Advanced: expand → set universal retries 3 + per-model override 5 → both persisted
- All three views re-verified after rebuild with persisted data
- Full vitest suite: **1692 pass / 88 fail = exact baseline, zero new regressions**
- Note: one server crash mid-drag was a manual kill during rebuild (PATCH then failed with connection refused — retested cleanly after restart)

---

## UPDATE 2026-08-07 (afternoon — optional sr-* combo cleanup)

### feat(cleanup): optional stale smart-combo sweeper (OFF by default)
User request: *"for optional clean up yes we can have an option for that that we build in but it can be disabled by default and be an option for someone to turn on if they want. just make sure that it will actually work. make sure to build code tests that will actually mock and test things"*

**New files/changes:**
- `src/sse/services/srComboCleanup.js` (new) — scheduler mirroring the `backgroundTokenRefresh.js` pattern:
  - `selectStaleSmartCombos(combos, ttlMs, nowMs)` — pure selection: name starts with `sr-` AND `updatedAt` older than TTL. Non-sr combos and unknown-age combos are NEVER deleted.
  - `runSrComboCleanupTick({loadCombos, deleteCombo, ttlMs, nowMs})` — DI-friendly tick, fail-open per combo and at top level
  - `startSrComboCleanup({enabled, ttlHours, intervalHours})` — idempotent; no-op when disabled or outside a long-running server runtime
  - Initial tick 60s after boot, then every `intervalHours`
- `src/lib/db/repos/settingsRepo.js` — `srComboCleanup: { enabled: false, ttlHours: 24, intervalHours: 12 }` (**disabled by default**)
- `src/shared/services/initializeApp.js` — starts the sweeper only when `settings.srComboCleanup.enabled`
- `src/app/(dashboard)/dashboard/combos/page.js` — Smart Router card gains "Auto-cleanup of temporary combos" sub-block: toggle (Off by default) + "Delete after (hours)" + "Sweep every (hours)" inputs

**Tests** (`tests/unit/sr-combo-cleanup.test.js`, 13 tests, all pass):
- Pure selection: stale sr-* selected; fresh sr-* skipped; user combos NEVER selected; unknown-date skipped; cutoff boundary; empty input
- Tick with mocked repo functions: deletes exactly stale combos; per-combo delete error does not abort sweep; throwing load is swallowed; non-array load is a no-op
- Scheduler: refuses to start when disabled (the default); idempotent double-start; **integration-style test** runs a real tick against a real temp SQLite DB (`DATA_DIR=/tmp/9r-sr-cleanup-test-*`) proving old `sr-*` deleted while fresh sr-* + user combo survive

**E2E proof (production standalone, port 20130):**
- UI: toggle renders "Off by default"; toggling ON reveals TTL/interval fields and persists `{enabled:true, ttlHours:24, intervalHours:12}`
- Server restart with enabled=true → log: `[SR_CLEANUP] Scheduler started {"ttlHours":24,"intervalMs":43200000}`
- Planted 3 combos in E2E DB (stale sr-*, fresh sr-*, old user combo) → initial tick at 60s → log: `[SR_CLEANUP] Deleted stale smart combo "sr-modelRouter-e2e-test"` → DB confirms only the stale sr-* row was removed; fresh sr-* and user combo untouched
- Toggled OFF again → persisted; test env left at default

**Regression:** full suite 1705 pass / 88 fail (13 new tests added; still exactly the documented 88 baseline failures)


---

## UPDATE 2026-08-07 (evening — provider picker + 2 new rule views) — `b1e2a061`

### User requests
1. "add a few more options utilize different theories for how we could handle these kinds of rules and ideas"
2. Provider target picker: "if i switch to whole provider then it still shows the model but I dont have the ability to choose just a provider... I would like a way that i dont have to try and remember the name of the provider"
3. Toggle switching bug: "a problem may occur when i choose a model then decide i want to have a provider instead to where the model would stay in the box"
4. "let me know how we can make sure that we dont have complicated functions in the background for this... if just having it clear the box is the easiest method... that is fine"

### What was built
- **`ProviderSelectModal`** (new shared component) — visual provider picker: icon + display name + provider id + connected/not-connected badge + custom-node badge + search. Mirrors the model picker feel. Used by FallbackRuleModal AND the new Guided Wizard.
- **FallbackRuleModal fixes**:
  - Provider mode now has a "Pick provider…" button (was text-input only)
  - Toggle switching is deliberately SIMPLE (per user request): model→provider keeps only the provider part (`mockreal/gpt-4o-mini` → `mockreal`); provider→model CLEARS the box. No hidden state-keeping.
- **2 new rule-management views** (total 5 approaches now):
  - **Guided Wizard** — 3-step flow (Who fails? → What tries next? → How many retries?) with step indicator, pick-buttons, live "current rules" list
  - **Expert Text** — `target:model1,model2` per-line DSL with comments, Load example, Apply text, live parsed preview, saved-rules list
- **`src/lib/fallbackTextFormat.js`** (new) — extracted `toDraftText`/`parseDraftText` + `ruleModels`/`isAdvancedRule` helpers, advanced-shape safe (retries preserved on re-parse)
- **13 new unit tests** (`fallback-text-format.test.js`): both shapes, comments, malformed lines, advanced-preservation, round-trip

### E2E verification (production build, port 20130)
- Provider picker: search "mockreal" → MockReal (custom node) found → click → target box filled with provider id ✅
- Toggle: model `mockreal/gpt-4o-mini` → Whole provider → box = `mockreal`; back to model → box cleared ✅
- Wizard: all 3 steps render; Pick a provider/model buttons appear per mode ✅
- Expert Text: existing advanced rule serialized correctly; Load example + Apply text → settings updated; test env restored ✅

### Bug caught by E2E (real crash)
- `toDraftText` assumed legacy array shape → `(t || []).join is not a function` crash when opening Expert Text with an advanced-shape rule. Fixed in the extracted lib (handles both shapes).

### Regression
Full suite: **1718 pass / 88 fail** (13 new tests; one run showed 89 = flaky timing-sensitive pre-existing test, re-run confirmed 88). Lint: no new errors on changed files.

---

## UPDATE 2026-08-07 (late — drag-and-drop in Add Fallback Rule modal) — `d7bf0e35`

### User request
"for the fallback rules form component 'add fallback rule' when we choose a fallback chain order... can we make it so that it is also possible to click and hold the card and move them up and down if we want? changing the order in the list that way too?"

### What was built
- **FallbackRuleModal chain rows are now sortable** (dnd-kit, same as Chain Flow view): click-and-hold any row (drag handle or the row itself) and move it up/down to reorder. Arrow up/down buttons remain as an exact alternative.
- New `SortableFallbackChainItem` component (drag handle + number badge + arrows + remove).

### Bug caught by E2E (real, subtle)
- After a drag reorder, the **number badges stayed stale** (e.g. `1:mockreal, 1:dialagram`) even though the order, arrow disabled-states, and state were all correct.
- Root cause: React reused the old text node of the number badge on the moved row while dnd-kit committed the DOM move — `idx` props updated (isFirst/isLast were correct) but the rendered text didn't.
- Fix: `key={idx}` on the badge span forces a fresh text node on reorder.
- Verified: after fix, drag → `1:dialagram, 2:mockreal` correct; Save persisted the dragged order in settings.

### Regression
Full suite 1718 pass / 88 baseline fail (exact baseline). Lint clean on changed file.

---

## UPDATE 2026-08-07 (night — drop indicator + full doc sweep) — `b520c9d6`

### User request
"for the chain flow option, i like that i can click and drag the models but its hard to know where it will land is there a way that we can have like a vertical bar that will move around in the list showing us where it goes?"
Also: "make sure that you are updating all things from everything we have been previously working on in the chat in our promptsANDplans folder as well as any tracking documentation... including the errors... make new folder or files if needed"

### What was built — live drop indicator (Chain Flow)
- While dragging a chain chip, a thin vertical accent bar (3px, primary purple, glow, 70ms slide transition) shows the EXACT slot where the chip will land if released.
- The bar recomputes on every pointer move from the LIVE viewport rects of sibling chips (dnd-kit shifts them aside during drag), so it tracks correctly even when chips wrap onto multiple rows (reading-order comparison).
- The drop reuses the indicator-computed insert index → the final order matches where the bar was, not a guess.
- `rectSortingStrategy` replaces `verticalListSortingStrategy` (correct math for wrapped flex lists).

### E2E verification (production build, port 20130)
- Synthetic pointer-event drag sweep: bar tracked `left: 378.663px → 181.45px` live as the chip crossed the sibling's center.
- Dropped at the far-left position → order flipped to `[kc/deepseek/deepseek-chat, mockreal/model-id]` and PERSISTED in settings — exactly where the bar had been.
- Test env restored afterwards.

### Errors & problems encountered (full detail — see learnings/2026-08-07-drop-indicator-dnd-kit-coordinates.md)
1. **Embedded-browser mouse flakiness**: `page.mouse.down()` intermittently produces NO pointer events at all (worked once after page load, then died). Worked around with synthetic `PointerEvent` dispatch (isPrimary + button 0) — dnd-kit accepts them and they exercise the real handlers.
2. **Off-viewport drag targets**: chips below the visible viewport receive no events; `boundingBox()` returns coordinates regardless of visibility. Fixed test technique: `scrollIntoView` + verify `elementFromPoint` before dragging.
3. **REAL BUG — frozen insert index**: the bar rendered but never moved. Root cause: dnd-kit's `active.rect.current.translated` is **content-relative** inside scrolled containers (the dashboard uses an inner `overflow-y-auto` scroller; `window.scrollY` is 0 while translated.top = 2228). Mixing it with viewport-relative `getBoundingClientRect()` chip rects put the pointer "below" everything → insertIndex pinned at max.
   - First attempted fix (add `window.scrollY`) FAILED for the same reason (scroll container isn't window).
   - Working fix: `initial rect (viewport) + event.delta` → dragged chip's live viewport rect, apples-to-apples with chip rects. Verified bar tracks and drop honors it.

### Regression
Full suite 1718 pass / 88 baseline fail (exact baseline). Lint clean on changed file.

### Docs swept this round (per user request)
- CHANGELOG.md, SESSION-HISTORY.md, SESSION-NARRATIVE.md, TASKS.md updated
- NEW learnings/2026-08-07-drop-indicator-dnd-kit-coordinates.md
- NEW research/9router/16-ux-research-drop-indicator-and-override-placement.md
- NEW decisions/ADR-006-drop-indicator-approach.md (+ per-model override placement recorded as pending)
- NEW ../planning/fallback-rules-ux-plan.md (5-view roadmap + pending items)
- NEW meetings/2026-08-07-session-summary.md
- ../operations/ui-testing-workflow.md extended with synthetic pointer-event drag testing technique

---

## UPDATE 2026-08-07 (late — browser-control workflow doc + agent skill)

### User questions answered (see SESSION-HISTORY)
"Where are you working? which browser? headless? how do you control it and know things work without seeing? set up a skill for this and update workflow docs"

### What was created
- **`../operations/browser-control-workflow.md`** (NEW) — canonical doc answering the questions:
  - Workspace = this VS Code session; app = production standalone on :20130, mock upstream :24000
  - Browser = **VS Code integrated browser** (real visible Chromium, NOT headless), driven via Playwright through the browser tools
  - No-vision loop: accessibility snapshots (read_page text tree + refs) → page.evaluate DOM probes → app-API assertions (fetch('/api/settings')) → vitest regression → env restore
  - Gotchas: stale chunks after rebuild (?bust=), off-viewport elements eat no events (scrollIntoView + elementFromPoint), page.mouse.down() flakiness → synthetic PointerEvent recipe, dnd-kit coordinate spaces, :has-text() invalid in evaluate, volatile refs, page-id death
- **`~/.agents/skills/9router-browser-e2e/SKILL.md`** (NEW, registered in manifest) — agent skill capturing the exact loop, drag recipe, and gotchas for future sessions
- CHANGELOG/SESSION-HISTORY/TASK-LOG updated

---

## UPDATE 2026-08-07 (deep research — message capture & log viewing)

### research only, no code changed
- **`research/message-capture-log-viewing.md`** (v1 survey) + **`research/message-capture-deep-research-v2.md`** (v2 EXHAUSTIVE — 3 parallel research agents + direct repo deep-dives, all stars/licenses verified live)
- Landscape covered: LLM observability platforms (Langfuse 32.7k★ MIT, Helicone 6k★ Apache, Phoenix 10.9k★ **ELv2 not-OSS**, Weave 1.1k★ Apache, AgentOps 5.8k★ MIT, OpenLIT 2.7k★ Apache, Opik 14.8k★ Apache, Langtrace, LangWatch **ELv2**, TruLens, OpenLLMetry, LangKit, promptfoo, DeepEval); AI gateways w/ log viewers (**one-api 36.3k★ MIT, new-api 44.6k★ AGPL — closest competitors with built-in per-request log pages**, LiteLLM 55.8k★, Portkey, Bifrost, Kong, Higress, TensorZero **archived**); log mgmt (OpenObserve 20.6k★ AGPL, SigNoz 31.8k★, Loki 28.7k★, VictoriaLogs, Quickwit, Graylog **SSPL-avoid**, HyperDX MIT, Highlight, Logdy, lnav, Dozzle); error tracking (Sentry **FSL-1.1+heavy**, GlitchTip **MIT single-container, Sentry-protocol-compatible**, Exceptionless, Errbit); notifications (ntfy 33.2k★, Gotify, Apprise **one-URL-per-channel**, Novu, Bark, UptimeKuma channel-picker, Alertmanager semantics); request-capture UX (Bruno 46.2k★ MIT, Hoppscotch 80k★ MIT self-hostable, **mitmweb master-detail inspector**, Hurl `--curl`, HTTP Toolkit, Insomnia, mockbin); ProxmoxVE repo enumerated exhaustively (**no error-tracker, no langfuse/phoenix scripts; litellm script added-then-removed**); awesome-lists read live (tensorchord/Awesome-LLMOps 5.9k★ canonical, **cuihuan/awesome-ai-gateway tracks 9router itself**, ContextJet awesome-llm-observability, awesome-selfhosted GenAI section)
- **Recommendation (unchanged, now heavily evidenced)**: BUILD in-app Messages page + error inbox + format viewers + batch AI analysis + optional webhook notifications, reusing existing `requestDetails` SQLite capture; keep Langfuse/OpenLIT as optional ship-out targets; avoid AGPL/SSPL/ELv2/FSL components in-app
- License-purity notes recorded: prefer MIT/Apache-2.0 for vendored code; AGPL ok only as separate sidecar service
- Full details + per-project copy-ideas: `research/message-capture-deep-research-v2.md`

---

## UPDATE 2026-08-07 (deep research v3 — OBSCURE/low-star projects pass)

### research only, no code changed
- **`research/message-capture-obscure-projects-v3.md`** — the "hidden gems" pass per user directive ("some projects that only have a hundred stars could be really good baselines")
- 50+ obscure projects (7–4,400★) verified live via 1 subagent + direct GitHub API searches (2026-08-07)
- Highlights: **cc-viewer** (1,058★, per-conversation dirs + request body-diff), **tokentap** (811★, Markdown+JSON dual save), **CliRelay** (893★, mini-9Router with request logs + quotas), **claude-code-trace** (362★, 3-panel layout + SSE live tail), **token-dashboard** (654★, turn-by-turn Sessions spec), **chatgpt-json-tree-viewer** (56★, branching conversation tree), **recensa** (69★, SQLite FTS5 search), **claudex** (92★, MCP-exposable history API), **cloud-sre-agent** (49★, AI log-anomaly agent = the synthetic-scan idea), **llm-proxy** (27★) & **Spanlens** (11★) & **SectorFlux** (7★) — tiny proxy-with-logs baselines, **logfire** (4,416★, Pydantic), **RagaAI-Catalyst** (16,142★, execution-graph view), **teley** (61★, LCS side-by-side trace compare), **claude-pulse** (243★, ntfy budget alerts)
- Synthesized: 10 copy-ideas incl. the confirmed market gap — *no existing project groups raw OpenAI-compatible proxy traffic into conversation trees with wire fidelity*; 9Router (being the proxy) is uniquely positioned
- Top-3 actionable: (1) per-conversation dir grouping + raw bodies, (2) 3-panel Messages layout, (3) request body-diff collapsing

---

## UPDATE 2026-08-07 (late — code review + live verification of user's personal commits)

### User request
"prove to me that all the functions that have been added by me (my personal commits to this repository) all work as intended and even that you are paying attention to the background logs, the ui changes and what the code does as you go in testing this. do a code review and refactor review (share with me the details and update all documentation)"

### What was verified (full detail: research/9router/17-code-review-user-commits.md)
1. **Capacity Adapter** (8e59093d, 6498b312) — LIVE verified against real providers: vision request → text-only deepseek-chat → log showed `Capacity adapter for [vision] → trying gpt-4o-mini, mimo, deepseek` → pool 404 (OpenRouter account guardrail, not code) → clean fallback → mimo succeeded. Settings restored after.
2. **TokenRouter** (b4808929, 41588bea) — pricing exact (opus-4.6 $5/$25 verified), cost math correct ($0.0175 for 1K+500), thinking enum passthrough correct.
3. **Self-hosted STT/TTS/Embeddings** (fe547f4d) — registered (index imports 117/118/119), 50 related tests pass, fail-visible design, baseUrl tolerance.
4. **Auto-provision API key** (02c66fe2) — code review: idempotent, client-side, try/catch. ✅
5. **Codex detection** (cd13d904) — 7/7 cases verified (Desktop UA, codex-tui, codex-cli, originator, claude, gemini, curl).
6. **Antigravity OAuth scoping** (35f86e58) — diff review: headers scoped to loadCodeAssist/onboardUser only, provider threaded through. ✅

### Findings (non-blocking, all documented)
- Environment: xAI refresh token invalid (invalid_grant) — needs re-auth; background refresh failed open correctly.
- Environment: OpenRouter guardrail 404 on gpt-4o-mini — account setting, adapter handled gracefully.
- Shallow settings merge note (partial capacityAdapter via API shadows defaults; UI always sends full object).
- Pool flattening note (vision+audio enabled by default → mimo in vision chain; correct behavior).
- Minor refactor opportunities: calculateCostFromTokens arg order; detectClientTool rules-table not needed.

### Regression
1718 pass / 88 baseline fail (one flaky run showed 89 skips; re-run = baseline). No code changed.

---

## UPDATE 2026-08-07 (deep research v4 — no-limits pass: subagents + retries)

### research only, no code changed
- **`research/message-capture-v4-deep-pass.md`** — the "no limits" pass per user directive
- Method: 5 subagents spawned; first batch hit provider rate-limits/network errors (3 rate-limited, 2 network) — all 5 areas completed via one-at-a-time retries + lightweight fallbacks. Validates user's recovery point: subagent failures are recoverable.
- New content (on top of v1/v2/v3):
  1. **~90 NEW projects**: LLM observability deep-pagination (30+ incl. latitude-llm 4.5k★ error-monitoring, agent-prism MIT React trace components, langfuse-mcp/opik-mcp MCP-over-trace-store, Axon OTel CLI viewer, kitaru record-replay, smithers time-travel); gateway long-tail catalog (40+ from cuihuan/howardpen9 awesome-lists incl. ccglass 665★ per-message token/cost viewer, gpt-load 6.3k★ log UI, CPA-Manager-Plus account-health panel, CrossLink routing-stats API, aiproxy audit trails, RelayPlane runaway-loop audit, OrcaRouter-Lite savings analytics, TokenHub cost attribution)
  2. **43 academic papers/studies** (arXiv + Semantic Scholar, live-verified): AIOps surveys, ContinuityBench (CPR/CLO fallback metrics), SEAR (SQL-queryable log schema blueprint), GateScope (billed-vs-served model), TAMO/RCA studies, "When AIOps Become AI Oops" (security: log content = untrusted input for analyzer), StuGPTViz (transcript viz), CHI LLM-observability design principles, Microsoft multi-agent debugging study
  3. **Community landscape**: HN themes (LiteLLM frustration loudest; "Sentry for LLM requests" demand), GitHub issue demand signals (open-webui analytics 81 comments, new-api stream-error classification, litellm payload-capture complaints, one-api detailed-logs request), Discords/blogs; Reddit IP-blocked (links provided)
  4. **Agent-framework storage synthesis** (LangGraph/Dify/Open WebUI/LibreChat/Cherry Studio/Mastra/Vercel AI SDK/Pydantic AI): recommended `messages` table schema (session_id, request_id FK, parent_message_id tree, status/done) + fat bodies in requestDetails — the definitive conversation-schema recommendation
  5. **Top-copy synthesis** (10 ranked picks incl. ccglass UX, latitude-llm error platform, agent-prism components, CrossLink routing-stats, MCP-over-trace-store)
- Flags: Helicone maintenance-mode (acquired Mintlify 2026-03 — copy ideas only); avoid GPL/AGPL (octopus, Helicone ai-gateway, nullsink); TensorZero archived confirms gateway-observability consolidation

---

## UPDATE 2026-08-07 (research synthesis + feature spec + gaps — subagent-written docs)

### research/spec only, no code changed
- **`learnings/2026-08-07-research-synthesis.md`** — master synthesis of ALL v1–v4 passes (3,498 words): what we learned by category, confirmed market gap, 20 ranked copy items with license guardrails, definitive schema, 10 security/privacy obligations, 15-feature roadmap with citations, open questions
- **`../planning/messages-page-feature-spec.md`** — concrete buildable spec for Messages page + Error Inbox (2,069 words): SQLite `messages` DDL sketch + indexes, list/detail/conversation-tree/export features, error-inbox workflow, phased rollout P1–P4, every feature citing research source
- **`research/message-capture-gaps-and-risks.md`** — blind spots (Reddit blocked w/ manual URLs, OTel churn, maintenance risks, license traps), 10 implementation risks w/ mitigations, 7-question decision log (D1–D7, none block P1), effort table (P1–P4 ≈ 4.8k–6.8k LOC)
- Method: 2 subagent batches; 1 network failure recovered by retry (validates subagent-recovery rationale)

---

## UPDATE 2026-08-07 (late — feature-gap review + upstream-provider risks)

### User request
"review if there are any other problems with the way that things have been set up in this app. review all the changes we have made, features that have been added from the original code base, what are those features lacking, what scrutinizing do we need to do to currently update the actual usefulness of what we are doing use subagents to deal with upstream problems that could occur from the provider. as before"

### Method
- Subagent spawns attempted for both reviews (as user requested) but the model API was rate-limited (`rate_limit_exceeded`) then network-failed (`net::ERR_FAILED`) on all attempts — the same failure mode documented in earlier sessions. Both reviews were completed by the main session agent instead, using session context + live evidence. (Recovery rationale: retry later / fall back to main-session execution.)

### New docs
- **`research/9router/18-feature-gap-review.md`** — per-feature gaps for all v1 features (smart router, observability, fallbacks, 5-view UI, sr-* cleanup, custom nodes) + cross-cutting (shallow settings merge confirmed: 4 UI PATCH callers send full objects so UI is safe; external API partial PATCH can shadow defaults) + 10-item prioritized action table.
- **`research/9router/19-upstream-provider-risks.md`** — 12-item risk table grounded in observed logs (xAI invalid_grant, OpenRouter guardrail 404) with current handling + recommended actions + 3 open questions for user.

### Key findings (top of each list)
- Deep-merge nested settings in updateSettings (prevents silent default-shadowing)
- UI warning when provider+model fallback rules both match
- Provider health dashboard (/api/health/providers) to catch auth failure spikes
- Smart router score breakdown UI (why did it pick this model?)
- Surface dropped observability records when 1000-cap exceeded
- Auto-disable provider after N consecutive refresh failures (with UI re-enable)

---

## UPDATE 2026-08-07 (Messages page P1 implemented)

### feat(messages): Messages page P1 — commit `2b20618b`
- New API: `/api/messages` (list + filters + conversation grouping), `/api/messages/:id` (detail), `/api/messages/:id/export` (json/markdown/curl)
- New page `/dashboard/messages`: list view (status badges, tokens, latency, pagination), detail drawer (5 format tabs + copy), conversations view (per-session grouping)
- Sidebar: "Messages" nav entry
- Verified: browser walkthrough (list, drawer, tabs, tree), tray app rebuilt + serving
- Spec: `../planning/messages-page-feature-spec.md` P1 scope

---

## UPDATE 2026-08-07 (hardening roadmap + origin classification)

### User asked
"which mimo model did you use? research ways that we would fix these problems and explain more about what you mean by them and add them to our todo list... if they were already there then keep them as things for later. If they were us then lets find ways and research how we would fix them and importance level"

### Answers
- **mimo model used**: `oc/mimo-v2.5-free` = **OpenCode Free** provider (`opencode.js`, alias `oc`, no-auth, passthrough). It is the user's own default (`8e59093d`) and was verified working live (log: `opencode/mimo-v2.5-free · ACC:Public · DONE 7520ms`).
- **Origin classification done for every reviewed item** (git-traced): OURS (this session) / YOURS (user's master commits) / PRE-EXISTING / NEW.
  - OURS → fix now: deep-merge activated by our nested settings; provider+model conflict warning; fallback validation; score breakdown; sticky TTL config; node refresh; chip truncation; Expert Text highlighting; markdown lock; export pagination; node error badge
  - YOURS → keep for later: TokenRouter pricing re-validation; mimo health check; calculateCostFromTokens JSDoc
  - PRE-EXISTING → keep for later unless trivial: shallow-merge pattern (but our nested objects activate it → moved to Phase 1); 1000-cap dropped records
  - NEW → plan: provider health endpoint; auto-disable after refresh failures

### New doc
- **`../planning/hardening-roadmap.md`** — 4-phase roadmap (quick wins / UX gaps / robustness / provider resilience), each item with meaning, origin, fix approach, importance; execution order; 3 open questions.
- TASK-LOG items 70–86 added as the working todo list.

### Subagent failure mode (explained for the record)
`rate_limit_exceeded` = Copilot model API quota for concurrent subagent calls; `net::ERR_FAILED` = dropped network connection to model API. Transient infra failures, NOT code problems. Mitigation documented: spawn one-at-a-time, retry, fall back to main session.

---

## UPDATE 2026-08-07 (Messages drawer UI issues documented — deferred fixes)

User reported (for later): compact-mode drawer goes off-screen; payload text not visibly scrollable. Probed live:
- Drawer is fixed `w-[800px]` + `right-0` →
### Messages drawer UI issues (deferred — documented 2026-08-07)

| # | Task | Status | Evidence |
t) 
| # | Task | Status | Evidence |
|---|--`w-[min(800px,100vw)]` + ve|---|------|-------- `pre` is `ov| 87 | Detail drawer overflows k-| 88 | Detail payload `pre` not visibly scrollable (wrap policy + missing min-h-0 on flex chain + nested scroll containers) | ⏳ deferred | Probe: scron| 89 | Optional vision-assisted QA of drawer at 375px (qwen-3.5-omni-plus subagent) | ⏳ deferred | spec §12.3 |

---

## UPDATE 2026-08-07 (message-viewer design research — main session)

### research only, no code changed
- **`research/message-viewer-design-philosophies.md`** — new research doc:
  - **A.** Design philosophies distilled from 10 tools: Sentry (issue details), Datadog/Grafana (query + histogram + facets), LangSmith/Langfuse (trace tree, sessions, propagation), Linear/Notion (views-not-modes), Obsidian/Roam (backlinks), mitmproxy/Proxyman (request/response pairs + replay), HyperDX/OpenObserve/Dozzle (live tail), Claude Code/Codex traces (3-panel conversation trees), Open WebUI/LibreChat (transcripts), GitHub PR (diff + inline threads)
  - **B.** Filter dimensions from LangSmith/Langfuse/Helicone/OpenLLMetry/Weave/AgentOps (trace/session/user/project/env/model/cost/tags/metadata/error) + gateway-vs-client capture split
  - **C.** Gateway-only capture dimensions 9Router can add: API key, trusted client IP (x-9r-real-ip already computed in custom-server.js!), UA→sourceApp fingerprint, combo name, smart-router taskType, route chain, provider account, x-project/x-app/Helicone-Property-* headers
  - **D.** 3 view designs (Timeline/Waterfall, Trace Tree, Board/Triage), 8 filter dimensions, 5 visual UX improvements, 7 privacy risk guardrails

---

## UPDATE 2026-08-07/08 (review of other-bot work vs research)

### review only, no code changed
- **`research/9router/20-review-otherbot-work-vs-research.md`** — rigorous review of Messages P1 (2b20618b, 79c457e6) + hardening P1 (5918de88) + uncommitted Phase 2, via 2 review subagents + live browser verification on port 20131
- Verdicts: Messages P1 ≈ 45% of spec (correct shell: 3 routes, 5 tabs, badges, sidebar, drawer fixes; missing: messages table, parent_message_id trees, FTS5, cost, keyset pagination, siblings nav, sanitizers). Hardening P1 = 7.5/10 (1.1 merges-against-defaults gap; 1.2-1.4 good). Uncommitted Phase 2 = 2/10 — **P0: smartRouterMeta never declared in chat.js → every chat request 500s; eslint misses it; DO NOT COMMIT**
- Live-confirmed bugs: B1 status filter (success vs done vocabulary), B3 conversation view page-window-scoped, B4 cURL placeholder endpoint
- Research alignment: 5-tab Bruno pattern + sidebar + drawer fixes = used well; parent_message_id trees, FTS5, cost/provenance, CPR/CLO, sanitizers = the missed substance
- Suggested next: fix P0 (1 line), fix B1, decide messages-table vs projection, fix deep-merge semantics, then P2

---

## UPDATE 2026-08-08 (Hardening phases 1–4 complete — commits 5918de88, 6485e782, 12895e19, cb01da52, 723e9669)

### What shipped (all 4 phases of ../planning/hardening-roadmap.md)

**Phase 1 — Quick wins:**
- Deep-merge nested settings (capacityAdapter, smartRouter, srComboCleanup, modelFallbacks) in updateSettings + 6 unit tests
- JSDoc for calculateCostFromTokens
- Provider+model conflict warning in fallbacks UI
- Fallback string validation on save (custom-node aware)

**Phase 2 — UX gaps:**
- Smart router score breakdown (backend: resolveSmartRouter returns top-N scores; UI: Smart Router panel with score bars in usage drawer)
- Configurable sticky TTL (stickyTtlMin, 1-1440, UI input)
- Node models cache refresh (?refresh=1 busts cache; import refreshes)
- Chain Flow chip truncation (180px + title tooltip)
- Expert Text invalid-line highlighting (#N list + red banner)

**Phase 3 — Robustness:**
- markdownLog atomic write (temp + rename)
- Export pagination (page param + pagination.hasNext)
- droppedRecords counter + /api/observability/status + amber banner in RequestDetailsTab

**Phase 4 — Provider resilience:**
- /api/health/providers (auth status, locks, last error, needsAttention)
- Providers page amber attention banner with refresh
- Auto-disable after 3 consecutive refresh failures (refreshFailCount + needsReauthReason)
- Node /models failure red badge in ModelSelectModal
- 4.3/4.4 deferred (user-owned: TokenRouter revalidation, mimo health check)

### E2E verified live (production build :20130)
- /api/health/providers: detected mock 429 as needs-attention with full detail ✅
- /api/observability/status: {enabled, maxRecords, currentCount, droppedRecords} ✅
- Export pagination: page+limit → pagination.hasNext correct ✅
- Suite: 1724 pass / 88 baseline fail (zero regressions)

---

## UPDATE 2026-08-08 (exhaustive audit — 7 bugs fixed, research docs, refactor decisions)

### Exhaustive no-more-bugs pass (research/9router/21-audit-no-more-bugs.md)
7 real bugs found + fixed with tests (suite 1731 pass / 88 baseline, +7 tests):
- A: sequential partial PATCH clobbering (settingsRepo) — `f7c1bf8e`
- B: sourceApp /droid/i misclassified Android browsers — `0a65a631`
- C: health endpoint missed per-model locks — `0a65a631`
- D: messages errorCategory/sourceApp filters broke pagination (JSON1 SQL) — `0a65a631`
- E: facets fetched 10k full records per page load (SQL GROUP BY) — `378cd321`
- F: histogram dropped current-hour rows — `378cd321`
- G: status filter vocabulary mismatch (review B1) — `ba7378db`
6 areas verified clean (combo retries, chat fallbacks, markdown atomic write,
sticky TTL plumbing, refresh-failure tracking, messages views).

### Error sweep (research/9router/22-error-sweep.md)
E1 xAI invalid_grant (auto-disable now active — re-auth needed), E2 OpenRouter
guardrail 404 (account setting), E3 B3 conversation grouping (deferred), E4 B4
cURL URL capture (deferred), E5 1000-record cap (surfaced), E6 markdown snapshot
(single-server).

### Refactor decisions (research/9router/23-refactor-decisions.md)
D1 circuit-breaker auto-disable (Fowler + Azure), D2 SQL facets (faceted search
practice), D3 config-merge vs map-replace semantics, D4 retry policy (verified),
D5 drawer/viewport resilience, D6 atomic writes + drop surfacing, D7 privacy
UA fingerprinting, D8 5-view consolidation pending user pick.

### Docs per conventions
research/9router/21/22/23 + TASK-LOG 93-102 + this changelog. Commit `2f8c????` pending.

---

## UPDATE 2026-08-08 (goal-mode: audit + refactor + research)

### fix(messages): audit-found bugs — commit `330d7230`
- BoardView: moves-map + derived columns (no setState-during-render, stale-safe)
- conversation.tokens null-safety; fetch race AbortController; curl export placeholder+truncated; TimelineView body-only segments; drop-on-column

### refactor(messages): shared messageFormats — commit `c6988820`
- src/shared/messageFormats.js (prettyJson/buildCurl/extractText/buildMarkdown)
- Page + export route dedupe (net -29 lines); extractText depth guard

### fix(observability): sourceApp/userAgent persisted end-to-end
- Sub-handlers + repo record now forward sourceApp/userAgent (verified app=curl)

### Research
- research/9router/21-messages-audit-refactor-design.md — audit findings, refactor decisions, real-world patterns (Sentry/Langfuse/Datadog)
- learnings/2026-08-08-stale-server-chunkload.md — stale-server + build corruption diagnosis

---

## UPDATE 2026-08-09 (per-request cost capture with provenance labels)

### feat(observability): per-request cost capture — commit `2867fbb9`
- `open-sse/handlers/chatCore/requestDetail.js`: new exported `computeCost(provider, model, tokens)` — cost in USD via `getPricingForModel` + `calculateCostFromTokens` (pricing lib, dependency-free), fully **fail-open** (any error → cost 0 / provenance `unavailable`, capture never breaks)
- `buildRequestDetail` now sets `cost` (number, USD) + `costProvenance` + `pricingModel` from the final merged tokens; explicit `overrides.cost` is honored as-is
- Provenance contract: `exact` (concrete PROVIDER_PRICING/MODEL_PRICING entry, reference-verified), `estimated` (PATTERN_PRICING glob fallback, e.g. `grok-*`), `unavailable` (no match or error)
- **Persistence fix**: `requestDetailsRepo.flushToDatabase` record whitelist dropped `cost`/`costProvenance`/`pricingModel` — round-trip test caught it; fields now carried in `data` (legacy rows unaffected, show "—")
- Messages page: **Cost column** in the list table (between Latency and Conversation, provenance-aware: `(est.)` / `(unavail.)` suffixes), drawer Cost InfoCell shows `(exact)/(estimated)/(unavailable)` + `pricingModel` tooltip, conversation aggregate cost in Conversations view
- `/api/messages` conversation grouping already sums `m.cost || 0` — works for new captures, no change needed

### Tests
- `tests/unit/cost-capture.test.js` — 18 tests: exact MODEL_PRICING / provider override / vendor-prefix stripping; token variants (input/output, cached discount, cache_creation, reasoning); pattern → estimated; unknown/absent → unavailable; fail-open (throwing token getter); buildRequestDetail integration + storage round-trip
- Full suite: 1751 pass / 86 fail (≤ 89 baseline budget), no new failures in touched areas

---

## UPDATE 2026-08-09 (compact-mode sidebar scroll fix)

### fix(layout): mobile sidebar drawer scrollable in compact mode
- Root cause: mobile drawer wrapper (`fixed inset-y-0`) had `overflow: visible`;
  `Sidebar` aside `min-h-full` grew past viewport (682px in 400px drawer) → nav's
  `overflow-y-auto` never engaged → content unreachable
- Fix: `overflow-y-auto custom-scrollbar` on drawer wrapper + `h-full` on aside
  (nav scrolls internally, logo/traffic lights stay fixed)
- Browser-verified: drawer nav scrolls (maxScroll 282); desktop sidebar no
  regression at 1024×320 (maxScroll 362)
- Committed in `7ec60ad8` (swept in with FTS5 work)

### docs
- `learnings/2026-08-09-compact-sidebar-scroll-fix.md` — root cause, fix,
  verification, general pattern for fixed-position scroll containers

---

## UPDATE 2026-08-09 (full-text search over request payloads)

### feat(messages): full-text search (FTS5 with LIKE fallback) — commit `7ec60ad8`
- **Repo** (`src/lib/db/repos/requestDetailsRepo.js`): `filter.search` in
  `buildWhere` (now async) → `getSearchCondition(term)`:
  - **FTS5 path**: lazily probes `CREATE VIRTUAL TABLE IF NOT EXISTS
    requestDetails_fts USING fts5(id UNINDEXED, conversationId, provider, model,
    status, content)`; probe result cached per process. On sql.js (no FTS5
    module) the CREATE fails → module falls back to LIKE. Query is
    `id IN (SELECT id FROM requestDetails_fts WHERE requestDetails_fts MATCH ?)`.
  - **LIKE fallback**: `(provider LIKE ? ESCAPE '\' OR model LIKE ? ESCAPE '\' OR
    data LIKE ? ESCAPE '\' OR conversationId LIKE ? ESCAPE '\')` with `%term%`;
    `%`/`_`/`\` in the term are escaped so they match literally.
  - **Escaping**: `sanitizeFtsTerm` strips FTS5 operator chars (`* : " ^ ~ ( ) [ ]
    { }`), collapses whitespace, wraps in double quotes (literal phrase); terms
    shorter than 2 chars skip FTS entirely (LIKE). MATCH failures belt-and-braces
    fall back to LIKE.
  - **Index population**: `flushToDatabase` upserts (delete+insert — FTS5 has no
    UNIQUE target for ON CONFLICT) `extractFtsContent(record)` = request messages
    text + response content + thinking + error, capped at 20KB/row.
  - **Janitor sync**: retention delete is followed by
    `DELETE FROM requestDetails_fts WHERE id NOT IN (SELECT id FROM requestDetails)`
    (repairs drift too).
  - `getRequestDetails` returns `searchMode: "fts" | "like"` (undefined when no
    search term).
- **API** (`src/app/api/messages/route.js`): accepts `search` query param, passes
  to filter, surfaces `searchMode` in the response.
- **UI** (Messages page): debounced (~300ms) search input in the filter bar
  (search prompts & responses), page resets to 1 on settled term, green
  `FTS` / amber `LIKE` mode tag next to the input, Clear resets it.
- **Backup fix** (`src/lib/db/backup.js`, commit `e582859a`): safety backups now
  exclude `requestDetails_fts` AND its FTS5 shadow tables
  (`*_data/_idx/_content/_docsize/_config` — name-reserved by SQLite, and the
  virtual-table CREATE can't be re-prefixed to the bak schema).
- Known limitation: rows captured before this feature are not backfilled into the
  FTS index (LIKE fallback still finds them); a lazy backfill is a possible
  follow-up.

### Tests
- `tests/unit/search.test.js` — 9 tests: request-text match, response-text match,
  no-match → zero totals, escaping (quotes/`*`/colon never throw, match literally),
  short/empty terms force LIKE, search+status combined, pagination totals,
  FTS index existence + orphan-cleanup sync, retention janitor keeps FTS in sync
  (fresh adapter via `global._dbAdapter` reset).
- Full suite: 1760 pass / 86 fail (≤ 89 baseline budget) — 86 == documented
  baseline, zero failures in touched areas (search/requestDetails/backup).
  `unit/search.test.js` passes in the full run.

## v1 — Node Failover (L2 proxy) — `bb55d754` (2026-08-09)

### feat(failover): node-DOWN protection proxy — `bb55d754`
- `cli/failover-proxy.cjs` (new, zero deps): health-probes local+peer every 2s
  (`/api/health`, `<500` = up), routes local-preferred / peer-backup, `x-9r-failover`
  loop protection, SSE-safe bidirectional piping, 120s upstream timeout,
  both-down → fail-open to local with the app's real error.
- docs: `research/9router/25-node-failover-implementation.md` (L0/L1/L2 design,
  scrutiny S1–S10, test plan).

### Verification (real world, mini-2 ↔ mini2)
- Local harness: failover/failback/loop-protection/both-down all green.
- Real world: killed each node's app in turn — the proxy on the down node kept
  serving from the peer (attributed via `requireLogin` identity marker);
  `/v1/chat/completions` through the proxy returned structured app errors (not
  connection refused); failback verified after both restores.
- Both proxies deployed on :20142 (mini-2 → local :20130/peer mini2 :20128;
  mini2 → local :20128/peer 192.168.1.154:20130).

### fix(failover): post-implementation scrutiny — 3 real bugs (2026-08-09)
- S11/S12 CRITICAL: unhandled `'error'` on client request + upstream response —
  client abort or app-killed-mid-stream crashed the proxy. Now tears down the
  upstream pair instead.
- S13 HIGH: stale-probe race (slow tick overwriting newer state) → monotonic
  `tickSeq` guard.
- S14 MEDIUM: hop-by-hop headers forwarded (RFC 7230 §6.1) → stripped.
- S15 MEDIUM: client closed mid-body → teardown on incomplete `close`.
- S16 LOW: empty 502 detail on Node 22 → `e.code || e.message || e.name`.
- Re-verified: T1–T5 matrix + C1/C2 crash-resilience tests pass; hardened build
  redeployed to both machines (final matrix 200/200/200/200).

### feat(messages): DB-level conversation aggregation + keyset pagination (2026-08-09) — committed on v1, 2026-08-09
- **B3 fix**: conversations were grouped from the current page's rows only (JS in the API route) → wrong counts/tokens/cost for multi-page conversations. Now `getConversationSummary` aggregates in SQL (`GROUP BY conversationId` over the FULL filtered set: messageCount, prompt/completion tokens with Claude `input_tokens`/`output_tokens` fallback, cost, first/last timestamp), NULL conversationId groups under `(none)`; `getConversationMessages(conversationId, {page,pageSize})` returns the full thread ASC (pageSize capped at 500). `/api/messages?view=conversations` uses the summary (pagination = conversation list); a `conversationId` param attaches the full thread server-side; Messages page lazy-loads threads on expand (`threads` cache, `(none)` key) and pages conversations by number with append.
- **Keyset pagination**: `getRequestDetails` now accepts `filter.cursor` (opaque base64url of `timestamp|id`) with `ORDER BY timestamp DESC, id DESC` and `(timestamp < ? OR (timestamp = ? AND id < ?))` — stable under inserts, no OFFSET scan/drift. Page-number mode kept (same order, backward compat) and anchors a `nextCursor` so both UIs chain into keyset; `pageSize+1` lookahead drives hasNext definitively; unparseable cursors fall back to offset page 1. API surfaces `cursor` param + `nextCursor` in pagination.
- **Tests**: `tests/unit/conversation-keyset.test.js` — 12 tests (temp DATA_DIR): 3 conversations (25 rows, 2 rows, 3 NULL-conv rows with timestamp ties), summary aggregates/order/`(none)`/pagination totals, full thread ASC + pageSize, keyset walk pageSize=10 → all 30 rows exactly once (no dupes/gaps), page-param agreement. Full suite: 1772 pass / 86 fail (budget ≤ 89), no touched-area failures.
- **Fixes found by tests**: offset/fallback paths now emit `nextCursor`; `hasNext` in keyset mode driven by `nextCursor` alone (page stays 1).

### feat(messages): B4 — upstream URL capture in cURL export (2026-08-09)
- `buildRequestDetail` carries `url` (base passthrough, overrides win); all 8
  capture call sites persist it: chatCore error paths (`providerUrl`),
  streaming/non-streaming/sseToJson handlers (`providerResponse.url`).
- repo flush record carries `url` in `data` (additive JSON — no DDL; absent on
  legacy rows).
- `buildCurl` uses the captured URL, placeholder fallback for legacy rows.
- `extractText` moved to `src/lib/extractText.js` (server-safe, no "use client"
  — requestDetailsRepo imports it for the FTS index); messageFormats re-exports.
- Tests: `tests/unit/b4-curl-url-capture.test.js` (5 pass). Commits: `a6ffda90` +
  `9a217338`.

### feat(messages): Error Inbox P2 — server-side error aggregation + triage (2026-08-09) `3cddabec`
- Design: `research/9router/25-error-inbox-p2-design.md` — coarse Sentry-style
  fingerprint `provider|model|errorCategory` (error text display-only),
  server-side aggregation over the FULL filtered set (fixes BoardView's
  page-window undercount), settings-KV triage, `inboxIssues` table deferred.
- `requestDetailsRepo.getErrorSummary`: SQL window-function GROUP BY with
  `status='error'` forced (indexed column) + JSON1 filters; counts, cost sum,
  first/last seen, sample error, latest `detailId` for drill-in; exported
  `errorFingerprint()`.
- `/api/messages?view=errors`: mirrors `view=conversations`; facets scoped to
  `status=error`; skips the unused flat-list fetch.
- `InboxView`: 4 triage columns (Open/Acknowledged/Resolved/Dismissed), category
  pills mirroring errorCategorizer taxonomy, Analyze reuses `/api/analyze-error`,
  View opens the shared detail drawer; triage persisted via settings KV
  `boardColumns` (MAP_REPLACE_KEYS — survives reload, deletes honored).
- Tests: `tests/unit/error-inbox.test.js` (17 pass); regressions green (53 in 5
  related suites incl. conversation-keyset, search, b4).

---

## UPDATE 2026-08-10 (goal-mode: Messages architecture completion)

### What landed (all 4 goal requirements + 2 E2E-caught bugs)
1. **Cost capture + provenance** — `computeCost(provider, model, tokens)` in requestDetail.js (fail-open; provenance exact/estimated/unavailable + pricingModel); repo whitelist fixed to persist cost fields; Cost column + drawer provenance. E2E: `cost=0.00001575, provenance=exact, pricingModel=gpt-4o-mini`.
2. **FTS5 search + LIKE fallback** — `requestDetails_fts` virtual table populated in flush (delete+insert upsert), `sanitizeFtsTerm`, LIKE fallback on sql.js (no FTS5 module), `searchMode` fts/like, debounced search box. E2E: search "banana" → 2 rows, FTS tag.
3. **DB-level conversation aggregation (B3)** — `getConversationSummary` GROUP BY over full filtered set (NULL→(none)), `getConversationMessages` full thread; conversations view uses summary.
4. **Keyset pagination** — opaque `timestamp|id` base64url cursor, `(timestamp < ? OR (timestamp = ? AND id < ?))`, pageSize+1 lookahead for hasNext, nextCursor; page-number mode backward-compatible.

### Bugs found & fixed during E2E
- **P1**: `flushToDatabase` imported `extractText` from `"use client"` messageFormats → every batch write threw silently → requestDetails never persisted. Fixed via server-safe `src/lib/extractText.js` (repo imports it; messageFormats re-exports).
- **P1**: messages route `ReferenceError: conversations is not defined` (missing declaration) → search API 500'd. Fixed with `let conversations = []`.

### Also landed (by other agents, same window)
- B4 upstream URL capture (real URLs in curl export) — `a6ffda90`/`9a217338`
- Error Inbox P2 — server-side error aggregation + triage — `3cddabec`

### Regression
Full suite **1794 pass / 86 fail** (within 88-baseline budget). Feature tests: cost-capture 18/18, search 9/9, conversation-keyset 12/12.

---

## UPDATE 2026-08-10 (Inbox render + provider-name crash fixes)

### fix(messages): `16d81223`
- **Inbox empty-state ordering**: `InboxView` branch moved before the
  `messages.length === 0` check — the errors view rendered the wrong
  "No messages captured yet" empty state whenever error groups existed but the
  flat message list was empty (which is the normal case for view=errors).
- **provider-name object → React #31**: `providerNames` mixes provider-config
  OBJECTS (`AI_PROVIDERS`) and display-name strings (provider nodes). Rendering
  the object as a React child crashed every view that hit a config-object
  provider (e.g. `openai`). Added `resolveProviderName()` helper
  (string → `.name` → fallback id) to `InboxView`, `BoardView`, `TimelineView`.
- **Browser-verified** all 6 tabs (List/Conversations/Timeline/Trace/Board/
  Inbox): OpenAI + OpenAI Codex resolved, rate_limit group ×62 with triage
  columns (Open/Acknowledged/Resolved/Dismissed).

### fix(failover): production hardening — launchd + Tailscale peers (2026-08-10)
- Automated test suite: `tests/unit/failover-proxy.test.js` — spawns the real
  proxy, T1–T6 (local-pref, failover, failback, loop protection, both-down,
  abort-survival), 6/6 green ×3.
- **Bug A (CRITICAL, found in production): failover never engaged under
  launchd.** mDNS `mini2-9.local` → link-local `fe80::` (EHOSTUNREACH), and
  macOS 15 Local-Network TCC blocks LAN IPs (10.2.0.x) for launchd jobs →
  `peerUp` always false → app death looked like "both down" → 502 to dead
  local. Fixed by switching both proxies to **Tailscale IP peers**
  (100.96.109.61 / 100.77.55.46 — exempt from TCC, <20ms). Verified from a
  launchd job.
- **Bug B (CRITICAL): no auto-restart.** App+proxy died overnight, nothing
  recovered them. Now launchd agents (`com.9router.app` + `com.9router.failover`,
  KeepAlive+RunAtLoad) on BOTH machines; verified kill→respawn→200 in <12s.
- Verified end-to-end: sustained-outage failover+failback both directions
  (identity-proven), auto-restart both machines, matrix 200/200/200/200.
- Doc 25 §10 + deployment-runbook updated (peer table, ops, verification).

---

## UPDATE 2026-08-10 (test authenticity + browser QA fixes)

### test: token helpers test the REAL code — `3843de58`
- Subagent audit: no fake/tautological tests in the 7 audited files (real SQLite,
  hand-computed assertions); one weak spot — `request-details-tab.test.js`
  duplicated the component's token helpers (tests could pass while the real
  logic drifted)
- Extracted `getCachedTokens/getCacheCreationTokens/getInputTokens` to
  `src/shared/tokenHelpers.js`; component + test import the same module

### fix(messages): conversation thread expand — `754aa60e`
- Stale-closure toggle (`!open` twice on fast clicks never fetched) → openRef
- Conversations start closed when thread not loaded (one click opens + fetches)
- loadThread pageSize 500 → 100 (API rejects >100 with 400)

### fix(messages): Trace view crash — `b2fe901f`
- `conv.messages.map` on undefined (API summaries carry aggregates only)
- Guarded + onExpand wired to loadThread; Loading/No-messages states

### QA
- Browser functional: all 6 tabs verified (List filters/drawer/formats,
  Conversations expand, Timeline chart, Board drag, Inbox triage persists)
- Vision QA via `dialagram/qwen-3.5-omni-plus`: List/Inbox/Timeline/Board
  reviewed — no real layout bugs (API-key-as-node-name is user data config)

---

## UPDATE 2026-08-10 (L1 in-app peer forwarding)

### feat(failover): L1 in-app peer forwarding — `1be5e96c`
- `settings.peerNodes` (default `[]`): array of peer base URLs
- `custom-server.js`: for `/v1*` requests, when LOCAL health probe fails AND a
  healthy peer is configured → forward to peer (streaming-safe, no buffering,
  `x-9r-failover` loop protection)
- Fixed real bug: local probe used `process.env.PORT || 3000` but the tray/CLI
  doesn't set PORT env → probe hit :3000; now uses `server.address().port`
- Covers "node up but unusable" (DB lock / provider meltdown / hung) —
  complements L2 standalone proxy (node-DOWN)
- Tested: 5/5 decision cases (forward/local-first/non-v1/loop/no-peer) + E2E
  forward path (request reaches peer, response pipes back)
- Doc: `research/9router/25-node-failover-implementation.md` §9.2 updated

### Note: no local model loading
- Vision QA used remote `dialagram/qwen-3.5-omni-plus` via gateway; this Mac
  runs no local LLM inference (only Hermes MCP watchdogs); mini2 reachable
  (100.96.109.61) serving 20128/20142

---

## UPDATE 2026-08-10 (model-serving policy — remote-only inference)

### feat(models): remote-only model serving — `fdf82774`

Policy: this Mac (mini-2) is the **control plane** and must NEVER run local
model inference. Model serving runs on **mini2** (macOS, Ollama) and ideally a
**Linux box**, both over Tailscale.

- `open-sse/config/providers.js` — `OLLAMA_LOCAL_DEFAULT_HOST` env override
  (default `http://localhost:11434`); `resolveOllamaLocalHost()` precedence:
  per-credential `providerSpecificData.baseUrl` → env → default. This Mac's
  launchd app plist sets it to mini2's Tailscale IP
  `http://100.96.109.61:11434` (launchd-safe; LAN IPs are TCC-blocked).
- `open-sse/services/model.js` — bare names `qwen2.5*` / `llama3*` now infer
  provider `ollama-local` via `MODEL_PREFIX_PROVIDERS` (previously fell back
  to openai).
- `open-sse/providers/registry/ollama-local.js` — category `apikey` → `free`,
  `noAuth: true` → keyless virtual connection injected by auth.js via
  `FREE_PROVIDERS` (mirrors the `9router` provider pattern).
- `open-sse/executors/ollama-local.js` — streaming uses Ollama's
  OpenAI-compatible `POST {host}/v1/chat/completions` (real SSE) with
  `responseFormat: "openai"`; non-streaming keeps native
  `POST {host}/api/chat`. (Native `/api/chat` streaming returns NDJSON which
  the SSE pipeline blocks — see research doc §2.5.)
- Ollama 0.32.7 on mini2: standalone binary + runtime in `~/.local/bin`
  (extract the WHOLE `ollama-darwin.tgz` — flat layout with llama-server +
  libggml dylibs beside the binary; missing runtime → "llama-server binary
  not found"); launchd agent `com.9router.ollama` (`OLLAMA_HOST=0.0.0.0:11434`,
  `OLLAMA_KEEP_ALIVE=30m`, KeepAlive); model pulled `qwen2.5:3b`.
- Same dashboard API key synced to mini2's DB — one Bearer key works on both
  nodes (authenticates the failover chain).
- E2E verified: non-stream + stream via this Mac app, via failover proxy
  (:20142), and on mini2's app; ultimate failover (local app killed → proxy →
  mini2 app → mini2 Ollama → OK); targeted tests 18/18.
- Docs: `research/9router/27-model-serving-policy.md` (policy + install recipe
  + linux join), deployment-runbook "Model serving (Ollama)" section.

---

## UPDATE 2026-08-11 (mini2 proper packaged install + full test)

### deploy: 9Router installed on mini2 as proper application (packaged CLI)
- `npm run pack:cli` → `9router-0.5.50.tgz` → scp → `npm install -g` on mini2
  → `~/.local/lib/node_modules/9router/` (cli.js + app bundle) +
  `~/.local/bin/9router` symlink + postinstall self-heal into
  `~/.9router/runtime/node_modules`
- launchd `com.9router.app` now runs the INSTALLED package path
  (`~/.local/lib/node_modules/9router/app/custom-server.js`) — persists reboot
- Old `/tmp/9r-deploy-new` backed up + removed (macOS purges /tmp)

### verified (full test matrix, all PASSED)
- Auth (login/key/401), /v1 chat stream+non-stream via ollama-local
  qwen2.5:3b (models on mini2, NOT this Mac), api/chat, responses,
  count_tokens, models
- All dashboard pages 200; Messages 6 views with real data; settings
  surface PATCH→GET; observability capture
- L2 failover: kill mini2 app → proxy flips to peer (identity-verified),
  chat via proxy serves from peer, restore → failback
- Loop protection 502, models CRUD, cli-tools, proxy-pools, export,
  headroom, KeepAlive respawn (<12s)
- L1 peerNodes set + code present; local requests serve locally

### docs
- `../operations/deployment-runbook.md` STATUS 2026-08-11 section
- `../planning/2026-08-10-mini2-install-and-test-plan.md` → completed
- workspace memory: `9router-install-semantics.md` (what "install 9router
  on a computer" means)

---

## UPDATE 2026-08-11 (late — failover gap fixes + cleanup)

### fix(failover): L1 settings-load retry — L1 now activates in production
- **Root cause:** `l1LoadSettings()` in `custom-server.js` ran once at
  `listening`, before the Next app initialized the SQLite adapter →
  `[DB] No SQLite driver available` → catch swallowed it silently → L1
  stayed OFF forever (peerNodes never loaded).
- **Fix:** retry with exponential backoff (1s→5s, max 10 attempts ≈ 30s)
  until the DB is ready; debug-logged under `DEBUG_L1_PEER_FORWARD`.
- Verified: new boot has no L1 error; settings load path reads
  `peerNodes` correctly from the bundle; failover unit tests 6/6.

### fix(failover): API key parity between nodes (the real failover blocker)
- **Root cause:** mini2's launchd plist set `API_KEY_SECRET=mini2-test-secret`
  + `MACHINE_ID_SALT=mini2-salt`; this Mac runs the defaults. API keys embed
  a CRC computed with `API_KEY_SECRET`, so the same key string validated on
  this Mac but was rejected on mini2 (`401 Invalid API key`) — a failover
  to mini2 would have rejected the harness's key.
- **Fix:** removed the custom secret/salt from mini2's plist → both nodes
  use the default `endpoint-proxy-api-key-secret`; also synced the local
  `vscode` key (`sk-c1e0216ea80d385a-ztagjz-adb74521`) into mini2's
  `apiKeys` table (mini2 had a different keyId for the same machineId).
- Verified: direct mini2 chat 200, via proxy 200, both directions.

### feat(failover): local `peerNodes` configured → mutual L1
- mini2 already had `peerNodes=["http://100.77.55.46:20130"]`; this Mac had
  `[]`. Set local to `["http://100.96.109.61:20128"]` → L1 in-app peer
  forwarding now mutual (degraded-local → peer).

### chore(cleanup): single app instance in the application folder
- Removed stale `~/.hermes/node/lib/node_modules/9router` (v0.4.71, unused)
  and disabled `com.9router.autostart` launchd agent (pointed at it, not
  running). Now: one app (`cli/app` → :20130), one proxy (:20142), tray.
- The earlier "4 instances" were: app + proxy + tray + an L1 test sandbox
  in `/tmp/9r-l1-final` (already gone).

### verified (real-world failover, both directions)
- Kill local app → local proxy serves from mini2 (`FAILOVER-WORKS`)
- Kill mini2 app → mini2 proxy serves from local (`MINI2-PROXY-FAILED-OVER`)
- launchd respawns both apps (<12s); final matrix 200/200/200/200

---

## UPDATE 2026-08-11 (full app + tray on mini2)

### feat(deploy): mini2 now runs the FULL application (tray icon) on latest build
- Rebuilt `cli/app` from HEAD (`npm run build` + `node cli/scripts/build-cli.js`,
  13:11) → rsync'd to mini2 `~/.local/lib/node_modules/9router/app` (replacing
  the 01:32 bundle). Both nodes: v0.5.50, `custom-server.js` MD5 identical
  (8204b864...), L1 retry fix present.
- mini2 launchd `com.9router.app` now runs the FULL app:
  `node .../9router/cli.js --tray --port 20128 --skip-update` (GUI session).
- **Root cause of "no tray icon on mini2"**: the systray icon binary
  (`tray_darwin_release`) is x86_64-only; mini2 is arm64 and had NO Rosetta →
  `spawn error -86 (Bad CPU type)`. The server ran fine (arm64 node) but the
  menu-bar icon couldn't spawn. NOT a copy/deploy problem — the bundle was
  identical.
- **Fix**: `softwareupdate --install-rosetta --agree-to-license` on mini2
  (no sudo needed) → restart `com.9router.app` → icon registers.
- Verified: `cli.js --tray` + `next-server` (:20128, 200) + `tray_darwin_release`
  (icon running) + failover proxy (:20142, 200) + ollama (:11434). Same
  topology as this Mac.

---

## UPDATE 2026-08-11 (multi-network failover)

### feat(failover): proxy now multi-peer — works on ANY network path
- `cli/failover-proxy.cjs`: `--peer` accepts comma-separated URLs; probes each
  every 2s, forwards to the first healthy peer (Tailscale → LAN → mDNS order).
  No more single hardcoded peer.
- launchd `com.9router.failover` on both nodes:
  - local: peers = `100.96.109.61:20128, 10.2.0.11:20128, mini2-9.local:20128`
  - mini2: peers = `100.77.55.46:20130, 10.2.0.22:20130, mini-3.local:20130`
- Verified: failover over LAN (10.2.0.11:20142 → local) and mDNS both work;
  forward + reverse failover with 3 peers each; final health 200/200/200/200.

---

## UPDATE 2026-08-11 (IPv6 toggle + hostname handling)

### feat(failover): --ipv6 security toggle + hostname/IPv4/IPv6 peer handling
- `cli/failover-proxy.cjs`:
  - `--ipv6` flag, **default OFF** (security): binds IPv4-only `0.0.0.0`,
    rejects IPv6 peer literals. ON: binds dual-stack `::`, allows IPv6 peers.
  - Peer URLs validated via `new URL()` (hostnames, IPv4, IPv6 `[::1]` bracket
    form all handled); malformed/IPv6-without-toggle peers filtered out.
  - Research (docs/plans-and-prompts): Node http.request already handles IPv6
    URLs + mDNS hostnames (A+AAAA, autoSelectFamily). IPv4+hostname sufficient
    for the 2-Mac LAN/Tailscale setup; IPv6 opt-in for IPv6-only/NAT64 networks
    and Tailscale fd7a::/48 as an extra path. IPv6 disabled by default because
    the app binds 0.0.0.0 anyway (not IPv6-reachable) and IPv6 link-local/RA/
    DNS-leak vectors are avoided on untrusted networks.
- Verified: 6/6 unit tests; live --ipv6 proxy binds IPv6 dual-stack and serves;
  hostname peer (mini2-9.local) resolves + forwards; final failover suite 7/7
  (normal, forward, reverse-via-LAN, health 200/200/200/200).

---

## UPDATE 2026-08-11 (IP-environment tests + single-URL verification)

### test(failover): dedicated IP-environment test suite
- `tests/unit/failover-proxy-ip.test.js` (7 tests): IPv4-only default (IPv6
  peer rejected, IPv4-only bind), --ipv6 mode (IPv6 peer accepted + dual-stack
  bind + IPv6 failover), hostname peer (localhost), malformed URL handling.
- Real local servers bound to ::1 (IPv6) + 127.0.0.1 (IPv4) — no mocks needed;
  IPv6 cases skip gracefully if the machine lacks IPv6.
- Result: 7/7 pass alongside existing 6/6 failover-proxy.test.js.

### verified: single-URL auto-routing (no client-side logic)
- ONE URL `http://mini-3.local:20142` (mDNS, any network): both-up → local;
  kill local → SAME URL auto-routes to mini2 (200); streaming SSE works through
  it; local recovers → fails back. Client never changes endpoints.
- The multi-peer proxy IS the single-URL answer: each node's :20142 has
  Tailscale+LAN+mDNS peers, so one URL on either machine handles node failure.

---

## UPDATE 2026-08-11 (dynamic peer auto-discovery — no hardcoded IPs)

### feat(failover): proxy auto-discovers all network addresses (no hardcoding)
- `cli/failover-proxy.cjs` --peer now takes a bare HOSTNAME (e.g. mini2-9.local)
  — resolves it to ALL addresses (dns.lookup all:true) + enumerates local
  interfaces + the hostname itself, and re-discovers every 15s (adapts to
  WiFi→LAN→Tailscale changes at runtime). No IPs in config.
- `--peer-port` added (peer can run on a different port than local:
  local=20130, mini2=20128).
- Explicit URLs (http://...) still supported (legacy exact control).
- launchd both nodes now use hostname-only peers: local → mini2-9.local:20128;
  mini2 → mini-3.local:20130.
- Tests: added D1/D2 (bare-hostname discovery + failover to discovered peer).
  15/15 failover tests pass (6 core + 7 IP-env + 2 discovery).
- Verified live: both-up → local; kill local → SAME proxy auto-routes to mini2
  via discovered peer (200); local restores.

---

## UPDATE 2026-08-11 (mid-stream cutout tests + probe hardening)

### test(failover): upstream-dies-mid-stream coverage (T7/T8)
- T7: upstream killed mid-stream → proxy survives (no crash), client gets
  clean disconnect, proxy still serves health.
- T8: upstream killed mid-stream → NEXT request fails over to the peer (200).
- Both use ephemeral ports (freePort) so parallel test files never collide.
- Total failover tests: 17/17 (6 core + 7 IP-env + 2 discovery + 2 mid-stream).

### fix(failover): probe response-stream error handler
- `probe()` in cli/failover-proxy.cjs now handles `res.on("error")` — an
  upstream socket destroyed mid-probe (node killed while probing) previously
  emitted an unhandled 'error' on the response stream, crashing the proxy.
  Found by T8 during mid-stream testing.

---

## UPDATE 2026-08-12 (provider observability & usage fixes — 6 threads)

Six related issues, all rooted in the same theme: **the dashboard under-reports
what's actually happening per provider.** Plan: `../planning/curried-chasing-lerdorf`
+ `../planning/2026-08-12-combo-duplicate-search-capabilities-plan.md`. Diffstat:
12 files / 361 insertions + 3 new components. All fixes reuse existing infra —
no schema changes, no new SSRF surface.

### fix(usage): OpenRouter + all default-path providers now record REAL tokens
- **Root cause:** OpenRouter (and every OpenAI-compatible provider) runs through
  the generic `DefaultExecutor`, which never asked upstreams for a final usage
  chunk. Only `iflow.js` injected `stream_options`. With no usage object the
  gateway fell back to a `chars/4` estimate — and for tool-only / empty-text
  streams `saveUsageStats()` early-returns on `in===0 && out===0`
  (`chatCore/requestDetail.js`), so usage was **silently dropped entirely**.
- **Fix:** `open-sse/executors/default.js` `transformRequest()` now injects
  `stream_options = { include_usage: true }` on streaming requests
  (`default.js:84-85`). Guarded by a new `supportsIncludeUsage(credentials)`
  (`default.js:92-100`) so it only applies to genuine chat-completions upstreams:
  skips `quirks.noIncludeUsage`, non-`openai` formats (claude/gemini/responses/
  ollama don't accept `stream_options`), and `openai-compatible-*` providers
  whose resolved API type isn't `chat` (i.e. `responses`). Never clobbers a
  caller-supplied `stream_options`. **Decision:** guard added rather than the
  naive "always inject when streaming" from the plan — a `responses`-format or
  Anthropic upstream would 400 on `stream_options`.

### feat(quota): OpenRouter added to the quota/credit tracker
- **Root cause:** quota tracker is a by-design allowlist — a provider renders
  only if its registry entry has `features.usage` AND there's a `USAGE_HANDLERS`
  entry. OpenRouter had neither, despite exposing `/api/v1/auth/key`.
- **Fix:** `providers/registry/openrouter.js` gains `features: { usage, usageApikey }`;
  `open-sse/services/usage.js` imports `getOpenRouterUsage` and maps it in
  `USAGE_HANDLERS` (`openrouter: (c) => getOpenRouterUsage(c.apiKey, c.proxyOptions)`);
  `open-sse/services/usage/openrouter.js` (new) GETs `/api/v1/auth/key` and maps
  `usage`/`limit`/`limit_remaining`/`is_free_tier` into the `{ quotas }` shape
  (modeled on `getVercelAiGatewayUsage`); `ProviderLimits/utils.js` adds an
  `openrouter` case to `parseQuotaData` handling `limit: null` → unlimited.
- **Deferred:** custom providers — no generic usage data source. Documented.

### feat(models): capability overrides — per-model vision/audio flags (F3/F4)
- **Root cause:** `open-sse/providers/capabilities.js` was static-only, so custom
  endpoints could never be marked vision/audio-capable and never appeared in the
  combo builder's vision/audio pickers.
- **Fix:** `settingsRepo.js` adds a `modelCapOverrides` default (`{}`, keyed by
  fullModel `provider/model`); `capabilities.js` gains `mergeUserCapabilityOverrides`
  layered over static caps; `/api/models/route.js` returns merged `caps`;
  `ModelRow.js` adds vision/audioInput toggle buttons → PATCH `/api/settings`;
  `useModelCaps.js` adds `refresh()` + `invalidateModelCaps()` so the combo
  pickers re-read caps after a toggle. F4 (dynamic filtering) needed no new
  code — `capFilter` + `getCaps` already drive the pickers.

### feat(models): combo duplicate (F1) + provider-name model search (F2)
- `combos/page.js`: "Duplicate" on `ComboCard` POSTs a full copy (`{name}-copy`,
  same models/kind) — previously "Copy" only copied the name string.
- `ModelSelectModal.js`: searching a **provider name** (e.g. "openrouter") now
  shows all its models. Prior `filteredGroups` hid a group when no *model name*
  matched, even if the provider name did.

### feat(observability): provider-page error panel + per-model error chip (thread 4)
- **Decision:** reuse **System B** (`/api/messages?view=errors&provider=<id>` →
  grouped `requestDetails` fingerprints) rather than the per-account `lastError`
  string (System A) that drives the card chip. System B carries count / first+last
  seen / category / sampleError / detailId — enough for real history, no schema
  change. **Gotcha:** the DB stores `model` as the **bare model id** (matches
  `model.id`), NOT the alias/fullModel — so per-model grouping keys on `model.id`.
- New `ErrorGroupList.js` (category pill, ×count, sampleError, relative time,
  "Analyze" → `POST /api/analyze-error {detailId}`), `ProviderErrorPanel.js`
  (provider-level Card + "Open in Messages" link). `page.js` fetches once, builds
  an `errorsByModel` map, threads `errorGroups` into each `ModelRow`; `ModelRow.js`
  renders a red count chip that expands the model's errors inline.

### feat(observability): usage/cost cards on the provider detail page (thread 5)
- New `ProviderUsageCard.js` reads `/api/usage/stats?period=`, maps
  `byProvider[providerId]` into `OverviewCards`, and filters `byModel` client-side
  (`key.endsWith('(<providerId>)')` — there's no server-side provider filter) into
  a per-model table (requests / input / output / cost / last used). Period selector
  (today/24h/7d/30d/all, default 7d). Accurate for OpenRouter after the usage fix.

### Verification
- Tests: `npx vitest run` → **1811 pass / 86 fail**; judged with
  `tests/__baseline__/verify-no-regression.mjs` against a JSON report → 86 known,
  0 stale, **0 NEW regressions** (exit 0). Provider/alias baseline drift is from
  unrelated v1 work (tokenrouter thinkingFormat, `9router` provider) — the
  `openrouter.js` `features` edit did not appear in the providers-baseline diff.
- Lint: only pre-existing `react-hooks/set-state-in-effect` on the new fetch
  effects, matching the codebase's established `fetchConnections`/`fetchAliases`
  pattern. No new error types.
- Browser: internal-browser verification blocked by a tool-permission-stream
  error; deferred.

---

## UPDATE 2026-08-13 (OpenRouter "Refresh Models" stuck on "Fetching...")

### fix(providers): Refresh Models button appeared to hang — 800+ serial round trips, not a backend timeout
- **Reported symptom:** clicking "Refresh Models" on the OpenRouter provider page
  left the button disabled with a spinner ("Fetching...") indefinitely. The
  user's API key demonstrably worked (same key pulled the full model list in
  VSCode Copilot's BYOK picker), which ruled out a bad key or a dead upstream
  and pointed at 9Router's own mechanism.
- **Live diagnosis (not static review):** curled the running dev server directly
  — `GET /api/providers/{id}/models?refresh=1` for the stored OpenRouter
  connection returned all **410 models in ~1s**. The backend route, the stored
  `apiKey`, and the OpenRouter API were never the problem.
- **Root cause:** `handleImportModels` (`page.js`) looped over all 410 returned
  models and, for each one, called `handleAddCustomModel`, which did
  `POST /api/models/custom` **then awaited a full `fetchCustomModels()` refetch**
  of the entire (growing) custom-models list, then dispatched a
  `customModelChanged` event — all three steps awaited **sequentially, one
  model at a time**. That's 800+ serial network round trips with a
  monotonically growing payload, and zero progress feedback, so a real (if
  slow) operation was visually indistinguishable from a hang. The `customModels`
  closure used for the "already exists" de-dupe check never actually benefited
  from those mid-loop refetches either — it was captured once at click time.
- **Fix:** `handleImportModels` now (1) computes the to-add list once up front
  against the click-time `customModels`/`modelAliases` snapshot, (2) POSTs each
  new model directly with **8-way bounded concurrency** instead of one
  `handleAddCustomModel` call at a time, (3) refetches `customModels` and
  dispatches `customModelChanged` **once**, after the whole batch completes,
  and (4) the button now renders live progress (`Importing 123/410...`) instead
  of a static "Fetching..." label, so a genuinely slow provider no longer reads
  as broken. `handleAddCustomModel` itself is untouched and still used by the
  Qoder import, manual add, and `ModelSelectModal` paths.
- **Verification:** curl round-trip on `/api/providers` confirmed the stored
  connection/id; curl on `/api/providers/{id}/models?refresh=1` confirmed the
  410-model response and timing; curl on `/api/models/custom` POST confirmed
  single-item write latency (~35ms) — consistent with the serial-loop theory
  (410 × (write + growing-list refetch) ≫ 410 × 8-way-concurrent write).
  `npx eslint` on the touched file surfaced only pre-existing
  `react-hooks/set-state-in-effect` warnings on unrelated effects already in
  the file (not introduced by this change).
- Files: `src/app/(dashboard)/dashboard/providers/[id]/page.js`
  (`handleImportModels`, new `importModelsProgress` state, button JSX).
- See: `learnings/2026-08-13-openrouter-refresh-models-serial-import-hang.md`

## 2026-09-17 — chat-log review: missing-task reconciliation (user directive)
- Directive: "make sure your reviewing this whole chat log for tasks that are missing as well that you have not recorded and put them in their proper places on the board"
- Reviewed full session history (state.db sessions referencing thread 1544031399110119588).
- Created 7 missing cards on 9router board (all blocked, subscribed to thread):
  - t_28c8f59f — RETRO pr-3610 reconciliation (merge c9d9bfc4)
  - t_a3a90267 — RETRO pr-3625 reconciliation (merge aa529821)
  - t_6f84b086 — RETRO feat/multi-protocol-custom-providers (merge 4dc8da37)
  - t_f6ee400b — RETRO pr3604-review conflict resolution (merge d1b889b3)
  - t_a2f1db7d — RETRO BUG-ERR-02 branch merge (merge fd50eeb4)
  - t_00a1575b — RETRO dual-instance model-loading conflict research (28-dual-instance-conflicts-and-cleanup.md)
  - t_9682b6d7 — OPS chat-log review itself
- Board-level rules updated: HOST-ISOLATION block added to board.json (was only on cards).

## 2026-09-17 — v3 full-suite QA run (mini3, corrected reporter)
- Prior background run on mini used `--reporter=basic` → crashed with known vitest 4.1.11 ERR_LOAD_URL (custom-reporter module load). No code state changed; run invalid for tally.
- tests/package.json "test" script itself uses `--reporter=verbose` — same crash class. Correct invocation: `npx vitest run` (default reporter).
- Per HOST-ISOLATION: verification moved to mini3 (node 26.8.1/npm 11.19.0). Cloned v3 from bundle (tip 562e30e2), npm install tests (45 packages), full suite running via default reporter (proc background, notify on done).

## 2026-09-17 — v3 full-suite QA baseline (mini3, default reporter, root deps installed)
- mini3 ~/9router-v3 (v3 @ 562e30e2) — `npx vitest run` (default reporter; basic/verbose crash ERR_LOAD_URL).
- TALLY: Test Files 30 failed | 272 passed | 11 skipped (313); Tests 87 failed | 2697 passed | 17 expected fail | 66 skipped (2867). Duration 28s.
- Root-deps fix moved 115→87 failures (missing root node_modules → 'Cannot find package open' class).
- Failure classes are pre-existing test drift (e.g. windsurf-executor baseUrl expects windsurf.com, impl returns codeium.com) — not v3 regressions from merges. Baseline for QA gate: 87 pre-existing failures.
