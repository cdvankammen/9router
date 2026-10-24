# Implementation Plan 179 — Fallback Chains & Trigger Management — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #fallback-chains #triggers #failover #health #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (cascade fallback from plan 2; error hardening from plan 9; escalation depth from plan 137; cascade collapse from plan 152 (`src/lib/collapse/`)).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — chain model; triggers; health.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-179-fallback-chains-triggers.md`, `../research/9router/impl-plan-2-cascade-fallback.md`, `../research/9router/impl-plan-9-error-hardening.md`.

## Scope

**In scope:** chain model (definition, depth, scope); trigger management (types, thresholds, priority); chain health (metrics, alerts, reports).
**Out of scope:** retry counts/backoff (plan 180); cooldown states (plan 181).

## Milestones

### M1 — Chain model

**Reference code (`src/lib/chains/model.js`):**

```js
// Chain definition: ordered list of providers/models.
export function makeChain({ id, steps = [], maxDepth = 5, scope = "request" } = {}) {
  return {
    id,
    steps, // [{provider, model}]
    maxDepth,
    scope, // request | user | org
    // Depth: current position.
    depth() { return steps.length; },
    // Add step.
    add(step) { if (steps.length < maxDepth) steps.push(step); return this; },
    // Next step after failure.
    next(after) {
      const idx = steps.findIndex((s) => s.provider === after?.provider && s.model === after?.model);
      return steps[idx + 1] ?? null;
    },
  };
}

// Chain registry.
export function makeChainRegistry() {
  const chains = new Map();
  return {
    add(chain) { chains.set(chain.id, chain); },
    get(id) { return chains.get(id) ?? null; },
    all() { return [...chains.values()]; },
  };
}
```

**Acceptance criteria:** chain; registry; depth.

### M2 — Trigger management

**Reference code (`src/lib/chains/triggers.js`):**

```js
// Trigger types: error, timeout, quality, cost.
export const TRIGGER_TYPES = ["error", "timeout", "quality", "cost"];

// Trigger thresholds: per-trigger thresholds.
export const DEFAULT_TRIGGERS = { error: 1, timeout: 1, quality: 0.4, cost: 0.5 };

// Trigger evaluation.
export function evaluateTrigger({ type, value, thresholds = DEFAULT_TRIGGERS } = {}) {
  const t = thresholds[type] ?? 1;
  if (type === "quality") return value < t; // quality below threshold
  return value >= t; // error/timeout/cost above threshold
}

// Trigger priority: precedence.
export const TRIGGER_PRIORITY = ["error", "timeout", "quality", "cost"];

export function firstTrigger({ signals = {}, thresholds = DEFAULT_TRIGGERS } = {}) {
  for (const type of TRIGGER_PRIORITY) {
    if (signals[type] !== undefined && evaluateTrigger({ type, value: signals[type], thresholds })) return type;
  }
  return null;
}
```

**Acceptance criteria:** types; thresholds; priority.

### M3 — Chain health

**Reference code (`src/lib/chains/health.js`):**

```js
// Chain metrics: depth usage, trigger rates.
export function makeChainHealth() {
  const usage = new Map(); // chainId -> {requests, maxDepth, triggers: {}}
  return {
    record(chainId, { depth = 1, trigger = null } = {}) {
      const u = usage.get(chainId) ?? { requests: 0, maxDepth: 0, triggers: {} };
      u.requests += 1;
      u.maxDepth = Math.max(u.maxDepth, depth);
      if (trigger) u.triggers[trigger] = (u.triggers[trigger] ?? 0) + 1;
      usage.set(chainId, u);
    },
    get(chainId) { return usage.get(chainId) ?? { requests: 0, maxDepth: 0, triggers: {} }; },
    // Alerts: excessive depth, frequent triggers.
    alerts({ maxDepth = 3, triggerRate = 0.5 } = {}) {
      return [...usage.entries()].flatMap(([id, u]) => {
        const out = [];
        if (u.maxDepth > maxDepth) out.push({ chainId: id, alert: "excessive-depth", maxDepth: u.maxDepth });
        const rate = u.requests ? Object.values(u.triggers).reduce((a, b) => a + b, 0) / u.requests : 0;
        if (rate > triggerRate) out.push({ chainId: id, alert: "frequent-triggers", rate });
        return out;
      });
    },
    // Reports: chain usage patterns.
    report() { return Object.fromEntries(usage); },
  };
}
```

**Acceptance criteria:** metrics; alerts; reports.

### M4 — Integration + tests

**Reference code (`src/lib/chains/integrate.js`):**

```js
// Routing integration: chain hooks.
export function chainStep({ chain, current = null } = {}) {
  return chain.next(current);
}

// Fail-open.
export function safeChain(fn, fallback = null) {
  try { return fn(); } catch { return fallback; }
}
```

**Files touched:** `src/lib/chains/` (new: model, triggers, health, integrate), `open-sse/handlers/chatCore.js` (chain hooks), dashboard chains page (new), `tests/unit/chains.test.js` (new).

**Acceptance criteria:** integration; fail-open; tests.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Chain too long | Latency | Depth limits |
| Trigger noise | Wrong fallbacks | Threshold tuning |
| Chain exhaustion | No fallback | Degraded mode |
| Complexity | Confusion | Simple chains |

## Verification

- Unit: makeChain, makeChainRegistry, evaluateTrigger, firstTrigger, makeChainHealth, chainStep
- Manual: chain → trigger → next step → health
- Regression: `tests/__baseline__/verify-no-regression.mjs`