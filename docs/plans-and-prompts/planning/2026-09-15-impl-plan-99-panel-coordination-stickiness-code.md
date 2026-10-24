# Implementation Plan 99 — Panel Coordination & Stickiness Tradeoffs — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #panel #stickiness #tradeoffs #strategy-evaluation #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (MoA from plan 85 (`src/lib/moa/`); cascade coordination from plan 90 (`src/lib/cascade/`); calibration from plan 82 (`src/lib/calibration/`); session state from plan 68 (`src/lib/sessions/`)).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — run all three panel modes; confirm stickiness tradeoff weight; run A/B evaluation.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-99-panel-coordination-stickiness.md`, `../research/9router/impl-plan-90-cascade-coordination-strategy.md`, `../research/9router/impl-plan-85-mixture-of-agents.md`.

## Scope

**In scope:** panel coordination (parallel/sequential/hybrid modes, aggregator/voting/best-of-N merge, lifecycle start→collect→merge→finish, partial-failure handling); stickiness (key session+route+task-type, policies always/on-tool-use/on-multi-turn, time + availability expiry, configurable tradeoff weight vs load balancing); strategy evaluation (registry, A/B split, quality/cost/latency/success metrics, opt-in auto-promotion); combo integration + telemetry.
**Out of scope:** learned stickiness optimization; cross-instance panel state (plan 70).

## Milestones

### M1 — Panel coordinator

**Reference code (`src/lib/panel/coordinator.js`):**

```js
// Panel lifecycle: start → collect → merge → finish.
export async function runPanel({ mode = "parallel", members, request, callModel, merge, costCap = null } = {}) {
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
  } else { // hybrid: parallel groups in sequence
    results = [];
    for (const group of members) {
      const g = await Promise.allSettled(group.map((m) => callModel(request, { model: m })));
      results.push(...g);
    }
  }
  const fulfilled = results.filter((r) => r.status === "fulfilled").map((r) => r.value);
  if (!fulfilled.length) return { ok: false, reason: "all-members-failed", latencyMs: Date.now() - started };
  const merged = merge ? merge(fulfilled) : fulfilled[0];
  return { ok: true, merged, memberCount: members.length, fulfilled: fulfilled.length, latencyMs: Date.now() - started };
}

// Merge strategies: aggregator, voting, best-of-N.
export const MERGE = {
  bestOfN: (results, { scoreOf }) => results.sort((a, b) => scoreOf(b) - scoreOf(a))[0],
  voting: (results, { voteOf }) => {
    const counts = new Map();
    for (const r of results) { const v = voteOf(r); counts.set(v, (counts.get(v) ?? 0) + 1); }
    return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
  },
  aggregator: (results, { aggregate }) => aggregate(results),
};
```

**Acceptance criteria:** three modes; merge strategies; partial failure.

### M2 — Stickiness with tradeoffs

**Reference code (`src/lib/panel/sticky.js`):**

```js
// Stickiness with configurable tradeoff weight vs. load balancing.
const sticky = new Map(); // key -> { model, at, turns }
const TTL_MS = Number(process.env.PANEL_STICKY_TTL_MS ?? 20 * 60_000);

export function stickyKey({ sessionId, route, taskType }) {
  return `${sessionId}|${route}|${taskType ?? ""}`;
}

export function remember(key, model, now = Date.now()) {
  const s = sticky.get(key) ?? { model, at: now, turns: 0 };
  s.model = model; s.at = now; s.turns += 1;
  sticky.set(key, s);
}

// Tradeoff: stickiness weight vs. load balancing weight.
export function pickModel({ key, candidates, stickyWeight = 0.7, available = null, now = Date.now() } = {}) {
  const s = sticky.get(key);
  const fresh = s && now - s.at <= TTL_MS && (!available || available(s.model));
  if (!fresh) { if (s) sticky.delete(key); return candidates[0] ?? null; }
  if (Math.random() < stickyWeight && candidates.includes(s.model)) return s.model;
  return candidates[0] ?? null; // load-balance the rest
}

// Policies: always | on-tool-use | on-multi-turn.
export function shouldStick({ policy = "on-multi-turn", turns = 1, hasTools = false } = {}) {
  if (policy === "always") return true;
  if (policy === "on-tool-use") return hasTools;
  return turns > 1;
}

export function clearSticky(key) { sticky.delete(key); }
```

**Acceptance criteria:** keyed stickiness; tradeoff weight; policies; expiry.

### M3 — Strategy evaluation

**Reference code (`src/lib/panel/strategy.js`):**

```js
// Strategy registry + A/B evaluation with opt-in promotion.
export const PANEL_STRATEGIES = new Map();

export function registerPanelStrategy(name, fn) {
  PANEL_STRATEGIES.set(name, fn);
}

export function makePanelAB({ split = 0.5, minSample = 50, autoPromote = false } = {}) {
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
      const winner = ready ? (a.successRate > b.successRate ? "a" : b.successRate > a.successRate ? "b" : "tie") : null;
      return { a, b, ready, winner, promoted: autoPromote && winner && winner !== "tie" ? winner : null };
    },
  };
}
```

**Acceptance criteria:** registry; A/B; metrics; opt-in promotion.

### M4 — Integration + tests

**Reference code (`src/lib/panel/integrate.js`):**

```js
// Combo integration: panels as combo modes.
export function panelComboMode({ mode, members, merge }) {
  return { type: "panel", mode, members, merge };
}

// Telemetry: panel + stickiness metrics.
export function makePanelTelemetry() {
  const counts = new Map();
  let stickinessHits = 0, total = 0;
  return {
    record(mode, { stickyHit = false } = {}) {
      counts.set(mode, (counts.get(mode) ?? 0) + 1);
      total += 1; if (stickyHit) stickinessHits += 1;
    },
    report() {
      return { modes: Object.fromEntries(counts), stickinessRate: total ? stickinessHits / total : 0 };
    },
  };
}
```

**Files touched:** `src/lib/panel/` (new: coordinator, sticky, strategy, integrate), `src/sse/handlers/chat.js` (panel mode), `open-sse/config/panelConfig.js` (new), dashboard panel page (new), `tests/unit/panel.test.js` (new).

**Acceptance criteria:** panels as combo modes; stickiness tradeoff; evaluation; telemetry.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Panel cost | High spend | Cost caps |
| Merge failure | Bad output | Fallback to best |
| Stickiness imbalance | Uneven load | Tradeoff weight |
| Strategy noise | Wrong winner | Significance testing |

## Verification

- Unit: runPanel, MERGE, pickModel, shouldStick, makePanelAB
- Manual: parallel panel with dead member → partial merge; sticky weight 0.3 → more balancing
- Regression: `tests/__baseline__/verify-no-regression.mjs`