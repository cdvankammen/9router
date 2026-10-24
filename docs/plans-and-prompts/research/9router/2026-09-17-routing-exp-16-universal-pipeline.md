# Routing Exponential Expansion R16 — Universal Decision Pipeline

**Date:** 2026-09-17
**Author:** GitHub Copilot agent (main session)
**Status:** active
**Tags:** #research #routing #exponential #universal-pipeline #five-stages #understand #filter #score #select #execute

## Objective

N-ary exponential expansion (6+ levels, N children per node) of the root phrase **"Universal decision pipeline (5 stages)"** from `37-ai-model-routing-deep-research.md` Synthesis.

## L1 — sub-phrases discovered in the root

1. Stage 1: Understand (signals / classify)
2. Stage 2: Filter (hard constraints)
3. Stage 3: Score / rank (quality · cost · latency)
4. Stage 4: Select (winner + fallbacks)
5. Stage 5: Execute + recover (retries · cooldowns · failover)

## L2 — expansion of each L1 node

### 1. Stage 1: Understand
- **1a. Task type** — OpenRouter, 9Router classifyTask().
- **1b. Difficulty** — Hybrid LLM predicts difficulty.
- **1c. Intent/domain** — vLLM SR signals, semantic-router.
- **1d. Capability needs** — 9Router detectRequiredCapabilities, ClawRouter.
- **1e. Identity/session** — LiteLLM, OpenRouter, 9Router sticky.

### 2. Stage 2: Filter
- **2a. Tools** — ClawRouter, vLLM SR, LiteLLM pre-call, 9Router capacity adapter.
- **2b. Vision** — image input support.
- **2c. Context window** — token fit check.
- **2d. Modality** — text/image/audio/video.
- **2e. Locality** — data residency, EU filter.
- **2f. Policy** — guardrails, allowlists, ZDR.
- **2g. Principle** — a model that can't satisfy the request never wins on price.

### 3. Stage 3: Score / rank
- **3a. Learned** — predicted win probability (RouteLLM), performance score (RouterBench), correctness estimate (AutoMix).
- **3b. Heuristic** — weighted task/capability/cost (9Router, ClawRouter).
- **3c. Market** — spend share (OpenRouter).
- **3d. Load** — latency/least-busy/rate-limit-aware (LiteLLM).

### 4. Stage 4: Select
- **4a. Thresholds** — RouteLLM α.
- **4b. Cost tiers** — OpenRouter cost_tier.
- **4c. Profiles** — ClawRouter profiles.
- **4d. Quality level** — Hybrid LLM.
- **4e. Priority/weight** — coai, LiteLLM order.

### 5. Stage 5: Execute + recover
- **5a. Retries** — with backoff.
- **5b. Cooldowns** — per-deployment.
- **5c. Account failover** — rotation.
- **5d. Session affinity** — stickiness.
- **5e. Circuit breakers** — LiteLLM, 9Router, coai.

## L3 — expansion of selected L2 nodes (variable branching)

### 1a → task type
- **1a-i. OpenRouter ~30 types** — code:debugging, agent:multi_step_planning, etc.
- **1a-ii. 9Router 9 types** — code:generation, agent:multi_step, etc.
- **1a-iii. Classifier** — lightweight.
- **1a-iv. Cost** — ~ms.

### 2g → constraint-first principle
- **2g-i. Hard first** — eligibility gate.
- **2g-ii. Soft second** — preference.
- **2g-iii. Universal** — all serious routers.
- **2g-iv. Why** — cheap model that can't do task wins on price.

### 3a → learned scoring
- **3a-i. RouteLLM** — win probability.
- **3a-ii. RouterBench** — performance score.
- **3a-iii. AutoMix** — correctness estimate.
- **3a-iv. Generalization** — preference data transfers.

### 3b → heuristic scoring
- **3b-i. 9Router** — TASK_WEIGHTS × capability × context × cost regex × tradeoff × concurrency.
- **3b-ii. ClawRouter** — 15-dimension weighted scorer.
- **3b-iii. Hand-tuned** — no training data needed.
- **3b-iv. Transparent** — explainable.

### 4a → RouteLLM α
- **4a-i. Calibration** — strong-model-pct.
- **4a-ii. Tradeoff** — cost vs quality.
- **4a-iii. Fleet change** — router stays.

### 5a → retries
- **5a-i. Exponential backoff** — RateLimitError.
- **5a-ii. Immediate** — generic.
- **5a-iii. retry_after** — min wait.
- **5a-iv. max_retries:0** — avoid (1+N)².

## L4 — expansion of selected L3 nodes

### 2g-i → hard first
- **2g-i-a. Eligibility** — binary.
- **2g-i-b. Filter** — drop.
- **2g-i-c. Score** — rank survivors.
- **2g-i-d. Order** — critical.

### 3b-i → 9Router scoring
- **3b-i-a. TASK_WEIGHTS** — tools/reasoning/search/contextWindow.
- **3b-i-b. Capability fit** — weight×10.
- **3b-i-c. Context** — min(ctx/20000, 20)×weight.
- **3b-i-d. Cost regex** — /opus|pro|max|ultra/ vs /mini|flash|lite|free|cheap/.
- **3b-i-e. Tradeoff** — ±(tradeoff−5)×5/×3.
- **3b-i-f. Concurrency** — activeCount×2.

### 4a-i → calibration
- **4a-i-a. Command** — calibrate_threshold.
- **4a-i-b. Target** — strong-model-pct.
- **4a-i-c. Output** — α.
- **4a-i-d. Recalibrate** — fleet change.

### 5a-i → exponential backoff
- **5a-i-a. Base** — 2s.
- **5a-i-b. Multiplier** — ×2.
- **5a-i-c. Cap** — 4min.
- **5a-i-d. Levels** — 15.

## L5 — expansion of selected L4 nodes

### 3b-i-d → cost regex
- **3b-i-d-1. Expensive** — /opus|pro|max|ultra/.
- **3b-i-d-2. Cheap** — /mini|flash|lite|free|cheap/.
- **3b-i-d-3. Weakness** — name-based, not price-based.
- **3b-i-d-4. Better** — price table.

### 2g-i-a → eligibility
- **2g-i-a-1. Tools** — function calling.
- **2g-i-a-2. Vision** — image support.
- **2g-i-a-3. Context** — window fit.
- **2g-i-a-4. Modality** — input/output.

### 5a-i-a → base 2s
- **5a-i-a-1. First** — 2s.
- **5a-i-a-2. Second** — 4s.
- **5a-i-a-3. Third** — 8s.
- **5a-i-a-4. Cap** — 4min.

## L6 — expansion of selected L5 nodes

### 3b-i-d-3 → name-based weakness
- **3b-i-d-3-i. False positives** — "pro" in name ≠ expensive.
- **3b-i-d-3-ii. False negatives** — cheap model with "pro" name.
- **3b-i-d-3-iii. Solution** — price table.
- **3b-i-d-3-iv. Example** — LiteLLM model_prices_and_context_window.json.

### 2g-i-a-3 → context window fit
- **2g-i-a-3-i. Token count** — estimate.
- **2g-i-a-3-ii. Window** — model limit.
- **2g-i-a-3-iii. Check** — tokens ≤ window.
- **2g-i-a-3-iv. Overflow** — ineligible.

## Confidence & open questions

- **High confidence:** synthesis of all prior research (RouteLLM, RouterBench, OpenRouter, LiteLLM, ClawRouter, vLLM SR, 9Router).
- **Open questions:**
  - Does 9Router's usageDb contain enough outcome signal to train a RouteLLM-style router?
  - What is the actual judge in OpenRouter's classifier?
  - Could 9Router's fusion panel judge error be measured?

## Sources

- `docs/plans-and-prompts/research/9router/37-ai-model-routing-deep-research.md` Synthesis
- All prior research docs (§1–§8)