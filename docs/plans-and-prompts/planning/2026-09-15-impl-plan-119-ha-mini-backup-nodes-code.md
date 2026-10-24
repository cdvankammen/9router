# Implementation Plan 119 — HA Mini Backup Nodes — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #ha #failover #backup-nodes #heartbeat #promotion #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (SQLite repos in `src/lib/db/repos/*`; CLI in `cli/src/`; health checks from plan 49; provider redundancy from plan 65).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — register nodes; miss heartbeats → failover; promote with checks.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-119-ha-mini-backup-nodes.md`, `../research/9router/impl-plan-65-provider-redundancy.md`, `../research/9router/impl-plan-49-health-self-healing.md`.

## Scope

**In scope:** mini node model (roles primary/standby/observer, lifecycle register → sync → standby → promote); health monitoring (heartbeats, failure detection, quorum-based split-brain prevention); state sync (full/incremental, last-writer-wins conflicts); promotion (checks, rollback on primary recovery); CLI + dashboard HA view.
**Out of scope:** gateway clustering shared state (plan 70); provider-level failover (plan 65).

## Milestones

### M1 — Mini node model

**Reference code (`src/lib/ha/node.js`):**

```js
// Node roles + lifecycle.
export const NODE_ROLES = ["primary", "standby", "observer"];

export function makeNode({ id, role = "standby", heartbeatMs = 5000, lastHeartbeat = null } = {}) {
  if (!NODE_ROLES.includes(role)) throw new Error(`invalid node role: ${role}`);
  return { id, role, heartbeatMs, lastHeartbeat, state: "registered" };
}

// Lifecycle: register → sync → standby → promote.
export function transition(node, to) {
  const allowed = {
    registered: ["syncing", "standby"],
    syncing: ["standby", "registered"],
    standby: ["primary", "syncing"],
    primary: ["standby"],
  };
  if (!(allowed[node.state] ?? []).includes(to)) return { ok: false, reason: `invalid transition ${node.state} -> ${to}` };
  node.state = to;
  return { ok: true, node };
}
```

**Acceptance criteria:** roles; lifecycle transitions.

### M2 — Health monitoring

**Reference code (`src/lib/ha/health.js`):**

```js
// Heartbeats: record + detect missed.
export function makeHeartbeatMonitor({ timeoutMs = 15_000 } = {}) {
  const last = new Map(); // nodeId -> timestamp
  return {
    beat(nodeId) { last.set(nodeId, Date.now()); },
    missed(nodeId) {
      const t = last.get(nodeId);
      return t == null || Date.now() - t > timeoutMs;
    },
    // Failure detection: quorum-based promotion trigger.
    shouldFailover(nodes, { quorum = 0.5 } = {}) {
      const alive = nodes.filter((n) => !this.missed(n.id)).length;
      return { failed: alive / Math.max(1, nodes.length) < quorum, alive, total: nodes.length };
    },
  };
}

// Crash-loop backoff: exponential retry for standby nodes.
export function crashBackoff(attempt, { baseMs = 1000, maxMs = 60_000 } = {}) {
  return Math.min(maxMs, baseMs * 2 ** attempt);
}
```

**Acceptance criteria:** heartbeats; failure detection; quorum; backoff.

### M3 — State sync

**Reference code (`src/lib/ha/sync.js`):**

```js
// Sync modes: full + incremental.
export function makeSyncEngine() {
  const state = new Map(); // key -> { value, ts }
  return {
    // Full sync: replace everything.
    fullSync(snapshot) {
      state.clear();
      for (const [k, v] of Object.entries(snapshot)) state.set(k, { value: v, ts: Date.now() });
      return { ok: true, keys: state.size };
    },
    // Incremental sync: per-key update.
    incremental(updates) {
      for (const { key, value, ts = Date.now() } of updates) {
        const cur = state.get(key);
        if (!cur || ts >= cur.ts) state.set(key, { value, ts }); // last-writer-wins
      }
      return { ok: true, applied: updates.length };
    },
    // Freshness: how stale is this node's state?
    freshness(nodeId, { maxAgeMs = 30_000 } = {}) {
      const entries = [...state.values()];
      if (!entries.length) return { fresh: false, reason: "empty" };
      const newest = Math.max(...entries.map((e) => e.ts));
      return { fresh: Date.now() - newest <= maxAgeMs, ageMs: Date.now() - newest };
    },
  };
}
```

**Acceptance criteria:** full/incremental sync; LWW conflicts; freshness.

### M4 — Promotion + integration + tests

**Reference code (`src/lib/ha/promote.js`):**

```js
// Promotion: standby → primary with checks.
export function promote(node, { sync, quorum = 0.5, nodes = [] } = {}) {
  if (node.role !== "standby") return { ok: false, reason: "not-standby" };
  const fresh = sync.freshness(node.id);
  if (!fresh.fresh) return { ok: false, reason: "stale-state" };
  const fail = sync.shouldFailover?.(nodes, { quorum }) ?? { failed: true };
  if (!fail.failed) return { ok: false, reason: "primary-alive" };
  node.role = "primary";
  return { ok: true, node };
}

// Rollback: revert on primary recovery.
export function rollback(node) {
  if (node.role !== "primary") return { ok: false, reason: "not-primary" };
  node.role = "standby";
  return { ok: true, node };
}

// Telemetry: node health view.
export function makeHaTelemetry() {
  const events = [];
  return {
    record(evt) { events.push({ ...evt, at: Date.now() }); },
    report() {
      return {
        promotions: events.filter((e) => e.type === "promote").length,
        failovers: events.filter((e) => e.type === "failover").length,
        rollbacks: events.filter((e) => e.type === "rollback").length,
      };
    },
  };
}
```

**Files touched:** `src/lib/ha/` (new: node, health, sync, promote), `cli/src/` (node management), `src/lib/db/repos/haRepo.js` (new), dashboard ha page (new), `tests/unit/ha.test.js` (new).

**Acceptance criteria:** promotion checks; rollback; telemetry; tests.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Split brain | Two primaries | Quorum |
| Stale state | Wrong data | Freshness checks |
| Crash loops | Restart storms | Crash-loop backoff |
| Promotion races | Double promote | Locking |

## Verification

- Unit: makeNode, transition, makeHeartbeatMonitor, makeSyncEngine, promote, rollback
- Manual: stop primary → standby promotes; restart primary → rollback
- Regression: `tests/__baseline__/verify-no-regression.mjs`