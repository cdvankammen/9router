# Routing Exponential Expansion R21 — Benchmark-Data Routing

**Date:** 2026-09-17
**Author:** GitHub Copilot agent (main session)
**Status:** active
**Tags:** #research #routing #exponential #benchmark-data #shnitzer #routerbench #binary-classification #ibm

## Objective

N-ary exponential expansion (6+ levels, N children per node) of the root phrase **"Benchmark-data routing (Shnitzer / RouterBench lineage)"** from `41-branch-learned-routing.md` L1-B.

## L1 — sub-phrases discovered in the root

1. Shnitzer binary classification approach
2. RouterBench evaluation framework
3. 405,467 samples
4. Cost-quality plane
5. AIQ metric
6. Zero router baseline
7. Oracle router
8. KNN/MLP predictive routers
9. Cascading router with judge

## L2 — expansion of each L1 node

### 1. Shnitzer approach
- **1a. Idea** — repurpose benchmark datasets.
- **1b. Reduction** — LLM selection → binary classification tasks.
- **1c. Question** — "is model A better than model B on this input?"
- **1d. Result** — consistently beats single-model baselines.
- **1e. Source** — arXiv:2309.15789 (IBM Research).

### 2. RouterBench framework
- **2a. Purpose** — rigorous router comparison.
- **2b. Scale** — 405,467 samples, 11 models, 8 datasets, 64 tasks.
- **2c. Venue** — ICML 2024.
- **2d. Authors** — Martian + UC Berkeley + UCSD.

### 3. 405,467 samples
- **3a. Composition** — queries + outputs + labels.
- **3b. Source** — 8 datasets.
- **3c. Use** — training + eval.

### 4. Cost-quality plane
- **4a. Axes** — cost (x), quality (y).
- **4b. Router as point** — each router.
- **4c. Interpolation** — probabilistic mix.
- **4d. Extrapolation** — null router at (0,0).
- **4e. Convex** — plane.

### 5. AIQ
- **5a. Formula** — (1/(c_max−c_min)) ∫ R_θ dc.
- **5b. Meaning** — average quality improvement.
- **5c. Single scalar** — comparison.

### 6. Zero router
- **6a. Definition** — probabilistic mix on NDCH.
- **6b. Maximizes** — expected quality at cost c.
- **6c. Baseline** — must beat.

### 7. Oracle router
- **7a. Definition** — always picks best model.
- **7b. Tie-break** — cheapest.
- **7c. Near-optimal** — at low cost.
- **7d. GPT-4 seldom chosen** — cheaper suffice.

### 8. KNN/MLP
- **8a. KNN** — 40 neighbors, all-MiniLM-L12-v2, cosine.
- **8b. MLP** — 2×100 ReLU, lr 0.001.
- **8c. Score** — score_ij = λ·P_ij − cost_j.
- **8d. Result** — don't beat Zero.

### 9. Cascading router
- **9a. Ranking** — least→most expensive.
- **9b. Judge** — g:text→[0,1], threshold t, error ε.
- **9c. Result** — ε ≤ 0.1 beats Zero.
- **9d. Collapse** — ε > 0.2.

## L3 — expansion of selected L2 nodes (variable branching)

### 1b → reduction
- **1b-i. All pairs** — C(n,2).
- **1b-ii. Classifier** — per pair.
- **1b-iii. Aggregation** — win counts.
- **1b-iv. Selection** — top-ranked.

### 4c → interpolation
- **4c-i. Mix** — p·A + (1−p)·B.
- **4c-ii. Cost** — linear.
- **4c-iii. Quality** — linear.
- **4c-iv. Hull** — all mixes.

### 5a → AIQ formula
- **5a-i. c_max, c_min** — range.
- **5a-ii. R_θ** — quality at cost.
- **5a-iii. Integral** — area.
- **5a-iv. Normalize** — divide.

### 6b → NDCH
- **6b-i. Non-decreasing** — quality.
- **6b-ii. Convex hull** — envelope.
- **6b-iii. Construction** — sort + max.
- **6b-iv. Zero = NDCH mix**.

### 8a → KNN internals
- **8a-i. 40 neighbors** — k.
- **8a-ii. all-MiniLM-L12-v2** — encoder.
- **8a-iii. Cosine** — metric.
- **8a-iv. Weighted average** — prediction.

### 9b → judge
- **9b-i. g:text→[0,1]** — confidence.
- **9b-ii. Threshold t** — escalate.
- **9b-iii. Error ε** — rate.
- **9b-iv. Bottleneck** — quality.

## L4 — expansion of selected L3 nodes

### 1b-ii → classifier
- **1b-ii-a. Features** — query + outputs.
- **1b-ii-b. Model** — logistic regression.
- **1b-ii-c. Loss** — binary CE.
- **1b-ii-d. Eval** — held-out.

### 4c-i → mix
- **4c-i-a. p=0** — all B.
- **4c-i-b. p=1** — all A.
- **4c-i-c. p=0.5** — half.
- **4c-i-d. Optimal** — preference.

### 8a-ii → all-MiniLM-L12-v2
- **8a-ii-a. Size** — 33M.
- **8a-ii-b. Speed** — fast.
- **8a-ii-c. Quality** — good.
- **8a-ii-d. License** — Apache-2.0.

### 9b-iii → error ε
- **9b-iii-a. ≤ 0.1** — works.
- **9b-iii-b. > 0.2** — collapses.
- **9b-iii-c. Measure** — eval.
- **9b-iii-d. Improve** — better judge.

## L5 — expansion of selected L4 nodes

### 1b-ii-a → features
- **1b-ii-a-1. Query embedding** — encoder.
- **1b-ii-a-2. Output A** — text.
- **1b-ii-a-3. Output B** — text.
- **1b-ii-a-4. Combined** — concat.

### 8a-ii-a → 33M params
- **8a-ii-a-1. Small** — fast.
- **8a-ii-a-2. Embedding dim** — 384.
- **8a-ii-a-3. Context** — 512 tokens.
- **8a-ii-a-4. Use** — routing.

### 9b-iii-a → ≤ 0.1
- **9b-iii-a-1. Feasible** — good judges.
- **9b-iii-a-2. Cost** — judge calls.
- **9b-iii-a-3. Alternative** — smaller judge.
- **9b-iii-a-4. Tradeoff** — error vs cost.

## L6 — expansion of selected L5 nodes

### 1b-ii-a-1 → query embedding
- **1b-ii-a-1-i. Encoder** — sentence transformer.
- **1b-ii-a-1-ii. Dim** — 384.
- **1b-ii-a-1-iii. Cache** — per query.
- **1b-ii-a-1-iv. Latency** — ~ms.

### 8a-ii-a-2 → 384 dim
- **8a-ii-a-2-i. Compact** — memory.
- **8a-ii-a-2-ii. Sufficient** — routing.
- **8a-ii-a-2-iii. Compare** — 768 dim.
- **8a-ii-a-2-iv. Tradeoff** — quality vs speed.

## Confidence & open questions

- **High confidence:** RouterBench (FULL paper); **medium:** Shnitzer (abstract).
- **Open questions:**
  - What classifier architecture does Shnitzer use?
  - How are benchmark labels converted to pairwise preferences?
  - What is the exact composition of the 405,467 samples?

## Sources

- arXiv:2309.15789 (Shnitzer, IBM)
- arXiv:2403.12031 (RouterBench, ICML 2024)
- `docs/plans-and-prompts/research/9router/41-branch-learned-routing.md` L1-B