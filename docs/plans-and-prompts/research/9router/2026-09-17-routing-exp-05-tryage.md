# Routing Exponential Expansion R05 — Tryage Context-Aware Routing

**Date:** 2026-09-17
**Author:** GitHub Copilot agent (main session)
**Status:** active
**Tags:** #research #routing #exponential #tryage #context-aware #thalamic-router #pareto #objective-function

## Objective

N-ary exponential expansion (6+ levels, N children per node) of the root phrase **"Tryage context-aware routing (thalamic router, Pareto)"** from `37-ai-model-routing-deep-research.md` §2.

## L1 — sub-phrases discovered in the root

1. Thalamic router inspiration (brain)
2. Perceptive router (predicts downstream performance)
3. Objective function (integrates predictions with user goals)
4. User flags (model size, recency, security, verbosity, readability)
5. Pareto front exploration
6. 50.9% optimal-model-selection accuracy
7. Baselines (GPT-3.5 Turbo 23.6%, Gorilla 10.8%)

## L2 — expansion of each L1 node

### 1. Thalamic router inspiration
- **1a. Brain analogy** — thalamus routes sensory information.
- **1b. Design principle** — context-aware gating.
- **1c. Source** — arXiv:2308.11601 (Hari & Thomson 2023; correct ID found via arXiv API after 2308.00352 proved to be MetaGPT).

### 2. Perceptive router
- **2a. Function** — predicts downstream model performance per prompt.
- **2b. Input** — prompt text.
- **2c. Output** — performance prediction per candidate model.
- **2d. Training** — supervised on labeled data.

### 3. Objective function
- **3a. Integration** — combines predictions with user goals.
- **3b. Weights** — user-specified priorities.
- **3c. Optimization** — maximize objective.
- **3d. Output** — chosen model.

### 4. User flags
- **4a. Model size** — prefer smaller/larger.
- **4b. Recency** — prefer recent knowledge.
- **4c. Security** — prefer secure models.
- **4d. Verbosity** — prefer concise/verbose.
- **4e. Readability** — prefer readable output.

### 5. Pareto front
- **5a. Definition** — tradeoff surface.
- **5b. Axes** — accuracy vs secondary goals.
- **5c. Exploration** — users explore the front.
- **5d. No single best** — depends on preferences.

### 6. 50.9% accuracy
- **6a. Metric** — optimal-model-selection accuracy.
- **6b. Meaning** — picks the best model 50.9% of the time.
- **6c. Context** — strong result vs baselines.

### 7. Baselines
- **7a. GPT-3.5 Turbo** — 23.6%.
- **7b. Gorilla** — 10.8%.
- **7c. Gap** — Tryage 2.2× better than GPT-3.5.

## L3 — expansion of selected L2 nodes (variable branching)

### 2a → performance prediction
- **2a-i. Per-model** — separate prediction per model.
- **2a-ii. Per-prompt** — context-aware.
- **2a-iii. Features** — prompt embeddings.
- **2a-iv. Training data** — labeled prompt→model→quality.

### 3b → user weights
- **3b-i. Default** — equal weights.
- **3b-ii. Custom** — user-specified.
- **3b-iii. Dynamic** — per-request flags.
- **3b-iv. Tradeoff** — accuracy vs secondary goals.

### 4a → model size flag
- **4a-i. Small** — prefer small models.
- **4a-ii. Large** — prefer large models.
- **4a-iii. Neutral** — no preference.
- **4a-iv. Impact** — cost/latency tradeoff.

### 5a → Pareto front definition
- **5a-i. Dominance** — A dominates B if better on all axes.
- **5a-ii. Frontier** — non-dominated points.
- **5a-iii. Convexity** — shape depends on tradeoffs.
- **5a-iv. User choice** — pick point on front.

## L4 — expansion of selected L3 nodes

### 2a-iii → prompt embeddings
- **2a-iii-a. Encoder** — sentence transformer.
- **2a-iii-b. Dimension** — 384–768.
- **2a-iii-c. Similarity** — cosine.
- **2a-iii-d. Clustering** — task types.

### 3b-iii → dynamic flags
- **3b-iii-a. Per-request** — flags in request.
- **3b-iii-b. Defaults** — from profile.
- **3b-iii-c. Override** — user can change.
- **3b-iii-d. Persistence** — per-conversation.

### 5a-ii → frontier points
- **5a-ii-a. Accuracy-max** — best accuracy.
- **5a-ii-b. Cost-min** — cheapest.
- **5a-ii-c. Balanced** — middle.
- **5a-ii-d. User preference** — any point.

## L5 — expansion of selected L4 nodes

### 2a-iii-a → sentence transformer
- **2a-iii-a-1. all-MiniLM-L12-v2** — common choice.
- **2a-iii-a-2. MPNet** — alternative.
- **2a-iii-a-3. Fine-tuning** — task-specific.
- **2a-iii-a-4. Latency** — ~ms.

### 3b-iii-c → override
- **3b-iii-c-1. API param** — per-request flag.
- **3b-iii-c-2. CLI flag** — command-line.
- **3b-iii-c-3. UI control** — dashboard.
- **3b-iii-c-4. Session default** — sticky.

## L6 — expansion of selected L5 nodes

### 2a-iii-a-1 → all-MiniLM-L12-v2
- **2a-iii-a-1-i. Size** — 33M params.
- **2a-iii-a-1-ii. Speed** — fast.
- **2a-iii-a-1-iii. Quality** — good for routing.
- **2a-iii-a-1-iv. License** — Apache-2.0.

## Confidence & open questions

- **Medium confidence:** abstract only (not full paper).
- **Open questions:**
  - How is the perceptive router trained?
  - What is the exact objective function form?
  - How are user flags mapped to weights?

## Sources

- arXiv:2308.11601 (Tryage, Hari & Thomson 2023)
- `docs/plans-and-prompts/research/9router/37-ai-model-routing-deep-research.md` §2