# Routing Exponential Expansion R25 — Cost-Aware Adaptive Routing

**Date:** 2026-09-17
**Author:** GitHub Copilot agent (main session)
**Status:** active
**Tags:** #research #routing #exponential #cost-aware #adaptive-routing #cost-quality #lambda #routerbench #aiq

## Objective

N-ary exponential expansion (6+ levels, N children per node) of the root phrase **"Cost-aware adaptive routing (cost-quality tradeoff, λ)"** from `41-branch-learned-routing.md` L2 (RouterBench lineage).

## L1 — sub-phrases discovered in the root

1. Cost-quality tradeoff
2. λ (lambda) cost weight
3. Cost-quality plane
4. AIQ metric
5. Adaptive routing policies

## L2 — expansion of each L1 node

### 1. Cost-quality tradeoff
- **1a. Cost** — $ per query.
- **1b. Quality** — correctness.
- **1c. Tradeoff** — cheaper vs better.
- **1d. Pareto** — frontier.
- **1e. User choice** — budget.

### 2. λ (lambda)
- **2a. Definition** — cost weight.
- **2b. Formula** — score = quality − λ·cost.
- **2c. High λ** — cost-sensitive.
- **2d. Low λ** — quality-sensitive.
- **2e. Tuning** — per deployment.

### 3. Cost-quality plane
- **3a. Axes** — cost (x), quality (y).
- **3b. Router as point** — each router.
- **3c. Interpolation** — probabilistic mix.
- **3d. Extrapolation** — null router at (0,0).
- **3e. Convex** — plane.

### 4. AIQ
- **4a. Formula** — (1/(c_max−c_min)) ∫ R_θ dc.
- **4b. Meaning** — average quality improvement.
- **4c. Single scalar** — comparison.
- **4d. Use** — ranking routers.

### 5. Adaptive policies
- **5a. Zero router** — NDCH mix.
- **5b. Oracle** — best model.
- **5c. KNN/MLP** — predictive.
- **5d. Cascade** — judge-based.

## L3 — expansion of selected L2 nodes (variable branching)

### 1d → Pareto
- **1d-i. Frontier** — optimal points.
- **1d-ii. Dominance** — better both.
- **1d-iii. Tradeoff** — along frontier.
- **1d-iv. Selection** — user budget.

### 2b → formula
- **2b-i. Quality** — normalized.
- **2b-ii. Cost** — normalized.
- **2b-iii. λ** — weight.
- **2b-iv. Score** — ranking.

### 3c → interpolation
- **3c-i. Mix** — p·A + (1−p)·B.
- **3c-ii. Cost** — linear.
- **3c-iii. Quality** — linear.
- **3c-iv. Hull** — all mixes.

### 4a → AIQ formula
- **4a-i. c_max, c_min** — range.
- **4a-ii. R_θ** — quality at cost.
- **4a-iii. Integral** — area.
- **4a-iv. Normalize** — divide.

### 5a → Zero router
- **5a-i. NDCH** — non-decreasing convex hull.
- **5a-ii. Mix** — probabilistic.
- **5a-iii. Optimal** — expected quality.
- **5a-iv. Baseline** — must beat.

## L4 — expansion of selected L3 nodes

### 1d-i → frontier
- **1d-i-a. Points** — routers.
- **1d-i-b. Envelope** — upper.
- **1d-i-c. Convex** — hull.
- **1d-i-d. Optimal** — on frontier.

### 2b-i → quality
- **2b-i-a. Accuracy** — metric.
- **2b-i-b. Normalize** — 0–1.
- **2b-i-c. Weight** — importance.
- **2b-i-d. Aggregate** — mean.

### 3c-i → mix
- **3c-i-a. p=0** — all B.
- **3c-i-b. p=1** — all A.
- **3c-i-c. p=0.5** — half.
- **3c-i-d. Optimal** — preference.

### 4a-ii → R_θ
- **4a-ii-a. Quality** — at cost c.
- **4a-ii-b. Router** — θ.
- **4a-ii-c. Curve** — quality vs cost.
- **4a-ii-d. Area** — integral.

### 5a-i → NDCH
- **5a-i-a. Non-decreasing** — quality.
- **5a-i-b. Convex hull** — envelope.
- **5a-i-c. Construction** — sort + max.
- **5a-i-d. Zero = NDCH mix**.

## L5 — expansion of selected L4 nodes

### 1d-i-b → envelope
- **1d-i-b-1. Upper** — best quality.
- **1d-i-b-2. Convex** — hull.
- **1d-i-b-3. Points** — routers.
- **1d-i-b-4. Use** — comparison.

### 2b-i-a → accuracy
- **2b-i-a-1. Metric** — correctness.
- **2b-i-a-2. Dataset** — eval.
- **2b-i-a-3. Aggregate** — mean.
- **2b-i-a-4. Weight** — importance.

### 3c-i-d → optimal
- **3c-i-d-1. Preference** — user.
- **3c-i-d-2. Budget** — constraint.
- **3c-i-d-3. Quality** — target.
- **3c-i-d-4. Mix** — chosen.

### 4a-ii-c → curve
- **4a-ii-c-1. Points** — sampled.
- **4a-ii-c-2. Interpolate** — linear.
- **4a-ii-c-3. Area** — integral.
- **4a-ii-c-4. Compare** — routers.

## L6 — expansion of selected L5 nodes

### 1d-i-b-1 → upper envelope
- **1d-i-b-1-i. Best** — quality.
- **1d-i-b-1-ii. Cost** — budget.
- **1d-i-b-1-iii. Router** — chosen.
- **1d-i-b-1-iv. Tradeoff** — frontier.

### 2b-i-a-1 → correctness
- **2b-i-a-1-i. Binary** — right/wrong.
- **2b-i-a-1-ii. Partial** — credit.
- **2b-i-a-1-iii. Judge** — eval.
- **2b-i-a-1-iv. Aggregate** — mean.

## Confidence & open questions

- **High confidence:** RouterBench (FULL paper).
- **Open questions:**
  - How is λ set in practice?
  - What is the exact AIQ computation?
  - How does the cost-quality plane handle non-convex routers?

## Sources

- arXiv:2403.12031 (RouterBench, ICML 2024)
- `docs/plans-and-prompts/research/9router/41-branch-learned-routing.md` L2