# Implementation Plan Import-01 — Imported Messages DB Schema — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #hermes-import #database #schema #migration #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (migration format from `src/lib/db/migrations/003-message-facets.js`; migration registry from `src/lib/db/migrations/index.js`; adapter API from `src/lib/db/adapters/betterSqliteAdapter.js`; `requestDetails` schema from `src/lib/db/schema.js`; repo pattern from `requestDetailsRepo.js`).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — migration; schema; repo.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-import-01-db-schema.md`, `../research/9router/impl-plan-import-02-provider-matching.md`, `../research/9router/impl-plan-import-03-import-api.md`.

## Scope

**In scope:** `imported_messages` table (declarative in `TABLES` + versioned migration); indexes; `importedMessagesRepo.js`; `all_messages` UNION view.
**Out of scope:** provider matching (import-02); import API (import-03).

## Milestones

### M1 — Migration file

**Reference code (`src/lib/db/migrations/005-imported-messages.js`):**

```js
// Follows the exact 003-message-facets.js format: default export with version, name, up(db).
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

**Acceptance criteria:** migration runs; table + indexes created; version 5 registered.

### M2 — Register migration + declarative schema

**Reference code (`src/lib/db/migrations/index.js` + `src/lib/db/schema.js`):**

```js
// src/lib/db/migrations/index.js (addition)
import m005 from "./005-imported-messages.js";
export const MIGRATIONS = [m001, m002, m003, m004, m005].sort((a, b) => a.version - b.version);

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
  indexes: ["provider", "model", "status", "imported_at", "conversation_id", "source"],
},
```

**Acceptance criteria:** migration registered; `TABLES` includes `imported_messages`; `SCHEMA_VERSION` bumped +1.

### M3 — Repository

**Reference code (`src/lib/db/repos/importedMessagesRepo.js`):**

```js
import { getAdapter } from "../driver.js";
import { parseJson, stringifyJson } from "../helpers/jsonCol.js";

// Insert imported messages (batch).
export async function insertImportedMessages(messages = []) {
  const db = getAdapter();
  const tx = db.transaction((rows) => {
    for (const m of rows) {
      db.run(
        `INSERT OR IGNORE INTO imported_messages
         (id, imported_at, source, source_session_id, provider, model, model_match_confidence,
          status, latency_ms, prompt_tokens, completion_tokens, total_tokens, cost,
          request_json, response_json, error_message, error_category, conversation_id, source_app, metadata)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          m.id ?? crypto.randomUUID(),
          m.imported_at ?? new Date().toISOString(),
          m.source ?? "manual",
          m.source_session_id ?? null,
          m.provider ?? null,
          m.model ?? null,
          m.model_match_confidence ?? null,
          m.status ?? "unknown",
          m.latency_ms ?? null,
          m.prompt_tokens ?? null,
          m.completion_tokens ?? null,
          m.total_tokens ?? null,
          m.cost ?? null,
          stringifyJson(m.request),
          stringifyJson(m.response),
          m.error_message ?? null,
          m.error_category ?? null,
          m.conversation_id ?? null,
          m.source_app ?? null,
          stringifyJson(m.metadata),
        ],
      );
    }
  });
  tx(messages);
  return messages.length;
}

// Keyset pagination (timestamp DESC, id DESC) — mirrors getRequestDetails.
export async function getImportedMessages({ limit = 50, cursor = null } = {}) {
  const db = getAdapter();
  const params = [limit + 1];
  let where = "";
  if (cursor) {
    const [ts, id] = Buffer.from(cursor, "base64url").toString("utf8").split("|");
    where = "WHERE (imported_at, id) < (?, ?)";
    params.unshift(ts, id);
  }
  const rows = db.all(
    `SELECT * FROM imported_messages ${where} ORDER BY imported_at DESC, id DESC LIMIT ?`,
    params,
  );
  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const last = page[page.length - 1];
  return {
    items: page.map((r) => ({ ...r, request: parseJson(r.request_json), response: parseJson(r.response_json), metadata: parseJson(r.metadata) })),
    nextCursor: hasMore && last ? Buffer.from(`${last.imported_at}|${last.id}`).toString("base64url") : null,
  };
}
```

**Acceptance criteria:** batch insert; keyset pagination; JSON columns parsed.

### M4 — UNION view + tests

**Reference code (`src/lib/db/repos/importedMessagesRepo.js` addition):**

```js
// all_messages UNION view: native + imported.
export async function getAllMessages({ limit = 50, cursor = null } = {}) {
  const db = getAdapter();
  const rows = db.all(
    `SELECT id, timestamp AS ts, provider, model, status, data FROM requestDetails
     UNION ALL
     SELECT id, imported_at AS ts, provider, model, status, request_json AS data FROM imported_messages
     ORDER BY ts DESC LIMIT ?`,
    [limit],
  );
  return rows;
}
```

**Files touched:** `src/lib/db/migrations/005-imported-messages.js` (new), `src/lib/db/migrations/index.js` (register), `src/lib/db/schema.js` (TABLES + SCHEMA_VERSION), `src/lib/db/repos/importedMessagesRepo.js` (new), `src/lib/db/index.js` (export repo), `tests/unit/imported-messages.test.js` (new).

**Acceptance criteria:** view works; repo exported; tests pass.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Migration ordering | Version conflicts | Sort by version |
| Schema drift | Missing columns | Declarative TABLES |
| JSON blobs | Parse errors | parseJson fallback |
| Large imports | Slow inserts | Batch transaction |

## Verification

- Unit: insertImportedMessages, getImportedMessages, getAllMessages
- Manual: run migration → insert → paginate
- Regression: `tests/__baseline__/verify-no-regression.mjs`