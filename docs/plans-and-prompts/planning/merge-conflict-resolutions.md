# MERGE-13: Conflict Resolution Log

**Branch:** `merge-upstream-20260910`
**Merge commit:** `0ea23708a8a8d1ce8e0bdda578d7cd693813d9cb`
**Parents:** `a0650fda` (local) + `17c4cc76` (origin/master v0.5.75)
**Resolved by:** run 224 (recovered and verified by run 274)
**Date:** 2026-09-10

## Summary

17 conflicted files resolved semantically. Zero conflict markers remain in tree.
All 11 critical JS files pass `node --check` syntax validation.
All local custom features verified present post-merge.

## Resolution Strategy Per File

| # | File | Strategy | Notes |
|---|------|----------|-------|
| 1 | `.gitignore` | Union deduped | Combined local ignores (dist/, data.sqlite, .next-cli-build) with upstream patterns |
| 2 | `CHANGELOG.md` | Concatenate | Local unreleased section first, then upstream v0.5.69-v0.5.75 notes |
| 3 | `open-sse/handlers/chatCore.js` | Semantic merge (2 hunks) | Hunk 1: our params + upstream headroomTimeoutMs. Hunk 2: upstream multi-line executor format + our originalBody/userAgent |
| 4 | `open-sse/handlers/chatCore/nonStreamingHandler.js` | Theirs then ours | Upstream Cline unwrap FIRST, then our empty-choices validation (order matters) |
| 5 | `open-sse/handlers/chatCore/streamingHandler.js` | Param union | Our params + upstream credentials injected before closing |
| 6 | `open-sse/providers/capabilities.js` | Union | Both 9router virtual models + upstream muse-spark/new providers |
| 7 | `open-sse/providers/registry/index.js` | Renumber + union (2 hunks) | p120=9router kept, upstream fish-audio/alitp-intl/xquik renumbered to p121-p123 |
| 8 | `open-sse/services/usage.js` | Union (2 hunks) | Both import sets + both mappings preserved |
| 9 | `open-sse/utils/stream.js` | Take upstream (2 hunks) | Upstream refactored our verbose onStreamComplete into finalizeStream(); accepted refactor |
| 10 | `src/app/(dashboard)/dashboard/providers/[id]/page.js` | Union (3 hunks) | Imports: both. State: both. UI: our Refresh Models + upstream Cline import button |
| 11 | `src/app/(dashboard)/dashboard/providers/page.js` | Union (2 hunks) | State: both. UI: our health banner + upstream status filter |
| 12 | `src/app/api/providers/[id]/models/route.js` | Union | Both import sets combined |
| 13 | `src/instrumentation.js` | Concatenate | Our markdown log + sr-cleanup scheduler + upstream catalogOverride + modelCatalogSync |
| 14 | `src/lib/db/repos/aliasRepo.js` | Semantic merge (2 hunks) | Hunk 1: upstream caps param + our source param. Hunk 2: upstream upsert logic + our source field spread |
| 15 | `src/lib/db/repos/settingsRepo.js` | Ours + export | Kept our deepMergeObject/CONFIG_MERGE_KEYS/MAP_REPLACE_KEYS/deepMergeNested, exported mergeWithDefaults |
| 16 | `src/sse/handlers/chat.js` | Semantic merge (2 hunks) | Hunk 1: both imports. Hunk 2: upstream stripModelContextMarker (let, not const) + our smartRouter vars |
| 17 | `tests/translator/__snapshots__/golden-url-header.test.js.snap` | Accept deletion | Upstream deleted; test file still exists but snapshot removed per upstream intent |

## Verification Results

### Syntax Validation (node --check)
All 11 critical resolved JS files: PASS

### Critical Local Features Present
| Feature | File | Count | Status |
|---------|------|-------|--------|
| circuit-breaker | open-sse/services/combo.js | 1 | OK |
| smartRouter | src/sse/handlers/chat.js | 18 | OK |
| 9router virtual provider | open-sse/providers/registry/index.js | 2 | OK |
| stripModelContextMarker | src/sse/handlers/chat.js | 2 | OK |
| source tracking | src/lib/db/repos/aliasRepo.js | 6 | OK |
| mergeWithDefaults exported | src/lib/db/repos/settingsRepo.js | 1 | OK |

### Must-Keep Commits Verified Intact
- 48bca50f (per-IP rate limiter) — no conflicts, untouched
- 34f518e4 / 06f735c6 (WAL PASSIVE node:sqlite+bun) — no conflicts, untouched
- failover-proxy.cjs packaging — staged pre-merge, auto-merged cleanly
- tray fixes — no conflicts, untouched
- combos work — no conflicts, untouched
- MCP auth — no conflicts, untouched

### Conflict Marker Scan
- Anchored `^<<<<<<<` / `^>>>>>>>`: 0 matches across all JS/TS/JSON/MD/gitignore
- Loose `=======`: 68 matches, ALL are `// ====` comment separators in cli/src/cli/api/client.js and other files — zero real conflict markers

### Risk Areas Assessed
- **usage.js**: Upstream split into per-provider sub-files (usage/github.js, usage/google.js, etc). Our additions merged via union of import sets. Syntax valid.
- **instrumentation.js**: Contains both our srComboCleanup scheduler AND upstream's installCatalogSource/startModelCatalogSync. All dynamic imports intact. Syntax valid.
- **Snapshot deletion**: golden-url-header.test.js.snap removed (upstream deleted it). Test file golden-url-header.test.js still exists at 3130 bytes — vitest will regenerate snapshot on next run if needed.
