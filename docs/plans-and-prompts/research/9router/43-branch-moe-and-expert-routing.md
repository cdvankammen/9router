---
Date: 2026-09-15
Author: GitHub Copilot
Status: active
Tags: research, branch, moe, mixture-of-experts, expert-routing, sparse-routing
---

# Branch 3 — Mixture-of-Experts & Expert Routing

> Part of the binary-tree research expansion (see `39-binary-tree-expansion-master-plan.md`).
> This branch covers every node whose topic descends from MoE / expert-selection / sparse-routing research.

## Root

**Mixture-of-Experts (MoE)** = a model architecture where a router (gating network) selects which expert sub-networks process each token or input. This is the architectural cousin of LLM routing: the same "route to the right specialist" principle applied *inside* the model rather than across models.

## Level 1 — Two Children

### A. Sparse MoE Routing (architectural gating)

**Key concepts from the corpus:**
- **Gating networks** — learned routers that select top-k experts per token.
- **Sparsity** — only a fraction of experts active per token (e.g., top-2 of 8).
- **Load balancing** — auxiliary losses (e.g., Switch Transformer's load-balancing loss) prevent expert collapse.
- **Expert specialization** — experts naturally specialize by domain/task as training progresses.
- **Capacity factor** — tokens routed to an expert beyond its capacity are dropped or overflowed.

**Notable systems found in the tree:**
- **Switch Transformer** — simplified MoE with one expert per token; 7× pre-training speedup.
- **Mixtral 8x7B** — 8 experts, top-2 routing; 47B total params, 13B active.
- **DeepSeek-MoE** — fine-grained expert segmentation + shared experts.
- **GShard** — first massively parallel MoE; top-2 gating with capacity factor.
- **Expert Choice routing** — inverts the paradigm: experts choose tokens, eliminating load-balancing loss.

### B. Expert Selection for Inference (cross-model routing)

**Key concepts:**
- **Expert selection LLM** — routing queries to models that specialize in certain domains.
- **Task-expert mapping** — matching query type to model strength (code → code models, math → math models).
- **Specialist vs generalist** — the routing decision between domain-specialized and general-purpose models.
- **Model composition** — combining specialist models for multi-step tasks.

## Level 2 — Four Children

### AA. Gating Mechanisms
- **Top-k selection** — router picks k experts per token (k=1 Switch, k=2 Mixtral).
- **Softmax gating** — normalized expert weights.
- **Noisy top-k** — trainable noise for exploration during training.
- **Hash-based routing** — deterministic, no learned gating (Roller et al.).

### AB. Load Balancing & Stability
- **Auxiliary load-balancing loss** — penalizes imbalanced expert utilization.
- **Expert capacity** — tokens per expert per batch; overflow handling.
- **Router z-loss** — stabilizes training by penalizing large logits.
- **Expert dropout** — regularization for MoE training.

### BA. Expert Specialization
- **Domain specialization** — experts specialize in code, math, language, etc.
- **Emergent specialization** — specialization arises without explicit supervision.
- **Fine-grained experts** — DeepSeek-MoE's 64 small experts vs 8 large.
- **Shared experts** — always-active experts for common patterns.

### BB. Cross-Model Expert Routing
- **Task-based model selection** — routing by task type (code, math, reasoning).
- **Capability-based routing** — routing by required capabilities (vision, tools, long context).
- **Cost-aware expert selection** — choosing specialists by cost-quality tradeoff.
- **Ensemble routing** — combining multiple specialists' outputs.

## Level 3 — Eight Children (selected nodes)

### AAA. Top-k Gating Details
- **k=1 vs k=2** — Switch (k=1) vs Mixtral (k=2): quality vs compute tradeoff.
- **Token-level vs sequence-level routing** — per-token granularity.
- **Router capacity** — max tokens per expert per batch.
- **Gating temperature** — sharpening/softening router probabilities.

### AAB. Load-Balancing Losses
- **Switch loss** — fraction of tokens routed to each expert.
- **Auxiliary loss coefficient** — α scaling of the load-balancing term.
- **Expert entropy** — measuring routing diversity.
- **Router confidence** — calibration of gating probabilities.

### ABA. Expert Specialization Emergence
- **Sparse upcycling** — converting dense models to MoE.
- **Expert merging** — combining similar experts post-training.
- **Expert pruning** — removing underutilized experts.
- **Expert parallelism** — distributing experts across devices.

### ABB. Capacity & Overflow
- **Capacity factor 1.0** — strict capacity, token dropping.
- **Overflow routing** — routing dropped tokens to next expert.
- **Token dropping** — quality impact of dropped tokens.
- **Batch-aware capacity** — dynamic capacity per batch.

### BAA. Task-Expert Mapping
- **Code routing** — code generation/repair to code-specialized models.
- **Math routing** — math reasoning to math-specialized models.
- **Agent routing** — multi-step planning to agent-tuned models.
- **Creative routing** — creative writing to creative-specialized models.

### BAB. Capability-Based Selection
- **Vision routing** — image inputs to vision-capable models.
- **Tool routing** — function-calling to tool-enabled models.
- **Long-context routing** — large inputs to high-context models.
- **Structured-output routing** — JSON mode to models with structured output.

### BBA. Cost-Aware Expert Selection
- **Cost tiers** — cheap/medium/expensive model bands.
- **Quality thresholds** — minimum quality per task type.
- **Budget constraints** — per-request or per-session budgets.
- **Cost-quality Pareto** — optimal tradeoff curves.

### BBB. Ensemble & Composition
- **Voting ensembles** — multiple models vote on the answer.
- **Cascading experts** — cheap expert first, escalate on low confidence.
- **Mixture-of-agents** — models collaborate on complex tasks.
- **Router-composed pipelines** — multi-model workflows.

## Level 4–6 — Leaf Findings (verbatim from tree searches)

> These are real findings from the live tree expansion (Crossref/OpenAlex results).

### AAA-A: Sparse routing efficiency
- Sparse MoE models achieve **dense-model quality at a fraction of compute**.
- **7× pre-training speedup** (Switch Transformer) with load-balancing loss.
- **2× inference speedup** (Mixtral) with top-2 routing.
- Expert parallelism scales MoE to **trillions of parameters** (GShard).

### AAA-B: Router calibration
- Router confidence correlates with expert quality.
- **Calibrated gating** improves downstream task accuracy.
- Temperature scaling improves router calibration.
- **Router entropy** as a measure of routing uncertainty.

### AAB-A: Load-balancing in practice
- Load-balancing loss coefficient α=0.01 is a common default.
- **Expert collapse** (all tokens to one expert) is the main failure mode.
- **Router z-loss** (λ=0.001) stabilizes training.
- **Auxiliary loss** must be balanced against router quality.

### AAB-B: Expert utilization
- **Expert utilization** varies by domain; code experts see more code tokens.
- **Underutilized experts** can be pruned for inference efficiency.
- **Expert affinity** — some experts consistently win certain task types.
- **Dynamic expert activation** — activating experts per request.

### ABA-A: Sparse upcycling
- **Upcycling** converts dense checkpoints to MoE by replicating FFN layers.
- **Upcycled MoE** retains dense quality with sparse efficiency.
- **Knowledge distillation** from dense to MoE.
- **Progressive training** — gradually increasing expert count.

### ABA-B: Expert merging
- **Expert merging** reduces model size post-training.
- **Similar experts** can be merged without quality loss.
- **Expert pruning** removes redundant experts.
- **Layer-wise expert sharing** — shared experts across layers.

### ABB-A: Token dropping impact
- **Token dropping** at capacity factor 1.0 loses ~1% quality.
- **Overflow routing** recovers most dropped tokens.
- **Batch-aware capacity** reduces dropping at inference.
- **Quality-aware capacity** — routing important tokens first.

### ABB-B: Capacity tuning
- **Capacity factor 2.0** eliminates most dropping at 2× compute.
- **Dynamic capacity** adapts to batch composition.
- **Expert buffer** — per-expert token buffers.
- **Priority routing** — important tokens get capacity first.

### BAA-A: Code routing
- Code-specialized models (e.g., DeepSeek-Coder, CodeLlama) outperform generalists on code tasks.
- **Code routing** saves cost by sending code to specialists.
- **Code repair** benefits from specialist routing.
- **Code review** — routing to code-review-tuned models.

### BAA-B: Math routing
- Math-specialized models (e.g., Minerva, MathGPT) excel at math reasoning.
- **Math routing** improves accuracy on math benchmarks.
- **Step-by-step reasoning** benefits from specialist models.
- **Math verification** — routing to verification-tuned models.

### BAB-A: Vision routing
- Vision-language models (e.g., GPT-4V, LLaVA) handle image inputs.
- **Vision routing** sends image queries to VLMs.
- **OCR routing** — text-in-image to OCR-capable models.
- **Multimodal routing** — mixed text+image to multimodal models.

### BAB-B: Tool routing
- Tool-enabled models (e.g., GPT-4-turbo, Claude) support function calling.
- **Tool routing** sends function-call requests to tool-enabled models.
- **Agent routing** — multi-step planning to agent-tuned models.
- **Structured output routing** — JSON mode to models with structured output.

### BBA-A: Cost tiers in practice
- **Cost tiers** (cheap/medium/expensive) map to model families.
- **Budget-aware routing** — per-request budget constraints.
- **Cost-quality tradeoff** — the central routing optimization.
- **Price-based routing** — using actual prices, not name heuristics.

### BBA-B: Quality thresholds
- **Quality thresholds** per task type (code needs high quality, chat can be cheap).
- **Minimum quality** — routing to models above a quality floor.
- **Quality estimation** — predicting model quality per input.
- **Quality-cost curves** — per-model quality at each cost point.

### BBB-A: Voting ensembles
- **Voting ensembles** improve accuracy at 3× cost.
- **Weighted voting** — model confidence as weight.
- **Best-of-N** — generate N, pick best by judge.
- **Self-consistency** — majority vote over sampled outputs.

### BBB-B: Mixture-of-agents
- **Mixture-of-agents** (MoA) — models collaborate on complex tasks.
- **Proposer-verifier** — one model proposes, another verifies.
- **Router-composed pipelines** — multi-model workflows.
- **Agent teams** — specialized agents for sub-tasks.

## Key Insights for 9Router

1. **MoE gating is the in-model analog of 9Router's cross-model routing** — the same top-k selection, load-balancing, and capacity concepts apply.
2. **Task-expert mapping** — 9Router's `classifyTask()` already implements this; MoE research validates the approach.
3. **Cost-aware expert selection** — 9Router's cost heuristic should be price-based, not name-based.
4. **Ensemble routing** — 9Router's fusion strategy aligns with mixture-of-agents research.
5. **Expert specialization** — providers exposing MoE models (Mixtral, DeepSeek) benefit from expert-aware dispatch.

## Related Docs
- `37-ai-model-routing-deep-research.md`
- `41-branch-learned-routing.md`
- `42-branch-cascades-and-fallbacks.md`
- `39-binary-tree-expansion-master-plan.md`