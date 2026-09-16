# Context Window & Hybrid Combo — Code-Bearing Implementation Plan

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #context-window #combo #hybrid #round-robin #fallback #capabilities #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (imports, function signatures, `open-sse/providers/capabilities.js` merge logic, `open-sse/services/combo.js` rotation logic, settings shape, Next.js route conventions).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — run the app, hit the endpoints, check the DB, confirm acceptance criteria.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation (read before implementing each milestone):
> - `../research/context-window-overrides-research.md`
> - `../research/hybrid-round-robin-fallback-research.md`
> - `../research/combo-duplication-verification.md`
> - `../research/2026-08-31-context-window-and-hybrid-combo-plan.md` (original plan this consolidates)

## Scope

**In scope:**
- Per-model `contextWindow`/`maxOutput` overrides via settings (`modelCapOverrides`)
- Per-combo `contextWindow`/`maxOutput` overrides (`comboContextWindows`)
- Hybrid round-robin + fallback made explicit and configurable per combo: `stickyLimit`, `retriesPerModel`, `perModelRetries`, optional `expiresAt` for temporary rules
- Duplication fix: combo duplicate copies strategy + contextWindow
- Temporary-rule expiry sweeper (lazy, no cron)

**Out of scope (v1):**
- Fusion strategy (judgeModel/fusionTuning) — schema reserved, not implemented
- Enforcement of context window at request time (only surfaced via `/api/models` + dashboard) — revisit after M3
- Cloud sync of combo strategies

---

## M1 — Per-model context window overrides

**Goal:** User can set `contextWindow`/`maxOutput` for a model via settings; merged caps returned everywhere.

### Reference code

**`open-sse/providers/capabilities.js` — validation helper:**

```js
// Reference sketch — add next to mergeUserCapabilityOverrides.
export function normalizeContextWindowOverride(value) {
  if (value === undefined || value === null || value === "") return undefined;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1000 || n > 10_000_000) {
    throw new Error(`contextWindow must be an integer between 1000 and 10000000, got ${value}`);
  }
  return n;
}

export function normalizeMaxOutputOverride(value) {
  if (value === undefined || value === null || value === "") return undefined;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1 || n > 1_000_000) {
    throw new Error(`maxOutput must be an integer between 1 and 1000000, got ${value}`);
  }
  return n;
}
```

**`src/app/api/settings/route.js` — PATCH validation:**

```js
// Reference sketch — add to the existing PATCH handler's validation.
if (body.modelCapOverrides) {
  for (const [model, caps] of Object.entries(body.modelCapOverrides)) {
    if (caps.contextWindow !== undefined) {
      caps.contextWindow = normalizeContextWindowOverride(caps.contextWindow);
    }
    if (caps.maxOutput !== undefined) {
      caps.maxOutput = normalizeMaxOutputOverride(caps.maxOutput);
    }
  }
}
```

**Files touched:**
- `src/lib/db/repos/settingsRepo.js` — extend `DEFAULT_SETTINGS.modelCapOverrides` docs (shape `{ [fullModelId]: { vision, audioInput, contextWindow, maxOutput, ... } }`); ensure `mergeWithDefaults` handles numbers
- `open-sse/providers/capabilities.js` — `mergeUserCapabilityOverrides` already handles `contextWindow`/`maxOutput` (spread); add JSDoc + `normalizeContextWindowOverride`/`normalizeMaxOutputOverride`
- `src/app/api/models/route.js` — ensure merged `contextWindow`/`maxOutput` returned (already does via `mergeUserCapabilityOverrides`)
- `src/app/api/settings/route.js` — validation on PATCH
- `src/app/(dashboard)/dashboard/providers/[id]/ModelRow.js` — number inputs for `contextWindow`/`maxOutput` next to vision/audio toggles, placeholder shows static value, PATCH to `/api/settings`
- `src/shared/hooks/useModelCaps.js` — ensure `getCaps` returns merged values (already does via `/api/models`)
- `src/app/api/v1/models/route.js` — audit; ensure it also uses merged caps

**Acceptance criteria:**
- `mergeUserCapabilityOverrides` with `contextWindow` override returns correct value; validation rejects out-of-range
- Set override for `openai/gpt-4o` to 50000 → `/api/models` returns 50000, dashboard shows 50000, reset works

---

## M2 — Per-combo context window overrides

**Goal:** `contextWindow`/`maxOutput` for a combo name (virtual model), optional, overrides static (undefined for combos).

**Design choice:** Store in `settings.comboContextWindows: { [comboName]: { contextWindow, maxOutput, expiresAt? } }` (no DB migration, consistent with `comboStrategies`). Alternative is `combos` table columns — defer to v2 if needed.

### Reference code

**`src/lib/db/repos/settingsRepo.js`:**

```js
// Add to DEFAULT_SETTINGS:
comboContextWindows: {},   // { [comboName]: { contextWindow, maxOutput, expiresAt? } }
// Add "comboContextWindows" to MAP_REPLACE_KEYS (replace semantics like comboStrategies).
```

**`src/app/api/models/route.js` — combo names return combo caps:**

```js
// Reference sketch — in the models list handler, for combo entries:
const comboCap = settings.comboContextWindows?.[comboName];
if (comboCap) {
  entry.contextWindow = comboCap.contextWindow;
  entry.maxOutput = comboCap.maxOutput;
}
```

**Files touched:**
- `src/lib/db/repos/settingsRepo.js` — add `DEFAULT_SETTINGS.comboContextWindows = {}` + `MAP_REPLACE_KEYS`
- `src/app/api/settings/route.js` — validate `comboContextWindows[combo].contextWindow`/`maxOutput` on PATCH
- `src/app/api/combos/route.js` + `src/app/api/combos/[id]/route.js` — optionally accept `contextWindow`/`maxOutput` in POST/PUT and sync to settings (or keep separate; simpler: combo UI PATCHes settings directly)
- `src/app/(dashboard)/dashboard/combos/page.js` — `ComboContextWindowRow` (number inputs) per combo card, PATCH `comboContextWindows`
- `src/app/api/models/route.js` — for combo names, return `comboContextWindows[comboName]` as `contextWindow`/`maxOutput`
- `src/sse/handlers/chat.js` — if enforcement needed later, read `comboContextWindows[modelStr]` for combo requests

**Acceptance criteria:**
- `comboContextWindows` merge, validation, expiry check
- Create combo `my-combo`, set contextWindow 300000 → `/api/models` for `my-combo` returns 300000

---

## M3 — Hybrid round-robin + fallback (explicit config)

**Goal:** Make hybrid explicit and configurable per combo: `stickyLimit`, `retriesPerModel`, `perModelRetries`, optional `expiresAt`.

### Reference code

**`src/lib/db/repos/settingsRepo.js` — extend `comboStrategies[comboName]` shape:**

```js
// Shape:
{
  fallbackStrategy: "fallback" | "round-robin" | "hybrid" | "fusion",
  stickyLimit?: number,        // per-combo override for comboStickyRoundRobinLimit
  retriesPerModel?: number,    // default 1
  perModelRetries?: { [model]: number },
  expiresAt?: string,          // ISO, temporary rule expiry
  judgeModel?: string,         // fusion only (reserved)
  fusionTuning?: object        // fusion only (reserved)
}
// Add validation helper normalizeComboStrategyEntry(entry).
```

**`open-sse/services/combo.js` — expiry-aware strategy resolution:**

```js
// Reference sketch — add helper.
export function getComboStrategyWithExpiry(comboName, settings) {
  const entry = settings.comboStrategies?.[comboName];
  if (!entry) return null;
  if (entry.expiresAt && Date.parse(entry.expiresAt) <= Date.now()) {
    return { ...entry, expired: true }; // caller prunes + falls back to global
  }
  return entry;
}

export function isHybridStrategy(strategy) {
  return strategy === "hybrid" || strategy === "round-robin";
}
```

**`src/sse/handlers/chat.js` — resolve per-combo settings:**

```js
// Reference sketch — in handleChat, before handleComboChat:
const strat = getComboStrategyWithExpiry(modelStr, settings);
if (strat?.expired) {
  // prune: delete settings.comboStrategies[modelStr] (lazy expiry)
  delete settings.comboStrategies[modelStr];
}
const stickyLimit = strat?.stickyLimit ?? settings.comboStickyRoundRobinLimit;
const retriesPerModel = strat?.retriesPerModel ?? 1;
const perModelRetries = strat?.perModelRetries || null;
// pass stickyLimit, retriesPerModel, perModelRetries into handleComboChat
```

**Files touched:**
- `src/lib/db/repos/settingsRepo.js` — extend `comboStrategies` shape + `normalizeComboStrategyEntry`
- `open-sse/services/combo.js` — `getRotatedModels` handles `hybrid` (same as `round-robin` but explicit); `handleComboChat` already supports `retriesPerModel`/`perModelRetries`; add `isHybridStrategy` + `getComboStrategyWithExpiry`
- `src/sse/handlers/chat.js` — resolve per-combo `stickyLimit`, `retriesPerModel`, `perModelRetries`, `expiresAt`; check `expiresAt` — if expired, delete entry and fall back to global
- `src/app/api/settings/route.js` — validate new fields on PATCH, reset rotation on change
- `src/app/(dashboard)/dashboard/combos/page.js` — extend `ComboCard` strategy selector to include `hybrid`, inputs for `stickyLimit` (1–100), `retriesPerModel` (1–5), `perModelRetries` (advanced), `expiresAt` (datetime-local, "temporary" toggle); update `handleSetComboStrategy` to handle new fields and prune defaults

**Acceptance criteria:**
- `getRotatedModels` with `hybrid` rotates; `handleComboChat` with `retriesPerModel=2` retries; `expiresAt` check returns fallback after expiry
- Combo with 3 models, strategy `hybrid`, sticky 2, retries 2 → verify rotation and fallback via logs and `x-9r-fallback-chain` header

---

## M4 — Duplication fix + temporary rules polish

**Goal:** Duplication copies strategy + contextWindow; temporary rules work end-to-end.

### Reference code

**`src/app/(dashboard)/dashboard/combos/page.js` — `handleDuplicate`:**

```js
// Reference sketch — after POST /api/combos succeeds:
const res = await fetch(`/api/settings`, {
  method: "PATCH",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    comboStrategies: { [newName]: { ...comboStrategies[oldName] } },
    comboContextWindows: { [newName]: { ...comboContextWindows[oldName] } },
  }),
});
// expiresAt: copy as-is or reset — decide in implementation (copy as-is is safer for temp rules).
```

**Expiry sweeper (lazy, no cron):**

```js
// Reference sketch — in settingsRepo.getSettings() or chat.js handleChat:
for (const [name, entry] of Object.entries(settings.comboStrategies ?? {})) {
  if (entry.expiresAt && Date.parse(entry.expiresAt) <= Date.now()) {
    delete settings.comboStrategies[name];
  }
}
for (const [name, entry] of Object.entries(settings.comboContextWindows ?? {})) {
  if (entry.expiresAt && Date.parse(entry.expiresAt) <= Date.now()) {
    delete settings.comboContextWindows[name];
  }
}
```

**Files touched:**
- `src/app/(dashboard)/dashboard/combos/page.js` — `handleDuplicate` copies strategy + contextWindow
- `src/lib/db/repos/settingsRepo.js` or `src/sse/handlers/chat.js` — lazy `expiresAt` sweeper

**Acceptance criteria:**
- Duplicate combo with `hybrid` strategy and contextWindow 500k → duplicate has same strategy and window; `expiresAt` copied; expired entry reverts to fallback

---

## M5 — Tests, docs, and browser verification

**Files touched:**
- `tests/unit/capabilities.test.js` (extend), `tests/unit/combo.test.js` (new or extend), `tests/unit/settings.test.js` (new)
- `docs/plans-and-prompts/tracking/CHANGELOG.md`, `docs/ARCHITECTURE.md` (if combo routing changes), research docs status → `active`

**Acceptance criteria:**
- `npx vitest run` — no regressions (compare to `tests/__baseline__/verify-no-regression.mjs`)
- `npx eslint .` — no lint errors
- Browser: `/dashboard/combos` + `/dashboard/providers/[id]` — inputs, duplication, strategy selector, contextWindow display verified

---

## Implementation Order

1. M1 (per-model overrides) — smallest, reuses existing plumbing
2. M2 (per-combo overrides) — builds on M1
3. M3 (hybrid) — independent but benefits from M1/M2 settings patterns
4. M4 (duplication + TTL) — polish, depends on M2/M3
5. M5 (tests/docs/browser) — final verification

Each milestone is independently shippable; M1 can be merged before M2/M3.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| `mergeUserCapabilityOverrides` | Already handles spread of new keys | Verify with unit test before assuming |
| `handleComboChat` retry params | Already supported per research | Verify signature in `open-sse/services/combo.js` |
| Settings PATCH validation | New keys must be validated | Follow existing pattern in `src/app/api/settings/route.js` |
| `MAP_REPLACE_KEYS` | New map keys must be added | Follow existing pattern in `settingsRepo.js` |
| Lazy expiry sweeper | Runs on read path | Keep it O(entries); entries are few |

## Verification

- Unit: `mergeUserCapabilityOverrides` with `contextWindow` override; validation rejects out-of-range; `getRotatedModels` with `hybrid`; `expiresAt` check
- Manual: set overrides, check `/api/models` + dashboard, duplicate combo, verify strategy copy + expiry revert
- Regression: `tests/__baseline__/verify-no-regression.mjs`