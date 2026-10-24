# Routing Exponential Expansion R08 — Hybrid LLM

**Date:** 2026-09-17
**Author:** GitHub Copilot agent (main session)
**Status:** active
**Tags:** #research #routing #exponential #hybrid-llm #difficulty-prediction #quality-level #iclr

## Objective

N-ary exponential expansion (6+ levels, N children per node) of the root phrase **"Hybrid LLM (difficulty prediction, quality level)"** from `37-ai-model-routing-deep-research.md` §2.

## L1 — sub-phrases discovered in the root

1. Predicted query difficulty
2. Desired quality level (tunable at test time)
3. Seamless quality↔cost tradeoff
4. 40% fewer large-model calls
5. ICLR 2024 provenance
6. Small vs large model assignment

## L2 — expansion of each L1 node

### 1. Predicted query difficulty
- **1a. Definition** — estimate query difficulty.
- **1b. Mechanism** — classifier.
- **1c. Input** — query text.
- **1d. Output** — difficulty score.
- **1e. Source** — arXiv:2404.14618.

### 2. Desired quality level
- **2a. Definition** — user-specified quality target.
- **2b. Tunable at test time** — no retraining.
- **2c. Mapping** — difficulty + quality → model.
- **2d. Granularity** — continuous or discrete.

### 3. Seamless tradeoff
- **3a. Mechanism** — quality level slider.
- **3b. Cost impact** — higher quality = higher cost.
- **3c. User control** — per-request.
- **3d. No retraining** — instant.

### 4. 40% fewer large-model calls
- **4a. Result** — no quality drop.
- **4b. Mechanism** — route easy queries to small model.
- **4c. Context** — specific benchmarks.

### 5. ICLR 2024
- **5a. Venue** — ICLR 2024.
- **5b. Recognition** — peer-reviewed.

### 6. Small vs large model
- **6a. Two-tier** — small and large.
- **6b. Assignment** — difficulty-based.
- **6c. Extension** — multi-tier.

## L3 — expansion of selected L2 nodes (variable branching)

### 1b → difficulty classifier
- **1b-i. Features** — query embeddings.
- **1b-ii. Training** — labeled difficulty.
- **1b-iii. Model** — small classifier.
- **1b-iv. Latency** — ~ms.

### 2c → difficulty + quality → model
- **2c-i. Easy + low quality** — small model.
- **2c-ii. Easy + high quality** — small or large.
- **2c-iii. Hard + low quality** — large model.
- **2c-iv. Hard + high quality** — large model.

### 3a → quality level slider
- **3a-i. Range** — 0–1.
- **3a-ii. Default** — 0.5.
- **3a-iii. Mapping** — level → threshold.
- **3a-iv. UI** — API param.

### 4b → route easy queries
- **4b-i. Easy detection** — low difficulty score.
- **4b-ii. Small model** — cheap.
- **4b-iii. Quality check** — meets target.
- **4b-iv. Savings** — 40%.

## L4 — expansion of selected L3 nodes

### 1b-i → query embeddings
- **1b-i-a. Encoder** — sentence transformer.
- **1b-i-b. Dimension** — 384–768.
- **1b-i-c. Cache** — per-query.
- **1b-i-d. Update** — model changes.

### 2c-i → easy + low quality
- **2c-i-a. Small model** — cheapest.
- **2c-i-b. Sufficient** — easy task.
- **2c-i-c. Latency** — fast.
- **2c-i-d. Default** — common case.

### 3a-iii → level → threshold
- **3a-iii-a. Low level** — low threshold.
- **3a-iii-b. High level** — high threshold.
- **3a-iii-c. Linear** — simple mapping.
- **3a-iii-d. Nonlinear** — calibrated.

## L5 — expansion of selected L4 nodes

### 1b-i-a → sentence transformer
- **1b-i-a-1. all-MiniLM-L12-v2** — common.
- **1b-i-a-2. MPNet** — alternative.
- **1b-i-a-3. Fine-tuned** — task-specific.
- **1b-i-a-4. Latency** — ~ms.

### 3a-iii-c → linear mapping
- **3a-iii-c-1. Simple** — level = threshold.
- **3a-iii-c-2. Predictable** — easy to reason.
- **3a-iii-c-3. Suboptimal** — may misroute.

## L6 — expansion of selected L5 nodes

### 1b-i-a-1 → all-MiniLM-L12-v2
- **1b-i-a-1-i. Size** — 33M params.
- **1b-i-a-1-ii. Speed** — fast.
- **1b-i-a-1-iii. Quality** — good.
- **1b-i-a-1-iv. License** — Apache-2.0.

## Confidence & open questions

- **Medium confidence:** abstract only (not full paper).
- **Open questions:**
  - How is difficulty labeled for training?
  - What is the exact quality-level mapping?
  - Does it extend beyond two models?

## Sources

- arXiv:2404.14618 (Hybrid LLM, ICLR 2024)
- `docs/plans-and-prompts/research/9router/37-ai-model-routing-deep-research.md` §2