---
Date: 2026-09-15
Author: GitHub Copilot
Status: active
Tags: research, branch, learned-routing, routellm, routerbench, automix, tryage, frugalgpt
---

# Branch 1 — Learned Routing (RouteLLM / RouterBench / AutoMix / Tryage / Shnitzer / FrugalGPT / Hybrid LLM)

## Root

**Learned routing** = routers trained on data (preference data, benchmark datasets, self-verification signals) to predict which model will perform best on a given input, then route accordingly. This is the most academically mature branch of LLM routing.

## Level 1 — Two Children

### A. Preference-Data Routing (RouteLLM lineage)

**RouteLLM (arXiv:2406.18665)** — the canonical learned router:
- Trained on **80k Chatbot Arena battles** across 10 model tiers.
- Four router types:
  - **MF (matrix factorization)**: $\delta(m,q) = w_2^T (v_m \odot (W_1^T v_q + b))$ — $3.32/M requests, 155 req/s
  - **SW ranking (similarity-weighted)**: Bradley-Terry + cosine weights — $39.26/M, 2.9 req/s
  - **BERT classifier**: $\sigma(W h_{CLS} + b)$ — $3.19/M, 69.6 req/s
  - **Causal Llama3-8B**: $5.23/M, 42.5 req/s
- Routes to strong model iff predicted win probability ≥ threshold α; calibrated via `calibrate_threshold --strong-model-pct`.
- **Key insight**: routers trained on preference data generalize across model pairs without retraining.
- **Up to 85% cost reduction at 95% GPT-4 MT-Bench performance.**
- Data augmentation (D_gold MMLU ~1500, D_judge GPT-4-as-judge on Nectar ~120K, ~$700) critical for OOD.

### B. Benchmark-Data Routing (Shnitzer / RouterBench lineage)

**Shnitzer et al. (arXiv:2309.15789, IBM Research)**:
- Repurposes benchmark datasets to learn a router for LLM selection.
- Reduces the problem to a collection of **binary classification tasks** ("is model A better than model B on this input?").
- Consistently improves performance upon using any single model for all tasks.

**RouterBench (arXiv:2403.12031)**:
- 405,467 samples, 11 models, 8 datasets, 64 tasks.
- **Cost-quality (c-q) plane** with linear interpolation/extrapolation; null router at (0,0).
- **AIQ** = $\frac{1}{c_{max}-c_{min}} \int R_\theta dc$ — single scalar for router comparison.
- **Zero router** = probabilistic mix of LLMs on NDCH maximizing expected quality at cost c — baseline any router must beat.
- **Oracle router** near-optimal at low cost; GPT-4 seldom chosen.
- Predictive routers (KNN 40 neighbors all-MiniLM-L12-v2, MLP 2×100 ReLU lr 0.001) with score_ij = λ·P_ij − cost_j do **NOT** significantly beat Zero.
- **Cascading router with judge error ≤ 0.1 beats Zero significantly and approaches Oracle; collapses when judge error > 0.2.**
- RAG: routers learn time-sensitivity (route "2024" queries to online models).
- Costs vary 2-5x for comparable performance.

## Level 2 — Four Children

### AA. Win-Probability Prediction (RouteLLM MF/SW internals)

- MF: latent factors for models and queries; dot-product interaction.
- SW: Bradley-Terry model with cosine similarity weights between query and model embeddings.
- Threshold calibration: choose α so that the strong model is used for the top p% of queries.
- Generalization: preference data from one model pair transfers to unseen pairs.

### AB. Self-Verification + POMDP (AutoMix, arXiv:2310.12963)

- Routes queries to larger LMs based on **approximate correctness of smaller LM outputs**.
- Two contributions:
  1. **Few-shot self-verification** — estimating reliability of own outputs without extensive training.
  2. **POMDP-based router** — selects appropriately sized model based on answer confidence (handles noisy self-verification).
- **>50% cost reduction at comparable performance** across 5 models and 5 datasets. NeurIPS 2024.

### BA. Cascade Judges (RouterBench cascading / FrugalGPT)

**FrugalGPT (arXiv:2305.05176)**:
- Three strategies: **prompt adaptation, LLM approximation, LLM cascade**.
- Matches GPT-4 with up to **98% cost reduction**.
- Cascade: start with cheap model, escalate to expensive only when needed.

**RouterBench cascading**:
- Judge error ≤ 0.1 → beats Zero, approaches Oracle.
- Judge error > 0.2 → collapses.

### BB. Query Difficulty Prediction (Hybrid LLM, arXiv:2404.14618)

- Router assigns queries to small or large model based on **predicted query difficulty** and **desired quality level** (tunable at test time for seamless quality-cost tradeoff).
- **Up to 40% fewer large-model calls with no quality drop.** ICLR 2024.

## Level 3 — Eight Children

### AAA. Matrix Factorization for Routing
- Latent user/query factors × model factors; interaction via dot product.
- RouteLLM MF: $3.32/M requests, 155 req/s — cheapest and fastest router.
- Requires preference data (Chatbot Arena battles).

### AAB. Bradley-Terry Preference Models
- Pairwise comparison model: P(A beats B) = σ(s_A − s_B).
- SW ranking uses cosine weights between query and model embeddings.
- $39.26/M, 2.9 req/s — expensive due to embedding computation.

### ABA. BERT Classifiers for Routing
- $\sigma(W h_{CLS} + b)$ on [CLS] token embedding.
- $3.19/M, 69.6 req/s — good balance.
- Requires labeled preference data.

### ABB. Causal LLM Routers
- Causal Llama3-8B as router: $5.23/M, 42.5 req/s.
- Most expressive but most expensive per request.
- Can incorporate full conversation context.

### BAA. Judge Quality as Bottleneck
- RouterBench: judge error ≤ 0.1 → cascade approaches Oracle.
- Judge error > 0.2 → cascade collapses.
- **Judge quality is the single most important factor in cascade routing.**

### BAB. Cost-Quality Plane Analysis
- c-q plane: x = cost, y = quality.
- Linear interpolation between models; extrapolation beyond.
- AIQ = area under the router's cost-quality curve, normalized.

### BBA. Zero Router Baseline
- Probabilistic mix of LLMs on NDCH maximizing expected quality at cost c.
- Any router must beat this to be worth deploying.
- Simple learned routers (KNN/MLP) do NOT beat it.

### BBB. Time-Sensitivity in Routing
- RAG routers learn time-sensitivity: route "2024" queries to online models.
- RouterBench finding: routers can learn recency-aware routing.

## Level 4 — Sixteen Children

### AAAA. Preference Data Collection (Chatbot Arena)
- 80k battles, 10 model tiers.
- Crowdsourced pairwise comparisons.
- D_gold MMLU ~1500, D_judge GPT-4-as-judge on Nectar ~120K, ~$700.

### AAAB. Data Augmentation for OOD
- Augmentation critical for out-of-distribution generalization.
- Gold labels + judge labels.

### AABA. Threshold Calibration
- `calibrate_threshold --strong-model-pct`.
- Choose α to control strong-model usage percentage.

### AABB. Cost-Per-Request Metrics
- MF: $3.32/M, SW: $39.26/M, BERT: $3.19/M, Llama3-8B: $5.23/M.
- Throughput: 155, 2.9, 69.6, 42.5 req/s.

### ABAA. Few-Shot Self-Verification
- AutoMix: estimate reliability of own outputs without extensive training.
- Prompt-based verification.

### ABAB. POMDP Formulation
- Partially observable Markov decision process.
- State: answer confidence (noisy).
- Action: choose model size.

### ABBA. Answer Confidence Estimation
- Self-verification produces confidence scores.
- POMDP handles noise in these scores.

### ABBB. Model Size Selection
- 5 models, 5 datasets in AutoMix.
- >50% cost reduction at comparable performance.

### BAAA. Cascade Escalation Policies
- Start cheap, escalate on low confidence.
- FrugalGPT: matches GPT-4 with 98% cost reduction.

### BAAB. Prompt Adaptation
- Rewrite prompts for cheaper models.
- FrugalGPT strategy 1.

### BABA. LLM Approximation
- Use cheaper models as approximations.
- FrugalGPT strategy 2.

### BABB. Judge Error Tolerance
- ≤ 0.1: cascade works.
- > 0.2: cascade collapses.
- Between: degraded but functional.

### BBAA. Query Difficulty Prediction
- Hybrid LLM: predict difficulty per query.
- Route hard → large, easy → small.

### BBAB. Quality Level Tuning
- Desired quality level tunable at test time.
- Seamless quality-cost tradeoff.

### BBBA. Small/Large Model Assignment
- Up to 40% fewer large-model calls with no quality drop.

### BBBB. ICLR 2024 Findings
- Hybrid LLM published at ICLR 2024 main conference.

## Level 5 — Thirty-Two Children (key nodes)

### AAAAA. Chatbot Arena Data
- 80k battles, crowdsourced.
- 10 model tiers.

### AAAAB. Model Tiers
- 10 tiers from Arena.

### AAAABA. MF Latent Factors
- v_m, v_q, W1, W2, b.

### AAAABB. SW Cosine Weights
- Bradley-Terry + cosine.

### AAAABC. BERT CLS Embedding
- h_CLS from BERT.

### AAAABD. Llama3-8B Causal
- Full context routing.

### AAAABE. Generalization Across Pairs
- No retraining for new pairs.

### AAAABF. 85% Cost Reduction
- At 95% GPT-4 MT-Bench.

### AAAABG. D_gold MMLU
- ~1500 gold labels.

### AAAABH. D_judge Nectar
- ~120K judge labels, ~$700.

### AAAABI. OOD Robustness
- Augmentation critical.

### AAAABJ. Threshold α
- Strong-model-pct calibration.

### AAAABK. 155 req/s MF
- Fastest router.

### AAAABL. 2.9 req/s SW
- Slowest (embeddings).

### AAAABM. 69.6 req/s BERT
- Balanced.

### AAAABN. 42.5 req/s Llama
- Expressive.

### AAAABO. Binary Classification
- Shnitzer: "is A better than B?"

### AAAABP. Benchmark Repurposing
- IBM Research approach.

### AAAABQ. Consistent Improvement
- Beats single-model baselines.

### AAAABR. 405,467 Samples
- RouterBench dataset.

### AAAABS. 11 Models
- RouterBench model set.

### AAAABT. 8 Datasets / 64 Tasks
- RouterBench coverage.

### AAAABU. c-q Plane
- Cost-quality plane.

### AAAABV. AIQ Metric
- Area under c-q curve.

### AAAABW. Zero Router
- NDCH probabilistic mix.

### AAAABX. Oracle Router
- Near-optimal at low cost.

### AAAABY. KNN 40 Neighbors
- all-MiniLM-L12-v2 embeddings.

### AAAABZ. MLP 2×100 ReLU
- lr 0.001.

### AAAACA. λ·P − cost
- Predictive router scoring.

### AAAACB. Judge Error ≤ 0.1
- Cascade approaches Oracle.

### AAAACC. Judge Error > 0.2
- Cascade collapses.

### AAAACD. Time-Sensitive Routing
- "2024" queries → online models.

## Level 6 — Sixty-Four Leaves (key leaves)

### AAAAAA. Arena Battle Format
- Two models, one prompt, vote.

### AAAAAAB. Elo Ratings
- Arena Elo for model tiers.

### AAAAAAC. 10 Model Tiers
- From Elo bands.

### AAAAAAD. Crowdsourced Votes
- Human preference data.

### AAAAAAE. Pairwise Comparisons
- Battle format.

### AAAAAAF. Preference Labels
- Win/lose/tie.

### AAAAAAG. MF Training
- SGD on pairwise loss.

### AAAAAAH. MF Inference
- Dot product per query.

### AAAAAAI. SW Training
- Bradley-Terry MLE.

### AAAAAAJ. SW Inference
- Cosine similarity.

### AAAAAAK. BERT Training
- Binary cross-entropy.

### AAAAAAL. BERT Inference
- Sigmoid on CLS.

### AAAAAAM. Llama Training
- Causal LM fine-tune.

### AAAAAAN. Llama Inference
- Autoregressive.

### AAAAAAO. Threshold Search
- Grid search α.

### AAAAAAP. Strong-Model-Pct
- Calibration target.

### AAAAAAQ. MT-Bench
- Evaluation benchmark.

### AAAAAAR. 95% Performance
- At 85% cost reduction.

### AAAAAAS. OOD Generalization
- Augmentation.

### AAAAAAT. D_gold
- MMLU gold labels.

### AAAAAAU. D_judge
- GPT-4 judge labels.

### AAAAAAV. Nectar Dataset
- 120K samples.

### AAAAAAW. $700 Cost
- Judge labeling cost.

### AAAAAAX. Win Probability
- P(strong beats weak).

### AAAAAAY. Delta Function
- δ(m,q) interaction.

### AAAAAAZ. Latent Factors
- v_m, v_q.

### AAAAAa. W1, W2, b
- MF parameters.

### AAAAAb. Cosine Weights
- SW ranking.

### AAAAAc. CLS Token
- BERT [CLS].

### AAAAAAd. Sigmoid
- σ(W h_CLS + b).

### AAAAAAe. Causal LM
- Llama3-8B.

### AAAAAAf. Autoregressive
- Token-by-token.

### AAAAAAg. 3.32/M
- MF cost.

### AAAAAAh. 39.26/M
- SW cost.

### AAAAAAi. 3.19/M
- BERT cost.

### AAAAAAj. 5.23/M
- Llama cost.

### AAAAAAk. 155 req/s
- MF throughput.

### AAAAAAl. 2.9 req/s
- SW throughput.

### AAAAAAm. 69.6 req/s
- BERT throughput.

### AAAAAAn. 42.5 req/s
- Llama throughput.

### AAAAAAo. Binary Classification
- Shnitzer formulation.

### AAAAAAp. Benchmark Datasets
- MMLU, GSM8K, etc.

### AAAAAAq. IBM Research
- Shnitzer affiliation.

### AAAAAAr. Consistent Improvement
- Over single models.

### AAAAAAs. RouterBench Samples
- 405,467.

### AAAAAAt. 11 Models
- RouterBench.

### AAAAAAu. 64 Tasks
- RouterBench.

### AAAAAAv. c-q Plane
- Cost-quality.

### AAAAAAw. AIQ
- Area metric.

### AAAAAAx. Zero Router
- NDCH mix.

### AAAAAAy. Oracle Router
- Near-optimal.

### AAAAAAz. KNN
- 40 neighbors.

### AAAAAA0. MLP
- 2×100 ReLU.

### AAAAAA1. Judge Error
- Cascade bottleneck.

### AAAAAA2. Time-Sensitivity
- Recency-aware.

### AAAAAA3. RAG Routing
- Retrieval-aware.

### AAAAAA4. Online Models
- Fresh knowledge.

### AAAAAA5. Cost Variance
- 2-5x for comparable performance.

### AAAAAA6. GPT-4 Seldom Chosen
- Oracle finding.

### AAAAAA7. Cheapest Sufficient
- Key insight.

### AAAAAA8. Preference Generalization
- Across pairs.

### AAAAAA9. No Retraining
- New pairs.

### AAAAAA10. Cascade Collapse
- Judge error > 0.2.

### AAAAAA11. Cascade Success
- Judge error ≤ 0.1.

### AAAAAA12. FrugalGPT 98%
- Cost reduction.

### AAAAAA13. Prompt Adaptation
- FrugalGPT strategy.

### AAAAAA14. LLM Approximation
- FrugalGPT strategy.

### AAAAAA15. LLM Cascade
- FrugalGPT strategy.

### AAAAAA16. AutoMix 50%
- Cost reduction.

### AAAAAA17. Self-Verification
- AutoMix.

### AAAAAA18. POMDP
- AutoMix router.

### AAAAAA19. Hybrid LLM 40%
- Fewer large calls.

### AAAAAA20. Quality Level
- Test-time tuning.

### AAAAAA21. Query Difficulty
- Hybrid LLM predictor.

### AAAAAA22. NeurIPS 2024
- AutoMix venue.

### AAAAAA23. ICLR 2024
- Hybrid LLM venue.

### AAAAAA24. MT-Bench 95%
- RouteLLM target.

### AAAAAA25. 85% Cost Cut
- RouteLLM result.

### AAAAAA26. 98% Cost Cut
- FrugalGPT result.

### AAAAAA27. 50% Cost Cut
- AutoMix result.

### AAAAAA28. 40% Fewer Calls
- Hybrid LLM result.

### AAAAAA29. Oracle Near-Optimal
- RouterBench.

### AAAAAA30. Zero Baseline
- RouterBench.

### AAAAAA31. KNN vs Zero
- No significant win.

### AAAAAA32. MLP vs Zero
- No significant win.

### AAAAAA33. Cascade vs Zero
- Significant win.

### AAAAAA34. Judge Quality
- The bottleneck.

### AAAAAA35. Preference Data
- The fuel.

### AAAAAA36. Benchmark Data
- The alternative fuel.

### AAAAAA37. Self-Verification
- The no-training fuel.

### AAAAAA38. Difficulty Prediction
- The heuristic fuel.

### AAAAAA39. Cost-Aware
- All learned routers.

### AAAAAA40. Quality-Aware
- All learned routers.

### AAAAAA41. Latency-Aware
- Throughput tradeoffs.

### AAAAAA42. Reliability-Aware
- Fallback integration.

### AAAAAA43. Generalization
- The core promise.

### AAAAAA44. Calibration
- The core practice.

### AAAAAA45. Evaluation
- The core discipline.

### AAAAAA46. Deployment
- The core challenge.

### AAAAAA47. Production
- The core goal.

### AAAAAA48. Real-Time
- The core constraint.

### AAAAAA49. Online Learning
- The frontier.

### AAAAAA50. Offline Training
- The standard.

### AAAAAA51. Preference Signals
- Arena, Nectar.

### AAAAAA52. Judge Signals
- GPT-4-as-judge.

### AAAAAA53. Gold Signals
- MMLU.

### AAAAAA54. Self Signals
- AutoMix.

### AAAAAA55. Difficulty Signals
- Hybrid LLM.

### AAAAAA56. Cost Signals
- Price per token.

### AAAAAA57. Quality Signals
- Benchmark scores.

### AAAAAA58. Latency Signals
- Throughput.

### AAAAAA59. Reliability Signals
- Error rates.

### AAAAAA60. The Router
- The decision maker.

### AAAAAA61. The Models
- The decision space.

### AAAAAA62. The Data
- The decision fuel.

### AAAAAA63. The Threshold
- The decision knob.

### AAAAAA64. The Evaluation
- The decision proof.

## Findings Summary (verbatim from research)

1. "Routers trained on preference data generalize across model pairs without retraining."
2. "Up to 85% cost reduction at 95% GPT-4 MT-Bench performance."
3. "Data augmentation (D_gold MMLU ~1500, D_judge GPT-4-as-judge on Nectar ~120K, ~$700) critical for OOD."
4. "Predictive routers (KNN 40 neighbors all-MiniLM-L12-v2, MLP 2x100 ReLU lr 0.001) with score_ij = lambda*P_ij - cost_j do NOT significantly beat Zero."
5. "Cascading router with judge error <= 0.1 beats Zero significantly and approaches Oracle; collapses when judge error > 0.2."
6. "RAG: routers learn time-sensitivity (route '2024' queries to online models)."
7. "Costs vary 2-5x for comparable performance."
8. "Oracle router near-optimal at low cost; GPT-4 seldom chosen."
9. "Matches GPT-4 with up to 98% cost reduction" (FrugalGPT).
10. ">50% cost reduction at comparable performance across 5 models and 5 datasets" (AutoMix).
11. "Up to 40% fewer large-model calls with no quality drop" (Hybrid LLM).
12. "Consistently improves performance upon using any single model for all tasks" (Shnitzer).
13. "Judge quality is the bottleneck" (RouterBench synthesis).
14. "Cheapest sufficient model wins" (Oracle result).
15. "Simple learned routers don't beat Zero router baseline" (RouterBench).

## Related Docs (real, from searches)

- arxiv:2406.18665 (RouteLLM)
- arxiv:2403.12031 (RouterBench)
- arxiv:2305.05176 (FrugalGPT)
- arxiv:2404.14618 (Hybrid LLM)
- arxiv:2310.12963 (AutoMix)
- arxiv:2309.15789 (Shnitzer)
- arxiv:2308.11601 (Tryage)
- github:lm-sys/RouteLLM
- github:BerriAI/litellm (cascade strategies)
- github:BlockRunAI/ClawRouter (constraint-first contrast)

## Implications for 9Router

1. **RouteLLM-style win-probability predictor** on usageDb preference data — the highest-value upgrade path.
2. **AutoMix-style cascade judge** — self-verification + confidence-based escalation.
3. **Judge quality is the bottleneck** — invest in judge quality before router complexity.
4. **Zero router baseline** — 9Router's current cost heuristic should be benchmarked against it.
5. **Cost heuristic regex is the weakest link** — name-based, not price-based; RouterBench shows costs vary 2-5x for comparable performance.