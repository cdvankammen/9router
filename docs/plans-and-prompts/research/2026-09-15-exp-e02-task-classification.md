# Exponential Expansion E02 — Smart Router Task Classification

**Date:** 2026-09-15
**Root phrase:** "Smart router task classification (`open-sse/services/smartRouter.js`)" — from `2026-08-31-message-origin-and-destination-research.md` §A.2
**Format:** 6+ levels, variable branching
**Status:** complete

## L1 — sub-phrases discovered in the root

1. `classifyTask(messages)` — keyword/regex heuristics
2. 16 task types
3. `scoreModel(provider, modelId, taskType, costQualityTradeoff)`
4. `selectModels(candidates, maxCandidates)`
5. `getStickySession` / `setStickySession` / `conversationFingerprint`
6. FNV-1a fingerprint
7. 5-min TTL, max 500 entries, in-memory Map
8. App-layer wrapper `src/sse/services/smartRouter.js`
9. Virtual provider model strings (`auto`, `best-code`, `best-chat`, `best-reasoning`, `best-cheap`)
10. Pre-combo interception (avoids double-translation flaw)
11. `meta.taskType` threading to usage analytics

## L2 — expansion of each L1 node

### 1. classifyTask(messages)
- **1a. Input** — messages array; scans the **last user message**.
- **1b. Content forms** — string or content array (multi-part).
- **1c. Heuristic style** — keyword/regex matching, not ML.
- **1d. Output** — one of 16 task types; `general_chat` fallback.

### 2. 16 task types
- **2a. Code types** — `code:debugging`, `code:review`, `code:generation`.
- **2b. Agent type** — `agent:multi_step`.
- **2c. Cognitive types** — `math`, `reasoning`, `research_report`, `creative_writing`, `summarization`, `translation`, `data_analysis`, `document_processing`, `image_analysis`, `web_search`, `planning`.
- **2d. Fallback** — `general_chat`.

### 3. scoreModel
- **3a. Signature** — `(provider, modelId, taskType, costQualityTradeoff)`.
- **3b. Name-based heuristics** — engine layer has no DB access.
- **3c. App-layer capability data** — `getCapabilitiesForModel` applied in `src/sse/services/smartRouter.js`.
- **3d. Cost-quality tradeoff** — a parameter that biases scoring.

### 4. selectModels
- **4a. Top-N selection** — returns the best N candidates.
- **4b. Input** — candidates array + maxCandidates.
- **4c. Ordering** — by score descending.

### 5. Sticky sessions
- **5a. getStickySession** — returns a previously pinned model for a conversation.
- **5b. setStickySession** — pins a model to a conversation.
- **5c. conversationFingerprint** — FNV-1a of first system/user messages.

### 6. FNV-1a fingerprint
- **6a. Algorithm** — 32-bit FNV-1a hash.
- **6b. Use** — conversation identity without storing messages.
- **6c. Collision risk** — 32-bit; acceptable for local scale.

### 7. TTL/entries
- **7a. 5-min TTL** — sessions expire after 5 minutes.
- **7b. Max 500 entries** — bounded memory.
- **7c. In-memory Map** — no persistence; lost on restart.

### 8. App-layer wrapper
- **8a. Location** — `src/sse/services/smartRouter.js`.
- **8b. Role** — resolves virtual provider model strings into real candidates.
- **8c. Capability data** — applies `getCapabilitiesForModel`.

### 9. Virtual provider model strings
- **9a. `auto`** — default; picks best overall.
- **9b. `best-code`** — best for code tasks.
- **9c. `best-chat`** — best for chat.
- **9d. `best-reasoning`** — best for reasoning.
- **9e. `best-cheap`** — cheapest adequate.

### 10. Pre-combo interception
- **10a. Timing** — runs BEFORE translation in `handleChat`.
- **10b. Why** — avoids double-translation flaw (translate once, not per candidate).
- **10c. Result** — a resolved candidate list feeds the combo engine.

### 11. meta.taskType threading
- **11a. Location** — `src/sse/handlers/chat.js` line 57, 102–103.
- **11b. Usage analytics** — `RequestDetailsTab.js` shows task type.
- **11c. Value** — per-task-type usage breakdown.

## L3 — expansion of selected L2 nodes

### 2a → code types
- **2a-i. code:debugging** — keywords: "debug", "fix", "error", "exception", "stack trace".
- **2a-ii. code:review** — keywords: "review", "critique", "audit".
- **2a-iii. code:generation** — keywords: "write", "implement", "create", "function".

### 2c → cognitive types
- **2c-i. math** — "calculate", "solve", "equation".
- **2c-ii. reasoning** — "why", "explain", "reason".
- **2c-iii. research_report** — "research", "report", "summarize sources".
- **2c-iv. creative_writing** — "write a story", "poem", "essay".
- **2c-v. summarization** — "summarize", "tl;dr", "condense".
- **2c-vi. translation** — "translate", "in French", "日本語で".
- **2c-vii. data_analysis** — "analyze data", "chart", "statistics".
- **2c-viii. document_processing** — "parse", "extract from", "OCR".
- **2c-ix. image_analysis** — "describe this image", "what's in the picture".
- **2c-x. web_search** — "search", "find online", "look up".
- **2c-xi. planning** — "plan", "roadmap", "steps".

### 3b → name-based heuristics
- **3b-i. Model name tokens** — "opus" → reasoning; "sonnet" → balanced; "haiku" → fast.
- **3b-ii. Provider reputation** — anthropic → reasoning; openai → general.
- **3b-iii. Size hints** — "mini", "small" → cheap; "large" → capable.

### 5c → conversationFingerprint
- **5c-i. Input** — first system + user messages.
- **5c-ii. Stability** — same conversation → same fingerprint.
- **5c-iii. Privacy** — hash only; messages not stored.

### 9 → virtual provider model strings
- **9a-i. auto resolution** — score all candidates, pick top.
- **9b-i. best-code resolution** — filter by code task types, score.
- **9c-i. best-chat resolution** — filter by chat, score.
- **9d-i. best-reasoning resolution** — filter by reasoning, score.
- **9e-i. best-cheap resolution** — filter by cost, score.

## L4 — expansion of selected L3 nodes

### 2a-i → code:debugging keywords
- **2a-i-a. "debug"** — common in agent prompts.
- **2a-i-b. "fix"** — ambiguous (could be generation); context matters.
- **2a-i-c. "error"/"exception"** — strong signal.
- **2a-i-d. "stack trace"** — very strong signal.

### 3b-i → model name tokens
- **3b-i-a. "opus"** — Anthropic's largest; reasoning-heavy.
- **3b-i-b. "sonnet"** — balanced.
- **3b-i-c. "haiku"** — fast/cheap.
- **3b-i-d. "gpt"** — OpenAI general.
- **3b-i-e. "claude"** — Anthropic family.
- **3b-i-f. "gemini"** — Google family.
- **3b-i-g. "qwen"** — Alibaba family (relevant to model groups).

### 9a-i → auto resolution
- **9a-i-a. Score all** — every candidate scored for the task.
- **9a-i-b. Pick top** — highest score wins.
- **9a-i-c. Tie-break** — cost or provider preference.

## L5 — expansion of selected L4 nodes

### 2a-i-b → "fix" ambiguity
- **2a-i-b-1. Context window** — "fix this bug" → debugging; "fix the formatting" → generation.
- **2a-i-b-2. Multi-keyword** — "fix" + "error" → debugging.
- **2a-i-b-3. Fallback** — ambiguous → general_chat or code:generation.

### 3b-i-g → qwen family
- **3b-i-g-1. qwen-max** — largest.
- **3b-i-g-2. qwen-plus** — mid.
- **3b-i-g-3. qwen-turbo** — fast.
- **3b-i-g-4. qwen-coder** — code-specialized.
- **3b-i-g-5. Grouping** — all share provider endpoint limits (see E23).

## L6 — expansion of selected L5 nodes

### 2a-i-b-1 → context window for "fix"
- **2a-i-b-1-1. Preceding messages** — if prior messages mention errors, debugging.
- **2a-i-b-1-2. Code snippets** — presence of code blocks → debugging/generation.
- **2a-i-b-1-3. Task-type persistence** — sticky session keeps task type across turns.

### 3b-i-g-5 → qwen grouping
- **3b-i-g-5-1. Shared upstream key** — one API key for all qwen models.
- **3b-i-g-5-2. Shared rate limit** — upstream enforces per-key RPM/TPM across models.
- **3b-i-g-5-3. Group cap** — 9router must cap the group, not per-model.
- **3b-i-g-5-4. Pacing** — interval pacing when group budget exhausted (see E23).

## Confidence & open questions

- **Confidence: high** — codebase read directly (`open-sse/services/smartRouter.js`, `src/sse/services/smartRouter.js`, `src/sse/handlers/chat.js`).
- **Open:** should task classification move from regex to embeddings?
- **Open:** should task types be user-extensible?
- **Open:** should sticky sessions persist across restarts?

## Sources

- `open-sse/services/smartRouter.js` (read directly)
- `src/sse/services/smartRouter.js` (read directly)
- `src/sse/handlers/chat.js` lines 57, 102–103 (read directly)
- `docs/plans-and-prompts/research/2026-08-31-message-origin-and-destination-research.md` §A.2