# Routing Exponential Expansion R02 — RouteLLM

**Date:** 2026-09-17
**Author:** GitHub Copilot agent (main session)
**Status:** active
**Tags:** #research #routing #exponential #routellm #preference-data #matrix-factorization #threshold

## Objective

N-ary exponential expansion (6+ levels, N children per node) of the root phrase **"RouteLLM (MF/SW/BERT/Causal, α threshold, preference data)"** from `37-ai-model-routing-deep-research.md` §2.

## L1 — sub-phrases discovered in the root

1. 80k Chatbot Arena battles (training data)
2. 10 model tiers (clustering)
3. Matrix Factorization (MF) router
4. Similarity-Weighted (SW) ranking router
5. BERT classifier router
6. Causal LLM classifier (Llama 3 8B)
7. α threshold calibration
8. Preference-data generalization
9. Data augmentation (D_gold, D_judge)
10. Cost/performance tradeoffs ($/M requests, req/s)

## L2 — expansion of each L1 node

### 1. 80k Chatbot Arena battles
- **1a. Source** — Chatbot Arena pairwise human preferences.
- **1b. Format** — (query, model_a, model_b, winner).
- **1c. Scale** — 80k battles, enough for training.
- **1d. Bias** — human preference noise, position bias.

### 2. 10 model tiers
- **2a. Clustering** — models grouped by strength.
- **2b. Tier assignment** — strong vs weak tiers.
- **2c. Tier granularity** — 10 tiers, coarse.
- **2d. Use** — pair selection for training.

### 3. Matrix Factorization (MF) router
- **3a. Formula** — δ(m,q) = w₂ᵀ(v_m ⊙ (W₁ᵀ v_q + b)).
- **3b. Latent factors** — model and query embeddings.
- **3c. Bilinear form** — dot-product interaction.
- **3d. Cost** — $3.32/M requests.
- **3e. Speed** — 155 req/s.

### 4. Similarity-Weighted (SW) ranking
- **4a. Bradley-Terry model** — pairwise preference model.
- **4b. Cosine similarity weights** — query vs training queries.
- **4c. Cost** — $39.26/M requests.
- **4d. Speed** — 2.9 req/s.

### 5. BERT classifier
- **5a. Formula** — σ(W h_CLS + b).
- **5b. Encoder** — small BERT.
- **5c. Cost** — $3.19/M requests.
- **5d. Speed** — 69.6 req/s.

### 6. Causal LLM classifier
- **6a. Model** — Llama 3 8B.
- **6b. Cost** — $5.23/M requests.
- **6c. Speed** — 42.5 req/s.

### 7. α threshold calibration
- **7a. Decision rule** — route to strong model iff P(win) ≥ α.
- **7b. Calibration command** — `python -m routellm.calibrate_threshold --routers mf --strong-model-pct 0.5`.
- **7c. strong-model-pct** — fraction of queries routed to strong model.
- **7d. Tradeoff** — higher α = fewer strong-model calls = lower cost.

### 8. Preference-data generalization
- **8a. Key insight** — routers trained on preference data generalize across model pairs without retraining.
- **8b. Mechanism** — learns "when is the weak model good enough," not "which model wins."
- **8c. Fleet change** — model fleet can change while router stays.

### 9. Data augmentation
- **9a. D_gold** — golden labels from MMLU (~1500).
- **9b. D_judge** — GPT-4-as-judge on Nectar (~120K).
- **9c. Cost** — ~$700.
- **9d. Purpose** — out-of-distribution performance.

### 10. Cost/performance tradeoffs
- **10a. MF** — best cost/performance: $3.32/M at 155 req/s.
- **10b. SW** — $39.26/M at 2.9 req/s.
- **10c. BERT** — $3.19/M at 69.6 req/s.
- **10d. Causal** — $5.23/M at 42.5 req/s.

## L3 — expansion of selected L2 nodes (variable branching)

### 3a → MF formula internals
- **3a-i. v_m (model embedding)** — latent factor per model.
- **3a-ii. v_q (query embedding)** — latent factor per query.
- **3a-iii. W₁, b** — learned projection.
- **3a-iv. w₂** — output weight vector.
- **3a-v. ⊙ (Hadamard product)** — element-wise interaction.

### 4a → Bradley-Terry model
- **4a-i. Pairwise comparison** — P(A beats B) = σ(score_A − score_B).
- **4a-ii. Score function** — model quality estimate.
- **4a-iii. Training** — maximize likelihood of observed preferences.
- **4a-iv. Extension** — cosine-weighted similarity.

### 7b → calibration command
- **7b-i. CLI** — `python -m routellm.calibrate_threshold`.
- **7b-ii. --routers** — which router types to calibrate.
- **7b-iii. --strong-model-pct** — target strong-model usage.
- **7b-iv. Output** — α threshold per router.

### 9a → D_gold
- **9a-i. MMLU** — massive multitask language understanding benchmark.
- **9a-ii. Golden labels** — ground-truth answers.
- **9a-iii. ~1500 samples** — small but high-quality.
- **9a-iv. Use** — preference labels for training.

### 9b → D_judge
- **9b-i. Nectar** — preference dataset.
- **9b-ii. GPT-4-as-judge** — LLM judge labels.
- **9b-iii. ~120K samples** — large scale.
- **9b-iv. Cost** — ~$700 total.

## L4 — expansion of selected L3 nodes

### 3a-i → model embedding
- **3a-i-a. Dimensionality** — typically 64–256.
- **3a-i-b. Learned** — from preference data.
- **3a-i-c. Interpretability** — captures model strength.
- **3a-i-d. Cold start** — new models need embedding.

### 4a-ii → score function
- **4a-ii-a. Linear** — dot product of features.
- **4a-ii-b. Nonlinear** — neural net.
- **4a-ii-c. Regularization** — prevent overfitting.

### 7c → strong-model-pct
- **7c-i. 0.5** — 50% of queries to strong model.
- **7c-ii. 0.1** — 10% (cost-lean).
- **7c-iii. 0.9** — 90% (quality-lean).
- **7c-iv. Calibration curve** — α vs pct.

### 8a → generalization mechanism
- **8a-i. Transfer** — preference data from one pair transfers to unseen pairs.
- **8a-ii. Why** — the router learns a general "when is weak good enough" function.
- **8a-iii. Implication** — fleet changes don't require retraining.

## L5 — expansion of selected L4 nodes

### 3a-i-d → cold start
- **3a-i-d-1. New model** — no embedding yet.
- **3a-i-d-2. Solution** — initialize from similar model.
- **3a-i-d-3. Solution 2** — use heuristic fallback.
- **3a-i-d-4. Impact** — degraded routing until data accumulates.

### 7c-i → 0.5 calibration
- **7c-i-1. Balanced** — half queries to strong model.
- **7c-i-2. Cost** — ~50% of strong-model cost.
- **7c-i-3. Quality** — near-strong-model quality.

## L6 — expansion of selected L5 nodes

### 3a-i-d-2 → initialize from similar model
- **3a-i-d-2-i. Similarity metric** — embedding distance.
- **3a-i-d-2-ii. Warm start** — transfer learning.
- **3a-i-d-2-iii. Fine-tune** — update with new data.

## Confidence & open questions

- **High confidence:** all nodes (full paper + repo lm-sys/RouteLLM).
- **Open questions:**
  - How does RouteLLM handle model embeddings for models not in training data?
  - What is the exact D_judge prompt for GPT-4-as-judge?
  - Does the α threshold need recalibration when the model fleet changes?

## Sources

- arXiv:2406.18665 (RouteLLM full paper)
- github.com/lm-sys/RouteLLM (repo)
- `docs/plans-and-prompts/research/9router/37-ai-model-routing-deep-research.md` §2