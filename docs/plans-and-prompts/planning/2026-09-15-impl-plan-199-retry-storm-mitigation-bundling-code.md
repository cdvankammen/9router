# Implementation Plan 199 — Retry Storm Mitigation & Bundling — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #retry-storm #bundling #throttle #amplification #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (retry amplification from plan 138; fallback retry semantics from plan 23; storm protection from plan 105; rate limiting from plan 187).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — detection; response; bundling.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-199-retry-storm-mitigation-bundling.md`, `../research/9router/impl-plan-138-retry-amplification.md`, `../research/9router/impl-plan-23-fallback-retry-semantics.md`.

## Scope

**In scope:** storm detection (signals, detection, classification); storm response (throttle, queue, priority); retry bundling (coalesce, scope, window).
**Out of scope:** retry counts/backoff (plan 180); rate limiting (plan 187).

## Milestones

### M1 — Storm detection

**Reference code (`src/lib/storms/detect.js`):**

```js
// Storm signals: retry rate spikes, amplification.
export function stormSignals({ retries = 0, requests = 1, baseline = 0.1 } = {}) {
  const rate = requests ? retries / requests : 0;
  return { rate, amplification: baseline ? rate / baseline : 0 };
}

// Storm detection: threshold-based detection.
export function detectStorm({ signals = {}, thresholds = { rate: 0.5, amplification: 3 } } = {}) {
  if (signals.rate >= thresholds.rate || signals.amplification >= thresholds.amplification) return { storm: true, ...signals };
  return { storm: false, ...signals };
}

// Storm classification: minor/major/severe.
export function classifyStorm({ signals = {}, levels = [{ name: "minor", rate: 0.5 }, { name: "major", rate: 0.7 }, { name: "severe", rate: 0.9 }] } = {}) {
  const level = levels.find((l) => signals.rate >= l.rate);
  return level?.name ?? "none";
}
```

**Acceptance criteria:** signals; detection; classification.

### M2 — Storm response

**Reference code (`src/lib/storms/respond.js`):**

```js
// Storm throttle: throttle during storm.
export function makeThrottle({ maxRate = 10, window = 1000, now = Date.now } = {}) {
  const timestamps = [];
  return {
    // allow: true if under rate.
    allow() {
      const cutoff = now() - window;
      while (timestamps.length && timestamps[0] < cutoff) timestamps.shift();
      if (timestamps.length >= maxRate) return false;
      timestamps.push(now());
      return true;
    },
  };
}

// Storm queue: queue during storm.
export function makeStormQueue() {
  const queue = [];
  return {
    enqueue(item) { queue.push(item); },
    dequeue() { return queue.shift() ?? null; },
    size() { return queue.length; },
  };
}

// Storm priority: priority classes during storm.
export function priorityClass({ item = {}, classes = ["high", "normal", "low"] } = {}) {
  return item.priority ?? "normal";
}
```

**Acceptance criteria:** throttle; queue; priority.

### M3 — Retry bundling

**Reference code (`src/lib/storms/bundle.js`):**

```js
// Bundling: coalesce identical retries.
export function makeBundler({ window = 100, now = Date.now } = {}) {
  const pending = new Map(); // key -> {count, at}
  return {
    // bundle: coalesce by key.
    bundle(key) {
      const p = pending.get(key);
      if (p && now() - p.at < window) { p.count += 1; return { coalesced: true, count: p.count }; }
      pending.set(key, { count: 1, at: now() });
      return { coalesced: false, count: 1 };
    },
    // Bundle scope: per-request, per-key.
    scope(key) { return key; },
    // Bundle window: bundling window.
    window() { return window; },
  };
}

// Bundle flush: emit coalesced retry.
export function flushBundle({ bundler, key, emit = () => {} } = {}) {
  const p = bundler.pending?.get(key);
  if (p) { emit({ key, count: p.count }); bundler.pending?.delete(key); }
}
```

**Acceptance criteria:** bundling; scope; window.

### M4 — Integration + tests

**Reference code (`src/lib/storms/integrate.js`):**

```js
// Retry integration: storm hooks.
export function stormGuard({ detector, throttle, bundler, key, retry = null } = {}) {
  const detection = detector;
  if (detection.storm && !throttle.allow()) return { allowed: false, reason: "throttled" };
  const b = bundler.bundle(key);
  return { allowed: true, coalesced: b.coalesced, retry };
}

// Fail-open.
export function safeStorm(fn, fallback = null) {
  try { return fn(); } catch { return fallback; }
}
```

**Files touched:** `src/lib/storms/` (new: detect, respond, bundle, integrate), `open-sse/handlers/chatCore.js` (storm hooks), dashboard storm page (new), `tests/unit/storms.test.js` (new).

**Acceptance criteria:** integration; fail-open; tests.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Missed storms | Amplification | Multiple signals |
| False alarms | Lost retries | Threshold tuning |
| Bundle delay | Slow retries | Window bounds |
| Complexity | Confusion | Simple rules |

## Verification

- Unit: stormSignals, detectStorm, classifyStorm, makeThrottle, makeStormQueue, priorityClass, makeBundler, flushBundle, stormGuard
- Manual: spike → detect → throttle → bundle
- Regression: `tests/__baseline__/verify-no-regression.mjs`