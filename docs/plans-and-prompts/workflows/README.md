# Testing Workflows — 9Router

**Date:** 2026-08-07
**Author:** GitHub Copilot agent
**Status:** active
**Tags:** #workflow #index #testing

## ⚠️ CRITICAL: Keep These Synced With Code Changes

These workflows are **living test plans** that must stay in sync with the
codebase. When you make code changes, check the "When to Re-Run" section
at the bottom of each workflow doc to see if it needs updating.

### Sync Rules

1. **Before committing code changes**, check if any workflow covers the
   modified files. If yes, re-run the relevant tests and update expected
   results in the workflow doc BEFORE committing.

2. **Commit workflow updates WITH the code change** in the same commit
   (or immediately after). Never let workflows go stale.

3. **If you add a new feature**, create a new test case in the appropriate
   workflow doc (or create a new workflow if it's a new category).

4. **If you fix a bug**, add a regression test to the relevant workflow
   and reference the fix commit hash.

5. **Tag workflow docs** with the last commit hash they were verified
   against so future agents know how fresh they are.

## Workflow Index

| File | Covers | Last Verified |
|------|--------|---------------|
| `e2e-testing-workflow.md` | Streaming, [DONE] sentinel, combos, smart router, fallback chains, Dialagram | `245845cf` |
| `ui-testing-workflow.md` | Dashboard pages, combos UI, fallback builder, providers, usage | `245845cf` |
| `dialagram-setup-workflow.md` | Dialagram provider node + connection + smart router integration | `31413a21` |
| `fallback-chain-testing-workflow.md` | Retry loops, 429/500 fallback, per-model overrides, all-fail error | `31413a21` |
| `smart-router-testing-workflow.md` | Task classification, stickiness, allowedModels filter, disable/enable | `245845cf` |
| `smart-router-testing-workflow.md` | Task classification, stickiness, allowedModels filter, disable/enable | `245845cf` |

## Quick Reference: Files → Workflows

| Changed File | Update Workflow |
|-------------|----------------|
| `open-sse/utils/stream.js` | `e2e-testing-workflow.md` T1, T2 |
| `open-sse/services/combo.js` | `e2e-testing-workflow.md` T5 |
| `src/sse/services/smartRouter.js` | `e2e-testing-workflow.md` T4 |
| `src/sse/handlers/chat.js` | `e2e-testing-workflow.md` T3, T4, T5 |
| `open-sse/handlers/chatCore.js` | `e2e-testing-workflow.md` T3 |
| `src/app/(dashboard)/dashboard/combos/page.js` | `ui-testing-workflow.md` P2 |
| `src/app/(dashboard)/dashboard/providers/**` | `ui-testing-workflow.md` P3 |
| `src/app/(dashboard)/dashboard/usage/**` | `ui-testing-workflow.md` P5 |
| `src/shared/components/ModelSelectModal.js` | `ui-testing-workflow.md` P2 |

## Adding New Workflows

Create a new `.md` file in this directory following the template:

```markdown
# [Feature] Testing Workflow

**Date:** YYYY-MM-DD
**Author:** [agent name]
**Status:** active
**Tags:** #workflow #testing #[feature]

> ⚠️ SYNC NOTE: [which code files trigger re-run]

## Prerequisites
[setup steps]

## Test Cases
### T1: [description]
**What:** ...
**Why:** ...
**Pass criteria:** ...
[command or browser steps]

## When to Re-Run
[list of files/conditions]
```
