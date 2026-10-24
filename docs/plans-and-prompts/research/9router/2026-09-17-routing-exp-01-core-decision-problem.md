# Routing Exponential Expansion R01 — The Core Decision Problem

**Date:** 2026-09-17
**Author:** GitHub Copilot agent (main session)
**Status:** active
**Tags:** #research #routing #exponential #core-decision #value #quality #cost #latency #reliability

## Objective

N-ary exponential expansion (6+ levels, N children per node) of the root phrase **"The core decision problem"** from `37-ai-model-routing-deep-research.md` §1.

## L1 — sub-phrases discovered in the root

1. What routers predict (win probability, task type, difficulty, correctness, performance score, nothing)
2. How routers learn (preference data, benchmark labels, self-verification, no learning)
3. What routers optimize (cost at fixed quality, quality at fixed cost, user-tunable tradeoff, reliability)
4. Value decomposition (quality, cost, latency, reliability, hard constraints)
5. Hard constraints (capability, context window, modality, locality, policy)

## L2 — expansion of each L1 node

### 1. What routers predict
- **1a. Win probability** — RouteLLM predicts P(strong model wins) per query. Codebase: none (external). Source: arXiv:2406.18665.
- **1b. Task type** — OpenRouter classifies ~30 task types; 9Router `classifyTask()` 9 types. Codebase: `open-sse/services/smartRouter.js` (missing from checkout, recovered from chat-log temp).
- **1c. Difficulty** — Hybrid LLM predicts query difficulty. Source: arXiv:2404.14618.
- **1d. Correctness** — AutoMix estimates correctness of a cheap model's answer. Source: arXiv:2310.12963.
- **1e. Performance score** — RouterBench KNN/MLP predict score_ij = λ·P_ij − cost_j. Source: arXiv:2403.12031.
- **1f. Nothing** — market share (OpenRouter), heuristics (coai, LiteLLM).

### 2. How routers learn
- **2a. Preference data** — RouteLLM 80k Chatbot Arena battles. Source: arXiv:2406.18665.
- **2b. Benchmark labels** — Shnitzer, RouterBench. Sources: arXiv:2309.15789, arXiv:2403.12031.
- **2c. Self-verification** — AutoMix few-shot self-verification. Source: arXiv:2310.12963.
- **2d. No learning** — OpenRouter spend share, coai priority/weight, LiteLLM strategies.

### 3. What routers optimize
- **3a. Cost at fixed quality** — RouteLLM α threshold. Source: arXiv:2406.18665.
- **3b. Quality at fixed cost** — RouterBench AIQ. Source: arXiv:2403.12031.
- **3c. User-tunable tradeoff** — Hybrid LLM quality level, ClawRouter profiles, 9Router `costQualityTradeoff` (default 5). Codebase: `open-sse/services/smartRouter.js`.
- **3d. Reliability** — LiteLLM cooldowns, 9Router fallback chains.

### 4. Value decomposition
- **4a. Quality** — task success, answer correctness.
- **4b. Cost** — per-request price, token cost.
- **4c. Latency** — time-to-first-token, total time.
- **4d. Reliability** — uptime, error rate, retry success.
- **4e. Tradeoff surface** — the c−q plane (RouterBench).

### 5. Hard constraints
- **5a. Capability** — tools, vision, audio, video (9Router `detectRequiredCapabilities`).
- **5b. Context window** — min(ctx/20000, 20) in 9Router scoring.
- **5c. Modality** — text, image, audio, video input/output.
- **5d. Locality** — data residency, EU-region filter (LiteLLM).
- **5e. Policy** — guardrails, allowlists, ZDR (OpenRouter).

## L3 — expansion of selected L2 nodes (variable branching)

### 1b → task type prediction
- **1b-i. OpenRouter ~30 types** — code:debugging, agent:multi_step_planning, qa_knowledge, math, customer_support, research_report.
- **1b-ii. 9Router 9 types** — code:generation, code:debugging, agent:multi_step, math, reasoning, research_report, creative_writing, summarization, translation, general_chat.
- **1b-iii. Task→model mapping** — each type has a preferred model class.
- **1b-iv. Classification cost** — lightweight classifier, ~ms.

### 1e → performance score
- **1e-i. λ (willingness to pay)** — user-tunable scalar.
- **1e-ii. P_ij (predicted quality)** — from KNN/MLP.
- **1e-iii. cost_j** — model price.
- **1e-iv. Score ranking** — sort by score, pick max.

### 3c → user-tunable tradeoff
- **3c-i. ClawRouter profiles** — free/auto/eco/premium.
- **3c-ii. 9Router costQualityTradeoff** — default 5, shifts ±(tradeoff−5)×5/×3.
- **3c-iii. Hybrid LLM quality level** — tunable at test time.
- **3c-iv. RouteLLM α** — strong-model-pct calibration.

### 5b → context window
- **5b-i. min(ctx/20000, 20)** — 9Router scoring formula.
- **5b-ii. Context-length bands** — vLLM SR signal.
- **5b-iii. Context overflow** — stripHistoryForContext drops middle 80%.
- **5b-iv. Context window filter** — LiteLLM model_prices_and_context_window.json.

## L4 — expansion of selected L3 nodes

### 1b-ii → 9Router task types
- **1b-ii-a. code:generation** — TASK_WEIGHTS tools-heavy.
- **1b-ii-b. code:debugging** — reasoning-heavy.
- **1b-ii-c. agent:multi_step** — tools + reasoning.
- **1b-ii-d. math** — reasoning-heavy.
- **1b-ii-e. reasoning** — reasoning-heavy.
- **1b-ii-f. research_report** — search + context.
- **1b-ii-g. creative_writing** — quality-heavy.
- **1b-ii-h. summarization** — context-heavy.
- **1b-ii-i. translation** — quality-heavy.
- **1b-ii-j. general_chat** — balanced.

### 3c-ii → costQualityTradeoff mechanics
- **3c-ii-a. Default 5** — neutral.
- **3c-ii-b. < 5 (cost-lean)** — shifts toward cheap models.
- **3c-ii-c. > 5 (quality-lean)** — shifts toward expensive models.
- **3c-ii-d. Shift formula** — ±(tradeoff−5)×5 for capability, ×3 for cost.
- **3c-ii-e. UI exposure** — dashboard setting.

### 5b-iii → context overflow handling
- **5b-iii-a. stripHistoryForContext** — drops middle of conversation.
- **5b-iii-b. 80% budget** — keeps 20% headroom.
- **5b-iii-c. chars/4 per token** — token estimate.
- **5b-iii-d. When triggered** — context window exceeded.

## L5 — expansion of selected L4 nodes

### 1b-ii-a → code:generation
- **1b-ii-a-1. Tools weight** — high (code execution).
- **1b-ii-a-2. Reasoning weight** — medium.
- **1b-ii-a-3. Preferred models** — code-tuned (Claude Code, Codex).
- **1b-ii-a-4. Fallback** — general models.

### 3c-ii-d → shift formula
- **3c-ii-d-1. Capability shift** — weight×10 base, ±(tradeoff−5)×5.
- **3c-ii-d-2. Cost shift** — ±(tradeoff−5)×3.
- **3c-ii-d-3. Net effect** — quality-lean boosts capability, cost-lean boosts cheap.

## L6 — expansion of selected L5 nodes

### 1b-ii-a-3 → preferred models
- **1b-ii-a-3-i. Claude Code** — claude-* models.
- **1b-ii-a-3-ii. Codex** — codex-* models.
- **1b-ii-a-3-iii. Copilot** — copilot-* models.
- **1b-ii-a-3-iv. Generic** — any model with tools.

## Confidence & open questions

- **High confidence:** all L1–L2 nodes (primary sources: arXiv papers, official docs, codebase mapping).
- **Medium:** L3–L4 nodes on 9Router internals (smartRouter.js missing from checkout — recovered from chat-log temp).
- **Open questions:**
  - Does 9Router's usageDb contain enough outcome signal (per-request quality) to train a RouteLLM-style router?
  - What is the actual judge in OpenRouter's classifier, and how is it evaluated?
  - RouterBench's cascading result suggests 9Router's fusion panel is a cascade variant — could the judge error be measured?

## Sources

- arXiv:2406.18665 (RouteLLM), arXiv:2403.12031 (RouterBench), arXiv:2309.15789 (Shnitzer), arXiv:2308.11601 (Tryage), arXiv:2310.12963 (AutoMix), arXiv:2305.05176 (FrugalGPT), arXiv:2404.14618 (Hybrid LLM)
- `open-sse/services/smartRouter.js` (missing from checkout; recovered from `docs/plans-and-prompts/temp/chat-logs/d4294fc8-49e9-46b3-95f5-3b1625d0acb2.md`)
- `docs/plans-and-prompts/research/9router/37-ai-model-routing-deep-research.md` §1