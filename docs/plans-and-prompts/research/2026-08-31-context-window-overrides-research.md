# Research: Per-Model & Per-Combo Context Window Overrides

**Date:** 2026-08-31
**Author:** GitHub Copilot (main session)
**Status:** active
**Tags:** #research #context-window #capabilities #combos #models #overrides

## Question / Objective

User wants optional, user-configurable context-window overrides:
- Per-combo-model (the virtual combo name itself has its own limit)
- Per-individual-model per provider (real registry models + fake/virtual models like `auto`, `best-code`)
- Must be optional, must override whatever is "naturally thought to be" the limit (i.e. static capabilities)
- Must work for both fake (virtual/combo) and real models
- Should allow temporary rules if needed

We need to find where context limits live today, how they are used, where overrides could be inserted, and what reuse is possible.

## Sources Consulted

- Code: `open-sse/providers/capabilities.js` (DEFAULT_CAPABILITIES, MODEL_CAPABILITIES, PROVIDER_CAPABILITIES, PATTERN_CAPABILITIES, getCapabilitiesForModel, mergeUserCapabilityOverrides)
- Code: `open-sse/config/models.js` (DEFAULT_MODEL_INFO contextWindow 200000, MODEL_INFO)
- Code: `open-sse/config/providerModels.js` (PROVIDER_MODELS from registry, helpers)
- Code: `open-sse/providers/registry/*.js` (e.g. `claude.js`, `openai.js` — models have no contextWindow field; limits come from capabilities.js)
- Code: `open-sse/providers/index.js` (builds PROVIDERS + PROVIDER_MODELS from registry)
- Code: `src/lib/db/repos/settingsRepo.js` (DEFAULT_SETTINGS, modelCapOverrides, capacityAdapter, comboStrategies, mergeWithDefaults)
- Code: `src/lib/db/schema.js` (TABLES.combos: id, name, kind, models JSON — no contextWindow column)
- Code: `src/lib/db/repos/combosRepo.js` (rowToCombo, createCombo, updateCombo)
- Code: `src/app/api/models/route.js` (returns caps per model via getCapabilitiesForModel + mergeUserCapabilityOverrides)
- Code: `src/app/api/v1/models/route.js` (uses getCapabilitiesForModel for /v1/models)
- Code: `src/app/api/combos/route.js` + `src/app/api/combos/[id]/route.js` (combo CRUD, no contextWindow)
- Code: `src/shared/hooks/useModelCaps.js` (getCaps via getCapabilitiesForModel)
- Code: `src/app/(dashboard)/dashboard/combos/page.js` (combo UI, no contextWindow field)
- Code: `src/app/(dashboard)/dashboard/providers/[id]/ModelRow.js` (per-model capability toggles)
- Grep: `contextWindow` / `maxOutput` across `open-sse/` and `src/` (see raw grep output in session)

## Raw Findings

### 1. Where context limits are defined today

**Static layer — `open-sse/providers/capabilities.js`:**
- `DEFAULT_CAPABILITIES = { contextWindow: 200000, maxOutput: 64000, vision:false, ... }` — safe floor for every model.
- `MODEL_CAPABILITIES` — exact-id overrides (e.g. `claude-opus-5: {contextWindow:1000000}`, `kimi-k3: {contextWindow:1048576}`, `auto: {contextWindow:1000000}`).
- `PROVIDER_CAPABILITIES[provider][model]` — provider-specific overrides (e.g. `codex/gpt-5.6-sol: 372000`, `codebuddy-cn/glm-5.2: 1000000`).
- `PATTERN_CAPABILITIES` — ordered glob patterns (e.g. `*claude*opus-5* → 1000000`, `*gpt-5* → 400000`, `*gemini* → 1048576`, `*grok-4.5* → 500000`).
- Resolution order in `getCapabilitiesForModel(provider, model)`: provider-specific → canonical exact → pattern → floor. Result is always merged over DEFAULT_CAPABILITIES.
- `mergeUserCapabilityOverrides(staticCaps, userOverrides)` — merges user overrides over static caps. Currently used for `vision`/`audioInput` etc via `settings.modelCapOverrides` (see below). It already supports `contextWindow`/`maxOutput` if the caller passes them — no code blocks it, but no UI or persistence for those fields exists yet.

**Legacy layer — `open-sse/config/models.js`:**
- `DEFAULT_MODEL_INFO = { type:["chat"], contextWindow:200000 }` and `MODEL_INFO = {}` (empty). `getModelInfo(modelId)` merges over default. This file is largely unused now; capabilities.js is authoritative. No registry model sets contextWindow directly.

**Registry layer — `open-sse/providers/registry/*.js`:**
- Each provider file (e.g. `claude.js`, `openai.js`) lists `models: [{id, name, kind}]` with NO `contextWindow` field. Limits are NOT stored per-registry-entry; they are derived via capabilities.js pattern matching. This is intentional — single source via capabilities.js + models.dev.

### 2. How context limits are USED (enforcement vs display)

- **Display / API:** `src/app/api/models/route.js` returns `contextWindow`/`maxOutput` per model (merged caps) for dashboard. `src/app/api/v1/models/route.js` does similar for OpenAI-compatible `/v1/models`. `src/shared/hooks/useModelCaps.js` exposes `contextWindow` to UI (e.g. `GrokBuildToolCard` shows it).
- **No hard enforcement found:** Grep shows `contextWindow` is read for display, for `grokBuildConfig` TOML generation, and for `useModelCaps`, but NOT for rejecting or truncating requests in `open-sse/handlers/chatCore.js` or `src/sse/handlers/chat.js`. There is no `if (tokens > contextWindow) reject` gate. Token counting (`count_tokens` route, `usageTracking`) is separate.
- **RTK / headroom / ponytail / caveman** compress `tool_result` content to save tokens, but they are not gated by `contextWindow`; they are triggered by size heuristics, not by model limit.
- **Implication:** An override today would primarily affect displayed limits and any future enforcement/truncation logic. If the user wants the override to actually affect routing (e.g. refuse or compress when over limit), new enforcement code is needed.

### 3. Existing override mechanism (reuse opportunity)

- `settingsRepo.js` already has `modelCapOverrides: {}` in DEFAULT_SETTINGS — shape `{ [fullModelId]: { vision:true, audioInput:false, ... } }`. It is persisted in `settings` table (single row id=1, JSON blob), merged via `mergeUserCapabilityOverrides` in `/api/models` and `useModelCaps`.
- `src/app/(dashboard)/dashboard/providers/[id]/ModelRow.js` already has UI to toggle `vision`/`audioInput` per model → PATCH `/api/settings` with `modelCapOverrides`.
- **Reuse:** Extend `modelCapOverrides` to also store `contextWindow` and `maxOutput` (and maybe `contextWindow` per provider/model). The merge function already handles it. Need to add UI (number input) and validation, and ensure `/api/models` and `getCapabilitiesForModel` callers that care about limits use the merged value.
- **Per-combo override:** No existing field. `combos` table has `id, name, kind, models` (JSON). `settings.comboStrategies[comboName]` stores per-combo strategy (`fallbackStrategy`, `judgeModel`, `fusionTuning`). Neither stores a contextWindow. Options:
  - Add `contextWindow`/`maxOutput` columns to `combos` table (requires migration, SCHEMA_VERSION bump).
  - Or store per-combo overrides in `settings.comboContextWindows: { [comboName]: { contextWindow, maxOutput } }` (no migration, consistent with comboStrategies pattern).
  - Or store directly in `combos.models` metadata (e.g. `models` could become `[{id, contextWindow}]` but breaks current string array).

### 4. Fake vs real models

- **Real models:** Resolved via `PROVIDER_MODELS[alias]` from registry. Capabilities via `getCapabilitiesForModel(provider, model)`.
- **Fake/virtual models:** Two kinds:
  - **Smart-router virtuals:** `auto`, `best-code`, `best-chat`, `best-reasoning`, `best-cheap` — defined in `MODEL_CAPABILITIES` with large contextWindows (200k–1M). They are dispatched via `resolveSmartRouter` in `chat.js` to a dynamic combo.
  - **Combo names:** User-defined combos (e.g. `my-combo`) — not in registry, resolved via `getComboByName` in `src/sse/services/model.js`. They have no capabilities entry; their effective limit is ambiguous (should be min or max of members? Currently undefined).
- **Override must work for both:** For real models, override via `modelCapOverrides["provider/model"]`. For fake/virtual, same key works if we use full id (e.g. `"auto"` or `"my-combo"`). For combos, need separate per-combo override (since combo name has no provider prefix).

### 5. Temporary rules

- No existing "temporary rules" system. Closest is `settings.comboStrategies` which is persisted but could be extended with TTL or session-scoped overrides.
- Options: Add `expiresAt` to override entries, or store temporary overrides in memory/KV with TTL, or add UI toggle "temporary (session only)" that writes to `kv` table with expiry.

### 6. Code locations for insertion / reuse

| Concern | File | Lines / Symbol | Reuse / Insert |
|---------|------|----------------|----------------|
| Static caps | `open-sse/providers/capabilities.js` | `DEFAULT_CAPABILITIES`, `getCapabilitiesForModel`, `mergeUserCapabilityOverrides` | Reuse merge function; extend to handle contextWindow overrides |
| User overrides persistence | `src/lib/db/repos/settingsRepo.js` | `DEFAULT_SETTINGS.modelCapOverrides`, `mergeWithDefaults`, `updateSettings` | Extend DEFAULT_SETTINGS with `modelContextOverrides` or extend `modelCapOverrides` to include numbers |
| Combo storage | `src/lib/db/schema.js` | `TABLES.combos` | Add columns or keep in settings |
| Combo CRUD | `src/lib/db/repos/combosRepo.js` | `rowToCombo`, `createCombo`, `updateCombo` | Extend to handle contextWindow |
| Combo API | `src/app/api/combos/route.js`, `src/app/api/combos/[id]/route.js` | POST/PUT handlers | Add validation for contextWindow |
| Models API | `src/app/api/models/route.js` | `getCapabilitiesForModel` + `mergeUserCapabilityOverrides` | Ensure merged contextWindow is returned |
| Dashboard combo UI | `src/app/(dashboard)/dashboard/combos/page.js` | `ComboCard`, `ComboFormModal` | Add contextWindow input per combo |
| Dashboard provider UI | `src/app/(dashboard)/dashboard/providers/[id]/ModelRow.js` | capability toggles | Add number input for contextWindow |
| Hook | `src/shared/hooks/useModelCaps.js` | `getCaps` | Already merges overrides; ensure it reflects new fields |
| Chat routing | `src/sse/handlers/chat.js` | `handleChat`, `getComboModels` | If enforcement needed, check contextWindow before dispatch |
| Chat core | `open-sse/handlers/chatCore.js` | `handleChatCore` | Potential truncation/rejection gate |

## Synthesis / Conclusion

- **Context limits are static, pattern-based, and display-only today.** No hard enforcement; overrides would be a new user-facing feature, not a fix to existing enforcement.
- **Strong reuse path:** `modelCapOverrides` + `mergeUserCapabilityOverrides` already provides the plumbing for per-model overrides. Extending it to `contextWindow`/`maxOutput` is minimal code (settings default + UI + validation). Per-combo overrides need a new storage choice (settings map vs DB column); settings map is lower friction (no migration) and consistent with `comboStrategies`.
- **Fake models are covered** if we key overrides by full model id (including combo names and virtuals).
- **Temporary rules** need new design (TTL field or ephemeral KV). Could be added as optional `expiresAt` on override entries.
- **No existing per-combo contextWindow UI or API** — greenfield.

## Confidence Level

High for static caps and override plumbing (direct code reads). Medium for enforcement implications (grep suggests no enforcement, but full audit of all executors/translators not yet done). High for storage options.

## Open Questions

1. Should per-combo contextWindow be the *effective* limit for the combo (e.g. min of members, or user override), and should it affect routing (e.g. reject if prompt > limit) or just display?
2. Should overrides be allowed to *increase* beyond provider's real limit (user wants to override "whatever is naturally thought") — do we warn if override > known max?
3. For temporary rules, what TTL semantics? Session-only, hours, or explicit expiry date?
4. Should `maxOutput` also be overridable alongside `contextWindow`?
5. Do we need per-account overrides (same model, different account has different limit)?
