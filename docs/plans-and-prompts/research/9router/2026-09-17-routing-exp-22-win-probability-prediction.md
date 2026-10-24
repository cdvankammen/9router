# Routing Exponential Expansion R22 — Win-Probability Prediction

**Date:** 2026-09-17
**Author:** GitHub Copilot agent (main session)
**Status:** active
**Tags:** #research #routing #exponential #win-probability #matrix-factorization #similarity-weighted #threshold-calibration #bradley-terry

## Objective

N-ary exponential expansion (6+ levels, N children per node) of the root phrase **"Win-probability prediction (MF/SW internals, threshold calibration)"** from `41-branch-learned-routing.md` L2-AA.

## L1 — sub-phrases discovered in the root

1. MF latent factors (model/query embeddings)
2. SW Bradley-Terry + cosine weights
3. Threshold calibration (α)
4. Generalization across model pairs
5. Cost/performance metrics

## L2 — expansion of each L1 node

### 1. MF latent factors
- **1a. Model embedding** — v_m.
- **1b. Query embedding** — v_q.
- **1c. Interaction** — dot product.
- **1d. Formula** — δ(m,q) = w₂ᵀ(v_m ⊙ (W₁ᵀ v_q + b)).
- **1e. Training** — preference data.

### 2. SW Bradley-Terry
- **2a. Model** — P(A beats B) = σ(s_A − s_B).
- **2b. Cosine weights** — query vs training queries.
- **2c. Cost** — $39.26/M.
- **2d. Speed** — 2.9 req/s.

### 3. Threshold calibration
- **3a. Decision** — route to strong iff P(win) ≥ α.
- **3b. Command** — calibrate_threshold --strong-model-pct.
- **3c. Target** — strong-model usage pct.
- **3d. Output** — α.

### 4. Generalization
- **4a. Transfer** — preference data from one pair transfers to unseen pairs.
- **4b. Mechanism** — learns "when is weak good enough."
- **4c. Fleet change** — router stays.

### 5. Cost/performance
- **5a. MF** — $3.32/M, 155 req/s.
- **5b. SW** — $39.26/M, 2.9 req/s.
- **5c. BERT** — $3.19/M, 69.6 req/s.
- **5d. Causal** — $5.23/M, 42.5 req/s.

## L3 — expansion of selected L2 nodes (variable branching)

### 1a → model embedding
- **1a-i. Dimension** — 64–256.
- **1a-ii. Learned** — from data.
- **1a-iii. Interpretable** — strength.
- **1a-iv. Cold start** — new models.

### 1b → query embedding
- **1b-i. Encoder** — text embedding.
- **1b-ii. Dimension** — 64–256.
- **1b-iii. Learned** — from data.
- **1b-iv. New queries** — embed at inference.

### 2b → cosine weights
- **2b-i. Similarity** — query vs training.
- **2b-ii. Weight** — similarity.
- **2b-iii. Aggregate** — weighted votes.
- **2b-iv. Cost** — embedding computation.

### 3b → calibration command
- **3b-i. CLI** — python -m routellm.calibrate_threshold.
- **3b-ii. --routers** — mf.
- **3b-iii. --strong-model-pct** — 0.5.
- **3b-iv. Output** — α per router.

### 4a → transfer
- **4a-i. Pair A** — training.
- **4a-ii. Pair B** — unseen.
- **4a-iii. Transfer** — works.
- **4a-iv. Why** — general function.

## L4 — expansion of selected L3 nodes

### 1a-i → dimension
- **1a-i-a. 64** — compact.
- **1a-i-b. 128** — common.
- **1a-i-c. 256** — expressive.
- **1a-i-d. Tradeoff** — capacity vs data.

### 2b-i → similarity
- **2b-i-a. Cosine** — metric.
- **2b-i-b. Range** — −1 to 1.
- **2b-i-c. Threshold** — relevance.
- **2b-i-d. Weight** — soft.

### 3b-iii → strong-model-pct
- **3b-iii-a. 0.5** — 50%.
- **3b-iii-b. 0.1** — 10%.
- **3b-iii-c. 0.9** — 90%.
- **3b-iii-d. Curve** — α vs pct.

### 4a-iii → transfer works
- **4a-iii-a. Evidence** — RouteLLM.
- **4a-iii-b. Scope** — model pairs.
- **4a-iii-c. Limit** — domain shift.
- **4a-iii-d. Test** — held-out pairs.

## L5 — expansion of selected L4 nodes

### 1a-i-b → 128
- **1a-i-b-1. Common** — default.
- **1a-i-b-2. Capacity** — sufficient.
- **1a-i-b-3. Data** — 80k battles.
- **1a-i-b-4. Overfit** — risk.

### 2b-i-a → cosine
- **2b-i-a-1. Formula** — a·b/(|a||b|).
- **2b-i-a-2. Range** — −1 to 1.
- **2b-i-a-3. Invariant** — scale.
- **2b-i-a-4. Use** — similarity.

### 3b-iii-a → 0.5
- **3b-iii-a-1. Balanced** — half.
- **3b-iii-a-2. Cost** — ~50%.
- **3b-iii-a-3. Quality** — near-strong.
- **3b-iii-a-4. Default** — common.

## L6 — expansion of selected L5 nodes

### 2b-i-a-1 → cosine formula
- **2b-i-a-1-i. Dot product** — numerator.
- **2b-i-a-1-ii. Norms** — denominator.
- **2b-i-a-1-iii. Zero** — orthogonal.
- **2b-i-a-1-iv. One** — identical.

### 3b-iii-a-2 → ~50% cost
- **3b-iii-a-2-i. Half calls** — strong.
- **3b-iii-a-2-ii. Half** — weak.
- **3b-iii-a-2-iii. Savings** — ~50%.
- **3b-iii-a-2-iv. Quality** — maintained.

## Confidence & open questions

- **High confidence:** full paper + repo (lm-sys/RouteLLM).
- **Open questions:**
  - How are MF latent factors initialized for new models?
  - What is the exact SW aggregation formula?
  - Does α need recalibration when the fleet changes?

## Sources

- arXiv:2406.18665 (RouteLLM)
- github.com/lm-sys/RouteLLM
- `docs/plans-and-prompts/research/9router/41-branch-learned-routing.md` L2-AA