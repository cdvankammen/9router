# Routing Exponential Expansion R34 — MoE Architecture

**Date:** 2026-09-19
**Author:** GitHub Copilot agent (main session)
**Status:** active
**Tags:** #research #routing #exponential #moe #mixture-of-experts #gating #sparse-routing #architecture

## Objective

N-ary exponential expansion (6+ levels, N children per node) of the root phrase **"MoE architecture (gating networks, sparsity, expert specialization)"** from `43-branch-moe-and-expert-routing.md` Root + L1-A.

## L1 — sub-phrases discovered in the root

1. Gating networks (learned routers)
2. Sparsity (fraction of experts active)
3. Expert specialization (domain/task)
4. Capacity factor (overflow handling)
5. MoE systems (Switch, Mixtral, DeepSeek, GShard)

## L2 — expansion of each L1 node

### 1. Gating networks
- **1a. Router** — selects experts.
- **1b. Top-k** — k experts per token.
- **1c. Softmax** — normalized weights.
- **1d. Learned** — trained with model.

### 2. Sparsity
- **2a. Active fraction** — top-2 of 8.
- **2b. Compute saving** — only active experts.
- **2c. Memory** — all experts loaded.
- **2d. Tradeoff** — quality vs speed.

### 3. Expert specialization
- **3a. Domain** — code, math, language.
- **3b. Emergent** — unsupervised.
- **3c. Fine-grained** — DeepSeek 64 small.
- **3d. Shared** — always-active experts.

### 4. Capacity factor
- **4a. Definition** — tokens per expert.
- **4b. 1.0** — strict, dropping.
- **4c. Overflow** — next expert.
- **4d. Token dropping** — quality impact.

### 5. MoE systems
- **5a. Switch Transformer** — k=1, 7× speedup.
- **5b. Mixtral 8x7B** — k=2, 47B/13B.
- **5c. DeepSeek-MoE** — fine-grained + shared.
- **5d. GShard** — top-2 + capacity.

## L3 — expansion of selected L2 nodes (variable branching)

### 1a → router
- **1a-i. Per-token** — granularity.
- **1a-ii. Per-sequence** — coarser.
- **1a-iii. Learned** — gradient.
- **1a-iv. Hash** — deterministic.

### 2a → active fraction
- **2a-i. k=1** — Switch.
- **2a-ii. k=2** — Mixtral.
- **2a-iii. k=4** — larger.
- **2a-iv. Dynamic** — variable k.

### 3a → domain
- **3a-i. Code** — programming.
- **3a-ii. Math** — reasoning.
- **3a-iii. Language** — general.
- **3a-iv. Multimodal** — vision.

### 4a → definition
- **4a-i. Per batch** — tokens.
- **4a-ii. Per expert** — capacity.
- **4a-iii. Exceed** — overflow.
- **4a-iv. Drop** — loss.

### 5a → Switch Transformer
- **5a-i. k=1** — one expert.
- **5a-ii. 7× speedup** — pre-training.
- **5a-iii. Load balancing** — loss.
- **5a-iv. Scale** — 1.6T params.

## L4 — expansion of selected L3 nodes

### 1a-i → per-token
- **1a-i-a. Granularity** — finest.
- **1a-i-b. Cost** — router per token.
- **1a-i-c. Quality** — best.
- **1a-i-d. Systems** — Mixtral.

### 2a-i → k=1
- **2a-i-a. Switch** — one expert.
- **2a-i-b. Simple** — routing.
- **2a-i-c. Quality** — lower.
- **2a-i-d. Speed** — fastest.

### 3a-i → code
- **3a-i-a. Experts** — code-specialized.
- **3a-i-b. Training** — code corpus.
- **3a-i-c. Quality** — high.
- **3a-i-d. Routing** — token-based.

### 4a-i → per batch
- **4a-i-a. Batch size** — tokens.
- **4a-i-b. Capacity** — batch/k.
- **4a-i-c. Exceed** — overflow.
- **4a-i-d. Drop** — tokens.

### 5a-i → k=1
- **5a-i-a. One expert** — per token.
- **5a-i-b. Simplicity** — routing.
- **5a-i-c. Speedup** — 7×.
- **5a-i-d. Quality** — maintained.

## L5 — expansion of selected L4 nodes

### 1a-i-a → finest granularity
- **1a-i-a-1. Per token** — decision.
- **1a-i-a-2. Mixed** — experts per sentence.
- **1a-i-a-3. Overhead** — router cost.
- **1a-i-a-4. Benefit** — specialization.

### 2a-i-a → Switch
- **2a-i-a-1. Paper** — 2021.
- **2a-i-a-2. Scale** — 1.6T.
- **2a-i-a-3. Speedup** — 7×.
- **2a-i-a-4. Loss** — load balancing.

### 3a-i-a → code experts
- **3a-i-a-1. Training** — GitHub.
- **3a-i-a-2. Tokens** — code.
- **3a-i-a-3. Quality** — code tasks.
- **3a-i-a-4. Routing** — auto.

### 4a-i-a → batch size
- **4a-i-a-1. Fixed** — config.
- **4a-i-a-2. Dynamic** — adaptive.
- **4a-i-a-3. Impact** — capacity.
- **4a-i-a-4. Tuning** — quality.

### 5a-i-a → one expert
- **5a-i-a-1. Selection** — top-1.
- **5a-i-a-2. Weight** — softmax.
- **5a-i-a-3. Compute** — 1/N.
- **5a-i-a-4. Quality** — good.

## L6 — expansion of selected L5 nodes

### 1a-i-a-1 → per-token decision
- **1a-i-a-1-i. Router** — gating network.
- **1a-i-a-1-ii. Logits** — per expert.
- **1a-i-a-1-iii. Top-k** — selection.
- **1a-i-a-1-iv. Weighted** — sum.

### 2a-i-a-1 → paper
- **2a-i-a-1-i. Title** — Switch Transformers.
- **2a-i-a-1-ii. Authors** — Fedus et al.
- **2a-i-a-1-iii. Year** — 2021.
- **2a-i-a-1-iv. Impact** — MoE revival.

### 3a-i-a-1 → GitHub training
- **3a-i-a-1-i. Corpus** — code.
- **3a-i-a-1-ii. Size** — TB.
- **3a-i-a-1-iii. Filter** — quality.
- **3a-i-a-1-iv. License** — permissive.

### 4a-i-a-1 → fixed batch
- **4a-i-a-1-i. Config** — hyperparameter.
- **4a-i-a-1-ii. Default** — 1024.
- **4a-i-a-1-iii. Tuning** — experiments.
- **4a-i-a-1-iv. Effect** — capacity.

### 5a-i-a-1 → top-1
- **5a-i-a-1-i. Winner** — highest logit.
- **5a-i-a-1-ii. Tie** — rare.
- **5a-i-a-1-iii. Weight** — softmax.
- **5a-i-a-1-iv. Compute** — minimal.

## Confidence & open questions

- **High confidence:** MoE architecture facts (Switch, Mixtral, DeepSeek, GShard) from branch 43 + literature.
- **Open questions:**
  - Does 9Router need MoE-aware routing (routing to MoE vs dense models)?
  - How does expert specialization inform model selection?
  - Should 9Router expose MoE model metadata (active params)?

## Sources

- arXiv:2101.03961 (Switch Transformers)
- arXiv:2401.04088 (Mixtral 8x7B)
- arXiv:2402.07864 (DeepSeek-MoE)
- arXiv:2006.16668 (GShard)
- `docs/plans-and-prompts/research/9router/43-branch-moe-and-expert-routing.md` Root + L1-A