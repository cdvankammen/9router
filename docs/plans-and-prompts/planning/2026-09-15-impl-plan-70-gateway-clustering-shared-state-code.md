# Implementation Plan 70 — Gateway Clustering & Shared State — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #clustering #shared-state #leader-election #locks #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (SQLite adapter chain in `src/lib/db/driver.js`; `custom-server.js` startup; cloud sync from plan 25; Docker deployment from plan 41; load testing from plan 60).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — run two instances against one shared DB; confirm leader election, lock exclusion, usage aggregation.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-70-gateway-clustering-shared-state.md`, `../research/9router/impl-plan-41-docker-deployment.md`, `../research/9router/impl-plan-25-cloud-sync.md`.

## Scope

**In scope:** shared state (config, usage, locks) via shared SQLite file (WAL) with optional Redis; coordination (leader election for config writes, distributed locks for exclusive ops, heartbeats); consistency (strong for config via leader, eventual for usage); instance management (register/deregister, health, telemetry).
**Out of scope:** Redis-required operation (SQLite-first; Redis optional); multi-region replication.

## Milestones

### M1 — Shared state + instance registry

**Reference code (migration `src/lib/db/migrations/20260915-cluster.js` + repo):**

```js
export const up = (db) => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS cluster_instances (
      id TEXT PRIMARY KEY,
      hostname TEXT NOT NULL,
      port INTEGER NOT NULL,
      started_at TEXT NOT NULL,
      last_heartbeat TEXT NOT NULL,
      leader INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS cluster_locks (
      name TEXT PRIMARY KEY,
      owner TEXT NOT NULL,
      acquired_at TEXT NOT NULL,
      expires_at TEXT NOT NULL
    );
  `);
};
export const down = (db) => { db.exec("DROP TABLE IF EXISTS cluster_instances; DROP TABLE IF EXISTS cluster_locks"); };
```

```js
// src/lib/db/repos/clusterRepo.js
export async function registerInstance(db, { id, hostname, port }) {
  const now = new Date().toISOString();
  db.run(`INSERT INTO cluster_instances (id, hostname, port, started_at, last_heartbeat, leader)
          VALUES (?, ?, ?, ?, ?, 0)
          ON CONFLICT(id) DO UPDATE SET last_heartbeat = excluded.last_heartbeat`,
    [id, hostname, port, now, now]);
}
export async function heartbeat(db, id) {
  return db.run("UPDATE cluster_instances SET last_heartbeat = ? WHERE id = ?", [new Date().toISOString(), id]);
}
export async function listInstances(db, { staleAfterMs = 30_000 } = {}) {
  const cutoff = new Date(Date.now() - staleAfterMs).toISOString();
  return db.all("SELECT * FROM cluster_instances WHERE last_heartbeat > ?", [cutoff]);
}
export async function deregisterInstance(db, id) {
  return db.run("DELETE FROM cluster_instances WHERE id = ?", [id]);
}
```

**Acceptance criteria:** instances register/heartbeat; stale instances excluded; deregister works.

### M2 — Leader election

**Reference code (`src/lib/cluster/leader.js`):**

```js
import { getAdapter } from "@/lib/db/driver.js";

// Leader election: first instance to claim the leader row wins; lease-based.
export async function tryAcquireLeadership({ instanceId, leaseMs = 30_000 } = {}) {
  const db = getAdapter();
  const now = Date.now();
  const current = db.get("SELECT * FROM cluster_instances WHERE leader = 1");
  if (current && now - Date.parse(current.last_heartbeat) < leaseMs && current.id !== instanceId) {
    return { leader: false, current: current.id };
  }
  db.run("UPDATE cluster_instances SET leader = 0");
  db.run("UPDATE cluster_instances SET leader = 1, last_heartbeat = ? WHERE id = ?", [new Date(now).toISOString(), instanceId]);
  return { leader: true };
}

export async function renewLeadership({ instanceId, leaseMs = 30_000 } = {}) {
  const db = getAdapter();
  const row = db.get("SELECT * FROM cluster_instances WHERE id = ? AND leader = 1", [instanceId]);
  if (!row) return { leader: false };
  db.run("UPDATE cluster_instances SET last_heartbeat = ? WHERE id = ?", [new Date().toISOString(), instanceId]);
  return { leader: true, leaseMs };
}

// Heartbeat loop (unref'd so it never keeps the process alive).
export function startHeartbeat({ instanceId, intervalMs = 10_000, onLostLeadership }) {
  const t = setInterval(async () => {
    try {
      const res = await renewLeadership({ instanceId });
      if (!res.leader) onLostLeadership?.();
    } catch { /* fail-open */ }
  }, intervalMs);
  if (typeof t.unref === "function") t.unref();
  return t;
}
```

**Acceptance criteria:** lease prevents split-brain; renewal extends lease; lost leadership notified.

### M3 — Distributed locks

**Reference code (`src/lib/cluster/locks.js`):**

```js
import { getAdapter } from "@/lib/db/driver.js";

// File/SQLite-based lock with expiry (works across instances sharing the DB).
export async function acquireLock(name, { owner, ttlMs = 60_000, retries = 5, retryDelayMs = 200 } = {}) {
  const db = getAdapter();
  for (let i = 0; i < retries; i++) {
    const now = Date.now();
    const row = db.get("SELECT * FROM cluster_locks WHERE name = ?", [name]);
    if (!row || now > Date.parse(row.expires_at)) {
      try {
        db.run(`INSERT INTO cluster_locks (name, owner, acquired_at, expires_at) VALUES (?, ?, ?, ?)
                ON CONFLICT(name) DO UPDATE SET owner = excluded.owner, acquired_at = excluded.acquired_at, expires_at = excluded.expires_at
                WHERE cluster_locks.expires_at < ?`,
          [name, owner, new Date(now).toISOString(), new Date(now + ttlMs).toISOString(), new Date(now).toISOString()]);
        const check = db.get("SELECT * FROM cluster_locks WHERE name = ? AND owner = ?", [name, owner]);
        if (check) return { ok: true, name, owner };
      } catch { /* contention — retry */ }
    }
    await new Promise((r) => setTimeout(r, retryDelayMs));
  }
  return { ok: false, name };
}

export async function releaseLock(name, owner) {
  const db = getAdapter();
  return db.run("DELETE FROM cluster_locks WHERE name = ? AND owner = ?", [name, owner]);
}
```

**Acceptance criteria:** lock acquired exclusively; expired locks reclaimable; release only by owner.

### M4 — Instance ops + API + tests

**Reference code (`src/app/api/v1/cluster/route.js`):**

```js
import { getAdapter } from "@/lib/db/driver.js";
import { listInstances } from "@/lib/db/repos/clusterRepo.js";

export async function GET() {
  const db = getAdapter();
  return Response.json({ instances: await listInstances(db) });
}

export async function POST(req) {
  const db = getAdapter();
  const { action, instanceId } = await req.json();
  if (action === "deregister") {
    await deregisterInstance(db, instanceId);
    return Response.json({ ok: true });
  }
  return Response.json({ error: "unknown action" }, { status: 400 });
}
```

**Files touched:** `src/lib/cluster/` (new: leader, locks), `src/lib/db/migrations/20260915-cluster.js` (new), `src/lib/db/repos/clusterRepo.js` (new), `custom-server.js` (instance registration + heartbeat start), `src/app/api/v1/cluster/route.js` (new), dashboard cluster page (new), `tests/unit/cluster.test.js` (new).

**Acceptance criteria:** two instances share state; leader elected; locks exclude; API lists instances.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Split-brain | Two leaders | Lease-based election |
| Lock contention | Blocked ops | Scoped locks + retries |
| Consistency drift | Divergent state | Leader-writes + reconciliation |
| Complexity | Over-engineering | Progressive rollout (SQLite-first) |

## Verification

- Unit: registry, election, locks
- Manual: two instances on one DB → one leader; lock excluded across instances
- Regression: `tests/__baseline__/verify-no-regression.mjs`