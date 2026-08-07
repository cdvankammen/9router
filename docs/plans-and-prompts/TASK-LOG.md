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

### Newly Completed (2026-08-07 afternoon)

| # | Task | Status | Evidence |
|---|------|--------|----------|
| 33 | Optional sr-* combo cleanup (OFF by default) | ✅ | `srComboCleanup.js` scheduler; setting `srComboCleanup.enabled=false` default; UI toggle in Smart Router card |
| 34 | Mocked unit tests for cleanup | ✅ | `tests/unit/sr-combo-cleanup.test.js` — 13 tests (pure selection, DI'd fail-open tick, scheduler gate, integration-style real-DB tick) |
| 35 | E2E proof cleanup actually works | ✅ | Planted stale/fresh/user combos in E2E DB → tick deleted ONLY stale sr-* (`Deleted stale smart combo "sr-modelRouter-e2e-test"`), fresh + user combos survived; disabled path = scheduler never starts |
| 36 | Verify per-model/provider fallback state (user question) | ✅ | Confirmed COMPLETE: `settings.modelFallbacks` + chat.js interception + combo.js retriesPerModel/perModelRetries + 3-view UI; 7/7 fallback tests pass; found original request in session d4294fc8 |

### Key Discovery: Documentation Standards

Per user's explicit request, established standards for all future work:
- Every commit must include: full root cause, links to related commits/PRs, attribution (who wrote original, who found bug, who fixed), external references (URLs, docs)
- All tracking docs in `docs/plans-and-prompts/` must be updated BEFORE committing, not after
- Must note whether changes come from: user requests, PR imports, agent-discovered issues, or E2E testing
