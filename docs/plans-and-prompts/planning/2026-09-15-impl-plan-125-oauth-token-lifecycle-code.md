# Implementation Plan 125 — OAuth Token Lifecycle Hardening — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #oauth #tokens #refresh #rotation #lifecycle #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (OAuth + token refresh from plan 11 (`src/lib/oauth/`); executors in `open-sse/executors/*`; auth error handling from plan 89 (`open-sse/errors/`)).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — token states; proactive refresh; rotation rollback.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-125-oauth-token-lifecycle.md`, `../research/9router/impl-plan-11-oauth-credential-lifecycle.md`, `../research/9router/impl-plan-12-oauth-deep-dive.md`.

## Scope

**In scope:** token state machine (valid → expiring → refreshing → valid | expired → revoked); proactive refresh (scheduling at TTL × 0.8, serialized per-provider queue, backoff + retry, refresh trace); credential rotation (triggers expiry/revocation/security events, verify → swap flow, rollback); executor integration + dashboard OAuth health view.
**Out of scope:** OAuth handshake flows (plan 11); credential storage internals (plan 10).

## Milestones

### M1 — Token state machine

**Reference code (`src/lib/oauth/state.js`):**

```js
// Token states + transitions.
export const TOKEN_STATES = ["valid", "expiring", "refreshing", "expired", "revoked"];

export const TOKEN_TRANSITIONS = {
  valid: ["expiring", "expired", "revoked"],
  expiring: ["refreshing", "expired", "revoked"],
  refreshing: ["valid", "expired", "revoked"],
  expired: ["refreshing", "revoked"],
  revoked: [],
};

export function makeTokenState(initial = "valid") {
  let state = initial;
  return {
    get state() { return state; },
    transition(to) {
      if (!TOKEN_TRANSITIONS[state]?.includes(to)) return { ok: false, reason: `invalid transition ${state} -> ${to}` };
      state = to;
      return { ok: true, state };
    },
  };
}

// State from TTL: schedule refresh at TTL × 0.8.
export function stateForTtl({ ttlMs, now = Date.now(), issuedAt = now, refreshAt = 0.8 } = {}) {
  const age = now - issuedAt;
  if (age >= ttlMs) return "expired";
  if (age >= ttlMs * refreshAt) return "expiring";
  return "valid";
}
```

**Acceptance criteria:** transitions; TTL-based state.

### M2 — Proactive refresh

**Reference code (`src/lib/oauth/refresh.js`):**

```js
// Refresh scheduling: refresh at TTL × 0.8.
export function refreshDue({ ttlMs, issuedAt, now = Date.now(), threshold = 0.8 } = {}) {
  return now - issuedAt >= ttlMs * threshold;
}

// Refresh queue: serialized refreshes per provider.
export function makeRefreshQueue() {
  const inflight = new Set(); // providerId
  const queue = []; // { providerId, resolve }
  return {
    // Serialize: one refresh per provider at a time.
    async acquire(providerId) {
      if (!inflight.has(providerId)) { inflight.add(providerId); return true; }
      return new Promise((resolve) => queue.push({ providerId, resolve }));
    },
    release(providerId) {
      inflight.delete(providerId);
      const next = queue.findIndex((q) => q.providerId === providerId);
      if (next >= 0) { const [job] = queue.splice(next, 1); inflight.add(providerId); job.resolve(true); }
    },
  };
}

// Refresh failure: backoff + retry.
export function refreshBackoff(attempt, { baseMs = 1000, maxMs = 60_000 } = {}) {
  return Math.min(maxMs, baseMs * 2 ** attempt);
}

// Refresh trace: full refresh logging.
export function refreshTrace({ providerId, attempt, ok, error = null, at = Date.now() } = {}) {
  return { providerId, attempt, ok, error, at };
}
```

**Acceptance criteria:** scheduling; serialized queue; backoff; trace.

### M3 — Credential rotation

**Reference code (`src/lib/oauth/rotate.js`):**

```js
// Rotation triggers: expiry, revocation, security events.
export function rotationTriggered({ state, securityEvent = false } = {}) {
  return state === "revoked" || state === "expired" || securityEvent;
}

// Rotation flow: new credential → verify → swap.
export async function rotateCredential({ providerId, issueNew, verify, swap, log = console } = {}) {
  const fresh = await issueNew(providerId);
  const verified = await verify(fresh);
  if (!verified.ok) return { ok: false, reason: "verify-failed", error: verified.error };
  await swap(providerId, fresh);
  log.info(`[oauth] rotated credential for ${providerId}`);
  return { ok: true, credential: fresh };
}

// Rotation rollback: revert on failure.
export async function rotateWithRollback({ providerId, issueNew, verify, swap, revert, log = console } = {}) {
  const prev = await swap(providerId, null, { dryRun: true }); // capture current
  const result = await rotateCredential({ providerId, issueNew, verify, swap, log });
  if (!result.ok) {
    await revert(providerId, prev);
    log.warn(`[oauth] rotation failed for ${providerId}; reverted`);
  }
  return result;
}
```

**Acceptance criteria:** triggers; verify → swap; rollback.

### M4 — Integration + tests

**Reference code (`src/lib/oauth/integrate.js`):**

```js
// Executor integration: token state in executors.
export function tokenForRequest({ state, token, refreshDue } = {}) {
  if (state === "revoked") return { ok: false, reason: "revoked" };
  if (state === "expired") return { ok: false, reason: "expired" };
  return { ok: true, token, refreshSoon: refreshDue };
}

// Telemetry: OAuth health view.
export function makeOAuthTelemetry() {
  const events = [];
  return {
    record(evt) { events.push({ ...evt, at: Date.now() }); },
    report() {
      return {
        refreshes: events.filter((e) => e.type === "refresh").length,
        refreshFailures: events.filter((e) => e.type === "refresh" && !e.ok).length,
        rotations: events.filter((e) => e.type === "rotate").length,
        revoked: events.filter((e) => e.type === "revoke").length,
      };
    },
  };
}
```

**Files touched:** `src/lib/oauth/` (state, refresh, rotate, integrate), `open-sse/executors/` (token integration), dashboard oauth page (new), `tests/unit/oauth-lifecycle.test.js` (new).

**Acceptance criteria:** executor integration; telemetry; tests.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Refresh races | Double refresh | Serialized queue |
| Rotation failure | Broken creds | Rollback |
| Token leakage | Credential exposure | Secure storage |
| Provider quirks | Nonstandard flows | Per-provider config |

## Verification

- Unit: makeTokenState, stateForTtl, refreshDue, makeRefreshQueue, rotateWithRollback
- Manual: expiring token → proactive refresh; revoked → rotation with rollback
- Regression: `tests/__baseline__/verify-no-regression.mjs`