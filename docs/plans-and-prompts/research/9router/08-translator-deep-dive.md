# 9router Translator Engine Deep Dive
## `open-sse/translator/` — Line-by-Line Analysis

**Date:** 2026-08-05
**Scope:** 48 files covering the full format translation layer between AI providers
**Author:** Exploration agent (GitHub Copilot, Qwen 3.7 Max Thinking)

---

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Registration System](#registration-system)
3. [Format Detection](#format-detection)
4. [Schema Constants Reference](#schema-constants-reference)
5. [Concerns (14 modules)](#concerns-modules)
6. [Format Helpers (5 modules)](#format-helpers)
7. [Request Translators (12 modules)](#request-translators)
8. [Response Translators (10 modules)](#response-translators)
9. [Complete Registered Route Table](#complete-registered-route-table)
10. [Cross-Reference Map](#cross-reference-map)

---

## Architecture Overview

The translator is the **provider-agnostic routing/translation engine** that pivots requests and responses between wire formats. The design principle:

> **OpenAI chat completions is the hub format.** Every non-OpenAI provider has a translator pair `X:openai` (inbound) and `openai:X` (outbound). Most translations route `source → openai → target` through a double-hop. **Direct routes** (e.g. `claude:kiro`, `kiro:claude`) bypass the hub when the double-hop would lose fidelity (thinking blocks, tool ids, non-base64 images, `is_error` flags).



│ Claude SSE   │           │ Kiro AWS ES  │
│ (Messages)   │─────┬────▶│ CodeWhisperer│

                     │ direct claude:kiro

│ OpenAI Chat  │◀────┴────▶│ Gemini       │
│ (hub format) │           │ (contents[]) │

        │ hub                     │ hub

│ Ollama       │           │ Antigravity  │
│ Cursor       │           │ Gemini CLI   │
│ CommandCode  │           │ Vertex AI    │
│ Responses    │           │              │



### Request Lifecycle
1. `src/app/api/v1/*` route parses inbound request
2. `src/sse/handlers/chat.js` picks provider via combo/account fallback
3. `open-sse/handlers/chatCore.js` calls `translateRequest(sourceFormat, targetFormat, ...)`
4. Translator picks `source:target` direct route OR pivots through OpenAI
5. Post-translation hooks: `applyThinking`, `filterToOpenAIFormat`, `prepareClaudeRequest`, `cloakClaudeTools`
6. Executor dispatches upstream
7. Streaming chunks flow back through `translateResponse(targetFormat, sourceFormat, ...)`

### Design Principles
- **Self-registration** via ES module side-effect imports (`import "./request/X.js"` at bottom of `index.js`)
- **Config-driven** — capabilities, thinking ranges, model quirks come from `providers/capabilities.js` + `config/providerModels.js`, never hardcoded per-model in translators
- **Fail-soft** — RTK pre-translate hooks, unknown tool types, malformed JSON all fall through cleanly
- **Lossless for fragile pairs** — direct routes exist when the OpenAI hub would drop information

---

## Registration System

**File:** `open-sse/translator/index.js`

### Core Registries
```js
var requestRegistry;   // Map<"from:to", fn(model, body, stream, credentials) => body>
var responseRegistry;  // Map<"from:to", fn(chunk, state) => chunk|chunk[]|null>


Declared as `var` (not `let`) so they're hoisted as `undefined` during circular imports. `??=` initializes them lazily on first `register()` call.

### `register(from, to, requestFn, responseFn)`
Adds translator functions to the appropriate registry under the key `${from}:${to}`. Either `requestFn` or `responseFn` can be `null` if only one direction is supported.

### Side-Effect Static Imports (bottom of `index.js`)
Each translator file calls `register()` at module load. The static imports at the bottom of `index.js` are the **single authoritative list** of which translators exist:

**Request translators registered:**
- `claude-to-openai.js`, `openai-to-claude.js`
- `gemini-to-openai.js`, `openai-to-gemini.js`
- `openai-to-vertex.js`
- `antigravity-to-openai.js`
- `openai-responses.js` (bidirectional)
- `openai-to-kiro.js`, `claude-to-kiro.js`
- `openai-to-cursor.js`
- `openai-to-ollama.js`
- `openai-to-commandcode.js`

**Response translators registered:**
- `claude-to-openai.js`, `openai-to-claude.js`
- `gemini-to-openai.js` (also covers `gemini-cli`, `antigravity`, `vertex`)
- `openai-to-antigravity.js`
- `openai-responses.js` (bidirectional)
- `kiro-to-openai.js`, `kiro-to-claude.js`
- `cursor-to-openai.js`
- `ollama-to-openai.js`
- `commandcode-to-openai.js`

### `translateRequest(sourceFormat, targetFormat, model, body, stream, credentials, provider, reqLogger, stripList, connectionId, clientTool)`

Pipeline:
1. **`stripContentTypes`** — opt-in via `strip[]` in PROVIDER_MODELS (image/audio blocks)
2. **`normalizeThinkingConfig`** — remove thinking if lastMessage isn't user
3. **`ensureToolCallIds`** — fix missing/malformed tool IDs
4. **`fixMissingToolResponses`** — insert empty tool responses (skipped for Kiro; Kiro has stricter source-aware reconciliation)
5. **`captureThinking`** — snapshot thinking intent BEFORE format translation
6. **`captureSessionId`** — snapshot session ID from envelope (e.g. antigravity `request.sessionId`)
7. **Translation dispatch:**
   - Same format → skip
   - Direct route exists → use it (`claude:kiro`, `kiro:claude`, `openai:openai-responses`)
   - Otherwise: `source → openai → target` double-hop, with `reqLogger.logOpenAIRequest()` on the intermediate
8. **`applyThinking`** — re-apply in provider-native format (unless Kiro translator already mapped it)
9. **`filterToOpenAIFormat`** — normalize to clean OpenAI shape when target is OpenAI
10. **`prepareClaudeRequest`** — final Claude-specific prep (cache_control, tool_use ordering, cloaking)
11. **`cloakClaudeTools`** — rename client tools with `_cc` suffix for OAuth (anti-ban)

### `translateResponse(targetFormat, sourceFormat, chunk, state)`

Pipeline:
1. Same format → return chunk as-is
2. Direct route (`kiro:claude`, `openai:openai-responses`) → use it
3. Otherwise: `target → openai → source` double-hop
4. Attaches `_openaiIntermediate` for logging when both sides are non-OpenAI

### `needsTranslation(sourceFormat, targetFormat)`
Simple `!==` check.

### `initState(sourceFormat)`
Initializes streaming state. Base state:
```js
{ messageId, model, textBlockStarted, thinkingBlockStarted, inThinkingBlock,
  currentBlockIndex, toolCalls: Map, finishReason, finishReasonSent, usage,
  contentBlockIndex }


**`openai-responses`** adds 25+ fields: `seq`, `responseId`, `started`, `msgTextBuf`, `msgItemAdded`, `msgContentAdded`, `msgItemDone`, `reasoningId`, `reasoningIndex`, `reasoningBuf`, `reasoningPartAdded`, `reasoningDone`, `inThinking`, `funcArgsBuf`, `funcNames`, `funcCallIds`, `funcItemAdded`, `funcArgsDone`, `funcItemDone`, `customToolNames: Set`, `completedSent`.

### `initTranslators()` / `ensureInitialized()`
No-ops kept for backward compatibility; ESM static imports already registered everything at module load.

---

## Format Detection

**File:** `open-sse/translator/formats.js`

### `FORMATS` Enum
```js
{
  OPENAI: "openai",
  OPENAI_RESPONSES: "openai-responses",
  OPENAI_RESPONSE: "openai-response",
  CLAUDE: "claude",
  GEMINI: "gemini",
  GEMINI_CLI: "gemini-cli",
  VERTEX: "vertex",
  CODEX: "codex",
  ANTIGRAVITY: "antigravity",
  KIRO: "kiro",
  CURSOR: "cursor",
  OLLAMA: "ollama",
  COMMANDCODE: "commandcode"
}


### `detectFormatByEndpoint(pathname, body)`
URL-based detection takes priority over body-based:
- `/v1/responses` → `openai-responses`
- `/v1/messages` → `claude`
- `/v1/chat/completions` + `body.input[]` (Cursor CLI sends Responses body via chat endpoint) → `openai`
- Otherwise → `null` (fall back to body-based detection in handler)

---

## Schema Constants Reference

### `schema/index.js` — Barrel
Pure re-exports of roles, blocks, finish reasons, defaults. No logic.

### `schema/roles.js`
```js
ROLE = { USER, ASSISTANT, TOOL, SYSTEM, DEVELOPER }
GEMINI_ROLE = { USER, MODEL }  // Gemini uses "model" instead of "assistant"


### `schema/blocks.js`
```js
OPENAI_BLOCK = { TEXT, IMAGE_URL, IMAGE, INPUT_AUDIO, AUDIO_URL, FILE, FUNCTION }
CLAUDE_BLOCK = { TEXT, IMAGE, DOCUMENT, TOOL_USE, TOOL_RESULT, THINKING, REDACTED_THINKING }
RESPONSES_ITEM = { MESSAGE, FUNCTION_CALL, FUNCTION_CALL_OUTPUT, CUSTOM_TOOL_CALL,
                   CUSTOM_TOOL_CALL_OUTPUT, ADDITIONAL_TOOLS, REASONING, OUTPUT_TEXT,
                   INPUT_TEXT, INPUT_IMAGE, SUMMARY_TEXT }
VALID_OPENAI_CONTENT_TYPES = [text, image_url, image, input_audio, audio_url, file]
VALID_OPENAI_MESSAGE_TYPES = [text, image_url, image, "tool_calls", "tool_result"]


### `schema/finishReasons.js`
```js
OPENAI_FINISH = { STOP, LENGTH, TOOL_CALLS, CONTENT_FILTER }
CLAUDE_STOP = { END_TURN, MAX_TOKENS, TOOL_USE, STOP_SEQUENCE }
GEMINI_FINISH = { STOP, MAX_TOKENS, SAFETY, RECITATION, BLOCKLIST, PROHIBITED_CONTENT }


### `schema/defaults.js`
```js
MODEL_FALLBACK = "unknown"        // when upstream chunk omits model
DEFAULT_IMAGE_MIME = "image/png"  // when base64 blob has no declared type


---

## Concerns Modules

### `concerns/thinkingUnified.js` — Unified Thinking Normalization
**Exports:**
- `stripThinkingSuffix(model)` — `"model(value)" → "model"`
- `parseSuffix(model)` — returns `{ cleanModel, override }` where override is `{ mode: "none"|"auto"|"level"|"budget", ... }`
- `extractThinking(body)` / `captureThinking(body)` — unified `{ mode, budget?, level? }` extraction across Claude/OpenAI/Gemini/Qwen shapes
- `applyThinking(targetFormat, model, body, provider, intent)` — main entry; normalizes thinking to provider-native format

**FORMAT_TO_NATIVE map:**
| Wire format | Native thinking format |
|---|---|
| openai / openai-responses / codex | `openai` |
| claude | `claude-budget` |
| gemini / gemini-cli / vertex / antigravity | `gemini-budget` |
| kiro | `kiro` |

**`applyFormat` handles 16 provider-native formats:**
- `openai` → `reasoning_effort`
- `claude-adaptive` → `thinking: { type: "adaptive" }` + `output_config.effort`
- `claude-budget` → `thinking: { type: "enabled", budget_tokens }`
- `gemini-level` → `generationConfig.thinkingConfig.thinkingLevel`
- `gemini-budget` → `generationConfig.thinkingConfig.thinkingBudget`
- `zai`, `qwen` → `enable_thinking` + `thinking_budget`
- `deepseek`, `kimi`, `minimax`, `hunyuan`, `step`, `tokenrouter` → various
- `kiro` → no body field (handled via system-tag injection in openai-to-kiro)

**Special cases:**
- Models that can't disable thinking get `mode: "none"` clamped to `level: "minimal"`
- `maxOutput` floor raised for high-effort Gemini thinking
- Gemini/antigravity envelope handled: `body.request.generationConfig` vs top-level
- `claude-adaptive` sends BOTH `thinking: { type: "adaptive" }` AND `output_config.effort` (Anthropic requires explicit thinking flag on Opus 4.6+/Sonnet 4.6)
- `tokenrouter` rejects `none`/`auto` with 400 → omit the field
- `kiro` translator maps thinking itself → `applyThinking` no-ops for kiro

### `concerns/thinking.js` — Level↔Budget Maps
**Exports:**
- `EFFORT_LEVELS` = `["minimal","low","medium","high","xhigh","max"]`
- `LEVEL_TO_BUDGET` = `{ none:0, minimal:512, low:1024, medium:8192, high:24576, xhigh:32768, max:128000 }`
- `effortToBudget(effort)` → number
- `effortToThinkingLevel(effort)` → gemini-3 enum (minimal|low|medium|high)
- `budgetToLevel(budget)` → nearest discrete level
- `budgetToEffort(budget)` → Gemini→OpenAI reverse map

### `concerns/modality.js` — Strip Unsupported Modalities
**Exports:**
- `stripUnsupportedModalities(body, sourceFormat, caps)` → boolean

Strips `image_url`, `image`, `input_audio`, `audio_url`, `file` blocks from messages when model caps `vision/audioInput/pdf === false`. Injects explanatory placeholders:
- Current turn: `"[image omitted: model has no vision support]"`
- Previous turns: `"[Previous image omitted from context.]"`

Handles all 13 source formats (OpenAI, Claude, Responses, Gemini, Antigravity, Ollama, Kiro, Cursor, CommandCode).

### `concerns/prefetch.js` — Remote Image Prefetching
**Exports:**
- `prefetchRemoteImages(body, sourceFormat, targetFormat, options)` → Promise<count>

For targets that require inline base64 (Gemini, Gemini CLI, Vertex, Antigravity, Ollama, Kiro): fetches remote `http(s)://` URLs via `fetchImageAsBase64` and rewrites them to data URIs. No-op for OpenAI/Claude targets (they accept URLs natively).

### `concerns/image.js` — Image Helpers
**Exports:**
- `encodeDataUri(mimeType, base64)` → `"data:...;base64,..."`
- `parseDataUri(url)` → `{ mimeType, base64 } | null`
- `fetchImageAsBase64(imageUrl, options)` → Promise<{url, mimeType}|null>

**SSRF hardened:**
- `isPrivateIp(ip)` — rejects loopback, RFC1918, link-local, CGNAT, IPv6 ULA
- `resolvePinnedIps(hostname)` — DNS lookup rejects if any record is private
- Pins connect IP to prevent DNS rebinding (TOCTOU)
- `redirect: "manual"` prevents public→private redirect bypass
- Hard byte cap (`MAX_IMAGE_BYTES` from `config/mediaConfig.js`)
- Magic-byte verification (`IMAGE_SIGNATURES`) rejects disguised non-images
- `BLOCKED_HOSTS` from config

### `concerns/toolCall.js` — Tool Call Normalization
**Exports:**
- `fallbackToolCallId(index)` — `call_${Date.now()}` or `call_${index}_${Date.now()}`
- `generateToolCallId(msgIndex, tcIndex, toolName)` — deterministic `call_msg${i}_tc${j}_${name}`
- `ensureToolCallIds(body)` — sanitizes all tool IDs to Anthropic pattern `^[a-zA-Z0-9_-]+$`, stringifies `arguments` objects, handles OpenAI + Claude formats
- `getToolCallIds(msg)` — extracts IDs from assistant message (OpenAI or Claude shape)
- `hasToolResults(msg, toolCallIds)` — checks user/tool message for responses
- `fixMissingToolResponses(body)` — inserts empty `role:"tool"` messages for orphan tool_calls

### `concerns/message.js` — Message Helpers
**Exports:**
- `collapseTextParts(parts)` — lone text part becomes plain string; otherwise returns array

### `concerns/finishReason.js` — Finish Reason Mapping
**Exports:**
- `toOpenAIFinish(reason, format)` — upstream → OpenAI (claude, commandcode, gemini, kiro, ollama, default)
- `fromOpenAIFinish(reason, format)` — OpenAI → upstream (only claude implemented; others pass through)

**Mappings:**
| Upstream | OpenAI |
|---|---|
| `end_turn` / `stop_sequence` (claude) | `stop` |
| `max_tokens` (claude) | `length` |
| `tool_use` (claude) | `tool_calls` |
| `STOP` (gemini) | `stop` |
| `MAX_TOKENS` (gemini) | `length` |
| `SAFETY` / `RECITATION` / `BLOCKLIST` / `PROHIBITED_CONTENT` | `content_filter` |
| `tool-calls` / `tool_use` (commandcode) | `tool_calls` |

### `concerns/reasoning.js` — Reasoning Content
**Exports:**
- `reasoningDelta(text, withRole)` — builds OpenAI delta with `reasoning_content`
- `extractReasoningText(delta)` — extracts from vendor shapes: `reasoning_content`, `reasoning`, `reasoning_details[].text|content`

Handles GLM, Qwen, DeepSeek, Kimi, Step, Hunyuan, MiniMax (reasoning_details with `reasoning_split=true`).

### `concerns/json.js`
**Exports:**
- `safeParseJSON(str, fallback)` — non-string passthrough; parse error returns fallback

### `concerns/chunk.js`
**Exports:**
- `buildChunk({ id, created, model }, delta, finishReason)` — builds `chat.completion.chunk` with `object: "chat.completion.chunk"`, `choices: [{ index: 0, delta, finish_reason }]`

### `concerns/paramSupport.js` — Parameter Stripping
**Exports:**
- `stripUnsupportedParams(provider, model, body)` — removes params that cause upstream 400s

**Rules:**
- All Claude models: drop `temperature` (deprecated upstream)
- GitHub `gpt-5.4`: drop `temperature`
- GitHub Claude (except opus/sonnet 4.6): drop `thinking`, `reasoning_effort`
- `cloudflare-ai`: flatten content arrays to plain strings
- `volcengine-ark` GLM-5: clamp max_tokens to model ceiling
- `volcengine-ark` Kimi: clamp to 32768 (API hard cap below advertised ceiling)

### `concerns/usage.js` — Usage Extraction
**Exports:**
- `buildUsage({ promptTokens, completionTokens, totalTokens, cachedTokens, cacheCreationTokens, reasoningTokens })` — builds OpenAI usage object
- `toOpenAIUsage(raw, kind)` — converts provider-native usage to OpenAI format

**Per-provider extractors:**
- **claude:** folds `cache_read_input_tokens` + `cache_creation_input_tokens` into prompt_tokens
- **gemini:** derives `candidatesTokenCount` from total when omitted; `thoughtsTokenCount` → reasoning_tokens
- **kiro:** pass-through cache fields if they grow
- **ollama:** `prompt_eval_count` + `eval_count`
- **commandcode:** `inputTokens` + `outputTokens`

### `concerns/kiroConversation.js` — Kiro Conversation Canonicalizer
**Exports:**
- `normalizeKiroToolSpecs(tools)` — `{ specs, nameMap }`: OpenAI/Claude tool defs → Kiro `toolSpecification` with name/description truncation, schema cleaning, unique name enforcement
- `validateKiroConversation(history, currentMessage, toolSpecs)` — returns `{ valid, errors }` without mutation
- `canonicalizeKiroConversation({ history, currentMessage, modelId, toolSpecs, nameMap })` — produces strict Kiro conversation with alternating turns, one-to-one tool pairs

**Kiro constraints enforced:**
- Alternating user/assistant turns (merges consecutive same-role)
- Adjacent one-to-one tool use/result pairs (repairs partial parallel calls)
- Tool specs only on currentMessage
- Tool ID uniqueness (truncated to `KIRO_TOOL_ID_MAX_LENGTH`)
- Tool name uniqueness (truncated to `KIRO_TOOL_NAME_MAX_LENGTH`)
- Tool description truncation (`KIRO_TOOL_DESCRIPTION_MAX_LENGTH`)
- Schema cleaning: strips `additionalProperties`, empty `required`, recursive cleaning
- Fallback: if validation fails after canonicalization, flattens ALL structured tools to text

**Repair counters:** `missingResults`, `orphanResults`, `invalidToolUses`

---

## Format Helpers

### `formats/claude.js`
**Exports:**
- `hasValidContent(msg)` — checks for non-empty content
- `fixToolUseOrdering(messages)` — removes text after tool_use in assistant messages; merges consecutive same-role
- `normalizeClaudePassthrough(body, model)` — downgrades adaptive thinking for Haiku, hoists mid-conversation system messages, strips foreign thinking signatures
- `prepareClaudeRequest(body, provider, apiKey, connectionId, rawHeaders, sessionId)` — final Claude endpoint prep

**`prepareClaudeRequest` does:**
1. Drops `output_config` for MiniMax quirk
2. Clamps `max_tokens` to model ceiling; reconciles with `thinking.budget_tokens`
3. System: removes all `cache_control`, adds `{ type: "ephemeral", ttl: "1h" }` to last block
4. Messages: 3-pass processing
   - Pass 1: remove `cache_control`, filter empty messages (keeps final assistant even if empty)
   - Pass 1.5: `fixToolUseOrdering`
   - Pass 2 (reverse): adds `cache_control: { type: "ephemeral" }` to last non-thinking block of last assistant; validates/replaces thinking signatures
5. Tools: strips built-in tools for non-Anthropic providers; normalizes to Anthropic shape; adds cache_control to last tool
6. Cloaking: `applyCloaking` for Anthropic endpoints with session ID

**Thinking signature handling:**
- Claude native: preserve valid signatures, drop invalid
- Anthropic-compatible: replace with `DEFAULT_THINKING_CLAUDE_SIGNATURE`
- DeepSeek: keep existing as-is, add unsigned placeholder if missing
- If thinking enabled + tool_use but no thinking block → prepend placeholder

### `formats/gemini.js`
**Exports:**
- `UNSUPPORTED_SCHEMA_CONSTRAINTS` — 40+ JSON Schema keywords Gemini rejects
- `DEFAULT_SAFETY_SETTINGS` — all 5 harm categories set to `OFF`
- `convertOpenAIContentToParts(content)` — OpenAI blocks → Gemini parts (text, inlineData for base64 images/audio, fileData for URLs)
- `extractTextContent(content, separator)` — joins text parts
- `tryParseJSON(str)` — alias of `safeParseJSON(str, null)`
- `generateRequestId()` — `agent-${uuid}`
- `generateSessionId()` — UUID + timestamp
- `generateProjectId()` — `adj-noun-xxxxx`
- `cleanJSONSchemaForAntigravity(schema)` — 5-phase schema cleaning:
  1. Convert `const` → `enum`, enum values → strings
  2. Flatten `allOf`, `anyOf`, `oneOf`, type arrays
  2.5. Infer `type: "object"` when properties exist
  3. Remove all unsupported keywords recursively (including `x-` vendor extensions)
  4. Clean up required fields
  5. Add placeholder `reason` field for empty object schemas

### `formats/openai.js`
**Exports:**
- `filterToOpenAIFormat(body, opts)` — normalizes messages and tools to clean OpenAI shape

**Does:**
- Normalizes `developer` role → `system`
- Strips thinking/redacted_thinking blocks, `signature`, non-standard fields
- Converts Claude tools `{ name, input_schema }` → `{ type: "function", function: { ... } }`
- Converts Gemini tools `functionDeclarations[]` → OpenAI format
- Normalizes `tool_choice` (Claude `any` → `required`, `tool` → `{ type: "function", function: { name } }`)
- Removes empty `tools` array
- Preserves `cache_control` if `opts.preserveCacheControl` (DashScope/alicode)

### `formats/responsesApi.js`
**Exports:**
- `normalizeResponsesInput(input)` — string → array of message items; empty array → placeholder
- `convertResponsesApiFormat(body)` — Responses API `{ input, instructions }` → Chat Completions `{ messages }`

**Item type handling:**
- `message` → regular message (input_text/output_text → text, input_image → image_url)
- `function_call` → assistant with tool_calls (skips nameless)
- `function_call_output` → role:tool message
- `reasoning` → skipped (display only)

### `formats/maxTokens.js`
**Exports:**
- `adjustMaxTokens(body, ceiling)` — adjusts based on tool presence, thinking budget, ceiling

**Rules:**
- Auto-increase to `DEFAULT_MIN_TOKENS` when tools present (prevent truncated args)
- Ensure `max_tokens > thinking.budget_tokens` (Claude requirement)
- Never exceed ceiling

---

## Request Translators

### `request/openai-to-claude.js` — OpenAI → Claude
**Route:** `openai:claude`

**Key transformation:**
- `model`, `max_tokens` (model-aware ceiling), `temperature`, `stream`
- `messages[].system` → `system[]` with Claude Code prompt prepended + cache_control
- Tool result blocks forced into separate user messages (Claude requirement)
- Consecutive same-role messages merged
- `cache_control: { type: "ephemeral" }` on last assistant block
- Image URL (data URI or http) → `{ type: "image", source: { type: "base64"|"url" } }`
- File block (PDF only) → `{ type: "document", source: { type: "base64" } }`
- `response_format.json_schema` → system prompt injection
- `response_format.json_object` → "respond with valid JSON" system prompt
- Tool name prefix `CLAUDE_OAUTH_TOOL_PREFIX` (currently empty string — was `"proxy_"`)
- Tool name map stored on body as `_toolNameMap` for response reverse-mapping
- `tool_choice` converted: `"required"` → `{ type: "any" }`, `{ function: { name } }` → `{ type: "tool", name }`
- `tool_choice` types not in `{ auto, any, tool, none }` → forced to `{ type: "auto" }`

**Exports:**
- `openaiToClaudeRequest(model, body, stream)`
- `openaiToClaudeRequestForAntigravity(model, body, stream)` — variant that strips Claude Code system prompt and tool prefixes

### `request/claude-to-openai.js` — Claude → OpenAI
**Route:** `claude:openai`

**Key transformation:**
- Strips `x-anthropic-billing-header:` from system text
- Mid-conversation `system` messages → `user` wrapped in `<instructions>` tags
- `tool_use` blocks → `tool_calls` array
- `tool_result` blocks → separate `role: "tool"` messages
- `image` (base64) → `image_url` with data URI
- Claude tools `{ name, input_schema }` → `{ type: "function", function: { name, parameters } }`
- `tool_choice.any` → `"required"`, `tool_choice.tool` → `{ type: "function", function: { name } }`
- `reasoning_effort` / `reasoning.effort` → OpenAI `reasoning_effort`
- Local `fixMissingToolResponsesOpenAI`: inserts `[No response received]` for contiguous tool replies without responses

### `request/claude-to-kiro.js` — Claude → Kiro (DIRECT route)
**Route:** `claude:kiro` (bypasses OpenAI pivot)

**Key transformation:**
- Resolves model intent (`-agentic` suffix, thinking override)
- Converts Claude messages → Kiro `userInputMessage` / `assistantResponseMessage` history
- `normalizeKiroToolSpecs` for tool declarations
- Session replay via `applyKiroSessionReplay`
- `canonicalizeKiroConversation` for strict Kiro conversation shape
- ProfileArn resolution: api_key/idc/external_idp → account-bound (no default); OAuth/social → shared default
- System prompt built from: thinking budget prefix + agentic prompt + Claude system text + timestamp
- `additionalModelRequestFields` for model-specific thinking config
- `inferenceConfig` with `maxTokens`, `temperature`, `topP`
- `_kiroUpstreamModel` non-enumerable property for executor routing

### `request/openai-to-gemini.js` — OpenAI → Gemini / Gemini CLI / Antigravity
**Routes:** `openai:gemini`, `openai:gemini-cli`, `openai:antigravity`

**Key transformation:**
- `generationConfig` with `temperature`, `topP`, `topK`, `maxOutputTokens`
- `DEFAULT_SAFETY_SETTINGS` (all OFF)
- `systemInstruction` from system messages
- `contents[]` with `role: "user"|"model"`, `parts[]` (text, inlineData, fileData, functionCall, functionResponse)
- `reasoning_content` → `thought: true` part + `thoughtSignature`
- Tool calls → `functionCall` with sanitized names (`sanitizeGeminiFunctionName`: `[a-zA-Z_]` start, max 64 chars)
- Tool responses matched by `tool_call_id` → `functionResponse` with `{ result: ... }`
- Tool schemas cleaned via `cleanJSONSchemaForAntigravity`
- `normalizeGeminiContents` merges consecutive same-role contents

**Antigravity variant:**
- Detects Claude models → routes through Claude backend (`wrapInCloudCodeEnvelopeForClaude`)
- Otherwise wraps in Cloud Code envelope with `project`, `requestId`, `sessionId`, `requestType: "agent"`
- `toolConfig.functionCallingConfig.mode: "VALIDATED"` when tools present

### `request/gemini-to-openai.js` — Gemini → OpenAI
**Routes:** `gemini:openai`, `gemini-cli:openai`

**Key transformation:**
- `generationConfig.maxOutputTokens` → `max_tokens`
- `systemInstruction` → system message
- `contents[].parts[]` → messages (text, inlineData → image_url, functionCall → tool_calls, functionResponse → role:tool)
- Deterministic tool call IDs from name (`call_${name}`) since Gemini lacks native IDs
- Gemini tools `functionDeclarations[]` → OpenAI `{ type: "function", function: { ... } }`

### `request/antigravity-to-openai.js` — Antigravity → OpenAI
**Route:** `antigravity:openai`

**Key transformation:**
- Unwraps `body.request` envelope
- `thinkingConfig.thinkingBudget` → `reasoning_effort` via `budgetToEffort`
- `thought: true` parts → `reasoning_content`
- `thoughtSignature` text parts → regular text
- `functionCall` → tool_calls with deterministic IDs
- `functionResponse` → separate tool messages
- Schema types normalized to lowercase (`OBJECT` → `object`)
- `enumDescriptions` stripped

### `request/openai-to-ollama.js` — OpenAI → Ollama
**Route:** `openai:ollama`

**Key transformation:**
- Content MUST be string (not array)
- `temperature`, `num_predict` (max_tokens), `top_p` → `options`
- `image_url` (data URI) → raw base64 in `images[]`
- Tool role → `tool_name` field (resolved from tool_call_id map)
- Tool calls passed through in OpenAI format (Ollama supports them)

### `request/openai-to-vertex.js` — OpenAI → Vertex AI
**Route:** `openai:vertex`

**Key transformation:**
- Delegates to `openaiToGeminiRequest`
- Post-processes: replaces all `thoughtSignature` with `DEFAULT_THINKING_VERTEX_SIGNATURE`
- Strips `id` from `functionCall` and `functionResponse` (Vertex rejects these)

### `request/openai-to-cursor.js` — OpenAI → Cursor
**Route:** `openai:cursor`

**Key transformation:**
- System messages → user messages with `[System Instructions]` prefix
- Tool results → XML-wrapped `<tool_result>` blocks in user messages
- Non-printable control chars stripped from tool result text
- Tool calls preserved as-is on assistant messages
- Claude `tool_use` blocks extracted from content arrays
- `max_tokens` forced to `DEFAULT_MIN_TOKENS`
- Strips `user`, `metadata`, `tool_choice`, `stream_options`, `system`

### `request/openai-to-commandcode.js` — OpenAI → CommandCode
**Route:** `openai:commandcode`

**Key transformation:**
- Wraps in `{ threadId, memory, config, params }` envelope
- `config` includes `workingDir`, `date`, `environment`, `structure`, git info
- System messages → top-level `params.system` (NOT in messages)
- Content MUST be array of blocks (never string)
- Tool calls → `{ type: "tool-call", toolCallId, toolName, input }`
- Tool results → `{ type: "tool-result", toolCallId, toolName, output: { type: "text", value } }`
- Tools in Anthropic shape `{ name, description, input_schema }`
- Images → `"[image omitted]"`

### `request/openai-to-kiro.js` — OpenAI → Kiro
**Route:** `openai:kiro`

**Key transformation:**
- Nearly identical to `claude-to-kiro.js` but starts from OpenAI messages
- Same session replay, canonicalization, profile ARN logic
- Same `_kiroUpstreamModel` non-enumerable property
- Images: data URI → Kiro `images[]`; http URLs → text fallback `[Image: url]`
- System messages → user messages wrapped in `<instructions>` tags

### `request/openai-responses.js` — OpenAI ↔ Responses API (bidirectional)
**Routes:** `openai-responses:openai`, `openai:openai-responses`

**openaiResponsesToOpenAIRequest (Responses → Chat):**
- `instructions` → system message
- `input[]` items → messages (message, function_call, function_call_output, custom_tool_call, custom_tool_call_output, additional_tools, reasoning)
- Reasoning text extracted from `summary[].text`; `encrypted_content` buffered for next assistant
- Custom tools → function declarations with single `input` string parameter
- `max_output_tokens` → `max_tokens`
- `call_id` clamped to 64 chars (Responses API limit)
- Hosted tools (no name) filtered out

**openaiToOpenAIResponsesRequest (Chat → Responses):**
- System/developer messages → `instructions`
- Messages → `input[]` items (input_text for user, output_text for assistant)
- `image_url` → `input_image` with URL string (not object)
- Tool calls → `function_call` items (call_id clamped to 64)
- Tool results → `function_call_output` items
- Assistant reasoning → `reasoning` input items with `encrypted_content` for store=false continuity
- `reasoning_effort` → `reasoning: { effort, summary: "auto" }`
- `store: false` default

---

## Response Translators

### `response/claude-to-openai.js` — Claude → OpenAI (streaming)
**Route:** `claude:openai`

**Events handled:**
- `message_start` → role:assistant chunk; captures input/cache usage
- `content_block_start` → text/thinking/tool_use block start; `server_tool_use` (web search) skipped
- `content_block_delta` → `text_delta` → content, `thinking_delta` → reasoning_content, `input_json_delta` → tool call arguments
- `content_block_stop` → wraps thinking with `` tags
- `message_delta` → captures output usage + cache; merges with start usage; emits finish_reason with full usage
- `message_stop` → fallback finish if not already sent

**Tool name mapping:** `_toolNameMap` from request translator applied to restore original names.

### `response/openai-to-claude.js` — OpenAI → Claude (streaming)
**Route:** `openai:claude`

**Key transformation:**
- First chunk → `message_start` with role:assistant
- Reasoning content (GLM/DeepSeek/Qwen/MiniMax shapes) → `thinking` block with `thinking_delta`
- Regular content → `text` block with `text_delta`
- Tool calls → `tool_use` block; args buffered then sanitized at finish
- `sanitizeToolArgs` fixes `Read` tool params (limit/offset types, PDF pages validation)
- Legacy `proxy_` prefix stripped from tool names
- `finish_reason` → `stop_reason` via `fromOpenAIFinish`
- Usage tracked from chunk; cache tokens extracted from `prompt_tokens_details`

### `response/gemini-to-openai.js` — Gemini → OpenAI (streaming)
**Routes:** `gemini:openai`, `gemini-cli:openai`, `antigravity:openai`, `vertex:openai`

**Key transformation:**
- Handles Antigravity wrapper (`chunk.response`)
- `thought: true` parts → `reasoning_content`; `thoughtSignature` parts → content or reasoning
- `functionCall` → tool_calls with restored names from `_toolNameMap`
- `inlineData` → `images[]` with data URIs
- Usage from `usageMetadata` via `toOpenAIUsage(usageMeta, "gemini")`
- Finish reason: `STOP` with tool calls → `tool_calls` override
- `geminiToolCallCount` tracked separately from `state.toolCalls` (avoids index conflicts with downstream Claude translator)

### `response/kiro-to-openai.js` — Kiro → OpenAI (streaming)
**Route:** `kiro:openai`

**Key transformation:**
- KiroExecutor already parses AWS EventStream → OpenAI-shaped chunks; this handles both raw SSE strings and pre-parsed objects
- `assistantResponseEvent` → content delta
- `reasoningContentEvent` → reasoning_content delta
- `toolUseEvent` → tool_calls with fallback IDs
- `messageStopEvent` / `done` → finish_reason (tool_calls if tool used, else stop)
- `usageEvent` → usage via `toOpenAIUsage`

### `response/kiro-to-claude.js` — Kiro → Claude (DIRECT route)
**Route:** `kiro:claude`

**Key insight:** Receives OpenAI-shaped chunks from KiroExecutor (NOT raw Kiro EventStream). Re-implements the OpenAI→Claude transformation to be self-contained and lossless for the direct route.

**Key transformation:**
- Same message_start, thinking block, text block, tool_use block pattern as `openai-to-claude.js`
- Reasoning from `delta.reasoning_content` → thinking blocks
- Args buffered then emitted as single `input_json_delta` at finish
- Non-streaming helper `kiroToClaudeNonStreaming` for aggregated completions

### `response/ollama-to-openai.js` — Ollama → OpenAI
**Route:** `ollama:openai`

**Key transformation:**
- NDJSON → OpenAI SSE chunks
- `message.content` → content delta
- `message.thinking` → reasoning_content
- `message.tool_calls` → OpenAI tool_calls format (with fallback IDs)
- `done: true` → finish_reason + usage
- `done_reason` mapped via `toOpenAIFinish`
- Non-streaming `ollamaBodyToOpenAI` for aggregated responses

### `response/cursor-to-openai.js` — Cursor → OpenAI
**Route:** `cursor:openai`

**Passthrough** — CursorExecutor already emits OpenAI format chunks. Returns chunk as-is for both streaming and non-streaming.

### `response/commandcode-to-openai.js` — CommandCode → OpenAI
**Route:** `commandcode:openai`

**Key transformation:**
- NDJSON AI SDK v5 events → OpenAI SSE
- `text-delta` → content
- `reasoning-delta` → reasoning_content
- `tool-input-start` → tool_calls start (with index tracking)
- `tool-input-delta` → arguments delta
- `tool-call` → final consolidated call (only if no deltas seen)
- `finish-step` → captures finish_reason + usage
- `finish` → final chunk with `totalUsage`
- `error` → error message as content + stop

### `response/openai-to-antigravity.js` — OpenAI → Antigravity
**Route:** `openai:antigravity`

**Key transformation:**
- OpenAI chunks → Antigravity `{ response: { candidates, usageMetadata, modelVersion, responseId } }`
- `reasoning_content` → `thought: true` part
- `content` → text part
- Tool calls accumulated silently, emitted ONCE at finish as `functionCall` parts with parsed args
- Tool name restored from `_toolNameMap`
- Usage → `usageMetadata` with `promptTokenCount`, `candidatesTokenCount`, `totalTokenCount`, `thoughtsTokenCount`, `cachedContentTokenCount`
- Finish reason: `stop` → `STOP`, `length` → `MAX_TOKENS`, `tool_calls` → `STOP`, `content_filter` → `SAFETY`

### `response/openai-responses.js` — OpenAI ↔ Responses API (bidirectional streaming)
**Routes:** `openai:openai-responses`, `openai-responses:openai`

**openaiToOpenAIResponsesResponse (Chat → Responses events):**
- Emits 20+ event types: `response.created`, `response.in_progress`, `response.output_item.added`, `response.content_part.added`, `response.output_text.delta`, `response.output_text.done`, `response.reasoning_summary_part.added`, `response.reasoning_summary_text.delta`, `response.function_call_arguments.delta`, `response.custom_tool_call_input.delta`, `response.completed`, etc.
- Sequence numbers incremented via `state.seq`
- `` tag handling in content
- Custom tools (from `_customToolNames`) → `custom_tool_call` items with freeform input
- Standard tools → `function_call` items with JSON arguments
- Reasoning summary → `reasoning_summary_text` events
- `flushEvents(state)` on null chunk (stream end)

**openaiResponsesToOpenAIResponse (Responses → Chat):**
- `response.output_text.delta` → content
- `response.output_item.added` (function_call/custom_tool_call) → tool_calls start
- `response.function_call_arguments.delta` / `response.custom_tool_call_input.delta` → arguments delta
- `response.completed` → finish_reason + usage
- `response.reasoning_summary_text.delta` → reasoning_content
- Error events → error content chunk + stop
- `computeFinishReason` uses sticky `currentToolCallId` for correct tool_calls finish

---

## Complete Registered Route Table

### Request Routes (source → target)

| Source | Target | File | Type |
|--------|--------|------|------|
| `openai` | `claude` | `request/openai-to-claude.js` | hub |
| `claude` | `openai` | `request/claude-to-openai.js` | hub |
| `openai` | `gemini` | `request/openai-to-gemini.js` | hub |
| `openai` | `gemini-cli` | `request/openai-to-gemini.js` | hub (wrapped) |
| `openai` | `antigravity` | `request/openai-to-gemini.js` | hub (Claude or Gemini) |
| `gemini` | `openai` | `request/gemini-to-openai.js` | hub |
| `gemini-cli` | `openai` | `request/gemini-to-openai.js` | hub |
| `antigravity` | `openai` | `request/antigravity-to-openai.js` | hub |
| `openai` | `vertex` | `request/openai-to-vertex.js` | hub (Gemini + post-process) |
| `openai` | `ollama` | `request/openai-to-ollama.js` | hub |
| `openai` | `kiro` | `request/openai-to-kiro.js` | hub |
| `claude` | `kiro` | `request/claude-to-kiro.js` | **direct** |
| `openai` | `cursor` | `request/openai-to-cursor.js` | hub |
| `openai` | `commandcode` | `request/openai-to-commandcode.js` | hub |
| `openai-responses` | `openai` | `request/openai-responses.js` | **direct** |
| `openai` | `openai-responses` | `request/openai-responses.js` | **direct** |

### Response Routes (target → source)

| Target | Source | File | Type |
|--------|--------|------|------|
| `claude` | `openai` | `response/claude-to-openai.js` | hub |
| `openai` | `claude` | `response/openai-to-claude.js` | hub |
| `gemini` | `openai` | `response/gemini-to-openai.js` | hub |
| `gemini-cli` | `openai` | `response/gemini-to-openai.js` | hub |
| `antigravity` | `openai` | `response/gemini-to-openai.js` | hub |
| `vertex` | `openai` | `response/gemini-to-openai.js` | hub |
| `openai` | `antigravity` | `response/openai-to-antigravity.js` | hub |
| `kiro` | `openai` | `response/kiro-to-openai.js` | hub |
| `kiro` | `claude` | `response/kiro-to-claude.js` | **direct** |
| `ollama` | `openai` | `response/ollama-to-openai.js` | hub |
| `cursor` | `openai` | `response/cursor-to-openai.js` | hub (passthrough) |
| `commandcode` | `openai` | `response/commandcode-to-openai.js` | hub |
| `openai` | `openai-responses` | `response/openai-responses.js` | **direct** |
| `openai-responses` | `openai` | `response/openai-responses.js` | **direct** |

---

## Cross-Reference Map

### Translator → Config Dependencies
| Translator | Config files used |
|---|---|
| `openai-to-claude` | `appConstants.js` (CLAUDE_SYSTEM_PROMPT), `runtimeConfig.js` |
| `claude-to-kiro` / `openai-to-kiro` | `kiroConstants.js` (model intent, thinking, agentic prompt, ARN defaults) |
| `openai-to-gemini` | `defaultThinkingSignature.js` (AG + Gemini CLI signatures) |
| `openai-to-vertex` | `defaultThinkingSignature.js` (Vertex signature) |
| `formats/claude.js` | `defaultThinkingSignature.js`, `runtimeConfig.js` |
| `concerns/thinkingUnified.js` | `providers/capabilities.js`, `providers/thinkingLevels.js`, `providers/index.js` |
| `concerns/paramSupport.js` | `providers/capabilities.js` |
| `concerns/prefetch.js` / `image.js` | `config/mediaConfig.js` (MAX_IMAGE_BYTES, FETCH_TIMEOUT_MS, IMAGE_SIGNATURES, BLOCKED_HOSTS) |
| `formats/maxTokens.js` | `runtimeConfig.js` (DEFAULT_MAX_TOKENS, DEFAULT_MIN_TOKENS) |

### Translator → Executor Connection
| Executor | Translator routes used |
|---|---|
| `default.js` (OpenAI-compatible) | Inbound: any `X:openai`; Outbound: `openai:X` |
| `kiro.js` | Inbound: `openai:kiro` or `claude:kiro` (direct); Outbound: `kiro:openai` or `kiro:claude` (direct) |
| `cursor.js` | Inbound: `openai:cursor`; Outbound: `cursor:openai` (passthrough) |
| `commandcode.js` | Inbound: `openai:commandcode`; Outbound: `commandcode:openai` |
| `gemini.js` | Inbound: `openai:gemini`; Outbound: `gemini:openai` |
| `antigravity.js` | Inbound: `openai:antigravity`; Outbound: `antigravity:openai` (via gemini) |

### Handler → Translator Entry Points
- `src/sse/handlers/chat.js` → `translateRequest` / `translateResponse`
- `open-sse/handlers/chatCore.js` → format detection + translation dispatch
- `open-sse/executors/*` → consume translated body, produce streaming chunks
- `src/sse/stream.js` → consumes translator state for usage injection

### Key Patterns to Remember
1. **Direct routes exist for:** `claude:kiro`, `kiro:claude`, `openai:openai-responses` (bidirectional)
2. **Thinking is captured BEFORE translation, applied AFTER** — prevents format-specific fields from being lost during the double-hop
3. **Tool name maps** flow through body as `_toolNameMap` (request) and state as `toolNameMap` (response) for reverse-mapping
4. **Kiro is special:** session replay, conversation canonicalization, profile ARN resolution, model intent resolution
5. **Antigravity routes through Claude OR Gemini** depending on model name (Claude models use Claude backend)
6. **Response translators are stateful:** `state` object accumulates tool calls, thinking blocks, usage across chunks
7. **Fail-soft everywhere:** unknown blocks skipped, malformed JSON falls through, missing tool responses inserted
8. **Cache control is Claude-specific:** added to last system block, last assistant block, last tool; stripped for non-Anthropic providers


This document covers every file, every export, every field mapping, and every special case in the 48-file translator engine. The key architectural insight is the **hub-and-spoke model with direct route bypasses** — OpenAI chat completions as the universal intermediate, with direct routes (`claude:kiro`, `kiro:claude`, `openai:openai-responses`) preserving fidelity for fragile format pairs.