# Research: Hybrid Round-Robin + Fallback Combo Behavior

**Date:** 2026-08-31
**Author:** GitHub Copilot (main session)
**Status:** active
**Tags:** #research #combos #routing #round-robin #fallback #fusion #temporary-rules

## Question / Objective

User wants combo models that can do **both** round-robin (load spreading) **and** fallback (try next on failure) in the same combo, with optional temporary rules. Today combos have a single `fallbackStrategy` per combo (`fallback` | `round-robin` | `fusion`). We need to understand current behavior, whether hybrid already exists, what "temporary rules" could mean, and where to insert new logic.

## Sources Consulted

- Code: `open-sse/services/combo.js` — `getRotatedModels`, `handleComboChat`, `handleFusionChat`, `comboRotationState`, `reorderByCapabilities`, `detectRequiredCapabilities`
- Code: `src/sse/handlers/chat.js` — combo dispatch, `comboStrategy` resolution, `augmentModelsWithCapacityAdapter`, `handleSingleModelChat`
- Code: `src/lib/db/repos/settingsRepo.js` — `DEFAULT_SETTINGS.comboStrategy`, `comboStickyRoundRobinLimit`, `comboStrategies: { [comboName]: { fallbackStrategy, judgeModel, fusionTuning } }`
- Code: `src/app/api/settings/route.js` — PATCH invalidates rotation on strategy change
- Code: `src/app/(dashboard)/dashboard/combos/page.js` — `ComboCard` strategy selector, `handleSetComboStrategy`, `FusionTuningRow`
- Code: `open-sse/services/accountFallback.js` — `checkFallbackError`, cooldowns, `isAccountUnavailable`
- Code: `open-sse/handlers/chatCore.js` — per-model execution, token refresh, retry
- Grep: `comboStrategy`, `round-robin`, `fallback`, `sticky`, `retriesPerModel` across repo

## Raw Findings

### 1. Current combo strategies (single choice per combo)

**Storage:** `settings.comboStrategies` is a map `{ [comboName]: { fallbackStrategy, judgeModel, fusionTuning } }` plus globals `settings.comboStrategy` (default `fallback`) and `settings.comboStickyRoundRobinLimit` (default `1`). Persisted in `settings` table (JSON blob, id=1). Per-combo entry overrides global.

**UI:** `src/app/(dashboard)/dashboard/combos/page.js` `ComboCard` shows a `<Select>` with 3 options:
- `fallback` — "Fallback — try in order"
- `round-robin` — "Round Robin — rotate"
- `fusion` — "Fusion — panel + judge"

`handleSetComboStrategy` merges patch into `comboStrategies[comboName]` and PATCHes `/api/settings`. If strategy is `fallback` with no extras, entry is pruned (no storage).

**Dispatch:** `src/sse/handlers/chat.js` `handleChat`:
```js
const comboStrategies = settings.comboStrategies || {};
const comboSpecificStrategy = comboStrategies[modelStr]?.fallbackStrategy;
const comboStrategy = comboSpecificStrategy || settings.comboStrategy || "fallback";
```
Then:
- if `fusion` → `handleFusionChat`
- else → `handleComboChat({ comboStrategy, comboStickyLimit, ... })`

### 2. How round-robin and fallback interact TODAY

**`getRotatedModels(models, comboName, strategy, stickyLimit)`** in `combo.js`:
- If `strategy !== "round-robin"` → return `models` unchanged (no rotation).
- If `round-robin` → use `comboRotationState` Map keyed by `comboName` (or `__default__`), with `{ index, consecutiveUseCount }`. `stickyLimit` (default 1) = requests per model before advancing. Rotates via `rotateModelsFromIndex`.

**`handleComboChat`** in `combo.js`:
- Calls `getRotatedModels` first (rotation if round-robin).
- Then optionally `reorderByCapabilities` (auto-switch for vision/audio).
- Then **fallback loop**: iterates `rotatedModels` in order, with per-model `retriesPerModel` (default 1), circuit breaker `failedProviders` Set, `checkFallbackError` to decide if should fallback, and `fallbackChain` observability. On success, returns immediately; on failure, tries next model. If all fail, returns 503 with `fallbackChain`.

**Conclusion:** `round-robin` TODAY already IS hybrid: it rotates the starting point per request, then falls back sequentially on failure. Example with `models=[A,B,C]`, `stickyLimit=1`:
- Request 1: tries A → if A fails, tries B → if B fails, tries C
- Request 2: tries B → if B fails, tries C → if C fails, tries A
- Request 3: tries C → ...

So the user request for "round robin and fallback in the same model" is **already partially satisfied** by `round-robin` strategy. What is NOT possible today:
- Explicitly configuring "round-robin + fallback" as a distinct mode (it's implicit).
- Configuring fallback behavior *within* round-robin (e.g. retries per model, cooldown, sticky).
- Temporary rules (e.g. "for next 10 minutes, use fallback only" or "sticky=5 for this combo").

### 3. What "temporary rules" could mean

No existing temporary-rules system. Candidates:
- **TTL on strategy override:** `comboStrategies[comboName] = { fallbackStrategy, expiresAt }` — after expiry, revert to global or previous.
- **Request-scoped override:** Client sends header `x-9r-combo-strategy: fallback` or `x-9r-sticky-limit: 5` to override for one request.
- **In-memory ephemeral map:** `kv` table with TTL, or `comboRotationState` extension with expiry.
- **UI "temporary" toggle:** Dashboard checkbox "temporary (revert after X minutes/hours)" that writes `expiresAt` and a sweeper clears it.

Closest existing pattern: `srComboCleanup` (TTL for smart-router combos) and `modelLock_*` flat fields on connections (cooldown until timestamp). Both use ISO timestamps and `isAccountUnavailable` checks.

### 4. Gaps and opportunities for true hybrid

| Gap | Current | Desired |
|-----|---------|---------|
| Strategy is single-choice | `fallback` OR `round-robin` OR `fusion` | Explicit `hybrid` or `round-robin` with fallback config |
| No per-model retry config | `retriesPerModel` param exists in `handleComboChat` but never set from settings (always 1) | Allow `perModelRetries: { "provider/model": 2 }` via settings |
| No per-combo sticky override | Global `comboStickyRoundRobinLimit` only | Per-combo `stickyLimit` (already passed as `comboStickyLimit` but not stored per-combo) |
| No cooldown/backoff per combo | Global `ERROR_RULES` + `BACKOFF_CONFIG` | Per-combo cooldown overrides |
| No temporary rules | None | TTL or header override |
| No weighted round-robin | Equal rotation | Weighted (e.g. A 70%, B 30%) |
| Fusion is separate | Fusion does panel+judge, not fallback | Could allow fallback within fusion panel |

**Code locations for hybrid insertion:**

| Concern | File | Symbol | Insert / Reuse |
|---------|------|--------|----------------|
| Strategy enum | `src/lib/db/repos/settingsRepo.js` | `DEFAULT_SETTINGS.comboStrategies` | Extend to allow `hybrid` or add `hybridConfig` |
| Rotation | `open-sse/services/combo.js` | `getRotatedModels`, `comboRotationState` | Extend to support hybrid (rotate + fallback already does, but make explicit) |
| Fallback loop | `open-sse/services/combo.js` | `handleComboChat({ retriesPerModel, perModelRetries })` | Wire `retriesPerModel` from settings |
| Dispatch | `src/sse/handlers/chat.js` | `handleChat` combo branch | Pass hybrid config to `handleComboChat` |
| Settings API | `src/app/api/settings/route.js` | PATCH handler | Add validation for new fields, reset rotation on change |
| Dashboard UI | `src/app/(dashboard)/dashboard/combos/page.js` | `ComboCard`, `STRATEGY_OPTIONS`, `handleSetComboStrategy` | Add hybrid option, sticky/retries inputs, temporary toggle |
| Temporary rules | New: `open-sse/services/combo.js` or `src/lib/db/repos/settingsRepo.js` | `expiresAt` handling | Add sweeper or check on read |
| Account fallback | `open-sse/services/accountFallback.js` | `checkFallbackError`, `ERROR_RULES` | Could add per-combo error rules |

### 5. Fusion vs hybrid

Fusion (`handleFusionChat`) is distinct: it queries ALL models in parallel, then a judge synthesizes. It does NOT fallback; it needs quorum. Hybrid round-robin+fallback is sequential, not parallel. They should remain separate strategies, but we could allow `fusion` with fallback for judge failures.

## Synthesis / Conclusion

- **Hybrid already exists implicitly:** `round-robin` strategy rotates then falls back. The user may not realize this, or may want it made explicit and configurable.
- **True hybrid feature** would make `round-robin` + `fallback` an explicit, configurable mode with per-combo `stickyLimit`, `retriesPerModel`, `perModelRetries`, and optional `expiresAt` for temporary rules.
- **Minimal implementation:** Add `stickyLimit` and `retriesPerModel` to `comboStrategies[comboName]`, wire through `chat.js` → `handleComboChat`, add UI inputs, and optionally add `expiresAt` with a check in `getSettings` or `handleChat`.
- **No migration needed** if stored in `settings.comboStrategies` (JSON blob). If we want per-combo `contextWindow` too, same place.
- **Temporary rules** need design decision: TTL field vs header override vs ephemeral KV. TTL field is simplest and matches existing `srComboCleanup` pattern.

## Confidence Level

High for current strategy mechanics (direct reads of combo.js and chat.js). High for storage/UI locations. Medium for "temporary rules" interpretation (user said "we can set temporary rules if needed" — ambiguous, could be TTL, header, or manual toggle).

## Open Questions

1. Should hybrid be a new `hybrid` strategy value, or should `round-robin` be documented as "round-robin with fallback" and just add config knobs?
2. What temporary rule semantics? TTL expiry, or manual "revert" button, or header override?
3. Should `retriesPerModel` be global, per-combo, or per-model?
4. Should sticky limit be per-combo or global? (Currently global, but per-combo makes sense for hybrid.)
5. Do we need weighted round-robin, or is equal rotation sufficient?
6. Should fusion also support fallback for judge failures?
