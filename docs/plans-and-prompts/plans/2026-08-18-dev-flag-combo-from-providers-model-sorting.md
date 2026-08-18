# Plan — Dev Flag, Combo-from-Providers, Model Chooser Sorting, Import All

**Date:** 2026-08-18
**Author:** GitHub Copilot agent
**Status:** active
**Tags:** #plan #combos #dev-flag #models #providers

## User Request

1. **Add combos from within the providers menu** — a dev flag mode for this
2. **Model chooser: connected providers at top** — so you see the providers you have keys for first, then the rest
3. **Import models for ALL providers** (not just custom endpoints) — under a dev flag
4. **Dev flag mode** — a feature flag to show/hide advanced features in the UI

## Research Findings

### What already exists (NO code needed)
- **`handleImportModels`** already works for ALL providers with active connections
  - `page.js:676` — fetches `/api/providers/{id}/models?refresh=1`, deduplicates, adds missing models via `/api/models/custom`
  - "Refresh Models" button shows when `connections.some(c => c.isActive !== false)`
  - This IS the "import models for all providers" feature — it's already there!
- **`suggestedModels`** already auto-fills from provider APIs
- **Model capability toggles** on provider page (from my earlier work) — vision/audio
- **Combo duplicate** (from my earlier work)
- **Model search by provider** in ModelSelectModal (from my earlier work)

### What needs to be built
1. **Dev flag infrastructure** — `settings.devMode` boolean, rendered as a toggle in the Settings/Profile page
2. **Combo-from-providers** — on the provider detail page, show a "Create Combo" button with this provider's models pre-selected, gated behind `devMode`
3. **Model chooser sorting** — `ModelSelectModal.groupedModels` should sort connected providers to the top of the list
4. **Model import badge** — show which providers have auto-import available under the dev flag

## Design

### 1. Dev Flag
- Add `devMode: false` to `DEFAULT_SETTINGS` in `settingsRepo.js`
- Add a toggle on the Profile/Settings page
- Backend: the settings API already supports arbitrary keys via `updateSettings()`
- Frontend: `useSettings()` hook or direct `fetch('/api/settings')` → check `settings.devMode`
- All dev-gated features check `settings.devMode` before rendering

### 2. Combo-from-Providers
- On the provider detail page, below the connections section
- Shows a "Create Combo with these models" button
- Opens `ComboFormModal` with `activeProviders` + `selectedModels` pre-filled
- Gated behind `devMode`

### 3. Model Chooser: Connected-First Sorting
- In `ModelSelectModal.groupedModels`, sort the provider groups so connected providers come first
- The `isConnected` flag already exists in the render (`filteredActiveProviders.some(p => p.provider === providerId)`)
- Add a "Connected" section header above groups with connected providers, "All Providers" below

### 4. Import Models Badge (under dev flag)
- The "Refresh Models" button already exists for all providers
- Under `devMode`, show an "Auto-Import" badge/section in the provider header explaining the feature
- No new code needed — just visibility

## Implementation Order
1. `feat(settings): add devMode flag to settings defaults + profile page toggle`
2. `feat(combos): create combo from provider detail page (dev flag)`
3. `feat(models): connected providers sorted first in model chooser`
4. `feat(dev-mode): model import badge + advanced features visibility`
5. Commit + docs

## Files to Change
- `src/lib/db/repos/settingsRepo.js` — add `devMode: false` to defaults
- `src/app/(dashboard)/dashboard/profile/page.js` — dev mode toggle
- `src/app/(dashboard)/dashboard/providers/[id]/page.js` — combo-from-provider button, import badge
- `src/shared/components/ModelSelectModal.js` — connected-first sorting
- `src/shared/hooks/useSettings.js` — new hook for devMode check (or inline fetch)
