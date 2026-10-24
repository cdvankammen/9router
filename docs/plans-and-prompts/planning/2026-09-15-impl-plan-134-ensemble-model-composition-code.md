# Implementation Plan 134 — Ensemble & Model Composition Routing — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #ensemble #composition #voting #parallel #aggregation #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (mixture of agents from plan 85; cost heuristics from plan 87 (`src/lib/cost/`); inference efficiency from plan 92 (`src/lib/local/`); sparse routing from plan 101 (`src/lib/sparse/`); executors in `open-sse/executors/*`).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — composition strategies; parallel dispatch; aggregation.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-134-ensemble-model-composition.md`, `../research/9router/impl-plan-85-mixture-of-agents.md`, `../research/9router/impl-plan-87-cost-heuristics.md`.

## Scope

**In scope:** composition strategies (voting majority on discrete, averaging continuous, weighted by quality/confidence, cascading best-of-N); parallel dispatch (fan-out to N models, per-model timeouts, aggregation, cost tracking); quality control (model diversity, inter-model agreement metrics, single-model fallback); executor integration + dashboard ensemble view.
**Out of scope:** MoA internals (plan 85); cost heuristics (plan 87).

## Milestones

### M1 — Composition strategies

**Reference code (`src/lib/ensemble/strategies.js`):**

```js
// Voting: majority vote on discrete outputs.
export function majorityVote(outputs) {
  const counts = new Map();
  for (const o of outputs) counts.set(o, (counts.get(o) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

// Averaging: average continuous outputs.
export function averageOutputs(outputs) {
  if (!outputs.length) return null;
  return outputs.reduce((a, b) => a + b, 0) / outputs.length;
}

// Weighted: weight by model quality/confidence.
export function weightedOutput(outputs, { weights = [] } = {}) {
  const total = weights.reduce((a, b) => a + b, 0);
  if (!total) return averageOutputs(outputs);
  return outputs.reduce((acc, o, i) => acc + o * (weights[i] ?? 0), 0) / total;
}

// Cascading: best-of-N selection.
export function bestOfN(outputs, { scores = [] } = {}) {
  if (!outputs.length) return null;
  const idx = scores.indexOf(Math.max(...scores));
  return outputs[idx] ?? outputs[0];
}
```

**Acceptance criteria:** four strategies.

### M2 — Parallel dispatch

**Reference code (`src/lib/ensemble/dispatch.js`):**

```js
// Dispatch: fan-out to N models.
export async function fanOut({ models, run, timeoutMs = 30_000 } = {}) {
  const results = await Promise.allSettled(models.map((m) =>
    Promise.race([
      run(m),
      new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), timeoutMs)),
    ])));
  return results.map((r, i) => ({
    model: models[i],
    ok: r.status === "fulfilled",
    output: r.status === "fulfilled" ? r.value : null,
    error: r.status === "rejected" ? r.reason?.message : null,
  }));
}

// Cost tracking: per-composition cost.
export function compositionCost(results, { costOf = () => 1 } = {}) {
  return results.reduce((a, r) => a + (r.ok ? costOf(r.model) : 0), 0);
}

// Timeout: per-model timeouts.
export function withTimeout(promise, ms) {
  return Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), ms))]);
}
```

**Acceptance criteria:** fan-out; timeouts; cost.

### M3 — Quality control

**Reference code (`src/lib/ensemble/quality.js`):**

```js
// Diversity: ensure model diversity.
export function diversityCheck(models, { families = {} } = {}) {
  const fams = new Set(models.map((m) => families[m] ?? m));
  return { diverse: fams.size >= Math.min(2, models.length), families: [...fams] };
}

// Agreement metrics: inter-model agreement.
export function agreement(outputs) {
  if (outputs.length < 2) return 1;
  const first = outputs[0];
  const same = outputs.filter((o) => o === first).length;
  return same / outputs.length;
}

// Fallback: single-model if ensemble fails.
export function fallbackToSingle({ results, primary = null } = {}) {
  const ok = results.find((r) => r.ok);
  return ok ? { source: "ensemble", output: ok.output } : { source: "single", output: primary };
}
```

**Acceptance criteria:** diversity; agreement; fallback.

### M4 — Integration + tests

**Reference code (`src/lib/ensemble/integrate.js`):**

```js
// Integration: full ensemble pipeline.
export async function runEnsemble({ models, run, strategy = "voting", weights = [], scores = [], timeoutMs } = {}) {
  const results = await fanOut({ models, run, timeoutMs });
  const outputs = results.filter((r) => r.ok).map((r) => r.output);
  if (!outputs.length) return { ok: false, reason: "all-failed", results };
  const combined = strategy === "voting" ? majorityVote(outputs)
    : strategy === "average" ? averageOutputs(outputs)
    : strategy === "weighted" ? weightedOutput(outputs, { weights })
    : bestOfN(outputs, { scores });
  return { ok: true, output: combined, results, cost: compositionCost(results) };
}

// Telemetry: ensemble view.
export function makeEnsembleTelemetry() {
  const events = [];
  return {
    record(evt) { events.push({ ...evt, at: Date.now() }); },
    report() {
      return {
        ensembles: events.length,
        avgCost: events.length ? events.reduce((a, e) => a + (e.cost ?? 0), 0) / events.length : 0,
        failures: events.filter((e) => !e.ok).length,
        avgAgreement: events.length ? events.reduce((a, e) => a + (e.agreement ?? 0), 0) / events.length : null,
      };
    },
  };
}
```

**Files touched:** `src/lib/ensemble/` (new: strategies, dispatch, quality, integrate), `open-sse/executors/` (parallel support), dashboard ensemble page (new), `tests/unit/ensemble.test.js` (new).

**Acceptance criteria:** pipeline; telemetry; tests.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Cost explosion | Expensive requests | Cost budgets |
| Latency increase | Slow responses | Timeout |
| Quality degradation | Worse than single | Diversity check |
| Dispatch complexity | Bugs | Simple fan-out |

## Verification

- Unit: majorityVote, averageOutputs, weightedOutput, bestOfN, fanOut, diversityCheck, runEnsemble
- Manual: 3-model vote; one times out → others still aggregate; all fail → single fallback
- Regression: `tests/__baseline__/verify-no-regression.mjs`