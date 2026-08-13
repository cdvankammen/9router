# Security

**Date:** 2026-08-13
**Author:** Claude Code agent (main session, v1 branch)
**Status:** active
**Tags:** #security #index

Security posture notes: secrets handling, env-var contract, IP-trust boundary, and the hard rule for this whole knowledge base.

## Contents

| File | Covers |
|------|--------|
| `SECURITY.md` | Secrets/env contract, IP-trust boundary, what never gets committed |

## The one rule that overrides everything else in this folder

**Never put a real API key, token, password, private URL, or personal data in a doc, template, screenshot, or commit message in this repository.** Not even in `temp/` — that folder is gitignored today, but gitignore rules are not a substitute for judgment. If you need to reference a real credential while documenting something, redact it (`sk-...REDACTED`) or point to the `.env` var name instead of the value.

## Conventions

Same as [`../README.md`](../README.md).
