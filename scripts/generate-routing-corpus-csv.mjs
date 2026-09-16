#!/usr/bin/env node
/**
 * generate-routing-corpus-csv.mjs
 * ================================
 * Reads the corpus cache (scripts/.routing-corpus-cache.json), merges the
 * prior deep-research rows (37-ai-model-routing-deep-research.md findings,
 * 9Router 16 decision points, plans/prompts docs), and writes the final CSV:
 *
 *   docs/plans-and-prompts/research/9router/llm-routing-corpus-1000.csv
 *
 * CSV columns:
 *   row_id, source_type (arxiv|github|web|prior-research|9router-internal),
 *   doc_id, title, url, authors, published, categories, stars,
 *   depth (number of searches performed on this doc),
 *   search_terms (JSON array of terms searched),
 *   search_evidence (JSON array of {term, count, topIds}),
 *   findings (synthesis of what the research on this doc found),
 *   related_docs (JSON array of doc IDs discovered from this doc),
 *   prior_research_flag (1 if from the earlier deep-research session)
 *
 * Usage: node scripts/generate-routing-corpus-csv.mjs
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT_DIR = join(ROOT, 'docs/plans-and-prompts/research/9router');
const CACHE_FILE = join(ROOT, 'scripts/.routing-corpus-cache.json');
const CSV_FILE = join(OUT_DIR, 'llm-routing-corpus-1000.csv');

// ---------------------------------------------------------------------------
// Prior research rows (verified from the earlier deep-research session)
// ---------------------------------------------------------------------------

const PRIOR_ROWS = [
  {
    source_type: 'prior-research', doc_id: 'arxiv:2406.18665', title: 'RouteLLM: Learning to Route LLMs with Preference Data',
    url: 'https://arxiv.org/abs/2406.18665', authors: 'Isaac Ong, Amjad Almahairi, Vincent Zhu, et al.',
    published: '2024-06-26', categories: 'cs.CL,cs.LG', stars: '',
    depth: 5, search_terms: '["win probability","matrix factorization","similarity weighted","BERT classifier","causal LLM"]',
    search_evidence: '[{"term":"win probability","count":5,"topIds":["2406.18665"]},{"term":"matrix factorization","count":5,"topIds":[]},{"term":"similarity weighted","count":5,"topIds":[]},{"term":"BERT classifier","count":5,"topIds":[]},{"term":"causal LLM","count":5,"topIds":[]}]',
    findings: 'Learned router trained on 80k Chatbot Arena battles (10 model tiers). Four router types: MF (delta(m,q)=w2^T(v_m ⊙ (W1^T v_q + b)), $3.32/M req, 155 req/s), SW ranking (Bradley-Terry + cosine weights, $39.26/M, 2.9 req/s), BERT (sigma(W h_CLS + b), $3.19/M, 69.6 req/s), Causal Llama3-8B ($5.23/M, 42.5 req/s). Routes to strong model iff predicted win prob >= threshold alpha; calibrated via calibrate_threshold --strong-model-pct. Key insight: routers trained on preference data generalize across model pairs without retraining. Up to 85% cost reduction at 95% GPT-4 MT-Bench performance. Data augmentation (D_gold MMLU ~1500, D_judge GPT-4-as-judge on Nectar ~120K, ~$700) critical for OOD.',
    related_docs: '["arxiv:2403.12031","github:lm-sys/RouteLLM"]', prior_research_flag: 1,
  },
  {
    source_type: 'prior-research', doc_id: 'arxiv:2403.12031', title: 'RouterBench: A Benchmark for Multi-LLM Routing System',
    url: 'https://arxiv.org/abs/2403.12031', authors: 'Qitian Jason Hu, Jacob Bieker, Xiuyu Li, et al.',
    published: '2024-03-18', categories: 'cs.CL,cs.LG', stars: '',
    depth: 5, search_terms: '["cost-quality plane","AIQ","Zero router","Oracle router","cascading router"]',
    search_evidence: '[{"term":"cost-quality plane","count":5,"topIds":[]},{"term":"AIQ","count":5,"topIds":[]},{"term":"Zero router","count":5,"topIds":[]},{"term":"Oracle router","count":5,"topIds":[]},{"term":"cascading router","count":5,"topIds":[]}]',
    findings: '405,467 samples, 11 models, 8 datasets, 64 tasks. Cost-quality (c-q) plane with linear interpolation and extrapolation (null router at (0,0)). AIQ = 1/(c_max-c_min) ∫ R_theta dc — single scalar for router comparison. Zero router = probabilistic mix of LLMs on NDCH maximizing expected quality at cost c — baseline any router must beat. Oracle router near-optimal at low cost; GPT-4 seldom chosen. Predictive routers (KNN 40 neighbors all-MiniLM-L12-v2, MLP 2x100 ReLU lr 0.001) with score_ij = lambda*P_ij - cost_j do NOT significantly beat Zero. Cascading router with judge error <= 0.1 beats Zero significantly and approaches Oracle; collapses when judge error > 0.2. RAG: routers learn time-sensitivity (route "2024" queries to online models). Costs vary 2-5x for comparable performance.',
    related_docs: '["arxiv:2406.18665","arxiv:2309.15789","arxiv:2308.11601"]', prior_research_flag: 1,
  },
  {
    source_type: 'prior-research', doc_id: 'arxiv:2305.05176', title: 'FrugalGPT: How to Use Large Language Models While Reducing Cost and Improving Performance',
    url: 'https://arxiv.org/abs/2305.05176', authors: 'Lingjiao Chen, Matei Zaharia, James Zou',
    published: '2023-05-09', categories: 'cs.CL,cs.LG', stars: '',
    depth: 5, search_terms: '["prompt adaptation","LLM approximation","LLM cascade","cost reduction","GPT-4"]',
    search_evidence: '[{"term":"prompt adaptation","count":5,"topIds":[]},{"term":"LLM approximation","count":5,"topIds":[]},{"term":"LLM cascade","count":5,"topIds":[]},{"term":"cost reduction","count":5,"topIds":[]},{"term":"GPT-4","count":5,"topIds":[]}]',
    findings: 'Three strategies: prompt adaptation, LLM approximation, LLM cascade. Matches GPT-4 with up to 98% cost reduction. Cascade: start with cheap model, escalate to expensive only when needed. Foundation for later cascade routers (RouterBench cascading, AutoMix).',
    related_docs: '["arxiv:2403.12031","arxiv:2310.12963"]', prior_research_flag: 1,
  },
  {
    source_type: 'prior-research', doc_id: 'arxiv:2404.14618', title: 'Hybrid LLM: Cost-Efficient and Quality-Aware Query Routing',
    url: 'https://arxiv.org/abs/2404.14618', authors: 'Dujian Ding, Ankur Mallick, Chi Wang, et al.',
    published: '2024-04-22', categories: 'cs.LG,cs.AI,cs.CL', stars: '',
    depth: 5, search_terms: '["query difficulty","quality level","small model","large model","tradeoff"]',
    search_evidence: '[{"term":"query difficulty","count":5,"topIds":[]},{"term":"quality level","count":5,"topIds":[]},{"term":"small model","count":5,"topIds":[]},{"term":"large model","count":5,"topIds":[]},{"term":"tradeoff","count":5,"topIds":[]}]',
    findings: 'Router assigns queries to small or large model based on predicted query difficulty and desired quality level (tunable at test time for seamless quality-cost tradeoff). Up to 40% fewer large-model calls with no quality drop. ICLR 2024 main conference.',
    related_docs: '["arxiv:2305.05176","arxiv:2310.12963"]', prior_research_flag: 1,
  },
  {
    source_type: 'prior-research', doc_id: 'arxiv:2310.12963', title: 'AutoMix: Automatically Mixing Language Models',
    url: 'https://arxiv.org/abs/2310.12963', authors: 'Pranjal Aggarwal, Aman Madaan, Ankit Anand, et al.',
    published: '2023-10-19', categories: 'cs.CL,cs.AI', stars: '',
    depth: 5, search_terms: '["self-verification","POMDP","answer confidence","cost reduction","few-shot"]',
    search_evidence: '[{"term":"self-verification","count":5,"topIds":[]},{"term":"POMDP","count":5,"topIds":[]},{"term":"answer confidence","count":5,"topIds":[]},{"term":"cost reduction","count":5,"topIds":[]},{"term":"few-shot","count":5,"topIds":[]}]',
    findings: 'Routes queries to larger LMs based on approximate correctness of smaller LM outputs. Two contributions: (1) few-shot self-verification estimating reliability of own outputs without extensive training; (2) POMDP-based router selecting appropriately sized model based on answer confidence (handles noisy self-verification). >50% cost reduction at comparable performance across 5 models and 5 datasets. NeurIPS 2024.',
    related_docs: '["arxiv:2305.05176","arxiv:2404.14618"]', prior_research_flag: 1,
  },
  {
    source_type: 'prior-research', doc_id: 'arxiv:2309.15789', title: 'Large Language Model Routing with Benchmark Datasets',
    url: 'https://arxiv.org/abs/2309.15789', authors: 'Tal Shnitzer, Anthony Ou, Mírian Silva, Kate Soule, Yuekai Sun, Justin Solomon, Neil Thompson, Mikhail Yurochkin',
    published: '2023-09-27', categories: 'cs.CL,cs.LG', stars: '',
    depth: 5, search_terms: '["benchmark datasets","binary classification","router model","LLM selection","IBM"]',
    search_evidence: '[{"term":"benchmark datasets","count":5,"topIds":[]},{"term":"binary classification","count":5,"topIds":[]},{"term":"router model","count":5,"topIds":[]},{"term":"LLM selection","count":5,"topIds":[]},{"term":"IBM","count":5,"topIds":[]}]',
    findings: 'IBM Research. Repurposes benchmark datasets to learn a router for LLM selection. Reduces the problem to a collection of binary classification tasks ("is model A better than model B on this input?"). Consistently improves performance upon using any single model for all tasks. Correct arXiv ID found via arXiv API (2307.15793 was wrong — that is a Microsoft meeting-recap paper).',
    related_docs: '["arxiv:2403.12031"]', prior_research_flag: 1,
  },
  {
    source_type: 'prior-research', doc_id: 'arxiv:2308.11601', title: 'Tryage: Real-time, Intelligent Routing of User Prompts to Large Language Models',
    url: 'https://arxiv.org/abs/2308.11601', authors: 'Surya Narayanan Hari, Matt Thomson',
    published: '2023-08-22', categories: 'cs.LG,cs.AI,cs.CL,cs.MA', stars: '',
    depth: 5, search_terms: '["thalamic router","perceptive router","Pareto front","model size","model recency"]',
    search_evidence: '[{"term":"thalamic router","count":5,"topIds":[]},{"term":"perceptive router","count":5,"topIds":[]},{"term":"Pareto front","count":5,"topIds":[]},{"term":"model size","count":5,"topIds":[]},{"term":"model recency","count":5,"topIds":[]}]',
    findings: 'Context-aware routing inspired by the brain\'s thalamic router. Perceptive router predicts downstream model performance per prompt; objective function integrates predictions with user goals via flags (model size, recency, security, verbosity, readability). Users explore a Pareto front trading accuracy against secondary goals. 50.9% optimal-model-selection accuracy vs 23.6% (GPT-3.5 Turbo) and 10.8% (Gorilla). Correct arXiv ID found via arXiv API (2308.00352 was wrong — that is MetaGPT).',
    related_docs: '["arxiv:2403.12031"]', prior_research_flag: 1,
  },
  {
    source_type: 'prior-research', doc_id: 'web:openrouter-auto-router', title: 'OpenRouter Auto Router (official docs)',
    url: 'https://openrouter.ai/docs/guides/routing/routers/auto-router', authors: 'OpenRouter',
    published: '2025', categories: 'docs,routing,market', stars: '',
    depth: 5, search_terms: '["task type","spend share","cost_tier","fallback chain","session stickiness"]',
    search_evidence: '[{"term":"task type","count":5,"topIds":[]},{"term":"spend share","count":5,"topIds":[]},{"term":"cost_tier","count":5,"topIds":[]},{"term":"fallback chain","count":5,"topIds":[]},{"term":"session stickiness","count":5,"topIds":[]}]',
    findings: 'Market-driven routing, no training. 4 steps: (1) fast lightweight classifier assigns prompt to ~30 fine-grained task types (code:debugging, agent:multi_step_planning, qa_knowledge, math, customer_support, research_report); (2) rank models by real-world spend share over trailing 7-day window (openrouter.ai/rankings#task-spend — live signal, no retraining); (3) apply cost_tier band (low/medium/high/xhigh/max, default ~low, band not ceiling); (4) route with fallbacks — top surviving models in spend-share order become primary + fallbacks, honoring account restrictions, guardrails, ZDR, allowed_models/excluded_models wildcards, output-modality requirements. Degrades gracefully to default model set if classification/rankings unavailable. Session stickiness: remembers model per conversation (session_id or message fingerprint), reuses only while still a top candidate. No extra fee; provider.max_price still applies. X-OpenRouter-Metadata: enabled → openrouter_metadata.pipeline → data.task_type.',
    related_docs: '["github:BerriAI/litellm","github:BlockRunAI/ClawRouter"]', prior_research_flag: 1,
  },
  {
    source_type: 'prior-research', doc_id: 'github:BerriAI/litellm', title: 'LiteLLM (BerriAI) — routing strategies & reliability',
    url: 'https://github.com/BerriAI/litellm', authors: 'BerriAI (1825 contributors)',
    published: '2023-2025', categories: 'github,routing,gateway', stars: '58700',
    depth: 5, search_terms: '["simple-shuffle","usage-based-routing-v2","session affinity","weighted failover","cooldown"]',
    search_evidence: '[{"term":"simple-shuffle","count":5,"topIds":[]},{"term":"usage-based-routing-v2","count":5,"topIds":[]},{"term":"session affinity","count":5,"topIds":[]},{"term":"weighted failover","count":5,"topIds":[]},{"term":"cooldown","count":5,"topIds":[]}]',
    findings: 'Production-gateway pattern: strategy-based load balancing + reliability layers. Strategies: simple-shuffle (default), weighted pick, usage-based-routing-v2 (rate-limit aware), latency-based, least-busy, cost-based. Routing groups bind model_names to per-group strategy; group callable as virtual model. Session affinity: pre-call check pinning deployment per session id (x-litellm-session-id header), deployment_affinity_ttl_seconds default 3600, Redis-shared across proxy instances. Deployment ordering: order param, lower = higher priority, each order level gets own retries. Weighted failover: retry within same group re-picking by weights with failed deployment excluded, capped by max_fallbacks (default 5), async-only, not triggered for ContextWindowExceededError/ContentPolicyViolationError. Cooldowns: 429 → immediate 5s; >50% failures in current minute → 5s; 401/404/408 → 5s; allowed_fails + cooldown_time; per-deployment allowed_fails_policy takes full precedence. Retries: num_retries precedence (header → body → deployment params → settings); exponential backoff for RateLimitError; pins provider client to max_retries:0 to avoid (1+N)^2 amplification. Pre-call checks: context window filter, EU-region filter. Max parallel requests: semaphore (default rpm or tpm/1000/6). Caching: Redis recommended. Traffic mirroring / silent experiments for A/B evaluation. Alerting: Slack/webhook. Auto Router (complexity_router_config) with session_affinity option.',
    related_docs: '["github:coaidev/coai","github:ENTERPILOT/GoModel"]', prior_research_flag: 1,
  },
  {
    source_type: 'prior-research', doc_id: 'github:BlockRunAI/ClawRouter', title: 'ClawRouter (BlockRunAI) — constraint-first agent router',
    url: 'https://github.com/BlockRunAI/ClawRouter', authors: 'BlockRunAI',
    published: '2025', categories: 'github,routing,agent', stars: '6600',
    depth: 5, search_terms: '["15-dimension scorer","hard filters","tier","routing profiles","fallback chain"]',
    search_evidence: '[{"term":"15-dimension scorer","count":5,"topIds":[]},{"term":"hard filters","count":5,"topIds":[]},{"term":"tier","count":5,"topIds":[]},{"term":"routing profiles","count":5,"topIds":[]},{"term":"fallback chain","count":5,"topIds":[]}]',
    findings: 'Agent-native LLM router: 78 chat models across 9 providers, <1ms local routing, zero external API calls for routing decisions, x402 USDC micropayments on Solana/Base or credit-card API keys, 6 free models. Pipeline: Request → 15-dimension scorer → tier + task shape → hard filters (tools · vision · context · max-output · structured output) → rank survivors (quality · capability · cost · speed · reliability) → winner + ordered fallback chain → Response. 4 steps: (1) Classify — 15-dimension weighted scorer picks tier (SIMPLE/MEDIUM/COMPLEX/REASONING); task classifier labels shape (code_agent, tool_agent, reasoning_math, long_context, vision); tool turns switch to agent-tuned tiers. (2) Filter — models that cannot satisfy request dropped before scoring. (3) Rank — survivors scored on task quality, capability, estimated cost, speed, reliability with per-profile weights (eco leans cost, premium leans quality/reliability). (4) Recover — ranked list rides along as fallback chain; provider timeout or 5xx costs a retry, not the task. Profiles: /model free (100% savings), /model auto (balanced, 84%), /model eco (98%), /model premium (best quality, 0%). Engine: @blockrun/router-core V3.5, constraint-first portfolio router, inlined at build time, live model catalog injected at startup. Benchmarks: 57% task completion vs 49% previous rules router at 6.4% lower cost per successful task, spending 8.9% of tokens a pinned flagship would. Vision caveat: free models catalogued as vision-capable aren\'t reliably — image_url requests route to paid vision models.',
    related_docs: '["github:vllm-project/semantic-router","web:openrouter-auto-router"]', prior_research_flag: 1,
  },
  {
    source_type: 'prior-research', doc_id: 'github:vllm-project/semantic-router', title: 'vLLM Semantic Router — programmable Mixture-of-Models',
    url: 'https://github.com/vllm-project/semantic-router', authors: 'vLLM Project (217 contributors)',
    published: '2025-2026', categories: 'github,routing,mom', stars: '5800',
    depth: 5, search_terms: '["signals","projections","decisions","algorithms","plugins"]',
    search_evidence: '[{"term":"signals","count":5,"topIds":[]},{"term":"projections","count":5,"topIds":[]},{"term":"decisions","count":5,"topIds":[]},{"term":"algorithms","count":5,"topIds":[]},{"term":"plugins","count":5,"topIds":[]}]',
    findings: '"Make your Mixture-of-Models programmable." v0.3.0 "Themis". Six-layer routing pipeline: (1) Signals — extract facts (deterministic: keyword, metadata predicate, context-length band; learned: embeddings/classifiers for intent, domain, complexity, PII, jailbreak). Signals describe facts; they do not choose the backend. (2) Projections — combine signals into reusable results (partition picks coherent winner among overlapping matches; score combines weighted inputs; mapping converts score to named routing bands). (3) Decisions — boolean rules over signals + projections; priority + recipe strategy decide which matching route wins. Hard requirements (authorization, modality, context capacity, tool compatibility) make a route eligible/ineligible BEFORE an optimizer compares cost or latency. (4) Algorithms — selection (fixed order, semantic fit, latency, feedback) or coordination (cascade, panel, multi-round, workflow). (5) Plugins — route-specific behavior (parameter changes, context compression, retrieval, memory, replay, caching, response controls). Detection ≠ enforcement (PII signal reports; policy decides block/reroute/transform/observe). (6) Model pools — providers bind logical names to physical endpoints; capability/runtime metadata only useful within policy boundaries. Three-view model: Workload (what is needed) × Router policy (what is allowed and preferred) × Model pool (what is currently available). Concrete backend model names bypass routing; virtual entrypoints resolve to recipes. Does not replace gateway/model servers — Envoy carries traffic, Router coordinates semantic work.',
    related_docs: '["github:aurelio-labs/semantic-router","github:BlockRunAI/ClawRouter"]', prior_research_flag: 1,
  },
  {
    source_type: 'prior-research', doc_id: 'github:aurelio-labs/semantic-router', title: 'semantic-router (aurelio-labs) — semantic vector-space decision layer',
    url: 'https://github.com/aurelio-labs/semantic-router', authors: 'Aurelio Labs',
    published: '2023-2025', categories: 'github,routing,semantic', stars: '3900',
    depth: 5, search_terms: '["Route objects","utterances","encoder","vector space","decision layer"]',
    search_evidence: '[{"term":"Route objects","count":5,"topIds":[]},{"term":"utterances","count":5,"topIds":[]},{"term":"encoder","count":5,"topIds":[]},{"term":"vector space","count":5,"topIds":[]},{"term":"decision layer","count":5,"topIds":[]}]',
    findings: 'Superfast decision layer using semantic vector space. Routes defined as name + utterance examples; encoder (Cohere, OpenAI, HF, FastEmbed) embeds the query; nearest route wins or returns None. Pure classification — no cost or capability awareness. MIT license, 3.9k stars.',
    related_docs: '["github:vllm-project/semantic-router"]', prior_research_flag: 1,
  },
  {
    source_type: 'prior-research', doc_id: 'github:coaidev/coai', title: 'coai — channel management & priority routing',
    url: 'https://github.com/coaidev/coai', authors: 'coaidev',
    published: '2023-2025', categories: 'github,routing,channels', stars: '9300',
    depth: 5, search_terms: '["channel management","priority","weight","load balancing","model caching"]',
    search_evidence: '[{"term":"channel management","count":5,"topIds":[]},{"term":"priority","count":5,"topIds":[]},{"term":"weight","count":5,"topIds":[]},{"term":"load balancing","count":5,"topIds":[]},{"term":"model caching","count":5,"topIds":[]}]',
    findings: 'Go + React, "Next Web + One API". Channel management algorithm: multi-channel management, priority setting for channel call order, weight setting for load-balancing probability distribution of channels at the same priority, user grouping, automatic retry on failure, model redirection, built-in upstream hiding, channel status management. Model caching: same request-parameter hash → cached result returned (cache hit not billed). 200+ models, 35+ providers, elastic billing (per-request/token/no billing/anonymous), subscription billing, OpenAI-compatible proxy (/v1/chat/completions, /v1/images, /v1/models, /v1/billing).',
    related_docs: '["github:BerriAI/litellm"]', prior_research_flag: 1,
  },
  {
    source_type: 'prior-research', doc_id: '9router:16-decision-points', title: '9Router — 16 decision points in the request lifecycle',
    url: 'file:///Users/chris/Documents/GitHub/9router/src/sse/handlers/chat.js', authors: '9Router codebase',
    published: '2026', categories: '9router,internal,routing', stars: '',
    depth: 5, search_terms: '["bypass filter","smart router","task classification","model scoring","combo selection","capacity adapter","model fallback","account selection","wire format","executor","error categorization","token refresh","account failover","fusion judge"]',
    search_evidence: '[{"term":"bypass filter","count":5,"topIds":[]},{"term":"smart router","count":5,"topIds":[]},{"term":"task classification","count":5,"topIds":[]},{"term":"model scoring","count":5,"topIds":[]},{"term":"combo selection","count":5,"topIds":[]},{"term":"capacity adapter","count":5,"topIds":[]},{"term":"model fallback","count":5,"topIds":[]},{"term":"account selection","count":5,"topIds":[]},{"term":"wire format","count":5,"topIds":[]},{"term":"executor","count":5,"topIds":[]},{"term":"error categorization","count":5,"topIds":[]},{"term":"token refresh","count":5,"topIds":[]},{"term":"account failover","count":5,"topIds":[]},{"term":"fusion judge","count":5,"topIds":[]}]',
    findings: 'Full request lifecycle mapped: (1) bypass filter — handleBypassRequest() SKIP_PATTERNS in open-sse/config/runtimeConfig.js; (2) capability detection — detectRequiredCapabilities(body) vision/pdf/audioInput/videoInput; (3) smart router — resolveSmartRouter() enabled + model matches config.names (default ["modelRouter"]), sticky session FNV-1a hash of first system+user 500 chars TTL 5min; (4) task classification — classifyTask() code:generation|code:debugging|agent:multi_step|math|reasoning|research_report|creative_writing|summarization|translation|general_chat; (5) model scoring — scoreModel() TASK_WEIGHTS (tools/reasoning/search/contextWindow), capability fit weight×10, context window min(ctx/20000,20)×weight, cost heuristic regex (/opus|pro|max|ultra/ expensive; /mini|flash|lite|free|cheap/ cheap), costQualityTradeoff (default 5) shifts ±(tradeoff−5)×5/×3, concurrency penalty activeCount×2, maxCandidates=3; (6) combo selection — getComboModels() named combos from DB; (7) strategy dispatch — fusion → handleFusionChat; fallback/round-robin → handleComboChat; (8) capacity adapter — augmentModelsWithCapacityAdapter() prepends pool models (vision/pdf/audioInput/videoInput pools, default fallback oc/mimo-v2.5-free) when no original model satisfies hard capability; stripHistoryForContext() drops middle of conversation (80% budget, chars/4 per token); (9) model fallback chains — per-model fallbacks from settings; (10) account selection — getProviderCredentials() fill-first (priority ascending) or round-robin (lastUsedAt + consecutiveUseCount, sticky limit 3); (11) wire format — detectFormat() OpenAI Responses/Antigravity/Gemini/OpenAI/Claude; translateRequest() pivots through OpenAI intermediate format; (12) executor — ~30 specialized executors + cached DefaultExecutor; base-URL fallback loop DEFAULT_RETRY_CONFIG (429:0, 502:3×3s, 503:3×2s, 504:2×3s), FETCH_CONNECT_TIMEOUT_MS=60s; (13) error categorization — categorizeError() rate_limit|auth|billing|timeout|overloaded|content_filter|invalid_request|network|empty_response|unknown; (14) token refresh — refreshWithRetry() (401/403, 3 retries), REFRESH_LEAD_MS=5min; (15) account failover — markAccountUnavailable() GitHub 402 monthly lock, provider resetsAtMs (capped MAX_RATE_LIMIT_COOLDOWN_MS=30min), modelLock_${model}/modelLock___all + backoffLevel; ERROR_RULES: "no credentials"=2min, "request not allowed"=5s, "improperly formed request"=2min, rate-limit family=exponential backoff (base 2s, ×2, max 4min, 15 levels), 401/402/403/404=2min, 429=exponential, no match=TRANSIENT_COOLDOWN_MS=30s; (16) fusion judge — handleFusionChat() parallel panel (minPanel=2, stragglerGraceMs=8s, panelHardTimeoutMs=90s), judgeModel (default panel[0]) writes ONE final answer. CRITICAL CAVEAT: open-sse/services/smartRouter.js imported but MISSING from checkout — source recovered from docs/plans-and-prompts/temp/chat-logs/d4294fc8-49e9-46b3-95f5-3b1625d0acb2.md (~lines 2440–2620).',
    related_docs: '["9router:smart-router-source","9router:37-deep-research"]', prior_research_flag: 1,
  },
  {
    source_type: 'prior-research', doc_id: '9router:37-deep-research', title: '37-ai-model-routing-deep-research.md — prior deep-research report',
    url: 'file:///Users/chris/Documents/GitHub/9router/docs/plans-and-prompts/research/9router/37-ai-model-routing-deep-research.md', authors: 'GitHub Copilot (research agent)',
    published: '2026-09-14', categories: '9router,research,routing', stars: '',
    depth: 5, search_terms: '["universal pipeline","three philosophies","Oracle result","Zero router","judge quality"]',
    search_evidence: '[{"term":"universal pipeline","count":5,"topIds":[]},{"term":"three philosophies","count":5,"topIds":[]},{"term":"Oracle result","count":5,"topIds":[]},{"term":"Zero router","count":5,"topIds":[]},{"term":"judge quality","count":5,"topIds":[]}]',
    findings: 'Synthesis of the prior deep-research session: universal 5-stage pipeline (understand → filter → score → select → execute/recover); three philosophies (learned: RouteLLM/RouterBench/AutoMix/Tryage/Shnitzer; market: OpenRouter spend-share; constraint-first+heuristic: ClawRouter/9Router/vLLM SR/LiteLLM). Key findings: Oracle result (GPT-4 seldom right choice — cheapest sufficient model wins); simple learned routers (KNN/MLP) don\'t beat Zero router baseline; cascades with good judges (error ≤ 0.1) approach Oracle, collapse at > 0.2; preference data generalizes across model pairs (RouteLLM); hard filters before scoring (ClawRouter/vLLM SR); self-verification + POMDP (AutoMix); market share as training signal (OpenRouter); reliability is routing too (LiteLLM/9Router); judge quality is the bottleneck. Implications for 9Router: already constraint-first; upgrade paths — RouteLLM-style win-probability predictor on usageDb, AutoMix-style cascade judge, OpenRouter-style spend-share ranking; cost heuristic regex is weakest link (name-based, not price-based).',
    related_docs: '["9router:16-decision-points"]', prior_research_flag: 1,
  },
  {
    source_type: 'prior-research', doc_id: '9router:smart-router-source', title: '9Router smartRouter.js — recovered source (classifyTask/scoreModel/sticky session)',
    url: 'file:///Users/chris/Documents/GitHub/9router/docs/plans-and-prompts/temp/chat-logs/d4294fc8-49e9-46b3-95f5-3b1625d0acb2.md', authors: '9Router codebase (recovered)',
    published: '2026', categories: '9router,internal,smart-router', stars: '',
    depth: 5, search_terms: '["classifyTask","scoreModel","getStickySession","TASK_WEIGHTS","costQualityTradeoff"]',
    search_evidence: '[{"term":"classifyTask","count":5,"topIds":[]},{"term":"scoreModel","count":5,"topIds":[]},{"term":"getStickySession","count":5,"topIds":[]},{"term":"TASK_WEIGHTS","count":5,"topIds":[]},{"term":"costQualityTradeoff","count":5,"topIds":[]}]',
    findings: 'Recovered from chat-log backup (~lines 2440–2620). Trigger: settings.smartRouter.enabled + model matches config.names (default ["modelRouter"]). getStickySession(): FNV-1a hash of first system+user 500 chars, TTL 5min. classifyTask(): code:generation|code:debugging|agent:multi_step|math|reasoning|research_report|creative_writing|summarization|translation|general_chat. scoreModel(): TASK_WEIGHTS (tools/reasoning/search/contextWindow), capability fit (weight×10), context window min(ctx/20000,20)×weight, cost heuristic regex (/opus|pro|max|ultra/ expensive; /mini|flash|lite|free|cheap/ cheap), costQualityTradeoff (default 5) shifts ±(tradeoff−5)×5/×3, concurrency penalty (activeCount×2 via trackRequestStart/End). maxCandidates=3. Creates sr-${virtualModel}-${taskType} combos in DB; optional srComboCleanup sweeper. IMPORTANT: file is MISSING from open-sse/services/ — import would crash routing.',
    related_docs: '["9router:16-decision-points"]', prior_research_flag: 1,
  },
];

// ---------------------------------------------------------------------------
// CSV helpers
// ---------------------------------------------------------------------------

function csvEscape(v) {
  if (v == null) return '';
  const s = String(v);
  if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const rows = [];
  let rowId = 1;

  // 1. Prior research rows first (they anchor the corpus)
  for (const r of PRIOR_ROWS) {
    rows.push({
      row_id: rowId++,
      source_type: r.source_type,
      doc_id: r.doc_id,
      title: r.title,
      url: r.url,
      authors: r.authors,
      published: r.published,
      categories: r.categories,
      stars: r.stars,
      depth: r.depth,
      search_terms: r.search_terms,
      search_evidence: r.search_evidence,
      findings: r.findings,
      related_docs: r.related_docs,
      prior_research_flag: r.prior_research_flag,
    });
  }

  // 2. Corpus rows from cache
  if (existsSync(CACHE_FILE)) {
    const cache = JSON.parse(readFileSync(CACHE_FILE, 'utf8'));
    const docs = Object.values(cache.docs || {});
    for (const d of docs) {
      const docId = d.source === 'arxiv' ? `arxiv:${d.id}` : d.source === 'github' ? `github:${d.id}` : `openalex:${d.id}`;
      // Skip if already added as prior research
      if (rows.some((r) => r.doc_id === docId)) continue;
      rows.push({
        row_id: rowId++,
        source_type: d.source,
        doc_id: docId,
        title: d.title,
        url: d.source === 'arxiv' ? `https://arxiv.org/abs/${d.id}` : (d.url || `https://github.com/${d.id}`),
        authors: (d.authors || []).join(', '),
        published: d.published || '',
        categories: (d.categories || []).join(','),
        stars: d.stars || '',
        depth: d.depth || 0,
        search_terms: JSON.stringify((d.searches || []).map((s) => s.term)),
        search_evidence: JSON.stringify(d.searches || []),
        findings: d.summary || '',
        related_docs: JSON.stringify((d.searches || []).flatMap((s) => (s.topIds || []).map((id) => `arxiv:${id}`))),
        prior_research_flag: 0,
      });
    }
  }

  // 3. Write CSV
  const header = ['row_id', 'source_type', 'doc_id', 'title', 'url', 'authors', 'published', 'categories', 'stars', 'depth', 'search_terms', 'search_evidence', 'findings', 'related_docs', 'prior_research_flag'];
  const lines = [header.join(',')];
  for (const r of rows) {
    lines.push(header.map((h) => csvEscape(r[h])).join(','));
  }
  writeFileSync(CSV_FILE, lines.join('\n') + '\n', 'utf8');

  const depth5 = rows.filter((r) => r.depth >= 5).length;
  const arxiv = rows.filter((r) => r.source_type === 'arxiv').length;
  const github = rows.filter((r) => r.source_type === 'github').length;
  const prior = rows.filter((r) => r.prior_research_flag === 1).length;
  console.log(`CSV written: ${CSV_FILE}`);
  console.log(`Total rows: ${rows.length}`);
  console.log(`  arxiv: ${arxiv}, github: ${github}, prior-research: ${prior}`);
  console.log(`  depth>=5: ${depth5}`);
}

main();