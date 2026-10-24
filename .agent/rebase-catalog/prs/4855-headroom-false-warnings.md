# PR #4855 — fix(headroom): avoid false compression warnings when tools dominate body

- **Author:** IlyaKhalafi
- **Merged:** 2026-10-15 (v0.5.104)
- **Files changed:** 5
- **Refs:** #4809

## Problem
Headroom warnings fired on healthy message compression when large unchanged tool schemas dominated outbound JSON. Made compression look ineffective when it was working correctly.

## Fix
- Require BOTH messageBytes AND bodyBytes to shrink <5% before warning
- Preserve top-level system prompt savings detection for Claude

## Tests
40 focused Headroom tests pass.

## Relevance to our branch
- **LOW-MEDIUM**: Our branch has headroomEnabled flag wiring in chatCore.js signature. If we modified headroom warning logic, must preserve this fix.
