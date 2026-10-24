# PR #4656 — fix(capabilities): GLM-5.3 cannot disable thinking

- **Author:** WYSTAF
- **Merged:** 2026-10-08 (v0.5.99)
- **Files changed:** open-sse/providers/capabilities.js (+ test)
- **Fixes:** #4409

## Root cause
z.ai docs: "GLM-5.3 and GLM-5.3-FLASH no longer support disabling thinking (error if thinking.type=disabled)". capabilities.js advertised thinkingCanDisable:true → applyThinking emitted enable_thinking:false when turns asked for no reasoning → intermittent 400.

## Fix
thinkingCanDisable:false on *glm-5.3* pattern (covers both 5.3 and 5.3-flash). Exact MODEL_CAPABILITIES entry was tried first and broke thinkingEffortSupported.

## Deliberately left alone
glm-5.2 exact entry also declares thinkingCanDisable:false (pre-existing, from @izzzzzi Sep 17) — z.ai docs say 5.2 CAN disable, so that entry looks wrong too but predates this fix.

## Verification
6 tests. Full suite A/B'd: 0 regressions.

## Relevance to our branch
- **HIGH OVERLAP**: capabilities.js is in the 53 overlapping files. Our branch added GLM capability entries. Must preserve thinkingCanDisable:false for 5.3.
