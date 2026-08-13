# Release Checklist

**Date:** 2026-08-13
**Author:** Claude Code agent (main session, v1 branch)
**Status:** active
**Tags:** #operations #release #checklist

Steps before cutting a release of either the dashboard/gateway or the `cli/` package. Not a substitute for judgment — skip steps that don't apply, but don't skip them silently; note why in the release's `tracking/CHANGELOG.md` entry.

## Before releasing

- [ ] `npx eslint .` clean
- [ ] `cd tests && npx vitest run` — compare against `tests/__baseline__/verify-no-regression.mjs`, not raw pass/fail count
- [ ] Regression baselines re-verified if provider registry / alias logic changed (`tests/__baseline__/verify-*.mjs`)
- [ ] Repo root `CHANGELOG.md` updated with user-facing entries
- [ ] `../tracking/CHANGELOG.md` and `../tracking/TASKS.md` updated with the internal narrative
- [ ] Version bump on the correct package (root `9router-app` vs. `cli/9router` — see `VERSIONING.md`) — never assume both need bumping
- [ ] `.env.example` still matches actual runtime env usage (no drift from new/removed vars)
- [ ] For UI changes: exercised in a real browser, not just type-checked/tested (see `../ui-ux/UI-UX.md`)
- [ ] No real secrets in any doc/commit touched this cycle (see `../security/SECURITY.md`)

## Related

- `VERSIONING.md`, `OPERATIONS.md`, `TESTING.md`
- `../security/SECURITY.md`
