# Routing Exponential Expansion R03 — RouterBench

**Date:** 2026-09-17
**Author:** GitHub Copilot agent (main session)
**Status:** active
**Tags:** #research #routing #exponential #routerbench #evaluation #aiq #zero-router #oracle #cascading

## Objective

N-ary exponential expansion (6+ levels, N children per node) of the root phrase **"RouterBench (c−q plane, AIQ, Zero/Oracle, KNN/MLP, cascading)"** from `37-ai-model-routing-deep-research.md` §2.

## L1 — sub-phrases discovered in the root

1. 405,467 samples (dataset scale)
2. 11 models, 8 datasets, 64 tasks (coverage)
3. Cost-quality (c−q) plane
4. AIQ (Average Improvement in Quality)
5. Zero router (NDCH baseline)
6. Oracle router (best-performing model)
7. Predictive routers (KNN, MLP)
8. Cascading router (judge-based)
9. RAG finding (time-sensitivity)
10. Cost variance (2–5×)

## L2 — expansion of each L1 node

### 1. 405,467 samples
- **1a. Scale** — largest router evaluation dataset.
- **1b. Composition** — queries + model outputs + quality labels.
- **1c. Source** — 8 datasets aggregated.
- **1d. Use** — training + evaluation.

### 2. 11 models, 8 datasets, 64 tasks
- **2a. Models** — GPT-4, GPT-3.5, Claude, Llama, etc.
- **2b. Datasets** — MMLU, GSM8K, etc.
- **2c. Tasks** — 64 task types.
- **2d. Coverage** — broad capability spectrum.

### 3. Cost-quality (c−q) plane
- **3a. Axes** — cost (x), quality (y).
- **3b. Router as point** — each router is a point.
- **3c. Linear interpolation** — probabilistic mix of two routers.
- **3d. Extrapolation** — null router at (0,0).
- **3e. Convexity** — plane is convex.

### 4. AIQ
- **4a. Formula** — AIQ = (1/(c_max−c_min)) ∫ R_θ dc.
- **4b. Meaning** — average quality improvement over cost range.
- **4c. Single scalar** — router comparison.
- **4d. Interpretation** — higher = better.

### 5. Zero router
- **5a. Definition** — probabilistic mix of LLMs on NDCH.
- **5b. NDCH** — non-decreasing convex hull.
- **5c. Maximizes expected quality** — at each cost.
- **5d. Baseline** — any router must beat it.

### 6. Oracle router
- **6a. Definition** — always picks best-performing model.
- **6b. Tie-break** — cheapest on ties.
- **6c. Near-optimal at low cost** — GPT-4 seldom chosen.
- **6d. Upper bound** — theoretical best.

### 7. Predictive routers
- **7a. KNN** — 40 neighbors, all-MiniLM-L12-v2, cosine.
- **7b. MLP** — 2×100 ReLU, lr 0.001.
- **7c. Score** — score_ij = λ·P_ij − cost_j.
- **7d. Result** — neither significantly beats Zero.

### 8. Cascading router
- **8a. Ranking** — LLMs least→most expensive.
- **8b. Judge** — g:text→[0,1] with threshold t and error ε.
- **8c. Result** — judge error ≤ 0.1 beats Zero, approaches Oracle.
- **8d. Collapse** — judge error > 0.2.

### 9. RAG finding
- **9a. Time-sensitivity** — routers learn "2024" → online model.
- **9b. Example** — sonar-medium-online.
- **9c. Implication** — routing must consider recency.

### 10. Cost variance
- **10a. 2–5×** — cost varies for comparable performance.
- **10b. Implication** — cost-aware routing matters.

## L3 — expansion of selected L2 nodes (variable branching)

### 3c → linear interpolation
- **3c-i. Probabilistic mix** — route fraction p to router A, 1−p to B.
- **3c-ii. Cost blend** — c = p·c_A + (1−p)·c_B.
- **3c-iii. Quality blend** — q = p·q_A + (1−p)·q_B.
- **3c-iv. Convex hull** — all mixes form the hull.

### 4a → AIQ formula internals
- **4a-i. c_max, c_min** — cost range.
- **4a-ii. R_θ** — router quality at cost c.
- **4a-iii. Integral** — area under quality curve.
- **4a-iv. Normalization** — divide by cost range.

### 5b → NDCH
- **5b-i. Non-decreasing** — quality never decreases with cost.
- **5b-ii. Convex hull** — upper envelope.
- **5b-iii. Construction** — sort by cost, take max quality.
- **5b-iv. Zero router = NDCH mix** — the best baseline.

### 7a → KNN internals
- **7a-i. 40 neighbors** — k value.
- **7a-ii. all-MiniLM-L12-v2** — embedding model.
- **7a-iii. Cosine similarity** — distance metric.
- **7a-iv. Prediction** — weighted average of neighbor quality.

### 7b → MLP internals
- **7b-i. 2×100 ReLU** — two hidden layers, 100 units.
- **7b-ii. lr 0.001** — learning rate.
- **7b-iii. Input** — query embedding.
- **7b-iv. Output** — per-model quality prediction.

### 8b → judge
- **8b-i. g:text→[0,1]** — judge maps text to confidence.
- **8b-ii. Threshold t** — escalate if confidence < t.
- **8b-iii. Error ε** — judge error rate.
- **8b-iv. Bottleneck** — judge quality is the bottleneck.

## L4 — expansion of selected L3 nodes

### 3c-i → probabilistic mix
- **3c-i-a. p=0** — all router B.
- **3c-i-b. p=1** — all router A.
- **3c-i-c. p=0.5** — half-half.
- **3c-i-d. Optimal p** — depends on cost-quality preference.

### 5b-iii → NDCH construction
- **5b-iii-a. Sort by cost** — ascending.
- **5b-iii-b. Running max quality** — envelope.
- **5b-iii-c. Convexity check** — remove dominated points.
- **5b-iii-d. Result** — piecewise-linear frontier.

### 7a-iv → KNN prediction
- **7a-iv-a. Find k nearest** — by cosine.
- **7a-iv-b. Weight** — similarity-weighted.
- **7a-iv-c. Aggregate** — average quality.
- **7a-iv-d. Confidence** — neighbor agreement.

### 8b-iii → judge error
- **8b-iii-a. ε ≤ 0.1** — cascade works.
- **8b-iii-b. ε > 0.2** — cascade collapses.
- **8b-iii-c. Measurement** — eval on labeled data.
- **8b-iii-d. Improvement** — better judge model.

## L5 — expansion of selected L4 nodes

### 3c-i-d → optimal p
- **3c-i-d-1. Cost-lean** — low p.
- **3c-i-d-2. Quality-lean** — high p.
- **3c-i-d-3. Budget constraint** — max cost.
- **3c-i-d-4. Quality floor** — min quality.

### 8b-iii-c → judge measurement
- **8b-iii-c-1. Labeled eval set** — ground truth.
- **8b-iii-c-2. Error rate** — fraction wrong.
- **8b-iii-c-3. Calibration** — confidence vs accuracy.
- **8b-iii-c-4. Monitoring** — drift detection.

## L6 — expansion of selected L5 nodes

### 8b-iii-c-1 → labeled eval set
- **8b-iii-c-1-i. Construction** — sample queries + human labels.
- **8b-iii-c-1-ii. Size** — hundreds to thousands.
- **8b-iii-c-1-iii. Diversity** — across tasks.
- **8b-iii-c-1-iv. Refresh** — periodic.

## Confidence & open questions

- **High confidence:** all nodes (FULL paper, ICML 2024, Martian + UC Berkeley + UCSD).
- **Open questions:**
  - How is the judge g implemented in practice?
  - Does the Zero router generalize to new model sets?
  - What is the exact composition of the 405,467 samples?

## Sources

- arXiv:2403.12031 (RouterBench FULL paper, ICML 2024)
- `docs/plans-and-prompts/research/9router/37-ai-model-routing-deep-research.md` §2