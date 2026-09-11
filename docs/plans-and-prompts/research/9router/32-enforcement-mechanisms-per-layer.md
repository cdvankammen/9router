---
title: Enforcement Mechanisms per Layer (C-catalog: options named organized)
date: 2026-09-08
author: Hermes Agent (automated research)
status: active
tags: [enforcement, layers, c-catalog, options, hermes]
---

# Enforcement Mechanisms per Layer — organized catalog

## The C) Options catalog (all current ways to handle errors)

### C1. Runtime Layer (process & in-process)
1. launchd KeepAlive / systemd Restart= — crash restart
2. s6-overlay (docker) — container supervision
3. supervisord/PM2/forever — alternative supervisors
4. sys.excepthook + asyncio exception handler — catch-before-death
5. signal handlers (SIGTERM/SIGINT) for graceful checkpoint
6. In-flight turn watchdog (deadline stamps) — NEW design

### C2. Plugin Hooks Layer (content-side, in Hermes)
7. `pre_tool_call` — policy gate (fail-closed on timeout)
8. `post_tool_call` — observe results, rewrite tool output
9. `pre_llm_call` / `post_llm_call` — around model calls; inject force-continue
10. `transform_llm_output` — rewrite final response before delivery (refusal intercept)
11. `on_stream_start/delta/end` — streaming lifecycle observers
12. `on_session_end/finalize` — cleanup, checkpoint, requeue
13. `pre_verify` — verification gate that can force-continue (`{"action":"continue"}`)
14. `api_request_error` — observe provider errors in-flight

### C3. Behavioral Skills Layer (content-side)
15. Skills injected into system prompt (exhaustion mandates, self-solve ladders)
16. Skill-based recovery: recovery-ladder, self-healing-ops, rate-limit-recovery
17. Subagent dispatch patterns (batched, pinned models, rotate providers)

### C4. Cron Layer (time-based)
18. Hermes cron jobs with `context_from` chaining
19. Recovery/requeue crons + kanban card re-open
20. Dead-man switch cron (stale turn detection)

### C5. Prompt Layer (config/environment)
21. System-prompt enforcement section (mandatory rules)
22. Memory-based standing directives (MEMORY.md/USER.md)
23. config.yaml shell hooks block

---

## Enforcement mechanism details (per option, with verified evidence)

### C1-3..6. Runtime interceptors — proven patterns
- **sys.excepthook**: install once; on uncaught exception: dump turn state to JSON, mark session resumable, exit non-zero (supervisor restarts).
- **asyncio loop.set_exception_handler**: wrap the loop; log task exceptions; prevents silent task death.
- **Signal handlers**: on SIGTERM, flush `live/<session>.json` checkpoint before exit — enables auto-resume.

### C2-7/8. pre_tool_call / post_tool_call
`pre_tool_call` is fail-closed: if your callback times out (30s default) the tool is BLOCKED — the correct place for policy decisions (e.g. "block tool X when goal incomplete"). `post_tool_call` can rewrite tool results before the model sees them.

### C2-13. pre_verify — verified force-continue
Return `{"action": "continue", "message": "..."}` from `pre_verify` to force another verification turn instead of finishing. This is THE hook for goal persistence.

### C3-15..17. Behavioral skills — where they plug in
Skills are folders of SKILL.md + scripts under `~/.hermes/skills/`; loaded into context via `skill_view`. Enforcement happens when the model follows them. To make automatic, reference them in the system prompt: "BEFORE declaring failure, load self-healing-ops + recovery-ladder skills." Soft enforcement (model-follow), not hard.

### C4-18..20. Cron recovery — re-queue pattern
Create a cron job running a continuation check on `~/.hermes/cron/output/` and re-dispatch unfinished turns; kanban re-queue: cron scans `running` cards > TTL and re-opens them.

### C5-21..23. Prompt layer
- System-prompt enforcement: add a "MANDATORY RULES" section to every session.
- config.yaml `hooks:` shell block: run shell commands at lifecycle points.
- MEMORY.md standing directives: highest-priority user rules injected every session.

---

## Which layer catches WHICH error (mapping)

| Error | Best layer |
|---|---|
| Stream stall mid-response | C2 hooks (on_stream_delta watchdog) + C4 cron dead-man + 9router retry |
| Tool call fails | C2 post_tool_call rewrite + C3 skills + C5 prompt |
| Provider 429/5xx | 9router error registry + C1 process circuit breaker |
| Gateway crash | C1 supervisor (exists) |
| Session ends prematurely (goal unfinished) | C2 pre_verify force-continue + goal plugin (doc 30) |
| Model refusal / "I can't" | C2 transform_llm_output intercept + C3 skills + C5 prompt enforcement |
| Subagent timeout | C3 subagent patterns + C4 cron re-dispatch |