# TRANSLATOR-COMPAT PR Cluster — Deep Research

**Date:** 2026-08-10
**Cluster:** Translator & Compatibility Fixes
**PRs:** 3055, 3084, 3083, 3116, 3081, 3048, 2944, 2925, 2927
**Base:** decolua/9router `master`

---

## Executive Summary

| PR | Title | Author | Files | Risk | Mergeable? | Tier |
|----|-------|--------|-------|------|------------|------|
| **#3083** | fix(usage): read cached_tokens from nested prompt_tokens_details | thatssoheil | 2 | **LOW** | ✅ Yes | **T1 — Ship now** |
| **#3081** | fix(stream): inject stream_options.include_usage | thatssoheil | 2 | **LOW** | ✅ Yes | **T1 — Ship now** |
| **#3084** | fix(compat): normalize NVIDIA/vLLM reasoning → reasoning_content | thatssoheil | 3 | **LOW** | ✅ Yes | **T1 — Ship now** |
| **#2927** | fix(thinking): stop claude-adaptive's unlevelled auto intent from 400ing | yidecode | 4 | **LOW-MED** | ✅ Yes | **T1 — Ship now** |
| **#2944** | fix(responses): preserve namespace tools across chat translation | dajinglingpake | 5 | **LOW** | ✅ Yes | **T1 — Ship now** |
| **#3055** | fix(translator): Gemini functionResponse merging + missing tool responses | phowdecayed | 9 | **MEDIUM** | ⚠️ Needs split | **T2 — Review & split** |
| **#3116** | fix(nvidia): normalize tool names/IDs & restore in response streams | v01dgrace | 14 | **MEDIUM** | ⚠️ Large | **T2 — Review carefully** |
| **#2925** | fix(claude): preserve signed thinking across Responses tools | ryanngit | 6 | **MEDIUM-HIGH** | ⚠️ Careful review | **T3 — Deliberate** |
| **#3048** | Fix/inline thinking translation (+ 188 files kitchen sink) | sirwhy | 188 | **HIGH** | ❌ Do not merge | **T4 — Reject/cherry-pick** |

### Key Overlap: `open-sse/translator/concerns/toolCall.js`
Three PRs touch this file: #3055, #3116, #3048. Resolution order: #3055 first (surgical), then #3116 (additive).

---

## Per-PR Detailed Analysis

### PR #3083 — fix(usage): read cached_tokens from nested prompt_tokens_details
**Tier: T1 — Ship now**

| Field | Value |
|-------|-------|
| Author | thatssoheil |
| Files | 2 (`open-sse/utils/usageTracking.js`, test) |
| Closes | #2873 |
| Risk | LOW |

**Problem:** `buildUsage()` writes cache-read tokens only into nested `prompt_tokens_details.cached_tokens`. `canonicalizeUsage()` only read top-level `cached_tokens` → streaming usage silently dropped cache hits → billing at full input rate (10× overcharge).

**Proposed Patch for `open-sse/utils/usageTracking.js`:**
```javascript
// In canonicalizeUsage(), around line ~190:
// BEFORE:
cached = num(usage.cached_tokens);

// AFTER:
const nestedCached = num(usage.prompt_tokens_details?.cached_tokens);
cached = num(usage.cached_tokens) || nestedCached;
```

**Current master state:** Confirmed NOT fixed. Line ~190 has `cached = num(usage.cached_tokens);` with no nested fallback.

**Conflict:** None. Single function modification, additive.
**Automerge:** YES.

---

### PR #3081 — fix(stream): inject stream_options.include_usage
**Tier: T1 — Ship now**

| Field | Value |
|-------|-------|
| Author | thatssoheil |
| Files | 2 (`open-sse/executors/default.js`, test) |
| Closes | #3017 |
| Risk | LOW |

**Problem:** Streaming usage showed 0 tokens because providers require explicit `stream_options: { include_usage: true }` opt-in.

**Proposed Patch for `open-sse/executors/default.js`:**
```javascript
// BEFORE:
transformRequest(model, body) {

// AFTER:
transformRequest(model, body, stream) {
    // ... existing transforms ...
    if (stream && transformed.messages && !transformed.stream_options) {
        transformed.stream_options = { include_usage: true };
    }
}
```

**Current master state:** Confirmed NOT fixed. `transformRequest` takes only `(model, body)`.
**Conflict:** #3116 also modifies `default.js` but in different location. Clean merge either order.
**Automerge:** YES.

---

### PR #3084 — fix(compat): normalize NVIDIA/vLLM reasoning → reasoning_content
**Tier: T1 — Ship now**

| Field | Value |
|-------|-------|
| Author | thatssoheil |
| Files | 3 (`nonStreamingHandler.js`, `stream.js`, test) |
| Closes | #2936 |
| Risk | LOW |

**Problem:** NVIDIA/vLLM return `delta.reasoning` / `message.reasoning` instead of standard `reasoning_content`. Cursor thinking UI shows empty.

**Proposed Patch for non-streaming (`nonStreamingHandler.js`):**
```javascript
// Before the early return for same-format passthrough:
if (targetFormat === sourceFormat) {
    // NEW: normalize NVIDIA reasoning field even on passthrough
    if (responseBody.choices) {
        for (const choice of responseBody.choices) {
            if (choice.message?.reasoning && !choice.message?.reasoning_content) {
                choice.message.reasoning_content = choice.message.reasoning;
                delete choice.message.reasoning;
            }
        }
    }
    return responseBody;
}
```

**Proposed Patch for streaming (`stream.js`):**
```javascript
// In passthrough SSE parser, after parsing delta:
if (delta.reasoning && !delta.reasoning_content) {
    delta.reasoning_content = delta.reasoning;
    delete delta.reasoning;
}
```

**Current master state:** Confirmed NOT fixed. No NVIDIA reasoning normalization exists.
**Merge order:** Before #3116 (both touch `stream.js`).
**Automerge:** YES.

---

### PR #2927 — fix(thinking): stop claude-adaptive's unlevelled auto intent from 400ing
**Tier: T1 — Ship now**

| Field | Value |
|-------|-------|
| Author | yidecode |
| Files | 4 (`thinkingUnified.js`, `chatCore.js`, 2 tests) |
| Risk | LOW-MEDIUM |

**Problem:** Cherry Studio sends `thinking: { type: "enabled" }` with no `budget_tokens`. The `claude-adaptive` branch passes `"auto"` straight to `output_config.effort` → Anthropic rejects with 400.

**Proposed Patch for `thinkingUnified.js`:**
```javascript
// New function:
export function toClaudeAdaptiveEffort(level) {
    const map = {
        'auto': 'high',
        'minimal': 'low',
        'xhigh': 'high',
        'low': 'low',
        'medium': 'medium',
        'high': 'high',
        'max': 'max'
    };
    return map[level] || 'high';
}

// In claude-adaptive case, replace:
body.output_config = { effort: level === 'xhigh' ? 'high' : level };
// With:
body.output_config = { effort: toClaudeAdaptiveEffort(level) };
```

**Current master state:** Confirmed NOT fixed. No `toClaudeAdaptiveEffort` exists.
**Tests:** 15 new tests, all fail before fix and pass after.
**Automerge:** YES.

---

### PR #2944 — fix(responses): preserve namespace tools across chat translation
**Tier: T1 — Ship now**

| Field | Value |
|-------|-------|
| Author | dajinglingpake |
| Files | 5 (`openai-responses.js` req+resp, `stream.js`, `index.js`, test) |
| Risk | LOW |

**Problem:** Responses API `namespace` tool type lost when translating to Chat Completions.

**Key change:** `.map()` → `.flatMap()` in request translator to flatten namespace tools into individual function declarations. Response translator stores namespace mapping in `state.funcNamespaces`.

**Current master state:** Confirmed NOT fixed. Uses `.map()` not `.flatMap()`.
**Automerge:** YES.

---

### PR #3055 — fix(translator): Gemini functionResponse merging + missing tool responses
**Tier: T2 — Review & split**

| Field | Value |
|-------|-------|
| Author | phowdecayed |
| Files | 9 |
| Risk | MEDIUM |

**⚠️ SCOPE CREEP:** Bundles Vertex AI region config + model resolver features unrelated to the translator fix.

**Valuable translator fixes (cherry-pick these):**
1. `normalizeGeminiContents`: Detect `functionResponse` vs `text` parts, prevent merging when mixing
2. `fixMissingToolResponses`: Detect Claude format, insert Claude-format `tool_result` blocks
3. Empty string tool results: Change truthy check to `!== undefined`

**Proposed Patch for `normalizeGeminiContents` in `openai-to-gemini.js`:**
```javascript
function normalizeGeminiContents(contents) {
    const out = [];
    for (const c of contents || []) {
        if (!c?.role || !Array.isArray(c.parts) || c.parts.length === 0) continue;
        const last = out.at(-1);
        
        // NEW: Don't merge if mixing functionResponse and text parts
        const hasFunctionResponse = c.parts.some(p => p.functionResponse);
        const lastHasFunctionResponse = last?.parts?.some(p => p.functionResponse);
        const canMerge = last?.role === c.role && !(hasFunctionResponse || lastHasFunctionResponse);
        
        if (canMerge) {
            last.parts.push(...c.parts);
        } else {
            out.push({ ...c, parts: [...c.parts] });
        }
    }
    return out;
}
```

**Recommendation:** Cherry-pick translator commits only. Vertex features → separate PR.

---

### PR #3116 — fix(nvidia): normalize tool names/IDs & restore in response streams
**Tier: T2 — Review carefully**

| Field | Value |
|-------|-------|
| Author | v01dgrace |
| Files | 14 |
| Lines | Massive pipeline fix |
| Risk | MEDIUM |

**Problem:** MCP tools generate names >64 chars. NVIDIA rejects them. Existing normalization created aliases but didn't restore original names in responses → MCP dispatch broken.

**Key additions to `toolCall.js`:**
- `normalizeOpenAIToolNames()` — SHA-256 hash suffix for collision avoidance
- `restoreOpenAIToolNames()` — reverse lookup from `_toolNameMap`
- `nvidiaToolCallId()` — compact 9-hex ID
- `normalizeNvidiaToolCallIds()`

**Pipeline threading:** `chatCore.js` propagates `toolNameMap` through `sharedCtx` → executor → response translators → stream handlers.

**Merge order:** After #3084 and #3055. This is the big one that builds on clean base.
**Tests:** 23 tests pass, live NVIDIA verification documented.

---

### PR #2925 — fix(claude): preserve signed thinking across Responses tools
**Tier: T3 — Deliberate**

| Field | Value |
|-------|-------|
| Author | ryanngit |
| Files | 6 (new `claudeThinking.js`) |
| Risk | MEDIUM-HIGH |

**Problem:** Claude signed thinking blocks lost through Responses API intermediate format. Claude rejects unsigned thinking history.

**New wire format:** `9router:claude-thinking:v1:` prefixed base64url envelope with model binding, version, and block structure validation.

**Architectural decision needed:**
- Is this the right prefix?
- Migration path for unsigned legacy history?
- 2MB max envelope size appropriate?

**Merge after:** #2944 (both touch `openai-responses.js` and `index.js`).

---

### PR #3048 — Kitchen sink (188 files)
**Tier: T4 — Reject**

Do not merge. Long-lived fork sync with one potentially valuable commit buried inside. Close with comment asking author to split.

---

## Recommended Merge Order

```
1. #3083  (usage cache)          — independent, 2 files
2. #3081  (stream_options)       — independent, 2 files  
3. #3084  (reasoning normalize)  — independent, 3 files
4. #2944  (namespace tools)      — independent, 5 files
5. #2927  (claude-adaptive)      — chatCore.js thinking block
6. #3055  (Gemini fixes only)   — cherry-pick translator commits
7. #3116  (NVIDIA pipeline)     — builds on clean base
8. #2925  (signed thinking)     — architectural, needs buy-in
```

## Shared File Conflict Matrix

| File | PRs |
|------|-----|
| `toolCall.js` | #3055, #3116, #3048 |
| `default.js` | #3081, #3116 |
| `stream.js` | #3084, #3116, #2944 |
| `chatCore.js` | #2927, #3116 |
| `nonStreamingHandler.js` | #3084, #3116 |
| `openai-responses.js` | #2925, #2944 |
| `thinkingUnified.js` | #2927 |
