# Implementation Plan 07 — Routing Evaluation Harness — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #eval-harness #routerbench #aiq #cost-quality-plane #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (imports, function signatures, `src/lib/usageDb.js`, DB adapter, script conventions in `scripts/`).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — run the app, hit the endpoints, check the DB, confirm acceptance criteria.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-07-eval-harness.md`, `../research/9router/46-branch-evaluation-and-cost-quality.md`

## Scope

**In scope:** eval dataset (public benchmarks + usageDb + synthetic); eval runner (replay + live modes); Zero/Oracle baselines; c-q curves + AIQ; dashboard visualization.
**Out of scope:** full benchmark corpus download (use subsets); judge calibration (plan 2).

## Milestones

### M1 — Eval dataset builder

**Reference code (`scripts/build-eval-dataset.mjs`):**

```js
// Sources: MMLU subset, MT-Bench subset, GSM8K subset, HumanEval subset,
// 9Router usageDb (anonymized), synthetic task-type samples.
// Format: (prompt, task_type, expected_quality_metric) tuples.
export async function buildEvalDataset({ perTask = 200 } = {}) {
  const dataset = [];
  const tasks = ["code:generation", "code:debugging", "math", "reasoning", "summarization", "translation", "general_chat"];
  for (const task of tasks) {
    const samples = await loadTaskSamples(task, perTask);
    dataset.push(...samples);
  }
  return dataset; // [{ prompt, task_type, expected_quality }]
}
```

**Acceptance criteria:** dataset builder produces 1k–10k samples; anonymized; per-task coverage.

### M2 — Eval runner (replay + live)

**Reference code (`scripts/run-routing-eval.mjs`):**

```js
// For each strategy: run dataset through strategy; record cost/latency/quality.
export async function runEval({ strategy, dataset, mode = "replay" }) {
  const results = [];
  for (const sample of dataset) {
    if (mode === "replay") {
      // Replay from logs (no API cost)
      const logged = await findLoggedRequest(sample.prompt);
      results.push({ ...sample, cost: logged?.cost, latency: logged?.latency, quality: logged?.status === "success" ? 1 : 0 });
    } else {
      // Live mode: real API calls
      const res = await executeStrategy(strategy, sample);
      results.push({ ...sample, cost: res.cost, latency: res.latency, quality: res.quality });
    }
  }
  return results;
}
```

**Acceptance criteria:** replay mode works (no API cost); live mode works; per-request cost/latency/quality recorded.

### M3 — Baselines (Zero + Oracle) + AIQ

**Reference code (`open-sse/services/zeroRouter.js`):**

```js
// Zero router: probabilistic mix maximizing expected quality at cost c (RouterBench NDCH).
export function zeroRouter(candidates, costBudget) {
  // Sort by quality/cost ratio; allocate probability mass to maximize expected quality within budget.
  const sorted = [...candidates].sort((a, b) => (b.quality / b.cost) - (a.quality / a.cost));
  const chosen = [];
  let remaining = costBudget;
  for (const c of sorted) {
    if (c.cost <= remaining) { chosen.push(c); remaining -= c.cost; }
  }
  return chosen;
}
```

**Reference code (`open-sse/services/oracleRouter.js`):**

```js
// Oracle: perfect quality prediction (upper bound).
export function oracleRouter(candidates, taskType) {
  return candidates.filter((c) => c.quality === 1).sort((a, b) => a.cost - b.cost)[0];
}
```

**AIQ computation:**

```js
// AIQ = (1/(c_max - c_min)) * ∫ R_θ dc — area under cost-quality curve.
export function computeAIQ(results) {
  const sorted = [...results].sort((a, b) => a.cost - b.cost);
  const cMin = sorted[0].cost, cMax = sorted[sorted.length - 1].cost;
  let area = 0;
  for (let i = 1; i < sorted.length; i++) {
    const dc = sorted[i].cost - sorted[i - 1].cost;
    const avgQ = (sorted[i].quality + sorted[i - 1].quality) / 2;
    area += dc * avgQ;
  }
  return area / (cMax - cMin || 1);
}
```

**Acceptance criteria:** Zero/Oracle baselines implemented; AIQ computed correctly.

### M4 — Dashboard + tests

**Files touched:**
- Dashboard: eval page (c-q plane scatter, AIQ bar chart, per-task breakdown)
- `tests/unit/eval-harness.test.js` (new)

**Acceptance criteria:** dashboard visualizes; unit tests pass.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Public benchmark data | Large downloads | Use subsets |
| Replay fidelity | Logged data may lack quality labels | Use status + latency as proxy |
| Judge calibration | Cascade viability depends on it | Plan 2 calibration gate |

## Verification

- Unit: AIQ computation, Zero/Oracle baselines
- Manual: run eval → check dashboard
- Regression: `tests/__baseline__/verify-no-regression.mjs`