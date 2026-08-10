# Learning: Stale Server Serves Old Build → ChunkLoadError + Build Corruption

**Date:** 2026-08-08
**Author:** GitHub Copilot agent (main session)
**Status:** active
**Tags:** #learning #build #nextjs #standalone #debugging

## Symptom

After a rebuild, `/dashboard/messages` shows "This page couldn't load" with a
`ChunkLoadError: Loading chunk 7374 failed` — the browser requests
`page-<hash>.js` but the server returns 404, even though the file exists on
disk.

## Root Cause (two variants)

1. **Stale server process**: a long-running `node server.js` (or tray-spawned
   server) keeps serving the OLD build's chunk manifest from memory. When the
   `.next` is rebuilt with new chunk hashes, the running process still serves
   the old manifest → browser asks for old hash → 404 → ChunkLoadError.
   **Fix: kill the server BEFORE rebuilding, or restart it AFTER every build.**

2. **Interrupted build → corrupted standalone**: if `next build` is killed
   mid-write (or `copy-standalone-assets` fails), `.next/standalone` can be
   missing chunks → "client reference manifest for route /dashboard does not
   exist" or "Cannot find module ./chunks/NNNN.js". **Fix: `rm -rf .next` and
   rebuild clean.**

## Detection

- `curl` the requested chunk URL — if 404 while the file exists on disk, it's a stale process.
- Server log: "Cannot find module './chunks/4037.js'" or "client reference manifest ... does not exist" → corrupted build.
- Check `ps -o lstart` of the server vs the `.next` mtime.

## Prevention

1. **Always kill the server before `next build`** (or restart after).
2. After rebuild, always `node scripts/copy-standalone-assets.mjs`.
3. Verify with a chunk curl: `curl -s -o /dev/null -w '%{http_code}' '<chunk-url>'` should be 200.
4. If the browser still shows old chunks, hard-reload (cache-bust) or open a fresh tab.

## Related

- The tray app spawns servers detached (`cli.js --tray`) — those survive terminal
  close but NOT rebuilds; always `pkill -f 'cli.js --tray'` before rebuilding.
- Commits affected: 2b20618b, 79c457e6, 0194d065, 330d7230 (all required a
  kill+restart to serve correctly).
