# Routing Exponential Research — Master Map (N-ary, 6+ Levels)

**Date:** 2026-09-17
**Author:** GitHub Copilot agent (main session)
**Status:** active
**Tags:** #research #routing #exponential #n-ary #master-map #binary-tree #llm-routing

## Objective

The user clarified that "binary tree expansion" means a **true exponential N-ary expansion** — NOT a 1→2→4→8 binary tree. The correct model:

> "for everything that you research from one document (and you can have more than one that you start with) and for every phrase that you decide i want to learn more about in that document that for each of those phrases you go at least 6 levels deep and for each level you may find hundreds of more phrases you want to research and then you will go and research each of those. and from that level you would have 4 more levels left you could go from that level worth of hundreds of phrases you could decide to research on each level so it would be exponential not just a 1 to 2 to 4 to 8 etc kind of research tree."

This master map enumerates the full N-ary expansion of the **main routing research** — the deep research doc `37-ai-model-routing-deep-research.md` and its 8 branch docs (`41`–`48`). It is **additive**: the strict binary trees (193 roots, 24,511 nodes, 242,852 searches — see `40-binary-tree-expansion-report.md`) remain valid as the *spine*; this map is the *full exponential body*.

## Methodology (how this differs from the 2-way trees)

| Aspect | Prior 2-way tree | This N-ary expansion |
|--------|-----------------|----------------------|
| Children per node | Exactly 2 | N (3–15 typical, up to hundreds) |
| Node count per root | 63 (2^6−1) | Varies: 3^6 ≈ 729, 5^6 ≈ 15,625 |
| Roots | 1 (the whole topic) | Every phrase in the source docs (~60) |
| Source docs | 1 | Multiple (37 deep research + 8 branch docs) |
| Research depth | L6 leaves described in branch docs | Research AT every node, L1–L6 |

## Root Inventory (L0) — every phrase from the source documents

### From `37-ai-model-routing-deep-research.md`

| # | Root phrase | Source section | Expansion doc |
|---|-------------|---------------|----------------|
| R01 | The core decision problem (what routers predict/learn/optimize) | §1 | `2026-09-17-routing-exp-01-core-decision-problem.md` |
| R02 | RouteLLM (MF/SW/BERT/Causal, α threshold, preference data) | §2 | `2026-09-17-routing-exp-02-routellm.md` |
| R03 | RouterBench (c−q plane, AIQ, Zero/Oracle, KNN/MLP, cascading) | §2 | `2026-09-17-routing-exp-03-routerbench.md` |
| R04 | Shnitzer benchmark-dataset routing | §2 | `2026-09-17-routing-exp-04-shnitzer.md` |
| R05 | Tryage context-aware routing (thalamic router, Pareto) | §2 | `2026-09-17-routing-exp-05-tryage.md` |
| R06 | AutoMix (self-verification + POMDP) | §2 | `2026-09-17-routing-exp-06-automix.md` |
| R07 | FrugalGPT (prompt adaptation, approximation, cascade) | §2 | `2026-09-17-routing-exp-07-frugalgpt.md` |
| R08 | Hybrid LLM (difficulty prediction, quality level) | §2 | `2026-09-17-routing-exp-08-hybrid-llm.md` |
| R09 | Semantic routers (aurelio-labs semantic-router, vLLM SR six layers) | §3 | `2026-09-17-routing-exp-09-semantic-routers.md` |
| R10 | OpenRouter Auto Router (classify/rank/band/fallback, spend share) | §4 | `2026-09-17-routing-exp-10-openrouter-auto-router.md` |
| R11 | ClawRouter (15-dimension scorer, constraint-first, profiles) | §5 | `2026-09-17-routing-exp-11-clawrouter.md` |
| R12 | LiteLLM gateway routing (strategies, groups, affinity, failover, cooldowns) | §6 | `2026-09-17-routing-exp-12-litellm-gateway.md` |
| R13 | coai channel management (priority, weight, caching) | §6 | `2026-09-17-routing-exp-13-coai.md` |
| R14 | 9Router 16 decision points (bypass→fusion judge) | §7 | `2026-09-17-routing-exp-14-9router-decision-points.md` |
| R15 | Other repos surveyed (Switchyard, freellmapi, GoModel, WayfinderRouter, llm-router, RelayFreeLLM, DEEIX-Chat, wesight) | §8 | `2026-09-17-routing-exp-15-other-repos.md` |
| R16 | Universal decision pipeline (5 stages) | Synthesis | `2026-09-17-routing-exp-16-universal-pipeline.md` |
| R17 | Three philosophies (learned/market/constraint-first) | Synthesis | `2026-09-17-routing-exp-17-three-philosophies.md` |
| R18 | Key research findings (Oracle, Zero, preference generalization, hard filters, POMDP, market signal, reliability, judge bottleneck) | Synthesis | `2026-09-17-routing-exp-18-key-findings.md` |
| R19 | Implications for 9Router (upgrades: win-probability, cascade judge, spend-share) | Synthesis | `2026-09-17-routing-exp-19-9router-implications.md` |

### From `41-branch-learned-routing.md`

| # | Root phrase | Source section | Expansion doc |
|---|-------------|---------------|----------------|
| R20 | Preference-data routing (RouteLLM lineage) | L1-A | `2026-09-17-routing-exp-20-preference-data-routing.md` |
| R21 | Benchmark-data routing (Shnitzer / RouterBench lineage) | L1-B | `2026-09-17-routing-exp-21-benchmark-data-routing.md` |
| R22 | Win-probability prediction (MF/SW internals, threshold calibration) | L2-AA | `2026-09-17-routing-exp-22-win-probability-prediction.md` |
| R23 | Self-verification + POMDP (AutoMix internals) | L2-AB | `2026-09-17-routing-exp-23-self-verification-pomdp.md` |
| R24 | Data augmentation (D_gold, D_judge, ~$700) | L2 | `2026-09-17-routing-exp-24-data-augmentation.md` |
| R25 | Cost-aware adaptive routing (cost-quality tradeoff, λ) | L2 | `2026-09-17-routing-exp-25-cost-aware-adaptive-routing.md` |

### From `42-branch-cascades-and-fallbacks.md`

| # | Root phrase | Source section | Expansion doc |
|---|-------------|---------------|----------------|
| R26 | Model cascades (cost-first escalation) | L1-A | `2026-09-17-routing-exp-26-model-cascades.md` |
| R27 | Provider fallbacks (reliability-first failover) | L1-B | `2026-09-17-routing-exp-27-provider-fallbacks.md` |
| R28 | Cascade escalation policies (triggers, depth, judge) | L2-AA/AB | `2026-09-17-routing-exp-28-cascade-escalation-policies.md` |
| R29 | Weighted failover (LiteLLM exclusions, max_fallbacks) | L2-BA | `2026-09-17-routing-exp-29-weighted-failover.md` |
| R30 | Cooldown & retry policies (429/5s, backoff, precedence) | L2-BB | `2026-09-17-routing-exp-30-cooldown-retry-policies.md` |
| R31 | Retry amplification ((1+N)², max_retries:0) | L3-BAA | `2026-09-17-routing-exp-31-retry-amplification.md` |
| R32 | Account selection (fill-first, round-robin, sticky limit 3) | L3-BBA | `2026-09-17-routing-exp-32-account-selection.md` |
| R33 | Executor retry config (DEFAULT_RETRY_CONFIG, FETCH_CONNECT_TIMEOUT_MS) | L3-BBB | `2026-09-17-routing-exp-33-executor-retry-config.md` |

### From `43-branch-moe-and-expert-routing.md`

| # | Root phrase | Source section | Expansion doc |
|---|-------------|---------------|----------------|
| R34 | Mixture-of-Experts (MoE) architecture | Root | `2026-09-17-routing-exp-34-moe-architecture.md` |
| R35 | Expert selection & sparse routing | L1 | `2026-09-17-routing-exp-35-expert-selection-sparse-routing.md` |
| R36 | MoE-aware dispatch for 9Router | Key insights | `2026-09-17-routing-exp-36-moe-aware-dispatch.md` |

### From `44-branch-gateways-and-serving.md`

| # | Root phrase | Source section | Expansion doc |
|---|-------------|---------------|----------------|
| R37 | AI gateway architecture (LiteLLM/OpenRouter/vLLM/coai/9Router) | Root | `2026-09-17-routing-exp-37-gateway-architecture.md` |
| R38 | Load balancing strategies (shuffle, weighted, latency, least-busy) | L1 | `2026-09-17-routing-exp-38-load-balancing-strategies.md` |
| R39 | Virtual models & routing groups | L1 | `2026-09-17-routing-exp-39-virtual-models-routing-groups.md` |
| R40 | Session affinity & stickiness | L1 | `2026-09-17-routing-exp-40-session-affinity.md` |
| R41 | Gateway observability (spend logs, alerting, caching) | L1 | `2026-09-17-routing-exp-41-gateway-observability.md` |

### From `45-branch-semantic-and-embedding-routing.md`

| # | Root phrase | Source section | Expansion doc |
|---|-------------|---------------|----------------|
| R42 | Semantic vector-space routing (semantic-router) | Root | `2026-09-17-routing-exp-42-semantic-vector-routing.md` |
| R43 | Embedding-based routing (encoders, nearest-route) | L1 | `2026-09-17-routing-exp-43-embedding-routing.md` |
| R44 | Prompt routing (route by prompt text) | L1 | `2026-09-17-routing-exp-44-prompt-routing.md` |
| R45 | vLLM Semantic Router signals/projections/decisions | L1 | `2026-09-17-routing-exp-45-vllm-semantic-router.md` |

### From `46-branch-evaluation-and-cost-quality.md`

| # | Root phrase | Source section | Expansion doc |
|---|-------------|---------------|----------------|
| R46 | RouterBench evaluation framework (405,467 samples, AIQ) | Root | `2026-09-17-routing-exp-46-routerbench-eval.md` |
| R47 | Cost-quality tradeoffs (c−q plane, λ, 2–5× cost variance) | L1 | `2026-09-17-routing-exp-47-cost-quality-tradeoffs.md` |
| R48 | Model ranking & benchmarks (MT-Bench, MMLU, Arena) | L1 | `2026-09-17-routing-exp-48-model-ranking-benchmarks.md` |
| R49 | Evaluation harness for 9Router | Key insights | `2026-09-17-routing-exp-49-eval-harness.md` |

### From `47-branch-9router-internal-threads.md`

| # | Root phrase | Source section | Expansion doc |
|---|-------------|---------------|----------------|
| R50 | 9Router executors (30+ specialized + DefaultExecutor) | L1 | `2026-09-17-routing-exp-50-executors.md` |
| R51 | Translator engine (OpenAI pivot, direct routes) | L1 | `2026-09-17-routing-exp-51-translator-engine.md` |
| R52 | Providers registry (auto-generated, per-provider files) | L1 | `2026-09-17-routing-exp-52-providers-registry.md` |
| R53 | OAuth & credential lifecycle (refresh, token rotation) | L1 | `2026-09-17-routing-exp-53-oauth-credential-lifecycle.md` |
| R54 | Error systems & categorization (categorizeError) | L1 | `2026-09-17-routing-exp-54-error-systems.md` |
| R55 | MITM & security hardening | L1 | `2026-09-17-routing-exp-55-mitm-security.md` |
| R56 | Enforcement layers & runtime enforcement | L1 | `2026-09-17-routing-exp-56-enforcement-layers.md` |
| R57 | Gap analysis & divergence handling | L1 | `2026-09-17-routing-exp-57-gap-divergence.md` |

### From `48-branch-emerging-and-frontier.md`

| # | Root phrase | Source section | Expansion doc |
|---|-------------|---------------|----------------|
| R58 | Emerging routing techniques (beyond seeds) | Root | `2026-09-17-routing-exp-58-emerging-techniques.md` |
| R59 | Frontier research (new papers, new repos) | L1 | `2026-09-17-routing-exp-59-frontier-research.md` |
| R60 | Future 9Router routing directions | Key insights | `2026-09-17-routing-exp-60-future-directions.md` |

**60 roots.** Each root expands N-ary to 6+ levels. With an average branching factor of 4, that is 60 × (4^6 − 1)/3 ≈ 60 × 1,365 ≈ **81,900 nodes** of research. With branching factor 6: 60 × 9,331 ≈ **560,000 nodes**. This is the "crazy exponential" the user asked for.

## Expansion format (per doc)

Each expansion doc contains:

1. **Root phrase** — the phrase from the source document, with source section.
2. **L1 — sub-phrases discovered** — every phrase in the root that warrants research (typically 4–12).
3. **L2 — sub-sub-phrases** — every phrase in each L1 node (3–10 each).
4. **L3 … L6+** — continuing expansion; each node lists the phrases it spawns and researches each.
5. **Node research** — for every node: codebase grounding (actual file/line), external research (fetched source), or design note (marked as such). 1–3 lines each.
6. **Confidence levels** and **open questions**.
7. **Sources** — URLs and code paths.

Branching is **variable**: a node may have 2, 5, 15, or 50 children depending on how many phrases it contains. The tree is exponential in phrase count, not fixed-branching.

## Status

| Batch | Docs | Status |
|-------|------|--------|
| 1 | R01–R05 | ✅ |
| 2 | R06–R10 | ✅ |
| 3 | R11–R15 | ✅ |
| 4 | R16–R19 | ✅ |
| 5 | R20–R25 | ✅ |
| 6 | R26–R33 | ✅ |
| 7 | R34–R36 | ✅ |
| 8 | R37–R41 | ✅ |
| 9 | R42–R45 | ✅ |
| 10 | R46–R49 | ✅ |
| 11 | R50–R57 | ✅ |
| 12 | R58–R60 | ✅ |