# Implementation Plan Import-18 — Model Catalog Sync & Unknown Model Resolution — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #hermes-import #model-catalog #unknown-models #sync #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (**migration version 8 is TAKEN** by plan import-10 — model catalog must use a LATER version e.g. `013-model-catalog`; adapter API `db.run/get/all/exec` positional params — **no `.prepare()`**; boot hook from `src/instrumentation.js` `register()` — already starts `startModelCatalogSync`; settings from `src/lib/db/repos/settingsRepo.js`).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — migration; sync; resolution.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-import-18-model-catalog-sync.md`, `../research/9router/impl-plan-import-02-provider-matching.md`, `../research/9router/impl-plan-import-13-deduplication-idempotency.md`.

## Scope

**In scope:** remote catalog sync job; `model_catalog` table; unknown model resolution workflow; alias table.
**Out of scope:** provider matching (import-02); deduplication (import-13).

## Milestones

### M1 — Model catalog migration

**Reference code (`src/lib/db/migrations/013-model-catalog.js`):**

```js
// Version 13 (5–12 taken by plans import-01/02/04/10/11/12/13).
export default {
  version: 13,
  name: "model-catalog",
  up(db) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS model_catalog (
        id TEXT PRIMARY KEY,
        provider TEXT NOT NULL,
        model TEXT NOT NULL,
        input_price_per_mtok REAL,
        output_price_per_mtok REAL,
        context_window INTEGER,
        supports_tools INTEGER DEFAULT 0,
        supports_vision INTEGER DEFAULT 0,
        source TEXT NOT NULL,          -- openrouter | models.dev | litellm | local
        last_synced_at TEXT NOT NULL,
        UNIQUE(provider, model)
      )
    `);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_catalog_provider ON model_catalog(provider)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_catalog_model ON model_catalog(model)`);

    db.exec(`
      CREATE TABLE IF NOT EXISTS model_aliases (
        alias TEXT PRIMARY KEY,
        canonical_model TEXT NOT NULL,
        provider TEXT NOT NULL,
        created_at TEXT NOT NULL
      )
    `);
    console.log("[DB][migrate:013] model_catalog + model_aliases tables created");
  },
};
```

**Acceptance criteria:** tables; indexes; version 13.

### M2 — Catalog sync job

**Reference code (`src/lib/import/catalogSync.js`):**

```js
import { getAdapter } from "@/lib/db/driver.js";

export async function syncCatalogFromOpenRouter() {
  const res = await fetch("https://openrouter.ai/api/v1/models");
  if (!res.ok) throw new Error(`OpenRouter sync failed: ${res.status}`);
  const { data } = await res.json();

  const db = await getAdapter();
  const tx = db.transaction((models) => {
    let count = 0;
    for (const m of models) {
      const [provider, model] = m.id.split("/");
      db.run(`
        INSERT INTO model_catalog (
          id, provider, model, input_price_per_mtok, output_price_per_mtok,
          context_window, supports_tools, supports_vision, source, last_synced_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'openrouter', strftime('%Y-%m-%dT%H:%M:%fZ','now'))
        ON CONFLICT(provider, model) DO UPDATE SET
          input_price_per_mtok = excluded.input_price_per_mtok,
          output_price_per_mtok = excluded.output_price_per_mtok,
          context_window = excluded.context_window,
          supports_tools = excluded.supports_tools,
          supports_vision = excluded.supports_vision,
          last_synced_at = excluded.last_synced_at
      `, [
        m.id, provider, model,
        m.pricing?.prompt ? parseFloat(m.pricing.prompt) : null,
        m.pricing?.completion ? parseFloat(m.pricing.completion) : null,
        m.context_length || null,
        m.supported_parameters?.tools ? 1 : 0,
        m.supported_parameters?.vision ? 1 : 0,
      ]);
      count++;
    }
    return count;
  });

  const synced = tx(data);
  return { synced, source: "openrouter" };
}

export async function syncCatalogFromLiteLLM() {
  const res = await fetch("https://raw.githubusercontent.com/BerriAI/litellm/main/model_prices_and_context_window.json");
  if (!res.ok) throw new Error(`LiteLLM sync failed: ${res.status}`);
  const data = await res.json();

  const db = await getAdapter();
  const tx = db.transaction((models) => {
    let count = 0;
    for (const [id, m] of Object.entries(models)) {
      const [provider, model] = id.split("/");
      db.run(`
        INSERT INTO model_catalog (
          id, provider, model, input_price_per_mtok, output_price_per_mtok,
          context_window, source, last_synced_at
        ) VALUES (?, ?, ?, ?, ?, ?, 'litellm', strftime('%Y-%m-%dT%H:%M:%fZ','now'))
        ON CONFLICT(provider, model) DO UPDATE SET
          input_price_per_mtok = excluded.input_price_per_mtok,
          output_price_per_mtok = excluded.output_price_per_mtok,
          context_window = excluded.context_window,
          last_synced_at = excluded.last_synced_at
      `, [
        id, provider, model,
        m.input_cost_per_token ? m.input_cost_per_token * 1_000_000 : null,
        m.output_cost_per_token ? m.output_cost_per_token * 1_000_000 : null,
        m.max_input_tokens || null,
      ]);
      count++;
    }
    return count;
  });

  const synced = tx(data);
  return { synced, source: "litellm" };
}
```

**Acceptance criteria:** OpenRouter sync; LiteLLM sync; upsert.

### M3 — Unknown model resolution

**Reference code (`src/lib/import/catalogSync.js`):**

```js
// Resolve unknown models against the catalog + aliases.
export async function resolveUnknownModels() {
  const db = await getAdapter();
  const unknowns = db.all(`SELECT * FROM unknown_models WHERE resolved = 0 LIMIT 100`);
  let resolved = 0;
  for (const u of unknowns) {
    const alias = db.get(`SELECT canonical_model, provider FROM model_aliases WHERE alias = ?`, [u.model]);
    if (alias) {
      db.run(`UPDATE unknown_models SET resolved = 1, resolved_provider = ?, resolved_model = ? WHERE model = ?`,
        [alias.provider, alias.canonical_model, u.model]);
      resolved++;
      continue;
    }
    const catalog = db.get(`SELECT provider, model FROM model_catalog WHERE model = ? LIMIT 1`, [u.model]);
    if (catalog) {
      db.run(`UPDATE unknown_models SET resolved = 1, resolved_provider = ?, resolved_model = ? WHERE model = ?`,
        [catalog.provider, catalog.model, u.model]);
      resolved++;
    }
  }
  return { resolved, remaining: unknowns.length - resolved };
}
```

**Acceptance criteria:** alias lookup; catalog lookup; resolution.

### M4 — Boot hook + tests

**Reference code (`src/instrumentation.js` addition):**

```js
// Extend the existing startModelCatalogSync hook with import catalog sync.
import { syncCatalogFromOpenRouter } from "@/lib/import/catalogSync.js";

// In the existing sync loop, add:
//   await syncCatalogFromOpenRouter().catch((e) => console.error("[catalog] openrouter sync failed:", e));
```

**Files touched:** `src/lib/db/migrations/013-model-catalog.js` (new), `src/lib/import/catalogSync.js` (new), `src/instrumentation.js` (sync hook), `src/lib/db/migrations/005-imported-messages.js` (add `resolved` columns to `unknown_models`), `tests/unit/import-catalog-sync.test.js` (new).

**Acceptance criteria:** boot hook; tests pass.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Version collision | Migration conflict | Version 13 |
| Remote API changes | Sync failures | try/catch + retry |
| Price units | Wrong costs | Per-1M normalization |
| Unknown resolution | Stale unknowns | Periodic job |

## Verification

- Unit: syncCatalogFromOpenRouter, syncCatalogFromLiteLLM, resolveUnknownModels
- Manual: sync → resolve unknowns
- Regression: `tests/__baseline__/verify-no-regression.mjs`