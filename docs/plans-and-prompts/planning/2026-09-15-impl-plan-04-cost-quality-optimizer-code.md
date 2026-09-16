# Implementation Plan 04 — Cost-Quality Optimizer — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #cost-quality #optimizer #price-based #routerbench #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (imports, function signatures, `open-sse/services/smartRouter.js` scoreModel, `src/lib/usageDb.js`, provider registry).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — run the app, hit the endpoints, check the DB, confirm acceptance criteria.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-04-cost-quality-optimizer.md`, `../research/9router/46-branch-evaluation-and-cost-quality.md`

## Scope

**In scope:** price-based cost model (replace name-based regex heuristic); cost-optimizer strategy (cheapest sufficient model); quality floors per task type; budget constraints; AIQ metric + dashboard.
**Out of scope:** full RouterBench eval harness (plan 7); learned router integration (plan 1).

## Milestones

### M1 — Model price repo + seed data

**Reference code (`src/lib/db/repos/modelPriceRepo.js`):**

```js
import { getAdapter } from "@/lib/db/driver.js";

const DEFAULT_PRICES = {
  "openai/gpt-4o": { input: 5.00, output: 15.00, request: 0 },
  "openai/gpt-4o-mini": { input: 0.15, output: 0.60, request: 0 },
  "anthropic/claude-3-5-sonnet": { input: 3.00, output: 15.00, request: 0 },
  "google/gemini-1.5-pro": { input: 1.25, output: 5.00, request: 0 },
  // ... seed from provider APIs + manual curation
};

export async function getModelPrice(modelId) {
  const db = await getAdapter();
  const row = await db.get(`SELECT * FROM model_prices WHERE model_id = ?`, [modelId]);
  if (row) return { input: row.input_price, output: row.output_price, request: row.request_price };
  // Family fallback
  const family = modelId.split("/")[0];
  const familyRow = await db.get(`SELECT * FROM model_prices WHERE model_id LIKE ?`, [`${family}/%`]);
  if (familyRow) return { input: familyRow.input_price, output: familyRow.output_price, request: familyRow.request_price };
  // Heuristic fallback (last resort)
  return heuristicPrice(modelId);
}

export async function upsertModelPrice(modelId, { input, output, request = 0 }) {
  const db = await getAdapter();
  await db.run(`
    INSERT INTO model_prices (model_id, input_price, output_price, request_price, updated_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(model_id) DO UPDATE SET input_price=?, output_price=?, request_price=?, updated_at=?
  `, [modelId, input, output, request, Date.now(), input, output, request, Date.now()]);
}
```

**Migration:** `model_prices` table (model_id PK, input_price, output_price, request_price, updated_at).

**Acceptance criteria:** price lookup works; family fallback; heuristic fallback; dashboard UI to edit prices.

### M2 — Price-based cost scoring in `scoreModel()`

**Reference code (`open-sse/services/smartRouter.js`):**

```js
// Replace regex heuristic with price-based cost score:
export async function scoreModel(model, taskType, settings) {
  const price = await getModelPrice(model);
  const estimatedOutputTokens = estimateOutputTokens(taskType);
  const predictedCost = (estimateInputTokens(taskType) * price.input + estimatedOutputTokens * price.output) / 1_000_000;
  // Normalize: cheapest = 1.0, most expensive = 0.0 (among candidates)
  const costScore = normalizeCost(predictedCost, settings.candidateModels);
  // Blend with capability score
  const capabilityScore = TASK_WEIGHTS[taskType]?.[model] ?? 0.5;
  const tradeoff = settings.costQualityTradeoff ?? 5;
  return capabilityScore * (1 - tradeoff / 10) + costScore * (tradeoff / 10);
}
```

**Acceptance criteria:** cost score uses real prices; tradeoff shifts balance; heuristic fallback when price unknown.

### M3 — Cost-optimizer strategy + quality floors + budget

**Reference code (`src/sse/handlers/chat.js`):**

```js
// New strategy: cost-optimizer
if (strategy === "cost-optimizer") {
  const candidates = await getCandidateModels(taskType, settings);
  const withCost = await Promise.all(candidates.map(async (m) => ({
    model: m,
    cost: await predictCost(m, taskType),
    quality: await predictQuality(m, taskType),
  })));
  // Filter by quality floor
  const floor = settings.qualityFloors?.[taskType] ?? 0;
  const qualified = withCost.filter((c) => c.quality >= floor);
  // Sort by cost, pick cheapest
  qualified.sort((a, b) => a.cost - b.cost);
  return qualified[0]?.model;
}
```

**Quality floors (per task type):**

```js
// settings.qualityFloors = { "code:generation": 0.8, "math": 0.7, "general_chat": 0.5, ... };
```

**Budget constraints:**

```js
// settings.budget = { perRequest: 0.01, perSession: 1.00 };
// In chat.js: if predictedCost > budget.perRequest → filter out or fallback to cheaper.
```

**Acceptance criteria:** cost-optimizer picks cheapest qualified model; quality floors enforced; budget caps work.

### M4 — AIQ metric + dashboard + tests

**Files touched:**
- `src/lib/usageDb.js` — track cost + quality per request
- `scripts/compute-aiq.mjs` (new) — AIQ = area under cost-quality curve
- Dashboard: cost-quality plane visualization
- `tests/unit/cost-optimizer.test.js` (new)

**Acceptance criteria:** AIQ computed; dashboard shows c-q plane; unit tests pass.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Price data freshness | Stale prices = bad routing | Auto-fetch from OpenRouter models API; manual override |
| Quality prediction | No ground truth quality | Use success rate + latency + user feedback as proxy |
| Budget enforcement | May block valid requests | Soft budget (warn + fallback) before hard block |

## Verification

- Unit: price lookup, cost scoring, optimizer selection, AIQ computation
- Manual: set prices → route with cost-optimizer → verify cheapest qualified chosen
- Regression: `tests/__baseline__/verify-no-regression.mjs`