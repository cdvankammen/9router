# Implementation Plan 09 — Error System & Failover Hardening — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #error-system #failover #hardening #cooldown #circuit-breaker #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (imports, function signatures, `open-sse/config/runtimeConfig.js`, `open-sse/handlers/chatCore.js`, `open-sse/executors/default.js`, `custom-server.js`).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — run the app, hit the endpoints, check the DB, confirm acceptance criteria.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-09-error-failover-hardening.md`, `../research/9router/21-messages-audit-refactor-design.md`, `../research/9router/22-error-sweep.md`, `../research/9router/26-programmatic-error-registry.md`, `../research/9router/29-unified-error-system-v2.md`, `../research/9router/24-ha-mini-backup-nodes.md`, `../research/9router/28c-failover-session-command-log.md`

## Scope

**In scope:** unified error taxonomy + registry; cooldown/retry policies (LiteLLM patterns); circuit breakers; no-retry error classification; failover hardening (crash-loop protection, session recovery); error inbox dashboard.
**Out of scope:** full HA multi-node orchestration (plan 17); error inbox P2 full design (separate).

## Milestones

### M1 — Unified error taxonomy + registry

**Reference code (`open-sse/config/errorCodes.js`):**

```js
export const ERROR_TAXONOMY = {
  rate_limit: { http: 429, retryable: true },
  auth: { http: 401, retryable: false },
  billing: { http: 402, retryable: false },
  timeout: { http: 504, retryable: true },
  context_window: { http: 400, retryable: false },
  content_policy: { http: 400, retryable: false },
  network: { http: 502, retryable: true },
  server: { http: 500, retryable: true },
  unknown: { http: 500, retryable: false },
};

export const ERROR_CODES = {
  "RATE_LIMIT.UPSTREAM_429": { category: "rate_limit", message: "Upstream rate limit exceeded", retryable: true },
  "AUTH.INVALID_KEY": { category: "auth", message: "Invalid API key", retryable: false },
  "BILLING.INSUFFICIENT": { category: "billing", message: "Insufficient balance", retryable: false },
  "TIMEOUT.UPSTREAM": { category: "timeout", message: "Upstream timeout", retryable: true },
  "CONTEXT_WINDOW.EXCEEDED": { category: "context_window", message: "Context window exceeded", retryable: false },
  "CONTENT_POLICY.VIOLATION": { category: "content_policy", message: "Content policy violation", retryable: false },
  "NETWORK.UNREACHABLE": { category: "network", message: "Upstream unreachable", retryable: true },
  "SERVER.UPSTREAM_5XX": { category: "server", message: "Upstream server error", retryable: true },
  "UNKNOWN.ERROR": { category: "unknown", message: "Unknown error", retryable: false },
};

export function categorizeError(err) {
  const status = err?.status ?? err?.response?.status;
  if (status === 429) return ERROR_CODES["RATE_LIMIT.UPSTREAM_429"];
  if (status === 401 || status === 403) return ERROR_CODES["AUTH.INVALID_KEY"];
  if (status === 402) return ERROR_CODES["BILLING.INSUFFICIENT"];
  if (status === 408 || status === 504) return ERROR_CODES["TIMEOUT.UPSTREAM"];
  if (err?.code === "context_length_exceeded") return ERROR_CODES["CONTEXT_WINDOW.EXCEEDED"];
  if (status >= 500) return ERROR_CODES["SERVER.UPSTREAM_5XX"];
  return ERROR_CODES["UNKNOWN.ERROR"];
}
```

**Acceptance criteria:** taxonomy + registry defined; `categorizeError` maps upstream errors.

### M2 — Cooldown + retry policies + circuit breakers

**Reference code (`open-sse/config/runtimeConfig.js` extension):**

```js
// Add to DEFAULT_RETRY_CONFIG:
cooldowns: {
  "429": 5000, "401": 5000, "404": 5000, "408": 5000,
  highFailureRate: 5000,  // >50% failures in minute
},
maxFallbacks: 5,
noRetryErrors: ["context_window", "content_policy"],
```

**Reference code (`src/lib/db/repos/circuitBreakerRepo.js`):**

```js
// Circuit breaker per deployment: trip after allowed_fails; half-open probe; per-deployment isolation.
export class CircuitBreaker {
  constructor({ allowedFails = 5, cooldownMs = 30_000 } = {}) {
    this.allowedFails = allowedFails;
    this.cooldownMs = cooldownMs;
    this.failures = new Map(); // deployment -> { count, trippedAt }
  }

  isOpen(deployment) {
    const state = this.failures.get(deployment);
    if (!state) return false;
    if (state.trippedAt && Date.now() - state.trippedAt > this.cooldownMs) {
      this.failures.delete(deployment); // half-open: allow probe
      return false;
    }
    return state.count >= this.allowedFails;
  }

  recordFailure(deployment) {
    const state = this.failures.get(deployment) ?? { count: 0, trippedAt: null };
    state.count++;
    if (state.count >= this.allowedFails) state.trippedAt = Date.now();
    this.failures.set(deployment, state);
  }

  recordSuccess(deployment) {
    this.failures.delete(deployment);
  }
}
```

**Acceptance criteria:** cooldown map applied; circuit breakers trip/half-open/recover; no-retry errors fail fast.

### M3 — Failover hardening

**Reference code (`src/lib/failover/` — crash-loop protection):**

```js
// Exponential backoff on repeated crashes (1s, 2s, 4s, ...); health gates before promotion.
export function crashBackoff(attempt) {
  return Math.min(60_000, 1000 * 2 ** attempt);
}

// Session recovery: restore sessions after failover from sessionRepo.
export async function restoreSessions(db) {
  const sessions = await db.all(`SELECT * FROM sessions WHERE status = 'active'`);
  for (const s of sessions) {
    await resumeSession(s); // replay from command log
  }
}
```

**Acceptance criteria:** crash-loop backoff; health gates; session restore from command log; dual-instance conflict fixes (lock files, port conflicts).

### M4 — Error inbox dashboard + tests

**Files touched:**
- Dashboard: error-inbox page (categorized errors, retry/fix actions, error rates per provider/model/category, threshold alerts)
- `tests/unit/error-system.test.js` (new)

**Acceptance criteria:** error inbox works; unit tests pass.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Error taxonomy migration | Existing categorizeError callers | Registry-driven; incremental |
| Circuit breaker state | In-memory only | Acceptable single-node; Redis later |
| Failover complexity | Split-brain | Quorum; fencing |

## Verification

- Unit: error mapping, cooldowns, circuit breakers, crash backoff
- Manual: trigger 429 → verify cooldown; trip breaker → verify half-open
- Regression: `tests/__baseline__/verify-no-regression.mjs`