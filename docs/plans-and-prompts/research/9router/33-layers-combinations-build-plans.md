---
title: Layers & Combination Plans + Buildable Enforcement Tools
date: 2026-09-08
author: Hermes Agent (automated research)
status: active
tags: [combinations, enforcement, build-plans, hermes]
---

# Layers, Combinations, and Buildable Enforcement Tools

## Layered Combination Architecture

The full stack for "agents keep working until goals done, self-heal, don't say 'I can't'":

```
L0 Prompt/Memory   — Mandatory rules, standing directives, goal last-check
L1 Skills          — Exhaustion ladders, recovery-ladder, self-healing-ops
L2 Hooks           — pre_tool_call gate, post_tool_call rewrite, transform_llm_output intercept,
                     pre_verify force-continue, on_session_end checkpoint
L3 Cron            — dead-man switch, re-queue crons, kanban recovery
L4 Runtime         — launchd KeepAlive (exists), sys.excepthook, asyncio handler
L5 Gateway         — auto-resume (exists), lifecycle guard (exists)
L6 Provider        — 9router error registry V2, conditional retries, circuit breaker, SSE mid-stream
L7 Process         — supervisor suicide detection + health endpoints
```

## Combination recipes (each uses 2+ layers)

**Recipe 1 — Goal persistence (stops "ends chat before goal done")**
- pre_verify force-continue (L2) + goal state JSON (like copilot GoalStore) + on_session_end checkpoint (L2) + cron re-queue (L3)

**Recipe 2 — Stream stall recovery**
- on_stream_delta stamping hook (L2) + dead-man cron detecting stale stamp (L3) + 9router mid-stream SSE retry (L6) + transform_tool_result to inject continuation context (L2)

**Recipe 3 — "I can't" / refusal**
- transform_llm_output intercept that rewrites "can't" into "must try N more approaches" + skills (L1) + prompt enforcement (L0) + 9router empty-choices retry (L6)

**Recipe 4 — Tool-call failure**
- post_tool_call rewrite with error detail (L2) + pre_tool_call fallback gate (L2) + skill-based fallback ladder (L1) + cron re-dispatch (L3)

**Recipe 5 — Gateway death**
- launchd KeepAlive (L7, exists) + auto-resume (L5, exists) + health endpoint monitor (L4)

## Buildable enforcement tools (from scratch or adapting existing)

### Tool A: hermes-goal-persistence plugin (port of copilot-goal-system)
- GoalStore JSON state under `~/.hermes/goals/<session>.json` (version 3 schema from doc 30).
- Hooks: pre_llm_call inject goal context; post_llm_call update progress; pre_verify force-continue while open; on_session_end checkpoint.
- CLI: `hermes-goal status|open|close|list` (port of goalctl).

### Tool B: turn-watchdog plugin
- Stamps `live/<session>.started` at pre_llm_call; clears at post_llm_call.
- Also stamps `on_stream_delta` → `live/<session>.beat` (proves streaming alive).
- Cron agent: if `.started` older than TTL and `.beat` stale → re-dispatch via continuation.

### Tool C: refusal-interceptor hook (transform_llm_output)
- Marker detection of "I can't / impossible / cannot" in final response; rewrites to "I will try N more approaches" + injects continuation, or blocks finalization (returns modified text).

### Tool D: 9router conditional matcher (from doc 29)
- Already designed: AND/OR/XOR condition engine, per-rule retry/fallback, error cache, circuit breaker (50% fail over 10 calls).

### Tool E: tool-error injector (from doc 28/29)
- On tool failure, rewrite result to include error + suggested fallback, so model retries with new approach.

### Tool F: recovery-cron suite
- Dead-man switch cron, kanban stuck-card re-queue cron, session checkpoint gc.

## Priorities for build

1. Goal-persistence plugin (Recipe 1) — highest value, proven reference exists.
2. Turn-watchdog plugin (Recipe 2).
3. 9router conditional matcher (Recipe 3/6) — provider side.
4. Recovery-cron suite (Recipe 4).
5. Supervisor hardening (Recipe 5).