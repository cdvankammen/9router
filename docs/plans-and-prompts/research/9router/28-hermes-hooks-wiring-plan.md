# Research: Wiring Behavioral Skills into Hermes Plugin Hooks — Refusal Intercept + Goal Persistence

**Date:** 2026-09-09
**Author:** Hermes Agent (research campaign)
**Status:** draft
**Tags:** #research #hooks #plugins #self-healing #goal-persistence #refusal-intercept

## Question / Objective

How to convert behavioral skills (self-healing-ops, recovery-ladder, research-exhaustiveness-gate) from prompt-level instructions into enforced runtime hooks inside Hermes Agent. Specifically: build a refusal-intercept hook and a goal-persistence hook.

## Sources Consulted

- Code: `~/.hermes/hermes-agent/hermes_cli/plugins.py` (VALID_HOOKS, invoke_hook, register_hook, _invoke_hook_callback)
- Code: `~/.hermes/hermes-agent/agent/turn_finalizer.py:616` (transform_llm_output invocation)
- Code: `~/.hermes/hermes-agent/agent/turn_liveness.py` (stall watchdog)
- Code: `~/.hermes/hermes-agent/agent/chat_completion_helpers.py:5748` (stream stall detection)
- Code: `~/.hermes/hermes-agent/agent/error_classifier.py` (FailoverReason classification)
- Code: `~/.hermes/hermes-agent/agent/conversation_loop.py:4300,7339` (content-filter stream stall)
- Code: `~/.hermes/hermes-agent/plugins/security-guidance/__init__.py` (transform_tool_result example)
- Code: `~/.hermes/hermes-agent/plugins/platforms/raft/adapter.py:905-909` (hook registration example)
- Code: `~/.hermes/hermes-agent/tools/delegate_tool.py:2243` (lifecycle invoke_hook)
- Docs: hermes-self-knowledge skill Workflow H (three hook lanes)
- Docs: hermes-agent skill references/background-systems.md

## Raw Findings

### 1. Canonical Hook Inventory (from plugins.py:163-187)

```python
VALID_HOOKS: Set[str] = {
    "pre_tool_call",           # Block/modify/approve tool before execution
    "post_tool_call",          # Observe after tool completes
    "transform_terminal_output", # Modify terminal command output
    "transform_tool_result",   # Modify what model sees after tool call
    "transform_llm_output",    # Modify final response text before user sees it
    "pre_llm_call",            # Inject context before LLM generation
    "post_llm_call",           # Observe after LLM generation
    "on_stream_start",         # Observer: stream begins (async, immutable)
    "on_stream_delta",         # Observer: each token chunk (async, immutable)
    "on_stream_end",           # Observer: stream ends (async, immutable)
    "on_interim_message",      # Observer: interim messages
    "pre_verify",              # Gate: can keep agent going by returning {"action": "continue", "message": "..."}
    "pre_api_request",         # Before API request
    "post_api_request",        # After API request
}
```

### 2. Hook Registration Pattern (from raft/adapter.py:905-909)

```python
def register(ctx):
    ctx.register_hook("on_session_start", _on_session_start)
    ctx.register_hook("pre_llm_call", _on_pre_llm_call)
    ctx.register_hook("pre_tool_call", _on_pre_tool_call)
    ctx.register_hook("post_tool_call", _on_post_tool_call)
    ctx.register_hook("post_llm_call", _on_post_llm_call)
```

### 3. transform_llm_output Invocation (from turn_finalizer.py:616-624)

Fired once per turn after the model generates its final response but BEFORE delivery to the user. Callback returns a string to replace the response text, or None to leave unchanged. First non-None string wins.

### 4. pre_verify Hook — The Key to Goal Persistence

From plugins.py comments: "A callback may keep the agent going — run a check, defer it, tidy the diff — instead of stopping by returning: `{"action": "continue", "message": "<follow-up instruction>"}`". Bounded by `agent.max_verify_nudges`. This is the EXACT mechanism for goal persistence.

### 5. pre_llm_call Context Injection (from tools/hook_output_spill.py:8)

`pre_llm_call` hook in `run_agent.py` can return `{"context": "..."}` which gets injected into the next LLM call. This is how continuation prompts are forced.

### 6. Stream Stall Detection (from chat_completion_helpers.py:5748)

The string "Stream stalled mid tool-call" is generated at `agent/chat_completion_helpers.py:5748`. It is NOT a hook point — it is appended to the conversation content as a message. The turn_liveness watchdog (`agent/turn_liveness.py`) force-aborts turns that stall silently with a 600s default timeout.

### 7. Error Classifier (from error_classifier.py)

Hermes already has a comprehensive error classification system: `classify_error()` returns `ClassifiedError(reason=FailoverReason, retryable=bool, should_fallback=bool)`. Covers 400/401/402/403/404/429/500/502/503/504 + transport errors + content filter stalls. This is the internal equivalent of what 9router needs externally.

### 8. Existing Plugin Examples Using Hooks

| Plugin | Hooks Used |
|--------|------------|
| security-guidance | transform_tool_result |
| raft adapter | on_session_start, pre_llm_call, pre_tool_call, post_tool_call, post_llm_call |
| voiceflow | post_llm_call |
| kanban-discord-hooks | kanban_task_claimed/completed/blocked (custom) |
| orca-status | on_session_start, pre_llm_call, post_llm_call, pre_tool_call, post_tool_call, pre_approval_request, post_approval_response, on_session_end, on_session_finalize, on_session_reset |
| langfuse | pre_llm_call (tracing) |

### 9. Hook Timeout Behavior

- `_HOOK_TIMEOUT_BOUNDED_HOOKS`: post_tool_call, transform_terminal_output, transform_tool_result, transform_llm_output — bounded by `plugins.hook_callback_timeout` (default 30s)
- `_HOOK_TIMEOUT_FAIL_CLOSED_HOOKS`: pre_tool_call — if timeout, BLOCKS the tool call (returns block message)
- Other hooks: unbounded but isolated

### 10. Shell Hooks (config.yaml)

Separate from plugin hooks. Defined in config.yaml `hooks:` block. Allow-listed to VALID_HOOKS names. Run as shell commands, not Python callbacks.

## Synthesis / Conclusion

### A) How to Wire Behavioral Skills into Hooks

The skills (self-healing-ops, recovery-ladder, etc.) are currently prompt-level instructions. To enforce them at runtime:

1. **Refusal Intercept** → `transform_llm_output` hook
   - Scans final response for refusal patterns ("I can't", "I'm unable", "beyond my capabilities")
   - If matched, replaces text with: "[Previous attempt hit a self-imposed limit. Retrying with alternative approach...]"
   - Returns modified text AND triggers a `pre_llm_call` context injection for the next turn

2. **Goal Persistence** → `pre_verify` hook
   - Reads a goal checklist file from workspace
   - Compares against filesystem artifacts
   - If incomplete, returns `{"action": "continue", "message": "Goals remaining: X, Y, Z. Continue working."}`
   - Bounded by `agent.max_verify_nudges` (configurable)

3. **Tool Auto-Retry** → `transform_tool_result` hook
   - Detects error patterns in tool results
   - Injects fallback data or retry instructions into what the model sees
   - Model then naturally retries without needing explicit code

4. **Stream Stall Recovery** → NOT a hook point (it is a message injection)
   - The stall message is injected at chat_completion_helpers.py:5748
   - Recovery must happen via `pre_llm_call` context injection after the stall message appears
   - OR via a cron-based watchdog that detects stalled sessions

### B) Architecture: What Each Layer Handles

| Layer | Responsibility | Mechanism |
|-------|---------------|-----------|
| **9router** | Provider-side errors: HTTP status, empty choices, upstream resets, stream interruptions before first token | Custom error registry (patterns[]), combo.js re-entry |
| **Hermes hooks** | Content-side errors: truncated tool calls, refusals, incomplete goals, mid-response stalls | Plugin hooks (transform_llm_output, pre_verify, pre_llm_call) |
| **Hermes error_classifier** | Internal retry/fallback decisions for provider errors during streaming | classify_error() → FailoverReason → retry loop |
| **Behavioral skills** | Strategy guidance when hooks fire (what to try next, which model to rotate to) | Loaded into system prompt |

### C) Implementation Plan (Numbered Steps)

1. Create plugin directory: `~/.hermes/plugins/resilience-hooks/`
2. Write `plugin.yaml` declaring hooks: transform_llm_output, pre_verify, pre_llm_call, transform_tool_result
3. Write `__init__.py` with register(ctx) function
4. Implement `_refusal_intercept(text, **kwargs)` → registered as transform_llm_output
5. Implement `_goal_persistence_check(**kwargs)` → registered as pre_verify
6. Implement `_tool_error_injector(result, **kwargs)` → registered as transform_tool_result
7. Implement `_stall_context_injector(**kwargs)` → registered as pre_llm_call
8. Create `~/.hermes/goals/<session_id>.json` schema for goal tracking
9. Wire goal creation into kanban card dispatch
10. Test each hook independently with `hermes chat -q`
11. Enable plugin in config.yaml
12. Verify with integration test

## Confidence Level

High — all hook points verified in source code. pre_verify continuation mechanism confirmed in plugins.py comments. transform_llm_output tested in tests/test_transform_llm_output_hook.py.

## Open Questions

- Can transform_llm_output trigger a new turn automatically, or does it only modify current output? (Answer: modifies current. For auto-retry, need pre_llm_call injection on next turn via session state.)
- What is the exact max_verify_nudges default?
- Does pre_llm_call context injection work across stream stalls or only on clean turn boundaries?
