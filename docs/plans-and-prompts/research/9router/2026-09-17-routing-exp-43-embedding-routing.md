# Routing Exponential Expansion R43 — Embedding Routing

**Date:** 2026-09-19
**Author:** GitHub Copilot agent (main session)
**Status:** active
**Tags:** #research #routing #exponential #embedding-routing #encoders #similarity #thresholds #nearest-neighbor

## Objective

N-ary exponential expansion (6+ levels, N children per node) of the root phrase **"Embedding routing (encoders, nearest-neighbor, thresholds)"** from `45-branch-semantic-and-embedding-routing.md` L2-AA + L3-AAA/AAB.

## L1 — sub-phrases discovered in the root

1. Encoder selection (Cohere, OpenAI, HF, FastEmbed)
2. Nearest-neighbor (cosine to centroids)
3. Thresholds (minimum similarity)
4. Similarity metrics (cosine, dot, euclidean, angular)
5. Route centroids (computed from utterances)

## L2 — expansion of each L1 node

### 1. Encoder selection
- **1a. Cohere embed** — commercial.
- **1b. OpenAI embeddings** — text-embedding-3.
- **1c. HF sentence-transformers** — MiniLM.
- **1d. FastEmbed** — ONNX local.

### 2. Nearest-neighbor
- **2a. Query vector** — embedded.
- **2b. Compare** — all routes.
- **2c. Winner** — highest sim.
- **2d. None** — below threshold.

### 3. Thresholds
- **3a. Minimum** — similarity.
- **3b. Per-route** — tuning.
- **3c. Global** — default.
- **3d. Effect** — precision/recall.

### 4. Similarity metrics
- **4a. Cosine** — standard.
- **4b. Dot product** — unnormalized.
- **4c. Euclidean** — distance.
- **4d. Angular** — normalized.

### 5. Route centroids
- **5a. Compute** — mean of utterances.
- **5b. Update** — new examples.
- **5c. Normalize** — unit vector.
- **5d. Store** — per route.

## L3 — expansion of selected L2 nodes (variable branching)

### 1a → Cohere
- **1a-i. Model** — embed-v3.
- **1a-ii. Dim** — 1024.
- **1a-iii. Cost** — per M.
- **1a-iv. Quality** — high.

### 2a → query vector
- **2a-i. Encode** — once.
- **2a-ii. Dim** — encoder-specific.
- **2a-iii. Cache** — per prompt.
- **2a-iv. Latency** — ms.

### 3a → minimum
- **3a-i. Default** — 0.5.
- **3a-ii. Low** — more matches.
- **3a-iii. High** — fewer.
- **3a-iv. Tune** — eval.

### 4a → cosine
- **4a-i. Formula** — dot/norms.
- **4a-ii. Range** — −1..1.
- **4a-iii. Invariant** — scale.
- **4a-iv. Standard** — default.

### 5a → compute
- **5a-i. Mean** — average.
- **5a-ii. Normalize** — unit.
- **5a-iii. Store** — vector.
- **5a-iv. Update** — incremental.

## L4 — expansion of selected L3 nodes

### 1a-i → embed-v3
- **1a-i-a. Version** — v3.
- **1a-i-b. Modes** — search/classify.
- **1a-i-c. Quality** — SOTA.
- **1a-i-d. Cost** — $0.1/M.

### 2a-i → encode once
- **2a-i-a. Per request** — one call.
- **2a-i-b. Reuse** — cache.
- **2a-i-c. Batch** — multiple.
- **2a-i-d. Async** — parallel.

### 3a-i → default 0.5
- **3a-i-a. Balance** — precision.
- **3a-i-b. Recall** — tradeoff.
- **3a-i-c. Tuning** — per use.
- **3a-i-d. Eval** — measure.

### 4a-i → formula
- **4a-i-a. Dot** — numerator.
- **4a-i-b. Norms** — denominator.
- **4a-i-c. Ratio** — result.
- **4a-i-d. Range** — −1..1.

### 5a-i → mean
- **5a-i-a. Average** — vectors.
- **5a-i-b. Outliers** — affected.
- **5a-i-c. Median** — alternative.
- **5a-i-d. Weighted** — option.

## L5 — expansion of selected L4 nodes

### 1a-i-a → v3
- **1a-i-a-1. Release** — 2023.
- **1a-i-a-2. Multilingual** — support.
- **1a-i-a-3. Benchmarks** — MTEB.
- **1a-i-a-4. Adoption** — wide.

### 2a-i-a → per request
- **2a-i-a-1. One** — embedding.
- **2a-i-a-2. Cost** — small.
- **2a-i-a-3. Latency** — added.
- **2a-i-a-4. Cache** — reduce.

### 3a-i-a → balance
- **3a-i-a-1. Precision** — correct matches.
- **3a-i-a-2. Recall** — all matches.
- **3a-i-a-3. F1** — combined.
- **3a-i-a-4. Optimal** — task-dependent.

### 4a-i-a → dot
- **4a-i-a-1. Element-wise** — multiply.
- **4a-i-a-2. Sum** — total.
- **4a-i-a-3. Scalar** — result.
- **4a-i-a-4. Fast** — compute.

### 5a-i-a → average
- **5a-i-a-1. Simple** — mean.
- **5a-i-a-2. Robust** — enough.
- **5a-i-a-3. Bias** — outliers.
- **5a-i-a-4. Fix** — trim.

## L6 — expansion of selected L5 nodes

### 1a-i-a-1 → 2023 release
- **1a-i-a-1-i. Year** — 2023.
- **1a-i-a-1-ii. Model** — embed-v3.
- **1a-i-a-1-iii. API** — Cohere.
- **1a-i-a-1-iv. Docs** — available.

### 2a-i-a-1 → one embedding
- **2a-i-a-1-i. Query** — text.
- **2a-i-a-1-ii. Vector** — output.
- **2a-i-a-1-iii. Compare** — centroids.
- **2a-i-a-1-iv. Decide** — route.

### 3a-i-a-1 → precision
- **3a-i-a-1-i. True positives** — correct.
- **3a-i-a-1-ii. False positives** — wrong.
- **3a-i-a-1-iii. Ratio** — precision.
- **3a-i-a-1-iv. Threshold** — ↑.

### 4a-i-a-1 → element-wise
- **4a-i-a-1-i. Multiply** — pairs.
- **4a-i-a-1-ii. Loop** — dims.
- **4a-i-a-1-iii. Accumulate** — sum.
- **4a-i-a-1-iv. Result** — scalar.

### 5a-i-a-1 → simple mean
- **5a-i-a-1-i. Sum** — vectors.
- **5a-i-a-1-ii. Divide** — count.
- **5a-i-a-1-iii. Result** — centroid.
- **5a-i-a-1-iv. Normalize** — unit.

## Confidence & open questions

- **High confidence:** embedding routing concepts from branch 45 (semantic-router).
- **Open questions:**
  - Which encoder should 9Router default to?
  - What threshold tuning process fits 9Router?
  - Should 9Router cache embeddings per prompt?

## Sources

- aurelio-labs/semantic-router (GitHub)
- `docs/plans-and-prompts/research/9router/45-branch-semantic-and-embedding-routing.md` L2-AA + L3-AAA/AAB