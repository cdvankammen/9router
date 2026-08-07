# SESSION-NARRATIVE — Full Story (Every Question, Idea, Decision, Failure)

**Date:** 2026-08-05 → 2026-08-06
**Author:** GitHub Copilot agent (main session)
**Status:** active
**Tags:** #history #narrative #full-story

> This is the exhaustive narrative of the entire session. It captures EVERYTHING:
> user questions verbatim (paraphrased where long), agent reasoning, ideas explored
> (adopted AND rejected), failures, fixes, and the evolution of understanding.
> Companion docs: `../SESSION-HISTORY.md` (structured), `../TASK-LOG.md` (tasks),
> `../decisions/` (ADRs), `../learnings/` (postmortems).

---

## PART 1 — The Original Ask (2026-08-05)

### Question 1: "How does routing work? Can I add a custom provider and auto-discover /models? Can I set backup providers/models so failures auto-fallback?"

**User's words (condensed):** "Search the code and documentation, online docs, and the code itself. Is there a way when I add a custom provider to have it run /model and automatically get available models? Then is there a way to set a list of backup providers and models so if one fails it tries again before just sending the request to another model, without me needing to manually choose after failed tries? This would let whatever program uses 9router not worry about model failures."

**Agent's initial answer (research-based):**
- Model discovery: YES — validation endpoint (`/api/provider-nodes/validate`) tests `{baseUrl}/models`; dashboard fetch (`/api/providers/[id]/models`) lists models; `providerModelsFetcher.js` has 10-min cache; 40+ built-in providers have per-provider parsers + OAuth refresh
- Fallback: YES — combos (ordered lists, 3 strategies), multi-account rotation, token refresh retry, error classification with exponential backoff

**Key insight the user pushed toward:** a virtual "modelRouter" model that classifies tasks and picks the best model, with automatic fallback so the client NEVER sees failures.

---

## PART 2 — Research Phase (the "plan and prove it" rounds)

### Round A: "What's actually in the system? What exists and doesn't?"

Agent dispatched parallel research agents:

**Finding 1 (combo UI):** `/dashboard/combos` exists with ComboCard list, 3 strategies (fallback/round-robin/fusion), capacity adapter (vision/audio pools), per-combo strategy in settings. NO smart router UI, NO test playground, NO drag-drop in combo modal.

**Finding 2 (request pipeline):** The executor-based virtual provider has a FATAL FLAW — `handleChatCore` translates the body BEFORE the executor runs. Re-dispatching to a different format provider (OpenAI→Claude) would double-translate or need lossy reverse-translation. **This killed the executor approach.**

**Finding 3 (audit of my own earlier work):** The registry import `p120` for 9router was there, capabilities entries were there — but `open-sse/executors/9router.js` had a circular-dependency risk and the whole executor path was architecturally wrong.

**Finding 4 (observability):** `saveRequestDetail()` was thought "never called" by an early audit — FALSE. Deep audit showed it's wired in 7/8 exit paths with buffered/batched writes (zero latency, fire-and-forget). The real gaps: no conversationId, no errorCategory persistence, `appendRequestLog()` is a no-op, no export, no file logging.

### Round B: "Give me options, show me code blocks, self-review them"

Agent presented 4 architecture options for the smart router:

| Option | Approach | Verdict |
|--------|----------|---------|
| A | Pre-combo interception in `handleChat()` | ✅ ADOPTED — mirrors capacity adapter pattern |
| B | Combo `kind:"smart"` strategy | ⚠️ Fights the static-list abstraction |
| C | Capacity adapter extension | ❌ Wrong axis (modality vs task semantics) |
| D | RTK-style pre-translate hook | ❌ Runs too late (after translation decided) |

Agent also self-reviewed the P0 observability code blocks and found:
- "Wiring saveRequestDetail" was **unnecessary** — already wired
- Schema change needed `SCHEMA_VERSION` bump (1→2) + additive auto-sync
- `conversationId` must flow via `sharedCtx` spread (found sub-handlers don't auto-spread — each `buildRequestDetail` call needs explicit field)

### Round C: "Show me the code you'd write, review it again, are there flaws?"

Agent pre-validated against real code:
- `buildRequestDetail()` signature — where to add `conversationId`
- All 4 sub-handler call sites
- Migration strategy (additive auto-sync, version bump triggers backup)
- Streaming non-SSE edge case = the ONLY uncovered exit path

---

## PART 3 — Implementation Phase (the commits)

### Commit 1: `9f4c1631` — smart router baseline
- Created `src/sse/services/smartRouter.js` (classify → score → dynamic combo → sticky)
- Hook in `chat.js` before combo resolution
- `settingsRepo.js` defaults

**Bug that surfaced during testing:** `open-sse/` is gitignored — `git add` needed `-f` even though files were tracked.

### Commit 2-10: Observability suite
- `6f00d23f` conversationId + schema v2
- `a954b88f` export endpoint (test caught conversation ordering bug — details arrive newest-first, sections must sort chronologically)
- `acdc7134` Smart Router UI card
- `1c921ce2` taskType metrics (meta.taskType)
- `d9415807` conversation filter + column
- `5932879f` fallback chain logging
- `d1c1db28` AI Error Analyst
- `57e87729` markdown auto-flush (shared renderer extracted)
- `3e7d1c7c` error categorization engine
- `40168739` errorCategory pipeline FIX (E2E-caught)
- `3f678deb` test isolation fix

### Commit 11: `4627a299` — 4 E2E-caught smart router bugs
1. `PROVIDERS` (transport-only) vs `PROVIDER_MODELS` (alias-keyed) — router always found zero candidates
2. `JSON.parse` on already-parsed combo models
3. Sticky-session wrapper wrong shape
4. `const modelStr` assignment crash

### Commit 12: `99ac899f` — full catalog pickers + allowedModels + per-model fallbacks
- ModelSelectModal shows ALL 40+ providers (was connections-only → user saw only mock)
- "not connected" amber badge
- Smart Router allowedModels wildcards
- Per-Model/Per-Provider Fallbacks card (textarea format)

### Commit 13: `8990a3b4` — retries + custom node support
- `retriesPerModel`/`perModelRetries` in handleComboChat
- Advanced `modelFallbacks` shape
- `getNodeModels()` + node candidate loop (custom openai-compatible nodes)

### Commit 14: `0d07d82f` — docs (this session's tracking)

---

## PART 4 — The E2E Testing Saga (what unit tests missed)

### Setup
- Built production standalone; started on port 20130 with clean DATA_DIR
- Created mock upstream (`/tmp/mock-upstream.cjs`) on port 24000 — OpenAI-compatible with /models, /stats, /reset, /fail429, /fail500, streaming + non-streaming
- Registered it as a custom provider node (`mockreal` prefix) + connection

### The 5+ real bugs found

**Bug A — errorCategory dropped:** E2E request → 429 → captured detail had NO errorCategory. Fix: forward through `buildRequestDetail` + repo flush. Commit `40168739`.

**Bug B — smart router no-op:** `[SMART] No suitable models found` → iterated wrong map. Fix: `PROVIDER_MODELS` + alias mapping. Commit `4627a299`.

**Bug C — 500 TypeError:** `const modelStr` assignment. Commit `4627a299`.

**Bug D — custom nodes invisible:** `allowedModels: ["mockreal/*"]` → 404 openai. Router only scored static registry. Fix: `getNodeModels` + node loop. Commit `8990a3b4`.

**Bug E — `[DONE]` SSE leak (STILL OPEN):** JSON response had literal `data: [DONE]` appended when client omitted `stream`. Root cause: `chatCore.js` line 105 `stream = body.stream !== false` → true when omitted → upstream forced streaming → combo path returns streaming Response without SSE→JSON conversion. **Not yet fixed.**

---

## PART 5 — User Feature Requests Along the Way

### Request: "Add a visual fallback rule builder"
User asked for (under the Per-Model/Per-Provider Fallbacks card):
- Form-style popup + table showing configured rules
- Two sections/tables: per-model and per-provider
- Auto-populating model lists in the form
- Ordered fallback chain (choose order)
- Retry count: universal per rule + optional per-model override
- "Another option of your making for a fluid visually appealing way" — agent's ideas: (a) drag-drop ordered chips with ModelSelectModal picker, (b) "chain builder" visual path diagram, (c) keep textarea for power users as advanced mode
- User: keep what's there, we'll choose one later

**Status:** backend retry support done; UI pending.

### Request: "Explain markdown flush better"
User asked: does "flush interval" mean overwrite or append? Current behavior: **overwrites** the daily file with last-24h of details. Options to present: (a) keep overwrite (simple, always current), (b) append (history grows, risk of bloat), (c) per-conversation files. **Status:** explanation text + decision pending.

### Request: "Track everything, detailed commits with URLs"
User wants: full history in plans-and-prompts, detailed commits referencing PRs/URLs, tracking of what came from where (user vs PRs). **Status:** docs now comprehensive; commit messages include refs (OpenRouter docs etc.). No third-party PRs were merged this session — all changes are original work informed by upstream docs.

---

## PART 6 — Ideas Explored & Rejected (or deferred)

| Idea | Verdict | Why |
|------|---------|-----|
| Virtual provider + executor | ❌ | Double-translation flaw |
| Combo `kind:"smart"` | ❌ | Static lists can't do content-aware selection cleanly |
| Capacity adapter extension | ❌ | Wrong axis |
| RTK-style hook | ❌ | Runs after translation decided |
| Webhook alerting (P3) | ⏳ Deferred | Large scope, not core ask |
| Drag-drop in ComboFormModal | ⏳ Deferred | Cosmetic |
| Cloud sync of fallback rules | ⏳ Deferred | Not requested |
| Per-conversation markdown files | 🤔 Considered | User decision pending on flush semantics |
| "Chain builder" visual path diagram | 🤔 Proposed | One of 3 UI options for rule builder |

---

## PART 7 — Environment / Process Notes

- `docs/plans-and-prompts` is in `.gitignore` (line 92) with `!` un-ignore rules at lines 54-55 — force-add needed
- `open-sse/` files need `git add -f` (tracked but pattern-ignored)
- Other agents work in this repo concurrently: `CLAUDE.md`, `AGENTS.md`, `open-sse/utils/stream.js` had others' changes — left untouched (stream.js has a `streamDoneSent` [DONE] tracker from another agent, related to Bug E)
- VSCode settings synced from exo workspace (Copilot Chat continuation settings)
- Test suite: 1691 pass / 88 pre-existing fail (verified identical on baseline via detached worktree)

---

## UPDATE (2026-08-06, later) — Visual Fallback Rule Builder

### What was built
- `ModelFallbacksSection` now renders a **rules table** (Target | Fallback Chain | Retries | Actions) instead of just a textarea
- New **FallbackRuleModal**: 
  - Target selector (specific model with "Pick…" from ModelSelectModal, OR whole provider)
  - Ordered fallback chain with add-from-picker, up/down reorder, remove
  - Universal retries (1-10)
  - Per-model retry overrides (1-10 or inherit/blank)
  - Saves advanced shape `{target: {models, retries, perModelRetries}}`
- Existing rules display with → chain arrows + per-model override hint
- Delete rule button per row
- Textarea advanced-mode still exists in `toDraftText`/`parseDraftText` (kept for power users)

### Markdown log explanation
- UI now explicitly says "overwrites" — each flush replaces the day's file with latest 24h snapshot (NOT append)
- User decision pending: keep overwrite, switch to append, or per-conversation files

### Status
- Backend: committed (`8990a3b4`) — retries + custom nodes
- UI: built, compiles, pending E2E browser verification
- Commit pending (this change not yet committed)
