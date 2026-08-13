# Operations

**Date:** 2026-08-13
**Author:** Claude Code agent (main session, v1 branch)
**Status:** active
**Tags:** #operations #index #testing #deployment #runbook

Runbooks, living test plans, and release process for 9Router.

## ⚠️ Keep these synced with code

`TESTING.md` and the `*-workflow.md` / `*-runbook.md` files are **living test plans**, not one-time notes. When you change code that a workflow covers, re-run it and update expected results in the same commit — don't let these go stale (see `TESTING.md`'s sync rules).

## Contents

| File | Covers |
|------|--------|
| `OPERATIONS.md` | Day-to-day run/build/deploy commands, ports, env, common ops tasks |
| `TESTING.md` | Index of test workflows, files→workflow mapping, sync rules |
| `VERSIONING.md` | Root vs. `cli/` versioning, changelog discipline |
| `RELEASE-CHECKLIST.md` | Steps before cutting a release |
| `deployment-runbook.md` | Full deployment runbook |
| `e2e-testing-workflow.md` | Streaming, `[DONE]` sentinel, combos, smart router, fallback chains |
| `ui-testing-workflow.md` | Dashboard pages, combos UI, fallback builder, providers, usage |
| `smart-router-testing-workflow.md` | Task classification, stickiness, allowedModels filter |
| `fallback-chain-testing-workflow.md` | Retry loops, 429/500 fallback, per-model overrides |
| `dialagram-setup-workflow.md` | Dialagram provider node + connection + smart router integration |
| `browser-control-workflow.md` | Browser-driven manual verification steps |

## Conventions

Same as [`../README.md`](../README.md).
