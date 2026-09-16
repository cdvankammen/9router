# Branch Research — B6a: Cooperative Identity (7-node subtree)

**Date:** 2026-09-15
**Author:** Claude Code agent (main session)
**Status:** active
**Tags:** #research #governance #identity #agent-identity #headers #binary-tree #branch-b6a

## Objective

Deep-dive the **cooperative identity** subtree: client-supplied headers (B6a1) and agent config integration (B6a2), down to L6 leaves.

```
B6a COOPERATIVE IDENTITY
├─ B6a1: CLIENT-SUPPLIED HEADERS
│  ├─ B6a1L: X-9R-App (validated)
│  │  ├─ B6a1LL: known-app list
│  │  └─ B6a1LR: unknown → unknown
│  └─ B6a1R: OpenRouter app attribution
│     ├─ B6a1RL: HTTP-Referer + X-OpenRouter-Title
│     └─ B6a1RR: X-OpenRouter-Categories
└─ B6a2: AGENT CONFIG INTEGRATION
   ├─ B6a2L: Claude Code settings
   │  ├─ B6a2LL: ~/.claude/settings.json env
   │  └─ B6a2LR: ANTHROPIC_BASE_URL pattern
   └─ B6a2R: MCP client info
      ├─ B6a2RL: JSON-RPC layer identity
      └─ B6a2RR: no standard HTTP identity
```

## Codebase grounding

- `src/lib/sourceApps.js` — the known-app list (UA classes). This is the validation source for `X-9R-App` (B6a1LL).
- The phase-1 plan (M7) proposed `X-9R-App` / `X-9R-User` / `X-9R-Session` trusted post-auth (A1b1LL).
- 9router is OpenAI-compatible at `/v1/*` — agents point their base URL at it (e.g. `ANTHROPIC_BASE_URL` for Claude Code, `OPENAI_BASE_URL` for OpenAI SDK clients).

## External research

### B6a1L — X-9R-App (validated)

- **B6a1LL — known-app list:** `X-9R-App` values must be in the known-app list (the `sourceApps.js` classes + profile names). This is the "cooperative" part: the client *tells* us who it is, and we *validate* it against what we know.
- **B6a1LR — unknown → unknown:** an unrecognized `X-9R-App` value is treated as `unknown` (never as a privileged app). This is the same rule as A1b1LR — validation is the trust boundary.

### B6a1R — OpenRouter app attribution

- **B6a1RL — HTTP-Referer + X-OpenRouter-Title:** OpenRouter's standard attribution headers (phase 2 research). `HTTP-Referer` = app URL; `X-OpenRouter-Title` = app name. OpenRouter uses these for analytics and app-specific features (e.g. app-specific rate limits).
- **B6a1RR — X-OpenRouter-Categories:** comma-separated categories (e.g. `coding,chat`) for app classification. OpenRouter also has `X-OpenRouter-App-Visibility` (public/private).
- 9router implication: support OpenRouter's headers as *aliases* — a client that already sends `X-OpenRouter-Title` gets its app class derived from it (validated against known apps). This makes 9router a drop-in for OpenRouter-configured clients.

### B6a2L — Claude Code settings

- **B6a2LL — ~/.claude/settings.json env:** Claude Code's settings file supports `env` blocks — users can set `ANTHROPIC_BASE_URL` and custom headers there. This is how a user points Claude Code at 9router.
- **B6a2LR — ANTHROPIC_BASE_URL pattern:** Claude Code sends `x-claude-code-session-id` and its UA (`claude-code/...`) automatically. So 9router gets cooperative identity from Claude Code *for free* via UA (A1a) + session header (A2a2RL) — no config needed.
- The settings.json `env` block can also set custom headers (e.g. `X-9R-App: claude-code`) — but the UA already covers it.

### B6a2R — MCP client info

- **B6a2RL — JSON-RPC layer identity:** MCP (Model Context Protocol) is JSON-RPC over stdio/HTTP. MCP clients can send `clientInfo` (name + version) in the initialize handshake — but that's at the MCP layer, not the HTTP layer.
- **B6a2RR — no standard HTTP identity:** when an MCP client (e.g. a desktop app) proxies to an LLM gateway, the HTTP request carries the *MCP client's* UA/headers, not the MCP server's identity. There's no standard for MCP-layer identity to reach the HTTP layer. 9router would need a convention (e.g. an `X-9R-App` header set by the MCP proxy) — cooperative, validated.

## Synthesis — design space

1. **Cooperative identity protocol:**
   - `X-9R-App` (validated against known apps + profiles), `X-9R-User` (validated format), `X-9R-Session` (validated format). Trusted post-auth or from trusted subnet (A1b1LL).
   - OpenRouter header aliases: `X-OpenRouter-Title` → app class (validated), `HTTP-Referer` → app URL (logged, not trusted).
   - Unknown values → `unknown` app class (never privileged).
2. **Agent integration docs:** a "point your agent at 9router" guide:
   - Claude Code: `ANTHROPIC_BASE_URL` (UA + session header auto-sent — zero config).
   - OpenAI SDK clients: `OPENAI_BASE_URL` (UA auto-sent).
   - Custom agents: set `X-9R-App` + `X-9R-User` headers (documented convention).
   - MCP proxies: set `X-9R-App` on behalf of the MCP server (documented convention).
3. **Dashboard:** show the resolved identity chain per request: UA class → header claims → profile → gate level. This makes cooperative identity auditable.

## Confidence levels

| Finding | Confidence |
|---------|-----------|
| Validated cooperative headers are the right trust model | High |
| OpenRouter header aliases make 9router a drop-in | High |
| Claude Code sends identity for free (UA + session header) | High |
| MCP has no standard HTTP identity (needs convention) | High |

## Open questions

1. Should `X-9R-App` accept OpenRouter's `X-OpenRouter-Title` values directly (e.g. "Claude Code") or only 9router's own class names?
2. Should the cooperative headers be documented in a public API reference (gitbook) or internal-only?
3. Does the user want per-app *profiles* auto-created from cooperative identity (e.g. first-seen Claude Code → auto-profile), or explicit admin creation only?

## Sources

- Code: `src/lib/sourceApps.js` (known-app list), phase-1 M7 trusted headers
- Prior research: `2026-08-31-message-origin-and-destination-research.md` (M7), `2026-09-14-keyless-governance-research.md`
- Industry: OpenRouter app-attribution docs (phase 2 fetch), Claude Code settings.json docs, MCP spec (clientInfo)