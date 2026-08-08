# TASK-LOG — Smart Router & Observability Session

**Date:** 2026-08-05 → 2026-08-06
**Author:** GitHub Copilot agent (main session)
**Status:** active
**Tags:** task-log, session

---

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
| 51 | Browser-control workflow doc | ✅ | `workflows/browser-control-workflow.md` — integrated browser (not headless), Playwright tooling, no-vision loop, gotchas, synthetic drag recipe, FAQ |
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
| 65 | Messages page feature spec | ✅ | `plans/messages-page-feature-spec.md` — DDL + list/detail/inbox/tree/export + P1–P4 rollout, all cited |
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
