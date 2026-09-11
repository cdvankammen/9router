# Research: Unified Error Handling System — 9router Error Registry V2 + Hermes Tool-Call Gap Analysis

**Date:** 2026-09-09
**Author:** Hermes Agent (research campaign)
**Status:** draft
**Tags:** #research #errors #9router #hermes #error-registry #conditional-logic #stream-stall #resilience

## Question / Objective

Design a complete error handling architecture spanning 9router (provider-side) and Hermes (content/tool-side). Build on prior research (26-programmatic-error-registry.md). Add: conditional logic chains (AND/OR/XOR), cached error logs, filterable views, programmatic pattern matching, GitHub analog research, and the Hermes-side gap analysis for tool-call errors and stream stalls.

## Sources Consulted

- Code: `~/Documents/GitHub/9router/open-sse/config/errorConfig.js` (ERROR_RULES, ERROR_TYPES, BACKOFF_CONFIG)
- Code: `~/Documents/GitHub/9router/open-sse/services/accountFallback.js` (checkFallbackError)
- Code: `~/Documents/GitHub/9router/open-sse/services/combo.js` (handleComboChat, fallback rotation)
- Code: `~/Documents/GitHub/9router/open-sse/handlers/chatCore.js` (main request handler)
- Code: `~/.hermes/hermes-agent/agent/error_classifier.py` (classify_error, FailoverReason)
- Code: `~/.hermes/hermes-agent/agent/chat_completion_helpers.py` (ProviderStreamError, stream stall)
- Code: `~/.hermes/hermes-agent/agent/conversation_loop.py:4300,7339` (content-filter stall, escalation)
- Prior: `26-programmatic-error-registry.md` (V1 design)
- External: OpenRouter error types, LiteLLM exception mapping, llm_gateway (mazori-ai)

## Raw Findings

### 1. Current 9router Error Architecture (Verified in Source)

**errorConfig.js** defines:
- `ERROR_TYPES`: maps HTTP status → {type, code} (OpenAI-compatible vocabulary)
- `DEFAULT_ERROR_MESSAGES`: human-readable per status
- `BACKOFF_CONFIG`: base=2000ms, max=5min, maxLevel=15
- `ERROR_RULES`: array of {text?, status?, cooldownMs?, backoff?} — checked top-to-bottom

**accountFallback.js** `checkFallbackError(status, errorText, backoffLevel)`:
- Iterates ERROR_RULES top-to-bottom
- Text rules first (substring match, case-insensitive)
- Status rules second
- Returns {shouldFallback, cooldownMs, newBackoffLevel}
- Default: TRANSIENT_COOLDOWN_MS (30s) for unmatched errors

**combo.js** `handleComboChat`:
- Rotates models on `!result.ok`
- Respects retriesPerModel, perModelRetries
- Circuit breaker via failedProviders set
- flattenToolHistory for panel models

**THE GAP (confirmed):** `result.ok` only checks HTTP status. HTTP 200 + empty choices = treated as success. No semantic body validation.

### 2. Current Hermes Error Architecture (Verified in Source)

**error_classifier.py** `classify_error(error, provider, model)`:
- Returns ClassifiedError(reason: FailoverReason, retryable: bool, should_fallback: bool)
- FailoverReason enum: rate_limit, overloaded, context_overflow, server_error, timeout, format_error, billing, auth, model_not_found, policy_blocked, unknown
- Pattern-matches on HTTP status + error message text + error code
- ~150+ pattern constants (_RATE_LIMIT_PATTERNS, _BILLING_PATTERNS, etc.)
- Handles OpenRouter upstream wrapping detection

**chat_completion_helpers.py**:
- `ProviderStreamError` exception class for in-stream errors
- `_provider_stream_error_from_text()` parses SSE events for error shapes
- Stream stall detected at line 5748: appends warning to conversation
- `_FALLBACK_EXHAUSTED_COOLDOWN_S = 5.0`

**conversation_loop.py**:
- Line 4300: content-filter stream stall → fallback (#32421)
- Line 7339: stream stall escalated to provider failure

### 3. GitHub Analog Research — Error Registry Patterns

| Repo/Project | Pattern | Key Insight |
|-------------|---------|-------------|
| **LiteLLM** | Exception class hierarchy → semantic routing | Typed errors enable "if ContextWindowExceeded → use bigger model" |
| **OpenRouter** | Canonical error_type vocabulary | Same error_type regardless of API skin; stable for programmatic matching |
| **llm_gateway (mazori)** | Empty-response-as-failover-trigger | HTTP 200 + empty body = failover condition, not success |
| **resilience4j** | State machine circuit breaker | closed→open→half-open with configurable thresholds |
| **Portkey** | Multi-condition retry policies | if status=429 AND header contains "x-ratelimit" → specific backoff |
| **LangChain** | Retry chain with condition predicates | RunnableRetry with custom should_retry callable |
| **Cloudflare AI Gateway** | Rule-based routing | if error matches pattern X → route to provider Y |

### 4. Conditional Logic Design (IF/AND/OR/XOR)

The V1 design used flat pattern matching. V2 needs boolean composition:

```json
{
  "id": "empty-choices-with-rate-limit-header",
  "conditions": {
    "operator": "AND",
    "rules": [
      {"field": "body.choices.length", "op": "eq", "value": 0},
      {"field": "headers.x-ratelimit-remaining", "op": "eq", "value": "0"}
    ]
  },
  "action": {"retry": true, "retries": 2, "fallback": true, "cooldownMs": 30000}
}
```

Supported operators: AND, OR, XOR, NOT, NAND, NOR
Supported field ops: eq, neq, gt, lt, gte, lte, contains, regex, exists

### 5. Error Cache/Log Schema

```json
{
  "timestamp": "2026-09-09T12:00:00Z",
  "pattern_id": "no-choices-empty",
  "provider": "dialagram",
  "model": "qwen-3.8-max",
  "http_status": 200,
  "matched_conditions": ["body.choices.length == 0"],
  "action_taken": "retry_with_fallback",
  "outcome": "success_on_retry_2",
  "latency_ms": 1240,
  "tags": ["empty_response", "transient", "provider_flaky"]
}
```

Filterable by: pattern_id, provider, model, tags, time range, action_taken, outcome, http_status.

### 6. Hermes-Side Gap: Tool Call Errors

9router CANNOT catch these because they happen AFTER the model response arrives at Hermes:

| Error Type | Where It Happens | Current Handling | Gap |
|-----------|-----------------|-----------------|-----|
| Tool throws exception | Hermes tool executor | Error returned to model as tool_result | Model decides what to do — no auto-retry |
| Tool returns partial/truncated data | Hermes tool executor | Passed through as-is | No validation hook |
| Tool times out | Hermes tool executor | Timeout error returned | No auto-retry with smaller payload |
| MCP server crashes | Hermes MCP transport | Connection error | No auto-restart |
| delegate_task child dies | Hermes delegation | Partial transcript saved | Recovery ladder is behavioral, not automated |
| write_file >15KB truncation | Hermes file tool | Silent truncation | No append-only enforcement |

**Solution:** Hermes plugin hooks (transform_tool_result, pre_tool_call) handle these. See Document 1.

### 7. Hermes-Side Gap: Stream Stalls

| Scenario | Detection Point | Current Behavior | Needed |
|----------|----------------|-----------------|--------|
| Provider stops sending tokens | turn_liveness.py (600s idle) | Force-abort turn | Auto-retry via different provider |
| Mid-tool-call disconnect | chat_completion_helpers.py:5748 | Warning message injected | pre_llm_call injection to resume |
| Content filter blocks mid-stream | conversation_loop.py:4300 | Fallback triggered | Already handled ✓ |
| Client closes connection early | Discord/Slack adapter | Stream orphaned | Cleanup + log |
| SSE event: error mid-stream | chat_completion_helpers.py | ProviderStreamError raised | Retry loop handles if retryable=True |

## Synthesis / Conclusion

### Proposed Architecture: Three-Layer Error Handling

**Layer 1: 9router Error Registry V2 (Provider-Side)**
- Location: `open-sse/config/customErrorRegistry.js`
- Handles: HTTP status, body semantics (empty choices, null content), headers, SSE events
- Features: conditional logic (AND/OR/XOR), pattern labels/tags, cached error log, dashboard UI
- Action: re-enter combo.js fallback loop transparently

**Layer 2: Hermes Plugin Hooks (Content/Tool-Side)**
- Location: `~/.hermes/plugins/resilience-hooks/`
- Handles: tool errors, refusals, goal incompleteness, stream stall recovery
- Features: transform_llm_output, pre_verify, transform_tool_result, pre_llm_call
- Action: modify what model sees, force continuation, inject context

**Layer 3: Hermes Internal error_classifier (Streaming-Side)**
- Location: `agent/error_classifier.py` (already exists)
- Handles: provider errors during streaming, rate limits, context overflow
- Features: 150+ patterns, FailoverReason classification, retry/fallback decisions
- Action: automatic retry loop with provider rotation

### Suggested Code: 9router Conditional Logic Engine

```javascript
// open-sse/config/customErrorRegistry.js
export class ConditionalMatcher {
  constructor(rules) { this.rules = rules; }
  
  evaluate(conditions, context) {
    if (!conditions.operator) return this._evalRule(conditions, context);
    const results = conditions.rules.map(r => this.evaluate(r, context));
    switch (conditions.operator) {
      case "AND": return results.every(Boolean);
      case "OR": return results.some(Boolean);
      case "XOR": return results.filter(Boolean).length === 1;
      case "NOT": return !results[0];
      case "NAND": return !results.every(Boolean);
      case "NOR": return !results.some(Boolean);
      default: return false;
    }
  }
  
  _evalRule(rule, ctx) {
    const val = this._getField(ctx, rule.field);
    switch (rule.op) {
      case "eq": return val === rule.value;
      case "neq": return val !== rule.value;
      case "contains": return String(val).includes(rule.value);
      case "regex": return new RegExp(rule.value).test(String(val));
      case "exists": return val !== undefined && val !== null;
      case "gt": return Number(val) > rule.value;
      case "lt": return Number(val) < rule.value;
      default: return false;
    }
  }
  
  _getField(ctx, path) {
    return path.split(".").reduce((o, k) => o?.[k], ctx);
  }
  
  match(responseContext) {
    for (const pattern of this.rules) {
      if (this.evaluate(pattern.conditions, responseContext)) {
        return pattern;
      }
    }
    return null;
  }
}
```

### Suggested Code: Hermes Refusal Intercept Hook

```python
# ~/.hermes/plugins/resilience-hooks/hooks.py
import re

REFUSAL_PATTERNS = [
    r"I (?:can't|cannot|am unable|'m unable) to",
    r"(?:this is |that's )beyond my",
    r"I don't have the ability",
    r"I'm not able to",
    r"as an ai,? i (?:can't|cannot)",
]

def _refusal_intercept(text=None, **kwargs):
    if not text:
        return None
    for pattern in REFUSAL_PATTERNS:
        if re.search(pattern, text, re.IGNORECASE):
            return (
                f"[SELF-CORRECTION: Previous response contained a self-imposed limitation. "
                f"Retrying with alternative approaches. Available methods not yet tried: "
                f"web_extract, browser_exec, terminal curl, PinchTab, direct API. "
                f"Original text preserved below for context.]\n\n{text}"
            )
    return None

def _goal_persistence(**kwargs):
    import json, os
    session_id = kwargs.get("session_id", "")
    goal_file = os.path.expanduser(f"~/.hermes/goals/{session_id}.json")
    if not os.path.exists(goal_file):
        return None
    with open(goal_file) as f:
        goals = json.load(f)
    incomplete = [g for g in goals.get("items", []) if not g.get("done")]
    if incomplete:
        remaining = ", ".join(g["description"] for g in incomplete[:5])
        return {"action": "continue", "message": f"Incomplete goals remain: {remaining}. Continue working."}
    return None

def register(ctx):
    ctx.register_hook("transform_llm_output", _refusal_intercept)
    ctx.register_hook("pre_verify", _goal_persistence)
```

## Confidence Level

High — all source references verified. Architecture builds directly on existing mechanisms in both codebases.

## Open Questions

- Should the error cache be SQLite (like Hermes state.db) or JSONL files?
- What dashboard UI component for 9router error log viewer?
- How to sync error patterns between 9router registry and Hermes error_classifier?
- Should pre_verify fire on every turn or only when a goal file exists?
