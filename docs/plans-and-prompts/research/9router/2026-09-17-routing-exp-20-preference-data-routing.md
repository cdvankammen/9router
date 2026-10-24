# Routing Exponential Expansion R20 — Preference-Data Routing

**Date:** 2026-09-17
**Author:** GitHub Copilot agent (main session)
**Status:** active
**Tags:** #research #routing #exponential #preference-data #routellm #chatbot-arena #pairwise #generalization

## Objective

N-ary exponential expansion (6+ levels, N children per node) of the root phrase **"Preference-data routing (RouteLLM lineage)"** from `41-branch-learned-routing.md` L1-A.

## L1 — sub-phrases discovered in the root

1. 80k Chatbot Arena battles
2. 10 model tiers
3. Four router types (MF, SW, BERT, Causal)
4. α threshold calibration
5. Preference-data generalization
6. Data augmentation (D_gold, D_judge)
7. 85% cost reduction at 95% GPT-4 MT-Bench performance

## L2 — expansion of each L1 node

### 1. 80k Chatbot Arena battles
- **1a. Source** — crowdsourced pairwise comparisons.
- **1b. Format** — (query, model_a, model_b, winner).
- **1c. Scale** — 80k battles.
- **1d. Bias** — human preference noise, position bias.

### 2. 10 model tiers
- **2a. Clustering** — models grouped by strength.
- **2b. Tier assignment** — strong vs weak.
- **2c. Granularity** — 10 tiers.
- **2d. Use** — pair selection.

### 3. Four router types
- **3a. MF** — matrix factorization, $3.32/M, 155 req/s.
- **3b. SW** — similarity-weighted, $39.26/M, 2.9 req/s.
- **3c. BERT** — classifier, $3.19/M, 69.6 req/s.
- **3d. Causal** — Llama3-8B, $5.23/M, 42.5 req/s.

### 4. α threshold
- **4a. Decision rule** — route to strong iff P(win) ≥ α.
- **4b. Calibration** — calibrate_threshold --strong-model-pct.
- **4c. Tradeoff** — cost vs quality.

### 5. Generalization
- **5a. Key insight** — preference data generalizes across model pairs.
- **5b. Mechanism** — learns "when is weak good enough."
- **5c. Fleet change** — router stays.

### 6. Data augmentation
- **6a. D_gold** — MMLU ~1500.
- **6b. D_judge** — GPT-4-as-judge on Nectar ~120K.
- **6c. Cost** — ~$700.
- **6d. Purpose** — OOD performance.

### 7. 85% cost reduction
- **7a. Result** — at 95% GPT-4 MT-Bench performance.
- **7b. Mechanism** — route easy queries to weak model.
- **7c. Context** — specific benchmarks.

## L3 — expansion of selected L2 nodes (variable branching)

### 1b → battle format
- **1b-i. Query** — prompt.
- **1b-ii. Two models** — A and B.
- **1b-iii. Winner** — human vote.
- **1b-iv. Tie** — possible.

### 3a → MF internals
- **3a-i. Formula** — δ(m,q) = w₂ᵀ(v_m ⊙ (W₁ᵀ v_q + b)).
- **3a-ii. Latent factors** — model/query embeddings.
- **3a-iii. Bilinear** — dot-product interaction.
- **3a-iv. Training** — preference data.

### 4b → calibration
- **4b-i. Command** — python -m routellm.calibrate_threshold.
- **4b-ii. --routers** — mf.
- **4b-iii. --strong-model-pct** — 0.5.
- **4b-iv. Output** — α.

### 6a → D_gold
- **6a-i. MMLU** — benchmark.
- **6a-ii. ~1500 samples** — golden labels.
- **6a-iii. Ground truth** — answers.
- **6a-iv. Use** — preference labels.

### 6b → D_judge
- **6b-i. Nectar** — dataset.
- **6b-ii. GPT-4-as-judge** — labels.
- **6b-iii. ~120K** — scale.
- **6b-iv. Cost** — ~$700.

## L4 — expansion of selected L3 nodes

### 3a-i → MF formula
- **3a-i-a. v_m** — model embedding.
- **3a-i-b. v_q** — query embedding.
- **3a-i-c. W₁, b** — projection.
- **3a-i-d. w₂** — output weight.

### 4b-iii → strong-model-pct
- **4b-iii-a. 0.5** — 50%.
- **4b-iii-b. 0.1** — 10%.
- **4b-iii-c. 0.9** — 90%.
- **4b-iii-d. Curve** — α vs pct.

### 6a-ii → ~1500 samples
- **6a-ii-a. Small** — high quality.
- **6a-ii-b. MMLU subjects** — 57.
- **6a-ii-c. Format** — multiple choice.
- **6a-ii-d. Use** — gold labels.

### 6b-ii → GPT-4-as-judge
- **6b-ii-a. Prompt** — compare outputs.
- **6b-ii-b. Bias** — position.
- **6b-ii-c. Error** — measurable.
- **6b-ii-d. Cost** — per call.

## L5 — expansion of selected L4 nodes

### 3a-i-a → v_m
- **3a-i-a-1. Dimension** — 64–256.
- **3a-i-a-2. Learned** — from data.
- **3a-i-a-3. Interpretable** — strength.
- **3a-i-a-4. Cold start** — new models.

### 4b-iii-a → 0.5
- **4b-iii-a-1. Balanced** — half-half.
- **4b-iii-a-2. Cost** — ~50%.
- **4b-iii-a-3. Quality** — near-strong.
- **4b-iii-a-4. Default** — common.

### 6b-ii-a → judge prompt
- **6b-ii-a-1. Template** — "Which is better?"
- **6b-ii-a-2. Criteria** — helpfulness.
- **6b-ii-a-3. Format** — A/B.
- **6b-ii-a-4. Tie** — allowed.

## L6 — expansion of selected L5 nodes

### 3a-i-a-4 → cold start
- **3a-i-a-4-i. New model** — no embedding.
- **3a-i-a-4-ii. Init** — similar model.
- **3a-i-a-4-iii. Fallback** — heuristic.
- **3a-i-a-4-iv. Ramp** — data accumulates.

### 6b-ii-a-1 → template
- **6b-ii-a-1-i. Simple** — "Which is better?"
- **6b-ii-a-1-ii. Detailed** — criteria.
- **6b-ii-a-1-iii. Few-shot** — examples.
- **6b-ii-a-1-iv. Cost** — tokens.

## Confidence & open questions

- **High confidence:** full paper + repo (lm-sys/RouteLLM).
- **Open questions:**
  - How does RouteLLM handle model embeddings for models not in training data?
  - What is the exact D_judge prompt?
  - Does α need recalibration when the fleet changes?

## Sources

- arXiv:2406.18665 (RouteLLM)
- github.com/lm-sys/RouteLLM
- `docs/plans-and-prompts/research/9router/41-branch-learned-routing.md` L1-A