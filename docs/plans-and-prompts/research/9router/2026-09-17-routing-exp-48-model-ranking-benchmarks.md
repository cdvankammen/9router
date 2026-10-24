# Routing Exponential Expansion R48 — Model Ranking & Benchmarks

**Date:** 2026-09-19
**Author:** GitHub Copilot agent (main session)
**Status:** active
**Tags:** #research #routing #exponential #model-ranking #benchmarks #mt-bench #quality-metrics #ranking

## Objective

N-ary exponential expansion (6+ levels, N children per node) of the root phrase **"Model ranking & benchmarks (quality metrics, MT-Bench, task-specific)"** from `46-branch-evaluation-and-cost-quality.md` L2-BB + L3-BAA/BAB.

## L1 — sub-phrases discovered in the root

1. Quality metrics (accuracy, MT-Bench, task-specific)
2. Quality prediction (per route)
3. Quality thresholds (minimum acceptable)
4. Quality-cost curves (per model)
5. Model ranking (order by quality)

## L2 — expansion of each L1 node

### 1. Quality metrics
- **1a. Accuracy** — task correctness.
- **1b. MT-Bench** — chat quality.
- **1c. Task-specific** — domain.
- **1d. Human eval** — gold standard.

### 2. Quality prediction
- **2a. Per route** — model-task.
- **2b. Learned** — from data.
- **2c. Features** — task, prompt.
- **2d. Confidence** — estimate.

### 3. Quality thresholds
- **3a. Minimum** — acceptable.
- **3b. Per task** — different.
- **3c. Per user** — preference.
- **3d. Enforcement** — routing.

### 4. Quality-cost curves
- **4a. Per model** — quality at cost.
- **4b. Points** — measured.
- **4c. Curve** — interpolated.
- **4d. Frontier** — Pareto.

### 5. Model ranking
- **5a. Order** — by quality.
- **5b. Tiers** — groups.
- **5c. Updates** — new models.
- **5d. 9Router** — registry.

## L3 — expansion of selected L2 nodes (variable branching)

### 1a → accuracy
- **1a-i. Definition** — correct/total.
- **1a-ii. Tasks** — classification.
- **1a-iii. Generation** — harder.
- **1a-iv. Grading** — automated.

### 2a → per route
- **2a-i. Model-task** — pair.
- **2a-ii. Score** — quality.
- **2a-iii. Store** — table.
- **2a-iv. Update** — eval.

### 3a → minimum
- **3a-i. Floor** — quality.
- **3a-ii. Below** — reject.
- **3a-iii. Above** — accept.
- **3a-iv. Config** — per task.

### 4a → per model
- **4a-i. Points** — cost-quality.
- **4a-ii. Curve** — fit.
- **4a-iii. Compare** — models.
- **4a-iv. Choose** — best.

### 5a → order
- **5a-i. Sort** — quality desc.
- **5a-ii. Ties** — cost.
- **5a-iii. Rank** — numeric.
- **5a-iv. Display** — dashboard.

## L4 — expansion of selected L3 nodes

### 1a-i → definition
- **1a-i-a. Correct** — answers.
- **1a-i-b. Total** — questions.
- **1a-i-c. Ratio** — accuracy.
- **1a-i-d. Simple** — metric.

### 2a-i → model-task pair
- **2a-i-a. Matrix** — model × task.
- **2a-i-b. Cell** — quality.
- **2a-i-c. Sparse** — missing.
- **2a-i-d. Fill** — eval.

### 3a-i → floor
- **3a-i-a. Value** — 0.7.
- **3a-i-b. Below** — reject.
- **3a-i-c. Above** — accept.
- **3a-i-d. Tune** — per task.

### 4a-i → points
- **4a-i-a. Cost** — x.
- **4a-i-b. Quality** — y.
- **4a-i-c. Sample** — measure.
- **4a-i-d. Plot** — curve.

### 5a-i → sort
- **5a-i-a. Descending** — quality.
- **5a-i-b. Ascending** — cost.
- **5a-i-c. Stable** — ties.
- **5a-i-d. Display** — list.

## L5 — expansion of selected L4 nodes

### 1a-i-a → correct answers
- **1a-i-a-1. Ground truth** — labels.
- **1a-i-a-2. Compare** — output.
- **1a-i-a-3. Match** — exact.
- **1a-i-a-4. Partial** — credit.

### 2a-i-a → matrix
- **2a-i-a-1. Rows** — models.
- **2a-i-a-2. Columns** — tasks.
- **2a-i-a-3. Cells** — scores.
- **2a-i-a-4. Use** — routing.

### 3a-i-a → 0.7
- **3a-i-a-1. Example** — threshold.
- **3a-i-a-2. Strict** — higher.
- **3a-i-a-3. Lenient** — lower.
- **3a-i-a-4. Tune** — eval.

### 4a-i-a → cost x
- **4a-i-a-1. Per request** — $.
- **4a-i-a-2. Per M** — tokens.
- **4a-i-a-3. Normalize** — length.
- **4a-i-a-4. Compare** — fair.

### 5a-i-a → descending
- **5a-i-a-1. Best** — first.
- **5a-i-a-2. Worst** — last.
- **5a-i-a-3. Default** — view.
- **5a-i-a-4. Filter** — task.

## L6 — expansion of selected L5 nodes

### 1a-i-a-1 → ground truth
- **1a-i-a-1-i. Human** — labeled.
- **1a-i-a-1-ii. Synthetic** — generated.
- **1a-i-a-1-iii. Verified** — checked.
- **1a-i-a-1-iv. Stored** — dataset.

### 2a-i-a-1 → rows
- **2a-i-a-1-i. Model A** — row.
- **2a-i-a-1-ii. Model B** — row.
- **2a-i-a-1-iii. Model C** — row.
- **2a-i-a-1-iv. N models** — rows.

### 3a-i-a-1 → example threshold
- **3a-i-a-1-i. 0.7** — default.
- **3a-i-a-1-ii. 0.8** — strict.
- **3a-i-a-1-iii. 0.6** — lenient.
- **3a-i-a-1-iv. Per-task** — config.

### 4a-i-a-1 → per request
- **4a-i-a-1-i. Input** — tokens.
- **4a-i-a-1-ii. Output** — tokens.
- **4a-i-a-1-iii. Price** — rates.
- **4a-i-a-1-iv. Total** — cost.

### 5a-i-a-1 → best first
- **5a-i-a-1-i. Top** — model.
- **5a-i-a-1-ii. Second** — model.
- **5a-i-a-1-iii. Third** — model.
- **5a-i-a-1-iv. Ranked** — list.

## Confidence & open questions

- **High confidence:** quality metrics and ranking concepts from branch 46.
- **Open questions:**
  - How should 9Router rank models (per task)?
  - What quality thresholds fit 9Router's tasks?
  - Should 9Router maintain a quality-cost matrix?

## Sources

- arXiv:2403.12031 (RouterBench)
- `docs/plans-and-prompts/research/9router/46-branch-evaluation-and-cost-quality.md` L2-BB + L3-BAA/BAB