# Routing Exponential Expansion R36 — MoE-Aware Dispatch

**Date:** 2026-09-19
**Author:** GitHub Copilot agent (main session)
**Status:** active
**Tags:** #research #routing #exponential #moe-aware #dispatch #cross-model #task-expert #ensemble

## Objective

N-ary exponential expansion (6+ levels, N children per node) of the root phrase **"MoE-aware dispatch (cross-model expert routing, task-expert mapping)"** from `43-branch-moe-and-expert-routing.md` L1-B + L2-BB.

## L1 — sub-phrases discovered in the root

1. Task-expert mapping (code → code models)
2. Capability-based routing (vision, tools, context)
3. Cost-aware expert selection
4. Ensemble routing (combine specialists)
5. Specialist vs generalist decision

## L2 — expansion of each L1 node

### 1. Task-expert mapping
- **1a. Code routing** — code models.
- **1b. Math routing** — math models.
- **1c. Agent routing** — agent-tuned.
- **1d. Creative routing** — creative models.

### 2. Capability-based routing
- **2a. Vision** — multimodal.
- **2b. Tools** — function calling.
- **2c. Long context** — large window.
- **2d. Reasoning** — chain-of-thought.

### 3. Cost-aware selection
- **3a. Cost-quality** — tradeoff.
- **3b. Specialist cost** — cheaper.
- **3c. Generalist cost** — pricier.
- **3d. Budget** — per-request.

### 4. Ensemble routing
- **4a. Multiple outputs** — combine.
- **4b. Voting** — majority.
- **4c. Weighted** — confidence.
- **4d. Cost** — multiplied.

### 5. Specialist vs generalist
- **5a. Specialist** — narrow, deep.
- **5b. Generalist** — broad, shallow.
- **5c. Decision** — task-dependent.
- **5d. Hybrid** — both.

## L3 — expansion of selected L2 nodes (variable branching)

### 1a → code routing
- **1a-i. Generation** — write code.
- **1a-ii. Repair** — fix bugs.
- **1a-iii. Review** — analyze.
- **1a-iv. Explain** — describe.

### 2a → vision
- **2a-i. Image input** — multimodal.
- **2a-ii. OCR** — text extraction.
- **2a-iii. Diagram** — understanding.
- **2a-iv. Video** — frames.

### 3a → cost-quality
- **3a-i. Plane** — c-q curve.
- **3a-ii. Frontier** — Pareto.
- **3a-iii. Threshold** — quality floor.
- **3a-iv. Budget** — cost cap.

### 4a → multiple outputs
- **4a-i. N models** — N outputs.
- **4a-ii. Diversity** — different.
- **4a-iii. Combine** — aggregate.
- **4a-iv. Latency** — max.

### 5a → specialist
- **5a-i. Domain** — narrow.
- **5a-ii. Quality** — high.
- **5a-iii. Cost** — low.
- **5a-iv. Coverage** — limited.

## L4 — expansion of selected L3 nodes

### 1a-i → generation
- **1a-i-a. Models** — code-specialized.
- **1a-i-b. Quality** — high.
- **1a-i-c. Cost** — low.
- **1a-i-d. Routing** — task classifier.

### 2a-i → image input
- **2a-i-a. Models** — GPT-4o, Claude.
- **2a-i-b. Format** — base64.
- **2a-i-c. Size** — limits.
- **2a-i-d. 9Router** — image support.

### 3a-i → c-q plane
- **3a-i-a. X-axis** — cost.
- **3a-i-b. Y-axis** — quality.
- **3a-i-c. Points** — models.
- **3a-i-d. Frontier** — Pareto.

### 4a-i → N models
- **4a-i-a. N=2** — pair.
- **4a-i-b. N=3** — trio.
- **4a-i-c. N=5** — panel.
- **4a-i-d. Cost** — N×.

### 5a-i → domain
- **5a-i-a. Code** — narrow.
- **5a-i-b. Math** — narrow.
- **5a-i-c. Legal** — narrow.
- **5a-i-d. Medical** — narrow.

## L5 — expansion of selected L4 nodes

### 1a-i-a → code-specialized
- **1a-i-a-1. Examples** — DeepSeek-Coder.
- **1a-i-a-2. Quality** — HumanEval.
- **1a-i-a-3. Cost** — low.
- **1a-i-a-4. 9Router** — model list.

### 2a-i-a → GPT-4o
- **2a-i-a-1. Vision** — native.
- **2a-i-a-2. Cost** — medium.
- **2a-i-a-3. Quality** — high.
- **2a-i-a-4. 9Router** — provider.

### 3a-i-a → X-axis
- **3a-i-a-1. Cost** — $/request.
- **3a-i-a-2. Scale** — log.
- **3a-i-a-3. Range** — 2–5×.
- **3a-i-a-4. Measure** — usage.

### 4a-i-a → N=2
- **4a-i-a-1. Pair** — two models.
- **4a-i-a-2. Diversity** — different.
- **4a-i-a-3. Vote** — disagree.
- **4a-i-a-4. Cost** — 2×.

### 5a-i-a → code
- **5a-i-a-1. Narrow** — domain.
- **5a-i-a-2. Deep** — expertise.
- **5a-i-a-3. Bench** — HumanEval.
- **5a-i-a-4. Use** — routing.

## L6 — expansion of selected L5 nodes

### 1a-i-a-1 → DeepSeek-Coder
- **1a-i-a-1-i. Open** — weights.
- **1a-i-a-1-ii. Size** — 1.3–33B.
- **1a-i-a-1-iii. Quality** — strong.
- **1a-i-a-1-iv. Cost** — low.

### 2a-i-a-1 → native vision
- **2a-i-a-1-i. Input** — images.
- **2a-i-a-1-ii. Understanding** — visual.
- **2a-i-a-1-iii. OCR** — text.
- **2a-i-a-1-iv. 9Router** — route.

### 3a-i-a-1 → cost per request
- **3a-i-a-1-i. Tokens** — input.
- **3a-i-a-1-ii. Tokens** — output.
- **3a-i-a-1-iii. Price** — per M.
- **3a-i-a-1-iv. Total** — sum.

### 4a-i-a-1 → pair
- **4a-i-a-1-i. Selection** — diverse.
- **4a-i-a-1-ii. Agreement** — high.
- **4a-i-a-1-iii. Disagreement** — tie-break.
- **4a-i-a-1-iv. Cost** — 2×.

### 5a-i-a-1 → narrow
- **5a-i-a-1-i. Scope** — code only.
- **5a-i-a-1-ii. Quality** — best-in-class.
- **5a-i-a-1-iii. Outside** — poor.
- **5a-i-a-1-iv. Routing** — essential.

## Confidence & open questions

- **High confidence:** task-expert mapping and cross-model routing concepts from branch 43.
- **Open questions:**
  - Should 9Router implement task-expert mapping (classifyTask → specialist)?
  - Is ensemble routing worth the cost multiplier?
  - How to measure specialist vs generalist quality per task?

## Sources

- `docs/plans-and-prompts/research/9router/43-branch-moe-and-expert-routing.md` L1-B + L2-BB
- `docs/plans-and-prompts/research/9router/48-branch-emerging-and-frontier.md` (ClawRouter, agent routing)
- `src/sse/handlers/chat.js` (classifyTask)