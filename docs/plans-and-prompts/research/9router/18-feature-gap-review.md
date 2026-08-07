# Feature Gap Review — v1 Additions vs Original Codebase

**Date:** 2026-08-07
**Author:** GitHub Copilot agent (main session; subagent spawns were attempted but the model API was rate-limited/network-failing — same failure mode documented in earlier sessions)
**Status:** draft
**Tags:** #review #feature-gaps #smart-router #observability #fallbacks

## Scope

All features added on branch `v1` relative to `master` (tag v0.5.50), plus the
user's own pre-session features. 29 source files changed across the session.

## Feature-by-feature gaps

### 1. Smart Router (`src/sse/services/smartRouter.js`)
- **Does**: virtual model; classifies task → scores PROVIDER_MODELS → creates/reuses `sr-*` dynamic combos → sticky session (5-min TTL) → combo engine fallback.
- **Lacks**:
  - No UI to see *which* task type was detected per request beyond usage meta (taskType is stored but only surfaced in usage details).
  - Sticky-session TTL (5 min) is not configurable.
  - No visibility into *why* a model scored (score breakdown). Debugging "why did it pick X" requires log spelunking.
  - `getNodeModels` cache (5-min TTL) has no manual refresh/invalidation from the UI.
  - No tests for the scorer weights/tradeoff slider behavior (only resolution-level tests).
- **Scrutiny**: score-breakdown panel (per-candidate score with capability/cost reasons); expose sticky TTL as setting; test tradeoff slider mapping (0–10 → weights).

### 2. Observability suite
- **Does**: conversationId tracking, requestDetails capture, export (JSON/markdown), AI Error Analyst, error categorization (9 categories), markdown auto-flush.
- **Lacks**:
  - Markdown log auto-flush **overwrites** the daily file (snapshot, not append) — multiple concurrent servers/processes can clobber each other's writes (no lock).
  - `observabilityMaxRecords` (default 1000) is a cap — no UI indication when records are being dropped (silent data loss).
  - AI Error Analyst requires `analyzeErrorModel` to be reachable; if it fails, no fallback message tells the user *why* (model unreachable vs no detail).
  - Export endpoint has no pagination for large datasets.
  - Error categories are stable but not localized (English-only strings in UI).
- **Scrutiny**: add flush lock or per-conversation files; surface dropped-record count; test analyst failure path; paginate export.

### 3. Per-model/provider fallback rules (`settings.modelFallbacks`)
- **Does**: attach ordered chain to any model or provider; simple + advanced shapes; retriesPerModel/perModelRetries in combo engine.
- **Lacks**:
  - Provider-level rule (`fbMap[provider]`) and model-level rule can BOTH match — model-level wins silently; no UI hint that both exist.
  - No validation that fallback models actually exist in the catalog (typos silently become dead fallbacks).
  - Advanced shape per-model override keyed by full model string — if the model string changes (alias), overrides silently orphan.
  - No test for the "provider target matches" path specifically (model-fallbacks tests cover model targets).
- **Scrutiny**: UI warning when both provider+model rules exist; validate fallback strings against catalog; orphan-override cleanup.

### 4. Fallback rules UI (5 views)
- **Does**: Table, Chain Flow (drop indicator), Simple+Advanced, Guided Wizard, Expert Text; ProviderSelectModal; modal drag.
- **Lacks**:
  - 5 views is a lot to maintain; two are effectively duplicates (Cards vs Wizard overlap on retries editing). Awaiting user's pick (documented).
  - Chain Flow wraps unpredictably with long model names (no truncation/ellipsis on chips).
  - Expert Text editor silently ignores invalid lines (no inline error highlighting; preview shows count only).
  - Modal per-model retry inputs live in a separate section (UX research recommends inline; pending user approval).
- **Scrutiny**: chip truncation; Expert Text invalid-line highlighting; then consolidate to the user's chosen view.

### 5. sr-* cleanup (`src/sse/services/srComboCleanup.js`)
- **Does**: optional (off by default) sweep of stale `sr-` combos; fail-open; DI-testable.
- **Lacks**:
  - No UI visibility into *what* it deleted (log-only).
  - TTL measured from `updatedAt` — a combo updated by a re-score but never used stays forever until next re-score.
  - No safeguard test for deleting a combo that's currently sticky/active in the rotation map.
- **Scrutiny**: audit log entry in usage; skip combos present in `comboRotationState`/sticky map.

### 6. Custom node support in pickers/router
- **Lacks**: node `/models` fetch failures are silent (empty list, fail-open) — no UI badge "models failed to load" on the node.
- **Scrutiny**: surface fetch errors per node in the picker.

### 7. User's master features (verified working earlier today — see research/9router/17-code-review-user-commits.md)
- Capacity adapter, TokenRouter, self-hosted STT/TTS/embeddings, auto-provision key, Codex detection, Antigravity OAuth — all verified. Gaps: see upstream-risks doc for provider-side concerns.

## Cross-cutting findings

1. **Shallow settings merge (confirmed)**: `mergeWithDefaults` in `src/lib/db/repos/settingsRepo.js` shallow-merges. All 4 in-app PATCH callers (`combos/page.js` lines 122/135/148/174) send the FULL nested object → UI safe. Risk is **external API callers** sending partial nested objects (e.g. `{capacityAdapter: {vision: {...}}}`) → other capability defaults shadowed. Recommendation: deep-merge nested objects (capacityAdapter, smartRouter, srComboCleanup) in `updateSettings`.
2. **No TODO/FIXME/HACK** markers in session files (clean).
3. **Security**: markdown export escapes HTML (verified in prior session); API keys masked in usage; no XSS vector found in the new UI strings. AI Error Analyst sends truncated context only (no full request bodies with user content to third-party models — actually it does send message content; verify truncation settings before shipping to untrusted models).

## Prioritized action table

| # | Action | Value | Effort | Area |
|---|--------|-------|--------|------|
| 1 | Deep-merge nested settings in updateSettings | High (prevents silent default-shadowing) | Small | settingsRepo |
| 2 | UI warning when provider+model rules both match | High (surprising routing) | Small | combos page |
| 3 | Surface dropped observability records (cap exceeded) | Medium | Small | observability |
| 4 | Chip truncation + title tooltip in Chain Flow | Medium | Small | UI |
| 5 | Smart router score breakdown (why this model) | High | Medium | smartRouter + UI |
| 6 | Markdown flush lock (concurrent-safe) | Medium | Small | markdownLog |
| 7 | Validate fallback strings against catalog on save | Medium | Small | FallbackRuleModal |
| 8 | Node /models fetch error badge in pickers | Medium | Small | ModelSelectModal |
| 9 | Analyst failure-path message (why it failed) | Medium | Small | analyze-error |
| 10 | Consolidate 5 rule views → user's pick | High | Medium | UI |

## Related docs
- `17-code-review-user-commits.md` (user features verified)
- `19-upstream-provider-risks.md` (provider-side failure modes)
