# Routing Exponential Expansion R18 — Key Research Findings

**Date:** 2026-09-17
**Author:** GitHub Copilot agent (main session)
**Status:** active
**Tags:** #research #routing #exponential #key-findings #oracle #zero-router #preference-generalization #hard-filters #pomdp #market-signal #reliability #judge-bottleneck

## Objective

N-ary exponential expansion (6+ levels, N children per node) of the root phrase **"Key research findings (Oracle, Zero, preference generalization, hard filters, POMDP, market signal, reliability, judge bottleneck)"** from `37-ai-model-routing-deep-research.md` Synthesis.

## L1 — sub-phrases discovered in the root

1. The Oracle result (cheapest sufficient model)
2. Simple learned routers don't beat Zero
3. Preference data generalizes
4. Hard filters before scoring
5. Self-verification + POMDP
6. Market share as training signal
7. Reliability is routing too
8. Judge quality is the bottleneck

## L2 — expansion of each L1 node

### 1. The Oracle result
- **1a. Finding** — even with perfect knowledge, GPT-4 is seldom the right choice.
- **1b. Implication** — cheaper models suffice for most queries.
- **1c. Reframe** — routing is about picking the cheapest sufficient model.
- **1d. Source** — RouterBench.

### 2. Simple learned routers don't beat Zero
- **2a. Finding** — KNN/MLP matched best individual LLMs but didn't significantly beat the probabilistic baseline.
- **2b. Implication** — simple learned routers are not magic.
- **2c. Win** — cascades with good judges.
- **2d. Condition** — judge error ≤ 0.1.

### 3. Preference data generalizes
- **3a. Finding** — routers trained on "when is the weak model good enough" transfer across model pairs without retraining.
- **3b. Implication** — model fleet can change while router stays.
- **3c. Source** — RouteLLM.

### 4. Hard filters before scoring
- **4a. Finding** — capability constraints must gate eligibility before any cost/quality optimization.
- **4b. Why** — otherwise a cheap model that can't do the task wins.
- **4c. Sources** — ClawRouter, vLLM SR.

### 5. Self-verification + POMDP
- **5a. Finding** — you don't need training data.
- **5b. Mechanism** — a small model can estimate its own reliability.
- **5c. POMDP** — handles the noise.
- **5d. Source** — AutoMix.

### 6. Market share as training signal
- **6a. Finding** — spend per task type over 7 days is a continuously-updated preference dataset.
- **6b. Cost** — zero training cost.
- **6c. Source** — OpenRouter.

### 7. Reliability is routing too
- **7a. Finding** — cooldowns, retries, session affinity, weighted failover, account rotation are as important as model selection.
- **7b. Why** — a router that picks the perfect model and then dies on a 429 is useless.
- **7c. Sources** — LiteLLM, 9Router.

### 8. Judge quality is the bottleneck
- **8a. Finding** — the entire cascade approach hinges on the judge's error rate.
- **8b. Invest** — in the judge, not the router.
- **8c. Source** — RouterBench cascading.

## L3 — expansion of selected L2 nodes (variable branching)

### 1b → cheaper models suffice
- **1b-i. Most queries** — simple.
- **1b-ii. Few queries** — hard.
- **1b-iii. Distribution** — skewed.
- **1b-iv. Savings** — large.

### 2c → cascades with good judges
- **2c-i. Judge error ≤ 0.1** — beats Zero.
- **2c-ii. Approaches Oracle** — near-optimal.
- **2c-iii. Judge error > 0.2** — collapses.
- **2c-iv. Judge investment** — priority.

### 3a → transfer
- **3a-i. Mechanism** — learns "when is weak good enough."
- **3a-ii. Not** — "which model wins."
- **3a-iii. Fleet change** — router stays.
- **3a-iv. Data** — preference pairs.

### 4a → gate eligibility
- **4a-i. Hard constraint** — binary.
- **4a-ii. Before scoring** — order.
- **4a-iii. Example** — no-tools model.
- **4a-iv. Universal** — all serious routers.

### 5b → self-reliability
- **5b-i. Few-shot** — no training.
- **5b-ii. Verification** — own output.
- **5b-iii. Noise** — imperfect.
- **5b-iv. POMDP** — handles noise.

### 6a → spend per task type
- **6a-i. 7-day window** — recency.
- **6a-ii. Dollar-weighted** — real value.
- **6a-iii. Continuous** — live.
- **6a-iv. No cold start** — no training.

### 7a → reliability layers
- **7a-i. Cooldowns** — 429/5s.
- **7a-ii. Retries** — backoff.
- **7a-iii. Session affinity** — stickiness.
- **7a-iv. Weighted failover** — exclusions.
- **7a-v. Account rotation** — fill-first/round-robin.

### 8a → judge error rate
- **8a-i. ≤ 0.1** — cascade works.
- **8a-ii. > 0.2** — collapse.
- **8a-iii. Measurement** — eval.
- **8a-iv. Improvement** — better judge.

## L4 — expansion of selected L3 nodes

### 1b-i → most queries simple
- **1b-i-a. Distribution** — Pareto.
- **1b-i-b. 80/20** — most queries easy.
- **1b-i-c. Implication** — cheap model default.
- **1b-i-d. Escalation** — for hard.

### 2c-i → judge error ≤ 0.1
- **2c-i-a. Threshold** — 10%.
- **2c-i-b. Feasible** — good judges.
- **2c-i-c. Measurement** — labeled set.
- **2c-i-d. Monitoring** — drift.

### 3a-i → "when is weak good enough"
- **3a-i-a. Weak model** — cheap.
- **3a-i-b. Good enough** — quality threshold.
- **3a-i-c. Learned** — from preferences.
- **3a-i-d. Generalizes** — new pairs.

### 4a-iii → no-tools model
- **4a-iii-a. Task** — tool use.
- **4a-iii-b. Model** — no tools.
- **4a-iii-c. Filter** — drop.
- **4a-iii-d. Never wins** — on price.

### 5b-iv → POMDP handles noise
- **5b-iv-a. Belief state** — correctness distribution.
- **5b-iv-b. Update** — Bayes.
- **5b-iv-c. Policy** — act on belief.
- **5b-iv-d. Reward** — cost + quality.

### 7a-i → cooldowns
- **7a-i-a. 429** — immediate 5s.
- **7a-i-b. >50% failures** — 5s.
- **7a-i-c. 401/404/408** — 5s.
- **7a-i-d. Config** — allowed_fails.

## L5 — expansion of selected L4 nodes

### 1b-i-a → Pareto distribution
- **1b-i-a-1. 80% queries** — easy.
- **1b-i-a-2. 20% queries** — hard.
- **1b-i-a-3. Cost** — 80% cheap.
- **1b-i-a-4. Quality** — maintained.

### 2c-i-a → 10% threshold
- **2c-i-a-1. Feasible** — GPT-4 judge.
- **2c-i-a-2. Cost** — judge calls.
- **2c-i-a-3. Alternative** — smaller judge.
- **2c-i-a-4. Tradeoff** — error vs cost.

### 5b-iv-a → belief state
- **5b-iv-a-1. Prior** — task difficulty.
- **5b-iv-a-2. Posterior** — after verification.
- **5b-iv-a-3. Threshold** — route.
- **5b-iv-a-4. Update** — sequential.

### 7a-i-a → 429 cooldown
- **7a-i-a-1. Trigger** — rate limit.
- **7a-i-a-2. Duration** — 5s.
- **7a-i-a-3. After** — retry.
- **7a-i-a-4. Escalate** — exponential.

## L6 — expansion of selected L5 nodes

### 1b-i-a-1 → 80% easy
- **1b-i-a-1-i. Implication** — cheap default.
- **1b-i-a-1-ii. Router value** — identify hard 20%.
- **1b-i-a-1-iii. Savings** — ~80% cost.
- **1b-i-a-1-iv. Risk** — misclassify.

### 2c-i-a-1 → GPT-4 judge
- **2c-i-a-1-i. Accuracy** — high.
- **2c-i-a-1-ii. Cost** — high.
- **2c-i-a-1-iii. Bias** — verbosity.
- **2c-i-a-1-iv. Alternative** — Claude.

## Confidence & open questions

- **High confidence:** all findings from primary sources (RouterBench, RouteLLM, AutoMix, OpenRouter, LiteLLM, ClawRouter, vLLM SR).
- **Open questions:**
  - Does 9Router's usageDb contain enough outcome signal to train a RouteLLM-style router?
  - Could the fusion panel's judge error be measured?
  - What is the actual judge in OpenRouter's classifier?

## Sources

- `docs/plans-and-prompts/research/9router/37-ai-model-routing-deep-research.md` Synthesis
- All prior research docs