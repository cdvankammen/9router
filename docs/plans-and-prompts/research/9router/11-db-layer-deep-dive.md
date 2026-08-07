# 9Router Database Layer Deep Dive

> **Generated:** 2026-08-06 · **Scope:** `src/lib/db/` (26 files) + legacy shims in `src/lib/` (5 files) + `dataDir.js` (1 file) = **32 files**

---

## Table of Contents

1. [Module Summary Table](#module-summary-table)
2. [Driver Chain & Fallback Order](#driver-chain--fallback-order)
3. [Complete Schema Reference](#complete-schema-reference)
4. [Core Layer Files](#core-layer-files)
5. [Adapter Analysis](#adapter-analysis)
6. [Helpers](#helpers)
7. [Migration Strategy](#migration-strategy)
8. [Per-Repo Analysis (CRUD Operations)](#per-repo-analysis)
9. [Legacy Shim Mapping](#legacy-shim-mapping)
10. [Cross-Reference Map](#cross-reference-map)

---

## Module Summary Table

| # | File | Type | Purpose |
|---|------|------|---------|
| 1 | `src/lib/db/index.js` | Barrel | Public API — re-exports all repos + `exportDb`/`importDb`/`initDb` |
| 2 | `src/lib/db/driver.js` | Core | Driver selection chain, singleton adapter with global state |
| 3 | `src/lib/db/schema.js` | Core | Declarative `TABLES` map, PRAGMAs, `SCHEMA_VERSION`, `buildCreateTableSql` |
| 4 | `src/lib/db/migrate.js` | Core | Migration runner, additive auto-sync, legacy JSON import |
| 5 | `src/lib/db/paths.js` | Core | `DB_DIR`, `DATA_FILE`, `BACKUPS_DIR`, `LEGACY_FILES`, `ensureDirs` |
| 6 | `src/lib/db/version.js` | Core | `getAppVersion()`, `timestampSlug()` |
| 7 | `src/lib/db/backup.js` | Core | Pre-schema backup via `ATTACH DATABASE`, pruning |
| 8 | `src/lib/db/adapters/bunSqliteAdapter.js` | Adapter | `bun:sqlite` (Bun runtime only) |
| 9 | `src/lib/db/adapters/betterSqliteAdapter.js` | Adapter | `better-sqlite3` (native, Node only) |
| 10 | `src/lib/db/adapters/nodeSqliteAdapter.js` | Adapter | `node:sqlite` (Node ≥22.5) |
| 11 | `src/lib/db/adapters/sqljsAdapter.js` | Adapter | `sql.js` (pure-JS WASM fallback) |
| 12 | `src/lib/db/helpers/jsonCol.js` | Helper | `parseJson()` / `stringifyJson()` for TEXT JSON columns |
| 13 | `src/lib/db/helpers/kvStore.js` | Helper | `makeKv(scope)` — generic KV store over `kv` table |
| 14 | `src/lib/db/helpers/metaStore.js` | Helper | `getMeta`/`setMeta` (+ sync variants) over `_meta` table |
| 15 | `src/lib/db/migrations/index.js` | Migration | Registry of versioned migrations, `latestVersion()` |
| 16 | `src/lib/db/migrations/001-initial.js` | Migration | Bootstrap all tables/indexes from `TABLES` |
| 17 | `src/lib/db/repos/settingsRepo.js` | Repo | App settings (single-row JSON blob) |
| 18 | `src/lib/db/repos/connectionsRepo.js` | Repo | Provider connections (OAuth/API-key accounts) |
| 19 | `src/lib/db/repos/nodesRepo.js` | Repo | Provider nodes (custom endpoints) |
| 20 | `src/lib/db/repos/proxyPoolsRepo.js` | Repo | Proxy pool configurations |
| 21 | `src/lib/db/repos/apiKeysRepo.js` | Repo | API keys for gateway auth |
| 22 | `src/lib/db/repos/combosRepo.js` | Repo | Model combos (multi-model fallback groups) |
| 23 | `src/lib/db/repos/aliasRepo.js` | Repo | Model aliases, custom models, MITM aliases |
| 24 | `src/lib/db/repos/pricingRepo.js` | Repo | Per-model pricing overrides |
| 25 | `src/lib/db/repos/disabledModelsRepo.js` | Repo | Disabled models per provider |
| 26 | `src/lib/db/repos/requestDetailsRepo.js` | Repo | Observability request log (batched writes) |
| 27 | `src/lib/db/repos/usageRepo.js` | Repo | Usage tracking, stats, charts, pending requests |
| 28 | `src/lib/localDb.js` | Legacy shim | Re-exports from `db/index.js` |
| 29 | `src/lib/usageDb.js` | Legacy shim | Re-exports usage functions from `db/index.js` |
| 30 | `src/lib/requestDetailsDb.js` | Legacy shim | Re-exports request detail functions |
| 31 | `src/lib/disabledModelsDb.js` | Legacy shim | Re-exports disabled model functions |
| 32 | `src/lib/dataDir.js` | Config | `DATA_DIR` resolution (`$DATA_DIR` env → `~/.9router/`) |

---

## Driver Chain & Fallback Order

The driver chain lives in `src/lib/db/driver.js`. It uses a singleton pattern stored on `global._dbAdapter` to survive Next.js hot-reload cycles.

### Selection Order by Runtime



│  Bun Runtime                                            │

│  │ bun:sqlite   │───▶│   sql.js     │                   │
│  │ (built-in)   │ ✗  │ (pure JS)    │                   │

│  Node.js Runtime                                        │

│  │better-sqlite3│─▶│ node:sqlite  │─▶│   sql.js     │   │
│  │  (optional   │
│  │     │✗ │  (≥22.5)     │✗ │ (pure JS)    │   │



### Adapter Common Interface

All adapters return an object with this shape:

```js
{
  driver: string,           // "bun:sqlite" | "better-sqlite3" | "node:sqlite" | "sql.js"
  run(sql, params),         // → { changes, lastInsertRowid }
  get(sql, params),         // → single row or undefined
  all(sql, params),         // → array of rows
  exec(sql),                // multi-statement exec
  transaction(fn),          // wraps fn() in a transaction/savepoint
  checkpoint(),             // PRAGMA wal_checkpoint(TRUNCATE)
  close(),                  // graceful shutdown
  raw,                      // underlying DB instance
}


### Key Adapter Differences

| Feature | bun:sqlite | better-sqlite3 | node:sqlite | sql.js |
|---------|-----------|---------------|-------------|--------|
| **Statement cache** | ✅ Map | ✅ Map | ✅ Map | ❌ (prepare per call) |
| **WAL checkpoint** | 60s interval | 60s interval | 60s interval | N/A (in-memory) |
| **Transaction** | `db.transaction(fn)()` | `db.transaction(fn)()` | SAVEPOINT wrapper | SAVEPOINT wrapper |
| **Persistence** | Native file I/O | Native file I/O | Native file I/O | Debounced `writeFileSync` (100ms) |
| **Shutdown hooks** | beforeExit/SIGINT/SIGTERM | beforeExit/SIGINT/SIGTERM | beforeExit/SIGINT/SIGTERM | beforeExit/SIGINT/SIGTERM |
| **Install required** | No (Bun built-in) | Optional native dep | No (Node ≥22.5) | npm package (WASM) |

### Singleton & Hot-Reload Safety

```js
// global._dbAdapter survives Next.js dev hot-reload
if (!global._dbAdapter) global._dbAdapter = { instance: null, initPromise: null, logged: false };


- `getAdapter()` — async, returns cached adapter or initializes once
- `getAdapterSync()` — throws if not yet initialized; for use after first await

---

## Complete Schema Reference

**SCHEMA_VERSION:** `2`
**PRAGMAs:** WAL mode, NORMAL sync, MEMORY temp store, 30MB mmap, 64MB cache, foreign keys ON, 5s busy timeout

### Tables

#### `_meta`
Internal key-value metadata store.

| Column | Type | Notes |
|--------|------|-------|
| key | TEXT PRIMARY KEY | e.g. `schemaVersion`, `appVersion`, `backupSchemaVersion`, `totalRequestsLifetime`, `migratedAt` |
| value | TEXT NOT NULL | Always stored as string |

#### `settings`
Single-row app configuration blob.

| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PRIMARY KEY CHECK (id = 1) | Enforced singleton |
| data | TEXT NOT NULL | JSON blob with all settings |

#### `providerConnections`
OAuth/API-key provider accounts.

| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PRIMARY KEY | UUID |
| provider | TEXT NOT NULL | Provider identifier |
| authType | TEXT NOT NULL | `oauth`, `apikey`, `access_token` |
| name | TEXT | Display name |
| email | TEXT | Account email |
| priority | INTEGER | Sort order within provider |
| isActive | INTEGER DEFAULT 1 | Boolean flag |
| data | TEXT NOT NULL | JSON: tokens, providerSpecificData, etc. |
| createdAt | TEXT NOT NULL | ISO timestamp |
| updatedAt | TEXT NOT NULL | ISO timestamp |

**Indexes:** `idx_pc_provider`, `idx_pc_provider_active`, `idx_pc_priority`

#### `providerNodes`
Custom provider endpoint nodes.

| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PRIMARY KEY | UUID |
| type | TEXT | Node type |
| name | TEXT | Display name |
| data | TEXT NOT NULL | JSON: prefix, apiType, baseUrl, etc. |
| createdAt | TEXT NOT NULL | ISO timestamp |
| updatedAt | TEXT NOT NULL | ISO timestamp |

**Indexes:** `idx_pn_type`

#### `proxyPools`
Proxy pool configurations.

| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PRIMARY KEY | UUID |
| isActive | INTEGER DEFAULT 1 | Boolean flag |
| testStatus | TEXT | `unknown`, `ok`, `error` |
| data | TEXT NOT NULL | JSON: proxyUrl, noProxy, type, strictProxy, etc. |
| createdAt | TEXT NOT NULL | ISO timestamp |
| updatedAt | TEXT NOT NULL | ISO timestamp |

**Indexes:** `idx_pp_active`, `idx_pp_status`

#### `apiKeys`
Gateway API keys for client authentication.

| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PRIMARY KEY | UUID |
| key | TEXT UNIQUE NOT NULL | Generated API key string |
| name | TEXT | Human label |
| machineId | TEXT | Machine binding |
| isActive | INTEGER DEFAULT 1 | Boolean flag |
| createdAt | TEXT NOT NULL | ISO timestamp |

**Indexes:** `idx_ak_key`

#### `combos`
Model combo definitions (multi-model fallback groups).

| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PRIMARY KEY | UUID |
| name | TEXT UNIQUE NOT NULL | Combo name |
| kind | TEXT | Optional category |
| models | TEXT NOT NULL | JSON array of model specs |
| createdAt | TEXT NOT NULL | ISO timestamp |
| updatedAt | TEXT NOT NULL | ISO timestamp |

**Indexes:** `idx_combo_name`

#### `kv`
Generic scoped key-value store. Used for: `modelAliases`, `customModels`, `mitmAlias`, `pricing`, `disabledModels`.

| Column | Type | Notes |
|--------|------|-------|
| scope | TEXT NOT NULL | Namespace |
| key | TEXT NOT NULL | Key within scope |
| value | TEXT NOT NULL | JSON-encoded value |

**Primary Key:** `(scope, key)`
**Indexes:** `idx_kv_scope`

#### `usageHistory`
Per-request usage records.

| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PRIMARY KEY AUTOINCREMENT | |
| timestamp | TEXT NOT NULL | ISO timestamp |
| provider | TEXT | Provider ID |
| model | TEXT | Model name |
| connectionId | TEXT | FK to providerConnections.id |
| apiKey | TEXT | API key used |
| endpoint | TEXT | Endpoint path |
| promptTokens | INTEGER DEFAULT 0 | Input tokens |
| completionTokens | INTEGER DEFAULT 0 | Output tokens |
| cost | REAL DEFAULT 0 | Calculated cost |
| status | TEXT | `ok`, `error`, etc. |
| tokens | TEXT | JSON: full token breakdown |
| meta | TEXT | JSON: additional metadata |
| conversationId | TEXT | Conversation grouping |

**Indexes:** `idx_uh_ts` (DESC), `idx_uh_provider`, `idx_uh_model`, `idx_uh_conn`, `idx_uh_conversation`

#### `usageDaily`
Pre-aggregated daily usage summaries.

| Column | Type | Notes |
|--------|------|-------|
| dateKey | TEXT PRIMARY KEY | `YYYY-MM-DD` |
| data | TEXT NOT NULL | JSON: requests, tokens, cost, byProvider, byModel, byAccount, byApiKey, byEndpoint |

#### `requestDetails`
Observability request log (excluded from backups).

| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PRIMARY KEY | Generated ID |
| timestamp | TEXT NOT NULL | ISO timestamp |
| provider | TEXT | Provider ID |
| model | TEXT | Model name |
| connectionId | TEXT | FK to providerConnections.id |
| status | TEXT | Request status |
| data | TEXT NOT NULL | JSON: full request/response/latency/tokens |
| conversationId | TEXT | Conversation grouping |

**Indexes:** `idx_rd_ts` (DESC), `idx_rd_provider`, `idx_rd_model`, `idx_rd_conn`, `idx_rd_conversation`

---

## Core Layer Files

### `src/lib/db/index.js` — Public API Barrel

**Exports:**
- All repo functions (re-exported from individual repos)
- `exportDb()` → full DB export as JSON object
- `importDb(payload)` → wipe + reimport in transaction, returns exported state
- `initDb()` → eager initialization helper

**`exportDb()` shape:**
```js
{
  settings, providerConnections[], providerNodes[], proxyPools[],
  apiKeys[], combos[], modelAliases{}, customModels[], mitmAlias{}, pricing{}
}


**`importDb()` behavior:** Deletes all rows (except `_meta`), then inserts from payload in a single transaction. Handles boolean→integer conversion for `isActive`.

### `src/lib/db/driver.js` — Driver Selection

**Exports:**
- `getAdapter()` → Promise<adapter> (singleton, lazy-init)
- `getAdapterSync()` → adapter (throws if uninitialized)

**State:** Stored on `global._dbAdapter` to survive Next.js HMR.

### `src/lib/db/schema.js` — Declarative Schema

**Exports:**
- `SCHEMA_VERSION` (currently `2`)
- `PRAGMA_SQL` — multi-statement PRAGMA block
- `TABLES` — declarative table definitions map
- `buildCreateTableSql(name, def)` → CREATE TABLE IF NOT EXISTS statement

### `src/lib/db/migrate.js` — Migration Runner

**Exports:**
- `runMigrationOnce(adapter)` — main entry, idempotent per adapter instance
- `MigrationAborted` — error class for row-count assertion failures

**Three-phase process:**
1. **Versioned migrations** — sequential application of numbered migration files
2. **Additive auto-sync** — diff `TABLES` against live schema, add missing columns/indexes
3. **Legacy JSON import** — one-time import from `db.json`/`usage.json`/`disabledModels.json`/`request-details.json`