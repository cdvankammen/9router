---
Date: 2026-09-17
Author: GitHub Copilot
Status: active
Tags: tracking, learnings, chat-logs, mining, transcripts, session-db
---

# Chat-Log Mining: Transcript Format, Session DB, and Research-Method Learnings

## Situation

The user asked to mine the actual chat-log `.jsonl` files and session DBs and save everything learned into `docs/plans-and-prompts/`. This required understanding the VS Code Copilot transcript format, the session DB schema, and the research method the user had been prompting across sessions.

## Symptoms / Observations

1. **Transcript `.jsonl` format**: each line is a JSON object with a `type` field. Relevant types: `user.message` (has `data.content` — array of parts with `type: 'text'` or `type: 'toolInvocation'`), `assistant.message` (same shape), plus terminal notifications and other event types.
2. **Session DB schema** (via `session_store_sql`): tables `sessions(id, summary, agent_name, created_at)`, `turns(id, session_id, turn_index, user_message, assistant_response, timestamp)`, plus `session_files`, `session_refs`, `checkpoints`, `search_index`.
3. **Turn counts ≠ user-message counts**: the DB stores turns (request/response pairs); transcripts store every message event. `48d62ea6` has 87 turns but 97 user messages.
4. **Older transcripts parse empty**: `e7eed49a` and `fab429ae` (Aug 19 and earlier) have 0 parsed user messages — older format or different structure.
5. **The research method is a user signature**: 4 variants (strict binary tree, exponential phrase expansion, corpus flat expansion, multi-subagent) — see `research/9router/49-chat-log-mining-report.md` §4.2.

## Root Cause

- The transcript format is event-based, not turn-based — naive line-by-line parsing misses the `data.content` array structure.
- The session DB is a separate store from the transcripts — they diverge in counts and content.
- The user's research method evolved across sessions; capturing it required reading the actual prompts, not just the artifacts.

## Detection / Prevention

- **Use `scripts/mine-transcripts.mjs`** for future mining — it handles the `data.content` array structure and extracts verbatim user prompts.
- **Cross-check both sources**: transcripts (verbatim prompts) + session DB (turn counts, summaries) — they complement each other.
- **Preserve verbatim text**: the user's typos and phrasing are intentional and informative ("not miss a phrase or a word").
- **Never fabricate**: if a transcript doesn't parse, say so and keep the raw file as source of truth.

## Links

- `research/9router/49-chat-log-mining-report.md` — the full mining report
- `research/9router/50-chat-log-session-index.md` — session index
- `scripts/mine-transcripts.mjs` — the mining script
- `temp/chat-logs/` — prior chat-log exports (Aug 19)
- `tracking/SESSION-NARRATIVE.md` — the session narrative (15 parts)