# Exponential Expansion E06 — Persistence (SQLite Adapter Chain)

**Date:** 2026-09-15
**Root phrase:** "Persistence (SQLite adapter chain, repos, migrations)" — from `2026-08-31-message-origin-and-destination-research.md` §A.6
**Format:** 6+ levels, variable branching
**Status:** complete

## L1 — sub-phrases discovered in the root

1. SQLite layer `src/lib/db/`
2. Adapter fallback chain: `bun:sqlite` → `better-sqlite3` → `node:sqlite` → `sql.js`
3. Per-entity repos in `src/lib/db/repos/*`
4. Migrations in `src/lib/db/migrations/`
5. `src/lib/localDb.js` backward-compat shim
6. DB file location via `src/lib/db/paths.js` (`DATA_DIR`, else `~/.9router/`)
7. Usage/logs (`usageDb.js`, `usage.json` + `log.txt`) do NOT follow `DATA_DIR`

## L2 — expansion of each L1 node

### 1. SQLite layer src/lib/db/
- **1a. Entry point** — `src/lib/db/index.js` exports the adapter.
- **1b. Driver selection** — `driver.js` picks first available.
- **1c. Schema** — migrations create tables.
- **1d. Repos** — per-entity data access.

### 2. Adapter fallback chain
- **2a. bun:sqlite** — Bun's native SQLite (fastest).
- **2b. better-sqlite3** — native Node addon (optional dep).
- **2c. node:sqlite** — Node ≥22.5 built-in.
- **2d. sql.js** — pure JS WASM (always works, slowest).
- **2e. better-sqlite3 in optionalDependencies** — install never fails without build tools.

### 3. Per-entity repos
- **3a. Pattern** — one file per entity (settings, keys, profiles, etc.).
- **3b. CRUD** — create, read, update, delete, list.
- **3c. Transactions** — repo methods use DB transactions.
- **3d. Type safety** — JSDoc types, no TypeScript.

### 4. Migrations
- **4a. Location** — `src/lib/db/migrations/`.
- **4b. Format** — numbered SQL files.
- **4c. Runner** — applies pending migrations on startup.
- **4d. Idempotent** — safe to re-run.

### 5. localDb.js shim
- **5a. Re-exports** — `src/lib/db/index.js`.
- **5b. Legacy API** — old code imports from `@/lib/localDb.js`.
- **5c. New code** — should import from `@/lib/db/index.js`.

### 6. DB file location
- **6a. paths.js** — resolves `DATA_DIR` env or `~/.9router/`.
- **6b. File** — `9router.db` (or similar).
- **6c. Permissions** — file must be writable.

### 7. Usage/logs separate
- **7a. usageDb.js** — `usage.json` + `log.txt` in `~/.9router/`.
- **7b. Not in SQLite** — separate storage.
- **7c. Does not follow DATA_DIR** — inconsistency.

## L3 — expansion of selected L2 nodes

### 2a → bun:sqlite
- **2a-i. API** — `bun:sqlite` module.
- **2a-ii. Performance** — native, no WASM overhead.
- **2a-iii. Availability** — only on Bun runtime.

### 2b → better-sqlite3
- **2b-i. Native addon** — requires build tools (python, make, C++).
- **2b-ii. Optional dep** — in `optionalDependencies` in package.json.
- **2b-iii. Fallback** — if missing, chain continues.

### 2c → node:sqlite
- **2c-i. Node 22.5+** — built-in `node:sqlite` module.
- **2c-ii. Sync API** — similar to better-sqlite3.
- **2c-iii. No build** — pure Node.

### 2d → sql.js
- **2d-i. WASM** — SQLite compiled to WebAssembly.
- **2d-ii. Pure JS** — runs anywhere Node runs.
- **2d-iii. Performance** — slower, but universal.

### 3a → repo pattern
- **3a-i. settingsRepo** — key-value settings.
- **3a-ii. keysRepo** — API keys (future).
- **3a-iii. profilesRepo** — agent profiles (future).
- **3a-iv. usageRepo** — usage records (future).

### 4b → numbered SQL
- **4b-i. Naming** — `001_init.sql`, `002_add_keys.sql`, etc.
- **4b-ii. Order** — numeric sort.
- **4b-iii. Tracking** — `migrations` table records applied.

### 6a → paths.js
- **6a-i. DATA_DIR** — env var for custom location.
- **6a-ii. Default** — `~/.9router/`.
- **6a-iii. Creation** — dir created if missing.

## L4 — expansion of selected L3 nodes

### 2b-ii → optionalDependencies
- **2b-ii-a. package.json** — `"better-sqlite3": "^9.x"` in optionalDependencies.
- **2b-ii-b. npm install** — succeeds even if build fails.
- **2b-ii-c. Runtime** — driver.js checks `require.resolve` availability.

### 3a-i → settingsRepo
- **3a-i-a. Table** — `settings` (key, value, updated_at).
- **3a-i-b. Methods** — get, set, delete, list.
- **3a-i-c. JSON values** — stored as TEXT, parsed on read.

### 4b-iii → migrations table
- **4b-iii-a. Schema** — `id`, `name`, `applied_at`.
- **4b-iii-b. Check** — SELECT from migrations before applying.
- **4b-iii-c. Transaction** — each migration in a transaction.

## L5 — expansion of selected L4 nodes

### 2b-ii-c → driver.js check
- **2b-ii-c-1. try/catch** — `require('better-sqlite3')`.
- **2b-ii-c-2. Fallback** — on error, try next.
- **2b-ii-c-3. Order** — bun → better-sqlite3 → node:sqlite → sql.js.

### 3a-i-c → JSON values
- **3a-i-c-1. Serialize** — `JSON.stringify`.
- **3a-i-c-2. Parse** — `JSON.parse` with fallback.
- **3a-i-c-3. Complex objects** — settings can be nested.

## L6 — expansion of selected L5 nodes

### 2b-ii-c-3 → driver order
- **2b-ii-c-3-1. Bun first** — fastest if on Bun.
- **2b-ii-c-3-2. better-sqlite3 second** — fast native on Node.
- **2b-ii-c-3-3. node:sqlite third** — built-in, no dep.
- **2b-ii-c-3-4. sql.js last** — universal fallback.

### 3a-i-c-3 → nested settings
- **3a-i-c-3-1. Example** — `{"rateLimits": {"chat": 20}}`.
- **3a-i-c-3-2. Update** — full replace or deep merge.
- **3a-i-c-3-3. Schema** — no schema enforcement; app validates.

## Confidence & open questions

- **Confidence: high** — architecture doc and codebase structure known.
- **Open:** should usage/logs move into SQLite?
- **Open:** should migrations support down/rollback?
- **Open:** should repos use a query builder?

## Sources

- `docs/ARCHITECTURE.md` (persistence section)
- `src/lib/db/` structure (known from research)
- `docs/plans-and-prompts/research/2026-08-31-message-origin-and-destination-research.md` §A.6