# Routing Exponential Expansion R17 — Three Philosophies

**Date:** 2026-09-17
**Author:** GitHub Copilot agent (main session)
**Status:** active
**Tags:** #research #routing #exponential #philosophies #learned #market #constraint-first #heuristic

## Objective

N-ary exponential expansion (6+ levels, N children per node) of the root phrase **"Three philosophies (learned/market/constraint-first)"** from `37-ai-model-routing-deep-research.md` Synthesis.

## L1 — sub-phrases discovered in the root

1. Learned philosophy (RouteLLM, RouterBench KNN/MLP, Shnitzer, Tryage, AutoMix)
2. Market philosophy (OpenRouter Auto Router)
3. Constraint-first + heuristic philosophy (ClawRouter, 9Router, vLLM SR, LiteLLM)
4. Decision signal comparison
5. Strengths comparison
6. Weaknesses comparison

## L2 — expansion of each L1 node

### 1. Learned philosophy
- **1a. Signal** — trained predictors (win prob, difficulty, correctness).
- **1b. Representatives** — RouteLLM, RouterBench KNN/MLP, Shnitzer, Tryage, AutoMix.
- **1c. Strength** — generalizes across model pairs.
- **1d. Strength 2** — principled cost/quality tradeoff.
- **1e. Weakness** — needs preference data.
- **1f. Weakness 2** — RouterBench shows simple learned routers don't beat Zero.
- **1g. Weakness 3** — judge quality is the bottleneck.

### 2. Market philosophy
- **2a. Signal** — aggregate spend share per task type (7-day window).
- **2b. Representative** — OpenRouter Auto Router.
- **2c. Strength** — no training.
- **2d. Strength 2** — continuously updated.
- **2e. Strength 3** — reflects real user value.
- **2f. Weakness** — needs traffic.
- **2g. Weakness 2** — opaque.
- **2h. Weakness 3** — band/ceiling semantics.

### 3. Constraint-first + heuristic
- **3a. Signal** — hard filters → weighted multi-dimension score.
- **3b. Representatives** — ClawRouter, 9Router, vLLM SR, LiteLLM.
- **3c. Strength** — transparent, explainable.
- **3d. Strength 2** — no data needed.
- **3e. Strength 3** — <1ms.
- **3f. Weakness** — hand-tuned weights.
- **3g. Weakness 2** — no learning from outcomes.

### 4. Decision signal comparison
- **4a. Learned** — trained predictors.
- **4b. Market** — spend share.
- **4c. Heuristic** — weighted score.
- **4d. Hybrid** — possible.

### 5. Strengths comparison
- **5a. Learned** — generalization, principled tradeoff.
- **5b. Market** — no training, live.
- **5c. Heuristic** — transparent, fast.

### 6. Weaknesses comparison
- **6a. Learned** — data hunger, judge bottleneck.
- **6b. Market** — traffic, opacity.
- **6c. Heuristic** — hand-tuned, no learning.

## L3 — expansion of selected L2 nodes (variable branching)

### 1a → trained predictors
- **1a-i. Win probability** — RouteLLM.
- **1a-ii. Difficulty** — Hybrid LLM.
- **1a-iii. Correctness** — AutoMix.
- **1a-iv. Performance score** — RouterBench.

### 2a → spend share
- **2a-i. Per task type** — separate.
- **2a-ii. 7-day window** — recency.
- **2a-iii. Dollar-weighted** — real value.
- **2a-iv. Live** — no retraining.

### 3a → hard filters → score
- **3a-i. Filter** — eligibility.
- **3a-ii. Score** — weighted.
- **3a-iii. Rank** — survivors.
- **3a-iv. Select** — winner + fallbacks.

### 4d → hybrid
- **4d-i. Learned + heuristic** — combine.
- **4d-ii. Market + heuristic** — combine.
- **4d-iii. All three** — possible.
- **4d-iv. 9Router potential** — learned upgrade.

## L4 — expansion of selected L3 nodes

### 1a-i → win probability
- **1a-i-a. MF** — matrix factorization.
- **1a-i-b. SW** — similarity-weighted.
- **1a-i-c. BERT** — classifier.
- **1a-i-d. Causal** — Llama 3 8B.

### 2a-i → per task type
- **2a-i-a. ~30 types** — OpenRouter.
- **2a-i-b. Ranking** — per type.
- **2a-i-c. Cold tasks** — low volume.
- **2a-i-d. Default** — fallback.

### 3a-i → filter
- **3a-i-a. Tools** — capability.
- **3a-i-b. Vision** — capability.
- **3a-i-c. Context** — window.
- **3a-i-d. Policy** — guardrails.

### 4d-iii → all three
- **4d-iii-a. Understand** — heuristic classify.
- **4d-iii-b. Score** — learned predictor.
- **4d-iii-c. Rank** — market signal.
- **4d-iii-d. Recover** — reliability.

## L5 — expansion of selected L4 nodes

### 1a-i-a → MF
- **1a-i-a-1. Formula** — δ(m,q) = w₂ᵀ(v_m ⊙ (W₁ᵀ v_q + b)).
- **1a-i-a-2. Cost** — $3.32/M.
- **1a-i-a-3. Speed** — 155 req/s.
- **1a-i-a-4. Best tradeoff** — cost/performance.

### 3a-i-a → tools
- **3a-i-a-1. Function calling** — API.
- **3a-i-a-2. Schema** — JSON.
- **3a-i-a-3. Execution** — model calls.
- **3a-i-a-4. Agent loops** — multi-step.

### 4d-iii-a → heuristic classify
- **4d-iii-a-1. Task type** — classifyTask().
- **4d-iii-a-2. Capability** — detectRequiredCapabilities().
- **4d-iii-a-3. Session** — sticky.
- **4d-iii-a-4. Cost** — ~ms.

## L6 — expansion of selected L5 nodes

### 1a-i-a-1 → MF formula
- **1a-i-a-1-i. v_m** — model embedding.
- **1a-i-a-1-ii. v_q** — query embedding.
- **1a-i-a-1-iii. W₁, b** — projection.
- **1a-i-a-1-iv. w₂** — output weight.

### 3a-i-a-1 → function calling
- **3a-i-a-1-i. OpenAI format** — tools param.
- **3a-i-a-1-ii. Claude format** — tools param.
- **3a-i-a-1-iii. Translation** — 9Router translator.
- **3a-i-a-1-iv. Compatibility** — per-provider.

## Confidence & open questions

- **High confidence:** synthesis of all prior research.
- **Open questions:**
  - Which philosophy is best for 9Router's local-first use case?
  - Can the three philosophies be combined in one router?
  - What is the cost of a learned router at 9Router's scale?

## Sources

- `docs/plans-and-prompts/research/9router/37-ai-model-routing-deep-research.md` Synthesis
- All prior research docs