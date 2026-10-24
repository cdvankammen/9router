# Implementation Plan 10: Multi-Tenant & Multi-User Import

**Date:** 2026-09-17
**Author:** GitHub Copilot agent (6-level binary tree expansion)
**Status:** active
**Tags:** implementation-plan, hermes-import, multi-tenant, multi-user

> ⚠️ **AGENT REVIEW NOTE (READ FIRST)**
> THIS PLAN IS A RESEARCH DOCUMENT — NOT AN IMPLEMENTATION INSTRUCTION.
> The code is a **SUGGESTION / OPTION** for future agents — NOT a final decision, NOT an instruction to implement anything.
> Code snippets show **possible approaches** (file paths, function signatures, patterns) — options, not requirements.
> **Nothing in this plan should be implemented automatically** — future agents must evaluate each suggestion, decide if there's a better way, and only then proceed.
> The agent is the final arbiter: if a better approach exists, make those changes happen.

## Source Research Branches

This plan implements options researched in:
- `../2026-09-17-hermes-import-branch-p-multi-tenant.md` (primary — tenancy model, key scoping, scoped queries)
- `../2026-09-17-hermes-import-branch-l-security-privacy.md` (key hashing at rest, app-level access control)

## Goal

Support importing messages for multiple users/machines/workspaces with attribution and access control. **This is a research artifact — code below is a suggestion for future agents, not an implementation.**

## Grounding (verified against the real codebase, 2026-09-17)

| Fact | Verified value |
|------|---------------|
| **Migration version 5 is TAKEN** | Plan 01 uses `005-imported-messages` (version 5). Tenant columns must be a LATER version (e.g. `008-import-tenants`) |
| Migration format | `export default { version, name, up(db) }` — `db.exec()` for DDL |
| Adapter API | `db.run/get/all/exec` positional params — **no `.prepare()`, no named `@param` objects** |
| Import API auth | Plan 03: `x-api-key` header, timing-safe compare against `IMPORT_API_KEY` |
| Auth system | Dashboard uses JWT cookie (`auth_token`) + `verifyDashboardAuthToken` (see `src/app/api/version/update/route.js`) |
| SQLite RLS | **None** — tenant isolation must be app-level WHERE clauses |

## Scope

- Tenant columns on `imported_messages`
- Per-tenant import API keys
- User-scoped queries
- Attribution dimensions

## Design

### 1. Migration (additive columns) — `src/lib/db/migrations/008-import-tenants.js`

**Purpose:** Add tenant columns + `import_keys` table. **Version 8** (5–7 are taken by plans 01/02/04).

**⚠️ GROUNDING FIXES (original plan was wrong):**
1. Used version 5 + filename `005-import-tenants` — **collides with plan 01's `005-imported-messages`**. Use version 8.
2. `db.exec` is correct for DDL — kept.

```javascript
// src/lib/db/migrations/008-import-tenants.js
// SUGGESTION ONLY — review against actual codebase before implementing
export default {
  version: 8,
  name: "import-tenants",
  up(db) {
    // Additive columns — safe via ALTER TABLE
    const cols = [
      ["user_id", "TEXT"],
      ["machine_id", "TEXT"],
      ["workspace_id", "TEXT"],
      ["agent_name", "TEXT"],
      ["agent_version", "TEXT"],
      ["visibility", "TEXT DEFAULT 'private'"],
    ];
    for (const [name, def] of cols) {
      try {
        db.exec(`ALTER TABLE imported_messages ADD COLUMN ${name} ${def}`);
      } catch (e) {
        // Column may already exist (idempotent)
        if (!e.message.includes("duplicate column")) throw e;
      }
    }
    db.exec(`CREATE INDEX IF NOT EXISTS idx_imported_user ON imported_messages(user_id)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_imported_machine ON imported_messages(machine_id)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_imported_workspace ON imported_messages(workspace_id)`);

    db.exec(`
      CREATE TABLE IF NOT EXISTS import_keys (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        label TEXT,
        key_hash TEXT NOT NULL UNIQUE,
        created_at TEXT NOT NULL,
        is_active INTEGER NOT NULL DEFAULT 1
      )
    `);
    console.log("[DB][migrate:008] import tenant columns + import_keys table created");
  },
};
```

### 2. Tenant-Scoped Repo Queries — `src/lib/db/repos/importedMessagesRepo.js` (additions)

**Purpose:** Query with tenant enforcement. **Positional params only** (adapter API).

**⚠️ GROUNDING FIX:** Original used `db.prepare(...).get(params)` with named `@param` objects — adapter has no `.prepare()`. Use `db.all(sql, params[])` with positional `?`.

```javascript
// src/lib/db/repos/importedMessagesRepo.js (additions)
// SUGGESTION ONLY — review against actual codebase before implementing
export async function getImportedMessagesScoped(filter = {}, tenant = {}) {
  const db = await getAdapter();
  const { page = 1, pageSize = 50, provider, model, status, source, userId, machineId, workspaceId } = filter;
  const offset = (page - 1) * pageSize;

  const conditions = [];
  const params = [];
  if (provider) { conditions.push("provider = ?"); params.push(provider); }
  if (model) { conditions.push("model = ?"); params.push(model); }
  if (status) { conditions.push("status = ?"); params.push(status); }
  if (source) { conditions.push("source = ?"); params.push(source); }
  if (userId) { conditions.push("user_id = ?"); params.push(userId); }
  if (machineId) { conditions.push("machine_id = ?"); params.push(machineId); }
  if (workspaceId) { conditions.push("workspace_id = ?"); params.push(workspaceId); }

  // Tenant enforcement: if the caller has a tenant scope, always apply it
  if (tenant.userId) {
    conditions.push("(user_id = ? OR visibility = 'shared')");
    params.push(tenant.userId);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const cntRow = db.get(`SELECT COUNT(*) as c FROM imported_messages ${where}`, params);
  const total = cntRow ? cntRow.c : 0;
  const rows = db.all(
    `SELECT * FROM imported_messages ${where} ORDER BY imported_at DESC LIMIT ? OFFSET ?`,
    [...params, pageSize, offset]
  );

  return { details: rows, pagination: { page, pageSize, totalItems: total, totalPages: Math.ceil(total / pageSize) } };
}
```

### 3. Per-User Import Keys — `src/lib/import/tenantKeys.js`

**Purpose:** Issue per-user API keys (hashed at rest, plaintext shown once).

**⚠️ GROUNDING FIX:** Original used `db.prepare(...).run(...)` — use `db.run(sql, params[])`. Also `crypto` must be imported (`node:crypto`).

```javascript
// src/lib/import/tenantKeys.js
// SUGGESTION ONLY — review against actual codebase before implementing
import crypto from "node:crypto";
import { getAdapter } from "@/lib/db/driver.js";

export async function createImportKey(userId, label) {
  const db = await getAdapter();
  const key = `imk_${crypto.randomBytes(24).toString("hex")}`;
  const keyHash = crypto.createHash("sha256").update(key).digest("hex");
  db.run(`
    INSERT INTO import_keys (id, user_id, label, key_hash, created_at, is_active)
    VALUES (?, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%fZ','now'), 1)
  `, [crypto.randomUUID(), userId, label, keyHash]);
  return key; // plaintext only returned once
}

export async function resolveImportKey(key) {
  const db = await getAdapter();
  const keyHash = crypto.createHash("sha256").update(key).digest("hex");
  return db.get(`SELECT * FROM import_keys WHERE key_hash = ? AND is_active = 1`, [keyHash]);
}
```

### 4. Import API Tenant Enforcement — `src/app/api/messages/import/route.js` (addition)

**Purpose:** Resolve the API key to a user, stamp messages with `userId`, reject mismatches.

```javascript
// src/app/api/messages/import/route.js (addition to POST handler)
// SUGGESTION ONLY — review against actual codebase before implementing
// import { resolveImportKey } from "@/lib/import/tenantKeys.js";
//
// In the POST handler, before processing:
// const apiKey = request.headers.get("x-api-key");
// const keyRecord = await resolveImportKey(apiKey);
// if (!keyRecord) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
// if (payload.userId && payload.userId !== keyRecord.user_id) {
//   return NextResponse.json({ error: "TENANT_MISMATCH" }, { status: 403 });
// }
// // Stamp tenant on each message:
// for (const msg of payload.messages) {
//   msg.userId = keyRecord.user_id;
// }
```

## Steps (per-part instructions)

### Step 1 — Migration 008: tenant columns + `import_keys` table
1. Create `src/lib/db/migrations/008-import-tenants.js`.
2. Register in `migrations/index.js`.
3. **Verify:** `latestVersion()` returns 8; `PRAGMA table_info(imported_messages)` shows `user_id`, `machine_id`, `workspace_id`, `agent_name`, `agent_version`, `visibility`.

### Step 2 — `tenantKeys.js` — key create/resolve
1. Create `src/lib/import/tenantKeys.js`.
2. **Verify:** `createImportKey('user-1', 'test')` returns `imk_...`; `resolveImportKey(key)` returns the record; plaintext key not stored.

### Step 3 — Repo scoped queries
1. Add `getImportedMessagesScoped` to `importedMessagesRepo.js`.
2. **Verify:** with `tenant.userId='user-1'`, only user-1 + shared rows return.

### Step 4 — Import API tenant enforcement
1. Wire `resolveImportKey` into the import route.
2. **Verify:** import with valid key stamps `userId`; mismatched payload `userId` → 403.

### Step 5 — UI user filter (if multi-user)
1. Add a user filter to the Messages page (plan 08).
2. **Verify:** filter shows only that user's imports.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|-----------|------|-----------|
| Auth system | Existing session auth may not map to tenants | Reuse session user id |
| Key storage | Plaintext key exposure | Hash at rest, show once |
| Row-level security | SQLite has no RLS | App-level WHERE enforcement |

## Verification (commands)

```bash
# Two users import; each sees only their own messages
node -e "
import('./src/lib/import/tenantKeys.js').then(async (m) => {
  const k1 = await m.createImportKey('user-1', 'a');
  const k2 = await m.createImportKey('user-2', 'b');
  console.log('key1:', k1.slice(0, 8) + '...', 'key2:', k2.slice(0, 8) + '...');
  console.log('resolve k1 →', (await m.resolveImportKey(k1)).user_id);
})"
# Expect: resolve k1 → user-1
```

## Note to Implementing Agents (READ FIRST)

The code above is a **starting point for review**, not a final implementation. Agents MUST review it against the actual codebase, decide if there is a better way, make those changes happen, verify by running, and update this plan.