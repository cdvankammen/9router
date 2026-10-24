# Routing Exponential Expansion R26 — Model Cascades

**Date:** 2026-09-17
**Author:** GitHub Copilot agent (main session)
**Status:** active
**Tags:** #research #routing #exponential #model-cascades #frugalgpt #routerbench #cost-first #escalation

## Objective

N-ary exponential expansion (6+ levels, N children per node) of the root phrase **"Model cascades (cost-first escalation)"** from `42-branch-cascades-and-fallbacks.md` L1-A.

## L1 — sub-phrases discovered in the root

1. FrugalGPT cascade (98% cost reduction)
2. RouterBench cascading (judge-dependent)
3. Escalation: cheap → expensive
4. Cascade triggers (low confidence, complexity, preference)
5. Cascade collapse (judge error > 0.2)

## L2 — expansion of each L1 node

### 1. FrugalGPT cascade
- **1a. Strategy** — start cheap, escalate.
- **1b. Result** — matches GPT-4, up to 98% cost reduction.
- **1c. Source** — arXiv:2305.05176.
- **1d. Three strategies** — prompt adaptation, LLM approximation, LLM cascade.

### 2. RouterBench cascading
- **2a. Judge** — g:text→[0,1], threshold t, error ε.
- **2b. Result** — ε ≤ 0.1 beats Zero, approaches Oracle.
- **2c. Collapse** — ε > 0.2.
- **2d. Source** — arXiv:2403.12031.

### 3. Escalation
- **3a. Direction** — cheap → expensive.
- **3b. Trigger** — low confidence.
- **3c. Depth** — how many levels.
- **3d. Stop** — when confident.

### 4. Triggers
- **4a. Low confidence** — judge signal.
- **4b. Task complexity** — estimated.
- **4c. User preference** — explicit.
- **4d. Failure** — error recovery.

### 5. Collapse
- **5a. Condition** — judge error > 0.2.
- **5b. Effect** — worse than Zero.
- **5c. Cause** — wrong escalations.
- **5d. Prevention** — better judge.

## L3 — expansion of selected L2 nodes (variable branching)

### 1a → strategy
- **1a-i. Start cheap** — small model.
- **1a-ii. Escalate** — on need.
- **1a-iii. Stop** — when confident.
- **1a-iv. Cost** — minimized.

### 1b → 98% cost reduction
- **1b-i. Mechanism** — most queries cheap.
- **1b-ii. Quality** — GPT-4 level.
- **1b-iii. Context** — specific tasks.
- **1b-iv. Generalization** — varies.

### 2a → judge
- **2a-i. g:text→[0,1]** — confidence.
- **2a-ii. Threshold t** — escalate.
- **2a-iii. Error ε** — rate.
- **2a-iv. Bottleneck** — quality.

### 3b → trigger
- **3b-i. Signal** — judge.
- **3b-ii. Threshold** — calibrated.
- **3b-iii. False positive** — waste.
- **3b-iv. False negative** — quality loss.

### 4a → low confidence
- **4a-i. Source** — judge.
- **4a-ii. Form** — scalar.
- **4a-iii. Threshold** — t.
- **4a-iv. Action** — escalate.

## L4 — expansion of selected L3 nodes

### 1a-i → start cheap
- **1a-i-a. Model** — small.
- **1a-i-b. Cost** — low.
- **1a-i-c. Speed** — fast.
- **1a-i-d. Quality** — limited.

### 1b-i → most queries cheap
- **1b-i-a. Distribution** — easy majority.
- **1b-i-b. Hard minority** — escalate.
- **1b-i-c. Savings** — large.
- **1b-i-d. Quality** — maintained.

### 2a-i → g function
- **2a-i-a. Input** — text.
- **2a-i-b. Output** — [0,1].
- **2a-i-c. Model** — judge.
- **2a-i-d. Calibration** — needed.

### 3b-ii → threshold
- **3b-ii-a. High** — fewer escalations.
- **3b-ii-b. Low** — more escalations.
- **3b-ii-c. Calibrate** — validation.
- **3b-ii-d. Tradeoff** — cost vs quality.

### 4a-i → judge source
- **4a-i-a. LLM judge** — expensive.
- **4a-i-b. Small judge** — cheap.
- **4a-i-c. Heuristic** — free.
- **4a-i-d. Tradeoff** — accuracy.

## L5 — expansion of selected L4 nodes

### 1a-i-a → small model
- **1a-i-a-1. Size** — 1–8B.
- **1a-i-a-2. Cost** — low.
- **1a-i-a-3. Speed** — fast.
- **1a-i-a-4. Capability** — limited.

### 1b-i-a → easy majority
- **1b-i-a-1. Simple queries** — chat.
- **1b-i-a-2. Short answers** — factual.
- **1b-i-a-3. Low stakes** — casual.
- **1b-i-a-4. Fraction** — 60–90%.

### 2a-i-a → input text
- **2a-i-a-1. Query** — prompt.
- **2a-i-a-2. Output** — response.
- **2a-i-a-3. Both** — combined.
- **2a-i-a-4. Length** — tokens.

### 3b-ii-a → high threshold
- **3b-ii-a-1. Effect** — fewer escalations.
- **3b-ii-a-2. Cost** — lower.
- **3b-ii-a-3. Quality** — risk.
- **3b-ii-a-4. Use** — budget-constrained.

## L6 — expansion of selected L5 nodes

### 1a-i-a-1 → 1–8B size
- **1a-i-a-1-i. Small** — 1B.
- **1a-i-a-1-ii. Medium** — 3B.
- **1a-i-a-1-iii. Large** — 8B.
- **1a-i-a-1-iv. Tradeoff** — capability.

### 1b-i-a-1 → simple queries
- **1b-i-a-1-i. Chat** — casual.
- **1b-i-a-1-ii. Summarize** — short.
- **1b-i-a-1-iii. Extract** — structured.
- **1b-i-a-1-iv. Translate** — common.

## Confidence & open questions

- **High confidence:** FrugalGPT abstract + RouterBench full paper.
- **Open questions:**
  - What is the exact FrugalGPT cascade policy?
  - How is judge error measured in practice?
  - What escalation depth is optimal?

## Sources

- arXiv:2305.05176 (FrugalGPT)
- arXiv:2403.12031 (RouterBench)
- `docs/plans-and-prompts/research/9router/42-branch-cascades-and-fallbacks.md` L1-A