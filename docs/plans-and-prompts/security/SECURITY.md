# Security Guide

**Date:** 2026-08-13
**Author:** Claude Code agent (main session, v1 branch)
**Status:** active
**Tags:** #security #secrets #env

## The rule for this whole knowledge base

**Never include a real API key, token, password, private URL, or personal data in a doc, template, screenshot, or commit message.** This applies everywhere in `docs/plans-and-prompts/`, including `temp/` — gitignored is not the same as safe. Redact before writing (`sk-...REDACTED`, `<your-key-here>`), or reference the `.env` variable name instead of a value.

`temp/dialagram-credentials.md` is a known existing example of a file that assumes gitignore protection for a live-looking key. It genuinely is gitignored (`/docs/plans-and-prompts/temp/` and `/docs/plans-and-prompts/temp/**` in `.gitignore`, confirmed untracked via `git check-ignore`/`git log --all`) and is intentionally left out of this reorg's migration — it's scratch space, not a tracked knowledge-base doc. Don't copy its contents into any tracked file.

## Env-var contract (see `.env.example` for the full, current list)

| Var | Purpose |
|---|---|
| `JWT_SECRET` | Session cookie signing — **must** override the default |
| `INITIAL_PASSWORD` | Default is `123456` — **must** override before any non-local use |
| `API_KEY_SECRET` | Endpoint-proxy API key secret |
| `MACHINE_ID_SALT` | Endpoint-proxy salt |
| `DATA_DIR` | SQLite data directory (see `CLAUDE.md`'s "Persistence" note — `db.json` is stale) |
| `REQUIRE_API_KEY` / `AUTH_COOKIE_SECURE` | Auth hardening toggles |

Full contract lives in `.env.example` and `docs/ARCHITECTURE.md` §"Environment and Runtime Matrix" — don't duplicate the full table here; it drifts.

## IP-trust boundary

`custom-server.js` wraps the Next standalone server to derive the client IP from the raw TCP socket and strips attacker-controlled `X-Forwarded-For` — it only trusts forwarding headers from a loopback reverse proxy. Any change touching request/IP/rate-limit code must preserve this. See `docs/ARCHITECTURE.md` §"Security-Sensitive Boundaries".

## Binary/protobuf upstreams

kiro (EventStream), cursor (protobuf), and commandcode (NDJSON) don't round-trip through the OpenAI-pivot translator — they're handled inside their own executor. Not a security boundary per se, but a place where "just run it through the translator" is the wrong fix.

## Related

- `docs/ARCHITECTURE.md` §"Security-Sensitive Boundaries", §"Environment and Runtime Matrix"
- `.env.example`
- `../planning/hardening-roadmap.md`
- `../connections/CONNECTIONS.md`
