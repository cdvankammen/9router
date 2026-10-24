# Routing Exponential Expansion R35 — Expert Selection & Sparse Routing

**Date:** 2026-09-19
**Author:** GitHub Copilot agent (main session)
**Status:** active
**Tags:** #research #routing #exponential #expert-selection #sparse-routing #top-k #load-balancing #gating

## Objective

N-ary exponential expansion (6+ levels, N children per node) of the root phrase **"Expert selection & sparse routing (top-k, load balancing, gating mechanisms)"** from `43-branch-moe-and-expert-routing.md` L1-A + L2-AA/AB.

## L1 — sub-phrases discovered in the root

1. Top-k selection (k=1 Switch, k=2 Mixtral)
2. Load balancing (auxiliary loss, capacity)
3. Gating mechanisms (softmax, noisy, hash)
4. Router z-loss (stability)
5. Expert dropout (regularization)

## L2 — expansion of each L1 node

### 1. Top-k selection
- **1a. k=1** — Switch.
- **1b. k=2** — Mixtral.
- **1c. Token-level** — per token.
- **1d. Sequence-level** — per sequence.

### 2. Load balancing
- **2a. Auxiliary loss** — penalize imbalance.
- **2b. Expert capacity** — tokens per expert.
- **2c. Overflow** — dropped or rerouted.
- **2d. Coefficient** — α scaling.

### 3. Gating mechanisms
- **3a. Softmax** — normalized weights.
- **3b. Noisy top-k** — trainable noise.
- **3c. Hash-based** — deterministic.
- **3d. Temperature** — sharpening.

### 4. Router z-loss
- **4a. Purpose** — stabilize training.
- **4b. Mechanism** — penalize large logits.
- **4c. Coefficient** — small.
- **4d. Effect** — fewer spikes.

### 5. Expert dropout
- **5a. Purpose** — regularization.
- **5b. Mechanism** — drop experts.
- **5c. Rate** — fraction.
- **5d. Effect** — robustness.

## L3 — expansion of selected L2 nodes (variable branching)

### 1a → k=1
- **1a-i. Switch** — one expert.
- **1a-ii. Quality** — lower bound.
- **1a-iii. Speed** — fastest.
- **1a-iv. Compute** — minimal.

### 2a → auxiliary loss
- **2a-i. Switch loss** — fraction routed.
- **2a-ii. Target** — uniform.
- **2a-iii. Penalty** — deviation.
- **2a-iv. Coefficient** — α.

### 3a → softmax
- **3a-i. Logits** — per expert.
- **3a-ii. Normalize** — sum 1.
- **3a-iii. Top-k** — select.
- **3a-iv. Weighted** — sum.

### 4a → purpose
- **4a-i. Stability** — training.
- **4a-ii. Logits** — bounded.
- **4a-iii. Loss** — added.
- **4a-iv. Scale** — small.

### 5a → purpose
- **5a-i. Overfitting** — reduce.
- **5a-ii. Experts** — dropped.
- **5a-iii. Training** — only.
- **5a-iv. Inference** — all.

## L4 — expansion of selected L3 nodes

### 1a-i → Switch
- **1a-i-a. Paper** — 2021.
- **1a-i-b. k=1** — top-1.
- **1a-i-c. Speedup** — 7×.
- **1a-i-d. Quality** — maintained.

### 2a-i → Switch loss
- **2a-i-a. Formula** — fraction × weight.
- **2a-i-b. Uniform** — target.
- **2a-i-c. Penalty** — squared.
- **2a-i-d. Scale** — α.

### 3a-i → logits
- **3a-i-a. Source** — gating network.
- **3a-i-b. Dimension** — N experts.
- **3a-i-c. Scale** — unbounded.
- **3a-i-d. Normalize** — softmax.

### 4a-i → stability
- **4a-i-a. Training** — stable.
- **4a-i-b. Loss spikes** — reduced.
- **4a-i-c. Convergence** — faster.
- **4a-i-d. Quality** — better.

### 5a-i → overfitting
- **5a-i-a. Experts** — specialize.
- **5a-i-b. Overfit** — narrow.
- **5a-i-c. Dropout** — regularize.
- **5a-i-d. Generalize** — better.

## L5 — expansion of selected L4 nodes

### 1a-i-a → paper
- **1a-i-a-1. Title** — Switch Transformers.
- **1a-i-a-2. Authors** — Fedus et al.
- **1a-i-a-3. Year** — 2021.
- **1a-i-a-4. Scale** — 1.6T.

### 2a-i-a → formula
- **2a-i-a-1. f_i** — fraction routed.
- **2a-i-a-2. P_i** — router prob.
- **2a-i-a-3. Loss** — N·Σ f·P.
- **2a-i-a-4. Minimize** — uniform.

### 3a-i-a → gating network
- **3a-i-a-1. Input** — token hidden.
- **3a-i-a-2. Output** — N logits.
- **3a-i-a-3. Params** — small.
- **3a-i-a-4. Trained** — end-to-end.

### 4a-i-a → training
- **4a-i-a-1. Loss** — combined.
- **4a-i-a-2. Z-loss** — added.
- **4a-i-a-3. Stability** — improved.
- **4a-i-a-4. Speed** — faster.

### 5a-i-a → specialize
- **5a-i-a-1. Emergent** — unsupervised.
- **5a-i-a-2. Domain** — code/math.
- **5a-i-a-3. Overfit** — narrow.
- **5a-i-a-4. Dropout** — helps.

## L6 — expansion of selected L5 nodes

### 1a-i-a-1 → title
- **1a-i-a-1-i. Full** — Switch Transformers.
- **1a-i-a-1-ii. Subtitle** — Scaling to Trillion.
- **1a-i-a-1-iii. Venue** — NeurIPS.
- **1a-i-a-1-iv. Impact** — MoE revival.

### 2a-i-a-1 → f_i
- **2a-i-a-1-i. Count** — tokens to expert.
- **2a-i-a-1-ii. Normalize** — batch.
- **2a-i-a-1-iii. Target** — 1/N.
- **2a-i-a-1-iv. Deviation** — penalized.

### 3a-i-a-1 → input
- **3a-i-a-1-i. Hidden state** — token.
- **3a-i-a-1-ii. Layer** — FFN input.
- **3a-i-a-1-iii. Projection** — linear.
- **3a-i-a-1-iv. Logits** — output.

### 4a-i-a-1 → combined loss
- **4a-i-a-1-i. Main** — LM loss.
- **4a-i-a-1-ii. Aux** — load balance.
- **4a-i-a-1-iii. Z** — stability.
- **4a-i-a-1-iv. Sum** — weighted.

### 5a-i-a-1 → emergent
- **5a-i-a-1-i. No labels** — unsupervised.
- **5a-i-a-1-ii. Pattern** — domain.
- **5a-i-a-1-iii. Consistency** — stable.
- **5a-i-a-1-iv. Analysis** — probes.

## Confidence & open questions

- **High confidence:** top-k, load balancing, gating mechanisms from branch 43 + MoE literature.
- **Open questions:**
  - Should 9Router route to MoE models differently (active-param awareness)?
  - Can expert-specialization insights inform model selection?
  - Does 9Router need load-balancing across accounts (analogous to experts)?

## Sources

- arXiv:2101.03961 (Switch Transformers)
- arXiv:2401.04088 (Mixtral 8x7B)
- arXiv:2402.07864 (DeepSeek-MoE)
- `docs/plans-and-prompts/research/9router/43-branch-moe-and-expert-routing.md` L1-A + L2-AA/AB