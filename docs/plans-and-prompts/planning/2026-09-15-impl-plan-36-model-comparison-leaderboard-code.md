# Implementation Plan 36 — Model Comparison & Leaderboard — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #model-comparison #leaderboard #llm-judge #mirroring #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (imports, function signatures, `src/lib/usageDb.js`, `open-sse/services/trafficMirror.js` from plan 05, `src/lib/db/` conventions, dashboard conventions).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — run the app, run a comparison, confirm acceptance criteria.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-36-model-comparison-leaderboard.md`, `../research/9router/46-branch-evaluation-and-cost-quality.md` (eval tie-in)

## Scope

**In scope:** side-by-side comparison engine (same prompt → multiple models); scoring (LLM-judge + rubric, cost, latency); leaderboard (quality/cost/latency/combined; filters task type/family/provider; time windows); real-traffic comparison via opt-in mirroring + sampling; eval harness integration; report export.
**Out of scope:** human annotation UI; model training.

## Milestones

### M1 — Comparison engine

**Reference code (`src/lib/comparison/engine.js`):**

```js
// Side-by-side: same prompt to multiple models; collect outputs.
export async function runComparison({ prompt, models, params = {} }) {
  const results = [];
  for (const model of models) {
    const start = performance.now();
    try {
      const res = await executeModel(model, { ...params, messages: [{ role: "user", content: prompt }] });
      results.push({
        model,
        ok: true,
        output: res.output,
        latencyMs: performance.now() - start,
        costUsd: res.cost,
        tokens: res.usage,
      });
    } catch (err) {
      results.push({ model, ok: false, error: err.message, latencyMs: performance.now() - start });
    }
  }
  return results;
}
```

**Acceptance criteria:** same prompt → all models; latency/cost captured; errors isolated.

### M2 — Scoring (LLM-judge + rubric)

**Reference code (`src/lib/comparison/scoring.js`):**

```js
// LLM-judge: rubric-based scoring by a judge model.
export const DEFAULT_RUBRIC = {
  correctness: { weight: 0.5, prompt: "Is the answer correct and complete?" },
  helpfulness: { weight: 0.3, prompt: "Is the answer helpful and clear?" },
  style: { weight: 0.2, prompt: "Is the answer well-written?" },
};

export async function scoreWithJudge(output, { rubric = DEFAULT_RUBRIC, judgeModel = "gpt-4o" } = {}) {
  const criteria = Object.entries(rubric)
    .map(([name, c]) => `${name} (weight ${c.weight}): ${c.prompt}`)
    .join("\n");
  const res = await executeModel(judgeModel, {
    messages: [
      { role: "system", content: "Score the following model output 1-10 per criterion. Return JSON: {\"criterion\": score}." },
      { role: "user", content: `Criteria:\n${criteria}\n\nOutput:\n${output}` },
    ],
    temperature: 0,
  });
  const scores = JSON.parse(res.output);
  const total = Object.entries(rubric).reduce((s, [name, c]) => s + (scores[name] ?? 0) * c.weight, 0);
  return { scores, total: total / 10 }; // normalize to 0-1
}

// Cost/latency normalization for combined score.
export function combinedScore({ quality, costUsd, latencyMs }) {
  const costScore = 1 / (1 + costUsd * 100); // cheaper = closer to 1
  const latencyScore = 1 / (1 + latencyMs / 1000);
  return { quality, costScore, latencyScore, combined: quality * 0.5 + costScore * 0.25 + latencyScore * 0.25 };
}
```

**Acceptance criteria:** judge scoring works; combined score computed.

### M3 — Leaderboard + real-traffic comparison

**Reference code (`src/lib/db/repos/comparisonRepo.js`):**

```js
export async function saveComparisonResult(result) {
  const db = await getAdapter();
  await db.run(`
    INSERT INTO comparison_results (id, prompt_hash, model, quality, cost_usd, latency_ms, task_type, family, provider, timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [crypto.randomUUID(), result.promptHash, result.model, result.quality, result.costUsd, result.latencyMs, result.taskType, result.family, result.provider, Date.now()]);
}

export async function leaderboard({ taskType, family, provider, windowDays = 30, sortBy = "combined" } = {}) {
  const db = await getAdapter();
  const since = Date.now() - windowDays * 86_400_000;
  const where = ["timestamp >= ?"];
  const params = [since];
  if (taskType) { where.push("task_type = ?"); params.push(taskType); }
  if (family) { where.push("family = ?"); params.push(family); }
  if (provider) { where.push("provider = ?"); params.push(provider); }
  const rows = await db.all(`
    SELECT model, AVG(quality) as quality, AVG(cost_usd) as cost, AVG(latency_ms) as latency, COUNT(*) as samples
    FROM comparison_results WHERE ${where.join(" AND ")}
    GROUP BY model HAVING samples >= 5
  `, ...params);
  return rows.map((r) => ({ ...r, combined: combinedScore(r).combined }))
    .sort((a, b) => (sortBy === "cost" ? a.cost - b.cost : sortBy === "latency" ? a.latency - b.latency : b.combined - a.combined));
}
```

**Real-traffic comparison (opt-in mirroring + sampling):**

```js
// Reuse plan 05 mirroring: sample real requests, compare mirror outputs.
export async function sampleRealTraffic({ sampleRate = 0.01, models } = {}) {
  // On sampled requests: run comparison with the same prompt across models.
  // Results flow into comparison_results with task_type from classification.
}
```

**Acceptance criteria:** leaderboard queries work; real-traffic sampling feeds results.

### M4 — API + dashboard + tests

**Reference code (`src/app/api/v1/comparison/route.js`):**

```js
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const params = Object.fromEntries(searchParams);
  const board = await leaderboard(params);
  return Response.json({ leaderboard: board });
}

export async function POST(req) {
  const { prompt, models, params } = await req.json();
  const results = await runComparison({ prompt, models, params });
  const scored = await Promise.all(results.filter((r) => r.ok).map(async (r) => ({
    ...r,
    ...(await scoreWithJudge(r.output)),
  })));
  for (const s of scored) await saveComparisonResult(s);
  return Response.json({ results: scored });
}
```

**Files touched:** dashboard comparison page (run comparison, leaderboard with filters, report export CSV), `tests/unit/comparison.test.js` (new).

**Acceptance criteria:** API works; dashboard + export; tests pass.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Judge cost | Judge on subset; cache |
| Judge bias | Rubric + multiple judges |
| Mirroring cost | Sample rate + opt-in |
| Sparse data | Minimum samples (5) |

## Verification

- Unit: engine, scoring, leaderboard
- Manual: run comparison → verify leaderboard + export
- Regression: `tests/__baseline__/verify-no-regression.mjs`