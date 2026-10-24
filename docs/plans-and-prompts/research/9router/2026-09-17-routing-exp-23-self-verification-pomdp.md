# Routing Exponential Expansion R23 — Self-Verification + POMDP

**Date:** 2026-09-17
**Author:** GitHub Copilot agent (main session)
**Status:** active
**Tags:** #research #routing #exponential #automix #self-verification #pomdp #belief-state #model-size-selection

## Objective

N-ary exponential expansion (6+ levels, N children per node) of the root phrase **"Self-verification + POMDP (AutoMix internals)"** from `41-branch-learned-routing.md` L2-AB.

## L1 — sub-phrases discovered in the root

1. Few-shot self-verification
2. POMDP-based router
3. Answer confidence estimation
4. Model size selection
5. >50% cost reduction
6. 5 models, 5 datasets

## L2 — expansion of each L1 node

### 1. Few-shot self-verification
- **1a. No training** — few-shot prompting.
- **1b. Mechanism** — model verifies own output.
- **1c. Reliability** — estimated without training data.
- **1d. Noise** — imperfect.
- **1e. Source** — arXiv:2310.12963 (NeurIPS 2024).

### 2. POMDP-based router
- **2a. POMDP** — partially observable Markov decision process.
- **2b. State** — true correctness (hidden).
- **2c. Observation** — self-verification signal (noisy).
- **2d. Action** — route to small/large model.
- **2e. Reward** — cost + quality.

### 3. Answer confidence
- **3a. Source** — self-verification.
- **3b. Form** — scalar.
- **3c. Noise** — handled by POMDP.
- **3d. Use** — routing decision.

### 4. Model size selection
- **4a. Small** — cheap.
- **4b. Large** — expensive.
- **4c. Selection** — confidence-based.
- **4d. Balance** — cost/quality.

### 5. >50% cost reduction
- **5a. Result** — comparable performance.
- **5b. Mechanism** — route easy to small.
- **5c. Context** — 5 models, 5 datasets.

### 6. 5 models, 5 datasets
- **6a. Models** — diverse sizes.
- **6b. Datasets** — diverse tasks.
- **6c. Robustness** — consistent.

## L3 — expansion of selected L2 nodes (variable branching)

### 1b → verification mechanism
- **1b-i. Prompt** — "verify your answer."
- **1b-ii. Few-shot examples** — in-context.
- **1b-iii. Output** — confidence.
- **1b-iv. Calibration** — confidence vs accuracy.

### 2b → state
- **2b-i. Correct** — hidden.
- **2b-ii. Incorrect** — hidden.
- **2b-iii. Belief** — distribution.
- **2b-iv. Update** — Bayes.

### 2c → observation
- **2c-i. Signal** — verification.
- **2c-ii. Noise** — imperfect.
- **2c-iii. Model** — P(obs|state).
- **2c-iv. Multiple** — sequential.

### 3b → scalar form
- **3b-i. Binary** — correct/incorrect.
- **3b-ii. Continuous** — 0–1.
- **3b-iii. Verbalized** — text.
- **3b-iv. Logit** — probability.

### 4c → confidence-based selection
- **4c-i. High confidence** — small model.
- **4c-ii. Low confidence** — large model.
- **4c-iii. Threshold** — calibrated.
- **4c-iv. Dynamic** — per task.

## L4 — expansion of selected L3 nodes

### 1b-i → verify prompt
- **1b-i-a. Simple** — "Is this correct?"
- **1b-i-b. Detailed** — step-by-step.
- **1b-i-c. Few-shot** — 2–3 examples.
- **1b-i-d. Cost** — extra tokens.

### 2b-iii → belief
- **2b-iii-a. Prior** — task difficulty.
- **2b-iii-b. Posterior** — after obs.
- **2b-iii-c. Threshold** — route.
- **2b-iii-d. Update** — sequential.

### 3b-iv → logit
- **3b-iv-a. Softmax** — distribution.
- **3b-iv-b. Max prob** — confidence.
- **3b-iv-c. Temperature** — calibration.
- **3b-iv-d. Reliability** — model-dependent.

### 4c-iii → threshold
- **4c-iii-a. High** — more large calls.
- **4c-iii-b. Low** — more small calls.
- **4c-iii-c. Calibrate** — validation.
- **4c-iii-d. Dynamic** — per task.

## L5 — expansion of selected L4 nodes

### 1b-i-a → simple prompt
- **1b-i-a-1. Text** — "Is this correct?"
- **1b-i-a-2. Response** — yes/no.
- **1b-i-a-3. Confidence** — scalar.
- **1b-i-a-4. Reliability** — moderate.

### 2b-iii-a → prior
- **2b-iii-a-1. Task type** — difficulty.
- **2b-iii-a-2. History** — past accuracy.
- **2b-iii-a-3. Default** — uniform.
- **2b-iii-a-4. Update** — learn.

### 3b-iv-c → temperature
- **3b-iv-c-1. Low** — confident.
- **3b-iv-c-2. High** — uncertain.
- **3b-iv-c-3. Default** — 0.7.
- **3b-iv-c-4. Impact** — calibration.

### 4c-iii-c → calibrate
- **4c-iii-c-1. Validation set** — labeled.
- **4c-iii-c-2. Sweep** — thresholds.
- **4c-iii-c-3. Metric** — cost at quality.
- **4c-iii-c-4. Select** — best.

## L6 — expansion of selected L5 nodes

### 1b-i-a-1 → text
- **1b-i-a-1-i. Exact** — "Is this correct?"
- **1b-i-a-1-ii. Variants** — "Verify."
- **1b-i-a-1-iii. Language** — English.
- **1b-i-a-1-iv. Effect** — moderate.

### 2b-iii-a-1 → task type
- **2b-iii-a-1-i. Math** — hard.
- **2b-iii-a-1-ii. Code** — medium.
- **2b-iii-a-1-iii. Chat** — easy.
- **2b-iii-a-1-iv. Prior** — per type.

## Confidence & open questions

- **Medium confidence:** abstract only (not full paper).
- **Open questions:**
  - How is the POMDP policy computed (exact vs approximate)?
  - What is the self-verification prompt template?
  - How does AutoMix handle multi-turn conversations?

## Sources

- arXiv:2310.12963 (AutoMix, NeurIPS 2024)
- `docs/plans-and-prompts/research/9router/41-branch-learned-routing.md` L2-AB