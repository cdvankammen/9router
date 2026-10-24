# Routing Exponential Expansion R28 — Cascade Escalation Policies

**Date:** 2026-09-19
**Author:** GitHub Copilot agent (main session)
**Status:** active
**Tags:** #research #routing #exponential #cascade #escalation #policies #frugalgpt #routerbench

## Objective

N-ary exponential expansion (6+ levels, N children per node) of the root phrase **"Cascade escalation policies (triggers, depth, judge)"** from `42-branch-cascades-and-fallbacks.md` L2-AA/AB.

## L1 — sub-phrases discovered in the root

1. Escalation triggers (low confidence, complexity, preference)
2. Escalation depth (how many levels)
3. Judge-based escalation (error tolerance)
4. Cascade collapse (judge error > 0.2)
5. Cost-first ordering (cheap → expensive)

## L2 — expansion of each L1 node

### 1. Escalation triggers
- **1a. Low confidence** — judge signal below threshold.
- **1b. Task complexity** — estimated difficulty.
- **1c. User preference** — explicit request.
- **1d. Failure recovery** — error-triggered escalation.

### 2. Escalation depth
- **2a. Two-level** — cheap + expensive.
- **2b. Multi-level** — 3+ model tiers.
- **2c. Depth cap** — max escalations.
- **2d. Stop condition** — confidence achieved.

### 3. Judge-based escalation
- **3a. Judge error ≤ 0.1** — cascade approaches Oracle.
- **3b. Judge error > 0.2** — cascade collapses.
- **3c. Judge quality** — the bottleneck.
- **3d. Judge cost** — per-escalation judge call.

### 4. Cascade collapse
- **4a. Condition** — judge error > 0.2.
- **4b. Effect** — worse than Zero router.
- **4c. Cause** — wrong escalations.
- **4d. Prevention** — better judge or no cascade.

### 5. Cost-first ordering
- **5a. Cheapest first** — default.
- **5b. Quality floor** — minimum acceptable.
- **5c. Budget cap** — max spend.
- **5d. Latency budget** — max time.

## L3 — expansion of selected L2 nodes (variable branching)

### 1a → low confidence
- **1a-i. Signal source** — judge model.
- **1a-ii. Threshold** — calibrated t.
- **1a-iii. False positive** — wasted escalation.
- **1a-iv. False negative** — quality loss.

### 2b → multi-level
- **2b-i. Tiers** — small/medium/large.
- **2b-ii. Step size** — cost delta per level.
- **2b-iii. Quality delta** — per level.
- **2b-iv. Diminishing returns** — top-tier rarely needed.

### 3a → judge error ≤ 0.1
- **3a-i. Measurement** — validation set.
- **3a-ii. Calibration** — threshold tuning.
- **3a-iii. Model choice** — judge model.
- **3a-iv. Stability** — error variance.

### 4b → worse than Zero
- **4b-i. Mechanism** — wrong escalations cost more.
- **4b-ii. Comparison** — vs probabilistic mix.
- **4b-iii. Detection** — eval harness.
- **4b-iv. Mitigation** — disable cascade.

### 5a → cheapest first
- **5a-i. Default** — small model.
- **5a-ii. Escalate** — on trigger.
- **5a-iii. Savings** — 60–90% queries cheap.
- **5a-iv. Risk** — quality on hard queries.

## L4 — expansion of selected L3 nodes

### 1a-i → signal source
- **1a-i-a. LLM judge** — expensive, accurate.
- **1a-i-b. Small judge** — cheap, less accurate.
- **1a-i-c. Heuristic** — free, coarse.
- **1a-i-d. Ensemble** — combined signals.

### 2b-i → tiers
- **2b-i-a. Small** — 1–8B.
- **2b-i-b. Medium** — 8–30B.
- **2b-i-c. Large** — 30–70B.
- **2b-i-d. Frontier** — 70B+.

### 3a-i → measurement
- **3a-i-a. Validation set** — labeled queries.
- **3a-i-b. Error rate** — fraction wrong.
- **3a-i-c. Confidence calibration** — reliability.
- **3a-i-d. Regret** — cost of wrong calls.

### 4b-i → wrong escalations
- **4b-i-a. Over-escalation** — cheap query to expensive model.
- **4b-i-b. Under-escalation** — hard query to cheap model.
- **4b-i-c. Cost impact** — both directions.
- **4b-i-d. Quality impact** — under-escalation worse.

### 5a-i → default small
- **5a-i-a. Coverage** — most queries.
- **5a-i-b. Quality** — adequate for easy.
- **5a-i-c. Speed** — fast.
- **5a-i-d. Cost** — minimal.

## L5 — expansion of selected L4 nodes

### 1a-i-a → LLM judge
- **1a-i-a-1. Model** — GPT-4-class.
- **1a-i-a-2. Cost** — per-call.
- **1a-i-a-3. Latency** — adds to request.
- **1a-i-a-4. Accuracy** — high.

### 2b-i-a → small tier
- **2b-i-a-1. Examples** — Llama-3-8B, GPT-4o-mini.
- **2b-i-a-2. Cost** — $0.1–0.5/M.
- **2b-i-a-3. Capability** — chat, simple tasks.
- **2b-i-a-4. Limit** — complex reasoning.

### 3a-i-b → error rate
- **3a-i-b-1. Definition** — wrong escalation decisions.
- **3a-i-b-2. Measurement** — labeled eval.
- **3a-i-b-3. Target** — ≤ 0.1.
- **3a-i-b-4. Monitoring** — ongoing.

### 4b-i-a → over-escalation
- **4b-i-a-1. Frequency** — judge-dependent.
- **4b-i-a-2. Cost** — extra spend.
- **4b-i-a-3. Detection** — cost logs.
- **4b-i-a-4. Fix** — raise threshold.

### 5a-i-a → coverage
- **5a-i-a-1. Easy queries** — 60–90%.
- **5a-i-a-2. Hard queries** — 10–40%.
- **5a-i-a-3. Distribution** — task-dependent.
- **5a-i-a-4. Savings** — proportional.

## L6 — expansion of selected L5 nodes

### 1a-i-a-1 → GPT-4-class judge
- **1a-i-a-1-i. Cost per call** — $0.01–0.1.
- **1a-i-a-1-ii. Accuracy** — 90%+.
- **1a-i-a-1-iii. Latency** — 1–3s.
- **1a-i-a-1-iv. Use** — high-stakes escalation.

### 2b-i-a-1 → Llama-3-8B
- **2b-i-a-1-i. Open weights** — free.
- **2b-i-a-1-ii. Local** — no API.
- **2b-i-a-1-iii. Quality** — good chat.
- **2b-i-a-1-iv. Limit** — reasoning.

### 3a-i-b-1 → wrong escalation
- **3a-i-b-1-i. Type** — false escalate / false stay.
- **3a-i-b-1-ii. Cost** — asymmetric.
- **3a-i-b-1-iii. Eval** — confusion matrix.
- **3a-i-b-1-iv. Tuning** — threshold.

### 4b-i-a-1 → frequency
- **4b-i-a-1-i. Low threshold** — frequent.
- **4b-i-a-1-ii. High threshold** — rare.
- **4b-i-a-1-iii. Optimal** — calibrated.
- **4b-i-a-1-iv. Monitor** — cost logs.

### 5a-i-a-1 → easy queries
- **5a-i-a-1-i. Chat** — casual.
- **5a-i-a-1-ii. Summarize** — short.
- **5a-i-a-1-iii. Extract** — structured.
- **5a-i-a-1-iv. Translate** — common.

## Confidence & open questions

- **High confidence:** FrugalGPT + RouterBench cascade findings (arXiv:2305.05176, arXiv:2403.12031).
- **Open questions:**
  - What is the optimal escalation depth for 9Router's model tiers?
  - How should 9Router's judge be calibrated (which model, which threshold)?
  - Should escalation be per-request or per-conversation?

## Sources

- arXiv:2305.05176 (FrugalGPT)
- arXiv:2403.12031 (RouterBench)
- `docs/plans-and-prompts/research/9router/42-branch-cascades-and-fallbacks.md` L2-AA/AB