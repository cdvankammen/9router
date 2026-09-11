# Fix: cli/package.json — add failover-proxy.cjs to npm package

**Date:** 2026-09-09
**Card:** t_c361b0e3 (execution), t_81b1f8de (design)
**Status:** COMPLETE — verified via npm pack --dry-run

## Change

```diff
--- cli/package.json (before)
"files": ["cli.js", "src", "hooks", "app", "README.md", "LICENSE"]

+++ cli/package.json (after)
"files": ["cli.js", "src", "hooks", "app", "README.md", "LICENSE", "failover-proxy.cjs"]
```

## Verification

```bash
cd /Users/chris/Documents/GitHub/9router/cli && npm pack --dry-run 2>&1 | grep -i failover
# Output: npm notice 10.0kB failover-proxy.cjs  ← NOW IN PACKAGE
```

## Impact

- Fresh `npm install -g 9router` will now include `failover-proxy.cjs` at `~/.local/lib/node_modules/9router/failover-proxy.cjs` (package root, NOT `cli/app/`)
- Future plist generation must reference `cli/failover-proxy.cjs` (package root) NOT `cli/app/failover-proxy.cjs` (never existed)
- Does NOT auto-fix existing broken plists on mini/mini2/mini3 — those were already cleaned/removed
- L2 failover proxy (standalone node-DOWN protection) is now shippable if/when HA between hosts is wanted again

## Next steps (if HA is re-enabled)

1. Rebuild CLI package: `npm run pack:cli`
2. Reinstall on hosts: `npm install -g ./9router-0.5.50.tgz`
3. Regenerate plists with correct path: `~/.local/lib/node_modules/9router/failover-proxy.cjs`
4. Configure peerNodes in settings (per 25-node-failover-implementation.md)

