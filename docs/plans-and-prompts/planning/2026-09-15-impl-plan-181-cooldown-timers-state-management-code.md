# Implementation Plan 181 — Cooldown Timers & State Management — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #cooldown #state-machine #provider-health #timers #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (cooldown backoff from plan 95; error hardening from plan 9; failover state machine from plan 123; provider load balancing from plan 94).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — states; timers; transitions.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-181-cooldown-timers-state-management.md`, `../research/9router/impl-plan-95-cooldown-backoff.md`, `../research/9router/impl-plan-123-failover-state-machine.md`.

## Scope

**In scope:** state model (healthy, degraded, cooldown, recovering, failed); timer management (cooldown, recovery, degradation); state transitions (triggers, guards, logging).
**Out of scope:** retry counts/backoff (plan 180); fallback chains (plan 179).

## Milestones

### M1 — State model

**Reference code (`src/lib/cooldown/states.js`):**

```js
// States: healthy, degraded, cooldown, recovering, failed.
export const STATES = ["healthy", "degraded", "cooldown", "recovering", "failed"];

// State machine.
export function makeStateMachine({ initial = "healthy" } = {}) {
  let state = initial;
  return {
    state() { return state; },
    set(next) { if (STATES.includes(next)) state = next; return this; },
    // Transition rules.
    canTransition(from, to) {
      const allowed = {
        healthy: ["degraded", "cooldown", "failed"],
        degraded: ["healthy", "cooldown", "failed"],
        cooldown: ["recovering", "failed"],
        recovering: ["healthy", "cooldown", "failed"],
        failed: ["cooldown", "recovering"],
      };
      return (allowed[from] ?? []).includes(to);
    },
    // State scope: per-provider, per-model, per-account.
    scope() { return { provider: null, model: null, account: null }; },
  };
}

// State registry: per-provider machines.
export function makeStateRegistry() {
  const machines = new Map();
  return {
    machine(key) {
      if (!machines.has(key)) machines.set(key, makeStateMachine());
      return machines.get(key);
    },
    all() { return Object.fromEntries(machines); },
  };
}
```

**Acceptance criteria:** states; transitions; registry.

### M2 — Timer management

**Reference code (`src/lib/cooldown/timers.js`):**

```js
// Timer config: durations.
export const DEFAULT_TIMERS = { cooldown: 60_000, recovery: 30_000, degradation: 10_000 };

// Timer management.
export function makeTimerManager({ timers = DEFAULT_TIMERS, now = Date.now } = {}) {
  const started = new Map(); // key -> {state, at}
  return {
    enter(key, state) { started.set(key, { state, at: now() }); },
    // Remaining time in current state.
    remaining(key) {
      const s = started.get(key);
      if (!s) return 0;
      const duration = timers[s.state] ?? 0;
      return Math.max(0, duration - (now() - s.at));
    },
    // Expired?
    expired(key) { return this.remaining(key) === 0; },
    // Periodic sync: prune stale entries.
    sync() {
      for (const [key, s] of started) {
        if (this.remaining(key) === 0 && s.state !== "healthy") started.delete(key);
      }
    },
  };
}
```

**Acceptance criteria:** timers; remaining; sync.

### M3 — State transitions

**Reference code (`src/lib/cooldown/transitions.js`):**

```js
// Transition triggers: error rates, latency, quality.
export function triggerTransition({ machine, from, errorRate = 0, latency = 0, quality = 1, thresholds = { errorRate: 0.3, latency: 5000, quality: 0.4 } } = {}) {
  if (errorRate >= thresholds.errorRate) return machine.canTransition(from, "cooldown") ? "cooldown" : null;
  if (latency >= thresholds.latency) return machine.canTransition(from, "degraded") ? "degraded" : null;
  if (quality < thresholds.quality) return machine.canTransition(from, "degraded") ? "degraded" : null;
  return machine.canTransition(from, "healthy") ? "healthy" : null;
}

// Transition guards: prevent flapping.
export function makeGuard({ minHold = 5_000, now = Date.now } = {}) {
  const last = new Map(); // key -> {state, at}
  return {
    allow(key, state) {
      const prev = last.get(key);
      if (prev && prev.state === state && now() - prev.at < minHold) return false;
      last.set(key, { state, at: now() });
      return true;
    },
  };
}

// Transition logging: state change audit.
export function makeTransitionLog() {
  const entries = [];
  return {
    log({ key, from, to, reason = null } = {}) { entries.push({ key, from, to, reason, at: Date.now() }); },
    recent({ limit = 20 } = {}) { return entries.slice(-limit); },
    all() { return entries; },
  };
}
```

**Acceptance criteria:** triggers; guards; logging.

### M4 — Integration + tests

**Reference code (`src/lib/cooldown/integrate.js`):**

```js
// Routing integration: state-aware selection.
export function stateFor({ registry, key } = {}) {
  return registry.machine(key).state();
}

// Fail-open.
export function safeCooldown(fn, fallback = null) {
  try { return fn(); } catch { return fallback; }
}
```

**Files touched:** `src/lib/cooldown/` (new: states, timers, transitions, integrate), `open-sse/handlers/chatCore.js` (state hooks), dashboard cooldown page (new), `tests/unit/cooldown.test.js` (new).

**Acceptance criteria:** integration; fail-open; tests.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| State flapping | Unstable routing | Transition guards |
| Timer drift | Stale states | Periodic sync |
| Missed recovery | Unused providers | Recovery probes |
| Complexity | Confusion | Simple states |

## Verification

- Unit: makeStateMachine, makeStateRegistry, makeTimerManager, triggerTransition, makeGuard, makeTransitionLog, stateFor
- Manual: error → cooldown → recovering → healthy
- Regression: `tests/__baseline__/verify-no-regression.mjs`