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

---

## PART 7 — The [DONE] Leak & Documentation Audit (2026-08-06, continued)

### Question 12: "Make sure we are keeping track of everything"

**User's words (condensed):** "Make sure our commits are well detailed too, include URLs and research. If we make commits to fix problems from other commits or code other people wrote, keep track in commit descriptions. Include links to PRs or commits. Also update plansANDprompts folder with ALL details — questions asked, reasoning, decisions, errors, everything. Other agents are making documents too, look at those."

**Agent's response:** Full audit of existing documentation from multiple agents:
- Read all 4 ADRs (001-004)
- Read all 3 learnings/postmortems
- Read SESSION-NARRATIVE (203 lines, Parts 1-6)
- Read SESSION-HISTORY, TASK-LOG, CHANGELOG
- Read prompts/session-prompts.md
- Read architecture/smart-router-observability.md
- Read plans/smart-router-observability-plan.md
- Read meetings/2026-08-05-06-session-summary.md
- Checked for other agent workspaces (.claude, .cursor, .codex, .kiro) — none found

**Gaps identified:**
1. `[DONE]` leak not documented in learnings/
2. SESSION-HISTORY bugs table missing bugs #6 and #7
3. TASK-LOG had completed items still in "In Progress"
4. CHANGELOG missing uncommitted fix details
5. SESSION-NARRATIVE missing Part 7 (this session continuation)

### The [DONE] Leak Investigation (detailed)

**Discovery path:**
1. User reported combo streaming issue → agent tested with mock upstream
2. Initial hypothesis: combo path returns streaming Response without SSE→JSON conversion when client wants non-streaming
3. Testing revealed: non-streaming was actually CLEAN; the real bug was streaming sending `[DONE]` twice
4. Confirmed NOT combo-specific: single-model streaming also doubled `[DONE]`
5. Mock upstream verified to send exactly one `[DONE]`
6. Code search: found `streamDoneSent` flag exists but never set in passthrough mode
7. Root cause: passthrough `transform()` forwards raw lines without parsing, so the flag-tracking logic from translate mode never fires
8. Fix: 4-line addition to set the flag when `data: [DONE]` passes through
9. Rebuild + restart + verify: all three paths clean

**Key insight:** The bug existed since passthrough mode was added. It was never caught because:
- Unit tests don't test streaming output byte-by-byte
- No E2E test counted `[DONE]` occurrences
- The duplicate doesn't cause visible errors in most clients (they just ignore extra `[DONE]`)
- It only became visible during careful curl inspection

### Documentation Standards Established

Per user's explicit request, all future commits must include:
- Full root cause analysis
- Links to related commits/PRs (if fixing prior work)
- Attribution (who wrote the original code, who found the bug, who fixed it)
- External references (URLs, docs, research)
- Whether changes come from user requests, PR imports, or agent-discovered issues

All tracking docs in `docs/plans-and-prompts/` must be updated BEFORE committing, not after.

### E2E Verification (2026-08-06, rule builder)
- Add Fallback Rule modal opens with target toggle (model/provider), Pick… button
- "+ Add Fallback Model" opens the full-catalog ModelSelectModal; selecting a model adds it to the ordered chain with up/down/remove
- Per-model retry override input appears per chain item
- Save persists advanced shape: `{"mockreal/gpt-4o-mini": {"models": ["kc/deepseek/deepseek-chat"], "retries": 1, "perModelRetries": {}}}`
- Rule renders in the table (Target | Chain with → | Retries | Delete)
- Markdown log card shows overwrite explanation

### Open items
- `[DONE]` SSE leak in combo streaming path (root cause known)
- Decide markdown flush semantics (overwrite snapshot vs append vs per-conversation)
- Decide which rule-builder UX to keep (visual builder vs textarea advanced vs future "chain diagram")

### FINAL FIX (2026-08-06): [DONE] leak in JSON responses — RESOLVED
Root cause (debug-traced with temporary logs):
1. `stream = body.stream !== false` forced streaming when client omitted stream
2. Upstream (via translator/executor) normalized to stream:false → returned JSON
3. `handleForcedSSEToJson` returned null (content-type application/json, not SSE)
4. Fell through to streaming path → JSON piped through SSE transform → [DONE] appended

Fix: `stream = body.stream === true` (only explicit requests stream; provider forceStream still respected).
Verified E2E: no-stream → clean JSON; stream:true → exactly 1 [DONE].
Commit: ccde7bff. Full suite 1692 pass / 88 pre-existing fail.

### The complete commit history (this session, all on v1):
9f4c1631 → 6f00d23f → a954b88f → acdc7134 → 1c921ce2 → d9415807 → 5932879f
→ d1c1db28 → 57e87729 → 3e7d1c7c → 40168739 → 3f678deb → 4627a299 → 99ac899f
→ 8990a3b4 → 0d07d82f → d1cc1faa → 3c86d01b → ccde7bff → d43572ec → 6449b58b

---

## FINAL CHAPTER (2026-08-07): The three fallback rule UX approaches — DONE

### The user's ask (exact words, from the session)
> "provide (under that same menu) another option... form style popup and then a table... auto-populating... choose the order models will be in as well as number of retries universally... optional per model override"
> "another option of your making for another way that we could have a really fluid and visually appealing way to make fallback rules"
> "we will eventually choose one of them but for now just keep what is already there"

### What the user meant by "another option" + "third option"
Reading the full request, the user wanted **multiple candidate UIs for the same feature** — a menu of approaches they could compare and later pick from. The first build delivered only ONE approach (modal + table). The completion check caught this gap: the 2nd and 3rd approaches were proposed in docs but never built. This final round built them.

### The three approaches (all edit the same `settings.modelFallbacks`)
1. **Table** — form modal (`FallbackRuleModal`) + rules table. The original, E2E-verified in the prior round.
2. **Chain Flow** — fluid drag-and-drop node chains. Each rule is a row of chips: the target node (highlighted) → sortable fallback chips with drag handles (dnd-kit `useSortable`). Drag a chip onto another to reorder (persisted instantly via PATCH). Inline per-model retry inputs under each chain. Dashed "Add" buttons open the full-catalog picker.
3. **Simple + Advanced** — collapsible rule cards. Simple view: target, chain chips, retries badge. Click the chevron → advanced view: ordered chain with remove buttons, universal retries input, per-model override inputs. Notes that rules run through the same combo engine as named combos.

A view switcher (Table / Chain Flow / Simple + Advanced) sits at the top of the Fallbacks card. Because all three edit one data model, switching views never loses data.

### E2E verification (production standalone, port 20130, mock upstream 24000)
- **Chain Flow drag**: `mockreal/model-id` dragged onto `deepseek` chip → UI order flipped → `PATCH /api/settings` persisted → confirmed via API (`{"models":["mockreal/model-id","kc/deepseek/deepseek-chat"],"retries":1}`) → reload kept the order.
- **Advanced view**: universal retries 1→3 persisted; per-model override `mockreal/model-id:5` persisted; Table view renders `(mockreal/model-id:5)`.
- **All 3 views re-verified** on the rebuilt server with persisted data.
- **vitest**: 1692 pass / 88 fail = exact baseline, zero new regressions.
- **lint**: 7 → 3 errors on the file (4 pre-existing fixed in the rewrite; remaining 3 pre-existing).

### Gotchas this round
- Server killed mid-test during rebuild → PATCH failed with `ERR_CONNECTION_REFUSED`, first drag reorder didn't persist. Retested cleanly after restart — the code was fine, the environment wasn't.
- `tests/translator/__snapshots__/golden-url-header.test.js.snap` regenerates on every vitest run — restore with `git checkout --` before committing.
- dnd-kit `useSensors` cannot be called inside a `.map()` — extracted a per-rule `SortableChain` component (hooks rules).
- `:has-text()` is a Playwright-only selector — invalid inside `page.evaluate`.

### Decision deferred (user's choice)
All three approaches stay available. The user will pick one later; no code needs removing — the view switcher already isolates them.
