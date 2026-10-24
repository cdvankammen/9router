# PR #4750 — fix(combo): fallback when model returns HTTP 200 with zero usable content

- **Author:** m4tinbeigi-official
- **Merged:** 2026-10-15 (v0.5.104)
- **Files changed:** 1 (open-sse/services/combo.js)
- **Fixes:** #4736

## Problem
Free-tier seats (opencode.ai/zen) intermittently return HTTP 200 with zero usable content (empty body, finish_reason: "in_progress"/"incomplete", 0 token usage). handleComboChat treated any 2xx as success, breaking Claude Code tool execution.

## Fix
- `isZeroContentResponse(data)` — detect empty assistant messages lacking text, tool calls, or reasoning tokens with non-standard stop reasons
- In handleComboChat, before accepting HTTP 200 on non-final seat, peek JSON and verify usable content. Fall through on zero content.

## Relevance to our branch
- **HIGH OVERLAP**: Our branch's step-8 resolution ADDED peek logic to combo.js (peekComboResponse). Must compare our implementation with upstream's isZeroContentResponse to determine if they're complementary or duplicative.
- Our peek is stream-based; upstream's is JSON-based. May need both.
