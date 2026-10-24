# Routing Exponential Expansion R07 — FrugalGPT

**Date:** 2026-09-17
**Author:** GitHub Copilot agent (main session)
**Status:** active
**Tags:** #research #routing #exponential #frugalgpt #prompt-adaptation #llm-approximation #cascade #cost-reduction

## Objective

N-ary exponential expansion (6+ levels, N children per node) of the root phrase **"FrugalGPT (prompt adaptation, approximation, cascade)"** from `37-ai-model-routing-deep-research.md` §2.

## L1 — sub-phrases discovered in the root

1. Prompt adaptation strategy
2. LLM approximation strategy
3. LLM cascade strategy
4. 98% cost reduction (matches GPT-4)
5. Cost-quality tradeoff framing
6. Stanford provenance

## L2 — expansion of each L1 node

### 1. Prompt adaptation
- **1a. Definition** — rewrite prompts for cheaper models.
- **1b. Mechanism** — prompt compression/transformation.
- **1c. Goal** — cheaper model can handle it.
- **1d. Source** — arXiv:2305.05176.

### 2. LLM approximation
- **2a. Definition** — use cheaper models as approximations.
- **2b. Mechanism** — smaller/faster models.
- **2c. Goal** — similar quality at lower cost.
- **2d. Tradeoff** — quality loss.

### 3. LLM cascade
- **3a. Definition** — start cheap, escalate when needed.
- **3b. Mechanism** — sequential model calls.
- **3c. Escalation trigger** — low confidence.
- **3d. Goal** — cost minimization with quality floor.

### 4. 98% cost reduction
- **4a. Result** — matches GPT-4 with 98% cost reduction.
- **4b. Mechanism** — combination of strategies.
- **4c. Context** — specific tasks.
- **4d. Implication** — huge savings potential.

### 5. Cost-quality tradeoff
- **5a. Framing** — cost vs quality frontier.
- **5b. Strategies** — three levers.
- **5c. Combination** — strategies can combine.
- **5d. User control** — quality level.

### 6. Stanford provenance
- **6a. Authors** — Stanford.
- **6b. Paper** — "FrugalGPT: How to Use Large Language Models While Reducing Cost and Improving Performance."

## L3 — expansion of selected L2 nodes (variable branching)

### 1b → prompt rewriting
- **1b-i. Compression** — shorten prompts.
- **1b-ii. Simplification** — simpler language.
- **1b-iii. Restructuring** — better format.
- **1b-iv. Few-shot selection** — relevant examples.

### 2b → cheaper models
- **2b-i. Smaller size** — fewer params.
- **2b-ii. Distilled** — trained from larger.
- **2b-iii. Quantized** — reduced precision.
- **2b-iv. Specialized** — task-tuned.

### 3b → sequential calls
- **3b-i. Order** — cheap to expensive.
- **3b-ii. Stop condition** — confidence threshold.
- **3b-iii. Max depth** — cap on calls.
- **3b-iv. Fallback** — final model.

### 4b → combination
- **4b-i. Adapt + approximate** — rewrite then use cheap model.
- **4b-ii. Adapt + cascade** — rewrite then cascade.
- **4b-iii. Approximate + cascade** — cheap first, escalate.
- **4b-iv. All three** — full pipeline.

## L4 — expansion of selected L3 nodes

### 1b-i → compression
- **1b-i-a. Truncation** — cut long context.
- **1b-i-b. Summarization** — LLM summary.
- **1b-i-c. Extraction** — key facts.
- **1b-i-d. Loss** — information loss.

### 2b-i → smaller size
- **2b-i-a. 7B vs 70B** — order of magnitude.
- **2b-i-b. Quality gap** — task-dependent.
- **2b-i-c. Speed** — faster.
- **2b-i-d. Cost** — cheaper.

### 3b-ii → stop condition
- **3b-ii-a. Confidence** — model self-assessment.
- **3b-ii-b. Judge** — external verifier.
- **3b-ii-c. Heuristic** — task-based.
- **3b-ii-d. Budget** — cost cap.

## L5 — expansion of selected L4 nodes

### 1b-i-a → truncation
- **1b-i-a-1. Window** — context limit.
- **1b-i-a-2. Head/tail** — keep start and end.
- **1b-i-a-3. Middle drop** — lose middle.
- **1b-i-a-4. Impact** — quality loss.

### 3b-ii-a → confidence
- **3b-ii-a-1. Verbalized** — model says confidence.
- **3b-ii-a-2. Logit** — output probability.
- **3b-ii-a-3. Consistency** — sample multiple.
- **3b-ii-a-4. Calibration** — accuracy vs confidence.

## L6 — expansion of selected L5 nodes

### 1b-i-a-2 → head/tail
- **1b-i-a-2-i. System prompt** — keep.
- **1b-i-a-2-ii. Recent turns** — keep.
- **1b-i-a-2-iii. Old turns** — drop.
- **1b-i-a-2-iv. Summary** — replace dropped.

## Confidence & open questions

- **Medium confidence:** abstract only (not full paper).
- **Open questions:**
  - What is the exact cascade stop condition?
  - How are the three strategies combined optimally?
  - What tasks show the 98% reduction?

## Sources

- arXiv:2305.05176 (FrugalGPT)
- `docs/plans-and-prompts/research/9router/37-ai-model-routing-deep-research.md` §2