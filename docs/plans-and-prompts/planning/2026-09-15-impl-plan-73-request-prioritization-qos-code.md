# Implementation Plan 73 — Request Prioritization & QoS — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #qos #prioritization #queues #fairness #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (rate limiter in `custom-server.rate-limiter.js`; dispatch in `src/sse/handlers/chat.js`; serving policy from plan 18 research; load testing from plan 60).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — flood with best-effort requests while a critical request arrives; confirm priority + no starvation.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-73-request-prioritization-qos.md`, `../research/9router/impl-plan-24-rate-limiting.md`, `../research/9router/impl-plan-60-load-testing-capacity.md`.

## Scope

**In scope:** priority classes (critical, normal, best-effort) with configurable assignment (per-key, per-route, per-request); bounded per-priority queues with admission control; weighted priority scheduling with aging (no starvation); queue telemetry + overflow alerts.
**Out of scope:** distributed queues across cluster instances (plan 70); preemption of in-flight requests.

## Milestones

### M1 — Priority classes + config

**Reference code (`open-sse/config/qosConfig.js`):**

```js
export const PRIORITY_CLASSES = ["critical", "normal", "best-effort"];

export const DEFAULT_QOS = {
  classOrder: ["critical", "normal", "best-effort"],
  weights: { critical: 8, normal: 2, "best-effort": 1 },
  queueLimits: { critical: 50, normal: 200, "best-effort": 500 },
  agingMs: 30_000,          // after this wait, a request's effective priority rises
  defaultClass: "normal",
};

// Class assignment rules: first match wins.
export const CLASS_RULES = [
  { match: (req) => req.headers.get("x-priority") === "critical", cls: "critical" },
  { match: (req) => req.headers.get("x-priority") === "best-effort", cls: "best-effort" },
  { match: (req) => req.url.includes("/v1/chat/completions") && req.headers.get("x-api-key")?.startsWith("sk-critical-"), cls: "critical" },
];

export function assignClass(req, rules = CLASS_RULES, fallback = DEFAULT_QOS.defaultClass) {
  for (const r of rules) if (r.match(req)) return r.cls;
  return fallback;
}
```

**Acceptance criteria:** classes configurable; assignment rules first-match; default normal.

### M2 — Bounded queues + admission control

**Reference code (`src/lib/qos/queues.js`):**

```js
import { DEFAULT_QOS } from "../../open-sse/config/qosConfig.js";

export function makeQueues(config = DEFAULT_QOS) {
  const queues = new Map(config.classOrder.map((c) => [c, []]));
  const admitted = new Map(); // requestId -> { cls, at }

  return {
    // Admission control: reject when the class queue is full.
    admit(requestId, cls, now = Date.now()) {
      const q = queues.get(cls);
      if (!q) return { ok: false, reason: "unknown-class" };
      if (q.length >= config.queueLimits[cls]) return { ok: false, reason: "queue-full" };
      q.push(requestId);
      admitted.set(requestId, { cls, at: now });
      return { ok: true };
    },
    // Pop the next request: weighted priority with aging.
    next(now = Date.now()) {
      let best = null; let bestScore = -Infinity; let bestCls = null;
      for (const cls of config.classOrder) {
        const q = queues.get(cls);
        if (!q.length) continue;
        const head = q[0];
        const waitMs = now - admitted.get(head).at;
        const ageBoost = Math.min(1, waitMs / config.agingMs) * 2; // 0..2
        const score = config.weights[cls] + ageBoost;
        if (score > bestScore) { bestScore = score; best = head; bestCls = cls; }
      }
      if (best == null) return null;
      queues.get(bestCls).shift();
      admitted.delete(best);
      return { requestId: best, cls: bestCls, waitMs: now - admitted.get(best)?.at ?? 0 };
    },
    depth(cls) { return queues.get(cls)?.length ?? 0; },
    sizes() { return Object.fromEntries([...queues].map(([c, q]) => [c, q.length])); },
  };
}
```

**Acceptance criteria:** admission rejects full queues; weighted scheduling; aging raises stale requests.

### M3 — Fairness + telemetry

**Reference code (`src/lib/qos/fairness.js`):**

```js
// Starvation guard: report the longest wait per class.
export function waitStats(queues, admitted, now = Date.now()) {
  const out = {};
  for (const [cls, q] of queues) {
    const waits = q.map((id) => now - (admitted.get(id)?.at ?? now));
    out[cls] = { depth: q.length, maxWaitMs: waits.length ? Math.max(...waits) : 0, avgWaitMs: waits.length ? Math.round(waits.reduce((a, b) => a + b, 0) / waits.length) : 0 };
  }
  return out;
}

// Overflow alert: any class above its limit (shouldn't happen — admission guards).
export function overflowCheck(sizes, limits) {
  return Object.entries(sizes)
    .filter(([cls, n]) => n > limits[cls])
    .map(([cls, n]) => ({ cls, depth: n, limit: limits[cls] }));
}
```

**Acceptance criteria:** wait stats per class; overflow detection; no starvation (aging).

### M4 — Dispatch integration + tests

**Reference code (`src/lib/qos/dispatch.js`):**

```js
import { assignClass } from "../../open-sse/config/qosConfig.js";
import { makeQueues } from "./queues.js";

// Thin wrapper used by src/sse/handlers/chat.js.
export function makeDispatcher(config) {
  const queues = makeQueues(config);
  return {
    submit(req, requestId) {
      const cls = assignClass(req);
      return queues.admit(requestId, cls);
    },
    next() { return queues.next(); },
    stats() { return waitStats(queues.sizes(), queues.admitted, Date.now()); },
  };
}
```

**Files touched:** `src/lib/qos/` (new: queues, fairness, dispatch), `open-sse/config/qosConfig.js` (new), `src/sse/handlers/chat.js` (dispatch integration), `src/lib/db/repos/qosRepo.js` (new: telemetry), `tests/unit/qos.test.js` (new).

**Acceptance criteria:** dispatch submits/nexts; stats visible; overflow alertable.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Starvation | Best-effort never served | Aging boost |
| Queue buildup | Memory growth | Admission control + limits |
| Priority abuse | Everyone critical | Class assignment rules + key checks |
| Complexity | Scheduling bugs | Simple weighted scheme first |

## Verification

- Unit: assignClass, admit/next, aging, waitStats
- Manual: flood best-effort → critical request jumps queue; long-wait best-effort eventually served
- Regression: `tests/__baseline__/verify-no-regression.mjs`