# MERGE-12 Conflict Report — origin/master into merge-upstream-20260910

Generated: 2026-09-11
MERGE_HEAD (origin/master): 17c4cc76877bd1755030a8414f8d0083f48dcccf
Local HEAD before merge: a0650fda (feat(merge-prep): stage all local work for upstream merge)
Merge base: 15223724c3e1ad898e84ef6e0cc1686cbafc8290
Branch: merge-upstream-20260910
Status: MERGE IN PROGRESS — 17 unmerged paths, STOPPED per task directive.

## Must-Keep Verification

All must-keep commits are ancestors of the merge branch and NOT in any conflicted file:
- 48bca50f (per-IP rate limiter) — cli/src/cli/tray/tray.js, custom-server.js — NO CONFLICTS
- 34f518e4 (WAL PASSIVE node:sqlite+bun) — src/lib/db/index.js — NO CONFLICTS
- 06f735c6 (WAL PASSIVE original) — src/lib/db/index.js — NO CONFLICTS
- failover-proxy.cjs packaging — cli/scripts/build-cli.js — staged, no conflict
- tray fixes — cli/hooks/trayRuntime.js, cli/src/cli/tray/tray.js — NO CONFLICTS
- combos work — src/app/(dashboard)/dashboard/combos/* — NO CONFLICTS
- MCP auth — src/app/api/mcp/[plugin]/* — NO CONFLICTS

## Conflicted Files (17 total)

### 1. .gitignore (118 lines, 1 conflict region L91-118)
- OURS: added dist/, data.sqlite, .next-cli-build entries
- THEIRS: added different ignore patterns from upstream v0.5.69-v0.5.75
- Resolution needed: combine both sets of ignores

### 2. CHANGELOG.md (832 lines, 1 conflict region L1-289)
- OURS: local changelog entries for custom features
- THEIRS: upstream release notes v0.5.69 through v0.5.75
- Resolution needed: prepend theirs, keep ours below

### 3. open-sse/handlers/chatCore.js (532 lines, 2 conflict regions L64-68, L377-391)
- OURS: custom error handling, combo routing additions
- THEIRS: upstream tool-type defaulting fixes (#3905), qoder usage plumbing revert
- Resolution needed: merge both — our combo logic + their tool-type fixes

### 4. open-sse/handlers/chatCore/nonStreamingHandler.js (420 lines, 1 conflict region L309-323)
- OURS: local non-stream response handling
- THEIRS: upstream changes to response envelope
- Resolution needed: integrate both

### 5. open-sse/handlers/chatCore/streamingHandler.js (188 lines, 1 conflict region L47-51)
- OURS: local stream modifications
- THEIRS: upstream stream fixes
- Resolution needed: small hunk, combine both

### 6. open-sse/providers/capabilities.js (505 lines, 1 conflict region L130-145)
- OURS: added custom provider capabilities
- THEIRS: upstream capability additions for new providers
- Resolution needed: union of both capability sets

### 7. open-sse/providers/registry/index.js (258 lines, 2 conflict regions L123-130, L251-257)
- OURS: registered local providers (xquik, ollama-search, etc.)
- THEIRS: registered upstream providers (xiaomi-mimo merged, standalone Qwen, etc.)
- Resolution needed: union of both registries, deduplicate

### 8. open-sse/services/usage.js (93 lines, 2 conflict regions L17-24, L66-72)
- OURS: local usage tracking additions
- THEIRS: upstream usage service refactoring (split into usage/*.js files)
- Resolution needed: THEIRS likely supersedes — upstream split usage.js into per-provider files. Verify our additions aren't lost.

### 9. open-sse/utils/stream.js (556 lines, 2 conflict regions L413-423, L498-518)
- OURS: local stream utility modifications
- THEIRS: upstream stream fixes
- Resolution needed: careful merge of both stream logic changes

### 10. src/app/(dashboard)/dashboard/providers/[id]/page.js (2164 lines, 3 conflict regions L26-31, L91-100, L1445-1474)
- OURS: local dashboard UI changes for providers
- THEIRS: upstream dynamic mode label, provider page updates
- Resolution needed: largest conflict file, needs careful UI merge

### 11. src/app/(dashboard)/dashboard/providers/page.js (1097 lines, 2 conflict regions L109-113, L406-460)
- OURS: local provider list page changes
- THEIRS: upstream provider list updates
- Resolution needed: combine both UI changes

### 12. src/app/api/providers/[id]/models/route.js (652 lines, 1 conflict region L14-18)
- OURS: local model route modifications
- THEIRS: upstream model route changes
- Resolution needed: small hunk, combine

### 13. src/instrumentation.js (40 lines, 1 conflict region L5-38)
- OURS: local instrumentation setup
- THEIRS: upstream instrumentation changes
- Resolution needed: most of file is conflict, need to understand both intents

### 14. src/lib/db/repos/aliasRepo.js (112 lines, 2 conflict regions L32-39, L44-59)
- OURS: local alias repo modifications
- THEIRS: upstream alias repo changes
- Resolution needed: DB layer — must preserve our WAL-related patterns

### 15. src/lib/db/repos/settingsRepo.js (257 lines, 1 conflict region L118-190)
- OURS: local settings repo changes (large diff ~70 lines)
- THEIRS: upstream settings repo changes
- Resolution needed: large conflict region, careful merge needed

### 16. src/sse/handlers/chat.js (428 lines, 2 conflict regions L26-30, L55-65)
- OURS: local SSE chat handler changes
- THEIRS: upstream SSE handler changes
- Resolution needed: combine both handler modifications

### 17. tests/translator/__snapshots__/golden-url-header.test.js.snap (1849 lines, deleted by them)
- OURS: kept snapshot file
- THEIRS: deleted this snapshot
- Resolution needed: if upstream removed the test, we can accept deletion; if our local tests still reference it, keep it.

## Summary

- Total conflicted files: 17
- Total conflict regions: ~30
- Largest conflicts: providers/[id]/page.js (3 regions, 2164 lines), settingsRepo.js (70-line region), CHANGELOG.md (289-line region)
- Risk areas: open-sse/services/usage.js (upstream refactored into sub-files, our additions may be orphaned), instrumentation.js (most of file is conflict)
- Safe files: All must-keep commits touch files NOT in the conflict list

## Next Steps Required

Per task directive: "If conflicts stop + document" — STOPPED HERE.
Conflicts documented. Merge is paused mid-flight.
To resume: resolve each conflict manually, git add, git commit.
To abort: git merge --abort (returns to pre-merge state on merge-upstream-20260910).
