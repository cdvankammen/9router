# Routing Exponential Expansion R10 — OpenRouter Auto Router

**Date:** 2026-09-17
**Author:** GitHub Copilot agent (main session)
**Status:** active
**Tags:** #research #routing #exponential #openrouter #auto-router #spend-share #task-classification #cost-tier #fallback

## Objective

N-ary exponential expansion (6+ levels, N children per node) of the root phrase **"OpenRouter Auto Router (classify/rank/band/fallback, spend share)"** from `37-ai-model-routing-deep-research.md` §4.

## L1 — sub-phrases discovered in the root

1. Four-step pipeline (classify, rank, band, route with fallbacks)
2. ~30 fine-grained task types
3. Real-world spend share (7-day window)
4. cost_tier (low/medium/high/xhigh/max)
5. Fallback chain (top surviving models)
6. Session stickiness
7. Router metadata (X-OpenRouter-Metadata)
8. Market-as-training-signal insight

## L2 — expansion of each L1 node

### 1. Four-step pipeline
- **1a. Classify** — lightweight classifier → task type.
- **1b. Rank** — models by spend share per task type.
- **1c. Band** — apply cost_tier.
- **1d. Route** — top survivors + fallbacks.

### 2. ~30 task types
- **2a. Examples** — code:debugging, agent:multi_step_planning, qa_knowledge, math, customer_support, research_report.
- **2b. Granularity** — fine-grained.
- **2c. Source** — openrouter.ai/rankings#task-spend.
- **2d. Maintenance** — taxonomy updates.

### 3. Spend share
- **3a. Definition** — real-world spend share over trailing 7-day window.
- **3b. Per task type** — separate ranking.
- **3c. Live signal** — no retraining.
- **3d. Source** — openrouter.ai/rankings#task-spend.

### 4. cost_tier
- **4a. Values** — low/medium/high/xhigh/max.
- **4b. Default** — ≈ low.
- **4c. Semantics** — band, not a ceiling.
- **4d. Interaction** — provider.max_price still applies.

### 5. Fallback chain
- **5a. Order** — spend-share order.
- **5b. Primary** — top model.
- **5c. Fallbacks** — next survivors.
- **5d. Constraints** — account restrictions, guardrails, ZDR, allowed_models/excluded_models wildcards, output-modality requirements.
- **5e. Degradation** — graceful to default model set if classification/rankings unavailable.

### 6. Session stickiness
- **6a. Mechanism** — remembers model per conversation.
- **6b. Key** — explicit session_id or message fingerprint.
- **6c. Reuse** — only while still a top candidate.
- **6d. No extra fee** — stickiness is free.

### 7. Router metadata
- **7a. Header** — X-OpenRouter-Metadata: enabled.
- **7b. Pipeline** — openrouter_metadata.pipeline.
- **7c. Task type** — data.task_type.
- **7d. Observability** — client-visible.

### 8. Market-as-training-signal
- **8a. Insight** — aggregate spend is the training signal.
- **8b. Mechanism** — users voting with dollars per task type.
- **8c. Continuously updated** — preference dataset.
- **8d. No cold start** — no model training.

## L3 — expansion of selected L2 nodes (variable branching)

### 1a → classifier
- **1a-i. Lightweight** — fast, cheap.
- **1a-ii. Model** — small classifier.
- **1a-iii. Input** — prompt.
- **1a-iv. Output** — task type.

### 3b → per-task ranking
- **3b-i. Separate lists** — per task type.
- **3b-ii. Window** — 7 days.
- **3b-iii. Update** — continuous.
- **3b-iv. Cold tasks** — low volume.

### 4c → band semantics
- **4c-i. Not a ceiling** — models above band still eligible.
- **4c-ii. Preference** — band is a preference.
- **4c-iii. Interaction** — with max_price.
- **4c-iv. User control** — per-request.

### 5d → constraints
- **5d-i. Account restrictions** — per-account.
- **5d-ii. Guardrails** — content policy.
- **5d-iii. ZDR** — zero data retention.
- **5d-iv. allowed_models** — wildcards.
- **5d-v. excluded_models** — wildcards.
- **5d-vi. Output modality** — text/image/audio.

### 6b → session key
- **6b-i. session_id** — explicit.
- **6b-ii. Message fingerprint** — implicit.
- **6b-iii. Hash** — stable per conversation.
- **6b-iv. Collision** — rare.

## L4 — expansion of selected L3 nodes

### 1a-ii → classifier model
- **1a-ii-a. Small LLM** — e.g., 7B.
- **1a-ii-b. Fine-tuned** — on task labels.
- **1a-ii-c. Latency** — ~ms.
- **1a-ii-d. Fallback** — heuristic.

### 3b-ii → 7-day window
- **3b-ii-a. Why 7 days** — recent signal.
- **3b-ii-b. Seasonality** — weekly cycles.
- **3b-ii-c. Smoothing** — rolling average.
- **3b-ii-d. Cold start** — new models.

### 5d-iv → allowed_models wildcards
- **5d-iv-a. Pattern** — glob.
- **5d-iv-b. Example** — `anthropic/*`.
- **5d-iv-c. Precedence** — over ranking.
- **5d-iv-d. Exclusion** — excluded wins.

### 6b-ii → message fingerprint
- **6b-ii-a. Content hash** — of messages.
- **6b-ii-b. Stability** — same conversation.
- **6b-ii-c. Privacy** — no raw content.
- **6b-ii-d. Collision** — hash collision.

## L5 — expansion of selected L4 nodes

### 1a-ii-b → fine-tuned classifier
- **1a-ii-b-1. Training data** — labeled prompts.
- **1a-ii-b-2. Labels** — task types.
- **1a-ii-b-3. Eval** — held-out.
- **1a-ii-b-4. Update** — periodic.

### 3b-ii-d → cold start
- **3b-ii-d-1. New model** — no spend data.
- **3b-ii-d-2. Solution** — default ranking.
- **3b-ii-d-3. Solution 2** — similar model.
- **3b-ii-d-4. Ramp** — data accumulates.

### 5d-iv-a → glob pattern
- **5d-iv-a-1. `*`** — any.
- **5d-iv-a-2. `?`** — single char.
- **5d-iv-a-3. Prefix** — `anthropic/*`.
- **5d-iv-a-4. Exact** — full name.

## L6 — expansion of selected L5 nodes

### 1a-ii-b-1 → training data
- **1a-ii-b-1-i. Source** — user traffic.
- **1a-ii-b-1-ii. Labeling** — manual/auto.
- **1a-ii-b-1-iii. Volume** — large.
- **1a-ii-b-1-iv. Privacy** — anonymized.

## Confidence & open questions

- **High confidence:** full official docs (openrouter.ai/docs/guides/routing/routers/auto-router).
- **Open questions:**
  - What is the actual judge/classifier in OpenRouter's classifier, and how is it evaluated?
  - How is spend share computed exactly (dollar-weighted)?
  - How does session stickiness interact with fallback chains?

## Sources

- openrouter.ai/docs/guides/routing/routers/auto-router (official docs)
- openrouter.ai/rankings#task-spend (live market signal)
- `docs/plans-and-prompts/research/9router/37-ai-model-routing-deep-research.md` §4