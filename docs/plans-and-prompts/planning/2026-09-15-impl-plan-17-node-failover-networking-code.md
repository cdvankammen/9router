# Implementation Plan 17 — Node Failover & Networking — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #failover #ha #networking #health-check #session-persistence #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (imports, function signatures, `src/lib/db/repos/nodesRepo.js`, `src/lib/db/repos/sessionsRepo.js` existence, `cli/` packaging, `custom-server.js`).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — run the app, simulate failover, confirm acceptance criteria.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-17-node-failover-networking.md`, `../research/9router/24-ha-mini-backup-nodes.md`, `../research/9router/28c-failover-session-command-log.md`

## Scope

**In scope:** primary+backup HA; health checks; promotion/demotion; socket reuse + connection pooling; dynamic ports; crash-loop exponential backoff; session persistence + restore + command log.
**Out of scope:** multi-region; consensus protocol (quorum via DB).

## Milestones

### M1 — Health checks + node state

**Reference code (`src/lib/failover/health.js`):**

```js
import { getAdapter } from "@/lib/db/driver.js";

// Node states: primary | backup | promoted | demoted | offline
export async function heartbeat(nodeId, { role, status }) {
  const db = await getAdapter();
  await db.run(`
    INSERT INTO nodes (id, role, status, last_heartbeat, updated_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      role = excluded.role, status = excluded.status,
      last_heartbeat = excluded.last_heartbeat, updated_at = excluded.updated_at
  `, [nodeId, role, status, Date.now(), Date.now()]);
}

export async function checkHealth(nodeId) {
  const db = await getAdapter();
  const row = await db.get(`SELECT * FROM nodes WHERE id = ?`, [nodeId]);
  if (!row) return { healthy: false, reason: "unknown node" };
  const stale = Date.now() - row.last_heartbeat > 30_000; // 30s heartbeat window
  return { healthy: !stale && row.status !== "offline", stale, role: row.role };
}
```

**Acceptance criteria:** heartbeats recorded; staleness detection; health check API.

### M2 — Promotion/demotion + failover

**Reference code (`src/lib/failover/failover.js`):**

```js
// Promote backup when primary unhealthy; demote when primary recovers.
export async function evaluateFailover(db) {
  const nodes = await db.all(`SELECT * FROM nodes`);
  const primary = nodes.find((n) => n.role === "primary");
  const backups = nodes.filter((n) => n.role === "backup");

  if (primary && !isHealthy(primary)) {
    const candidate = backups.sort((a, b) => b.last_heartbeat - a.last_heartbeat)[0];
    if (candidate) {
      await db.run(`UPDATE nodes SET role = 'primary', status = 'promoted' WHERE id = ?`, [candidate.id]);
      await db.run(`UPDATE nodes SET role = 'backup', status = 'demoted' WHERE id = ?`, [primary.id]);
      return { promoted: candidate.id, demoted: primary.id };
    }
  }
  return null;
}

function isHealthy(node) {
  return Date.now() - node.last_heartbeat < 30_000 && node.status !== "offline";
}
```

**Acceptance criteria:** promotion on primary loss; demotion on recovery; no split-brain (single writer via DB lock).

### M3 — Networking: socket reuse, pooling, dynamic ports

**Reference code (`src/lib/failover/networking.js`):**

```js
// Socket reuse: SO_REUSEADDR for fast restart.
import { createServer } from "node:net";

export function createReusableServer(handler) {
  const server = createServer(handler);
  server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      // Dynamic port fallback: try next port
      const port = server.address().port + 1;
      server.listen(port);
    }
  });
  return server;
}

// Connection pooling for upstream providers.
export class ConnectionPool {
  constructor({ max = 10, ttlMs = 60_000 } = {}) {
    this.max = max;
    this.ttlMs = ttlMs;
    this.connections = new Map(); // host -> [{conn, lastUsed}]
  }

  async acquire(host, factory) {
    const list = this.connections.get(host) ?? [];
    const now = Date.now();
    const fresh = list.filter((c) => now - c.lastUsed < this.ttlMs);
    if (fresh.length) {
      const conn = fresh.pop();
      conn.lastUsed = now;
      this.connections.set(host, fresh);
      return conn.conn;
    }
    const conn = await factory();
    this.connections.set(host, [...fresh, { conn, lastUsed: now }]);
    return conn;
  }
}
```

**Acceptance criteria:** port conflicts handled; pooling works; crash-loop backoff (from plan 09).

### M4 — Session persistence + restore + tests

**Reference code (`src/lib/db/repos/sessionRepo.js`):**

```js
// Sessions persist across failover; command log enables replay.
export async function saveSession(session) {
  const db = await getAdapter();
  await db.run(`
    INSERT INTO sessions (id, status, state, command_log, updated_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      status = excluded.status, state = excluded.state,
      command_log = excluded.command_log, updated_at = excluded.updated_at
  `, [session.id, session.status, JSON.stringify(session.state), JSON.stringify(session.commandLog ?? []), Date.now()]);
}

export async function restoreSessions() {
  const db = await getAdapter();
  const rows = await db.all(`SELECT * FROM sessions WHERE status = 'active'`);
  return rows.map((r) => ({ ...r, state: JSON.parse(r.state), commandLog: JSON.parse(r.command_log) }));
}
```

**Files touched:** `tests/unit/failover.test.js` (new); `cli/` packaging for backup node mode.

**Acceptance criteria:** sessions restore after failover; command log replay; tests pass.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Split-brain | DB-lock single writer |
| Heartbeat network | Local network; UDP optional |
| Session state size | Command log truncation |
| Port conflicts | Dynamic port fallback |

## Verification

- Unit: health, promotion, pooling, session restore
- Manual: kill primary → verify promotion + session restore
- Regression: `tests/__baseline__/verify-no-regression.mjs`