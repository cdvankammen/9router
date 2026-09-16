# Implementation Plan 01 — Learned Routing (RouteLLM-style) — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #learned-routing #routellm #win-probability #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (imports, function signatures, DB adapter API, settings shape, `open-sse/services/smartRouter.js` existence — research says it may be MISSING and must be recreated).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — run the app, hit the endpoints, check the DB, confirm acceptance criteria.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-01-learned-routing.md`, `../research/9router/41-branch-learned-routing.md`, `../research/9router/39-binary-tree-expansion-master-plan.md`

## Scope

**In scope:** win-probability predictor trained on 9Router's own usage data (RouteLLM approach); MF router first, BERT/KNN later; threshold calibration; training script + dashboard trigger.
**Out of scope:** online learning; multi-node training; GPU training.

## Milestones

### M1 — Recreate `open-sse/services/smartRouter.js` (if missing)

**Reference code (sketch — verify existence first):**

```js
// open-sse/services/smartRouter.js — if MISSING, recreate with the existing interface:
// classifyTask(body), scoreModel(model, taskType, settings), selectModel(candidates, taskType, settings)
import { TASK_WEIGHTS } from "../config/taskWeights.js";

export function classifyTask(body) {
  const text = JSON.stringify(body?.messages ?? []).slice(0, 2000).toLowerCase();
  if (/debug|error|fix|bug/.test(text)) return "code:debugging";
  if (/write|implement|generate|refactor/.test(text)) return "code:generation";
  if (/summar|condense/.test(text)) return "summarization";
  if (/translate/.test(text)) return "translation";
  if (/math|calculate|solve/.test(text)) return "math";
  if (/reason|explain why|analyze/.test(text)) return "reasoning";
  return "general_chat";
}

export function scoreModel(model, taskType, settings) {
  // heuristic scoring — learned router augments this in M3
  const base = TASK_WEIGHTS[taskType]?.[model] ?? 0.5;
  return base;
}
```

**Acceptance criteria:** `smartRouter.js` exists and exports `classifyTask`/`scoreModel`/`selectModel`; routing works.

### M2 — Preference-pair extractor from usageDb

**Reference code (`src/lib/db/repos/learnedRouterRepo.js` + extractor):**

```js
// Extract preference pairs: (query, winner, loser) from usage history.
// For each task type, pair requests where model A succeeded and model B failed,
// or A faster/cheaper at same quality.
export async function extractPreferencePairs(db, { minPairs = 1000 } = {}) {
  const rows = await db.all(`
    SELECT model, task_type, status, latency_ms, cost_usd, prompt_text
    FROM usage_history
    WHERE status IN ('success', 'error')
    ORDER BY timestamp DESC LIMIT 50000
  `);
  const pairs = [];
  const byTask = groupBy(rows, (r) => r.task_type);
  for (const [task, reqs] of Object.entries(byTask)) {
    const successes = reqs.filter((r) => r.status === "success");
    const failures = reqs.filter((r) => r.status === "error");
    for (const s of successes) {
      for (const f of failures) {
        if (s.model !== f.model) {
          pairs.push({ query: s.prompt_text, winner: s.model, loser: f.model, task_type: task });
          if (pairs.length >= minPairs) return pairs;
        }
      }
    }
  }
  return pairs;
}
```

**Acceptance criteria:** extractor produces ≥1k pairs from real usage; dedupes; anonymizes prompts.

### M3 — MF router + wiring into `scoreModel()`

**Reference code (`open-sse/services/learnedRouter.js`):**

```js
// Matrix Factorization router (RouteLLM's cheapest: $3.32/M, 155 req/s).
// delta(m,q) = w2^T (v_m ⊙ (W1^T v_q + b)) — logistic loss on preference pairs.
export class MFRouter {
  constructor({ dim = 64, modelCount = 100 } = {}) {
    this.dim = dim;
    this.modelEmbeddings = new Map(); // modelId -> Float64Array(dim)
    this.queryProjection = randomMatrix(dim, dim);
    this.bias = new Float64Array(dim);
    this.weights = new Float64Array(dim);
  }

  predictWinProb(modelId, queryEmbedding) {
    const v_m = this.modelEmbeddings.get(modelId);
    if (!v_m) return 0.5; // unknown model → neutral
    const proj = matVec(this.queryProjection, queryEmbedding);
    for (let i = 0; i < this.dim; i++) proj[i] += this.bias[i];
    let dot = 0;
    for (let i = 0; i < this.dim; i++) dot += this.weights[i] * v_m[i] * proj[i];
    return sigmoid(dot);
  }

  train(pairs, queryEncoder, epochs = 10, lr = 0.01) {
    // logistic loss: -log(sigmoid(delta(winner) - delta(loser)))
    // SGD over pairs; save weights via learnedRouterRepo.
  }
}
```

**Wiring in `scoreModel()`:**

```js
// If settings.learnedRouter.enabled and router loaded:
const winProb = learnedRouter.predictWinProb(model, embedQuery(text));
const learnedScore = winProb >= settings.learnedRouter.threshold ? 1 : 0;
return blend(heuristicScore, learnedScore, settings.learnedRouter.blend);
```

**Acceptance criteria:** MF scores in ms; threshold calibration via `--strong-model-pct`; weights persisted in DB.

### M4 — Training script + dashboard trigger + tests

**Files touched:**
- `scripts/train-learned-router.mjs` (new) — reads usageDb, builds pairs, trains MF, saves weights
- `src/app/api/v1/learned-router/route.js` (new) — POST train, GET status
- Dashboard: smart-router page "Train" button
- `tests/unit/learned-router.test.js` (new)

**Acceptance criteria:** training runs offline; dashboard trigger works; unit tests pass.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| `smartRouter.js` may be MISSING | Import would crash routing | Recreate first (M1) |
| Data volume | Needs ~10k pairs for meaningful training | Seed from public datasets (Chatbot Arena, Nectar) |
| Embedding encoder | all-MiniLM-L12-v2 needs onnxruntime | Optional dep; fallback to hash features |

## Verification

- Unit: MF scoring, threshold calibration, pair extraction
- Manual: train → check weights in DB → route → verify win-prob in routing decisions
- Regression: `tests/__baseline__/verify-no-regression.mjs`