# CHANGELOG — Smart Router & Observability Session

**Date:** 2026-08-05 → 2026-08-06
**Author:** GitHub Copilot agent (main session)
**Status:** active
**Tags:** changelog, session

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
- CHANGELOG.md, SESSION-HISTORY.md, SESSION-NARRATIVE.md, TASK-LOG.md updated
- NEW learnings/2026-08-07-drop-indicator-dnd-kit-coordinates.md
- NEW research/9router/16-ux-research-drop-indicator-and-override-placement.md
- NEW decisions/ADR-006-drop-indicator-approach.md (+ per-model override placement recorded as pending)
- NEW plans/fallback-rules-ux-plan.md (5-view roadmap + pending items)
- NEW meetings/2026-08-07-session-summary.md
- workflows/ui-testing-workflow.md extended with synthetic pointer-event drag testing technique

---

## UPDATE 2026-08-07 (late — browser-control workflow doc + agent skill)

### User questions answered (see SESSION-HISTORY)
"Where are you working? which browser? headless? how do you control it and know things work without seeing? set up a skill for this and update workflow docs"

### What was created
- **`workflows/browser-control-workflow.md`** (NEW) — canonical doc answering the questions:
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
- **`plans/messages-page-feature-spec.md`** — concrete buildable spec for Messages page + Error Inbox (2,069 words): SQLite `messages` DDL sketch + indexes, list/detail/conversation-tree/export features, error-inbox workflow, phased rollout P1–P4, every feature citing research source
- **`research/message-capture-gaps-and-risks.md`** — blind spots (Reddit blocked w/ manual URLs, OTel churn, maintenance risks, license traps), 10 implementation risks w/ mitigations, 7-question decision log (D1–D7, none block P1), effort table (P1–P4 ≈ 4.8k–6.8k LOC)
- Method: 2 subagent batches; 1 network failure recovered by retry (validates subagent-recovery rationale)
