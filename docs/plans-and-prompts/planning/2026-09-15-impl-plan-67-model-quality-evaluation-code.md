# Implementation Plan 67 — Model Quality Evaluation — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #model-quality #evaluation #benchmarks #judges #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (existing eval harness referenced by plan 7 in `../research/9router/`; model registry in `open-sse/config/providerModels.js`; routing selection in `src/sse/handlers/chat.js`; cost tables from plan 45).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — run a small benchmark against two models; confirm scores persist and gate routing.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-67-model-quality-evaluation.md`, `../research/9router/46-branch-evaluation-and-cost-quality.md`, `../research/9router/impl-plan-63-capability-discovery-negotiation.md`.

## Scope

**In scope:** benchmark sets (rubric, code, reasoning) with per-benchmark config; evaluation pipeline (prompt → model → response → judge → score) with rubric/reference/LLM judges; quality history + trends per model; quality alerts on regression; quality-informed routing (scores in selection, minimum quality gates).
**Out of scope:** training/fine-tuning; full public-benchmark reproduction (sampled subsets preferred for cost).

## Milestones

### M1 — Benchmark sets + judges

**Reference code (`src/lib/eval/benchmarks.js`):**

```js
// Benchmark sets: sampled prompts with expected properties (not full public datasets).
export const DEFAULT_BENCHMARKS = {
  rubric_following: {
    prompts: [
      { id: "rf-1", prompt: "Explain WAL mode in 3 bullet points.", rubric: { maxBullets: 3, minBullets: 3 } },
      { id: "rf-2", prompt: "Reply with valid JSON only: {\"ok\":true}", rubric: { json: true } },
    ],
  },
  code_basic: {
    prompts: [
      { id: "cb-1", prompt: "Write a JS function add(a,b) returning the sum. Output code only.", rubric: { code: "add", mustContain: ["return"] } },
    ],
  },
};

export function getBenchmark(name, benchmarks = DEFAULT_BENCHMARKS) {
  const b = benchmarks[name];
  if (!b) throw new Error(`unknown benchmark: ${name}`);
  return b;
}
```

**Reference code (`src/lib/eval/judges.js`):**

```js
// Deterministic rubric judge (no LLM cost).
export function rubricJudge(promptSpec, response) {
  const r = promptSpec.rubric ?? {};
  const checks = [];
  if (r.json) {
    try { JSON.parse(response); checks.push({ name: "json", pass: true }); }
    catch { checks.push({ name: "json", pass: false }); }
  }
  if (r.maxBullets != null) {
    const bullets = (response.match(/^[-*]\s/gm) ?? []).length;
    checks.push({ name: "bullets", pass: bullets >= (r.minBullets ?? 0) && bullets <= r.maxBullets, value: bullets });
  }
  if (r.mustContain) {
    for (const needle of r.mustContain) checks.push({ name: `contains:${needle}`, pass: response.includes(needle) });
  }
  const score = checks.length ? checks.filter((c) => c.pass).length / checks.length : 1;
  return { judge: "rubric", score, checks };
}

// LLM judge via the gateway itself (bounded, optional).
export async function llmJudge({ callModel, prompt, response, criteria = "accuracy, completeness, clarity" }) {
  const judgePrompt = `Rate the response 0-1 on ${criteria}. Reply with only a number.\n\nPROMPT:\n${prompt}\n\nRESPONSE:\n${response}`;
  const out = await callModel(judgePrompt);
  const score = Number.parseFloat(String(out).match(/[\d.]+/)?.[0] ?? "0");
  return { judge: "llm", score: Number.isFinite(score) ? Math.min(1, Math.max(0, score)) : 0 };
}
```

**Acceptance criteria:** benchmarks registered; rubric judge deterministic; LLM judge optional + clamped.

### M2 — Evaluation pipeline

**Reference code (`src/lib/eval/pipeline.js`):**

```js
import { getBenchmark } from "./benchmarks.js";
import { rubricJudge } from "./judges.js";

// Run a benchmark against a model via an injected callModel (keeps this module testable).
export async function runEvaluation({ name, model, callModel, benchmarks, signal }) {
  const bench = getBenchmark(name, benchmarks);
  const results = [];
  for (const spec of bench.prompts) {
    if (signal?.aborted) break;
    const started = Date.now();
    let response = "";
    let error = null;
    try {
      response = await callModel(spec.prompt, { model });
    } catch (e) {
      error = e.message;
    }
    const judged = error ? { score: 0, checks: [] } : rubricJudge(spec, response);
    results.push({ promptId: spec.id, latencyMs: Date.now() - started, error, ...judged });
  }
  const scored = results.filter((r) => !r.error);
  return {
    name, model, at: new Date().toISOString(),
    score: scored.length ? scored.reduce((a, r) => a + r.score, 0) / scored.length : 0,
    samples: results.length, errors: results.length - scored.length,
    results,
  };
}
```

**Acceptance criteria:** pipeline runs each prompt; aggregates score; aborts on signal; errors counted.

### M3 — Quality tracking + alerts

**Reference code (migration `src/lib/db/migrations/20260915-quality.js` + repo):**

```js
export const up = (db) => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS quality_scores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      model TEXT NOT NULL,
      benchmark TEXT NOT NULL,
      score REAL NOT NULL,
      samples INTEGER NOT NULL,
      errors INTEGER NOT NULL DEFAULT 0,
      run_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_quality_model ON quality_scores (model, benchmark, run_at);
  `);
};
export const down = (db) => { db.exec("DROP TABLE IF EXISTS quality_scores"); };
```

```js
// src/lib/db/repos/qualityRepo.js
export async function recordQuality(db, run) {
  db.run(`INSERT INTO quality_scores (model, benchmark, score, samples, errors, run_at)
          VALUES (?, ?, ?, ?, ?, ?)`,
    [run.model, run.name, run.score, run.samples, run.errors, run.at]);
}
export async function qualityHistory(db, { model, benchmark, limit = 30 }) {
  return db.all(`SELECT score, samples, run_at FROM quality_scores
                 WHERE model = ? AND benchmark = ? ORDER BY id DESC LIMIT ?`, [model, benchmark, limit]);
}
```

```js
// src/lib/eval/trends.js
// Regression detection: latest score materially below trailing mean.
export function detectRegression(history, { dropThreshold = 0.1 } = {}) {
  if (history.length < 3) return null;
  const [latest, ...rest] = history; // newest first
  const mean = rest.reduce((a, h) => a + h.score, 0) / rest.length;
  const drop = mean - latest.score;
  if (drop < dropThreshold) return null;
  return { model: latest.model, drop: Number(drop.toFixed(3)), latest: latest.score, mean: Number(mean.toFixed(3)) };
}
```

**Acceptance criteria:** scores persisted; history query works; regression detection fires on drop.

### M4 — Routing integration + tests

**Reference code (`src/lib/eval/gate.js`):**

```js
// Quality gate: filter models below minimum score when a comparable alternative exists.
export function applyQualityGate(candidates, scoresByModel, { minScore = 0.6 } = {}) {
  const passing = candidates.filter((c) => (scoresByModel[c.model] ?? 1) >= minScore);
  return passing.length ? passing : candidates; // never starve
}

// Blend quality into a health/cost score for ordering.
export function qualityAdjustedScore(baseScore, quality, { weight = 0.3 } = {}) {
  const q = quality ?? 0.5;
  return baseScore * (1 - weight) + q * weight;
}
```

**Files touched:** `src/lib/eval/` (new: benchmarks, judges, pipeline, trends, gate), `src/lib/db/migrations/20260915-quality.js` (new), `src/lib/db/repos/qualityRepo.js` (new), `src/sse/handlers/chat.js` (quality gate integration), dashboard quality page (new), `tests/unit/quality-eval.test.js` (new).

**Acceptance criteria:** gate filters low-quality models; blended ordering available; dashboard shows trends.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Judge bias | Skewed scores | Multiple judges + deterministic rubric |
| Benchmark cost | Token spend | Sampled prompts; schedule off-peak |
| Quality drift | Silent regression | Trend tracking + alerts |
| Integration complexity | Routing surprises | Threshold-first rollout (gate off by default) |

## Verification

- Unit: benchmarks, rubricJudge, pipeline, detectRegression, gate
- Manual: run `rubric_following` on two models → compare scores; force a low score → gate excludes
- Regression: `tests/__baseline__/verify-no-regression.mjs`