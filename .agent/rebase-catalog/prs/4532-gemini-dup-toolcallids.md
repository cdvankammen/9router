# PR #4532 — fix(translator): uniquify duplicate tool_call_ids for Gemini

- **Author:** rabbi696 (from issue #4532 by hndlabs-robsonlopes)
- **Merged:** 2026-10-08 (v0.5.99) by decolua
- **Files changed:** touches open-sse/translator/formats/gemini.js
- **Status:** Closed / Merged

## Problem
Gemini validates functionCall ids are unique across the WHOLE conversation. OpenAI tool_call_id is only unique within its own assistant turn. Long agent sessions (DeepSeek Harness, Claude Code, Cline) replay call_51859 at turn 14 and again at turn 22 → 400 INVALID_ARGUMENT.

## Fix
Per-OCCURRENCE uniquification (not per-id map — that returns the same value for both calls and changes nothing):
- First occurrence keeps its id (byte-identical for already-valid conversations)
- Subsequent occurrences get suffixed: call_51859 → call_51859-2
- An id that already ends in "-2" keeps counting rather than colliding
- Carries #4273 pairing fix: toolResponses and tcID2Name maps resolved per call (not per id)

## Verification
18 tests. Full suite A/B'd: 0 regressions. eslint clean.

## Relevance to our branch
- **HIGH OVERLAP**: Our branch has gemini translator work (bugs-gemini-cursor-commandcode.test.js). Must verify our branch has this fix or apply it.
- Supersedes #4273 (tool pairing fix).
