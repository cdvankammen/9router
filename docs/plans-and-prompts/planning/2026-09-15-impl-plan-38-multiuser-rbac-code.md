# Implementation Plan 38 — Multi-User & RBAC — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #multiuser #rbac #auth #roles #quotas #audit #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (imports, function signatures, `src/dashboardGuard.js`, `src/lib/db/driver.js` `getAdapter()`, `src/lib/db/repos/settingsRepo.js` `DEFAULT_SETTINGS`, `JWT_SECRET`/`INITIAL_PASSWORD` env contract, `custom-server.js` IP derivation).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — run the app, create users, confirm RBAC enforcement + quotas + audit rows.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-38-multiuser-rbac.md`, `../research/9router/47-branch-9router-internal-threads.md` (multi-user details).

## Scope

**In scope:** user CRUD (create/update/disable); password auth with per-user sessions; RBAC roles (admin/operator/viewer) with permission matrix enforced in middleware + dashboard guard; per-user quotas (request/token/cost) enforced pre-routing; audit log of user actions with export.
**Out of scope:** SSO/OIDC (optional later); team/org hierarchy; per-user API keys (separate plan 24 synergy).

## Milestones

### M1 — User management + auth

**Reference code (`src/lib/db/repos/userRepo.js`):**

```js
import crypto from "node:crypto";
import { getAdapter } from "@/lib/db/driver.js";

export async function createUser({ username, password, role = "viewer", enabled = 1 }) {
  const db = await getAdapter();
  const id = crypto.randomUUID();
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  await db.run(
    `INSERT INTO users (id, username, password_hash, password_salt, role, enabled, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, username, hash, salt, role, enabled, new Date().toISOString()]
  );
  return getUser(id);
}

export async function verifyPassword(username, password) {
  const db = await getAdapter();
  const user = await db.get(`SELECT * FROM users WHERE username = ?`, username);
  if (!user || !user.enabled) return null;
  const hash = crypto.scryptSync(password, user.password_salt, 64).toString("hex");
  if (hash !== user.password_hash) return null;
  return user;
}

export async function getUser(id) {
  const db = await getAdapter();
  return db.get(`SELECT id, username, role, enabled, created_at FROM users WHERE id = ?`, id);
}
```

**Migration (`src/lib/db/migrations/20260915-users.js`):**

```js
export const up = async (db) => {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      password_salt TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'viewer',
      enabled INTEGER DEFAULT 1,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS user_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token_hash TEXT NOT NULL,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL
    );
  `);
};
export const down = async (db) => {
  await db.exec(`DROP TABLE IF EXISTS user_sessions; DROP TABLE IF EXISTS users;`);
};
```

**Acceptance criteria:** create/verify users; sessions issued; disabled users blocked.

### M2 — RBAC roles + enforcement

**Reference code (`src/lib/users/roles.js`):**

```js
export const ROLES = {
  admin:    { label: "Admin",    permissions: ["*"] },
  operator: { label: "Operator", permissions: ["routing.read", "routing.write", "usage.read", "webhooks.read", "webhooks.write"] },
  viewer:   { label: "Viewer",   permissions: ["routing.read", "usage.read"] },
};

export function hasPermission(role, permission) {
  const perms = ROLES[role]?.permissions ?? [];
  return perms.includes("*") || perms.includes(permission);
}
```

**Reference code (`src/dashboardGuard.js` additions) — RBAC middleware:**

```js
// After existing session check, attach role and enforce per-route permission.
// Route → permission map (example):
const ROUTE_PERMISSIONS = {
  "/dashboard/settings": "routing.write",
  "/dashboard/webhooks": "webhooks.write",
  "/dashboard/usage": "usage.read",
};
// If user.role lacks the permission for the route → 403.
```

**Acceptance criteria:** role matrix enforced; viewer cannot reach write routes; operator cannot reach admin-only routes.

### M3 — Per-user quotas

**Reference code (`src/lib/users/quotas.js`):**

```js
import { getAdapter } from "@/lib/db/driver.js";

// Quota row: { user_id, requests_per_day, tokens_per_day, cost_per_day }
export async function checkQuota(userId) {
  const db = await getAdapter();
  const quota = await db.get(`SELECT * FROM user_quotas WHERE user_id = ?`, userId);
  if (!quota) return { allowed: true };
  const today = new Date().toISOString().slice(0, 10);
  const usage = await db.get(
    `SELECT COUNT(*) as requests, SUM(total_tokens) as tokens, SUM(cost) as cost
     FROM usage_records WHERE user_id = ? AND date(created_at) = ?`,
    [userId, today]
  );
  const allowed =
    (!quota.requests_per_day || usage.requests < quota.requests_per_day) &&
    (!quota.tokens_per_day || usage.tokens < quota.tokens_per_day) &&
    (!quota.cost_per_day || usage.cost < quota.cost_per_day);
  return { allowed, usage, quota };
}

// Call in src/sse/handlers/chat.js before routing when a user session is present.
```

**Acceptance criteria:** quota exceeded → request rejected with clear error; quota visible to user.

### M4 — Audit log + API + dashboard + tests

**Reference code (`src/lib/users/audit.js`):**

```js
import { getAdapter } from "@/lib/db/driver.js";

export async function logAudit({ userId, action, target, detail }) {
  const db = await getAdapter();
  await db.run(
    `INSERT INTO audit_log (id, user_id, action, target, detail, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [crypto.randomUUID(), userId, action, target, JSON.stringify(detail ?? {}), new Date().toISOString()]
  );
}

export async function listAudit({ userId, action, limit = 100 } = {}) {
  const db = await getAdapter();
  const where = [];
  const params = { limit };
  if (userId) { where.push("user_id = @userId"); params.userId = userId; }
  if (action) { where.push("action = @action"); params.action = action; }
  const sql = `SELECT * FROM audit_log ${where.length ? "WHERE " + where.join(" AND ") : ""} ORDER BY created_at DESC LIMIT @limit`;
  return db.all(sql, params);
}
```

**Files touched:** `src/app/api/v1/users/route.js` (new: CRUD + quota + audit endpoints), dashboard users page (new: user table, role editor, quota editor, audit view), `tests/unit/rbac.test.js` (new: roles, quotas, audit).

**Acceptance criteria:** audit rows on login/config change/quota change; API + dashboard functional; tests pass.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Existing single-user auth | Breaking login | Keep INITIAL_PASSWORD bootstrap → first admin |
| Session security | Token theft | Hash tokens; expiry; JWT_SECRET |
| Role confusion | Over-permission | Permission tests per role |
| Quota complexity | User lockout | Clear errors; admin override |

## Verification

- Unit: roles, quotas, audit
- Manual: create users → login as each role → verify route access + quota rejection
- Regression: `tests/__baseline__/verify-no-regression.mjs`