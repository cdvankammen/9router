# Implementation Plan 21 — Multi-Account Quota & Rotation — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #multi-account #quota #rotation #account-health #fallback #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (imports, function signatures, `src/lib/db/repos/connectionsRepo.js`, `src/sse/handlers/chat.js` account-selection loop, `open-sse/config/` conventions).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — run the app, hit the endpoints, confirm acceptance criteria.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-21-multi-account-quota.md`, `../research/9router/36-multi-account-quota.md`

## Scope

**In scope:** account health model (error rate, latency, quota remaining, rate-limit status, cooldown); weighted score (quota > error > latency); score decay; quota-aware selection; automatic rotation with cooldowns/hysteresis; fallback chain construction.
**Out of scope:** account provisioning; billing.

## Milestones

### M1 — Account health model

**Reference code (`open-sse/config/accountPolicy.js`):**

```js
// Weights: quota remaining > error rate > latency.
export const ACCOUNT_POLICY = {
  weights: { quota: 0.5, errorRate: 0.3, latency: 0.2 },
  scoreDecayMs: 60_000,        // scores decay over time
  cooldownMs: 30_000,          // cooldown after rate-limit
  hysteresis: 0.1,             // avoid flapping
  minScoreToServe: 0.2,
};

export function computeAccountScore(account, now = Date.now()) {
  const { quotaRemaining = 1, errorRate = 0, latency = 0 } = account;
  const quotaScore = clamp01(quotaRemaining);
  const errorScore = 1 - clamp01(errorRate);
  const latencyScore = 1 - clamp01(latency / 10_000); // 10s = 0
  const raw = ACCOUNT_POLICY.weights.quota * quotaScore
    + ACCOUNT_POLICY.weights.errorRate * errorScore
    + ACCOUNT_POLICY.weights.latency * latencyScore;
  // Decay: older observations weigh less
  const age = now - (account.lastUpdated ?? now);
  const decay = Math.exp(-age / ACCOUNT_POLICY.scoreDecayMs);
  return clamp01(raw * decay);
}
```

**Acceptance criteria:** score computed with weights; decay applied; hysteresis constants defined.

### M2 — Quota-aware selection

**Reference code (`open-sse/services/accountSelector.js`):**

```js
// Select best account for a model, respecting cooldowns.
export function selectAccount(accounts, model, now = Date.now()) {
  const eligible = accounts.filter((a) =>
    a.model === model &&
    !isInCooldown(a, now) &&
    computeAccountScore(a, now) >= ACCOUNT_POLICY.minScoreToServe
  );
  if (!eligible.length) return null;
  return eligible.sort((a, b) => computeAccountScore(b, now) - computeAccountScore(a, now))[0];
}

function isInCooldown(account, now) {
  return account.cooldownUntil && now < account.cooldownUntil;
}

// Rotation: after rate-limit, set cooldown and pick next.
export function rotateAfterFailure(accounts, failedAccount, now = Date.now()) {
  failedAccount.cooldownUntil = now + ACCOUNT_POLICY.cooldownMs;
  return selectAccount(accounts.filter((a) => a.id !== failedAccount.id), failedAccount.model, now);
}
```

**Acceptance criteria:** selection respects cooldowns + score; rotation after failure.

### M3 — Fallback chain construction

**Reference code (`src/sse/handlers/chat.js` extension):**

```js
// Build fallback chain: ordered accounts by score, bounded by maxFallbacks.
export function buildAccountFallbackChain(accounts, model, { maxFallbacks = 5 } = {}) {
  const scored = accounts
    .filter((a) => a.model === model)
    .sort((a, b) => computeAccountScore(b) - computeAccountScore(a));
  return scored.slice(0, maxFallbacks);
}
```

**Acceptance criteria:** chain ordered by health; bounded; used by account-selection loop.

### M4 — Repo + tests

**Reference code (`src/lib/db/repos/accountRepo.js`):**

```js
export async function updateAccountHealth(accountId, { errorRate, latency, quotaRemaining, rateLimited }) {
  const db = await getAdapter();
  await db.run(`
    UPDATE accounts SET
      error_rate = ?, latency = ?, quota_remaining = ?,
      rate_limited = ?, last_updated = ?
    WHERE id = ?
  `, [errorRate, latency, quotaRemaining, rateLimited ? 1 : 0, Date.now(), accountId]);
}
```

**Files touched:** `tests/unit/multi-account.test.js` (new).

**Acceptance criteria:** health persisted; tests pass.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Quota data availability | Provider APIs vary | Estimate from usage |
| Score flapping | Hysteresis + decay |
| Cooldown starvation | minScoreToServe floor |

## Verification

- Unit: score, selection, rotation, chain
- Manual: two accounts → rate-limit one → verify rotation
- Regression: `tests/__baseline__/verify-no-regression.mjs`