# Plan — Combo Features: Duplicate, Model Search, Vision/Audio Capability Flags

**Date:** 2026-08-12
**Author:** GitHub Copilot agent (main session, from subagent research)
**Status:** completed
**Tags:** #plan #combos #models #capabilities #vision #audio

> **UPDATE 2026-08-12 — completed.** All four features shipped as part of the
> larger "provider observability & usage fixes" work (see `../tracking/CHANGELOG.md`
> UPDATE 2026-08-12 and `../tracking/learnings/2026-08-12-provider-observability-and-usage-fixes.md`).
> **What was actually built:**
> - **F1 Duplicate** — `combos/page.js`: Duplicate button POSTs a full combo copy
>   (`{name}-copy`, same models/kind).
> - **F2 Provider search** — `ModelSelectModal.js`: searching a provider name now
>   shows all its models (the `filteredGroups` group-hiding bug is fixed).
> - **F3 Capability overrides** — `settingsRepo.js` `modelCapOverrides` default;
>   `capabilities.js` `mergeUserCapabilityOverrides`; `/api/models` returns merged
>   caps; `ModelRow.js` vision/audioInput toggles → PATCH `/api/settings`;
>   `useModelCaps.js` `refresh()`/`invalidateModelCaps()`.
> - **F4 Dynamic filtering** — no new code; combo pickers already read merged caps
>   via `capFilter` + `getCaps`, so overrides flow through after a `refresh()`.

## User Request

1. **Duplicate/copy a combo router** — so users don't have to rebuild from scratch.
2. **Search models by provider or model name** in the combo model chooser — searching "openrouter" should show openrouter models.
3. **Per-model vision/audio capability flags** — custom endpoints can't pick vision-capable models; add UI on the provider page to mark a model vision/audio-capable, and have the combo builder's vision/audio model picker dynamically reflect that.

## Research Findings (subagent + main session)

### Subagent 2 findings (retrieved before rate-limit)
- Model capabilities ALREADY exist: `open-sse/providers/capabilities.js` (DEFAULT_CAPABILITIES, MODEL_CAPABILITIES, PROVIDER_CAPABILITIES, PATTERN_CAPABILITIES) + `/api/models` returns `caps` per model
- `ModelSelectModal` ALREADY has search + `capFilter` prop
- Capacity adapter already exists in combos page (vision/audioInput sections)
- Combos API: GET/POST/PUT/DELETE — **NO duplicate endpoint**

### Main-session findings (after subagent rate limits)
- **Combos page** `src/app/(dashboard)/dashboard/combos/page.js`:
  - `ComboCard` has Copy/Edit/Delete buttons (Copy = copies the NAME only, not a new combo)
  - `ComboFormModal` handles create/edit; `handleCreate` POSTs to `/api/combos`
  - Capacity adapter sections (vision/audioInput) already filter models via `capFilter` → `getCaps(m.value)?.[capFilter]`
- **ModelSelectModal** `src/shared/components/ModelSelectModal.js`:
  - Has `searchQuery` input (filters model name/id) + `capFilter` prop (filters by vision/audioInput etc.) + `kindFilter`
  - **Provider name search missing**: `filteredGroups` checks `group.name.toLowerCase().includes(query)` BUT only shows the group if `models.length > 0` after model-name filtering — so searching "openrouter" hides it if no model name matches. BUG confirmed.
- **Models API** `src/app/api/models/route.js`: returns `caps` per model via `getCapabilitiesForModel`
- **Capabilities** `open-sse/providers/capabilities.js`: DEFAULT_CAPABILITIES (vision:false, audioInput:false...), MODEL_CAPABILITIES (exact overrides), PROVIDER_CAPABILITIES, PATTERN_CAPABILITIES — static config only, NO user overrides
- **Provider detail page** `src/app/(dashboard)/dashboard/providers/[id]/page.js` + `ModelRow.js`:
  - ModelRow shows `CapacityBadges` (read-only caps display)
  - No per-model capability editing UI
- **Custom models** `/api/models/custom` — custom models have `kind` (imageToText → vision, stt → audioInput)

## Design

### Feature 1: Combo Duplicate
- Add a "Duplicate" button to `ComboCard` (next to Copy/Edit/Delete)
- On click: POST `/api/combos` with `{ name: `${combo.name}-copy`, models: combo.models, kind: combo.kind }`
- Auto-suffix name if `-copy` exists (`-copy-2`, etc.) via a small check on GET /api/combos
- No restart needed — combo list refreshes via `fetchData()`

### Feature 2: Model Chooser Provider Search
- Fix `filteredGroups` in ModelSelectModal: if query matches a provider name, show ALL its models (not just name-matching ones)
- Add a provider filter dropdown (optional but useful): "All providers" + each group name

### Feature 3: Per-Model Vision/Audio Capability Flags
- **Persistence**: add `modelCapOverrides` to settings (JSON blob, `{ [fullModel]: { vision: true, audioInput: false, ... } }`)
- **Merge**: `getCapabilitiesForModel(provider, model)` in capabilities.js gains an overrides param (or a new `getUserModelCaps` that merges settings overrides over static caps)
- **Provider page UI**: in `ModelRow`, add a small "capabilities" popover/buttons to toggle vision/audioInput for that model → PATCH `/api/settings` with `modelCapOverrides`
- **Combo builder dynamic**: `useModelCaps` → `/api/models` already returns caps; after merge, the vision/audio pickers (capFilter) automatically reflect user overrides

### Feature 4: Dynamic Vision/Audio Filtering
- Already works via `capFilter` + `getCaps` — verify it reflects the new user overrides end-to-end

## Implementation Order + Commits

1. `feat(combos): duplicate combo button + API` (Feature 1)
2. `feat(models): model chooser provider-name search` (Feature 2)
3. `feat(models): per-model capability overrides (vision/audio) — settings persistence + provider page UI` (Feature 3)
4. `feat(models): dynamic vision/audio filtering reflects overrides` (Feature 4, verification)

## Files to Change
- `src/app/(dashboard)/dashboard/combos/page.js` — Duplicate button, ComboCard props
- `src/shared/components/ModelSelectModal.js` — provider search fix
- `open-sse/providers/capabilities.js` — user overrides merge
- `src/lib/db/repos/settingsRepo.js` — `modelCapOverrides` default
- `src/app/(dashboard)/dashboard/providers/[id]/ModelRow.js` — capability toggle UI
- `src/app/(dashboard)/dashboard/providers/[id]/page.js` — wire toggle → settings PATCH
- `src/shared/hooks/useModelCaps.js` — include overrides from /api/models

## Related
- `../research/9router/` (capabilities deep dive), `messages-page-feature-spec.md` (precedent)
