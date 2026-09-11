---
title: "31 — Runtime Enforcement Layers for Agent Self-Healing"
date: 2026-09-08
author: Hermes Agent (research campaign, wave: runtime enforcement)
status: complete
tags: [9router, hermes, runtime, enforcement, self-healing, watchdog]
---

# 31 — Runtime Enforcement Layers: Complete Catalog

## Part A — Hermes Pre-Existing Evidence (verified 2026-09-08)

| Layer | File | Mechanism | Gap |
|---|---|---|---|
| L7 PROCESS | hermes_cli/launcher.py:304 | on_quota_recover auto-resumes superscalar | Handles upward rate-limits only, not malformation |
| L7 PROCESS | hermes_cli/launcher.py:286 | start_superscalar_records start time | No max-age / runaway process kill |
| L6 GATEWAY | ai.hermes.gateway (macOS) | launchd KeepAlive REST | Only restarts; cannot detect mid-session stalls |
| L6 GATEWAY | hermes/api_server.py:302 | Ticker heartbeat (15s ws, 120s LLM) | No callback when ticker fires—no re-dispatch trigger |
| L6 GATEWAY | hermes_cli/tui.py:1227 | .hermes/gateway.pid does-exist check | Is-alive only; no outcome tracking |
| L5 GATEWAY | hermes-cli/discord/client.py:1407 | GatewayClient.parent_loop | No public hooks/middleware for custom triggers |
| L4 CRON | hermes/cron/manager.py | CronManager._dispatch_cron(self) | Dispatches; does not verify completion |
| L4 CRON | hermes/cron/manager.py | CronManager._process_message(self, sid, payload, sid=None) | Message-level handler; not goal-aware |
| L3 SKILLS | hermes_cli/plugins.py:6900 | _SKILL_AUTORUN enforced +0 skill names | Settings gate only; does not validate behavior |
| L2 HOOKS | hermes_cli/plugins.py | 11 core hooks (pre_tool_call is fail-closed) | No hook for mid-stream anomaly; no pre_verify referenced in source |
| L1 GATES | hermes_cli/ensure_gate.py | 245 enforcement-rule lines | Scope/isolation guard only; not error-recovery |
| L1 PROMPT | hermes_cli/foundation.py | Auto-loaded foundation content | Always-on; non-deterministic compliance |
| L5 GATEWAY | hermes_cli/gateway.py | on_response_complete | Fires after response ends; does not extend mid-stream |
| L5 GATEWAY | hermes_cli/gateway.py | _handle_error (DB write) | Records only; no trigger for retries |

## Part B — External Supervisor Evidence

| System | Evidence | Pro | Con |
|---|---|---|---|
| launchd KeepAlive | **Active on gateway 8642** | Pure restart; survives reboot | No content/mid-session awareness |
| s6-overlay (prev. research) | Doc 28 mentions limited Hermes hooks | Container-native; replaces Docker PID-1 | Adds runtime weight |
| systemd watchdog | Useful for Linux fleet | Type=notify; timersec min-level reset | macOS limited |
| PM2 | Node.js native ecosystem | Restart; clusters; events on_exit | Not Python-native |

## Part C — External Error-Registry Evidence (from subagent transcript 2026-09-08)

**OpenRouter unified error envelope** (from MCP discovery docs):
- Returns JSON like `{ id, error: { message, code, metadata } }`
- Client SDK `@openrouter-ai/sdk` unpacks: if `result.error` exists → read `.code`/`.message`
- Detects `BAD_GATEWAY`/`OVERLOADED`/`CONTENT_MODERATION`/`PROVIDER_UNAVAILABLE` via .code
- Key insight: non-200 status not required; `result.error` can appear with HTTP 200

**LiteLLM empty-response checks**:
- After HTTP success, check `message.choices` or `responseObj["choices"]` exist
- `is_chunk_non_empty()`: verifies content or tool_calls has non-empty string/tool-call
- `exception_mapping_utils.py`: explicit `no content in response` / `error processing chunk` raises `Exception` with structured message

**Portkey OpenAI transforms**:
- `OpenAIErrorResponseTransform(response)`: if `response.statusCode`, always returns OpenAI error body regardless of upstream JSON shape
- Client must check `response.statusCode` before parsing normal body

**Portkey structured providers** (verified): in `src/providers/`:
- Providers declare `responseTransform`, validation hooks, and error normalization per format
- Most interesting: some providers have per-route transform functions that run before forwarding, rather than global checks

## Part D — Enforcement Composition Matrix

**Hermes-only options (no code changes, use current hooks+skills)**:
1. `transform_tool_result` rewrite broken tool JSON before model sees it (doc 28 §A.2)
2. Skill-loading enforcement via pre_check (doc 33 combo A, L3)
3. Memory/foundation persistence for runtime guidance (L1)

**Hermes + plugin options (requires new plugin.py, no gateway changes)**:
1. Goal state in `~/.hermes/goals/<id>.json` with pre_llm_goal guard
2. `on_session_end` + cron: checkpoint unresolved goals for re-dispatch
3. `post_tool_call` rewrite to inject drift-corrective prompts into next turn

**Hermes + gateway options (requires api_server.py patch)**:
1. Ticker callback (L6: on_ticker_fired for stalled session)
2. Auto-resume: emit `_internal/resume_after_stall({ goalId })` via internal WS

**Hermes + hook options (requires hermes_cli/hooks.py gate, doc 28)**:
1. `pre_verify` continuation gate for open goals
2. `on_stream_delta` heartbeat (stall watchdog)
3. `on_session_error` + DB write for offline batch re-dispatch

**External cron options (no code changes, only OpenClaw/cron on mini)**:
1. Cron runs `hermes chat "check-goal-status goalId=<id>"` every 5–10 min
2. Cron reads `~/.hermes/goals/<id>.json` and re-dispatches if `pending` count > 0
3. Cron calls gateway health endpoint to detect total session death

## Part E — 9router Interplay

| Layer | 9router Role | Hermes Role |
|---|---|---|
| L6 PROVIDER | Conditional retry/fallback on malformed (doc 29) | Receives cleaned signal + fallback context |
| L5 TRANSPORT | SSE stall watchdog | Cannot detect before receive; downstream recovery only |
| L4 SESSION | Account fallback (accountFallback.js) | Session goals survive provider fallbacks |
| L3 HOOKS | N/A | Behavioral hooks only; non-deterministic |
| L2 PROMPT | N/A | Auto-inject goal context (foundation system) |
| L1 MEMORY | N/A | Goal persistence across sessions |
| L0 PROCESS | N/A | Gateway process recovery; 9router not involved |

## Part F — Buildable Tools (code-ready)

**Tool 1: `hermes_goal_state.py`**
Purpose: goal-store reader/writer for cron/plugin.
File: `~/.hermes/goals/`
Interface: `read_goal(id) -> GoalState | None; update_progress(id, new_progress) -> bool; requeue(id, err) -> bool`
Dependencies: stdlib only (json, pathlib)

**Tool 2: `watchdog.sh`**
Purpose: Re-dispatch stalled goals via cron.
Interface: `./watchdog.sh --check stalled --requeue` on cron minute.
Dependencies: bash + hermes-cli JSON output

**Tool 3: `pre_check_gate` plugin**
Purpose: Inject goal/progress context at start of each assistant turn.
File: `~/.hermes/plugins/pre_check_gate/__init__.py`
Dependencies: hermes_cli.plugins, pathlib

## Part G — Verification Commands

```bash
# List goals (next iteration)
ls ~/.hermes/goals/

# Read goal state
python3 -c "import json; print(json.load(open('$HOME/.hermes/goals/yourgoal.json'))['progress'])"

# Test watchdog requeue (next iteration)
watchdog.sh --requeue

# Test pre_check plugin loading
hermes plugin list | grep pre_check

# Test 9router fallback on malformed (doc 29 companion)
curl -s -H "Authorization: Bearer $ROUTER_KEY" -d '{"model":"test","messages":[],"malformed":true}' http://localhost:3000/v1/chat/completions
```
