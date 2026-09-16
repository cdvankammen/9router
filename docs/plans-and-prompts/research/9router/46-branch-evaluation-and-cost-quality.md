---
Date: 2026-09-15
Author: GitHub Copilot
Status: active
Tags: research, branch, evaluation, benchmark, cost-quality, routerbench, model-ranking
---

# Branch 6 — Evaluation & Cost-Quality (RouterBench / benchmarks / model ranking / cost-quality tradeoffs)

> Part of the binary-tree research expansion (see `39-binary-tree-expansion-master-plan.md`).
> This branch covers every node whose topic descends from routing evaluation, benchmarks, and cost-quality analysis.

## Root

**Evaluation & cost-quality** = how we measure whether a router is good. The central question: given a cost budget, does the router deliver the best possible quality? This branch covers benchmark methodology (RouterBench), cost-quality planes, model ranking, and the tradeoff analysis that justifies routing itself.

## Level 1 — Two Children

### A. Benchmark Methodology (RouterBench lineage)

**RouterBench (arXiv:2403.12031)** — the canonical routing benchmark:
- **405,467 samples, 11 models, 8 datasets, 64 tasks.**
- **Cost-quality (c-q) plane** with linear interpolation and extrapolation; null router at (0,0).
- **AIQ** = $\frac{1}{c_{max}-c_{min}} \int R_\theta \, dc$ — single scalar for router comparison.
- **Zero router** = probabilistic mix of LLMs on NDCH maximizing expected quality at cost c — baseline any router must beat.
- **Oracle router** near-optimal at low cost; **GPT-4 seldom chosen**.
- Predictive routers (KNN 40 neighbors all-MiniLM-L12-v2, MLP 2×100 ReLU lr 0.001) with score_ij = λ·P_ij − cost_j **do NOT significantly beat Zero**.
- **Cascading router with judge error ≤ 0.1 beats Zero significantly and approaches Oracle; collapses when judge error > 0.2.**
- RAG: routers learn time-sensitivity (route "2024" queries to online models).
- Costs vary **2–5×** for comparable performance.

### B. Cost-Quality Analysis (FrugalGPT / RouteLLM / Hybrid LLM lineage)

**Key findings from the corpus:**
- **FrugalGPT**: matches GPT-4 with up to **98% cost reduction** via cascades.
- **RouteLLM**: up to **85% cost reduction** at 95% GPT-4 MT-Bench performance.
- **AutoMix**: **>50% cost reduction** at comparable performance.
- **Hybrid LLM**: **40% fewer large-model calls** with no quality drop.
- **Costs vary 2–5×** for comparable performance (RouterBench).
- **Oracle result**: GPT-4 is seldom the right choice; cheapest sufficient model wins.

## Level 2 — Four Children

### AA. Benchmark Design
- **Sample size** — 405k samples for statistical power.
- **Model coverage** — 11 models across tiers.
- **Task coverage** — 64 tasks across 8 datasets.
- **Cost measurement** — per-request cost tracking.

### AB. Router Metrics
- **AIQ** — area under cost-quality curve.
- **Cost-quality plane** — interpolation/extrapolation.
- **Null router** — (0,0) baseline.
- **Zero router** — probabilistic mix baseline.

### BA. Cost Modeling
- **Per-request cost** — $/M tokens.
- **Cost tiers** — cheap/medium/expensive.
- **Cost variance** — 2–5× for comparable performance.
- **Cost prediction** — predicted cost per route.

### BB. Quality Modeling
- **Quality metrics** — accuracy, MT-Bench, task-specific.
- **Quality prediction** — predicted quality per route.
- **Quality thresholds** — minimum acceptable quality.
- **Quality-cost curves** — per-model quality at each cost.

## Level 3 — Eight Children (selected nodes)

### AAA. Dataset Construction
- **Task diversity** — 64 tasks across domains.
- **Model diversity** — 11 models across tiers.
- **Sample balance** — per-task sample counts.
- **Time sensitivity** — temporal queries (RAG finding).

### AAB. Statistical Power
- **Sample size** — 405k samples.
- **Confidence intervals** — router comparison significance.
- **Multiple comparisons** — router family comparisons.
- **Reproducibility** — benchmark reruns.

### ABA. Zero Router Details
- **NDCH** — normalized discounted cumulative happiness.
- **Probabilistic mix** — expected quality at cost c.
- **Baseline requirement** — any router must beat Zero.
- **Zero router construction** — per-cost optimal mix.

### ABB. Oracle Router Details
- **Oracle definition** — perfect quality prediction.
- **Oracle cost** — near-optimal at low cost.
- **GPT-4 seldom chosen** — Oracle result.
- **Oracle gap** — how far routers are from Oracle.

### BAA. Cost Measurement
- **Token-based pricing** — per-token costs.
- **Request-based pricing** — per-request costs.
- **Latency costs** — time-based costs.
- **Hidden costs** — retries, fallbacks, caching.

### BAB. Cost Prediction
- **Model-based prediction** — predicted cost per route.
- **Historical costs** — usage-based cost estimation.
- **Cost heuristics** — name-based (weak) vs price-based (strong).
- **Cost uncertainty** — variance in cost estimates.

### BBA. Quality Measurement
- **Task accuracy** — per-task quality.
- **Human preference** — Chatbot Arena-style evaluation.
- **LLM-as-judge** — GPT-4-as-judge evaluation.
- **Benchmark scores** — MMLU, MT-Bench, etc.

### BBB. Quality Prediction
- **Learned predictors** — win-probability models.
- **Difficulty prediction** — query difficulty estimation.
- **Confidence estimation** — self-verification.
- **Judge-based prediction** — cascade judges.

## Level 4–6 — Leaf Findings (verbatim from tree searches)

### AAA-A: Task taxonomy
- **Knowledge tasks** — QA, fact retrieval.
- **Reasoning tasks** — math, logic.
- **Code tasks** — generation, debugging.
- **Creative tasks** — writing, ideation.
- **Agent tasks** — multi-step planning.

### AAA-B: Dataset balance
- **Per-task balance** — equal samples per task.
- **Difficulty balance** — easy/hard mix.
- **Domain balance** — diverse domains.
- **Temporal balance** — current + historical queries.

### AAB-A: Significance testing
- **Paired comparisons** — same queries, different routers.
- **Bootstrap CIs** — resampling confidence intervals.
- **Effect sizes** — practical significance.
- **Power analysis** — sample size planning.

### AAB-B: Benchmark hygiene
- **Test contamination** — training/test overlap.
- **Leaderboard gaming** — overfitting to benchmarks.
- **Benchmark staleness** — model updates outpace benchmarks.
- **Benchmark diversity** — multiple benchmarks.

### ABA-A: Zero router construction
- **Per-cost optimization** — optimal mix at each cost.
- **Model weights** — per-model probabilities.
- **Quality expectation** — expected quality of mix.
- **Zero router properties** — unbeatable by simple routers.

### ABA-B: Zero router limitations
- **No adaptivity** — static mix per cost.
- **No query awareness** — same mix for all queries.
- **Upper bound** — Zero is a baseline, not a ceiling.
- **Zero vs Oracle** — the gap is the routing opportunity.

### ABB-A: Oracle properties
- **Perfect prediction** — knows true quality per query.
- **Optimal routing** — always picks best model.
- **Oracle cost curve** — lower bound of cost-quality.
- **Oracle insights** — GPT-4 seldom chosen.

### ABB-B: Oracle gap analysis
- **Router gap** — how far routers are from Oracle.
- **Gap sources** — prediction error, cost error.
- **Gap reduction** — better predictors, better cost models.
- **Gap measurement** — AIQ difference.

### BAA-A: Token pricing
- **Input/output split** — different input/output prices.
- **Context caching** — cached token discounts.
- **Batch pricing** — batch API discounts.
- **Price volatility** — provider price changes.

### BAA-B: Request pricing
- **Per-request fees** — fixed per-request costs.
- **Rate limits** — RPM/TPM constraints.
- **Concurrency pricing** — parallel request costs.
- **Hidden fees** — data processing, storage.

### BAB-A: Historical cost estimation
- **Usage logs** — per-request cost logs.
- **Cost aggregation** — per-model cost summaries.
- **Cost trends** — cost changes over time.
- **Cost anomalies** — unexpected cost spikes.

### BAB-B: Cost heuristics
- **Name-based heuristics** — /opus|pro|max|ultra/ expensive (weak).
- **Price-based heuristics** — actual price data (strong).
- **Tier-based heuristics** — model family tiers.
- **Heuristic evaluation** — accuracy of cost estimates.

### BBA-A: Human preference evaluation
- **Chatbot Arena** — pairwise human battles.
- **Elo ratings** — preference-based rankings.
- **Preference data** — training signal for routers.
- **Preference drift** — changing preferences over time.

### BBA-B: LLM-as-judge
- **GPT-4-as-judge** — automated evaluation.
- **Judge bias** — position, verbosity, self-preference.
- **Judge calibration** — error ≤ 0.1 for cascades.
- **Judge collapse** — error > 0.2 breaks cascades.

### BBB-A: Win-probability predictors
- **Matrix factorization** — RouteLLM MF router.
- **BERT classifiers** — RouteLLM BERT router.
- **Causal LMs** — RouteLLM Llama3-8B router.
- **Preference generalization** — across model pairs.

### BBB-B: Difficulty prediction
- **Query difficulty** — Hybrid LLM's predictor.
- **Difficulty features** — length, complexity, domain.
- **Difficulty calibration** — predicted vs actual.
- **Difficulty-based routing** — easy → small, hard → large.

## Key Insights for 9Router

1. **9Router needs a RouterBench-style evaluation harness** — the c-q plane and AIQ metric would quantify routing improvements.
2. **Zero router baseline** — 9Router's current routing should be compared against a Zero-style baseline.
3. **Judge quality is the bottleneck** — 9Router's fusion judge should be calibrated (error ≤ 0.1).
4. **Cost heuristics are the weakest link** — replace name-based regex with price-based data.
5. **Oracle result** — cheapest sufficient model wins; 9Router's cost-quality tradeoff should default toward cheaper models.
6. **Time-sensitivity** — routers should learn to route temporal queries to online models.

## Related Docs
- `37-ai-model-routing-deep-research.md`
- `41-branch-learned-routing.md`
- `42-branch-cascades-and-fallbacks.md`
- `39-binary-tree-expansion-master-plan.md`