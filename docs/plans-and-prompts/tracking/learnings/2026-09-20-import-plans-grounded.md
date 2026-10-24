# Import Plans Grounding Pass (2026-09-20)

**Situation:** All 20 Hermes import implementation plans (`research/9router/impl-plan-import-01…20-*.md`) were originally written from memory of the codebase. Several contained API calls, file paths, and module names that don't exist.

**Root cause:** Plans were drafted from general knowledge of the project rather than verified against the actual source. The codebase has drifted from its docs (ARCHITECTURE.md is stale on persistence; `usage.json` is legacy; `src/lib/usageDb.js` doesn't exist).

**Detection:** Read each plan's code snippets against the real modules. Grep-verified exports (`open-sse/services/combo.js`, `open-sse/utils/cursorProtobuf.js`, `open-sse/providers/index.js`), migration format (`src/lib/db/migrations/`), adapter API (`src/lib/db/driver.js`), and package.json (Zod absent).

**Prevention:** Every plan now carries a **Grounding table** (verified facts with real file paths) + **AGENT REVIEW NOTE** block. Future plan writers must verify each import path and API call against the real codebase before writing.

## Key verified facts (do NOT re-derive)

- **Adapter API:** `db.run(sql, params[])`, `db.get(sql, params[])`, `db.all(sql, params[])`, `db.exec(sql)`, `db.transaction(fn)` — positional params, NO `.prepare()`, NO named `@param` objects.
- **Migration format:** `export default { version, name, up(db) }` — registered in `src/lib/db/migrations/index.js`. Versions 5–12 taken (plans 01/02/04/10/11/12/13/13).
- **`SCHEMA_VERSION`** in `src/lib/db/schema.js` = 3 — bump +1 when TABLES change.
- **Provider registry:** `open-sse/providers/registry/index.js` = `export default [...]` (NO `getRegistry()`). `PROVIDER_MODELS` in `open-sse/providers/index.js` keyed `alias||id`. `src/config/providerModels.js` does NOT exist (real: `open-sse/config/providerModels.js`).
- **Pricing:** `open-sse/providers/pricing.js` `getPricingForModel(provider, model)` → $/1M tokens (÷1,000,000). `src/lib/db/repos/pricingRepo.js` wraps with user overrides.
- **Error categorizer:** `open-sse/utils/errorCategorizer.js` `categorizeError(status, text)` POSITIONAL args, lowercase categories.
- **Combo:** `open-sse/services/combo.js` exports `getComboModelsFromData` etc. — `comboRules` does NOT exist.
- **Zod NOT installed** — hand-rolled validation in plans 03/17/19.
- **`usage.json`/`log.txt` LEGACY** (`appendRequestLog` no-op); live source = `usageHistory` table. `src/lib/usageDb.js` does NOT exist (real: `src/lib/db/repos/usageRepo.js`).
- **Cursor protobuf:** `open-sse/utils/cursorProtobuf.js` real exports `decodeMessage`, `parseConnectRPCFrame`, `decodeVarint`, `decodeField`, `extractTextFromResponse` — NO `decodeCursorProtobuf`.
- **Model catalog sync ALREADY EXISTS:** `src/lib/modelCatalog/sync.js` (models.dev daily) + `open-sse/providers/catalogOverride.js` — plan 18 extends, don't duplicate.
- **Messages page:** `src/app/(dashboard)/dashboard/messages/page.js`; boot hooks in `src/instrumentation.js` `register()`.
- **Auth pattern:** `src/app/api/version/update/route.js` timing-safe Bearer compare; sanitize keys in `requestDetailsRepo.sanitizeHeaders()`.
- **`matchModelToProvider` is SYNC** (no await); `getRecentImports(sinceIso)` takes ISO string; `getImportedMessages` returns `{details, pagination}`.

## Links

- Master map: `research/2026-09-17-hermes-import-master-map.md` (grounding status table + per-plan fix table)
- Plans: `research/9router/impl-plan-import-{01..20}-*.md`
- Tracking: `tracking/CHANGELOG.md` (2026-09-20 entry), `tracking/TASKS.md`