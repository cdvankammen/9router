# Implementation Plan 24 — Rate Limiting & Abuse Detection — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #rate-limiting #abuse-detection #token-bucket #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (imports, function signatures, `custom-server.rate-limiter.js` existing LIMITS/WINDOW_MS, `src/sse/handlers/chat.js`, `src/lib/db/` conventions).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — run the app, hit the endpoints, confirm acceptance criteria.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-24-rate-limiting-abuse.md`, `../research/9router/39-rate-limiting.md`

## Scope

**In scope:** multi-dimensional limits (API key, user, IP, route; requests/min, tokens/min, concurrent streams); token bucket (capacity + refill, burst, queue-vs-reject); abuse detection (rapid retries, credential stuffing, anomalous volume; throttle/challenge/block; audit-only mode); extend `custom-server.rate-limiter.js`.
**Out of scope:** CAPTCHA integration; WAF.

## Milestones

### M1 — Token bucket

**Reference code (`src/lib/ratelimit/tokenBucket.js`):**

```js
// Token bucket: capacity + refill rate; burst allowed up to capacity.
export class TokenBucket {
  constructor({ capacity = 60, refillPerSec = 1, burst = 0 } = {}) {
    this.capacity = capacity + burst;
    this.refillPerSec = refillPerSec;
    this.tokens = this.capacity;
    this.lastRefill = Date.now();
  }

  take(n = 1) {
    this.refill();
    if (this.tokens >= n) {
      this.tokens -= n;
      return { allowed: true, remaining: this.tokens };
    }
    return { allowed: false, remaining: this.tokens, retryAfterMs: this.timeToNext(n) };
  }

  refill() {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    this.tokens = Math.min(this.capacity, this.tokens + elapsed * this.refillPerSec);
    this.lastRefill = now;
  }

  timeToNext(n) {
    return Math.ceil(((n - this.tokens) / this.refillPerSec) * 1000);
  }
}
```

**Acceptance criteria:** refill, burst, queue-vs-reject (reject with Retry-After).

### M2 — Multi-dimensional limits

**Reference code (`src/lib/ratelimit/limiter.js`):**

```js
// Dimensions: apiKey, user, ip, route. Limits: requests/min, tokens/min, concurrent streams.
export class MultiLimiter {
  constructor({ limits, buckets = new Map() } = {}) {
    this.limits = limits; // { apiKey: { requestsPerMin: 60, tokensPerMin: 100000, maxConcurrent: 5 }, ... }
    this.buckets = buckets; // key -> { requests: TokenBucket, tokens: TokenBucket, concurrent: number }
  }

  check({ apiKey, user, ip, route, tokens = 0 }) {
    const dims = [];
    if (apiKey) dims.push(`key:${apiKey}`);
    if (user) dims.push(`user:${user}`);
    if (ip) dims.push(`ip:${ip}`);
    dims.push(`route:${route}`);
    for (const dim of dims) {
      const limit = this.limits[dim.split(":")[0]];
      if (!limit) continue;
      const bucket = this.getBucket(dim, limit);
      const req = bucket.requests.take(1);
      if (!req.allowed) return { allowed: false, dimension: dim, reason: "requests", retryAfterMs: req.retryAfterMs };
      if (tokens > 0) {
        const tok = bucket.tokens.take(tokens);
        if (!tok.allowed) return { allowed: false, dimension: dim, reason: "tokens", retryAfterMs: tok.retryAfterMs };
      }
      if (bucket.concurrent >= limit.maxConcurrent) {
        return { allowed: false, dimension: dim, reason: "concurrent" };
      }
    }
    return { allowed: true };
  }

  getBucket(key, limit) {
    if (!this.buckets.has(key)) {
      this.buckets.set(key, {
        requests: new TokenBucket({ capacity: limit.requestsPerMin, refillPerSec: limit.requestsPerMin / 60 }),
        tokens: new TokenBucket({ capacity: limit.tokensPerMin, refillPerSec: limit.tokensPerMin / 60 }),
        concurrent: 0,
      });
    }
    return this.buckets.get(key);
  }
}
```

**Acceptance criteria:** all dimensions enforced; concurrent streams capped; per-dimension limits.

### M3 — Abuse detection

**Reference code (`src/lib/ratelimit/abuse.js`):**

```js
// Signals: rapid retries, credential stuffing, anomalous volume.
export class AbuseDetector {
  constructor({ auditOnly = true } = {}) {
    this.auditOnly = auditOnly;
    this.signals = new Map(); // key -> { count, windowStart }
  }

  // Rapid retries: same key + same route, >N in <M seconds.
  detectRapidRetries({ apiKey, route, now = Date.now() }) {
    const key = `retry:${apiKey}:${route}`;
    const sig = this.signals.get(key) ?? { count: 0, windowStart: now };
    if (now - sig.windowStart > 10_000) { sig.count = 0; sig.windowStart = now; }
    sig.count++;
    this.signals.set(key, sig);
    return sig.count > 5; // >5 retries in 10s
  }

  // Credential stuffing: many distinct keys from same IP.
  detectCredentialStuffing({ ip, apiKey, now = Date.now() }) {
    const key = `stuffing:${ip}`;
    const seen = this.signals.get(key) ?? new Set();
    if (now - (this.signals.get(`${key}:ts`) ?? 0) > 60_000) seen.clear();
    seen.add(apiKey);
    this.signals.set(key, seen);
    this.signals.set(`${key}:ts`, now);
    return seen.size > 20; // >20 distinct keys in 60s
  }

  // Action: throttle | challenge | block (audit-only logs instead).
  actionFor(signal) {
    if (this.auditOnly) return { action: "log", signal };
    return signal === "credential_stuffing" ? { action: "block", signal } : { action: "throttle", signal };
  }
}
```

**Acceptance criteria:** signals detected; actions applied or audit-logged; audit-only default.

### M4 — Integration + tests

**Reference code (`custom-server.rate-limiter.js` extension):**

```js
// Extend LIMITS with per-dimension defaults; wire AbuseDetector into request path.
// On abuse action 'block' -> 403; 'throttle' -> 429 with longer Retry-After.
```

**Files touched:** `src/app/api/v1/rate-policies/route.js` (policy CRUD), dashboard rate page, `tests/unit/ratelimit.test.js` (new).

**Acceptance criteria:** limiter integrated; policies API; tests pass.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Memory growth (buckets) | Sweep idle buckets |
| False positives | Audit-only default; thresholds |
| Distributed nodes | Per-node limits (plan 17 later) |

## Verification

- Unit: token bucket, dimensions, abuse signals
- Manual: burst requests → verify 429 + Retry-After
- Regression: `tests/__baseline__/verify-no-regression.mjs`