# Routing Exponential Expansion R61 — Wu's LLM Router (Preference Merger)

**Date:** 2026-09-17
**Author:** GitHub Copilot agent (main session)
**Status:** active
**Tags:** #research #routing #exponential #preference-merger #llm-router #wuguang #pairwise #score-based #knobs

## Objective

N-ary exponential expansion (6+ levels, N≥3 children per node) of the root phrase **"Wu's LLM Router (preference merger, pairwise/score-based, knob-tunable)"** from `37-ai-model-routing-deep-research.md` §8.

## L1 — sub-phrases discovered in the root

1. Preference merger (the core algorithm)
2. Pairwise voting (A vs B on task t)
3. Score-based selection (continuous scores)
4. Knob-tunable (quality↔cost lever)
5. GitHub repo (wujingchao00/llm-router)
6. 30★ (small but illustrative)

## L2 — expansion of each L1 node

### 1. Preference merger
- **1a. Definition** — merge preference votes into a ranking.
- **1b. Mechanism** — aggregate pairwise wins.
- **1c. Output** — total order over models.
- **1d. Source** — original implementation.

### 2. Pairwise voting
- **2a. Input** — (query, model A, model B).
- **2b. Label** — which is better.
- **2c. Collection** — preferences.
- **2d. Aggregation** — win counts.

### 3. Score-based
- **3a. Model score** — learned per model.
- **3b. Query score** — learned per query.
- **3c. Interaction** — model × query.
- **3d. Selection** — highest.

### 4. Knob
- **4a. Cost weight** — knob.
- **4b. Quality weight** — knob.
- **4c. Tradeoff** — user-tunable.
- **4d. Shift** — routing.

### 5. Repo
- **5a. Owner** — wujingchao00.
- **5b. Name** — llm-router.
- **5c. Language** — Python.
- **5d. Source** — GitHub.

### 6. Scale
- **6a. Stars** — 30.
- **6b. Meaning** — small demo.
- **6c. Value** — algorithm, not scale.
- **6d. Lesson** — routers need data.

## L3 — expansion of selected L2 nodes

### 2b → pairwise label
- **2b-i. Human preference** — explicit.
- **2b-ii. Judge** — LLM-as-judge.
- **2b-iii. Benchmark** — ground truth.
- **2b-iv. Implicit** — usage.

### 3c → interaction
- **3c-i. Additive** — independent.
- **3c-ii. Multiplicative** — interaction.
- **3c-iii. Learned** — from data.
- **3c-iv. Matrix** — factorization.

### 4a → cost weight
- **4a-i. High** — cost-lean.
- **4a-ii. Low** — quality-lean.
- **4a-iii. Zero** — ignore cost.
- **4a-iv. Negative** — penalize.

## L4 — expansion of selected L3 nodes

### 2b-ii → LLM judge
- **2b-ii-a. Model** — GPT-4.
- **2b-ii-b. Prompt** — compare outputs.
- **2b-ii-c. Bias** — position.
- **2b-ii-d. Error** — measurable.

### 3c-iv → matrix factorization
- **3c-iv-a. Factor** — model embedding.
- **3c-iv-b. Factor** — query embedding.
- **3c-iv-c. Product** — score.
- **3c-iv-d. Training** — labeled.

## L5 — expansion of selected L4 nodes

### 2b-ii-a → GPT-4 judge
- **2b-ii-a-1. Cost** — high.
- **2b-ii-a-2. Accuracy** — good.
- **2b-ii-a-3. Bias** — verbosity.
- **2b-ii-a-4. Alternative** — Claude.

### 3c-iv-d → training
- **3c-iv-d-1. Data** — preferences.
- **3c-iv-d-2. Loss** — ranking.
- **3c-iv-d-3. Optimizer** — SGD.
- **3c-iv-d-4. Eval** — held-out.

## L6 — expansion of selected L5 nodes

### 3c-iv-d-2 → ranking loss
- **3c-iv-d-2-i. Pairwise** — hinge.
- **3c-iv-d-2-ii. Listwise** — NDCG.
- **3c-iv-d-2-iii. Pointwise** — regression.
- **3c-iv-d-2-iv. Choice** — data.

## Confidence & open questions

- **Medium confidence** — repo small.
- **Open questions:**
  - Is a paper published?
  - What dataset was used?
  - How is the knob exposed?

## Sources

- github.com/wujingchao00/llm-router (30★)
- `docs/plans-and-prompts/research/9router/37-ai-model-routing-deep-research.md` §8
- `docs/plans-and-prompts/research/9router/48-branch-emerging-and-frontier.md`