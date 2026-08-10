# Learning: sr-* Combo Cleanup Scheduler Doesn't Auto-Start in Standalone Build

**Date:** 2026-08-07
**Author:** GitHub Copilot agent
**Status:** active
**Tags:** #learning #smart-router #cleanup #standalone #nextjs16

## Situation

The smart router creates dynamic `sr-*` combos. The optional cleanup sweep
(`src/sse/services/srComboCleanup.js`) is enabled via
`settings.srComboCleanup.enabled` and should start at boot via
`initializeApp()` (imported by `src/app/layout.js` → `bootstrap.js`).

## What Was Verified

1. **Selection logic works** — `selectStaleSmartCombos()` correctly identifies
   stale `sr-*` combos (older than TTL) and preserves normal combos. ✅
2. **Delete path works** — `DELETE /api/combos/:id` deletes successfully. ✅
3. **Scheduler code is bundled** — `SrComboCleanup` logic present in the
   standalone build chunks. ✅
4. **Scheduler does NOT auto-start** — no `[SrComboCleanup]` log lines appear
   in the console buffer or server stderr after boot, even after hitting
   `/dashboard` and `/landing`. ❌

## Root Cause

In the Next.js 16 standalone build, the bootstrap chunk (which imports
`initializeApp`) is **not referenced by any loaded page** — it's dead code
that gets tree-shaken. `src/app/layout.js` imports `@/shared/services/bootstrap`
as a side-effect, but the compiled layout doesn't load that chunk in the
standalone server context.

## Impact

- `sr-*` combos accumulate indefinitely unless manually deleted
- The UI toggle (`srComboCleanup.enabled`) persists but has no effect until
  the scheduler starts

## Fix Options

1. Move the bootstrap import to `src/instrumentation.js` (which IS loaded in
   standalone builds — it already starts the markdown log flusher there)
2. Start the scheduler from `custom-server.js` (the CLI entry point)
3. Start it lazily on first request (e.g., in the combos API route)

## Related

- `src/sse/services/srComboCleanup.js` — the scheduler module
- `src/shared/services/initializeApp.js` — deferred startup (3s) that starts it
- `src/shared/services/bootstrap.js` — the side-effect import
- `src/instrumentation.js` — where markdown flusher starts (works in standalone)
