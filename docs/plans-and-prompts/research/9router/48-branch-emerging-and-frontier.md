---
Date: 2026-09-15
Author: GitHub Copilot
Status: active
Tags: research, branch, emerging, frontier, speculative-decoding, agent-routing, rag-routing, future
---

# Branch 8 — Emerging & Frontier (new techniques the tree discovers beyond the seeds)

> Part of the binary-tree research expansion (see `39-binary-tree-expansion-master-plan.md`).
> This branch covers every node whose topic descends from frontier/emerging routing research — techniques that go beyond the classic learned/cascade/gateway taxonomy.

## Root

**Emerging & frontier** = the newest routing research: speculative decoding as routing, agent-native routing, RAG-aware routing, context-aware adaptive inference, and the frontier of "routing as a first-class system concern."

## Level 1 — Two Children

### A. Speculative Decoding & Inference Acceleration

**Speculative decoding** — draft model proposes tokens, target model verifies:
- **Draft-verify** — small model drafts, large model accepts/rejects.
- **Acceptance rate** — fraction of drafted tokens accepted.
- **Speedup** — 2–3× typical, up to 4× with good drafts.
- **Speculative sampling** — provably correct sampling.

**Key systems:**
- **Medusa** — multiple decoding heads for parallel speculation.
- **EAGLE** — feature-level speculation.
- **Lookahead decoding** — n-gram-based speculation.
- **SpecInfer** — tree-based speculation.

### B. Agent-Native Routing

**Agent routing** — routing for agent workloads:
- **Multi-step planning** — routing per step, not per request.
- **Tool use** — routing to tool-enabled models.
- **Long-horizon tasks** — context management across steps.
- **Agent fallback** — fallback chains for agent tasks.

**Key systems:**
- **ClawRouter** — constraint-first agent router (15-dimension scorer, hard filters, tier + task shape).
- **OpenRouter Auto Router** — task-type classification for agent tasks.
- **9Router smart router** — classifyTask() with agent:multi_step.

## Level 2 — Four Children

### AA. Speculative Decoding Details
- **Draft models** — small LMs as drafters.
- **Verification** — target model verification.
- **Acceptance** — acceptance rate optimization.
- **Sampling** — speculative sampling correctness.

### AB. Inference Acceleration
- **KV cache optimization** — PagedAttention, prefix caching.
- **Quantization** — INT8/INT4/FP8.
- **Pruning** — sparsity, distillation.
- **Parallelism** — tensor, pipeline, expert.

### BA. Agent Routing Details
- **Per-step routing** — route each agent step.
- **Tool routing** — function-calling models.
- **Context routing** — long-context models.
- **Agent fallback** — agent-specific fallbacks.

### BB. RAG-Aware Routing
- **Retrieval routing** — route to RAG-enabled models.
- **Context augmentation** — retrieved context.
- **Hybrid routing** — dense + sparse retrieval.
- **RAG cascade** — retrieve, then route.

## Level 3 — Eight Children (selected nodes)

### AAA. Draft Model Selection
- **Draft size** — small (125M–1B) drafters.
- **Draft quality** — acceptance rate vs draft quality.
- **Draft latency** — draft overhead.
- **Draft training** — distillation for drafts.

### AAB. Verification Strategies
- **Greedy verification** — accept greedy matches.
- **Sampled verification** — accept sampled matches.
- **Tree verification** — multiple candidates.
- **Verification cost** — target model calls.

### ABA. KV Cache Optimization
- **PagedAttention** — vLLM's virtual memory.
- **Prefix caching** — hash-based KV reuse.
- **KV quantization** — compressed KV cache.
- **KV eviction** — cache eviction policies.

### ABB. Quantization for Routing
- **INT8** — 2× memory reduction.
- **INT4** — 4× memory reduction.
- **FP8** — balanced precision.
- **Quantization-aware routing** — route to quantized models.

### BAA. Per-Step Routing
- **Step classification** — classify each agent step.
- **Step routing** — route each step independently.
- **Step context** — carry context across steps.
- **Step cost** — per-step cost tracking.

### BAB. Tool-Enabled Routing
- **Function calling** — tool-enabled models.
- **Tool selection** — which tools per model.
- **Tool fallback** — models without tools.
- **Tool cost** — tool call costs.

### BBA. Retrieval Routing
- **Retrieval models** — RAG-enabled models.
- **Retrieval quality** — retrieval accuracy.
- **Retrieval cost** — retrieval overhead.
- **Retrieval cascade** — retrieve, then route.

### BBB. Hybrid Retrieval
- **Dense retrieval** — embedding-based.
- **Sparse retrieval** — BM25.
- **Hybrid fusion** — RRF, weighted fusion.
- **Reranking** — cross-encoder reranking.

## Level 4–6 — Leaf Findings (verbatim from tree searches)

### AAA-A: Draft model tradeoffs
- **Smaller drafts** — lower latency, lower acceptance.
- **Larger drafts** — higher acceptance, higher latency.
- **Domain drafts** — code drafts for code tasks.
- **Draft distillation** — distill target into draft.

### AAA-B: Acceptance rate
- **Typical acceptance** — 60–80%.
- **Acceptance vs speedup** — linear relationship.
- **Acceptance vs draft quality** — strong correlation.
- **Acceptance tuning** — temperature, top-k.

### AAB-A: Greedy vs sampled verification
- **Greedy** — deterministic, lower quality.
- **Sampled** — stochastic, higher quality.
- **Speculative sampling** — provably correct.
- **Verification overhead** — target model calls.

### AAB-B: Tree speculation
- **Tree candidates** — multiple draft branches.
- **Tree verification** — verify all branches.
- **Tree acceptance** — best branch accepted.
- **Tree overhead** — verification cost.

### ABA-A: Prefix caching
- **Hash-based** — hash prefix → KV.
- **Reuse** — shared prefixes across requests.
- **Cache hit rate** — prefix reuse rate.
- **Cache eviction** — LRU, LFU.

### ABA-B: KV quantization
- **KV INT8** — 2× memory reduction.
- **KV INT4** — 4× memory reduction.
- **KV quality** — quantization quality loss.
- **KV-aware routing** — route by KV budget.

### BAA-A: Step classification
- **Step types** — plan, act, observe, reflect.
- **Step classification** — classify per step.
- **Step routing** — route per step type.
- **Step cost** — per-step cost tracking.

### BAA-B: Step context
- **Context carry** — across steps.
- **Context window** — per-step context budget.
- **Context compression** — summarize old steps.
- **Context routing** — route by context size.

### BAB-A: Function calling
- **Tool-enabled models** — GPT-4-turbo, Claude.
- **Tool schemas** — JSON schema definitions.
- **Tool execution** — execute tool calls.
- **Tool results** — feed results back.

### BAB-B: Tool fallback
- **No-tool models** — route to tool models.
- **Tool degradation** — models without tools.
- **Tool cost** — tool call costs.
- **Tool caching** — cache tool results.

### BBA-A: Retrieval quality
- **Retrieval accuracy** — top-k precision.
- **Retrieval latency** — retrieval overhead.
- **Retrieval cost** — retrieval API costs.
- **Retrieval routing** — route by retrieval needs.

### BBA-B: RAG cascade
- **Retrieve-then-route** — retrieve, then route.
- **Route-then-retrieve** — route, then retrieve.
- **Iterative retrieval** — multi-round retrieval.
- **RAG cost** — retrieval + generation costs.

### BBB-A: Dense retrieval
- **Embedding models** — BGE, E5, MiniLM.
- **ANN indexes** — HNSW, IVF.
- **Dense quality** — semantic matching.
- **Dense cost** — embedding API costs.

### BBB-B: Sparse retrieval
- **BM25** — lexical matching.
- **TF-IDF** — term frequency.
- **Sparse quality** — exact matching.
- **Sparse cost** — cheap, local.

## Key Insights for 9Router

1. **Speculative decoding is orthogonal to routing** — it accelerates individual model calls; 9Router could expose it as a provider-level optimization.
2. **Agent-native routing is the frontier** — ClawRouter and OpenRouter Auto Router show agent workloads need per-step routing, not per-request.
3. **RAG-aware routing** — 9Router's web-search/web-fetch skills could integrate retrieval-aware routing.
4. **KV-aware routing** — route by context budget (KV cache size) for long-context workloads.
5. **Quantization-aware routing** — route to quantized models for cost savings.
6. **The tree keeps discovering new threads** — this branch will grow as Tier 2/3 expansion runs.

## Related Docs
- `37-ai-model-routing-deep-research.md`
- `41-branch-learned-routing.md` through `47-branch-9router-internal-threads.md`
- `39-binary-tree-expansion-master-plan.md`