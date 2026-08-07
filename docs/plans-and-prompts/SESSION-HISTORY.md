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
