# Postmortem: 4 Smart Router Bugs Caught by E2E Testing

**Date:** 2026-08-06
**Author:** GitHub Copilot agent
**Status:** active
**Tags:** #learning #postmortem #smart-router #e2e

## Situation

The smart router appeared "complete" — unit tests passed, build passed, code committed. But the FIRST real-world request through the production standalone build revealed the feature had never actually worked end-to-end.

## The 4 Bugs (in discovery order)

### Bug 1: Wrong data source → silent no-op
- **Symptom:** `[SMART] No suitable models found for modelRouter (task: code:generation)` then 404 "No active credentials for provider: openai"
- **Root cause:** `resolveSmartRouter` iterated `PROVIDERS` (from `open-sse/config/providers.js`) — that map is **transport-only** (baseUrl/format). `providerDef?.models` was always `undefined` → zero candidates → router always fell through to normal resolution.
- **Fix:** Iterate `PROVIDER_MODELS` (alias-keyed) and map alias→canonical id via `PROVIDER_ID_TO_ALIAS`.

### Bug 2: JSON.parse on already-parsed data
- **Symptom:** `SyntaxError: Unexpected token 'a', "antigravit"... is not valid JSON` on second request reusing an existing `sr-` combo
- **Root cause:** `getOrCreateSmartCombo` ran `JSON.parse(existing.models)` but `combosRepo` returns `models` as an ALREADY-PARSED array.
- **Fix:** Guard: `Array.isArray(existing.models) ? existing.models : safeParse(...)`.

### Bug 3: Sticky-session corruption
- **Symptom:** Second turn of a conversation got `comboName: {provider: "sr-..."}` — a corrupted object
- **Root cause:** open-sse `setStickySession(messages, provider, model)` stores `{provider, model}`. The app-layer wrapper passed the combo name as the WHOLE value and returned the raw object.
- **Fix:** Store combo name in the `provider` slot; read `entry.provider` back.

### Bug 4: `const` assignment crash
- **Symptom:** `TypeError: Assignment to constant variable` → 500 on the first successful route
- **Root cause:** `chat.js` declared `const modelStr = body.model` but the interception assigned `modelStr = comboName`.
- **Fix:** `let modelStr`.

## Root-Cause Pattern

All 4 bugs shared one cause: **the unit tests mocked the model list**, so they never exercised the REAL `PROVIDER_MODELS`/DB/sticky-session data paths. The unit tests passed while the integration was broken.

## Prevention

1. **Always run production E2E** with a real (mock) upstream before declaring a routing feature done
2. **Test against real data structures**, not mocks, for at least one integration test per feature
3. Browser-test the actual UI paths (toggle → persist → request → verify)

## Related

- Commit `4627a299` (fixes)
- Commit `8990a3b4` (custom node support — found by a follow-up E2E: custom provider nodes were invisible to the router)
