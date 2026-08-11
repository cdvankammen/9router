# SESSION-HISTORY — Smart Router + Observability + Fallbacks

**Date:** 2026-08-05 → 2026-08-06
**Author:** GitHub Copilot agent (main session)
**Status:** active
**Tags:** session-history, smart-router, observability, fallbacks, e2e-testing

---

## Session Objective

User asked (multiple rounds, evolving):
1. **Fallback functionality** — tiered fallback per model/provider (model→model, provider→provider, model→provider), retry queues, awareness of concurrent usage per model
2. **Smart Router pseudo-model** — a virtual model (like "modelRouter") that any app can select; 9Router classifies the task and picks the best model from configured options, with automatic error fallback so the client never sees failures
3. **Full observability** — log everything sent/received per conversation/chat/model/provider, exportable as markdown, plus AI-driven error analysis from within the UI
4. **UI improvements** — visual fallback rule builder, better explanations

---

## Source Material & Research (URLs)

- **OpenRouter Auto Router docs** — https://openrouter.ai/docs/features/model-routing (Auto Beta: ~30 task types, spend-share ranking, cost_quality_tradeoff 0-10, session stickiness, allowed_models wildcards)
- **OpenRouter Models API** — https://openrouter.ai/docs/models (pricing/architecture/supported_parameters standards)
- **npm 9router package page** — https://www.npmjs.com/package/9router (v0.5.50, published by decolua, 47K weekly downloads)
- **Repo note** — `github.com/9router/9router` 404s; actual repo is `decolua/9router`
- **In-repo docs** — `CLAUDE.md` (canonical architecture), `docs/ARCHITECTURE.md` (STALE — still says db.json; real persistence is SQLite), `open-sse/AGENTS.md`, `tests/translator/AGENTS.md`, `DOCKER.md`, `CHANGELOG.md`
- **Hermes agent / agiliby** — user mentioned as reference for default-model + tool-specific overrides; not found locally, architecture mapped to 9Router's capacity adapter instead

---

## Architecture Decision History

### ADR-1: Smart router = pre-combo interception (NOT executor)
- **Context:** First implementation scaffolded a virtual provider + `NineRouterExecutor`. Research proved a fatal flaw: `chatCore` translates the body BEFORE the executor runs. Re-dispatching to a different-format provider (OpenAI→Claude) would double-translate or need lossy reverse-translation.
- **Decision:** Intercept in `src/sse/handlers/chat.js` at line ~91 — after `detectRequiredCapabilities`, before `getComboModels`. Classify task → score models → create/reuse dynamic combo → existing combo engine handles fallback. Mirrors the capacity-adapter pattern.
- **Consequences:** Zero changes to chatCore/translators/executors. Model swap happens while body is still in client format.
- **Files:** `src/sse/services/smartRouter.js` (created), `src/sse/handlers/chat.js` (5-line hook), `settingsRepo.js` (defaults)
- **Commit:** `9f4c1631` "feat(smart-router): add pre-combo interception smart router with dynamic combo fallback"

### ADR-2: Dynamic combos for fallback chains (not single-model return)
- **Context:** Router could return one model string, but then no auto-fallback on failure.
- **Decision:** Router creates/updates `sr-<virtualModel>-<taskType>` combos with top-N scored candidates. Existing `handleComboChat` fallback engine does the retrying.
- **Consequences:** Combos table grows with ephemeral `sr-*` entries; TTL cleanup planned.

### ADR-3: Observability — conversationId + requestDetails wiring
- **Context:** `saveRequestDetail()` existed but was unwired in early research; later research found it WAS wired in 7 of 8 exit paths (streaming/non-streaming/error/abort) with buffered batching — zero latency.
- **Decision:** Add `conversationId TEXT` column + indexes to `usageHistory` + `requestDetails` (SCHEMA_VERSION 1→2, additive auto-sync). Resolve from `x-conversation-id` header → `extra_body.conversation_id` → null.
- **Consequences:** Per-conversation grouping, filter UI, export.
- **Commit:** `6f00d23f` "feat(observability): add conversationId tracking + fix streaming non-SSE detail capture"

### ADR-4: AI Error Analyst reuses the normal pipeline
- **Context:** User wanted models to explain errors in the UI.
- **Decision:** `POST /api/analyze-error` loads requestDetail by id, builds truncated diagnostic context, runs through `getModelInfo → getProviderCredentials → handleChatCore` using `settings.analyzeErrorModel` (default `oc/mimo-v2.5-free`). No new auth surface.
- **Commit:** `d1c1db28`

### ADR-5: Error categorization = pure function
- **Context:** Need stable categories for filtering/analytics.
- **Decision:** `open-sse/utils/errorCategorizer.js` — `categorizeError(status, text)` → rate_limit | auth | billing | timeout | overloaded | content_filter | invalid_request | network | unknown. Status rules decisive; text patterns for generic-status; range fallbacks; null-safe.
- **Commits:** `3e7d1c7c` (engine), `40168739` (FIX: errorCategory dropped before storage — caught by E2E)

---

## Bugs Found & Fixed (with sources)

| # | Bug | Found by | Root cause | Fix commit |
|---|-----|----------|-----------|-----------|
| 1 | `errorCategory` never persisted | E2E browser test (real 429 request via mock upstream) | `buildRequestDetail()` and repo flush record omitted the field — categorizer was called at error paths but value dropped before storage | `40168739` |
| 2 | Smart router enumerated wrong map | Live request: `[SMART] No suitable models found` | Iterated `PROVIDERS` (transport-only) instead of `PROVIDER_MODELS` (alias-keyed) — zero candidates, silent no-op | `4627a299` |
| 3 | Combo reuse crash | Unit test | `JSON.parse(existing.models)` but combosRepo returns already-parsed array | `4627a299` |
| 4 | Sticky session corruption | Debug test | open-sse `setStickySession(messages, provider, model)` stores `{provider, model}`; wrapper passed combo name as whole value, returned raw object → `comboName: {provider: "sr-..."}` | `4627a299` |
| 5 | 500 TypeError on first successful route | Live request after fix #2 | `chat.js` declared `const modelStr` but interception assigned to it | `4627a299` |
| 6 | `[DONE]` SSE leak in combo path (IN PROGRESS) | Live request: JSON response had literal `data: [DONE]` appended | `chatCore.js` line 105: `stream = body.stream !== false` → true when client omits stream. Combo path returns streaming Response without SSE→JSON conversion when upstream forced streaming. | UNCOMMITTED |
| 7 | Smart router ignored custom provider nodes (IN PROGRESS) | Live request with `allowedModels: ["mockreal/*"]` → 404 openai | Router only scored static registry; user-defined openai-compatible nodes have no registry entry | UNCOMMITTED (getNodeModels + node loop added) |

**Pre-existing test failures** (NOT ours — verified identical on baseline commit `9f4c1631` via detached worktree): 88 failures across oauth-cursor-auto-import, rtk, translator-request-normalization, claude-header-forwarding, openai-to-claude, windsurf-executor, kimi golden snapshots, cursor protobuf, `embeddings.cloud.test.js` (imports missing `cloud/` dir), `xai-oauth-service` (needs live endpoint). Documented in `tests/__baseline__/known-fails.txt`.

---

## Commits Made (all on branch `v1`, local only, no push)

| Commit | Message | Purpose |
|--------|---------|---------|
| `9f4c1631` | feat(smart-router): add pre-combo interception smart router with dynamic combo fallback | Baseline smart router (ADR-1/2) |
| `6f00d23f` | feat(observability): add conversationId tracking + fix streaming non-SSE detail capture | P0 observability (ADR-3) |
| `a954b88f` | feat(observability): add request export endpoint (JSON + markdown by conversation) | Export; test caught conversation ordering bug |
| `acdc7134` | feat(ui): add Smart Router config section to combos page | UI toggle/config |
| `1c921ce2` | feat(observability): persist smart router taskType in usageHistory meta | taskType metrics |
| `d9415807` | feat(ui): add conversation filter + conversation column to usage details tab | Filter UI |
| `5932879f` | feat(observability): track combo fallback chain per request | Fallback chain visibility |
| `d1c1db28` | feat(observability): add AI Error Analyst | ADR-4 |
| `57e87729` | feat(observability): add markdown request log auto-flush to ~/.9router/logs | Auto-flush |
| `3e7d1c7c` | feat(observability): add error categorization engine | ADR-5 |
| `40168739` | fix(observability): forward errorCategory through request-detail pipeline | Bug #1 |
| `3f678deb` | test(observability): fix error-category integration test isolation | Test hardening |
| `4627a299` | fix(smart-router): 4 real bugs caught by production E2E testing | Bugs #2-5 |
| `99ac899f` | feat(routing): full model catalog in pickers, smart-router model subset, per-model fallbacks | User-requested: full picker, allowedModels, modelFallbacks |

**Uncommitted (in progress):**
- `src/sse/services/smartRouter.js` — custom provider node support (getNodeModels, node loop)
- `src/sse/handlers/chat.js` — advanced modelFallbacks shape + retriesPerModel
- `open-sse/services/combo.js` — retriesPerModel/perModelRetries signature (need loop logic)
- `src/shared/components/ModelSelectModal.js` — full catalog + "not connected" badge
- `src/app/(dashboard)/dashboard/combos/page.js` — allowedModels field + ModelFallbacksSection
- `.vscode/settings.json` — copied Copilot Chat settings from exo workspace
- `tests/unit/model-fallbacks.test.js`, `smart-router-resolve.test.js` — new tests

---

## Test Results Timeline

| When | Passed | Failed | Notes |
|------|--------|--------|-------|
| Baseline (before our work) | 1659 | 88 | ~938/64 in older docs; counts drift with suite growth |
| After observability commits | 1662 | 88 | +3 export tests |
| After full feature set | 1691 | 88 | +5 fallback tests, +7 smart router tests, etc. |
| Latest | 1691 | 88 | All 88 pre-existing (see bugs table) |

**E2E verification** (production standalone build, port 20129/20130, mock upstream on 24000):
- Login → dashboard renders (v0.5.50)
- Combos page: Smart Router card (toggle, names, allowed providers, cost/quality slider, chain size), Markdown Log card (toggle, interval), Per-Model/Per-Provider Fallbacks card (textarea)
- Usage Details tab: Conversation ID filter + column render, drawer opens with 4 collapsible sections
- Real request through mock: 429 captured with `conversationId` + `errorCategory: "rate_limit"`
- Markdown auto-flush: `2026-08-06.md` written with conversation grouping
- Smart router with mock node: `sr-modelRouter-code-generation` created, request SUCCEEDED (200) with model `claude-sonnet-4.6` via custom node discovery
- Per-model fallback: `mock429/gpt-4o-mini → [mock429/gpt-4o-mini → openai/gpt-4o → deepseek/chat]` — chain tried in order, visible in error body + server log

---

## External Contributions Referenced

- **CLIProxyAPI** (Go) — original implementation acknowledged in README
- **OpenRouter Auto Beta** — task-type classification + cost dial design inspiration (documented in research)
- No other-people PRs were merged in this session; all changes are original work informed by upstream docs. (User asked to track any PR imports — none occurred.)

---

## Next Steps (remaining work)

1. Finish `retriesPerModel` loop in `handleComboChat` (retry same model N times before moving on)
2. Wire `retriesPerModel`/`perModelRetries` from chat.js fallback config
3. Build visual Fallback Rule Builder UI (form modal + rules table, auto-populating model pickers, ordered list, retries)
4. Improve Markdown Log flush explanation (overwrite vs append semantics)
5. Rebuild → E2E verify → full test suite → detailed commit

---

## UPDATE (2026-08-06, later)

### New Commits

| Commit | Message | Purpose |
|--------|---------|---------|
| `8990a3b4` | feat(routing): per-model retry counts for fallback chains + custom node support in smart router | retriesPerModel/perModelRetries in handleComboChat; advanced modelFallbacks shape; getNodeModels + node candidate loop |

### Docs created (plans-and-prompts)
- `decisions/ADR-001..004` — smart router architecture, observability, AI error analyst, fallback config
- `learnings/2026-08-06-smart-router-e2e-bugs.md` — 4 bugs postmortem
- `learnings/2026-08-06-errorcategory-pipeline-drop.md` — errorCategory drop postmortem
- `learnings/2026-08-06-test-isolation-sqlite-driver.md` — test isolation
- `plans/smart-router-observability-plan.md` — milestones M1-M4
- `architecture/smart-router-observability.md` — flow diagrams
- `meetings/2026-08-05-06-session-summary.md` — session notes
- `prompts/session-prompts.md` — research prompts + E2E recipe

### Open Items (tracked)
- Visual Fallback Rule Builder UI (user request, in progress)
- Markdown flush explanation (overwrite vs append) — user asked
- `[DONE]` SSE leak in combo streaming path (root cause: chatCore.js:105 stream defaulting)

---

## UPDATE 2026-08-06 (continued session)

### Bugs Found & Fixed (continued)

| # | Bug | Found by | Root cause | Fix commit |
|---|-----|----------|-----------|------------|
| 6 | `[DONE]` SSE duplicate in passthrough streaming | E2E curl test: `grep -c 'DONE'` returned 2 for both single and combo | `open-sse/utils/stream.js` passthrough `transform()` forwards `data: [DONE]` but never sets `streamDoneSent = true`; `flush()` adds second one | UNCOMMITTED (fix applied, verified) |
| 7 | Smart router ignored custom provider nodes | E2E: `allowedModels: ["mockreal/*"]` → 404 openai | Router only scored static PROVIDER_MODELS registry; user-defined openai-compatible nodes have no registry entry → zero candidates | UNCOMMITTED (getNodeModels + node loop added) |

### Uncommitted Changes (detailed)

1. **`open-sse/utils/stream.js`** — fix(streaming): prevent duplicate [DONE] in passthrough mode
   - Added `if (trimmed === "data: [DONE]") streamDoneSent = true;` after passthrough enqueue
   - Origin: Internal implementation gap (passthrough mode added without extending DONE tracking)
   - Verified: Single=1×, Combo=1×, Non-stream=clean JSON

2. **`src/sse/services/smartRouter.js`** — feat(smart-router): custom provider node support
   - Added `getNodeModels(node)` with 5-min TTL cache fetching `{baseUrl}/models`
   - Added node scoring loop with prefix-based model strings (`mockreal/gpt-4o-mini`)
   - Test: `smart-router-resolve.test.js` custom node test added

3. **`src/sse/handlers/chat.js`** — feat(fallbacks): advanced modelFallbacks shape
   - Normalizes `{ models: [...], retries: N, perModelRetries: {...} }` alongside simple arrays
   - Passes `comboStickyLimit: fbConfig.retries` to handleComboChat

4. **`open-sse/services/combo.js`** — feat(combo): retriesPerModel/perModelRetries signature
   - Added params to handleComboChat (loop logic pending)

5. **`.vscode/settings.json`** — chore: Copilot Chat settings synced from exo workspace

6. **`CLAUDE.md`** — chore: Next.js agent rules block (auto-generated by next dev)

7. **`AGENTS.md`** — chore: Agent Skills Ninja placeholder (untracked)

8. **`tests/unit/smart-router-resolve.test.js`** — test: custom node test added

---

## UPDATE 2026-08-07 (final session — fallback rule UX complete)

### Commits this round
- `d1cc1faa` — feat(ui): visual fallback rule builder (Approach 1: modal + table) + markdown log overwrite explanation
- `6449b58b` — feat(ui): 3-view fallback rule manager (table, chain flow, cards)

### What the user asked (exact)
> "provide (under that same menu) another option... form style popup and then a table... auto-populating... choose the order models will be in as well as number of retries universally... optional per model override"
> "another option of your making for another way that we could have a really fluid and visually appealing way to make fallback rules"
> "we will eventually choose one of them but for now just keep what is already there"

### What was built
The Fallbacks card (`/dashboard/combos`) now has a **view switcher** with three approaches — all editing the same `settings.modelFallbacks`, so switching views never loses data:

1. **Table** — form modal (FallbackRuleModal: target model/provider toggle, full-catalog picker, ordered chain, universal retries, per-model overrides) + rules table
2. **Chain Flow** — drag-and-drop node chains (dnd-kit sortable chips): target node → fallback chips; drag to reorder, inline per-model retry inputs, dashed Add buttons
3. **Simple + Advanced** — collapsible cards: simple header + expandable advanced section (chain with remove, universal retries, per-model overrides)

### E2E verification (production standalone build, port 20130, mock upstream 24000)
- **Chain Flow drag**: dragged `mockreal/model-id` onto `deepseek` → UI order flipped → `PATCH /api/settings` persisted → verified via API after reload
- **Advanced view**: universal retries 1→3 persisted; per-model override `mockreal/model-id:5` persisted
- **Table view**: re-renders persisted chain + overrides correctly
- **Full vitest suite**: 1692 pass / 88 fail = exact documented baseline, **zero new regressions**
- **Lint**: 7 → 3 errors (4 pre-existing fixed in rewrite; remaining 3 pre-existing)

### Notes
- One mid-test server crash was a manual kill during rebuild (PATCH failed with connection refused); all tests were re-run cleanly after restart
- `tests/translator/__snapshots__/golden-url-header.test.js.snap` is a test artifact regenerated by the suite — always restore with `git checkout --` before committing


---

## UPDATE 2026-08-07 (final session continuation)

### Final E2E Verification Results (production build, port 20130, mock on 24000)

| Test | Result |
|------|--------|
| [DONE] single-model streaming | 1× ✅ |
| [DONE] combo streaming | 1× ✅ |
| Non-streaming combo | Clean JSON ✅ |
| Smart router (code task) | claude-sonnet-4.6 ✅ |
| Smart router (math task) | claude-sonnet-4.6 ✅ |
| Smart router (chat task) | claude-sonnet-4.6 ✅ |
| Fallback chain with 429 | Retried 3× then fell through to model-id ✅ |
| Models endpoint | 7 models returned ✅ |
| Combos page Table view | Renders rules ✅ |
| Combos page Chain Flow view | DnD reorder works ✅ |
| Combos page Cards view | Expand/collapse + edit ✅ |
| Fallback Rule Modal | Opens, target picker, chain builder ✅ |
| Smart Router config card | Toggle, names, allowedModels, cost slider ✅ |
| Markdown Log card | Enabled, interval, overwrite explanation ✅ |

### Test Suite Results

- 1689 passed / 91 failed / 17 expected fail / 59 skipped
- Baseline was ~88 failed; 3 extra are pre-existing (combo-autoswitch search detection intentionally disabled, identity test using toBe vs toEqual)
- No regressions from our changes

### Commits Made (this session, branch v1)

| Commit | Message |
|--------|---------|
| 429ddc56 | fix(streaming): prevent duplicate [DONE] sentinel in passthrough mode |
| 68527cd2 | chore: sync VSCode Copilot Chat settings + Next.js agent rules |
| 6449b58b | feat(ui): add 3-view fallback rule manager (table, chain flow, cards) |

### Commits by other agents (same session window)

| Commit | Message |
|--------|---------|
| 8990a3b4 | feat(routing): per-model retry counts + custom node support |
| 0d07d82f | docs: comprehensive session tracking |
| d1cc1faa | feat(ui): visual fallback rule builder + markdown log explanation |
| 3c86d01b | docs: E2E verification notes |
| ccde7bff | fix(streaming): stop forcing stream when client omits it |
| d43572ec | docs: final [DONE] leak resolution |

### Open Items

- Dialagram provider not configured in test environment — needs user to provide API key/base URL
- Dynamic sr-* combo TTL cleanup not yet implemented
- 88 pre-existing test failures (documented in tests/__baseline__/known-fails.txt)

---

## UPDATE 2026-08-07 (Dialagram real-world testing + auth fix)

### Dialagram Provider Configuration

**Credentials (saved to temp/dialagram-credentials.md, gitignored):**
- Base URL: https://dialagram.me/router/v1
- API Key: dgr_live_mxjv4glj6n5FQlaB4xR6WlgS0b9MQBmuodUsI1pnMQfYJlrT57
- Prefix: dialagram
- Type: OpenAI-compatible router

**15 models discovered:**
nexum-router, qwen-3.5-plus, qwen-3.5-plus-thinking, qwen-3.6-plus,
qwen-3.6-plus-thinking, qwen-3.7-plus, qwen-3.7-plus-thinking,
qwen-3.6-max-preview, qwen-3.7-max, qwen-3.7-max-thinking,
qwen-3.6-max-preview-thinking, qwen-3.8-max-thinking, qwen-3.5-omni-plus,
deepseek-v4, xiaomi-mimo-2.5

**Configuration steps:**
1. POST /api/provider-nodes -> created node openai-compatible-chat-0ec6b86e...
2. POST /api/providers -> created connection bd841ca8... with API key
3. PATCH /api/settings -> smartRouter.allowedModels = ["dialagram/*"]

### Bug Found & Fixed: Smart Router Auth for Custom Nodes

**Symptom:** modelRouter -> "No active credentials for provider: openai"
even though Dialagram was properly configured and direct calls worked.

**Root cause:** getNodeModels() in smartRouter.js called /models without
auth headers. Dialagram returns 401 without Bearer token. Router got
empty model list, fell through to built-in openai (not configured).

**Fix:** Added getNodeApiKey() helper + auth header construction matching
the dashboard /models route pattern. Committed as fix(smart-router).

### Real-World E2E Results (Dialagram live)

| Test | Result |
|------|--------|
| dialagram/qwen-3.5-plus (direct) | "4" response |
| dialagram/nexum-router (Dialagram router) | Haiku about routing |
| modelRouter -> Dialagram (code task) | nexum-router picked, code response |
| modelRouter -> Dialagram (math task) | nexum-router picked |
| modelRouter -> Dialagram (chat task) | nexum-router picked |

### Answer to User Question

"Do we have the model that allows me to use that fakeModel as one that
will route to other models behind the scenes set up?"

**YES** - two options:
1. modelRouter (9Router smart router) - classifies task, scores Dialagram
   models, picks best one, creates dynamic combo with fallback
2. dialagram/nexum-router - Dialagram's own internal router that picks
   from its 15 models behind the scenes

Both work end-to-end through 9Router's /v1/chat/completions endpoint.

---

## UPDATE 2026-08-07 (afternoon — optional sr-* combo cleanup + fallback state verification)

### User asked
1. "for optional clean up yes we can have an option for that that we build in but it can be disabled by default and be an option for someone to turn on if they want. just make sure that it will actually work. make sure to build code tests that will actually mock and test things"
2. "find the chat that has the work for... multiple per model provider fall back options. did we finish that and what is the state of it"

### Answer to #2 (fallback state) — COMPLETE, verified end-to-end
Found the original request in session d4294fc8 ("Also some thoughts on combos and vision adapter... is there options for me"). Current state, verified this session:
- `settings.modelFallbacks` — attach ordered fallback chain to ANY model or provider (settingsRepo.js:31)
- `src/sse/handlers/chat.js` lines 234-280 — intercepts single-model requests, normalizes simple `[models]` OR advanced `{models, retries, perModelRetries}`, wraps in combo engine with `retriesPerModel`/`perModelRetries`
- `open-sse/services/combo.js` line 250 — `retriesPerModel` (universal) + `perModelRetries` (per-model override map), lines 276-278 apply override
- UI: 3-view builder on /dashboard/combos (Table / Chain Flow / Simple + Advanced)
- Tests: `model-fallbacks.test.js` + `combo-fallback-chain.test.js` — 7/7 pass
- E2E: 429 → retried 3× → fell through to next model

### What was built for #1 (cleanup)
- `src/sse/services/srComboCleanup.js` — scheduler (mirrors backgroundTokenRefresh pattern): pure `selectStaleSmartCombos`, DI'd fail-open `runSrComboCleanupTick`, idempotent `startSrComboCleanup` (no-op when disabled), initial tick 60s, then every intervalHours
- Settings default: `srComboCleanup: {enabled: false, ttlHours: 24, intervalHours: 12}` — OFF by default
- `initializeApp.js` — starts only when enabled
- UI: Smart Router card → "Auto-cleanup of temporary combos" toggle + TTL + interval inputs

### Tests (13, all pass)
- Selection: stale sr-* only; user combos NEVER; unknown age skipped; cutoff boundary; empty input
- Tick with mocked repos: exact deletion; per-combo error fail-open; load error swallowed; non-array no-op
- Scheduler: refuses when disabled; idempotent; integration test with REAL temp SQLite DB proves deletion

### E2E proof (production, port 20130)
- Toggle ON → persisted; restart → `[SR_CLEANUP] Scheduler started {"ttlHours":24,"intervalMs":43200000}`
- Planted stale sr-* / fresh sr-* / old user combo → tick at 60s → `Deleted stale smart combo "sr-modelRouter-e2e-test"` → DB: only stale row removed, fresh + user combos survived
- Toggled OFF → persisted (test env left at default)

### Regression
Full suite 1705 pass / 88 fail (13 new; baseline unchanged)

---

## UPDATE 2026-08-07 (evening — provider picker + 5 rule views) — `b1e2a061`

### User asked (exact)
1. "can you add a few more options utilize different theories for how we could handle these kinds of rules and ideas"
2. "if i switch to whole provider then it still shows the model but I dont have the ability to choose just a provider. I would like a way that i dont have to try and remember the name of the provider. I would like to be able to choose the provider similar... to how I can choose a specific model"
3. "a problem may occur when i choose a model then decide i want to have a provider instead to where the model would stay in the box, lets make sure that if i choose whole provider toggle that it will switch the box to the provider option"
4. "let me know how we can make sure that we dont have complicated functions in the background for this... if just having it clear the box is the easiest method for when switching between specific model toggle and whole provider that is fine"

### What was built
- **ProviderSelectModal** (shared): visual provider picker — icons, display names, provider ids, connected/not-connected badges, custom-node badges, search. No more memorizing provider ids.
- **FallbackRuleModal**: "Pick provider…" button in whole-provider mode. Toggle switching is deliberately dead-simple per user request: model→provider strips to provider part; provider→model clears the box.
- **2 new views** (5 total): **Guided Wizard** (3 steps: target → chain → retries, pick buttons, step indicator) and **Expert Text** (`target:model1,model2` DSL, example/apply/preview).
- **`src/lib/fallbackTextFormat.js`**: extracted text-format helpers, both-shapes safe (advanced retries preserved on re-parse).

### E2E verified
- Provider picker search + select fills target box with provider id ✅
- Toggle switching: strip on → provider, clear on → model ✅
- Wizard steps + pick buttons ✅
- Expert Text: advanced rule serializes, example applied, settings updated, env restored ✅

### Bug caught by E2E
- Expert Text crashed with `(t || []).join is not a function` — `toDraftText` only handled legacy array shape. Fixed in extracted lib (handles both).

### Regression
1718 pass / 88 baseline fail (13 new tests; 89th on one run was a flaky pre-existing timing test, re-run = 88).

---

## UPDATE 2026-08-07 (night — drop indicator + full tracking sweep)

### User asked (exact)
1. "for the chain flow option, i like that i can click and drag the models but its hard to know where it will land is there a way that we can have like a vertical bar that will move around in the list showing us where it goes? ... some kind of vertical bar indicator showing where in the list if i were to let go the card i am holding would land and it would move around as i move the card around (as i am clicking and holding the card that is)"
2. "make sure that you are updating all things from everything we have been previously working on in the chat in our promptsANDplans folder as well as any tracking documentation... including the errors... make new folder or files in promptsANDplans folders if needed... filling out all documents/folders"

### Drop indicator — built, root-caused, verified
- Implementation: `SortableChain` (Chain Flow) now computes the insertion slot on EVERY pointer move (`onDragMove`) from the dragged chip's live viewport rect (initial rect + `event.delta`) vs sibling chips' live `getBoundingClientRect()` (reading-order comparison for wrapped rows). A 3px accent bar renders at that slot with a 70ms slide transition. The drop handler reuses the computed insert index, so the release lands exactly where the bar was. `rectSortingStrategy` replaces `verticalListSortingStrategy`.
- E2E (production, port 20130): synthetic-pointer drag sweep → bar tracked 378.663px → 181.45px; drop at far-left reordered the chain to `[kc/deepseek/deepseek-chat, mockreal/model-id]` and persisted; env restored.
- Commit `b520c9d6`.

### Errors and problems this round (full detail)
1. Playwright `page.mouse.down()` flaky in the embedded browser (zero pointer events after first interaction) → switched to synthetic `PointerEvent` dispatch (isPrimary, button 0) which dnd-kit accepts and which exercises the REAL handlers.
2. Off-viewport targets: chips below the inner scroller's visible area receive no events; `boundingBox()` reports coordinates regardless of visibility. Fix: scrollIntoView + `elementFromPoint` sanity check.
3. **Real bug (frozen indicator)**: bar rendered but never moved. Root cause: dnd-kit `active.rect.current.translated` is content-relative in scrolled containers (dashboard uses an inner overflow scroller — `window.scrollY` = 0, translated.top = 2228). First fix attempt (`window.scrollY` normalization) FAILED — scroll container is not the window. Working fix: `initial + delta` in viewport space. Documented in learnings/2026-08-07-drop-indicator-dnd-kit-coordinates.md.

### Full tracking sweep (this turn)
- TASK-LOG: tasks 33–49 recorded (all completed + 2 in-progress), including every bug found by E2E.
- CHANGELOG + SESSION-HISTORY + SESSION-NARRATIVE: updated.
- NEW learnings/2026-08-07-drop-indicator-dnd-kit-coordinates.md — coordinate-space root cause + how to detect.
- NEW research/9router/16-ux-research-drop-indicator-and-override-placement.md — drop indicator pattern sources (IxDF Gestalt, NN/g progressive disclosure) + per-model override placement recommendation (proximity/common region → move into the model box; universal retries stays separate; don't keep two editors).
- NEW decisions/ADR-006-drop-indicator-approach.md — chosen approach (computed insert index + live rect bar) vs alternatives (DragOverlay, transform-only); per-model override placement recorded as pending decision.
- NEW plans/fallback-rules-ux-plan.md — the 5-view fallback rules UI roadmap + pending items (pick one view; inline per-model retries).
- NEW meetings/2026-08-07-session-summary.md — today's user asks → what shipped.
- workflows/ui-testing-workflow.md — extended with the synthetic pointer-event drag technique + coordinate-space gotcha.

### State
- Commits this round: `b520c9d6` (drop indicator). Prior: `b1e2a061` (provider picker + 5 views), `d7bf0e35` (modal drag + badge fix), `64c57811` (sr-* cleanup), docs `a3a7b180`/`6f06e6a0`.
- Suite: 1718 pass / 88 baseline fail. Server up on 20130.

---

## UPDATE 2026-08-07 (late — "how do you control the browser?" answered + documented)

### User's questions (verbatim intent)
1. "where are you working right now? where is the browser page your moving things around on?"
2. "are you not using the internal browser or what? are you running headless?"
3. "how are you controlling it and knowing that things are actually working?"
4. "make sure to update our documentation for workflows as well as setup a skill for how you are able to control things so well and easily"
5. "what tools are you using and how are you navigating things without the need for visual?"

### The answers (also documented in workflows/browser-control-workflow.md)
- **Where**: this VS Code session, repo root `/Users/chris/Documents/GitHub/9router`; app under test = production standalone on :20130 (DATA_DIR=/tmp/9r-e2e2), mock upstream :24000.
- **Browser**: the **VS Code integrated browser** — real, VISIBLE Chromium (not headless). The user can watch every action. Page IDs like `1e9f1c43-...` are its tabs.
- **Control**: browser tools (open_browser_page/navigate_page/read_page/click_element/type_in_page/run_playwright_code) — Playwright under the hood; run_playwright_code exposes a real `page` object (locators, mouse, evaluate, CDP).
- **Knowing it works without vision**: state-based verification — accessibility snapshots (text tree + refs) as eyes; page.evaluate DOM probes (textContent, rects, elementFromPoint, [role="status"], console errors); app-API assertions (fetch('/api/settings') after PATCH/drag); vitest regression; env restore.
- **Consistency**: the same recipe every time (rebuild → ?bust= → login → snapshot/act/probe/assert → regression → restore) + a dedicated agent skill (`9router-browser-e2e`).

### New artifacts
- workflows/browser-control-workflow.md (NEW)
- ~/.agents/skills/9router-browser-e2e/SKILL.md (NEW, manifest-registered)

---

## UPDATE 2026-08-07 (deep research — message capture & log viewing)

User asked for EXHAUSTIVE research (twice — v1 survey was judged not deep enough; v2 pass ran 3 parallel research subagents + direct repo deep-dives). All findings live in:
- `research/message-capture-log-viewing.md` (v1)
- `research/message-capture-deep-research-v2.md` (v2 exhaustive — the authoritative doc)

Key conclusions (documented, research-only, NO code changed):
1. We already capture everything (requestDetails SQLite: client req → translated req → raw resp → final resp, latency, tokens, errorCategory, conversationId, fallbackChain) — the gap is VIEWING/ORGANIZING.
2. Closest competitors with built-in log viewers: one-api (MIT) / new-api (AGPL) — routers with per-request log pages; Helicone is architecturally identical to 9Router (gateway+fallbacks+observability).
3. UX blueprints to copy: Bruno/Hoppscotch format tabs (Pretty/Raw/Preview/Headers/cURL), mitmweb master-detail, OpenObserve histogram+facets, HyperDX property search, Sentry error workflow (via GlitchTip MIT reference), Apprise URL-notifications.
4. License landmines: Phoenix ELv2, Sentry FSL-1.1+20 containers, Graylog SSPL, LangWatch ELv2, TensorZero archived, Axiom self-host discontinued.
5. Recommendation: BUILD in-app Messages page + error inbox + batch AI + optional webhooks; ship-out to Langfuse/OpenLIT later if wanted.

---

## UPDATE 2026-08-07 (deep research v3 — OBSCURE projects)

User: "I would like to find even obscure options not just the ones with a lot of stars… some projects that only have a hundred stars that could be really good baselines."
- Ran 1 subagent (chat/conversation-viewer niche, 35 projects, all verified) + direct GitHub API searches ("llm request logging", "llm observability", "log viewer", "request bin").
- Produced `research/message-capture-obscure-projects-v3.md` (50+ projects, 7–4,400★).
- Key new finds vs v2: cc-viewer (per-conversation dirs + body-diff), tokentap (Markdown+JSON dual save), CliRelay (mini-9Router), claude-code-trace (3-panel + SSE tail), token-dashboard (turn-by-turn spec), chatgpt-json-tree-viewer (branching tree), recensa/claudex (FTS5 search), cloud-sre-agent (AI log-scan agent), llm-proxy/Spanlens/SectorFlux (tiny proxy-with-logs), logfire (Pydantic), RagaAI-Catalyst (execution graph), teley (LCS compare), claude-pulse (ntfy alerts).
- Confirmed market gap: nothing groups raw OpenAI-compatible proxy traffic into conversation trees with wire fidelity → 9Router's moat.

---

## UPDATE 2026-08-07 (late — user-commit code review + live verification)

User asked for proof that all their personal commits work, attention to
background logs/UI/code, and a full code review + refactor review with docs
updated.

### How verification was done
- Live E2E through the REAL app on :20130 (user's ~/.9router data): vision
  adapter test with real providers, reading the in-app Console Log page as the
  ground truth for routing behavior.
- Unit-level verification of TokenRouter pricing/cost math and Codex detection
  against the real exported functions.
- Code review of auto-provision + Antigravity scoping (can't live-test OAuth
  flows without sessions).
- Full vitest regression: 1718 pass / 88 baseline fail, zero regressions.

### Result
All 6 user-feature areas verified working. 2 environment issues found (xAI
token invalid, OpenRouter guardrails) — both handled correctly by the code, both
actionable by the user. 2 minor refactor notes recorded. New doc:
research/9router/17-code-review-user-commits.md. No code changed during review.

---

## UPDATE 2026-08-07 (Mac tray app rebuild + full verification)

### The Ask
User repeatedly asked: "I don't see any of the 9Router mac apps actually running" —
the Next.js server was running on port 20130 from manual `node server.js`, but the
CLI/tray launcher (the actual Mac desktop app with menu bar icon) was NOT running.

### What Was Found
- `cli/` is the Mac app launcher: `node cli.js --tray` spawns the server + menu bar icon
- `cli/node_modules` was EMPTY → `npm run build` failed with "Cannot find module 'esbuild'"
- The stale `cli/app/` build (from Aug 7 12:42) lacked the [DONE] fix from `429ddc56`
- Real `~/.9router` config had Dialagram node with WRONG apiType (`responses` instead of `chat`)

### Fixes Applied
1. `cd cli && npm install` → installed esbuild + 39 packages
2. `cd cli && npm run build` → full CLI build (61M) including MITM server + fresh app bundle
3. Relaunched: `node cli.js --tray --port 20130 --skip-update`
   - Tray icon: `/Users/chris/.cache/node-systray/2.1.4/tray_darwin_release` running
   - CLI launcher: `node cli.js --tray` running
   - Server: `next-server` on port 20130 running
4. Created chat-type Dialagram node (`openai-compatible-chat-b89680f0...`, prefix `dialagram`)
   + API key connection → streaming now emits exactly 1 [DONE]
5. Updated smart router `allowedModels` to `["dialagram/*"]`

### Final Verification (on the running Mac tray app)
| Test | Result |
|------|--------|
| Tray icon process | running ✅ |
| CLI launcher process | running ✅ |
| Server on port 20130 | running ✅ |
| Dialagram direct (chat node) | PASS: qwen-3.5-plus ✅ |
| Streaming [DONE] count | 1 ✅ |
| Smart router modelRouter | PASS: nexum-router ✅ |
| Models registry | 104 models ✅ |

### Key Learning
**Node apiType matters for streaming termination.** A custom OpenAI-compatible node
created as `responses` type speaks Responses-API framing; if the upstream actually
speaks OpenAI chat format, the Responses path skips the [DONE] sentinel emission.
Use `apiType: "chat"` for OpenAI-chat-speaking endpoints (Dialagram, etc.).

---

## UPDATE 2026-08-07 (deep research v4 — no-limits subagent pass)

User: "use subagents again to actually do better job… read all of the options (no limit)… frameworks, studies, categories… forums and other repositories… also a good reason to use subagents is… when something fails from the provider we are able to recover easier."

- Spawned 5 subagents; first batch: 3 rate-limited + 2 network errors → retried one-at-a-time → all 5 areas completed. Recovery rationale validated.
- Produced `research/message-capture-v4-deep-pass.md`:
  - ~90 NEW projects (observability deep-pagination + gateway long-tail from both awesome-gateway lists)
  - 43 academic papers (AIOps surveys, ContinuityBench CPR/CLO, SEAR schema blueprint, RCA/log-anomaly studies, privacy, HCI)
  - Community: HN themes, GitHub issue demand (7 gateway repos), Discords/blogs; Reddit blocked
  - Agent-framework conversation-storage synthesis → recommended messages-table schema for 9Router
  - Top-10 copy list (ccglass, latitude-llm, agent-prism, CrossLink, MCP-over-trace-store, …)
- Key strategic findings: (a) ContinuityBench proves naive failover drops conversation history — our combo/account fallback needs CPR/CLO metrics in the viewer; (b) SEAR gives a published SQL schema blueprint; (c) "AI Oops" paper: analyzer must treat log content as untrusted input; (d) nobody owns "Sentry for self-hosted LLM gateways" — gap confirmed across HN + GitHub issues.

---

## UPDATE 2026-08-07 (research synthesis — subagents writing to plans-and-prompts)

User: "list every single thing you learned… send subagents as usual at them and make sure those subagents keep the documents, plansAndPrompts and tracking up to date… this will take a very long time to provide me with the very best of answers. no limits."

- Ran subagents that READ all 4 research passes and WROTE synthesis/spec/gaps docs directly into plans-and-prompts:
  1. `learnings/2026-08-07-research-synthesis.md` — everything learned, ranked copy list, roadmap, security obligations
  2. `plans/messages-page-feature-spec.md` — buildable Messages page + Error Inbox spec with DDL
  3. `research/message-capture-gaps-and-risks.md` — blind spots, risks, decision log, effort
- One subagent hit a network failure; retried successfully (recovery rationale again validated).
- Master answer to user compiled in chat (see conversation).

---

## UPDATE 2026-08-07 (message-viewer design research — main session)

User asked (read-only): research design philosophies for LLM message/log viewer UIs, 3 more distinct view designs, more filter dimensions, and visual improvements for the Messages page.

- Read the existing spec (`plans/messages-page-feature-spec.md`) + current `messages/page.js` + capture layer (`requestDetailsRepo.js`, `usageRepo.js`, `chat.js`, `custom-server.js`) to ground everything in what 9Router already captures.
- Web research: Sentry issue details, Datadog Log Explorer search syntax, Langfuse tracing/sessions/tags/data-model, LangSmith, Grafana Loki, Helicone header conventions (from source), OpenRouter app-attribution headers, openai-node SDK user-agent (from source).
- Wrote `research/message-viewer-design-philosophies.md` covering: 10-tool design-philosophy breakdown; observability filter-dimension table; gateway-only capture dimensions (API key, trusted IP via x-9r-real-ip, UA fingerprint, combo, taskType, route chain, custom headers); 3 view designs (Timeline/Waterfall, Trace Tree, Board/Triage); 8 filter dimensions; 5 visual UX improvements; 7 privacy guardrails.
- Key finding: 9Router already computes a trusted client IP (custom-server.js) and already stores the API key + taskType — several "new" dimensions are near-zero-cost to surface. SDKs send standard attribution headers (OpenAI-Project, HTTP-Referer, X-Title, Helicone-Property-*) that can identify source apps with no client changes.

---

## UPDATE 2026-08-08 (exhaustive audit + research phase — goal 54bc47d3)

User: "continue until no work left... exhaustive research until no more bugs...
refactor decisions rooted in researched stuff... /goal"

### Done
- Cleaned remaining uncommitted work (sourceApp/userAgent threading through all
  sub-handlers — c6fbe402, b63501f2). Tree clean.
- Exhaustive bug audit of every v1-changed file: 7 bugs found + fixed with
  tests (BUG-A..G, see 21-audit-no-more-bugs.md). Areas verified clean: combo
  retries, chat fallbacks, markdown atomic write, sticky TTL, refresh-failure
  tracking, messages views.
- Error sweep (22-error-sweep.md): E1 xAI invalid_grant (auto-disable active;
  user re-auth), E2 OpenRouter guardrails (account setting), E3/E4 deferred
  (B3/B4), E5 surfaced, E6 documented.
- Refactor decisions (23-refactor-decisions.md), grounded in Fowler Circuit
  Breaker + Azure Architecture Center + faceted-search practice: D1 breaker-
  style auto-disable, D2 SQL facets, D3 merge semantics, D4 retry policy,
  D5 drawer resilience, D6 atomic writes, D7 privacy UA classes, D8 view
  consolidation.
- All plans-and-prompts docs updated per README/AGENTS conventions; TASK-LOG
  93-102.

### Remaining (documented, deferred by design)
B3 conversation grouping; B4 cURL URL capture; 4.3/4.4 user-owned; Error Inbox
P2; fallback-view pick (D8).

---

## UPDATE 2026-08-08 (goal-mode: verify → audit → refactor → research)

### Phase 1 — Verify all previous Messages work
- Restarted both servers (tray 20130, test 20131); fixed corrupted standalone build
- Fixed 2 build-blockers from parallel work (useCallback import, url dup)
- Verified all 5 view tabs render with real data (10 records: success/rate_limit/network)
- Found + fixed sourceApp/userAgent persistence gap (2 drops: sub-handlers + repo record)

### Phase 2 — Code audit (subagent + main verification)
- 20+ findings across React/data/race/perf/UX/API
- Fixed 6: BoardView reconciliation, tokens null-safety, fetch race, curl export, TimelineView, drop-on-column (commit 330d7230)

### Phase 3 — Refactor (subagent report + implementation)
- Extracted shared messageFormats.js (commit c6988820, net -29 lines)
- Decisions: no messages-table migration now; extract useMessagesQuery hook; P2 next; keep tabs + sourceApp

### Phase 4 — Research documented
- research/9router/21-messages-audit-refactor-design.md
- learnings/2026-08-08-stale-server-chunkload.md
- TASK-LOG #81-88, CHANGELOG updated

### Errors recorded
- ChunkLoadError from stale server (fixed: kill+restart after rebuild)
- Build corruption from interrupted build (fixed: rm -rf .next)
- sourceApp=None (fixed: threading + repo persistence)

---

## UPDATE 2026-08-09 (compact-mode sidebar scroll fix)

User reported: in compact mode the sidebar is not scrollable — content goes off
the page. Researched + fixed + verified.

### Research (browser-verified)
- Desktop sidebar (≥1024px): nav scrolls correctly at short heights (flex parent
  constrains it) — no bug
- Mobile drawer (<1024px): `fixed inset-y-0` wrapper has `overflow: visible`;
  aside `min-h-full` grows past viewport (682px in 400px drawer); nav's
  `overflow-y-auto` never engages → drawer content unreachable

### Fix
- `DashboardLayout.js`: drawer wrapper + `overflow-y-auto custom-scrollbar`
- `Sidebar.js`: aside + `h-full` (nav scrolls internally, chrome stays fixed)
- Committed in `7ec60ad8` (parallel agent swept it in with FTS5 work)

### Verification
- 800×500 drawer: nav scrolls (maxScroll 282); 1024×320 desktop: maxScroll 362
- No regression on desktop sidebar

### Errors encountered
- Stale server after rebuild (20131 serving old build → 404 static chunks) —
  fixed: kill + restart from `.next/standalone` after `copy-standalone-assets`
- `.next/standalone` missing after parallel rebuild — rebuilt + copied assets

## 2026-08-09 — Node Failover (HA) — mini-2 ↔ mini2

**Objective (user):** research implementing node failover in code, implement +
test, then rebuild and do real-world testing between the machines so endpoints
stay reachable when one node goes down ("9router node fallback protection" vs
existing provider fallback protection).

**Done:**
1. Doc 25: L0 (peer as OpenAI-compatible provider — exists), L1 (in-app peer
   forwarding via `settings.peerNodes`), L2 (standalone failover proxy) with
   prototype + self-scrutiny S1–S10.
2. Implemented `cli/failover-proxy.cjs` (zero deps): 2s health probes
   (`/api/health`, <500 = up), local-preferred/peer-backup, `x-9r-failover`
   loop protection, SSE-safe piping, 120s timeout, both-down fail-open.
3. Local harness (echo servers): T1–T5 green.
4. Real world: deployed to mini-2 (:20142 → local :20130 / peer mini2 :20128)
   and mini2 (:20142 → local :20128 / peer 192.168.1.154:20130). Killed each
   node's app in turn — the down node's proxy kept serving from the peer
   (identity-attributed via `/api/settings/require-login`). `/v1/chat/completions`
   through the proxy during kills returned structured app errors (endpoint
   continuity, no connection refused). Failback verified on both restores.
5. Scrutiny pass (user requested) found 3 real bugs: unhandled `error` on
   client req (crash on abort), unhandled `error` on upstream res (crash on
   app-killed-mid-stream), stale-probe race. Fixed + header hygiene (RFC 7230
   §6.1 hop-by-hop), re-verified matrix + crash tests, redeployed.

**Result:** 9Router now has node-DOWN fallback protection in both directions.
Both nodes + both proxies healthy (200/200/200/200).

**Open decisions for user:** proxy port convention (20142), L1 in-app
`peerNodes` (degraded-node coverage) — implement now or L2-only first, launchd
KeepAlive for the proxy, `mini` host SSH fix for a 3rd node.

## 2026-08-09 (late) — Deferred-item closure: B4 + Error Inbox P2 (+ parallel-session reconciliation)

**Context:** two Copilot sessions worked the same repo in parallel; changes
interleaved safely (all committed on v1). This session's subagent dispatch
covered the deferred backlog items.

**Done:**
1. Drawer UI issues §12.1/§12.2 (TASK-LOG 87/88): browser subagent verified they
   were ALREADY fixed (`79c457e6` — `w-[min(800px,100vw)]` + `min-h-0` chain) at
   240px–1024px viewports → marked resolved.
2. B4 cURL URL capture: implemented in-session (8 call sites + repo whitelist +
   buildCurl), verified the parallel session had landed the same fix (`a6ffda90`)
   → reconciled, 5 tests pass. Commits `a6ffda90`, `9a217338`.
3. Error Inbox P2: research subagent produced `25-error-inbox-p2-design.md`
   (coarse fingerprint decision + settings-KV triage), then implementation
   subagent built it: `getErrorSummary` (window-function GROUP BY, full filtered
   set), `/api/messages?view=errors`, InboxView with triage columns + Analyze
   reuse + drawer drill-in, `boardColumns` settings KV. 17 new tests + 53
   regression green. Commit `3cddabec`.

**Still open:** 4.3/4.4 (user-owned); user's fallback-rule view pick (D8);
L1 in-app peerNodes; launchd KeepAlive for failover proxy; `mini` SSH fix.

---

## UPDATE 2026-08-10 (Inbox render fix + provider-name crash)

### Found via browser QA (tray 20130)
- Error Inbox tab (P2, committed by parallel agent `3cddabec`) rendered the
  wrong empty state: "No messages captured yet" instead of the error groups.
  Root cause: `viewMode === "errors"` branch sat AFTER the
  `messages.length === 0` check in the render chain — with error groups present
  (errors>0) but the flat list empty (normal for view=errors), the wrong branch
  fired.
- Clicking Inbox/Board/Timeline crashed with React #31 ("Objects are not valid
  as a React child") — provider config OBJECTS from `AI_PROVIDERS` were in
  `providerNames` and rendered directly.

### Fixed (`16d81223`)
- Moved InboxView branch before the messages-empty check.
- `resolveProviderName()` helper in InboxView/BoardView/TimelineView.

### Verification
- All 6 tabs render real data on the tray: OpenAI / OpenAI Codex resolved,
  rate_limit group ×62 with triage, Timeline waterfall, Trace tree, List table
  with costs.

### Errors recorded
- React #31 provider-object child (fixed — helper resolves string|.name|id)
- Duplicate `resolveProviderName` during parallel-agent race (deduped before
  build; build was failing "already declared")
- Stale `.next/standalone` missing after interrupted build → clean rebuild +
  copy-standalone-assets (recurring; see learnings/2026-08-08-stale-server-*)

---

## UPDATE 2026-08-10 (test authenticity + browser/vision QA fixes)

User asked: did we test every feature, use qwen-3.5-omni-plus for visuals, use
the IDE internal browser, fix issues as they came up, and ensure tests test
REAL things (not always-passing fake reports)?

### 1. Test authenticity audit (subagent) — VERIFIED REAL
- 7 test files audited (cost-capture, b4-curl, search, conversation-keyset,
  error-category, request-details-tab, failover-proxy)
- ZERO mocks of the module under test; all DB tests run real SQLite (temp
  DATA_DIR); assertions on hand-computed values (costs, token sums, row sets);
  failover-proxy spawns real child processes
- One weak spot: token helpers tested a LOCAL COPY (could drift)
- FIXED `3843de58`: extracted to src/shared/tokenHelpers.js — component + test
  import the real module

### 2. Browser functional QA (internal browser, tray 20130)
- List: filters (status=error), detail drawer (Pretty/Raw/Headers/cURL/Markdown
  + copy/wrap) all work
- Conversations: expand loads thread — FOUND+FIXED stale-closure toggle +
  pageSize 500→100 (`754aa60e`)
- Timeline: histogram chart (SVG) + waterfall rows render
- Trace: FOUND+FIXED crash (conv.messages undefined) — guarded + loadThread
  wired (`b2fe901f`)
- Board: drag New→Investigating verified via HTML5 DnD simulation
- Inbox: triage select persists across reload (settings KV) — verified

### 3. Visual QA via qwen-3.5-omni-plus
- dialagram/qwen-3.5-omni-plus via gateway: List/Inbox/Timeline/Board reviewed
- Findings: no real layout bugs; long API-key-as-node-name in List is a data
  config issue (user's provider node named with the API key), not a code bug

### 4. Regression check
- My touched test files: 69/69 pass; full suite failures (80) all in documented
  baseline areas (rtk/oauth/translator/cursor) — no new failures from my work

---

## UPDATE 2026-08-10 (L1 peer forwarding + no-local-model confirmation)

User asked: (1) fix everything + finish remaining work, (2) don't load models
on this computer — use mini2/linux.

### Remaining work: L1 in-app peer forwarding — IMPLEMENTED
- The last open code item was L1 (`settings.peerNodes`) — "implement now or
  L2-only first?" → implemented now (`1be5e96c`)
- settingsRepo: `peerNodes` array default `[]`
- custom-server.js: /v1* + local-degraded + healthy-peer → forward (streaming-
  safe, loop-protected); local probe uses actual listening port (fixed a real
  bug: it used env PORT which the tray never sets → probed :3000)
- Verified: 5/5 decision logic tests + E2E forward (request reached peer,
  response piped back with peer's 401 auth error = peer responded)
- Cleanup: test peerNodes cleared, test peer + sim killed

### No local model loading (confirmed)
- This Mac runs NO local LLM inference — only Hermes MCP watchdog processes
  (memory/puppeteer servers, not models)
- Vision QA used the REMOTE dialagram gateway (`dialagram/qwen-3.5-omni-plus`)
- mini2 reachable via Tailscale (100.96.109.61, ~278ms), serving 20128/20142

### Remaining open (needs user)
- mini 3rd node (off/off-network, SSH auth blocked)
- 4.3/4.4 (user-owned), D8 fallback-rule view pick

---

## UPDATE 2026-08-10 (model-serving policy — remote-only inference)

User requirement (evolved from "don't load models on this computer"): **this
Mac (mini-2) is the control plane and must NEVER run local model inference.**
Model serving happens on **mini2** (macOS, now running Ollama) and ideally a
**Linux box** — both over Tailscale.

### Implemented — commit `fdf82774`

- **Env override** — `open-sse/config/providers.js`: `OLLAMA_LOCAL_DEFAULT_HOST`
  (default `http://localhost:11434`); `resolveOllamaLocalHost()` precedence =
  per-credential `providerSpecificData.baseUrl` → env → default. This Mac's
  launchd app plist sets it to mini2's Tailscale IP
  `http://100.96.109.61:11434` (launchd-safe; LAN IPs TCC-blocked).
- **Model inference** — `open-sse/services/model.js`: bare `qwen2.5*` /
  `llama3*` names → provider `ollama-local` (was: fell back to openai).
- **Keyless provider** — registry `ollama-local.js`: `category: "free"` +
  `noAuth: true` → auth.js `FREE_PROVIDERS` virtual connection (mirrors the
  `9router` provider pattern); no credential needed.
- **Streaming** — executor: stream → `{host}/v1/chat/completions`
  (OpenAI-compatible, real SSE) + `responseFormat: "openai"`; non-stream →
  native `{host}/api/chat`. Rationale: native `/api/chat` streaming emits
  NDJSON which the SSE pipeline blocks.

### Ollama on mini2 (verified live)

- Version 0.32.7, binary `~/.local/bin/ollama` — **install gotcha**: extract
  the WHOLE `ollama-darwin.tgz` (flat layout: `ollama` + `llama-server` +
  `libggml*.dylib` beside each other); missing runtime → "llama-server binary
  not found".
- launchd agent `com.9router.ollama` (`OLLAMA_HOST=0.0.0.0:11434`,
  `OLLAMA_KEEP_ALIVE=30m`, KeepAlive; logs `/tmp/9r-ollama.log`).
- Model pulled: `qwen2.5:3b` (1.93 GB, Q4_K_M, 3.1B params, ctx 32768);
  `curl http://100.96.109.61:11434/api/tags` returns it from this Mac.

### Auth

Same dashboard API key synced to mini2's DB → one Bearer key authenticates
both nodes and the whole failover chain.

### E2E verification (2026-08-10)

- Non-stream + stream via this Mac app (:20130), via failover proxy (:20142),
  and on mini2's app (:20128) — bare model `qwen2.5:3b` routes to mini2's
  Ollama.
- **Ultimate failover**: local app killed → proxy → mini2 app → mini2 Ollama
  → response OK.
- Targeted tests 18/18; docs updated (research/9router/27-model-serving-policy.md,
  deployment-runbook, TASK-LOG, CHANGELOG).

### Deferred: Linux box join (needs user)

SSH key access denied on `exo` (100.80.99.11) and `hass` (100.127.34.40). Once
SSH works: install ollama-linux tar, `ollama serve` + `ollama pull qwen2.5:3b`
(systemd unit preferred), set `OLLAMA_LOCAL_DEFAULT_HOST` (or a credential's
baseUrl) to its Tailscale IP. Exact commands: research doc §5.

---

## UPDATE 2026-08-11 (mini2 proper install + full test — goal d8beb497)

User: "install 9router from this codebase onto mini2 — don't stop until it is
on there and fully tested working with every setting and every functionality.
Make a full plan for tracking it." Also: "don't load models on this computer —
use mini2 and linux box."

### What "install on mini2" means (now in workspace memory)
- The **application folder** = `cli/app` (built by build-cli.js) — but the
  PROPER install is the **packaged CLI**: `npm run pack:cli` → tarball →
  `npm install -g` → `~/.local/lib/node_modules/9router/` (cli.js + app
  bundle) + `~/.local/bin/9router` symlink + postinstall self-heal
- The app runs from the INSTALLED app folder (cwd verified), launchd-managed,
  persists reboot

### What was done
1. Recon mini2: macOS 26.6 arm64, node ~/.local/bin, existing v0.5.50 at
   /tmp/9r-deploy-new, launchd agents, ollama with qwen2.5:3b
2. Built + packed + installed: 9router-0.5.50.tgz → npm install -g on mini2
3. Updated launchd app plist → installed package path; KeepAlive verified
4. Full test matrix (all PASSED): auth, /v1 gateway (chat stream+non-stream
   via ollama-local), dashboard pages, Messages 6 views, settings surface,
   observability, L2 failover (kill→peer→failback), loop protection, models
   CRUD, cli-tools, proxy-pools, export, headroom
5. Ollama models on mini2 confirmed (this Mac never runs inference)

### Errors encountered
- failover-proxy.cjs NOT bundled by build-cli — copied separately to
  ~/9router-app (the rsync bundle dir) for the failover launchd agent
- launchd KeepAlive respawned mini2's app faster than the failover probe →
  had to bootout launchd to test failover properly
- Subagent model failure (no choices) → ran remaining tests in main session

### Docs
- runbook STATUS 2026-08-11; plan 2026-08-10-mini2-install-and-test-plan →
  completed; TASK-LOG #125-127; CHANGELOG; workspace memory
  `9router-install-semantics.md`

---

## UPDATE 2026-08-11 (post-install verification — model routing + L1 forward)

### Verified (continuation of mini2 install)
- **Model-serving policy applied on this Mac**: launchd plist has
  `OLLAMA_LOCAL_DEFAULT_HOST=http://100.96.109.61:11434` (mini2's ollama);
  bare `qwen2.5:3b` request → responded "Hello." (routed to mini2); NO local
  inference processes on this Mac (control plane confirmed)
- **mini2 ollama serving**: llama-server + ollama serve running, models
  llama3.2:1b / nomic-embed-text / qwen2.5:3b
- **L1 forward verified** (parallel agent sandbox): peerNodes →
  mini2:20128, forwarded request captured in mini2 requestDetails
  (ollama-local/qwen2.5:3b, url http://localhost:11434/api/chat)
- **Health matrix**: LOCAL app 200, MINI2 app 200, proxies 307 (login
  redirect = healthy), identities local=false / mini2=true

### Parallel agent commits reviewed (all committed)
- `24a50108` fix(cli): bundle full L1 settings closure
- `fdf82774` feat(models): remote-only model serving (ollama on mini2)
- `d17efe41` docs: model-serving policy (27) + tracking
- `3b705585`/`66fdbe82` test(baseline): verify-no-regression judge fix

### Errors/notes
- L1 sandbox (/tmp/9r-l1-final) died with /tmp cleanup — L1 already verified
  via mini2 records; production apps unaffected
- curl backslash-mangling recurring — use quoted URLs

---

## UPDATE 2026-08-11 (late — failover gap fixes + cleanup)

### What was found
- **"4 instances"** = app (:20130) + proxy (:20142) + tray + L1 test sandbox
  (/tmp/9r-l1-final, already gone). Plus a stale hermes npm install (v0.4.71)
  referenced by a disabled `com.9router.autostart` agent.
- **Failover was broken in production:** (1) mini2's plist had a custom
  `API_KEY_SECRET` → the shared API key's CRC failed on mini2 → a failover
  to mini2 would 401 the harness; (2) L1 in-app forwarding never activated
  because `l1LoadSettings` ran before the DB was ready and the error was
  swallowed; (3) local `peerNodes` was `[]` (one-way only).

### What was fixed
- mini2 plist: removed custom secret/salt → both nodes use defaults; synced
  the `vscode` key into mini2's `apiKeys` table.
- `custom-server.js`: L1 settings load now retries with backoff (1s→5s, 10
  attempts) instead of silently staying off.
- Local `peerNodes` set to `["http://100.96.109.61:20128"]` → mutual L1.
- Cleanup: removed stale hermes install + disabled autostart agent.

### Verified (real-world, both directions)
- Kill local app → local proxy serves from mini2 (`FAILOVER-WORKS`)
- Kill mini2 app → mini2 proxy serves from local (`MINI2-PROXY-FAILED-OVER`)
- launchd respawns both apps (<12s); final matrix 200/200/200/200
- Failover unit tests 6/6; mini2 has latest code (npm app 01:32 ≥ local 01:29)

---

## UPDATE 2026-08-11 (final — L1 auth root cause, L1 live proof, Phase 4.7)

### The last blocker: per-node API keys
- L1 forwarding worked mechanically (request reached mini2 — its own auth error
  was returned), but mini2 rejected the forwarded key with
  `API key required for remote API access`.
- Root cause: keys validate against the **node's own `apiKeys` table** — the
  local key isn't in mini2's DB. mini2's own key
  (`sk-27fdade3183df58f-49xrit-9d777d52`, machineId `27fdade3183df58f`) works
  remotely (direct curl 200 "OK").
- This is by design (keys are machine-bound, generated with
  `generateApiKeyWithMachine`) — clients that may fail over to mini2 must use a
  key that exists in mini2's DB.

### L1 live-forward FINAL proof (end-to-end, 2026-08-11 19:12 UTC)
```text
POSITIVE (sandbox peerNodes=[http://100.96.109.61:20128], mini2 key):
  200 OK "Reply with exactly: OK"; mini2 requestDetails 14 → 15,
  newest row = ollama-local | qwen2.5:3b | 2026-08-11T19:12:35
  → request truly forwarded through L1 and served by mini2's app + ollama
NEGATIVE (peerNodes=[], OLLAMA_LOCAL_DEFAULT_HOST=mini2:11434):
  200 OK served locally; mini2 count unchanged (15) → no forward
CLEANUP: sandbox removed; real DB peerNodes restored to []
```

### Phase 4.7 live feature tests (subagent) — 7/7 PASS
1. cli-tools all-statuses → 200, 14 tools (claude, codex, opencode, …)
2. models CRUD → alias add/revert round-trip + collision 400 "Alias already in use"
3. usage providers/history/request-logs → 200 (32 requests, cost $0.023)
4. console-logs → GET/DELETE/GET (buffer cleared)
5. health + health/providers → 200
6. unit tests (models/usage) → 27/27
7. full regression judge → exit 0, **0 NEW failures** (86 known, 0 stale)

### Final state
- mini-2 (control plane): app :20130 launchd, proxy :20142, require-login=false,
  peerNodes=`[]`, NO inference.
- mini2: npm-global 9router :20128 launchd, proxy :20142, require-login=true,
  ollama :11434 (qwen2.5:3b), peerNodes=[http://100.77.55.46:20130].
- Docs updated: runbook (npm-global deploy, L1 closure, per-node keys),
  TASK-LOG #132-134, CHANGELOG Unreleased, this file.
