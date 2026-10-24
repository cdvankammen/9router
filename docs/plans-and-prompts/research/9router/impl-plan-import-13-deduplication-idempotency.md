# Implementation Plan 13: Deduplication & Idempotency

**Date:** 2026-09-17
**Author:** GitHub Copilot agent (6-level binary tree expansion)
**Status:** active
**Tags:** implementation-plan, hermes-import, deduplication, idempotency, fingerprint

> ⚠️ **AGENT REVIEW NOTE (READ FIRST)**
> THIS PLAN IS A RESEARCH DOCUMENT — NOT AN IMPLEMENTATION INSTRUCTION.
> The code is a **SUGGESTION / OPTION** for future agents — NOT a final decision, NOT an instruction to implement anything.
> Code snippets show **possible approaches** (file paths, function signatures, patterns) — options, not requirements.
> **Nothing in this plan should be implemented automatically** — future agents must evaluate each suggestion, decide if there's a better way, and only then proceed.
> The agent is the final arbiter: if a better approach exists, make those changes happen.

## Source Research Branches

This plan implements options researched in:
- `../2026-09-17-hermes-import-branch-s-deduplication-idempotency.md` (primary — fingerprinting, idempotency keys, dedupe pipeline)
- `../2026-09-17-hermes-import-branch-c-error-reconstruction.md` (error fingerprint grouping)
- `../2026-09-17-hermes-import-branch-i-normalization-sanitization.md` (canonical form before hashing)

## Goal

Prevent duplicate imports across channels (hook + log tail + proxy) via content fingerprinting and idempotency keys. **This is a research artifact — code below is a suggestion for future agents, not an implementation.**

## Grounding (verified against the real codebase, 2026-09-17)

| Fact | Verified value |
|------|---------------|
| **Migration version 7 is TAKEN** | Plan 04 uses `007-import-sync-state` (version 7). Fingerprint migration must be LATER (e.g. `011-import-fingerprint`) |
| Adapter API | `db.run/get/all/exec` positional params — **no `.prepare()`** |
| `import_idempotency` table | **Does not exist** — needs its own migration (e.g. `012-import-idempotency`) |
| `INSERT OR IGNORE` | Already used in plan 01's `insertImportedMessages` — atomic dedupe by PK |
| Import API | Plan 03: `POST /api/messages/import` — dedupe hooks go here |

## Scope

- SHA-256 content fingerprint
- UNIQUE index on fingerprint
- Idempotency keys (client + batch)
- Duplicate reporting

## Design

### 1. Fingerprint Utility — `src/lib/import/fingerprint.js`

**Purpose:** Canonical JSON + SHA-256 content fingerprint.

```javascript
// src/lib/import/fingerprint.js
// SUGGESTION ONLY — review against actual codebase before implementing
import crypto from "node:crypto";

export function canonicalJson(obj) {
  if (obj === null || obj === undefined) return "";
  if (typeof obj !== "object") return String(obj);
  if (Array.isArray(obj)) return "[" + obj.map(canonicalJson).join(",") + "]";
  const keys = Object.keys(obj).sort();
  return "{" + keys.map((k) => JSON.stringify(k) + ":" + canonicalJson(obj[k])).join(",") + "}";
}

export function computeFingerprint(message) {
  // Canonicalize: request + response + model + 5-min time bucket
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

### 2. Migration: Fingerprint Column + Unique Index — `src/lib/db/migrations/011-import-fingerprint.js`

**Purpose:** Add `fingerprint` column + unique index. **Version 11** (5–10 taken).

```javascript
// src/lib/db/migrations/011-import-fingerprint.js
// SUGGESTION ONLY — review against actual codebase before implementing
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
      // Index may exist
    }
    console.log("[DB][migrate:011] fingerprint column + unique index added");
  },
};
```

### 3. Idempotency Keys — `src/lib/import/idempotency.js`

**Purpose:** Client + batch idempotency keys. **Positional params.**

**⚠️ GROUNDING FIX:** Original used `db.prepare(...).get/run(...)` — use `db.get(sql, params)` / `db.run(sql, params)`.

```javascript
// src/lib/import/idempotency.js
// SUGGESTION ONLY — review against actual codebase before implementing
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

### 4. Migration: `import_idempotency` table — `src/lib/db/migrations/012-import-idempotency.js`

**Purpose:** Store idempotency keys. **Version 12.**

```javascript
// src/lib/db/migrations/012-import-idempotency.js
// SUGGESTION ONLY — review against actual codebase before implementing
export default {
  version: 12,
  name: "import-idempotency",
  up(db) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS import_idempotency (
        key TEXT PRIMARY KEY,
        message_id TEXT NOT NULL,
        created_at TEXT NOT NULL
      )
    `);
    console.log("[DB][migrate:012] import_idempotency table created");
  },
};
```

### 5. Dedupe Pipeline (in import API) — `src/app/api/messages/import/route.js` (additions)

**Purpose:** Batch + per-message dedupe before insert.

```javascript
// src/app/api/messages/import/route.js (additions)
// SUGGESTION ONLY — review against actual codebase before implementing
import { computeFingerprint } from "@/lib/import/fingerprint.js";
import { checkIdempotencyKey, recordIdempotencyKey } from "@/lib/import/idempotency.js";

export async function POST(request) {
  // ... existing auth/validation ...

  const { messages, idempotencyKey, batchId, onDuplicate = "skip" } = await request.json();

  // Batch-level idempotency
  if (batchId) {
    const batchCheck = await checkIdempotencyKey(`batch:${batchId}`);
    if (batchCheck.duplicate) {
      return NextResponse.json({ imported: 0, duplicates: messages.length, skipped: 0, batchDuplicate: true });
    }
  }

  const results = { imported: 0, duplicates: 0, skipped: 0, errors: [] };
  const fingerprints = new Set();

  for (const msg of messages) {
    // Client idempotency key per message
    if (msg.idempotencyKey) {
      const check = await checkIdempotencyKey(msg.idempotencyKey);
      if (check.duplicate) {
        results.duplicates++;
        continue;
      }
    }

    // Content fingerprint
    const fp = computeFingerprint(msg);
    if (fingerprints.has(fp)) {
      results.duplicates++;
      continue;
    }
    fingerprints.add(fp);

    // Attach fingerprint for DB unique index
    msg.fingerprint = fp;

    // ... existing matching/enrichment ...
    // Insert with INSERT OR IGNORE (unique index on fingerprint)
    // If ignored → duplicate
  }

  // Record batch idempotency
  if (batchId) await recordIdempotencyKey(`batch:${batchId}`, "batch");

  return NextResponse.json(results);
}
```

## Steps (per-part instructions)

### Step 1 — Migration 011: fingerprint column + unique index
1. Create `src/lib/db/migrations/011-import-fingerprint.js`.
2. Register in `migrations/index.js`.
3. **Verify:** `latestVersion()` returns 11; `PRAGMA index_list(imported_messages)` shows `idx_imported_fingerprint`.

### Step 2 — `fingerprint.js` — canonical JSON + SHA-256
1. Create the file.
2. **Verify:** same message twice → same fingerprint; key order doesn't matter.

### Step 3 — `idempotency.js` — key check/record + table
1. Create `src/lib/import/idempotency.js` + migration `012-import-idempotency.js`.
2. Register migration.
3. **Verify:** `recordIdempotencyKey('k1','m1')` then `checkIdempotencyKey('k1')` → `{ duplicate: true }`.

### Step 4 — Wire into import API
1. Add the dedupe pipeline to the import route.
2. **Verify:** same message twice → second reports `duplicates: 1`.

### Step 5 — Response includes duplicate counts
1. Ensure response has `{ imported, duplicates, skipped, errors }`.
2. **Verify:** curl shows duplicate counts.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|-----------|------|-----------|
| Unique index | Race condition on concurrent imports | INSERT OR IGNORE is atomic |
| Canonical JSON | Performance on large payloads | Truncate request/response before fingerprint |
| Time bucket | Clock skew | Use 5-min bucket; fingerprint excludes raw timestamp |

## Verification (commands)

```bash
node -e "import('./src/lib/import/fingerprint.js').then(m => {
  const a = { request: { messages: [{ role: 'user', content: 'hi' }] }, response: { choices: [{ message: { content: 'hello' } }] }, model: 'gpt-4o', timestamp: '2026-09-17T00:00:00Z' };
  const b = { response: { choices: [{ message: { content: 'hello' } }] }, model: 'gpt-4o', request: { messages: [{ role: 'user', content: 'hi' }] }, timestamp: '2026-09-17T00:02:00Z' };
  console.log(m.computeFingerprint(a) === m.computeFingerprint(b)); // true (key order + 5-min bucket)
})"
```

## Note to Implementing Agents (READ FIRST)

The code above is a **starting point for review**, not a final implementation. Agents MUST review it against the actual codebase, decide if there is a better way, make those changes happen, verify by running, and update this plan.