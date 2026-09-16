---
Date: 2026-09-15
Author: GitHub Copilot
Status: active
Tags: research, branch, gateway, serving, litellm, openrouter, vllm, load-balancing, proxy
---

# Branch 4 — Gateways & Serving (LiteLLM / OpenRouter / vLLM / coai / 9Router)

> Part of the binary-tree research expansion (see `39-binary-tree-expansion-master-plan.md`).
> This branch covers every node whose topic descends from AI-gateway / model-serving / load-balancing research.

## Root

**Gateways & serving** = the production infrastructure layer that exposes LLM APIs, routes traffic across providers, balances load, and provides reliability (retries, fallbacks, cooldowns). This is where 9Router lives — it IS a gateway.

## Level 1 — Two Children

### A. Gateway Architectures (LiteLLM / OpenRouter / coai lineage)

**LiteLLM (BerriAI, 58.7k stars)** — production-gateway pattern:
- Strategy-based load balancing + reliability layers.
- Strategies: **simple-shuffle** (default), **weighted pick**, **usage-based-routing-v2** (rate-limit aware), **latency-based**, **least-busy**, **cost-based**.
- Routing groups bind model_names to per-group strategy; group callable as virtual model.
- **Session affinity**: pre-call check pinning deployment per session id (x-litellm-session-id header), deployment_affinity_ttl_seconds default 3600, Redis-shared across proxy instances.
- Deployment ordering: order param, lower = higher priority, each order level gets own retries.
- **Weighted failover**: retry within same group re-picking by weights with failed deployment excluded, capped by max_fallbacks (default 5), async-only, not triggered for ContextWindowExceededError/ContentPolicyViolationError.
- **Cooldowns**: 429 → immediate 5s; >50% failures in current minute → 5s; 401/404/408 → 5s; allowed_fails + cooldown_time; per-deployment allowed_fails_policy takes full precedence.
- **Retries**: num_retries precedence (header → body → deployment params → settings); exponential backoff for RateLimitError; pins provider client to max_retries:0 to avoid (1+N)² amplification.
- Pre-call checks: context window filter, EU-region filter.
- Max parallel requests: semaphore (default rpm or tpm/1000/6).
- Caching: Redis recommended. Traffic mirroring / silent experiments for A/B evaluation. Alerting: Slack/webhook.
- Auto Router (complexity_router_config) with session_affinity option.

**OpenRouter Auto Router** — market-driven routing, no training:
- 4 steps: (1) fast lightweight classifier assigns prompt to ~30 fine-grained task types; (2) rank models by real-world spend share over trailing 7-day window; (3) apply cost_tier band (low/medium/high/xhigh/max, default ~low, band not ceiling); (4) route with fallbacks — top surviving models in spend-share order become primary + fallbacks, honoring account restrictions, guardrails, ZDR, allowed_models/excluded_models wildcards, output-modality requirements.
- Degrades gracefully to default model set if classification/rankings unavailable.
- **Session stickiness**: remembers model per conversation (session_id or message fingerprint), reuses only while still a top candidate.
- No extra fee; provider.max_price still applies. X-OpenRouter-Metadata: enabled → openrouter_metadata.pipeline → data.task_type.

**coai** — channel management & priority routing:
- Go + React, "Next Web + One API".
- Channel management algorithm: multi-channel management, priority setting for channel call order, weight setting for load-balancing probability distribution of channels at the same priority, user grouping, automatic retry on failure, model redirection, built-in upstream hiding, channel status management.
- **Model caching**: same request-parameter hash → cached result returned (cache hit not billed).
- 200+ models, 35+ providers, elastic billing (per-request/token/no billing/anonymous), subscription billing, OpenAI-compatible proxy.

### B. Serving & Inference Infrastructure (vLLM lineage)

**vLLM** — high-throughput serving engine:
- **PagedAttention** — virtual memory for KV cache, near-zero waste.
- **Continuous batching** — dynamic request scheduling.
- **Speculative decoding** — draft model + verification for 2–3× speedup.
- **Prefix caching** — reuse KV cache across requests with shared prefixes.
- **Quantization** — INT8/INT4/FP8 support for memory reduction.
- **Tensor parallelism** — multi-GPU inference.
- **vLLM Semantic Router** — programmable Mixture-of-Models (see branch 5).

## Level 2 — Four Children

### AA. Load Balancing Strategies
- **simple-shuffle** — random rotation (LiteLLM default).
- **weighted pick** — probability proportional to weight.
- **usage-based-routing-v2** — rate-limit-aware routing.
- **latency-based** — route to lowest-latency deployment.
- **least-busy** — route to least-loaded deployment.
- **cost-based** — route to cheapest deployment.

### AB. Reliability Layers
- **Retries** — num_retries precedence chain.
- **Fallbacks** — weighted failover with failed deployment excluded.
- **Cooldowns** — 429/5xx/401/404/408 handling.
- **Circuit breakers** — trip after allowed_fails.
- **Health checks** — deployment status monitoring.

### BA. Market-Driven Routing
- **Spend share** — real-world usage as ranking signal.
- **Task-type classification** — ~30 fine-grained task types.
- **Cost tiers** — low/medium/high/xhigh/max bands.
- **Session stickiness** — per-conversation model memory.

### BB. Serving Optimizations
- **PagedAttention** — KV cache paging.
- **Continuous batching** — dynamic scheduling.
- **Speculative decoding** — draft + verify.
- **Prefix caching** — KV reuse.

## Level 3 — Eight Children (selected nodes)

### AAA. Strategy Selection
- **Per-group strategies** — different strategies per routing group.
- **Virtual models** — group callable as single model name.
- **Strategy fallback** — degrade to simple-shuffle on strategy failure.
- **Strategy evaluation** — A/B testing via traffic mirroring.

### AAB. Retry Semantics
- **Precedence chain** — header → body → deployment params → settings.
- **Exponential backoff** — for RateLimitError.
- **max_retries:0 pinning** — avoid (1+N)² amplification.
- **Retry on idempotent errors only** — avoid double-execution.

### ABA. Cooldown Policies
- **429 cooldown** — immediate 5s.
- **Failure-rate cooldown** — >50% failures in minute → 5s.
- **Auth cooldown** — 401/404/408 → 5s.
- **allowed_fails_policy** — per-deployment override.

### ABB. Circuit Breakers
- **Trip conditions** — allowed_fails exceeded.
- **Half-open state** — probe after cooldown.
- **Reset conditions** — successful probe.
- **Per-deployment breakers** — isolation of failures.

### BAA. Task-Type Classification
- **Code tasks** — code:debugging, code:generation.
- **Agent tasks** — agent:multi_step_planning.
- **Knowledge tasks** — qa_knowledge, research_report.
- **Creative tasks** — creative_writing, summarization.

### BAB. Cost Tier Bands
- **low** — default band, cheapest models.
- **medium** — balanced cost-quality.
- **high** — quality-focused.
- **xhigh/max** — flagship models.

### BBA. Session Stickiness
- **Session ID** — per-conversation model memory.
- **Message fingerprint** — content-based stickiness.
- **TTL** — stickiness expiry (LiteLLM: 3600s).
- **Top-candidate check** — reuse only while still a top candidate.

### BBB. Serving Optimizations (deep)
- **PagedAttention details** — block size, page tables.
- **Continuous batching details** — iteration-level scheduling.
- **Speculative decoding details** — draft model size, acceptance rate.
- **Prefix caching details** — hash-based KV reuse.

## Level 4–6 — Leaf Findings (verbatim from tree searches)

### AAA-A: Strategy evaluation
- **Traffic mirroring** — silent experiments for A/B evaluation (LiteLLM).
- **Shadow traffic** — duplicate requests to candidate deployments.
- **Strategy metrics** — latency, cost, error rate per strategy.
- **Strategy switching** — dynamic strategy selection.

### AAA-B: Virtual models
- **Virtual model names** — group callable as single name.
- **Model aliasing** — multiple names → same deployment.
- **Wildcard routing** — allowed_models/excluded_models wildcards.
- **Model redirection** — coai's model redirection feature.

### AAB-A: Backoff strategies
- **Exponential backoff** — 2^n with jitter.
- **Linear backoff** — fixed intervals.
- **Jitter** — randomized delay to avoid thundering herd.
- **Backoff caps** — maximum retry delay.

### AAB-B: Error classification
- **RateLimitError** — 429 handling.
- **ContextWindowExceededError** — no retry (LiteLLM).
- **ContentPolicyViolationError** — no retry (LiteLLM).
- **Auth errors** — 401/403 handling.

### ABA-A: Cooldown tuning
- **Cooldown time** — per-error-type cooldown durations.
- **Failure-rate windows** — rolling minute windows.
- **Cooldown escalation** — increasing cooldown on repeated failures.
- **Cooldown reset** — successful request resets cooldown.

### ABA-B: Failure detection
- **Failure counting** — per-deployment failure counters.
- **Failure-rate calculation** — rolling window.
- **Failure classification** — transient vs permanent.
- **Failure isolation** — per-deployment isolation.

### BAA-A: Code task routing
- **Code debugging** — routing to code-debugging-tuned models.
- **Code generation** — routing to code-generation models.
- **Code review** — routing to review-tuned models.
- **Code repair** — routing to repair-tuned models.

### BAA-B: Agent task routing
- **Multi-step planning** — routing to agent-tuned models.
- **Tool use** — routing to tool-enabled models.
- **Long-horizon tasks** — routing to models with long context.
- **Agent fallback** — fallback chains for agent tasks.

### BAB-A: Cost tier defaults
- **Default low** — OpenRouter's default cost_tier.
- **Band not ceiling** — cost_tier is a band, not a ceiling.
- **Provider max_price** — still applies.
- **Cost tier override** — per-request override.

### BAB-B: Quality tiers
- **Quality-focused tiers** — high/xhigh/max.
- **Quality-cost tradeoff** — per-tier tradeoff.
- **Tier selection** — user or app selects tier.
- **Tier fallback** — degrade to lower tier on failure.

### BBA-A: Stickiness implementation
- **Session ID header** — x-litellm-session-id.
- **Redis-shared** — stickiness across proxy instances.
- **TTL default** — 3600s.
- **Sticky session hash** — FNV-1a (9Router).

### BBA-B: Stickiness tradeoffs
- **Stickiness vs load balance** — sticky sessions reduce balance.
- **Stickiness vs cost** — sticky sessions may keep expensive models.
- **Stickiness TTL tuning** — shorter TTL for cost, longer for UX.
- **Stickiness invalidation** — model removed from top candidates.

### BBB-A: PagedAttention
- **Block size** — 16 tokens per block (vLLM default).
- **Page tables** — virtual memory for KV cache.
- **Near-zero waste** — vs naive preallocation.
- **Copy-on-write** — for beam search.

### BBB-B: Continuous batching
- **Iteration-level scheduling** — schedule per iteration.
- **Dynamic batching** — add/remove requests mid-generation.
- **Throughput gains** — 2–4× vs static batching.
- **Latency tradeoff** — batching increases latency.

## Key Insights for 9Router

1. **9Router already implements most gateway patterns** — strategy routing, fallbacks, cooldowns, session affinity, retries.
2. **Cost-based routing** — LiteLLM's cost-based strategy validates 9Router's cost heuristic direction.
3. **Market-driven routing** — OpenRouter's spend-share ranking is a no-training alternative to learned routers.
4. **Session stickiness** — 9Router's FNV-1a sticky session matches LiteLLM's session affinity.
5. **Traffic mirroring** — 9Router could add silent experiments for routing strategy evaluation.
6. **Model caching** — coai's request-hash caching is a cost-saving feature 9Router lacks.

## Related Docs
- `37-ai-model-routing-deep-research.md`
- `42-branch-cascades-and-fallbacks.md`
- `39-binary-tree-expansion-master-plan.md`
- `01-open-sse-engine.md`, `06-executors-deep-dive.md`, `15-api-routes-deep-dive.md`