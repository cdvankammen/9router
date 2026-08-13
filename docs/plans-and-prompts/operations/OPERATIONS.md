# Operations Runbook

**Date:** 2026-08-13
**Author:** Claude Code agent (main session, v1 branch)
**Status:** active
**Tags:** #operations #runbook #commands

Day-to-day run/build/deploy commands. Full detail lives in `CLAUDE.md` (repo root) — this is the operational quick-reference, not a duplicate.

## Dashboard + gateway (repo root)

```bash
cp .env.example .env
npm install
PORT=20128 NEXT_PUBLIC_BASE_URL=http://localhost:20128 npm run dev   # dev, port 20127 by default
npm run build && PORT=20128 HOSTNAME=0.0.0.0 npm run start           # production
```

- Default runtime port: **20128** (dashboard at `/dashboard`, API at `/v1`).
- Bun variants: `npm run dev:bun` / `build:bun` / `start:bun`.
- Lint: `npx eslint .`

## CLI package (`cli/`)

```bash
npm run cli:pack       # build + npm pack from root
cd cli && npm run dev  # nodemon watch
```

## Tests

```bash
npm install               # root deps first
cd tests && npm install   # then tests' own deps
npx vitest run             # all tests
npx vitest run unit/capabilities.test.js   # single file
```

Suite is **not** expected to be all-green — see `TESTING.md` and `CLAUDE.md`'s known-fails list. Judge regressions with `tests/__baseline__/verify-no-regression.mjs`, not a raw pass/fail count.

## Full runbooks

- `deployment-runbook.md` — full deployment steps
- `dialagram-setup-workflow.md` — Dialagram provider + smart-router integration setup

## Related

- `VERSIONING.md`, `RELEASE-CHECKLIST.md`, `TESTING.md`
- `CLAUDE.md` (repo root) — authoritative command reference
