# tempDelete Origin Investigation

**Date:** 2026-09-10 | **Status:** research-in-progress
**Location:** mini2 `~/Downloads/tempDelete/`

## Contents (verified via SSH 2026-09-10)

| Path | Date | Size | Purpose |
|------|------|------|---------|
| `9Router-fixed.app/` | Sep 2 20:18 | dir | Fix attempt for tray/freeze |
| `9Router.app.bak/` | Sep 3 09:46 | dir | Backup of original .app |
| `9router-data/` | Aug 18 12:15 | dir | Data/config backup |
| `.DS_Store` | Sep 9 | 10KB | macOS metadata |

## Hypothesis: 9Router-fixed.app = tray-on-boot fix attempt

The dates align:
- Aug 18 — `9router-data` created → earliest session with 9router on mini2
- Sep 2 — `9Router-fixed.app` created → attempt to make tray work correctly
- Sep 3 — `9Router.app.bak` created → original replaced with "fixed" version

The `9a2987c3` commit (docs: mini2 full app tray icon Rosetta fix) is dated same timeframe. The "fix" was likely:
1. Build `dist/9Router.app` with `npm run build-cli` (shell launcher)
2. The app didn't show in menu bar → tried to fix the .app bundle
3. Created `9Router-fixed.app` with modified launcher or plist
4. When the Rosetta/Node-arm64 issue was found (commit 9a2987c3), the fix became the standard
5. Original saved as `9Router.app.bak`, `9router-data` as config backup

## Cross-reference: what 9Router-fixed.app might contain

From build-cli.js (the .app build system):
- `dist/9Router.app/Contents/MacOS/9router-launcher` = shell script: exec node custom-server.js --tray
- `dist/9Router.app/Contents/Info.plist` = CFBundleIdentifier com.9router.app, NSHighResolutionCapable=true
- `dist/9Router.app/Contents/Resources/app/` = full standalone Next.js build + node_modules

The "fix" likely modified the Info.plist (add LSUIElement=true or LSBackgroundOnly) or the launcher script (add PATH or node args). Neither was committed to git — was a local workaround.

## Decision needed

1. **9router-data/** — preserve or archive? (contains config/state backup)
2. **9Router-fixed.app/** + **9Router.app.bak/** — these were local fix attempts, likely superseded by research in 30-tray-freeze-root-cause-fix.md. Can archive to ~/Documents/hermesResearch/9router/V2/research/ for reference.
3. **DELETE:** requires explicit user consent (current status: NOT deleted)

## Source: chat-log research

- Searched: `d4294fc8-49e9-46b3-95f5-3b1625d0acb2.md` (primary 9router session log, 1.2MB)
- Found references to: `.app bundle`, tray icon, `9Router.app`, build process
- The session log confirms: attempted to make tray icon work on mini2, used `npm run build-cli` to produce `dist/9Router.app`, ran into Node arm64/Rosetta issues

## Deliverable

Write this doc to both:
- `docs/plans-and-prompts/research/9router/35-tempdelete-origin.md`
- `~/Documents/hermesResearch/9router/V2/research/35-tempdelete-origin.md`
