# PR #4975 — feat(combos): add Smart Router (System One) with adaptive session stickiness

- **Author:** miqonee
- **Merged:** 2026-10-23 (v0.5.109, YESTERDAY) by decolua
- **Commits:** 4
- **Files changed:** 10
- **Status:** Closed / Merged
- **Closes:** #4126, #2852, #3410

## ⚠️ CRITICAL: EXACT SAME FEATURE AS OUR BRANCH
Our branch commit `da52d462 feat(smart-router): add pre-combo interception smart router with dynamic combo fallback` implements the same feature. Per user mandate: "if they have done the exact same features or thing to fix the exact same bug then it is often going to be better to take their fix over ours".

## What upstream's System One does
- 4th combo strategy `smart` alongside fallback/round-robin/fusion
- Queries configured System One decision model via native `handleSystemoneCore` (default: free `oc/jev-1.13-free`)
- Extracts prompt state from latest user message (OpenAI/Claude/Codex blocks), 2000-char cap
- Dynamically orders combo models putting selected choice first + probability-sorted remainder
- Fail-open: 8s timeout (`DEFAULT_SYSTEMONE_TIMEOUT_MS`) falls back to sequential order
- Session stickiness via `sessionId` (open-sse/utils/sessionManager.js)
- 4 policies: Smart Switch (adaptive hysteresis, default), Strict Lock, Per-Turn, Custom Threshold
- Failover auto-recovery: sticky model fails → session mapping invalidated
- Dashboard UI: SmartPolicyModal + system one router picker with live connection badges
- gitbook docs updated

## Verification
- 19 unit tests (tests/unit/combo-smart-router.test.js)
- Live cluster semantic routing verified across 6 models
- Session stickiness + cache retention verified
- Docker image published: miqone/9router:combo

## Files touched
- open-sse/services/systemoneRouter.js (NEW)
- open-sse/services/combo.js (smart strategy branch)
- src/app/(dashboard)/dashboard/combos/SmartPolicyModal.js (NEW)
- src/sse/handlers/chat.js (resolveSmartChoice wiring)
- gitbook/content/en/features/combos.md

## Relevance to our branch
- **DECISION REQUIRED**: Our da52d462 vs upstream #4975. Must deeply compare:
  1. Implementation approach (pre-combo interception vs in-combo strategy)
  2. Session identity resolution
  3. Policy set
  4. Fallback semantics
  5. Dashboard UI
- If upstream's is more complete/better-tested, DROP ours and take theirs per user mandate
- If ours has unique features upstream lacks, MERGE both
- If identical, prefer upstream (19 tests + docker image + live cluster verification)
