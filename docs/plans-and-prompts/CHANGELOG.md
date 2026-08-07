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
