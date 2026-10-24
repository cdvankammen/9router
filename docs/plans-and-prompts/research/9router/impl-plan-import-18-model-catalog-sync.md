# Implementation Plan 18: Model Catalog Sync & Unknown Model Resolution

**Date:** 2026-09-17
**Author:** GitHub Copilot agent (6-level binary tree expansion)
**Status:** active
**Tags:** implementation-plan, hermes-import, model-catalog, unknown-models, sync

> ⚠️ **AGENT REVIEW NOTE (READ FIRST)**
> THIS PLAN IS A RESEARCH DOCUMENT — NOT AN IMPLEMENTATION INSTRUCTION.
> The code is a **SUGGESTION / OPTION** for future agents — NOT a final decision, NOT an instruction to implement anything.
> Code snippets show **possible approaches** (file paths, function signatures, patterns) — options, not requirements.
> **Nothing in this plan should be implemented automatically** — future agents must evaluate each suggestion, decide if there's a better way, and only then proceed.
> The agent is the final arbiter: if a better approach exists, make those changes happen.

## Source Research Branches

This plan implements options researched in:
- `../2026-09-17-hermes-import-branch-x-model-catalog-sync.md` (primary — catalog sources and unknown-model resolution)
- `../2026-09-17-hermes-import-branch-b-provider-matching.md` (model name matching that resolution feeds)
- `../2026-09-17-hermes-import-branch-n-migration-backward-compatibility.md` (additive-only changes to the existing catalog sync)

## Goal

Sync model catalogs from remote sources and resolve unknown models over time. **This is a research artifact — code below is a suggestion for future agents, not an implementation.**

## Grounding (verified against the real codebase, 2026-09-17)

| Fact | Verified value |
|------|---------------|
| **A model catalog sync ALREADY EXISTS** | `src/lib/modelCatalog/sync.js` — daily refresh from **models.dev** (`https://models.dev/api.json`), writes `model-catalog.json` next to the DB, started in `instrumentation.js` via `startModelCatalogSync()` |
| Catalog read side | `open-sse/providers/catalogOverride.js` — `CATALOG_FILE = path.join(DATA_DIR, "model-catalog.json")`, `getCatalogModalities(model)`, `getCatalogLimits(provider, model)`; mtime-cached, synchronous hot path |
| **`model_catalog` SQLite table does NOT exist** | The catalog is a **file**, not a table. Original plan proposed a redundant SQLite table + OpenRouter/LiteLLM sync — **duplicates existing functionality** |
| **Migration version 8 is TAKEN** | Plan 10 uses `008-import-tenants`. Any new migration must be version 12+ |
| Adapter API | `db.run/get/all/exec` positional params — **no `.prepare()`** (original plan used `.prepare()` everywhere) |
| Unknown models | Plan 02: `unknown_models` table (version 6) + `recordUnknownModel`/`getUnknownModels`/`mapUnknownModel` |
| Provider models | `open-sse/providers/index.js` `PROVIDER_MODELS` — keyed by `alias \|\| id`, values `[{ id, name }]` |

## Scope

- **Extend** the existing models.dev sync (not duplicate it)
- Unknown model resolution workflow (uses `unknown_models` from plan 02)
- Alias table (only if needed — the existing `PROVIDER_ALIASES` in `sync.js` already maps provider ids)

## Design

### 1. Extend the existing sync — `src/lib/modelCatalog/sync.js`

**Purpose:** The existing sync already downloads models.dev daily. **Do NOT create a parallel `model_catalog` table or OpenRouter/LiteLLM sync** — that duplicates `sync.js` + `catalogOverride.js`. Instead, extend the existing sync to also emit pricing/context data the import matcher can use.

**⚠️ GROUNDING FIX (original plan was wrong):**
1. Proposed `008-model-catalog` migration — **version 8 is taken** by plan 10, AND the catalog is a file not a table.
2. Proposed OpenRouter + LiteLLM sync — **redundant** with the existing models.dev sync.
3. Used `db.prepare(...)` — adapter has no `.prepare()`.

```javascript
// src/lib/modelCatalog/sync.js (EXTENSION — suggestion only)
// The existing sync writes { models, providers } to model-catalog.json.
// To help the import matcher, also expose a lookup for unknown-model resolution:
export function findCatalogModel(modelId) {
  const { getCatalogModalities, getCatalogLimits } = requireCatalog();
  // baseId strips vendor prefix + :free suffix (see catalogOverride.js)
  return {
    modalities: getCatalogModalities(modelId),
    limits: getCatalogLimits(null, modelId),
  };
}
```

### 2. Unknown Model Resolution — `src/lib/import/unknownModels.js` (extend)

**Purpose:** Suggest mappings for unknown models using the existing catalog + provider models.

**⚠️ GROUNDING FIX:** Original used `db.prepare(...).get(...)` — use `db.get(sql, params)`.

```javascript
// src/lib/import/unknownModels.js (extension)
// SUGGESTION ONLY — review against actual codebase before implementing
import { getAdapter } from "@/lib/db/driver.js";
import { PROVIDER_MODELS } from "open-sse/providers/index.js";

export async function suggestMapping(model) {
  const db = await getAdapter();
  const normalized = model.toLowerCase();

  // 1. Check aliases (if a model_aliases table is added — optional)
  const alias = db.get("SELECT * FROM model_aliases WHERE alias = ?", [normalized]);
  if (alias) return { provider: alias.provider, canonicalModel: alias.canonical_model, confidence: 1.0, via: "alias" };

  // 2. Check in-memory PROVIDER_MODELS (real source of truth)
  for (const [providerKey, models] of Object.entries(PROVIDER_MODELS)) {
    const exact = models.find((m) => m.id.toLowerCase() === normalized);
    if (exact) return { provider: providerKey, canonicalModel: exact.id, confidence: 1.0, via: "provider-models-exact" };
  }

  // 3. Fuzzy: strip version suffix, try prefix
  const stripped = normalized.replace(/-\d{6,8}$/, "");
  for (const [providerKey, models] of Object.entries(PROVIDER_MODELS)) {
    const prefix = models.find((m) => m.id.toLowerCase() === stripped);
    if (prefix) return { provider: providerKey, canonicalModel: prefix.id, confidence: 0.9, via: "provider-models-prefix" };
  }

  // 4. Provider prefix: "anthropic/claude-x" → provider known
  if (normalized.includes("/")) {
    const [provider] = normalized.split("/");
    return { provider, canonicalModel: normalized.split("/").pop(), confidence: 0.8, via: "provider-prefix" };
  }

  return null;
}

export async function resolveUnknownModels() {
  const db = await getAdapter();
  const unknowns = db.all("SELECT model FROM unknown_models WHERE mapped_provider IS NULL");
  const resolved = [];
  for (const u of unknowns) {
    const suggestion = await suggestMapping(u.model);
    if (suggestion) {
      await mapUnknownModel(u.model, suggestion.provider, suggestion.canonicalModel);
      resolved.push({ model: u.model, ...suggestion });
    }
  }
  return resolved;
}
```

### 3. Sync Scheduler Hook — `src/lib/modelCatalog/sync.js` (addition)

**Purpose:** After each daily sync, run `resolveUnknownModels()` so unknown models get auto-mapped.

```javascript
// src/lib/modelCatalog/sync.js (addition to the existing sync loop)
// SUGGESTION ONLY
// After a successful sync:
// const { resolveUnknownModels } = await import("@/lib/import/unknownModels.js");
// const resolved = await resolveUnknownModels();
// console.log(`[modelCatalog] resolved ${resolved.length} unknown models`);
```

## Steps (per-part instructions)

### Step 1 — Extend `src/lib/modelCatalog/sync.js`
1. Add `findCatalogModel(modelId)` helper (or reuse `getCatalogModalities`/`getCatalogLimits` directly).
2. **Verify:** `node -e "import('./src/lib/modelCatalog/sync.js').then(m => console.log(m.getSyncState()))"` → state object.

### Step 2 — Extend `src/lib/import/unknownModels.js`
1. Add `suggestMapping` + `resolveUnknownModels` using `PROVIDER_MODELS` (real source).
2. **Verify:** `suggestMapping('claude-3-5-sonnet-20241022')` → `{ provider: 'anthropic', confidence: 1.0 }`.

### Step 3 — Add sync hook
1. After each daily sync, call `resolveUnknownModels()`.
2. **Verify:** unknown models get auto-mapped after sync.

### Step 4 — Unknown Models UI
1. In the Messages page, add an "Unknown Models" section listing `getUnknownModels()` with "Map" action.
2. **Verify:** mapping a model backfills `imported_messages` (via plan 01's `updateModelMapping`).

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|-----------|------|-----------|
| Existing models.dev sync | Redundant parallel sync | **Extend, don't duplicate** |
| `PROVIDER_MODELS` | Registry changes | Rebuild lookups on TTL expiry |
| Remote APIs | Rate limits / downtime | Daily sync, fail-open |

## Verification (commands)

```bash
node -e "import('./src/lib/import/unknownModels.js').then(async m => {
  console.log(await m.suggestMapping('claude-3-5-sonnet-20241022'));
  console.log(await m.suggestMapping('totally-unknown-model-xyz'));
})"
# Expect: { provider: 'anthropic', confidence: 1.0 } then null
```

## Note to Implementing Agents (READ FIRST)

The code above is a **starting point for review**, not a final implementation. Agents MUST review it against the actual codebase, decide if there is a better way, make those changes happen, verify by running, and update this plan.
