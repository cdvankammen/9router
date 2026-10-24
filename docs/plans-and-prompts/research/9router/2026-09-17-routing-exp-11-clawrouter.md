# Routing Exponential Expansion R11 — ClawRouter

**Date:** 2026-09-17
**Author:** GitHub Copilot agent (main session)
**Status:** active
**Tags:** #research #routing #exponential #clawrouter #constraint-first #15-dimension #profiles #fallback-chain

## Objective

N-ary exponential expansion (6+ levels, N children per node) of the root phrase **"ClawRouter (15-dimension scorer, constraint-first, profiles)"** from `37-ai-model-routing-deep-research.md` §5.

## L1 — sub-phrases discovered in the root

1. 15-dimension weighted scorer
2. Tier + task shape classification
3. Hard filters (tools · vision · context · max-output · structured output)
4. Rank survivors (quality · capability · cost · speed · reliability)
5. Winner + ordered fallback chain
6. Profiles (free/auto/eco/premium)
7. @blockrun/router-core V3.5
8. Benchmarks (57% vs 49%, 6.4% lower cost, 8.9% tokens)

## L2 — expansion of each L1 node

### 1. 15-dimension weighted scorer
- **1a. Dimensions** — task quality, capability, cost, speed, reliability, etc.
- **1b. Weights** — per-profile.
- **1c. Output** — tier (SIMPLE/MEDIUM/COMPLEX/REASONING).
- **1d. Source** — BlockRunAI/ClawRouter README.

### 2. Tier + task shape
- **2a. Tier** — SIMPLE/MEDIUM/COMPLEX/REASONING.
- **2b. Task shape** — code_agent, tool_agent, reasoning_math, long_context, vision.
- **2c. Auto-switch** — tool-requiring turns auto-switch to agent-tuned tiers.
- **2d. Classifier** — task classifier labels shape.

### 3. Hard filters
- **3a. Tools** — model must support function calling.
- **3b. Vision** — model must support images.
- **3c. Context** — window must fit.
- **3d. Max-output** — output token limit.
- **3e. Structured output** — JSON mode.
- **3f. Order** — BEFORE scoring.

### 4. Rank survivors
- **4a. Task quality** — per-task score.
- **4b. Capability** — feature fit.
- **4c. Estimated cost** — price.
- **4d. Speed** — latency.
- **4e. Reliability** — uptime/error rate.
- **4f. Weights** — per-profile (eco leans cost; premium leans quality/reliability).

### 5. Winner + fallback chain
- **5a. Winner** — top-ranked survivor.
- **5b. Chain** — whole ranked list rides along.
- **5c. Recovery** — provider timeout or 5xx costs a retry, not the task.
- **5d. Order** — ranked.

### 6. Profiles
- **6a. /model free** — 100% savings.
- **6b. /model auto** — balanced, 84%.
- **6c. /model eco** — 98%.
- **6d. /model premium** — best quality, 0%.

### 7. @blockrun/router-core V3.5
- **7a. Engine** — constraint-first portfolio router.
- **7b. Inlined at build time** — no runtime dependency.
- **7c. Live model catalog** — injected at startup.
- **7d. Version** — V3.5.

### 8. Benchmarks
- **8a. Task completion** — 57% vs 49% previous rules router.
- **8b. Cost** — 6.4% lower per successful task.
- **8c. Tokens** — 8.9% of pinned flagship.
- **8d. Vision caveat** — free models catalogued as vision-capable aren't reliably; image_url requests route to paid vision models.

## L3 — expansion of selected L2 nodes (variable branching)

### 1a → dimensions
- **1a-i. Task quality** — expected output quality.
- **1a-ii. Capability** — feature support.
- **1a-iii. Cost** — price per token.
- **1a-iv. Speed** — tokens/sec.
- **1a-v. Reliability** — error rate.
- **1a-vi. Context** — window size.
- **1a-vii. Max output** — output limit.
- **1a-viii. Structured output** — JSON support.
- **1a-ix. Tools** — function calling.
- **1a-x. Vision** — image input.
- **1a-xi. Audio** — audio input.
- **1a-xii. Reasoning** — chain-of-thought.
- **1a-xiii. Recency** — knowledge cutoff.
- **1a-xiv. Locality** — data residency.
- **1a-xv. Policy** — content restrictions.

### 3f → order
- **3f-i. Filter first** — drop ineligible.
- **3f-ii. Score second** — rank survivors.
- **3f-iii. Why** — a model that can't satisfy the request never wins on price.
- **3f-iv. Efficiency** — fewer scores.

### 4f → per-profile weights
- **4f-i. eco** — cost-heavy.
- **4f-ii. premium** — quality/reliability-heavy.
- **4f-iii. auto** — balanced.
- **4f-iv. free** — cost-only.

### 5c → recovery
- **5c-i. Timeout** — retry next.
- **5c-ii. 5xx** — retry next.
- **5c-iii. 4xx** — no retry (request error).
- **5c-iv. Task preserved** — retry not task failure.

### 8d → vision caveat
- **8d-i. Catalog inaccuracy** — free models mislabeled.
- **8d-ii. Mitigation** — image requests → paid vision models.
- **8d-iii. Cost impact** — higher cost for image tasks.
- **8d-iv. Fix** — better catalog verification.

## L4 — expansion of selected L3 nodes

### 1a-ix → tools
- **1a-ix-a. Function calling** — API support.
- **1a-ix-b. Tool schema** — JSON schema.
- **1a-ix-c. Execution** — model calls tools.
- **1a-ix-d. Agent loops** — multi-step.

### 3f-iii → never wins on price
- **3f-iii-a. Principle** — capability gates price.
- **3f-iii-b. Example** — no-tools model can't do tool tasks.
- **3f-iii-c. Generalization** — all constraint-first routers.

### 4f-i → eco weights
- **4f-i-a. Cost weight** — high.
- **4f-i-b. Quality weight** — low.
- **4f-i-c. Reliability** — medium.
- **4f-i-d. Result** — 98% savings.

### 5c-i → timeout retry
- **5c-i-a. Detection** — timeout.
- **5c-i-b. Next model** — fallback.
- **5c-i-c. Count** — bounded.
- **5c-i-d. Final** — last resort.

## L5 — expansion of selected L4 nodes

### 1a-ix-a → function calling
- **1a-ix-a-1. OpenAI format** — tools param.
- **1a-ix-a-2. Claude format** — tools param.
- **1a-ix-a-3. Translation** — 9Router translator.
- **1a-ix-a-4. Compatibility** — per-provider.

### 3f-iii-a → capability gates price
- **3f-iii-a-1. Hard constraint** — eligibility.
- **3f-iii-a-2. Soft constraint** — preference.
- **3f-iii-a-3. Order** — hard first.
- **3f-iii-a-4. Example** — vision task.

## L6 — expansion of selected L5 nodes

### 1a-ix-a-1 → OpenAI tools format
- **1a-ix-a-1-i. tools array** — function definitions.
- **1a-ix-a-1-ii. tool_choice** — auto/required.
- **1a-ix-a-1-iii. tool_calls** — response.
- **1a-ix-a-1-iv. tool_result** — follow-up.

## Confidence & open questions

- **High confidence:** full README (BlockRunAI/ClawRouter, 6.6k★, MIT).
- **Open questions:**
  - ClawRouter's 15-dimension scorer weights are proprietary; are they published anywhere?
  - How is the task classifier trained?
  - What is the exact dimension list (15)?

## Sources

- github.com/BlockRunAI/ClawRouter (6.6k★, MIT)
- `docs/plans-and-prompts/research/9router/37-ai-model-routing-deep-research.md` §5