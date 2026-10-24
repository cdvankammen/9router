# Implementation Plan Import-13 — Deduplication & Idempotency — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #hermes-import #deduplication #idempotency #fingerprint #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (**migration version 7 is TAKEN** by plan import-04 — fingerprint migration must be LATER e.g. `011-import-fingerprint`; adapter API `db.run/get/all/exec` positional params — **no `.prepare()`**; `import_idempotency` table **does not exist** — needs its own migration e.g. `012-import-idempotency`; `INSERT OR IGNORE` already used in plan import-01's `insertImportedMessages` — atomic dedupe by PK; import API from plan import-03 — dedupe hooks go here).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — fingerprint; idempotency; dedupe.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-import-13-deduplication-idempotency.md`, `../research/9router/impl-plan-import-01-db-schema.md`, `../research/9router/impl-plan-import-03-import-api.md`.

## Scope

**In scope:** SHA-256 content fingerprint; UNIQUE index on fingerprint; idempotency keys (client + batch); duplicate reporting.
**Out of scope:** import API (import-03); retention (import-12).

## Milestones

### M1 — Fingerprint utility

**Reference code (`src/lib/import/fingerprint.js`):**

```js
import crypto from "node:crypto";

export function canonicalJson(obj) {
  if (obj === null || obj === undefined) return "";
  if (typeof obj !== "object") return String(obj);
  if (Array.isArray(obj)) return "[" + obj.map(canonicalJson).join(",") + "]";
  const keys = Object.keys(obj).sort();
  return "{" + keys.map((k) => JSON.stringify(k) + ":" + canonicalJson(obj[k])).join(",") + "}";
}

export function computeFingerprint(message) {
  // Canonicalize: request + response + model + 5-min time bucket.
  const timeBucket = Math.floor((new Date(message.timestamp || Date.now()).getTime()) / 300_000);
  const parts = [
    canonicalJson(message.request),
    canonicalJson(message.response),
    (message.model || "").toLowerCase(),
    String(timeBucket),
  ];
  return crypto.createHash("sha256").update(parts.join("|")).digest("hex").slice(0, 16);
}
```

**Acceptance criteria:** canonical JSON; stable fingerprint.

### M2 — Fingerprint migration

**Reference code (`src/lib/db/migrations/011-import-fingerprint.js`):**

```js
// Version 11 (5–10 taken).
export default {
  version: 11,
  name: "import-fingerprint",
  up(db) {
    try {
      db.exec(`ALTER TABLE imported_messages ADD COLUMN fingerprint TEXT`);
    } catch (e) {
      if (!e.message.includes("duplicate column")) throw e;
    }
    try {
      db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_imported_fingerprint ON imported_messages(fingerprint)`);
    } catch (e) {
      // Index may exist.
    }
    console.log("[DB][migrate:011] fingerprint column + unique index added");
  },
};
```

**Acceptance criteria:** column; unique index; idempotent.

### M3 — Idempotency keys

**Reference code (`src/lib/import/idempotency.js`):**

```js
import { getAdapter } from "@/lib/db/driver.js";

export async function checkIdempotencyKey(key) {
  const db = await getAdapter();
  const row = db.get("SELECT id FROM import_idempotency WHERE key = ?", [key]);
  return row ? { duplicate: true, existingId: row.id } : { duplicate: false };
}

export async function recordIdempotencyKey(key, messageId) {
  const db = await getAdapter();
  db.run(`
    INSERT OR IGNORE INTO import_idempotency (key, message_id, created_at)
    VALUES (?, ?, strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  `, [key, messageId]);
}
```

**Acceptance criteria:** check; record; INSERT OR IGNORE.

### M4 — Idempotency migration + tests

**Reference code (`src/lib/db/migrations/012-import-idempotency.js`):**

```js
export default {
  version: 12,
  name: "import-idempotency",
  up(db) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS import_idempotency (
        key TEXT PRIMARY KEY,
        message_id TEXT,
        created_at TEXT NOT NULL
      )
    `);
    console.log("[DB][migrate:012] import_idempotency table created");
  },
};
```

**Files touched:** `src/lib/import/fingerprint.js` (new), `src/lib/import/idempotency.js` (new), `src/lib/db/migrations/011-import-fingerprint.js` (new), `src/lib/db/migrations/012-import-idempotency.js` (new), `src/app/api/messages/import/route.js` (dedupe hooks), `tests/unit/import-dedupe.test.js` (new).

**Acceptance criteria:** migration; tests pass.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Version collision | Migration conflict | Versions 11–12 |
| Fingerprint collisions | Wrong dedupe | Full hash |
| Key reuse | False duplicates | Client-scoped keys |
| Unique index failures | Insert errors | INSERT OR IGNORE |

## Verification

- Unit: canonicalJson, computeFingerprint, checkIdempotencyKey, recordIdempotencyKey
- Manual: import twice → verify dedupe
- Regression: `tests/__baseline__/verify-no-regression.mjs`