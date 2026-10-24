# Implementation Plan 123 — Failover State Machine & Recovery — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #failover #state-machine #recovery #sessions #injection #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (failover logic in `src/sse/handlers/chat.js` + `open-sse/handlers/chatCore.js`; error failover from plan 9; request tracing from plan 66).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — transitions; session logging; recovery verification.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-123-failover-state-machine.md`, `../research/9router/impl-plan-9-error-failover.md`, `../research/9router/impl-plan-119-ha-mini-backup-nodes.md`.

## Scope

**In scope:** failover state machine (idle → attempting → degraded|failed → recovered → idle); failover sessions (request id, timeline, attempts, outcomes, replay); recovery verification (primary health checks, configurable delay, rollback); failure injection (test-only mode) + dashboard failover view.
**Out of scope:** HA mini nodes (plan 119); request tracing internals (plan 66).

## Milestones

### M1 — Failover state machine

**Reference code (`src/lib/failover/state.js`):**

```js
// States + transitions.
export const FAILOVER_STATES = ["idle", "attempting", "degraded", "failed", "recovered"];

export const TRANSITIONS = {
  idle: ["attempting"],
  attempting: ["degraded", "failed", "recovered"],
  degraded: ["attempting", "failed", "recovered"],
  failed: ["recovered"],
  recovered: ["idle"],
};

export function makeFailoverState(initial = "idle") {
  let state = initial;
  return {
    get state() { return state; },
    transition(to) {
      if (!TRANSITIONS[state]?.includes(to)) return { ok: false, reason: `invalid transition ${state} -> ${to}` };
      state = to;
      return { ok: true, state };
    },
    reset() { state = "idle"; },
  };
}
```

**Acceptance criteria:** deterministic transitions; single source of truth.

### M2 — Failover sessions

**Reference code (`src/lib/failover/session.js`):**

```js
// Session model: request id, timeline, attempts, outcomes.
export function makeSession({ requestId, startedAt = Date.now() } = {}) {
  return { requestId, startedAt, timeline: [], attempts: [], outcome: null };
}

export function makeSessionLog() {
  const sessions = new Map(); // requestId -> session
  return {
    start(requestId) { const s = makeSession({ requestId }); sessions.set(requestId, s); return s; },
    record(requestId, evt) {
      const s = sessions.get(requestId);
      if (!s) return null;
      s.timeline.push({ ...evt, at: Date.now() });
      if (evt.type === "attempt") s.attempts.push(evt);
      if (evt.type === "outcome") s.outcome = evt.outcome;
      return s;
    },
    // Replay: full failover trace for debugging.
    replay(requestId) { return sessions.get(requestId) ?? null; },
    // Retention: drop old sessions.
    prune({ maxAgeMs = 24 * 3600 * 1000 } = {}) {
      const cutoff = Date.now() - maxAgeMs;
      for (const [id, s] of sessions) if (s.startedAt < cutoff) sessions.delete(id);
    },
  };
}
```

**Acceptance criteria:** sessions; logging; replay; retention.

### M3 — Recovery verification

**Reference code (`src/lib/failover/recovery.js`):**

```js
// Recovery checks: primary health after failover.
export function recoveryCheck({ healthOf, primaryId, delayMs = 5000 } = {}) {
  return { due: Date.now() >= (recoveryCheck._lastFailover ?? 0) + delayMs, healthy: healthOf(primaryId) };
}

// Recovery timing: configurable delay.
export function scheduleRecovery({ failoverAt = Date.now(), delayMs = 5000 } = {}) {
  return { checkAt: failoverAt + delayMs, due: Date.now() >= failoverAt + delayMs };
}

// Recovery rollback: revert to primary when healthy.
export function rollbackToPrimary({ state, healthy, primaryId } = {}) {
  if (!healthy) return { ok: false, reason: "primary-not-healthy" };
  const r = state.transition("recovered");
  return r.ok ? { ok: true, primaryId } : r;
}
```

**Acceptance criteria:** checks; timing; rollback.

### M4 — Failure injection + integration + tests

**Reference code (`src/lib/failover/inject.js`):**

```js
// Failure injection: test-only mode.
export function makeInjector({ enabled = false } = {}) {
  const rules = new Map(); // providerId -> failure spec
  return {
    enable() { enabled = true; },
    disable() { enabled = false; },
    addRule(providerId, spec) { rules.set(providerId, spec); },
    // Should this request fail?
    shouldFail(providerId, attempt = 0) {
      if (!enabled) return false;
      const spec = rules.get(providerId);
      if (!spec) return false;
      return spec.mode === "always" || (spec.mode === "firstN" && attempt < (spec.n ?? 1));
    },
    // Failover drills: scheduled tests.
    drill(providerId, { everyMs = 3600 * 1000 } = {}) {
      return { providerId, nextAt: Date.now() + everyMs, enabled };
    },
  };
}

// Telemetry: failover view.
export function makeFailoverTelemetry() {
  const events = [];
  return {
    record(evt) { events.push({ ...evt, at: Date.now() }); },
    report() {
      return {
        failovers: events.filter((e) => e.type === "failover").length,
        recoveries: events.filter((e) => e.type === "recovery").length,
        injections: events.filter((e) => e.type === "injection").length,
      };
    },
  };
}
```

**Files touched:** `src/lib/failover/` (new: state, session, recovery, inject), `src/sse/handlers/chat.js` (state integration), `open-sse/handlers/chatCore.js` (failover hooks), dashboard failover page (new), `tests/unit/failover.test.js` (new).

**Acceptance criteria:** injection; integration; telemetry; tests.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| State divergence | Wrong behavior | Single source of truth |
| Recovery races | Double recovery | Locking |
| Injection accidents | Prod failures | Test-only mode |
| Session bloat | Memory growth | Retention policy |

## Verification

- Unit: makeFailoverState, makeSessionLog, scheduleRecovery, rollbackToPrimary, makeInjector
- Manual: inject failure → failover → recovery; replay session trace
- Regression: `tests/__baseline__/verify-no-regression.mjs`