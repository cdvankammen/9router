# Verdict: 2b63e0dd vs b6a9ca43

**Row**: Stage 3 queue row 1 (was: DEDUP, now: KEEP+MERGE)
**Date**: 2026-10-24
**Method**: Direct engineering proof via `git show` + grep (gateway 429 bypassed)

## Decision

**KEEP+MERGE** — our 2b63e0dd is NOT subsumed by upstream b6a9ca43. Must be replayed in Stage 4.

## Prior hypothesis (WRONG)

Stage 2 classified 2b63e0dd as DEDUP because both commits touched golden snapshots, kiro, windsurf, force-stream-config, and image-generation. Assumed upstream's "test triage master" commit was a superset of our post-rebase fixes.

## Proof

### File-list divergence
- **Upstream b6a9ca43** (33 files): 30 test files + `open-sse/providers/capabilities.js` + `tests/__baseline__/known-fails.txt` + `tests/translator/__snapshots__/golden-url-header.test.js.snap`. **ZERO production source files under `src/app/api/` or `open-sse/executors/`.**
- **Our 2b63e0dd** (30 files): 13 production files + 17 test files. Production files include:
  - `open-sse/executors/{default,kiro,windsurf}.js`
  - `open-sse/providers/registry/{index,windsurf}.js`
  - `open-sse/services/{combo,projectId}.js`
  - `src/app/(dashboard)/dashboard/providers/components/ModelsCard.js`
  - `src/app/api/auth/login/route.js`
  - `src/app/api/cli-tools/cowork-settings/route.js`
  - `src/app/api/mcp/[plugin]/{message,sse}/route.js`
  - `src/app/api/oauth/iflow/cookie/route.js`
  - `src/app/api/proxy-pools/{cloudflare,vercel}-deploy/route.js`
  - `src/app/api/shutdown/route.js`
  - `src/app/api/v1/audio/voices/route.js`
  - `src/app/api/version/update/route.js`
  - `src/lib/db/migrations/{005-seen-models,index}.js`
  - `src/lib/db/{repos/requestDetailsRepo,schema}.js`

### Pattern-grep proof (against `git show b6a9ca43`)

14 unique production-fix patterns grepped against upstream's patch:

| Pattern (our unique fix) | Hits in b6a9ca43 patch |
|---|---|
| AbortSignal.timeout | 0 |
| shutdown | 0 |
| seen-models / seenModels | 0 |
| project-id / projectId | 0 |
| applyFingerprintTools | 0 |
| FK / foreign_key | 0 |
| supportsIncludeUsage | 0 |
| mcp.*token | 0 |
| writeSkipApprovals | 0 |
| useNotificationStore | 0 |
| CODEX_CLI_VERSION | 0 |
| event.headers | 0 |
| setupRequired | 0 |
| **kiroPromptOf** | **20** (ONLY overlap) |

**13 of 14 patterns have ZERO matches in upstream.** Only `kiroPromptOf` (kiro systemPrompt→user-turn) overlaps.

### Conclusion

Upstream b6a9ca43 is pure test-triage (GLM-5.2 thinkingEffortSupported, gpt-6.1-sol codex entry, image SSRF array mocks, stale expectation updates, known-fails refresh). It cannot subsume any of our 13 production-code fixes. The only shared work is kiro prompt handling.

## Stage 4 action

Replay 2b63e0dd in full onto v5-vscode-works. Expect clean merge on the 13 production files (upstream didn't touch them). The 17 test files may have minor overlap with upstream's test triage — resolve per file at replay time.

## Cascade

This disproves the blanket DEDUP classification for any row whose subsuming commit is b6a9ca43. All such rows must be re-verified:
- fa2b99e8, 9710b2cb, 4f3b523d, 681ea381, 67ca0d6e, c9374b05, a59bdcaa (full DEDUP)
- 74c5a43b, 7b9fada2, 28811ebb, ad06b3bc, d8af862d (partial DEDUP)
