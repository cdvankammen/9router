# Routing Exponential Expansion R19 — Implications for 9Router

**Date:** 2026-09-17
**Author:** GitHub Copilot agent (main session)
**Status:** active
**Tags:** #research #routing #exponential #9router #implications #win-probability #cascade-judge #spend-share #smart-router

## Objective

N-ary exponential expansion (6+ levels, N children per node) of the root phrase **"Implications for 9Router (upgrades: win-probability, cascade judge, spend-share)"** from `37-ai-model-routing-deep-research.md` Synthesis.

## L1 — sub-phrases discovered in the root

1. 9Router is constraint-first + heuristic (philosophy 3)
2. scoreModel() is hand-tuned weighted heuristic
3. Upgrade (a): RouteLLM-style win-probability predictor
4. Upgrade (b): cascade judge (AutoMix-style self-verification)
5. Upgrade (c): OpenRouter-style spend-share ranking
6. Missing smartRouter.js must be restored
7. Capacity adapter + capability detection already correct
8. Cost heuristic regex is the weakest link

## L2 — expansion of each L1 node

### 1. Constraint-first + heuristic
- **1a. Architecture** — full five-stage pipeline across 16 decision points.
- **1b. Philosophy** — constraint-first + heuristic (philosophy 3).
- **1c. Learned-style** — task classifier in smart router.
- **1d. Legitimacy** — per RouterBench, a legitimate approach.

### 2. scoreModel() heuristic
- **2a. Formula** — TASK_WEIGHTS × capability × context × cost regex × tradeoff × concurrency.
- **2b. Hand-tuned** — weights manually set.
- **2c. Transparent** — explainable.
- **2d. Upgradeable** — with learned components.

### 3. Upgrade (a): win-probability predictor
- **3a. Idea** — RouteLLM-style predictor trained on 9Router's own usage data.
- **3b. Data** — usageDb already tracks outcomes.
- **3c. Model** — MF or BERT classifier.
- **3d. Threshold** — α calibration.
- **3e. Benefit** — principled cost/quality tradeoff.

### 4. Upgrade (b): cascade judge
- **4a. Idea** — AutoMix-style self-verification instead of pure scoring.
- **4b. Mechanism** — small model verifies own output.
- **4c. POMDP** — handles noise.
- **4d. Benefit** — no training data needed.

### 5. Upgrade (c): spend-share ranking
- **5a. Idea** — OpenRouter-style spend-share ranking from usageDb.
- **5b. Data** — usageDb tracks spend.
- **5c. Window** — trailing 7-day.
- **5d. Per task type** — separate ranking.
- **5e. Benefit** — market signal, no training.

### 6. Missing smartRouter.js
- **6a. Problem** — imported but MISSING from checkout.
- **6b. Impact** — routing code would crash on import.
- **6c. Recovery** — source recovered from chat-log temp.
- **6d. Action** — restore before any of this is exercised.

### 7. Capacity adapter + capability detection
- **7a. Correct** — already implement constraint-first pattern.
- **7b. Points** — 2 (capability detection), 8 (capacity adapter).
- **7c. Pools** — vision/pdf/audioInput/videoInput.
- **7d. Default fallback** — oc/mimo-v2.5-free.

### 8. Cost heuristic regex
- **8a. Weakest link** — name-based, not price-based.
- **8b. Expensive** — /opus|pro|max|ultra/.
- **8c. Cheap** — /mini|flash|lite|free|cheap/.
- **8d. Better** — price table like LiteLLM's model_prices_and_context_window.json.

## L3 — expansion of selected L2 nodes (variable branching)

### 3b → usageDb outcomes
- **3b-i. What it tracks** — cost/usage.
- **3b-ii. What it lacks** — per-request quality.
- **3b-iii. Gap** — no quality labels.
- **3b-iv. Solution** — add quality signals.

### 3c → predictor model
- **3c-i. MF** — matrix factorization.
- **3c-ii. BERT** — classifier.
- **3c-iii. SW** — similarity-weighted.
- **3c-iv. Choice** — cost/performance.

### 4b → self-verification
- **4b-i. Few-shot** — no training.
- **4b-ii. Prompt** — verify output.
- **4b-iii. Confidence** — score.
- **4b-iv. Noise** — imperfect.

### 5b → usageDb spend
- **5b-i. Per request** — cost recorded.
- **5b-ii. Per model** — aggregate.
- **5b-iii. Per task** — classify.
- **5b-iv. Window** — 7 days.

### 6c → recovery
- **6c-i. Source** — chat-log temp.
- **6c-ii. Lines** — ~2440–2620.
- **6c-iii. File** — d4294fc8-49e9-46b3-95f5-3b1625d0acb2.md.
- **6c-iv. Verify** — syntax + behavior.

### 8d → price table
- **8d-i. Source** — LiteLLM model_prices_and_context_window.json.
- **8d-ii. Fields** — price, context window.
- **8d-iii. Update** — periodic.
- **8d-iv. Benefit** — accurate cost.

## L4 — expansion of selected L3 nodes

### 3b-iv → quality signals
- **3b-iv-a. User feedback** — thumbs up/down.
- **3b-iv-b. Judge** — LLM-as-judge.
- **3b-iv-c. Task success** — completion.
- **3b-iv-d. Cost** — per signal.

### 3c-i → MF
- **3c-i-a. Formula** — δ(m,q) = w₂ᵀ(v_m ⊙ (W₁ᵀ v_q + b)).
- **3c-i-b. Training** — preference data.
- **3c-i-c. Cost** — $3.32/M.
- **3c-i-d. Speed** — 155 req/s.

### 4b-ii → verify prompt
- **4b-ii-a. Template** — "verify your answer."
- **4b-ii-b. Few-shot** — examples.
- **4b-ii-c. Output** — confidence.
- **4b-ii-d. Calibration** — accuracy vs confidence.

### 5b-ii → per-model aggregate
- **5b-ii-a. Spend** — sum.
- **5b-ii-b. Requests** — count.
- **5b-ii-c. Share** — percentage.
- **5b-ii-d. Rank** — order.

### 8d-i → LiteLLM price table
- **8d-i-a. JSON** — structured.
- **8d-i-b. Models** — hundreds.
- **8d-i-c. Fields** — input/output price, context.
- **8d-i-d. License** — MIT.

## L5 — expansion of selected L4 nodes

### 3b-iv-a → user feedback
- **3b-iv-a-1. Collection** — dashboard.
- **3b-iv-a-2. Storage** — usageDb.
- **3b-iv-a-3. Volume** — low.
- **3b-iv-a-4. Value** — high-quality signal.

### 3c-i-a → MF formula
- **3c-i-a-1. v_m** — model embedding.
- **3c-i-a-2. v_q** — query embedding.
- **3c-i-a-3. W₁, b** — projection.
- **3c-i-a-4. w₂** — output weight.

### 4b-ii-a → verify template
- **4b-ii-a-1. Simple** — "Is this correct?"
- **4b-ii-a-2. Detailed** — step-by-step.
- **4b-ii-a-3. Few-shot** — 2–3 examples.
- **4b-ii-a-4. Cost** — extra tokens.

### 8d-i-a → JSON structure
- **8d-i-a-1. Key** — model name.
- **8d-i-a-2. Value** — price object.
- **8d-i-a-3. Input** — per-token.
- **8d-i-a-4. Output** — per-token.

## L6 — expansion of selected L5 nodes

### 3b-iv-a-1 → dashboard collection
- **3b-iv-a-1-i. UI** — feedback buttons.
- **3b-iv-a-1-ii. API** — feedback endpoint.
- **3b-iv-a-1-iii. Storage** — DB.
- **3b-iv-a-1-iv. Privacy** — local.

### 4b-ii-a-1 → simple template
- **4b-ii-a-1-i. Prompt** — "Is this correct?"
- **4b-ii-a-1-ii. Response** — yes/no.
- **4b-ii-a-1-iii. Confidence** — scalar.
- **4b-ii-a-1-iv. Reliability** — moderate.

## Confidence & open questions

- **High confidence:** implications derived from primary sources + full codebase mapping.
- **CRITICAL:** smartRouter.js missing — must be restored before upgrades.
- **Open questions:**
  - Does 9Router's usageDb contain enough outcome signal (per-request quality) to train a RouteLLM-style router?
  - Could the fusion panel's judge error be measured?
  - What is the actual judge in OpenRouter's classifier?

## Sources

- `docs/plans-and-prompts/research/9router/37-ai-model-routing-deep-research.md` Synthesis
- `docs/plans-and-prompts/temp/chat-logs/d4294fc8-49e9-46b3-95f5-3b1625d0acb2.md` (recovered smartRouter.js)
- LiteLLM model_prices_and_context_window.json (reference)