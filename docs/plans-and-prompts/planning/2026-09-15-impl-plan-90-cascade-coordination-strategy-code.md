# Implementation Plan 90 — Cascade Coordination & Strategy Evaluation — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #cascade #panel #stickiness #strategy-evaluation #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (cascade fallback from plan 2 research; MoA from plan 85; stickiness from plan 80; A/B from plan 82; session state from plan 68; combo modes in `src/sse/handlers/chat.js`).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — run a retrieve→generate→verify cascade; run a parallel panel; confirm stickiness expiry.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-90-cascade-coordination-strategy.md`, `../research/9router/impl-plan-85-mixture-of-agents.md`, `../research/9router/impl-plan-82-router-calibration-confidence.md`.

## Scope

**In scope:** cascade coordination (stages retrieve→generate→verify→refine with structured handoff, per-stage fallback, stage budgets); panel coordination (parallel/sequential/hybrid modes, aggregator/voting merge, lifecycle, partial-failure handling); stickiness (key session+route+task, policy always/on-tool-use/on-multi-turn, time + availability expiry, load-balance tradeoff config); strategy evaluation (registry of named strategies, A/B traffic split, metrics quality/cost/latency/success, promotion); combo integration + telemetry.
**Out of scope:** learned strategy optimization (explicit strategies + A/B only); cross-instance cascade state (plan 70).

## Milestones

### M1 — Cascade orchestrator

**Reference code (`src/lib/cascade/orchestrator.js`):**

```js
// Cascade: ordered stages with structured handoff.
export async function runCascade({ stages, initialInput, callStage, budgets = {} }) {
  let input = initialInput;
  const trail = [];
  const started = Date.now();
  for (const stage of stages) {
    const budget = budgets[stage.name] ?? 15_000;
    const t0 = Date.now();
    try {
      const out = await callStage(stage, input);
      trail.push({ stage: stage.name, ok: true, latencyMs: Date.now() - t0, output: out });
      input = out; // structured handoff
    } catch (err) {
      trail.push({ stage: stage.name, ok: false, latencyMs: Date.now() - t0, error: err.message });
      // Per-stage fallback: skip to next stage with input unchanged.
      if (!stage.fallbackOnError) break;
    }
    if (Date.now() - started > (budgets.total ?? 60_000)) break;
  }
  return { output: input, trail, totalMs: Date.now() - started };
}

// Stage definitions for retrieve → generate → verify → refine.
export const DEFAULT_CASCADE = [
  { name: "retrieve", fallbackOnError: true },
  { name: "generate", fallbackOnError: false },
  { name: "verify", fallbackOnError: true },
  { name: "refine", fallbackOnError: true },
];
```

**Acceptance criteria:** stages run in order; handoff passes output; per-stage fallback; budgets.

### M2 — Panel coordinator

**Reference code (`src/lib/cascade/panel.js`):**

```js
// Panel modes: parallel | sequential | hybrid.
export async function runPanel({ mode, members, request, callModel, merge }) {
  const started = Date.now();
  let results;
  if (mode === "parallel") {
    results = await Promise.allSettled(members.map((m) => callModel(request, { model: m })));
  } else if (mode === "sequential") {
    results = [];
    let ctx = request;
    for (const m of members) {
      try { ctx = await callModel(ctx, { model: m }); results.push({ status: "fulfilled", value: ctx }); }
      catch (e) { results.push({ status: "rejected", reason: e }); }
    }
  } else { // hybrid: parallel proposers + sequential refinement
    const proposals = await Promise.allSettled(members.slice(0, -1).map((m) => callModel(request, { model: m })));
    const ok = proposals.filter((p) => p.status === "fulfilled").map((p) => p.value);
    const final = ok.length ? await callModel(ok.join("\n---\n"), { model: members.at(-1) }) : null;
    results = [...proposals, { status: final ? "fulfilled" : "rejected", value: final }];
  }
  const fulfilled = results.filter((r) => r.status === "fulfilled").map((r) => r.value);
  if (!fulfilled.length) return { ok: false, reason: "all-members-failed", latencyMs: Date.now() - started };
  const merged = merge ? merge(fulfilled) : fulfilled[0];
  return { ok: true, merged, memberCount: members.length, fulfilled: fulfilled.length, latencyMs: Date.now() - started };
}
```

**Acceptance criteria:** three modes work; partial results handled; merge applied.

### M3 — Stickiness

**Reference code (`src/lib/cascade/sticky.js`):**

```js
// Stickiness: session + route + task-type key, with expiry + availability.
const sticky = new Map(); // key -> { model, at }
const TTL_MS = Number(process.env.CASCADE_STICKY_TTL_MS ?? 20 * 60_000);

export function stickyKey({ sessionId, route, taskType }) {
  return `${sessionId}|${route}|${taskType ?? ""}`;
}

export function remember(key, model, now = Date.now()) {
  sticky.set(key, { model, at: now });
}
export function stickyModel(key, { now = Date.now(), available = null } = {}) {
  const s = sticky.get(key);
  if (!s) return null;
  if (now - s.at > TTL_MS) { sticky.delete(key); return null; }
  if (available && !available(s.model)) { sticky.delete(key); return null; }
  return s.model;
}
export function clearSticky(key) { sticky.delete(key); }

// Policy: when to apply stickiness.
export function shouldStick({ policy = "on-multi-turn", turns = 1, hasTools = false }) {
  if (policy === "always") return true;
  if (policy === "on-tool-use") return hasTools;
  return turns > 1; // on-multi-turn
}
```

**Acceptance criteria:** keyed stickiness; TTL + availability expiry; policy gates.

### M4 — Strategy evaluation + integration + tests

**Reference code (`src/lib/cascade/strategy.js`):**

```js
// Strategy registry + A/B evaluation.
export const STRATEGY_REGISTRY = new Map(); // name -> strategy fn

export function registerStrategy(name, fn) {
  STRATEGY_REGISTRY.set(name, fn);
}

export function makeStrategyAB({ split = 0.5, minSample = 50 } = {}) {
  const counts = { a: { n: 0, success: 0, cost: 0, latency: 0 }, b: { n: 0, success: 0, cost: 0, latency: 0 } };
  return {
    assign() { return Math.random() < split ? "a" : "b"; },
    record(variant, { success, cost = 0, latencyMs = 0 }) {
      const c = counts[variant];
      c.n += 1; if (success) c.success += 1; c.cost += cost; c.latency += latencyMs;
    },
    result() {
      const summarize = (c) => ({
        n: c.n, successRate: c.n ? c.success / c.n : 0,
        avgCost: c.n ? c.cost / c.n : 0, avgLatency: c.n ? c.latency / c.n : 0,
      });
      const a = summarize(counts.a), b = summarize(counts.b);
      const ready = counts.a.n >= minSample && counts.b.n >= minSample;
      return { a, b, ready, winner: ready ? (a.successRate > b.successRate ? "a" : b.successRate > a.successRate ? "b" : "tie") : null };
    },
  };
}
```

**Files touched:** `src/lib/cascade/` (new: orchestrator, panel, sticky, strategy), `open-sse/config/cascadeConfig.js` (new), `src/sse/handlers/chat.js` (cascade/panel modes), dashboard cascade page (new), `tests/unit/cascade.test.js` (new).

**Acceptance criteria:** cascades/panels as combo modes; stickiness enforced; A/B evaluation runs.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Cascade latency | Slow responses | Stage budgets |
| Panel cost | High spend | Cost caps |
| Stickiness imbalance | Uneven load | Expiry + load-balance tradeoff |
| Strategy noise | Wrong winner | Significance testing |

## Verification

- Unit: runCascade, runPanel, stickyModel, shouldStick, makeStrategyAB
- Manual: cascade with failing stage → fallback; panel with dead member → partial merge
- Regression: `tests/__baseline__/verify-no-regression.mjs`