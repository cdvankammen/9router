# PR #4690 — fix(cursor): recover long sessions from empty AgentService turns

- **Author:** mannnrachman
- **Merged:** 2026-10-15 (v0.5.104)
- **Files changed:** 2
- **Status:** Closed / Merged

## Problem
Long sessions (~80+ replayed messages, "235 MSG" wedge) → AgentService accepts request (HTTP 200), streams zero deltas, closes cleanly. Kernel fails the turn but no recovery.

## What's added
1. `tailOnlyCursorMessages()` — keep system prompts + latest user/assistant/tool + trim notice; strip prior `[9router]` notes for idempotency
2. `shouldRetryEmptyTurn()` — only at/above `CURSOR_TAIL_ONLY_THRESHOLD` (default 80)
3. `runWithRetry()` — fresh h2 session per attempt; withhold empty-turn error while retry available; never retry after content streamed
4. Env knobs: CURSOR_EMPTY_TURN_MAX_RETRIES (1), CURSOR_TAIL_ONLY_THRESHOLD (80), CURSOR_EMPTY_TURN_RETRY_DELAY_MS (400)

## Tests
19 passed in cursor-agent-exec-request (12 pre-existing + 5 new recovery). Plus cursor-agent-proto, cursor-composer-thinking, zed-usage — 55 passed.

## Limitations
- One retry by default; pre-trim context intentionally dropped
- Detection is message-count-based, not server-signal-based

## Relevance to our branch
- **HIGH**: Cursor executor changes affect our cursor-models test regression. The recovery layer sits on top of the cbd594ac kernel — our branch must preserve this.
