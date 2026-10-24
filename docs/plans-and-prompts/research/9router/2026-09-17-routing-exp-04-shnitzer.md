# Routing Exponential Expansion R04 — Shnitzer Benchmark-Dataset Routing

**Date:** 2026-09-17
**Author:** GitHub Copilot agent (main session)
**Status:** active
**Tags:** #research #routing #exponential #shnitzer #benchmark-datasets #binary-classification #ibm

## Objective

N-ary exponential expansion (6+ levels, N children per node) of the root phrase **"Shnitzer benchmark-dataset routing"** from `37-ai-model-routing-deep-research.md` §2.

## L1 — sub-phrases discovered in the root

1. Repurposing benchmark datasets
2. Binary classification tasks ("is model A better than model B?")
3. IBM Research provenance
4. Consistent improvement over single-model baselines
5. LLM selection problem framing

## L2 — expansion of each L1 node

### 1. Repurposing benchmark datasets
- **1a. Source** — arXiv:2309.15789 (correct ID found via arXiv API after 2307.15793 proved unrelated).
- **1b. Idea** — benchmark datasets contain implicit preference labels.
- **1c. No new data collection** — reuse existing benchmarks.
- **1d. Scale** — MMLU, GSM8K, etc.

### 2. Binary classification tasks
- **2a. Pairwise comparison** — "is model A better than model B on this input?"
- **2b. Training** — learn classifier from benchmark labels.
- **2c. Prediction** — at inference, compare candidate models.
- **2d. Reduction** — LLM selection → collection of binary tasks.

### 3. IBM Research provenance
- **3a. Authors** — Shnitzer et al., IBM Research.
- **3b. Paper** — "Large Language Model Routing with Benchmark Datasets."
- **3c. Date** — 2023 (arXiv:2309.15789).

### 4. Consistent improvement
- **4a. Result** — beats using any single model for all tasks.
- **4b. Mechanism** — per-input model selection.
- **4c. Robustness** — consistent across tasks.

### 5. LLM selection problem
- **5a. Framing** — which model to use per input.
- **5b. Alternative** — single-model baseline.
- **5c. Value** — cost/quality optimization.

## L3 — expansion of selected L2 nodes (variable branching)

### 2a → pairwise comparison
- **2a-i. Input** — (query, model_A, model_B).
- **2a-ii. Label** — which model is better.
- **2a-iii. Source of labels** — benchmark ground truth.
- **2a-iv. Classifier** — learns P(A better than B).

### 2b → training
- **2b-i. Features** — query + model outputs.
- **2b-ii. Model** — logistic regression or similar.
- **2b-iii. Loss** — binary cross-entropy.
- **2b-iv. Evaluation** — held-out benchmark.

### 2d → reduction
- **2d-i. All pairs** — C(n,2) comparisons.
- **2d-ii. Aggregation** — rank models by win count.
- **2d-iii. Selection** — pick top-ranked model.
- **2d-iv. Efficiency** — O(n²) comparisons, n small.

### 4a → beats single model
- **4a-i. Why** — different models excel at different inputs.
- **4a-ii. Router advantage** — per-input selection.
- **4a-iii. Cost** — can route to cheaper models when sufficient.

## L4 — expansion of selected L3 nodes

### 2a-iii → benchmark ground truth
- **2a-iii-a. MMLU** — knowledge tasks.
- **2a-iii-b. GSM8K** — math tasks.
- **2a-iii-c. HumanEval** — code tasks.
- **2a-iii-d. Truthfulness** — ground-truth labels.

### 2d-ii → aggregation
- **2d-ii-a. Win count** — number of pairwise wins.
- **2d-ii-b. Win rate** — normalized.
- **2d-ii-c. Ranking** — sort by win rate.
- **2d-ii-d. Ties** — cost tie-break.

## L5 — expansion of selected L4 nodes

### 2a-iii-a → MMLU
- **2a-iii-a-1. 57 subjects** — broad knowledge.
- **2a-iii-a-2. 14K questions** — scale.
- **2a-iii-a-3. Format** — multiple choice.
- **2a-iii-a-4. Use** — knowledge routing.

### 2d-ii-c → ranking
- **2d-ii-c-1. Stable** — consistent across tasks.
- **2d-ii-c-2. Task-specific** — per-task ranking.
- **2d-ii-c-3. Cost-aware** — incorporate price.

## L6 — expansion of selected L5 nodes

### 2a-iii-a-4 → knowledge routing
- **2a-iii-a-4-i. Knowledge-heavy queries** — route to strong models.
- **2a-iii-a-4-ii. Simple queries** — route to cheap models.
- **2a-iii-a-4-iii. Threshold** — confidence-based.

## Confidence & open questions

- **Medium confidence:** abstract only (not full paper).
- **Open questions:**
  - What classifier architecture is used?
  - How are benchmark labels converted to pairwise preferences?
  - Does the approach scale to many models?

## Sources

- arXiv:2309.15789 (Shnitzer et al., IBM Research)
- `docs/plans-and-prompts/research/9router/37-ai-model-routing-deep-research.md` §2