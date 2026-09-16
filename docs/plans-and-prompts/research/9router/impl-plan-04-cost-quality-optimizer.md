---
Date: 2026-09-15
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, cost-quality, optimizer, price-based, routerbench
---

# Implementation Plan 4 — Cost-Quality Optimizer (price-based cost model + RouterBench-style evaluation)

> Written after the binary-tree research expansion (see `39-binary-tree-expansion-master-plan.md`, `46-branch-evaluation-and-cost-quality.md`).
> This plan covers the "cost-quality optimizer" option: replace name-based cost heuristics with price-based data, and add a RouterBench-style cost-quality evaluation.

## 1. Goal

Replace 9Router's **name-based cost heuristic** (regex on model names: /opus|pro|max|ultra/ expensive; /mini|flash|lite|free|cheap/ cheap) with a **price-based cost model** (real per-token prices), and add a **cost-quality optimizer** that routes to the cheapest sufficient model (Oracle result: GPT-4 is seldom the right choice).

## 2. Background (from research)

- **RouterBench** (arXiv:2403.12031): costs vary 2–5× for comparable performance. Oracle router near-optimal at low cost; GPT-4 seldom chosen. AIQ = $\frac{1}{c_{max}-c_{min}} \int R_\theta \, dc$ — single scalar for router comparison.
- **RouteLLM**: up to 85% cost reduction at 95% GPT-4 MT-Bench performance.
- **FrugalGPT**: up to 98% cost reduction via cascades.
- **OpenRouter Auto Router**: cost_tier bands (low/medium/high/xhigh/max, default ~low, band not ceiling); provider.max_price still applies.
- **9Router current state**: cost heuristic regex in `scoreModel()` (name-based, weak); costQualityTradeoff (default 5) shifts scores ±(tradeoff−5)×5/×3.

## 3. Design

### 3.1 Price Database

- **New**: `src/lib/db/repos/modelPriceRepo.js` — per-model price table:
  - input_price_per_mtok, output_price_per_mtok, request_price.
  - Source: provider registries + manual curation + optional auto-fetch (OpenRouter models API).
- **Price lookup**: `getModelPrice(modelId)` — exact match, then family fallback, then heuristic fallback.
- **Price updates**: dashboard UI + script `scripts/update-model-prices.mjs`.

### 3.2 Cost-Aware Scoring

- **`scoreModel()`** (smartRouter): replace regex heuristic with price-based cost score:
  - costScore = normalized price (cheapest = 1.0, most expensive = 0.0).
  - costQualityTradeoff shifts the balance: higher tradeoff → cost matters more.
- **Cost prediction**: predicted cost per request = input_tokens × input_price + output_tokens × output_price (estimate output tokens from task type).

### 3.3 Cost-Quality Optimizer

- **New strategy**: `cost-optimizer` — for each request:
  1. Predict required quality level (from task type + query difficulty).
  2. Filter models below quality floor.
  3. Rank survivors by predicted cost.
  4. Route to cheapest sufficient model (Oracle result).
- **Quality floor**: per-task-type minimum quality (code needs high quality, chat can be cheap).
- **Budget constraints**: per-request or per-session budget caps.

### 3.4 Evaluation (RouterBench-style)

- **Cost-quality plane**: track per-request cost + quality (success, latency, user feedback).
- **AIQ metric**: compute area under cost-quality curve for router comparison.
- **Zero router baseline**: compare against probabilistic mix.
- **Dashboard**: cost-quality visualization (c-q plane).

## 4. Implementation Steps

1. Create model price repo + seed data.
2. Replace regex heuristic in `scoreModel()` with price-based cost score.
3. Add cost prediction (token estimation per task type).
4. Add `cost-optimizer` strategy.
5. Add quality floors per task type.
6. Add budget constraints.
7. Add cost-quality tracking (usageDb extension).
8. Add AIQ computation + dashboard visualization.
9. Tests: price lookup, cost scoring, optimizer routing.

## 5. Files Touched

- `src/lib/db/repos/modelPriceRepo.js` (new)
- `open-sse/services/smartRouter.js` (scoreModel cost scoring)
- `src/sse/handlers/chat.js` (cost-optimizer strategy)
- `src/lib/usageDb.js` (cost-quality tracking)
- `scripts/update-model-prices.mjs` (new)
- Dashboard cost-quality page (new)
- `tests/unit/cost-optimizer.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Price data staleness | Auto-fetch from OpenRouter; manual override UI |
| Quality floor mis-calibration | Per-task-type tuning; user feedback loop |
| Token estimation error | Historical token usage per task type |
| Cost-optimizer quality drop | Quality floor enforcement; fallback to balanced strategy |

## 7. Success Criteria

- Price-based cost scoring replaces regex heuristic (config-gated).
- Cost-optimizer achieves ≥30% cost reduction at ≥95% quality (RouteLLM bar).
- AIQ metric computed and visualized.
- Zero router baseline comparison available.

## 8. Related Plans
- Plan 1 (Learned Routing) — learned quality prediction.
- Plan 2 (Cascade Enhancements) — cascade cost integration.
- Plan 7 (Eval Harness) — evaluation methodology.