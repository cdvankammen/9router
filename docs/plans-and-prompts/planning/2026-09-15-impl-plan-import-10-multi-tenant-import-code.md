# Implementation Plan Import-10 — Multi-Tenant & Multi-User Import — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #hermes-import #multi-tenant #multi-user #attribution #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (**migration version 5 is TAKEN** by plan import-01 — tenant columns must be a LATER version e.g. `008-import-tenants`; migration format `export default { version, name, up(db) }`; adapter API `db.run/get/all/exec` positional params — **no `.prepare()`, no named `@param` objects**; import API auth from plan import-03; dashboard auth via JWT cookie `auth_token` + `verifyDashboardAuthToken`; **SQLite RLS: none** — tenant isolation must be app-level WHERE clauses).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — migration; scoped queries; keys.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-import-10-multi-tenant-import.md`, `../research/9router/impl-plan-import-01-db-schema.md`, `../research/9router/impl-plan-import-03-import-api.md`.

## Scope

**In scope:** tenant columns on `imported_messages`; per-tenant import API keys; user-scoped queries; attribution dimensions.
**Out of scope:** import API (import-03); deduplication (import-13).

## Milestones

### M1 — Tenant migration

**Reference code (`src/lib/db/migrations/008-import-tenants.js`):**

```js
// Version 8 (5–7 are taken by plans import-01/02/04).
export default {
  version: 8,
  name: "import-tenants",
  up(db) {
    // Additive columns — safe via ALTER TABLE.
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
        // Column may already exist (idempotent).
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

**Acceptance criteria:** columns added; indexes; import_keys table.

### M2 — Tenant-scoped repo queries

**Reference code (`src/lib/db/repos/importedMessagesRepo.js` additions):**

```js
// Positional params only (adapter API).
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

  // Tenant enforcement: if the caller has a tenant scope, always apply it.
  if (tenant.userId) {
    conditions.push("(user_id = ? OR visibility = 'shared')");
    params.push(tenant.userId);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const rows = db.all(`SELECT * FROM imported_messages ${where} ORDER BY imported_at DESC LIMIT ? OFFSET ?`, [...params, pageSize, offset]);
  const total = db.get(`SELECT COUNT(*) AS n FROM imported_messages ${where}`, params)?.n ?? 0;
  return { items: rows, pagination: { page, pageSize, total, pages: Math.ceil(total / pageSize) } };
}
```

**Acceptance criteria:** scoped queries; tenant WHERE; pagination.

### M3 — Per-tenant import keys

**Reference code (`src/lib/import/tenantKeys.js`):**

```js
import crypto from "node:crypto";
import { getAdapter } from "@/lib/db/driver.js";

// Create a per-tenant import key.
export async function createImportKey({ userId, label = "default" } = {}) {
  const db = await getAdapter();
  const raw = crypto.randomBytes(24).toString("base64url");
  const hash = crypto.createHash("sha256").update(raw).digest("hex");
  db.run(`INSERT INTO import_keys (id, user_id, label, key_hash, created_at) VALUES (?, ?, ?, ?, ?)`,
    [crypto.randomUUID(), userId, label, hash, new Date().toISOString()]);
  return { id: crypto.randomUUID(), raw }; // raw shown once
}

// Resolve a key to a tenant.
export async function resolveImportKey(rawKey) {
  const db = await getAdapter();
  const hash = crypto.createHash("sha256").update(rawKey).digest("hex");
  const row = db.get(`SELECT user_id FROM import_keys WHERE key_hash = ? AND is_active = 1`, [hash]);
  return row?.user_id ?? null;
}
```

**Acceptance criteria:** key creation; hash storage; resolution.

### M4 — Integration + tests

**Reference code (`src/app/api/messages/import/route.js` addition):**

```js
// In POST: resolve tenant from key, attach to messages.
import { resolveImportKey } from "@/lib/import/tenantKeys.js";

// After auth check:
const rawKey = request.headers.get("x-api-key") || "";
const tenantUserId = await resolveImportKey(rawKey);
// ...attach tenantUserId to each message before insert.
```

**Files touched:** `src/lib/db/migrations/008-import-tenants.js` (new), `src/lib/db/repos/importedMessagesRepo.js` (scoped queries), `src/lib/import/tenantKeys.js` (new), `src/app/api/messages/import/route.js` (tenant attach), `tests/unit/import-tenants.test.js` (new).

**Acceptance criteria:** integration; tests pass.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Version collision | Migration conflict | Version 8 |
| No RLS | Tenant leakage | App-level WHERE |
| Key leakage | Unauthorized imports | Hash storage |
| Visibility confusion | Wrong scope | Explicit defaults |

## Verification

- Unit: getImportedMessagesScoped, createImportKey, resolveImportKey
- Manual: create key → import → scope query
- Regression: `tests/__baseline__/verify-no-regression.mjs`