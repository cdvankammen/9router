# Routing Exponential Expansion R06 — AutoMix (Self-Verification + POMDP)

**Date:** 2026-09-17
**Author:** GitHub Copilot agent (main session)
**Status:** active
**Tags:** #research #routing #exponential #automix #self-verification #pomdp #cost-reduction #neurips

## Objective

N-ary exponential expansion (6+ levels, N children per node) of the root phrase **"AutoMix (self-verification + POMDP)"** from `37-ai-model-routing-deep-research.md` §2.

## L1 — sub-phrases discovered in the root

1. Approximate correctness of smaller LM outputs
2. Few-shot self-verification
3. POMDP-based router
4. Partially observable state (noisy self-verification)
5. >50% cost reduction
6. 5 models, 5 datasets evaluation
7. NeurIPS 2024 provenance

## L2 — expansion of each L1 node

### 1. Approximate correctness
- **1a. Definition** — estimate whether a small model's answer is correct.
- **1b. Signal** — self-verification confidence.
- **1c. Use** — route to larger LM only when needed.
- **1d. Source** — arXiv:2310.12963.

### 2. Few-shot self-verification
- **2a. No training** — few-shot prompting.
- **2b. Mechanism** — model verifies its own output.
- **2c. Reliability estimation** — without training data.
- **2d. Noise** — self-verification is noisy.

### 3. POMDP-based router
- **3a. POMDP** — partially observable Markov decision process.
- **3b. State** — true correctness (hidden).
- **3c. Observation** — self-verification signal (noisy).
- **3d. Action** — route to small or large model.
- **3e. Reward** — cost + quality.

### 4. Partially observable state
- **4a. Why POMDP** — self-verification is noisy.
- **4b. Belief state** — probability distribution over correctness.
- **4c. Update** — Bayes rule on observations.
- **4d. Policy** — act on belief state.

### 5. >50% cost reduction
- **5a. Result** — comparable performance at half cost.
- **5b. Mechanism** — route easy queries to small model.
- **5c. Quality** — maintained via verification.

### 6. 5 models, 5 datasets
- **6a. Models** — diverse sizes.
- **6b. Datasets** — diverse tasks.
- **6c. Robustness** — consistent results.

### 7. NeurIPS 2024
- **7a. Venue** — NeurIPS 2024.
- **7b. Recognition** — peer-reviewed.

## L3 — expansion of selected L2 nodes (variable branching)

### 2b → self-verification mechanism
- **2b-i. Prompt** — "verify your answer."
- **2b-ii. Few-shot examples** — in-context.
- **2b-iii. Output** — confidence score.
- **2b-iv. Calibration** — confidence vs accuracy.

### 3a → POMDP internals
- **3a-i. States** — correct/incorrect.
- **3a-ii. Actions** — small/large model.
- **3a-iii. Observations** — verification signal.
- **3a-iv. Transition** — task difficulty.
- **3a-v. Reward** — −cost + quality bonus.

### 4b → belief state
- **4b-i. Prior** — task difficulty prior.
- **4b-ii. Posterior** — after verification.
- **4b-iii. Threshold** — route if belief < threshold.
- **4b-iv. Update** — sequential verification.

### 5b → route easy queries
- **5b-i. Easy detection** — high verification confidence.
- **5b-ii. Small model** — cheap.
- **5b-iii. Hard queries** — large model.
- **5b-iv. Balance** — cost/quality.

## L4 — expansion of selected L3 nodes

### 2b-iii → confidence score
- **2b-iii-a. Binary** — correct/incorrect.
- **2b-iii-b. Scalar** — 0–1.
- **2b-iii-c. Verbalized** — "I am confident."
- **2b-iii-d. Logit-based** — output probability.

### 3a-v → reward design
- **3a-v-a. Cost term** — model price.
- **3a-v-b. Quality term** — correctness.
- **3a-v-c. Weight** — user preference.
- **3a-v-d. Discount** — future cost.

### 4b-iii → threshold
- **4b-iii-a. High threshold** — more large-model calls.
- **4b-iii-b. Low threshold** — more small-model calls.
- **4b-iii-c. Calibration** — on validation set.
- **4b-iii-d. Dynamic** — per-task.

## L5 — expansion of selected L4 nodes

### 2b-iii-d → logit-based confidence
- **2b-iii-d-1. Softmax** — output distribution.
- **2b-iii-d-2. Max probability** — confidence.
- **2b-iii-d-3. Calibration** — temperature.
- **2b-iii-d-4. Reliability** — depends on model.

### 4b-iii-c → calibration
- **4b-iii-c-1. Validation set** — labeled.
- **4b-iii-c-2. Sweep** — threshold values.
- **4b-iii-c-3. Metric** — cost at fixed quality.
- **4b-iii-c-4. Selection** — best threshold.

## L6 — expansion of selected L5 nodes

### 2b-iii-d-3 → temperature
- **2b-iii-d-3-i. Low temp** — confident.
- **2b-iii-d-3-ii. High temp** — uncertain.
- **2b-iii-d-3-iii. Default** — 0.7.
- **2b-iii-d-3-iv. Impact** — calibration.

## Confidence & open questions

- **Medium confidence:** abstract only (not full paper).
- **Open questions:**
  - How is the POMDP policy computed (exact vs approximate)?
  - What is the self-verification prompt template?
  - How does AutoMix handle multi-turn conversations?

## Sources

- arXiv:2310.12963 (AutoMix, NeurIPS 2024)
- `docs/plans-and-prompts/research/9router/37-ai-model-routing-deep-research.md` §2