# Implementation Plan 186 — Failure Detection & Signaling — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #failure-detection #signaling #classification #health #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (error hardening from plan 9; error classification from plan 89; cooldown timers from plan 181 (`src/lib/cooldown/`); provider load balancing from plan 94).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — detection; signaling; classification.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-186-failure-detection-signaling.md`, `../research/9router/impl-plan-9-error-hardening.md`, `../research/9router/impl-plan-89-error-classification.md`.

## Scope

**In scope:** detection model (signals, methods, scope); signaling (types, propagation, persistence); failure classification (types, severity, action).
**Out of scope:** cooldown timers (plan 181); error classification internals (plan 89).

## Milestones

### M1 — Detection model

**Reference code (`src/lib/failures/detect.js`):**

```js
// Detection signals: errors, timeouts, quality drops.
export function detectionSignals({ errors = 0, timeouts = 0, quality = 1, requests = 1 } = {}) {
  return {
    errorRate: requests ? errors / requests : 0,
    timeoutRate: requests ? timeouts / requests : 0,
    quality,
  };
}

// Detection methods: threshold, rate, pattern.
export function detectFailure({ signals = {}, thresholds = { errorRate: 0.3, timeoutRate: 0.2, quality: 0.4 } } = {}) {
  if (signals.errorRate >= thresholds.errorRate) return { failed: true, reason: "error-rate" };
  if (signals.timeoutRate >= thresholds.timeoutRate) return { failed: true, reason: "timeout-rate" };
  if (signals.quality < thresholds.quality) return { failed: true, reason: "quality-drop" };
  return { failed: false, reason: null };
}

// Detection scope: per-provider, per-model, per-account.
export function makeDetector() {
  const perKey = new Map(); // key -> {errors, timeouts, quality, requests}
  return {
    record(key, { error = false, timeout = false, quality = 1 } = {}) {
      const s = perKey.get(key) ?? { errors: 0, timeouts: 0, quality: 1, requests: 0 };
      s.requests += 1;
      if (error) s.errors += 1;
      if (timeout) s.timeouts += 1;
      s.quality = (s.quality * (s.requests - 1) + quality) / s.requests;
      perKey.set(key, s);
    },
    check(key) { return detectFailure({ signals: detectionSignals(perKey.get(key) ?? {}) }); },
    all() { return Object.fromEntries(perKey); },
  };
}
```

**Acceptance criteria:** signals; detection; scope.

### M2 — Signaling

**Reference code (`src/lib/failures/signal.js`):**

```js
// Signal types: failure, degraded, recovered.
export const SIGNAL_TYPES = ["failure", "degraded", "recovered"];

// Signal propagation: signal to routing.
export function makeSignalBus() {
  const listeners = new Set();
  return {
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    emit(signal) { for (const fn of listeners) fn(signal); },
  };
}

// Signal persistence: signal duration.
export function makeSignalStore({ ttl = 60_000, now = Date.now } = {}) {
  const signals = new Map(); // key -> {type, at}
  return {
    set(key, type) { signals.set(key, { type, at: now() }); },
    get(key) {
      const s = signals.get(key);
      if (!s) return null;
      if (now() - s.at > ttl) { signals.delete(key); return null; }
      return s.type;
    },
    all() { return Object.fromEntries(signals); },
  };
}
```

**Acceptance criteria:** types; bus; persistence.

### M3 — Failure classification

**Reference code (`src/lib/failures/classify.js`):**

```js
// Failure types: network, auth, rate-limit, quality.
export const FAILURE_TYPES = ["network", "auth", "rate-limit", "quality"];

// Failure severity: critical, major, minor.
export const FAILURE_SEVERITY = { network: "critical", auth: "major", "rate-limit": "minor", quality: "major" };

export function classifyFailure({ error = null, status = 0 } = {}) {
  const msg = String(error ?? "").toLowerCase();
  if (status === 401 || status === 403 || msg.includes("auth")) return { type: "auth", severity: FAILURE_SEVERITY.auth };
  if (status === 429 || msg.includes("rate")) return { type: "rate-limit", severity: FAILURE_SEVERITY["rate-limit"] };
  if (status === 0 || msg.includes("network") || msg.includes("fetch")) return { type: "network", severity: FAILURE_SEVERITY.network };
  return { type: "quality", severity: FAILURE_SEVERITY.quality };
}

// Failure action: failover, cooldown, alert.
export function failureAction({ classification = {} } = {}) {
  const actions = { critical: ["failover", "alert"], major: ["failover"], minor: ["cooldown"] };
  return actions[classification.severity] ?? ["failover"];
}
```

**Acceptance criteria:** types; severity; action.

### M4 — Integration + tests

**Reference code (`src/lib/failures/integrate.js`):**

```js
// Routing integration: failure signals.
export function failureSignalFor({ detector, store, key } = {}) {
  const detection = detector.check(key);
  if (detection.failed) store.set(key, "failure");
  return { detection, signal: store.get(key) };
}

// Fail-open.
export function safeFailure(fn, fallback = null) {
  try { return fn(); } catch { return fallback; }
}
```

**Files touched:** `src/lib/failures/` (new: detect, signal, classify, integrate), `open-sse/handlers/chatCore.js` (failure hooks), dashboard failures page (new), `tests/unit/failures.test.js` (new).

**Acceptance criteria:** integration; fail-open; tests.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| False positives | Wrong failover | Signal tuning |
| Missed failures | Slow failover | Multiple signals |
| Signal noise | Confusion | Smoothing |
| Complexity | Confusion | Simple detection |

## Verification

- Unit: detectionSignals, detectFailure, makeDetector, makeSignalBus, makeSignalStore, classifyFailure, failureAction, failureSignalFor
- Manual: errors → detect → signal → classify → act
- Regression: `tests/__baseline__/verify-no-regression.mjs`