# Implementation Plan 144 — Session Stickiness & Affinity — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #stickiness #affinity #sessions #routing #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (session management from plan 63 (`src/lib/sessions/` or wherever sessions landed); request handling in `src/sse/handlers/chat.js`; account-selection loop; failover logic in `open-sse/handlers/chatCore.js`).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — stickiness; re-routing on failure/quality.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-144-session-stickiness-affinity.md`, `../research/9router/impl-plan-63-session-management.md`, `../research/9router/impl-plan-44-branch-gateways-and-serving.md`.

## Scope

**In scope:** stickiness model (session key, sticky target, TTL, scope); policies (always, failover, quality, non-sticky); re-routing (failure, quality, cost, manual); session integration + observability.
**Out of scope:** session persistence internals (plan 63); panel coordination (plan 99).

## Milestones

### M1 — Stickiness model

**Reference code (`src/lib/stickiness/model.js`):**

```js
// Stickiness: keep a conversation on the same provider/model.
export const POLICIES = ["always", "failover", "quality", "none"];

export function makeStickyState({ sessionKey, target = null, policy = "failover", ttlMs = 30 * 60_000 } = {}) {
  return { sessionKey, target, policy, ttlMs, pinnedAt: Date.now() };
}

// Is the sticky target still valid (TTL + policy)?
export function isSticky({ state, now = Date.now() } = {}) {
  if (!state?.target) return false;
  if (state.policy === "none") return false;
  return now - state.pinnedAt < state.ttlMs;
}

// Break stickiness (failure/quality/manual).
export function breakStickiness(state) {
  return { ...state, target: null, brokenAt: Date.now() };
}
```

**Acceptance criteria:** state shape; TTL check; break.

### M2 — Stickiness policies

**Reference code (`src/lib/stickiness/policies.js`):**

```js
// Policies: always / failover / quality / none.
export function policyFor({ policy, state, failure = false, qualityDrop = false } = {}) {
  switch (policy) {
    case "always":
      return { sticky: true, reroute: false };
    case "failover":
      return { sticky: !failure, reroute: failure };
    case "quality":
      return { sticky: !qualityDrop, reroute: qualityDrop };
    case "none":
    default:
      return { sticky: false, reroute: true };
  }
}

// Should this request use the sticky target?
export function shouldUseSticky({ state, failure = false, qualityDrop = false } = {}) {
  if (!isSticky({ state })) return false;
  return policyFor({ policy: state.policy, failure, qualityDrop }).sticky;
}
```

**Acceptance criteria:** policy matrix; sticky decision.

### M3 — Re-routing

**Reference code (`src/lib/stickiness/reroute.js`):**

```js
// Re-routing: failure / quality / cost / manual.
export function rerouteReason({ failure = false, qualityDrop = false, costHigh = false, manual = false } = {}) {
  if (manual) return "manual";
  if (failure) return "failure";
  if (qualityDrop) return "quality";
  if (costHigh) return "cost";
  return null;
}

// Re-route: pick a new target, breaking stickiness.
export function reroute({ state, candidates = [], reason = "failure" } = {}) {
  const next = candidates[0] ?? null;
  return { state: breakStickiness(state), next, reason };
}

// Sticky-aware selection: prefer sticky target when valid.
export function selectWithStickiness({ state, candidates = [] } = {}) {
  if (isSticky({ state }) && candidates.includes(state.target)) return state.target;
  return candidates[0] ?? null;
}
```

**Acceptance criteria:** reason detection; reroute; sticky-aware selection.

### M4 — Integration + observability + tests

**Reference code (`src/lib/stickiness/integrate.js`):**

```js
// Session integration: attach stickiness to a request.
export function stickyTargetFor({ sessionKey, store, candidates, failure = false } = {}) {
  const state = store.get(sessionKey);
  if (!state) return { state: makeStickyState({ sessionKey }), target: candidates[0] ?? null };
  if (shouldUseSticky({ state, failure })) return { state, target: state.target };
  const { state: next, reason } = reroute({ state, candidates, reason: failure ? "failure" : "manual" });
  store.set(sessionKey, next);
  return { state: next, target: next.target, reason };
}

// Observability: stickiness metrics.
export function makeStickyTelemetry() {
  const events = [];
  return {
    record(e) { events.push({ ...e, at: Date.now() }); },
    report() {
      return {
        stickyHits: events.filter((e) => e.sticky).length,
        reroutes: events.filter((e) => e.reason).length,
        byReason: events.reduce((acc, e) => { if (e.reason) acc[e.reason] = (acc[e.reason] ?? 0) + 1; return acc; }, {}),
      };
    },
  };
}
```

**Files touched:** `src/lib/stickiness/` (new: model, policies, reroute, integrate), `src/sse/handlers/chat.js` (session integration), dashboard sessions page (new), `tests/unit/stickiness.test.js` (new).

**Acceptance criteria:** integration; telemetry; tests.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Stuck on bad model | Degraded quality | Quality re-route |
| Context loss | Broken sessions | Session state |
| Cost increase | Overspend | Cost re-route |
| Complexity | Policy confusion | Simple policies |

## Verification

- Unit: makeStickyState, isSticky, policyFor, shouldUseSticky, reroute, selectWithStickiness, stickyTargetFor
- Manual: same session → same model; failure → re-route
- Regression: `tests/__baseline__/verify-no-regression.mjs`