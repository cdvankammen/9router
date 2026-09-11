# Plan: Per-Model & Per-Combo Context Window Overrides + Hybrid Round-Robin/Fallback

**Date:** 2026-08-31
**Author:** GitHub Copilot (main session)
**Status:** draft
**Tags:** #plan #context-window #combos #routing #capabilities #overrides

> Related research:
> - `../research/2026-08-31-context-window-overrides-research.md` — context window overrides deep dive
> - `../research/2026-08-31-hybrid-round-robin-fallback-research.md` — hybrid routing deep dive
> - `../research/2026-08-31-combo-duplication-verification.md` — duplication verification

## Objective

Ship two user-requested capabilities as optional, non-breaking features:

1. **Per-model and per-combo context window overrides** — user can set `contextWindow`/`maxOutput` for any individual model (real or fake/virtual) and for any combo name, overriding the static `capabilities.js` value. Optional, no migration required for basic version.
2. **Hybrid round-robin + fallback in one combo** — a combo can both rotate across models (load spreading) and fallback on failure, with per-combo knobs (`stickyLimit`, `retriesPerModel`, `perModelRetries`) and optional temporary rules (`expiresAt`).

Both must work for fake models (virtuals like `auto`, `best-code`, combo names) and real registry models.

## Scope

### In

- Settings persistence for overrides (no DB migration for v1; use `settings` JSON blob)
- Merge logic in `capabilities.js` / `settingsRepo.js`
- Combo API validation for new fields
- Dashboard UI for per-model and per-combo overrides
- Hybrid routing config (per-combo sticky/retries, temporary TTL)
- Wiring `retriesPerModel`/`perModelRetries` through `chat.js` → `handleComboChat`
- Duplication fix: copy per-combo strategy + future contextWindow on duplicate
- Tests for new logic (unit, no live provider calls)
- Docs updates (`docs/plans-and-prompts/tracking/CHANGELOG.md`, `docs/ARCHITECTURE.md` if needed)

### Out

- Hard enforcement (reject/truncate when prompt > contextWindow) — v2, needs token counting + UX
- Weighted round-robin — v2
- Fusion + fallback hybrid — v2
- Per-account overrides — v2
- Server-side `POST /api/combos/duplicate` endpoint — keep client-side for v1 unless needed

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| `settings` JSON blob size | Large `modelCapOverrides` + `comboStrategies` could bloat | Cap entries, validate numbers, prune defaults |
| `getCapabilitiesForModel` callers | Some callers may not use merged caps | Audit all callers, ensure `/api/models` and `useModelCaps` use merged |
| `comboRotationState` in-memory | Lost on restart, not shared across workers | Acceptable for v1; document |
| `expiresAt` sweeper | Needs periodic check | Check on read (`getSettings` or `handleChat`), no cron needed for v1 |
| No DB migration | Future per-combo columns would need migration | Keep v1 in settings; migrate later if needed |

## Milestones

### M1 — Per-model context window overrides (reuse `modelCapOverrides`)

**Goal:** User can set `contextWindow`/`maxOutput` per model via dashboard, persisted, reflected in `/api/models` and `useModelCaps`.

**Changes:**

1. `src/lib/db/repos/settingsRepo.js` — extend `DEFAULT_SETTINGS.modelCapOverrides` docs to mention `contextWindow`/`maxOutput` (no default change needed; shape is `{ [fullModelId]: { vision, audioInput, contextWindow, maxOutput, ... } }`). Ensure `mergeWithDefaults` handles numbers.
2. `open-sse/providers/capabilities.js` — `mergeUserCapabilityOverrides` already handles `contextWindow`/`maxOutput` (spread). Add JSDoc and validation helper `normalizeContextWindowOverride(value)` (clamp 1k–10M, integer).
3. `src/app/api/models/route.js` — ensure merged `contextWindow`/`maxOutput` returned (already does via `mergeUserCapabilityOverrides`). Add validation on PATCH if we add direct endpoint.
4. `src/app/api/settings/route.js` — add validation for `modelCapOverrides[model].contextWindow`/`maxOutput` (number, 1k–10M, integer) on PATCH.
5. `src/app/(dashboard)/dashboard/providers/[id]/ModelRow.js` — add number inputs for `contextWindow`/`maxOutput` next to vision/audio toggles, with placeholder showing static value, PATCH to `/api/settings`.
6. `src/shared/hooks/useModelCaps.js` — ensure `getCaps` returns merged `contextWindow`/`maxOutput` (already does via `/api/models`).
7. `src/app/api/v1/models/route.js` — ensure it also uses merged caps (audit; may need to call `mergeUserCapabilityOverrides` with settings).

**Verification:**
- Unit: `mergeUserCapabilityOverrides` with `contextWindow` override returns correct value; validation rejects out-of-range.
- Manual: Set override for `openai/gpt-4o` to 50000, check `/api/models` returns 50000, dashboard shows 50000, reset works.

**Files:**
- `src/lib/db/repos/settingsRepo.js`
- `open-sse/providers/capabilities.js`
- `src/app/api/settings/route.js`
- `src/app/api/models/route.js`
- `src/app/(dashboard)/dashboard/providers/[id]/ModelRow.js`
- `src/shared/hooks/useModelCaps.js`

### M2 — Per-combo context window overrides

**Goal:** User can set `contextWindow`/`maxOutput` for a combo name (virtual model), optional, overrides static (which is undefined for combos).

**Design choice:** Store in `settings.comboContextWindows: { [comboName]: { contextWindow, maxOutput, expiresAt? } }` (no DB migration, consistent with `comboStrategies`). Alternative is `combos` table columns — defer to v2 if needed.

**Changes:**

1. `src/lib/db/repos/settingsRepo.js` — add `DEFAULT_SETTINGS.comboContextWindows = {}` (map, replace semantics like `comboStrategies`). Add to `MAP_REPLACE_KEYS`.
2. `src/app/api/settings/route.js` — validate `comboContextWindows[combo].contextWindow`/`maxOutput` on PATCH.
3. `src/app/api/combos/route.js` + `src/app/api/combos/[id]/route.js` — optionally accept `contextWindow`/`maxOutput` in POST/PUT and sync to `settings.comboContextWindows` (or keep separate; decide: combo CRUD vs settings PATCH). Simpler: combo UI PATCHes settings directly, not via combos API.
4. `src/app/(dashboard)/dashboard/combos/page.js` — add `ComboContextWindowRow` (number inputs) per combo card, PATCH `comboContextWindows`.
5. `src/app/api/models/route.js` — for combo names, return `comboContextWindows[comboName]` as `contextWindow`/`maxOutput` (since combos have no static caps).
6. `src/sse/handlers/chat.js` — if enforcement needed later, read `comboContextWindows[modelStr]` for combo requests.

**Verification:**
- Unit: `comboContextWindows` merge, validation, expiry check.
- Manual: Create combo `my-combo`, set contextWindow 300000, check `/api/models` for `my-combo` returns 300000.

**Files:**
- `src/lib/db/repos/settingsRepo.js`
- `src/app/api/settings/route.js`
- `src/app/(dashboard)/dashboard/combos/page.js`
- `src/app/api/models/route.js`

### M3 — Hybrid round-robin + fallback (explicit config)

**Goal:** Make hybrid explicit and configurable per combo: `stickyLimit`, `retriesPerModel`, `perModelRetries`, with optional `expiresAt` for temporary rules.

**Changes:**

1. `src/lib/db/repos/settingsRepo.js` — extend `comboStrategies[comboName]` shape to:
   ```js
   {
     fallbackStrategy: "fallback" | "round-robin" | "hybrid" | "fusion",
     stickyLimit?: number,        // per-combo override for comboStickyRoundRobinLimit
     retriesPerModel?: number,    // default 1
     perModelRetries?: { [model]: number },
     expiresAt?: string,          // ISO, temporary rule expiry
     judgeModel?: string,         // fusion only
     fusionTuning?: object        // fusion only
   }
   ```
   Add validation helper `normalizeComboStrategyEntry(entry)`.

2. `open-sse/services/combo.js` — extend `getRotatedModels` to handle `hybrid` (same as `round-robin` but explicit). Ensure `handleComboChat` already supports `retriesPerModel`/`perModelRetries` (it does). Add `isHybridStrategy(strategy)` helper.

3. `src/sse/handlers/chat.js` — resolve per-combo `stickyLimit`, `retriesPerModel`, `perModelRetries`, `expiresAt` from `settings.comboStrategies[modelStr]` and `settings.comboContextWindows` (if needed). Check `expiresAt` — if expired, delete entry and fall back to global. Pass to `handleComboChat`:
   ```js
   const strat = comboStrategies[modelStr] || {};
   const stickyLimit = strat.stickyLimit ?? settings.comboStickyRoundRobinLimit;
   const retriesPerModel = strat.retriesPerModel ?? 1;
   const perModelRetries = strat.perModelRetries || null;
   // check expiresAt
   ```

4. `src/app/api/settings/route.js` — validate new fields on PATCH, reset rotation on change.

5. `src/app/(dashboard)/dashboard/combos/page.js` — extend `ComboCard` strategy selector to include `hybrid` option, add inputs for `stickyLimit` (1–100), `retriesPerModel` (1–5), `perModelRetries` (advanced, JSON or per-model rows), and `expiresAt` (datetime-local, "temporary" toggle). Update `handleSetComboStrategy` to handle new fields and prune defaults.

6. `open-sse/services/combo.js` — add `getComboStrategyWithExpiry(comboName, settings)` helper that checks `expiresAt` and returns effective strategy.

**Verification:**
- Unit: `getRotatedModels` with `hybrid` rotates; `handleComboChat` with `retriesPerModel=2` retries; `expiresAt` check returns fallback after expiry.
- Manual: Create combo with 3 models, set strategy `hybrid`, sticky 2, retries 2, verify rotation and fallback via logs and `x-9r-fallback-chain` header.

**Files:**
- `src/lib/db/repos/settingsRepo.js`
- `open-sse/services/combo.js`
- `src/sse/handlers/chat.js`
- `src/app/api/settings/route.js`
- `src/app/(dashboard)/dashboard/combos/page.js`

### M4 — Duplication fix + temporary rules polish

**Goal:** Ensure duplication copies strategy + contextWindow, and temporary rules work end-to-end.

**Changes:**

1. `src/app/(dashboard)/dashboard/combos/page.js` `handleDuplicate` — after POST `/api/combos`, also PATCH `/api/settings` to copy `comboStrategies[oldName]` and `comboContextWindows[oldName]` to new name (if exist). Handle `expiresAt` — copy as-is or reset.

2. Add `expiresAt` sweeper: in `src/lib/db/repos/settingsRepo.js` `getSettings()` or `src/sse/handlers/chat.js` `handleChat`, check `expiresAt` and prune expired entries (lazy, no cron).

3. Add toast/success feedback for duplication (optional, use existing `useCopyToClipboard` pattern or simple alert).

**Verification:**
- Manual: Duplicate combo with `hybrid` strategy and contextWindow 500k, verify duplicate has same strategy and window, verify `expiresAt` copied, verify expired entry reverts to fallback.

**Files:**
- `src/app/(dashboard)/dashboard/combos/page.js`
- `src/lib/db/repos/settingsRepo.js` or `src/sse/handlers/chat.js`

### M5 — Tests, docs, and browser verification

**Goal:** Prove no regressions, update docs, verify UI via browser.

**Changes:**

1. Tests: `tests/unit/capabilities.test.js` (extend), `tests/unit/combo.test.js` (new or extend), `tests/unit/settings.test.js` (new).
2. Docs: Update `docs/plans-and-prompts/tracking/CHANGELOG.md`, `docs/ARCHITECTURE.md` (if combo routing changes), `docs/plans-and-prompts/research/*.md` status to `active`.
3. Browser: Start dev server, open `/dashboard/combos` and `/dashboard/providers/[id]`, verify inputs, duplication, strategy selector, contextWindow display. Use internal simple browser + visual check (subagent with omni 3.5 plus if available).

**Verification:**
- `npx vitest run` — no regressions (compare to `tests/__baseline__/verify-no-regression.mjs`).
- `npx eslint .` — no lint errors.
- Browser screenshots / manual check.

## Implementation Order

1. M1 (per-model overrides) — smallest, reuses existing plumbing
2. M2 (per-combo overrides) — builds on M1
3. M3 (hybrid) — independent but benefits from M1/M2 settings patterns
4. M4 (duplication + TTL) — polish, depends on M2/M3
5. M5 (tests/docs/browser) — final verification

Each milestone is independently shippable; M1 can be merged before M2/M3.

## Alternatives Considered

| Alternative | Why not |
|-------------|---------|
| DB migration for `combos.contextWindow` column | Requires `SCHEMA_VERSION` bump, backup, migration file — heavier than settings map for v1. Can migrate later if needed. |
| New `POST /api/combos/duplicate` endpoint | Adds API surface for little gain; client-side copy + PATCH settings is sufficient for single-user local app. |
| Hard enforcement (reject if > contextWindow) | Needs token counting, UX for truncation, and could break existing clients. Defer to v2. |
| Weighted round-robin | More complex, no user request for weights yet. Defer. |
| Header override `x-9r-combo-strategy` | Useful for temporary rules but adds client complexity. TTL field is simpler for v1. |

## Risks & Mitigations

- **Bloat:** Validate and clamp numbers, prune defaults (don't store `contextWindow` if equals static).
- **Stale `expiresAt`:** Lazy check on read, not cron, so no background job needed.
- **Rotation state loss on restart:** Document as expected; in-memory Map is intentional.
- **No enforcement:** User may expect override to actually limit tokens; document that v1 is display + future enforcement, not hard gate.

## Open Questions (from research)

1. Should per-combo contextWindow be min/max of members or user override? → User override wins, else undefined (or min of members as hint).
2. Should overrides allow increasing beyond provider's real limit? → Yes, user requested "no matter if fake or real" — allow, but show warning if > known max.
3. Temporary rules TTL semantics? → `expiresAt` ISO, checked on read, pruned lazily.
4. Should `maxOutput` also be overridable? → Yes, alongside `contextWindow`.
5. Per-account overrides? → Defer to v2.

## Success Criteria

- [ ] User can set `contextWindow`/`maxOutput` for any model (real/fake) via dashboard, persisted, reflected in `/api/models`.
- [ ] User can set `contextWindow`/`maxOutput` for any combo via dashboard, persisted, reflected in `/api/models`.
- [ ] Combo can be set to `hybrid` (or `round-robin` with fallback config) with `stickyLimit`, `retriesPerModel`, `perModelRetries`, and optional `expiresAt`.
- [ ] Duplication copies strategy + contextWindow.
- [ ] No regressions in existing tests, lint, build.
- [ ] Browser verification of combos and providers pages.
- [ ] Docs updated (research status, planning, changelog).
