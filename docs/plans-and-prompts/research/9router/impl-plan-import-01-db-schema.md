# Implementation Plan 01: Imported Messages Database Schema

**Date:** 2026-09-17
**Author:** GitHub Copilot agent (6-level binary tree expansion)
**Status:** active
**Tags:** implementation-plan, hermes-import, database, schema, migration

> ⚠️ **AGENT REVIEW NOTE (READ FIRST)**
> THIS PLAN IS A RESEARCH DOCUMENT — NOT AN IMPLEMENTATION INSTRUCTION.
> The code is a **SUGGESTION / OPTION** for future agents — NOT a final decision, NOT an instruction to implement anything.
> Code snippets show **possible approaches** (file paths, function signatures, patterns) — options, not requirements.
> **Nothing in this plan should be implemented automatically** — future agents must evaluate each suggestion, decide if there's a better way, and only then proceed.
> The agent is the final arbiter: if a better approach exists, make those changes happen.

## Source Research Branches

This plan implements options researched in:
- `../2026-09-17-hermes-import-branch-g-database-schema.md` (primary — schema design, indexes, storage decisions)
- `../2026-09-17-hermes-import-branch-n-migration-backward-compatibility.md` (additive migration safety)
- `../2026-09-17-hermes-import-branch-e-conversation-reconstruction.md` (conversation grouping columns)

## Goal

Create the `imported_messages` table and supporting indexes for storing imported agent messages, following the **exact** conventions of the existing SQLite layer (`src/lib/db/`).

## Grounding (verified against the real codebase, 2026-09-17)

| Fact | Verified value |
|------|---------------|
| Migration format | `export default { version: N, name: "...", up(db) }` — see `src/lib/db/migrations/003-message-facets.js` |
| Migration registry | `src/lib/db/migrations/index.js` — `import m00X from "./00X-*.js"` + `MIGRATIONS = [...]` sorted by version |
| Adapter API | `db.run(sql, params[])`, `db.get(sql, params[])`, `db.all(sql, params[])`, `db.exec(sql)`, `db.transaction(fn)` — **positional params, NO `.prepare()`** (see `src/lib/db/adapters/betterSqliteAdapter.js`) |
| `requestDetails` schema | `id, timestamp, provider, model, connectionId, status, data (JSON blob), conversationId` — **no `request_json`/`response_json`/`latency_ms`/`cost` columns** (see `src/lib/db/schema.js` line 140) |
| `requestDetails` data shape | `data` is a JSON blob with `{ request, response, tokens, latency, cost, errorCategory, sourceApp, ... }` (see `requestDetailsRepo.extractFacets`) |
| Pagination pattern | Keyset `(timestamp DESC, id DESC)` with opaque base64url cursors (see `getRequestDetails`) |
| Repo pattern | `import { getAdapter } from "../driver.js"` + `parseJson`/`stringifyJson` from `../helpers/jsonCol.js` |
| Schema version bump | `SCHEMA_VERSION` in `src/lib/db/schema.js` must be bumped +1 when TABLES change |

## Scope

- New table `imported_messages` (declarative in `TABLES` + versioned migration)
- Indexes for query performance
- Repository `importedMessagesRepo.js` following `requestDetailsRepo.js` patterns
- `all_messages` UNION view for unified queries (native + imported)

## Design

### 1. Migration file — `src/lib/db/migrations/005-imported-messages.js`

**Purpose:** Create the `imported_messages` table + indexes. Follows the exact `003-message-facets.js` format (default export with `version`, `name`, `up(db)`).

```javascript
// src/lib/db/migrations/005-imported-messages.js
// SUGGESTION ONLY — review against actual codebase before implementing
export default {
  version: 5,
  name: "imported-messages",
  up(db) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS imported_messages (
        id TEXT PRIMARY KEY,
        imported_at TEXT NOT NULL,
        source TEXT NOT NULL,
        source_session_id TEXT,
        provider TEXT,
        model TEXT,
        model_match_confidence REAL,
        status TEXT NOT NULL,
        latency_ms INTEGER,
        prompt_tokens INTEGER,
        completion_tokens INTEGER,
        total_tokens INTEGER,
        cost REAL,
        request_json TEXT,
        response_json TEXT,
        error_message TEXT,
        error_category TEXT,
        conversation_id TEXT,
        source_app TEXT,
        metadata TEXT
      )
    `);

    db.exec(`CREATE INDEX IF NOT EXISTS idx_imported_provider ON imported_messages(provider)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_imported_model ON imported_messages(model)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_imported_status ON imported_messages(status)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_imported_timestamp ON imported_messages(imported_at)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_imported_conversation ON imported_messages(conversation_id)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_imported_source ON imported_messages(source)`);

    console.log("[DB][migrate:005] imported_messages table created");
  },
};
```

**Why this shape:** The migration runner (`src/lib/db/migrate.js` `runVersionedMigrations`) filters `MIGRATIONS` by `version > current` and calls `m.up(adapter)` inside a transaction, then writes `schemaVersion`. The `up(db)` receives the **adapter** (which has `.exec`), not a raw better-sqlite3 instance.

### 2. Register in `src/lib/db/migrations/index.js`

**Purpose:** Make the migration runner aware of the new migration.

```javascript
// src/lib/db/migrations/index.js (addition)
import m005 from "./005-imported-messages.js";
export const MIGRATIONS = [m001, m002, m003, m004, m005].sort((a, b) => a.version - b.version);
```

### 3. Add to declarative schema — `src/lib/db/schema.js`

**Purpose:** The auto-sync (`syncSchemaFromTables`) creates missing tables/columns/indexes on boot. Adding `imported_messages` to `TABLES` makes it self-healing on any driver.

```javascript
// src/lib/db/schema.js (addition to TABLES)
imported_messages: {
  columns: {
    id: "TEXT PRIMARY KEY",
    imported_at: "TEXT NOT NULL",
    source: "TEXT NOT NULL",
    source_session_id: "TEXT",
    provider: "TEXT",
    model: "TEXT",
    model_match_confidence: "REAL",
    status: "TEXT NOT NULL",
    latency_ms: "INTEGER",
    prompt_tokens: "INTEGER",
    completion_tokens: "INTEGER",
    total_tokens: "INTEGER",
    cost: "REAL",
    request_json: "TEXT",
    response_json: "TEXT",
    error_message: "TEXT",
    error_category: "TEXT",
    conversation_id: "TEXT",
    source_app: "TEXT",
    metadata: "TEXT",
  },
  indexes: [
    "CREATE INDEX IF NOT EXISTS idx_imported_provider ON imported_messages(provider)",
    "CREATE INDEX IF NOT EXISTS idx_imported_model ON imported_messages(model)",
    "CREATE INDEX IF NOT EXISTS idx_imported_status ON imported_messages(status)",
    "CREATE INDEX IF NOT EXISTS idx_imported_timestamp ON imported_messages(imported_at)",
    "CREATE INDEX IF NOT EXISTS idx_imported_conversation ON imported_messages(conversation_id)",
    "CREATE INDEX IF NOT EXISTS idx_imported_source ON imported_messages(source)",
  ],
},
```

**⚠️ CRITICAL:** Bump `SCHEMA_VERSION` in `schema.js` from 3 → 4. The comment at the top says: *"Bump this by +1 EVERY TIME you change the schema below."* This drives the pre-change safety backup in `migrate.js`.

### 4. Repository — `src/lib/db/repos/importedMessagesRepo.js`

**Purpose:** All CRUD + queries for imported messages. Follows `requestDetailsRepo.js` conventions: `getAdapter()`, positional params, `parseJson`/`stringifyJson` helpers.

**Function-by-function breakdown:**

| Function | Purpose | Returns |
|----------|---------|---------|
| `getImportedMessages(filter)` | Paginated list with filters (provider/model/status/source/conversationId) | `{ details, pagination, nextCursor }` |
| `insertImportedMessages(messages)` | Batch insert in a transaction, `INSERT OR IGNORE` | `{ imported, duplicates }` |
| `getImportedMessageById(id)` | Single row by id | row or undefined |
| `getUnknownModels()` | Grouped unknown models (provider null/unknown) | array of `{ model, count, firstSeen, lastSeen }` |
| `updateModelMapping(model, provider, canonicalModel)` | Backfill provider/model on all rows with a model name | `{ changes }` |
| `getRecentImports(since)` | Rows imported after a timestamp (for SSE live updates) | array of rows |

```javascript
// src/lib/db/repos/importedMessagesRepo.js
// SUGGESTION ONLY — review against actual codebase before implementing
import { getAdapter } from "../driver.js";
import { parseJson, stringifyJson } from "../helpers/jsonCol.js";

// ── Insert ────────────────────────────────────────────────────────────────
// Batch insert with INSERT OR IGNORE. Returns counts so the API can report
// { imported, duplicates } to the client.
export async function insertImportedMessages(messages) {
  const db = await getAdapter();
  const SQL = `
    INSERT OR IGNORE INTO imported_messages (
      id, imported_at, source, source_session_id, provider, model,
      model_match_confidence, status, latency_ms, prompt_tokens,
      completion_tokens, total_tokens, cost, request_json, response_json,
      error_message, error_category, conversation_id, source_app, metadata
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const tx = db.transaction((items) => {
    let imported = 0;
    for (const item of items) {
      const result = db.run(SQL, [
        item.id || `import-${crypto.randomUUID()}`,
        item.importedAt || new Date().toISOString(),
        item.source || "manual",
        item.sourceSessionId || null,
        item.provider || null,
        item.model || null,
        item.modelMatchConfidence ?? null,
        item.status || "success",
        item.latencyMs ?? null,
        item.promptTokens ?? null,
        item.completionTokens ?? null,
        item.totalTokens ?? null,
        item.cost ?? null,
        item.requestJson ? stringifyJson(item.requestJson) : null,
        item.responseJson ? stringifyJson(item.responseJson) : null,
        item.errorMessage || null,
        item.errorCategory || null,
        item.conversationId || null,
        item.sourceApp || null,
        item.metadata ? stringifyJson(item.metadata) : null,
      ]);
      if (result.changes > 0) imported++;
    }
    return imported;
  });

  const imported = tx(messages);
  return { imported, duplicates: messages.length - imported };
}

// ── Query ─────────────────────────────────────────────────────────────────
// Paginated list with filters. Mirrors getRequestDetails' shape so the
// Messages page can treat both sources uniformly.
export async function getImportedMessages(filter = {}) {
  const db = await getAdapter();
  const conds = [];
  const params = [];

  if (filter.provider) { conds.push("provider = ?"); params.push(filter.provider); }
  if (filter.model) { conds.push("model = ?"); params.push(filter.model); }
  if (filter.status) { conds.push("status = ?"); params.push(filter.status); }
  if (filter.source) { conds.push("source = ?"); params.push(filter.source); }
  if (filter.conversationId) { conds.push("conversation_id = ?"); params.push(filter.conversationId); }

  const where = conds.length ? `WHERE ${conds.join(" AND ")}` : "";
  const pageSize = filter.pageSize || 50;
  const page = filter.page || 1;
  const offset = (page - 1) * pageSize;

  const cntRow = db.get(`SELECT COUNT(*) as c FROM imported_messages ${where}`, params);
  const totalItems = cntRow ? cntRow.c : 0;

  const rows = db.all(
    `SELECT * FROM imported_messages ${where} ORDER BY imported_at DESC, id DESC LIMIT ? OFFSET ?`,
    [...params, pageSize, offset]
  );

  return {
    details: rows.map((r) => ({
      ...r,
      request: parseJson(r.request_json, null),
      response: parseJson(r.response_json, null),
      metadata: parseJson(r.metadata, null),
    })),
    pagination: {
      page, pageSize, totalItems,
      totalPages: Math.ceil(totalItems / pageSize),
      hasNext: page < Math.ceil(totalItems / pageSize),
      hasPrev: page > 1,
    },
  };
}

// ── Single row ────────────────────────────────────────────────────────────
export async function getImportedMessageById(id) {
  const db = await getAdapter();
  const row = db.get(`SELECT * FROM imported_messages WHERE id = ?`, [id]);
  if (!row) return null;
  return {
    ...row,
    request: parseJson(row.request_json, null),
    response: parseJson(row.response_json, null),
    metadata: parseJson(row.metadata, null),
  };
}

// ── Unknown models ────────────────────────────────────────────────────────
// Grouped by model name so the Unknown Models UI can show counts + first/last
// seen without scanning every row.
export async function getUnknownModels() {
  const db = await getAdapter();
  return db.all(`
    SELECT model, COUNT(*) as count, MIN(imported_at) as firstSeen, MAX(imported_at) as lastSeen
    FROM imported_messages
    WHERE provider IS NULL OR provider = 'unknown'
    GROUP BY model
    ORDER BY count DESC
  `);
}

// ── Model mapping backfill ────────────────────────────────────────────────
// After the user maps an unknown model to a provider, update ALL rows with
// that model name so historical records become attributed.
export async function updateModelMapping(model, provider, canonicalModel) {
  const db = await getAdapter();
  return db.run(
    `UPDATE imported_messages SET provider = ?, model = ?, model_match_confidence = 1.0 WHERE model = ?`,
    [provider, canonicalModel, model]
  );
}

// ── Recent imports (SSE live updates) ─────────────────────────────────────
export async function getRecentImports(sinceIso) {
  const db = await getAdapter();
  return db.all(
    `SELECT * FROM imported_messages WHERE imported_at > ? ORDER BY imported_at DESC LIMIT 100`,
    [sinceIso]
  );
}
```

**⚠️ GROUNDING FIX (original plan was wrong):** The original plan used `db.prepare(...)` with named `@param` objects. The adapter (`betterSqliteAdapter.js`) exposes `run/get/all/exec/transaction` — it does **not** expose `.prepare()`. The corrected code above uses `db.run(sql, params[])` with positional params, which is the real adapter API.

### 5. Unified view — `all_messages`

**Purpose:** Let the Messages page query native + imported in one statement.

**⚠️ GROUNDING FIX (original plan was wrong):** The original view selected `request_json, response_json, latency_ms, cost` from `requestDetails` — **those columns don't exist**. The real `requestDetails` has `data` (JSON blob) with `{ request, response, tokens, latency, cost, ... }` inside. The view must extract from `data` via JSON1:

```sql
CREATE VIEW IF NOT EXISTS all_messages AS
SELECT
  id, timestamp, provider, model, status,
  json_extract(data, '$.latency.total') AS latency_ms,
  json_extract(data, '$.tokens.prompt_tokens') AS prompt_tokens,
  json_extract(data, '$.tokens.completion_tokens') AS completion_tokens,
  json_extract(data, '$.tokens.total_tokens') AS total_tokens,
  json_extract(data, '$.cost') AS cost,
  data AS request_response_json,
  json_extract(data, '$.errorCategory') AS error_category,
  conversationId AS conversation_id,
  json_extract(data, '$.sourceApp') AS source_app,
  'native' AS source,
  1.0 AS model_match_confidence
FROM requestDetails
UNION ALL
SELECT
  id, imported_at AS timestamp, provider, model, status,
  latency_ms, prompt_tokens, completion_tokens, total_tokens, cost,
  json_object('request', request_json, 'response', response_json) AS request_response_json,
  error_category, conversation_id, source_app,
  source, model_match_confidence
FROM imported_messages;
```

**Why JSON1:** SQLite ships JSON1 by default in all four adapters (better-sqlite3, node:sqlite, bun:sqlite, sql.js). The existing code already uses `json_extract` in `requestDetailsRepo` (the M2 JSON-path query). This keeps the view correct without schema changes to `requestDetails`.

## Steps (per-part instructions)

### Step 1 — Create the migration file
1. Create `src/lib/db/migrations/005-imported-messages.js` with the content above.
2. **Verify:** `node -e "import('./src/lib/db/migrations/005-imported-messages.js').then(m => console.log(m.default.version, m.default.name))"` prints `5 imported-messages`.

### Step 2 — Register in migrations index
1. Add `import m005 from "./005-imported-messages.js";` to `src/lib/db/migrations/index.js`.
2. Add `m005` to the `MIGRATIONS` array.
3. **Verify:** `node -e "import('./src/lib/db/migrations/index.js').then(m => console.log(m.latestVersion()))"` prints `5`.

### Step 3 — Add to declarative schema + bump SCHEMA_VERSION
1. Add the `imported_messages` entry to `TABLES` in `src/lib/db/schema.js`.
2. Bump `SCHEMA_VERSION` from 3 → 4.
3. **Verify:** grep `SCHEMA_VERSION` shows `4`.

### Step 4 — Create the repository
1. Create `src/lib/db/repos/importedMessagesRepo.js` with the functions above.
2. **Verify:** `node -e "import('./src/lib/db/repos/importedMessagesRepo.js').then(m => console.log(Object.keys(m)))"` lists all 6 exported functions.

### Step 5 — Create the unified view
1. Add the `CREATE VIEW IF NOT EXISTS all_messages` SQL to the migration (after the table creation).
2. **Verify:** run the view SQL against a test DB; `SELECT COUNT(*) FROM all_messages` returns native + imported counts.

### Step 6 — Test
1. Insert 100 messages via `insertImportedMessages`.
2. Query with each filter (provider, model, status, source, conversationId).
3. Verify `getUnknownModels` groups correctly.
4. Verify `updateModelMapping` backfills.
5. Verify `all_messages` returns both sources.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|-----------|------|-----------|
| SQLite adapter | `.prepare()` not exposed | Use `db.run(sql, params)` only |
| Migration system | Version collision | Use version 5 (next free) |
| `requestDetails` schema | No `request_json` columns | Use JSON1 `json_extract` on `data` |
| `SCHEMA_VERSION` | Forgetting bump skips backup | Bump in same commit as schema change |

## Verification (commands)

```bash
# Migration applies
node -e "import('./src/lib/db/migrate.js').then(async m => { const { getAdapter } = await import('./src/lib/db/driver.js'); const db = await getAdapter(); console.log(db.all(\"SELECT name FROM sqlite_master WHERE type='table' AND name='imported_messages'\")); })"

# Insert + query round-trip
node -e "
import('./src/lib/db/repos/importedMessagesRepo.js').then(async (m) => {
  const r = await m.insertImportedMessages([{ model: 'gpt-4o', status: 'success', request: { messages: [{ role: 'user', content: 'hi' }] } }]);
  console.log('inserted:', r.imported, 'dupes:', r.duplicates);
  const q = await m.getImportedMessages({ model: 'gpt-4o' });
  console.log('found:', q.pagination.totalItems);
})"
```

## Note to Implementing Agents (READ FIRST)

The code above is a **starting point for review**, not a final implementation. Agents MUST review it against the actual codebase, decide if there is a better way, make those changes happen, verify by running, and update this plan.

The code above is a **starting point for review**, not a final implementation. Agents MUST review it against the actual codebase, decide if there is a better way, make those changes happen, verify by running, and update this plan.