# Implementation Plan 139 — Account Selection & Balancing — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #accounts #multi-account #balancing #quota #selection #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (multi-account quota from plan 21 (`src/lib/accounts/`); OAuth lifecycle from plan 125 (`src/lib/oauth/`); provider load balancing from plan 94 (`src/lib/health/`); cooldowns from plan 95 (`src/lib/backoff/`); account selection loop in `src/sse/handlers/chat.js`).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — registry; health; selection; balancing.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-139-account-selection-balancing.md`, `../research/9router/impl-plan-21-multi-account-quota.md`, `../research/9router/impl-plan-94-provider-acceptance-load-balancing.md`.

## Scope

**In scope:** account model (per-provider account registry, health quota/rate-limits/errors, configured priority); selection strategies (round-robin, least-loaded, health-aware, priority-based); balancing (quota distribution, rate-limit avoidance, cost distribution, failover on failure); executor integration + dashboard account view.
**Out of scope:** quota foundations (plan 21); provider-level balancing (plan 94).

## Milestones

### M1 — Account registry + health

**Reference code (`src/lib/accounts/registry.js`):**

```js
// Account model: per-provider accounts.
export function makeAccount({ id, providerId, priority = 0, quotaUsed = 0, quotaLimit = null } = {}) {
  return { id, providerId, priority, quotaUsed, quotaLimit, healthy: true, lastError: null };
}

export function makeAccountRegistry() {
  const accounts = new Map(); // id -> account
  return {
    register(acc) { accounts.set(acc.id, acc); return acc; },
    forProvider(providerId) { return [...accounts.values()].filter((a) => a.providerId === providerId); },
    get(id) { return accounts.get(id) ?? null; },
    all() { return [...accounts.values()]; },
  };
}

// Health: quota, rate limits, errors.
export function accountHealth(acc, { error = null, rateLimited = false } = {}) {
  if (error) { acc.lastError = error; acc.healthy = false; }
  if (rateLimited) acc.healthy = false;
  if (acc.quotaLimit != null && acc.quotaUsed >= acc.quotaLimit) acc.healthy = false;
  return acc;
}

// Quota utilization.
export function quotaUtilization(acc) {
  return acc.quotaLimit ? acc.quotaUsed / acc.quotaLimit : 0;
}
```

**Acceptance criteria:** registry; health; utilization.

### M2 — Selection strategies

**Reference code (`src/lib/accounts/select.js`):**

```js
// Round-robin: even distribution.
export function roundRobin(accounts, { cursor = 0 } = {}) {
  if (!accounts.length) return null;
  return accounts[cursor % accounts.length];
}

// Least-loaded: least quota usage.
export function leastLoaded(accounts) {
  if (!accounts.length) return null;
  return [...accounts].sort((a, b) => quotaUtilization(a) - quotaUtilization(b))[0];
}

// Health-aware: skip unhealthy accounts.
export function healthAware(accounts) {
  const healthy = accounts.filter((a) => a.healthy);
  return healthy.length ? healthy[0] : null;
}

// Priority-based: configured order.
export function priorityBased(accounts) {
  if (!accounts.length) return null;
  return [...accounts].sort((a, b) => a.priority - b.priority)[0];
}

// Strategy dispatch.
export function selectAccount(accounts, { strategy = "health-aware", cursor = 0 } = {}) {
  const fns = { "round-robin": roundRobin, "least-loaded": leastLoaded, "health-aware": healthAware, "priority-based": priorityBased };
  return (fns[strategy] ?? healthAware)(accounts, { cursor });
}
```

**Acceptance criteria:** four strategies; dispatch.

### M3 — Balancing

**Reference code (`src/lib/accounts/balance.js`):**

```js
// Quota balancing: distribute across accounts.
export function balanceQuota(accounts, { strategy = "least-loaded" } = {}) {
  return selectAccount(accounts, { strategy });
}

// Rate-limit balancing: avoid rate limits.
export function rateLimitAware(accounts, { recent = new Map() } = {}) {
  const sorted = [...accounts].sort((a, b) => (recent.get(a.id) ?? 0) - (recent.get(b.id) ?? 0));
  return sorted[0] ?? null;
}

// Cost balancing: distribute cost.
export function costBalanced(accounts, { costOf = () => 1 } = {}) {
  const sorted = [...accounts].sort((a, b) => costOf(a) - costOf(b));
  return sorted[0] ?? null;
}

// Failover: switch on failure.
export function failover(accounts, { failedId = null } = {}) {
  const rest = accounts.filter((a) => a.id !== failedId && a.healthy);
  return rest[0] ?? null;
}
```

**Acceptance criteria:** quota/rate/cost balancing; failover.

### M4 — Integration + telemetry + tests

**Reference code (`src/lib/accounts/integrate.js`):**

```js
// Executor integration: account selection.
export function pickAccount({ registry, providerId, strategy, cursor = 0 } = {}) {
  const accounts = registry.forProvider(providerId);
  const acc = selectAccount(accounts, { strategy, cursor });
  return acc ? { account: acc, cursor: cursor + 1 } : { account: null, cursor };
}

// Telemetry: account view.
export function makeAccountTelemetry() {
  const events = [];
  return {
    record(evt) { events.push({ ...evt, at: Date.now() }); },
    report() {
      return {
        selections: events.length,
        failovers: events.filter((e) => e.type === "failover").length,
        unhealthy: events.filter((e) => e.type === "unhealthy").length,
        byProvider: events.reduce((acc, e) => { acc[e.providerId] = (acc[e.providerId] ?? 0) + 1; return acc; }, {}),
      };
    },
  };
}
```

**Files touched:** `src/lib/accounts/` (new: registry, select, balance, integrate), `open-sse/executors/` (account integration), dashboard accounts page (new), `tests/unit/accounts.test.js` (new).

**Acceptance criteria:** integration; telemetry; tests.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Quota exhaustion | Failed requests | Health tracking |
| Rate limits | 429s | Balancing |
| Account errors | Bad requests | Failover |
| Cost imbalance | Uneven spend | Cost balancing |

## Verification

- Unit: makeAccountRegistry, accountHealth, roundRobin, leastLoaded, healthAware, priorityBased, selectAccount, failover
- Manual: unhealthy account skipped; quota-exhausted account fails over
- Regression: `tests/__baseline__/verify-no-regression.mjs`