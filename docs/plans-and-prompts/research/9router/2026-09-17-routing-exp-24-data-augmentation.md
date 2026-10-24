# Routing Exponential Expansion R24 — Data Augmentation

**Date:** 2026-09-17
**Author:** GitHub Copilot agent (main session)
**Status:** active
**Tags:** #research #routing #exponential #data-augmentation #d-gold #d-judge #gpt4-judge #nectar #mmlu #routellm

## Objective

N-ary exponential expansion (6+ levels, N children per node) of the root phrase **"Data augmentation (D_gold, D_judge, ~$700)"** from `41-branch-learned-routing.md` L2 (RouteLLM lineage).

## L1 — sub-phrases discovered in the root

1. D_gold (MMLU ~1500 samples)
2. D_judge (GPT-4-as-judge on Nectar ~120K)
3. ~$700 total cost
4. Augmentation purpose (OOD performance)
5. Preference label generation

## L2 — expansion of each L1 node

### 1. D_gold
- **1a. Source** — MMLU.
- **1b. Scale** — ~1500 samples.
- **1c. Labels** — ground truth.
- **1d. Use** — preference labels.
- **1e. Quality** — high.

### 2. D_judge
- **2a. Source** — Nectar.
- **2b. Scale** — ~120K.
- **2c. Labels** — GPT-4-as-judge.
- **2d. Cost** — ~$700.
- **2e. Quality** — noisy.

### 3. ~$700
- **3a. Breakdown** — judge calls.
- **3b. Per call** — ~$0.006.
- **3c. Scale** — 120K.
- **3d. Cheap** — vs human.

### 4. Purpose
- **4a. OOD** — out-of-distribution.
- **4b. Generalization** — beyond Arena.
- **4c. Coverage** — diverse queries.
- **4d. Robustness** — router.

### 5. Preference labels
- **5a. Pairwise** — A vs B.
- **5b. Winner** — label.
- **5c. Source** — judge/gold.
- **5d. Format** — (q, A, B, w).

## L3 — expansion of selected L2 nodes (variable branching)

### 1b → ~1500 samples
- **1b-i. Small** — high quality.
- **1b-ii. MMLU subjects** — 57.
- **1b-iii. Format** — multiple choice.
- **1b-iv. Use** — gold labels.

### 2b → ~120K
- **2b-i. Large** — coverage.
- **2b-ii. Nectar** — dataset.
- **2b-iii. Diverse** — queries.
- **2b-iv. Noisy** — judge errors.

### 2c → GPT-4-as-judge
- **2c-i. Prompt** — compare outputs.
- **2c-ii. Bias** — position.
- **2c-iii. Error** — measurable.
- **2c-iv. Cost** — per call.

### 4a → OOD
- **4a-i. Arena** — in-distribution.
- **4a-ii. MMLU** — OOD.
- **4a-iii. Nectar** — OOD.
- **4a-iv. Test** — held-out.

### 5b → winner
- **5b-i. A wins** — label.
- **5b-ii. B wins** — label.
- **5b-iii. Tie** — label.
- **5b-iv. Skip** — ties.

## L4 — expansion of selected L3 nodes

### 1b-ii → MMLU subjects
- **1b-ii-a. 57 subjects** — coverage.
- **1b-ii-b. STEM** — math, physics.
- **1b-ii-c. Humanities** — history, law.
- **1b-ii-d. Social** — psychology.

### 2c-i → judge prompt
- **2c-i-a. Template** — "Which is better?"
- **2c-i-b. Criteria** — helpfulness.
- **2c-i-c. Format** — A/B.
- **2c-i-d. Tie** — allowed.

### 4a-ii → MMLU OOD
- **4a-ii-a. Knowledge** — factual.
- **4a-ii-b. Format** — MCQ.
- **4a-ii-c. Difficulty** — varied.
- **4a-ii-d. Value** — OOD test.

### 5b-iii → tie
- **5b-iii-a. Rare** — in practice.
- **5b-iii-b. Handle** — skip.
- **5b-iii-c. Handle** — random.
- **5b-iii-d. Impact** — minor.

## L5 — expansion of selected L4 nodes

### 1b-ii-a → 57 subjects
- **1b-ii-a-1. Broad** — coverage.
- **1b-ii-a-2. Balanced** — per subject.
- **1b-ii-a-3. Standard** — benchmark.
- **1b-ii-a-4. Use** — eval.

### 2c-i-a → template
- **2c-i-a-1. Simple** — "Which is better?"
- **2c-i-a-2. Detailed** — criteria.
- **2c-i-a-3. Few-shot** — examples.
- **2c-i-a-4. Cost** — tokens.

### 4a-ii-a → factual
- **4a-ii-a-1. Knowledge** — recall.
- **4a-ii-a-2. Reasoning** — some.
- **4a-ii-a-3. Ambiguity** — low.
- **4a-ii-a-4. Judge** — reliable.

## L6 — expansion of selected L5 nodes

### 2c-i-a-1 → simple template
- **2c-i-a-1-i. Text** — "Which is better?"
- **2c-i-a-1-ii. Response** — A/B.
- **2c-i-a-1-iii. Reliability** — moderate.
- **2c-i-a-1-iv. Cost** — low.

### 4a-ii-a-1 → knowledge recall
- **4a-ii-a-1-i. Fact** — retrieval.
- **4a-ii-a-1-ii. Model** — knowledge.
- **4a-ii-a-1-iii. Weak model** — fails.
- **4a-ii-a-1-iv. Router** — detects.

## Confidence & open questions

- **High confidence:** full paper + repo (lm-sys/RouteLLM).
- **Open questions:**
  - What is the exact D_judge prompt?
  - How are ties handled in D_gold?
  - What is the exact cost breakdown of ~$700?

## Sources

- arXiv:2406.18665 (RouteLLM)
- github.com/lm-sys/RouteLLM
- `docs/plans-and-prompts/research/9router/41-branch-learned-routing.md` L2