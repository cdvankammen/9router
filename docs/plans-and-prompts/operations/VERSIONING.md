# Versioning

**Date:** 2026-08-13
**Author:** Claude Code agent (main session, v1 branch)
**Status:** active
**Tags:** #operations #versioning #changelog

## Two independently-versioned packages

- Root `package.json` (`9router-app`) — the dashboard + gateway.
- `cli/package.json` (`9router`) — the CLI launcher published to npm, with its own version and build.

Bumping one does **not** imply bumping the other. Check which package a change actually affects before touching either `version` field.

## Changelog discipline

- **Repo root `CHANGELOG.md`** — user-facing release notes. Update this for anything a real user/operator would notice (new feature, behavior change, fix affecting them).
- **`../tracking/CHANGELOG.md`** (this knowledge base) — internal dev/session changelog for this knowledge base's subject matter. Update this for the "what changed and why" narrative, even for changes too internal for the user-facing log.

These are different documents for different audiences — don't conflate them, and don't skip the root one because you updated the tracking one.

## Commit style

Conventional Commits: `fix(translator): …`, `feat(providers): …`, etc. — see root `CLAUDE.md`.

## Related

- `RELEASE-CHECKLIST.md`
- `../tracking/CHANGELOG.md`
- repo root `CHANGELOG.md`
