---
Date: 2026-09-15
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, learned-routing, routellm, win-probability, usageDb
---

# Implementation Plan 1 — Learned Routing in 9Router (RouteLLM-style win-probability predictor)

> Written after the binary-tree research expansion (see `39-binary-tree-expansion-master-plan.md`, `41-branch-learned-routing.md`).
> This plan covers the "learned routing" option: train a RouteLLM-style router on 9Router's own usage data.

## 1. Goal

Add a **learned routing strategy** to 9Router's smart router: a win-probability predictor trained on the router's own usage history (usageDb), following RouteLLM's proven approach (preference data → matrix factorization / classifier → route to strong model iff predicted win prob ≥ threshold).

## 2. Background (from research)

- **RouteLLM** (arXiv:2406.18665): routers trained on preference data generalize across model pairs without retraining. Up to 85% cost reduction at 95% GPT-4 MT-Bench performance. Four router types: MF ($3.32/M, 155 req/s), SW ranking ($39.26/M, 2.9 req/s), BERT ($3.19/M, 69.6 req/s), Causal Llama3-8B ($5.23/M, 42.5 req/s).
- **RouterBench** (arXiv:2403.12031): simple learned routers (KNN/MLP) do NOT significantly beat the Zero router baseline. Cascades with good judges (error ≤ 0.1) approach Oracle; collapse at > 0.2.
- **9Router current state**: smart router uses `classifyTask()` + `scoreModel()` with TASK_WEIGHTS, capability fit, context window, cost heuristic regex (name-based, weak), costQualityTradeoff, concurrency penalty. No learned component.

## 3. Design

### 3.1 Data Collection (usageDb → preference pairs)

- **Source**: `src/lib/usageDb.js` (usage.json) — per-request logs with model, task type, latency, tokens, success/failure.
- **Preference construction**: for each task type, pair requests where model A succeeded and model B failed (or A faster/cheaper at same quality) → preference pair (query, winner, loser).
- **Data volume**: needs ~10k+ preference pairs for meaningful training (RouteLLM used 80k battles). 9Router's usageDb may need a warm-up period or seed data from public preference datasets (Chatbot Arena, Nectar).

### 3.2 Router Models (start with the cheapest, most proven)

1. **Matrix Factorization (MF)** — RouteLLM's cheapest router ($3.32/M, 155 req/s):
   - Embed query via a small encoder (all-MiniLM-L12-v2, 384-dim).
   - $\delta(m,q) = w_2^T (v_m \odot (W_1^T v_q + b))$ — learn model embeddings $v_m$ and query projection $W_1$.
   - Train on preference pairs with logistic loss.
2. **BERT classifier** — RouteLLM's second-cheapest ($3.19/M, 69.6 req/s):
   - $\sigma(W h_{CLS} + b)$ over prompt embeddings.
3. **KNN** — RouterBench's simplest (40 neighbors, all-MiniLM-L12-v2):
   - Baseline to beat; likely won't beat Zero router.

### 3.3 Integration Points

- **`open-sse/services/smartRouter.js`** (recovered source; file MISSING — must be recreated):
  - Add `learnedRouter` option to `scoreModel()`: if enabled, predicted win prob replaces/augments the heuristic score.
  - Threshold α: route to strong model iff predicted win prob ≥ α; calibrate via `calibrate_threshold --strong-model-pct` (RouteLLM approach).
- **`src/sse/handlers/chat.js`** — the 16 decision points:
  - Decision point 4 (task classification) feeds the learned router.
  - Decision point 5 (model scoring) uses learned scores.
- **`src/lib/db/repos/`** — new `learnedRouterRepo` for model weights + training state.

### 3.4 Training Pipeline

- **Offline training**: script `scripts/train-learned-router.mjs` — reads usageDb, builds preference pairs, trains MF/BERT, saves weights to DB.
- **Online inference**: smartRouter loads weights at startup, scores in-memory (ms-level).
- **Retraining**: periodic (daily/weekly) or on-demand via dashboard button.

## 4. Implementation Steps

1. Recreate `open-sse/services/smartRouter.js` (currently MISSING — import would crash routing).
2. Add `learnedRouter` config to settings (enabled, modelType: mf|bert|knn, threshold α, strongModelPct).
3. Build preference-pair extractor from usageDb.
4. Implement MF router (query encoder + factorization) in `open-sse/services/learnedRouter.js`.
5. Implement BERT router (optional, phase 2).
6. Implement KNN baseline (for evaluation).
7. Wire into `scoreModel()` with threshold calibration.
8. Add training script + dashboard trigger.
9. Add evaluation harness (see Implementation Plan 7 — Eval Harness).
10. Tests: unit tests for MF scoring, integration test for smartRouter wiring.

## 5. Files Touched

- `open-sse/services/smartRouter.js` (recreate)
- `open-sse/services/learnedRouter.js` (new)
- `src/sse/handlers/chat.js` (wire-in)
- `src/lib/db/repos/learnedRouterRepo.js` (new)
- `scripts/train-learned-router.mjs` (new)
- `src/lib/usageDb.js` (preference extraction)
- `tests/unit/learned-router.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Not enough preference data | Seed from public datasets (Chatbot Arena, Nectar); warm-up period |
| Simple routers don't beat Zero (RouterBench finding) | Evaluate against Zero baseline before enabling; keep heuristic as fallback |
| Model drift (new models added) | Retraining pipeline; preference generalization (RouteLLM finding) |
| Latency of embedding | Small encoder (MiniLM) is ms-level; cache embeddings |
| smartRouter.js missing | Recreate from recovered source first (blocking) |

## 7. Success Criteria

- Learned router beats Zero baseline on 9Router's own eval set (AIQ metric).
- ≥30% cost reduction at ≥95% quality preservation (RouteLLM's bar).
- Inference latency < 10ms per request.
- Graceful fallback to heuristic scoring on any error.

## 8. Related Plans
- Plan 7 (Eval Harness) — evaluation methodology.
- Plan 4 (Cost-Quality Optimizer) — cost-quality integration.
- Plan 2 (Cascade Enhancements) — cascade judge synergy.