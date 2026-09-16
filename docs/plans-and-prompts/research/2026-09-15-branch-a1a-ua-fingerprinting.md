# Branch Research — A1a: UA Fingerprinting (7-node subtree)

**Date:** 2026-09-15
**Author:** Claude Code agent (main session)
**Status:** active
**Tags:** #research #governance #source-tracking #ua-fingerprinting #binary-tree #branch-a1a

## Objective

Deep-dive the **User-Agent fingerprinting** subtree of the master research tree (`2026-09-15-master-research-tree.md`). Covers the existing `src/lib/sourceApps.js` rule engine (A1a1) and the spoofing-detection frontier (A1a2), down to L6 leaves.

```
A1a UA FINGERPRINTING
├─ A1a1: sourceApps.js rule engine
│  ├─ A1a1L: rule ordering & specificity
│  │  ├─ A1a1LL: regex precedence (most-specific-first)
│  │  └─ A1a1LR: fallback to DEFAULT_APP
│  └─ A1a1R: rule extensibility (addSourceAppRule)
│     ├─ A1a1RL: test-driven rule addition
│     └─ A1a1RR: UA cap at 300 chars
└─ A1a2: UA SPOOFING DETECTION
   ├─ A1a2L: UA consistency checks
   │  ├─ A1a2LL: UA vs header cross-check
   │  └─ A1a2LR: UA vs behavior cross-check
   └─ A1a2R: TLS fingerprinting (JA3/JA4)
      ├─ A1a2RL: JA3 hash of TLS handshake
      └─ A1a2RR: JA4 (post-QUIC era)
```

## Codebase grounding (what exists today)

### `src/lib/sourceApps.js` — the rule engine (A1a1)

- `UA_RULES` is an ordered array of `[regex, appName]` pairs. **Order matters: most specific first.** First match wins.
- Current rules (in order): Claude Code (`/claude[-_ ]code\//i`, `/claude-code/i`), Cursor (`/cursor\//i`), Codex CLI (`/codex-cli|codex\//i`, `/codex[ _-]?droid|droid[ _-]?codex/i`), GitHub Copilot (`/githubcopilot|copilot-chat/i`), OpenAI JS SDK (`/openai\/js/i`), OpenAI Python SDK (`/openai\/python/i`), LangChain (`/langchainjs|langchain\//i`), Vercel AI SDK (`/vercel-ai-sdk|ai-sdk/i`), Open WebUI (`/openwebui/i`), LiteLLM (`/litellm/i`), LobeChat (`/lobechat/i`), Cherry Studio (`/cherrystudio/i`), LibreChat (`/librechat/i`), JetBrains (`/pycharm|jetbrains/i`), Continue (`/continue\//i`), curl (`/^curl\//i`), Node fetch (`/node-fetch|undici/i`), axios (`/axios/i`), Postman (`/postman/i`), Insomnia (`/insomnia/i`), Hoppscotch (`/hoppscotch/i`), 9Router (`/9router/i`).
- `DEFAULT_APP = "unknown"` — the fallback when nothing matches (A1a1LR).
- `fingerprintSourceApp(userAgent)` caps input at **300 chars** before matching (A1a1RR) — a deliberate guard against pathological UA strings and memory abuse.
- `addSourceAppRule(re, app)` — programmatic rule addition for tests and future plugins (A1a1R).
- **Privacy stance (critical design constraint):** the raw UA is *never persisted* — only the derived class. A raw UA can fingerprint an individual's exact toolchain; the class cannot.

### Where it's used

- Referenced by the governance research as the identity signal for gate level L1 (UA gate) and as an input to profile resolution (L3 profile gate).
- Currently NOT wired into request handling for gating — it's a fingerprinting utility awaiting consumers.

## External research

### A1a1LL — Regex precedence (most-specific-first)

- Industry practice (WAFs, bot detection, UA parsers like `ua-parser-js`, `useragent`): **longest/most-specific match wins**, and rules are ordered so that compound UAs (e.g. `Claude-Code/1.0 (curl 8.4.0)`) hit the app rule before the generic tool rule.
- The existing rule set already encodes this: `claude-code` before `curl`, `codex-cli` before generic `node-fetch`.
- Risk: a UA containing multiple app markers (e.g. an agent built on the OpenAI SDK that appends its own token) resolves to whichever rule is listed first. Documented behavior, not a bug — but worth a comment in the registry.

### A1a1LR — DEFAULT_APP fallback

- `"unknown"` is the correct default for a governance system: **unknown identity ⇒ strictest default policy** (mirrors OpenRouter's `unknown` app attribution and LiteLLM's default profile).
- Gotcha: `"unknown"` is also what you get for *legitimate* new tools. The dashboard should distinguish "unknown (new tool)" from "unknown (spoofed)" via the A1a2 checks.

### A1a1RL — Test-driven rule addition

- `tests/` has an independent vitest package; `addSourceAppRule` exists precisely so tests can register throwaway rules without polluting the registry.
- Convention: every new UA rule should ship with a positive test (real UA string from the tool), a negative test (similar-but-different UA), and an ordering test (compound UA resolves to the app, not the transport).

### A1a1RR — 300-char cap

- Rationale: UA strings are attacker-controlled; unbounded regex matching on a 10 KB UA is a DoS vector. 300 chars covers every real client (longest real-world UAs ~200 chars).
- Edge: truncation can *lose* the app marker if the marker sits past 300 chars — acceptable, since real clients put their token early. Documented tradeoff.

### A1a2LL — UA vs header cross-check

- Industry: bot-detection vendors (Cloudflare, DataDome) cross-check `User-Agent` against `Accept`, `Accept-Language`, `Accept-Encoding`, `Sec-CH-UA` (Client Hints), and `Sec-Fetch-*` headers. A curl UA with a browser's `Sec-Fetch-Site: same-origin` is anomalous.
- Cheap signals for 9router: `Sec-CH-UA` (Chromium client hints — a real browser sends both `User-Agent` and `Sec-CH-UA`; a spoofed browser UA from curl sends neither), `Sec-Fetch-*` presence, `Accept` profile (curl sends `*/*`; SDKs send `application/json`).
- Confidence: medium — these are heuristics, not proof. A determined spoofer sets all headers.

### A1a2LR — UA vs behavior cross-check

- Behavioral consistency: a "Claude Code" UA that never sends `x-claude-code-session-id` and never uses tool-call shapes is suspicious; a "curl" UA that streams SSE with `stream: true` and tool blocks is definitely not curl.
- This is the bridge to branch A2b (behavioral fingerprints): behavior is harder to fake than a header.

### A1a2RL — JA3 (TLS fingerprint)

- JA3 = MD5 hash of the TLS ClientHello's key fields: TLS version, cipher suites, extensions, elliptic curves, EC point formats. Produces a stable "fingerprint" of the TLS stack.
- Reality check for 9router: **JA3 requires terminating TLS at the gateway.** 9router is a local HTTP gateway (Next.js on localhost:20128) — TLS is usually terminated by the client's own stack or a reverse proxy *before* 9router sees the connection. JA3 is only available if 9router sits behind its own TLS terminator (e.g. the CLI's failover-proxy or a reverse proxy with TLS).
- Even then: JA3 identifies the *TLS library* (OpenSSL, BoringSSL, Go, Rustls), not the app. Claude Code and curl both use the system OpenSSL → same JA3. **JA3 cannot distinguish apps; it can only flag "this TLS stack doesn't match the claimed UA's usual stack."**
- Confidence: high on the mechanics, low on usefulness for this project.

### A1a2RR — JA4 (post-QUIC era)

- JA4 (FoxIO, 2023) is the successor: more granular, includes SNI, ALPN, HTTP version, QUIC support; JA4H/JA4S for HTTP/SSH. Designed to survive the QUIC/HTTP3 transition where JA3 breaks.
- Same fundamental limitation as JA3 for 9router: needs TLS visibility; identifies TLS stacks, not apps.
- Verdict for the tree: **record as "future / out of scope"** — the L5 gate (mTLS) is the stronger TLS-based identity anyway, and it doesn't need fingerprinting.

## Synthesis — design space for 9router

1. **A1a1 (rule engine) is done and correct.** The only improvements: (a) comment the ordering contract in the registry, (b) add the compound-UA ordering tests, (c) consider a `UA_RULES` export for dashboard display.
2. **A1a2 (spoofing detection) is a new capability** with three tiers of cost:
   - Tier 1 (cheap, now): header cross-checks (`Sec-CH-UA`, `Sec-Fetch-*`, `Accept`) → flag `suspicious` alongside the app class.
   - Tier 2 (medium): behavior cross-checks via existing telemetry (session-id header presence, tool-use shapes) → flag `inconsistent`.
   - Tier 3 (expensive, likely out of scope): JA3/JA4 TLS fingerprinting — needs TLS termination at the gateway and still only identifies TLS stacks.
3. **Governance integration:** the app class + a `spoofScore` (0–1) feeds profile resolution (B6b2) and gate levels (B6b1): a spoofed UA should *downgrade* the profile, never upgrade it.

## Confidence levels

| Finding | Confidence |
|---------|-----------|
| Rule engine design (ordered, most-specific-first, 300-char cap) is sound | High |
| Raw UA must never be persisted (privacy) | High |
| Header cross-checks are cheap and useful | Medium |
| JA3/JA4 identify TLS stacks, not apps | High |
| JA3/JA4 useful in 9router's local-HTTP topology | Low |

## Open questions

1. Should `spoofScore` be computed per-request (cheap headers only) or per-session (accumulate behavior evidence)?
2. Does the CLI's failover-proxy terminate TLS today? (If yes, JA3 becomes *possible*; still probably not worth it.)
3. Should "unknown" be split into `unknown-new` vs `unknown-suspicious` in the dashboard?

## Sources

- Code: `src/lib/sourceApps.js` (read in prior research), `tests/` conventions (CLAUDE.md)
- Prior research: `2026-08-31-message-origin-and-destination-research.md`, `2026-09-14-keyless-governance-research.md`
- Industry: Cloudflare bot-management docs (JA3/JA4 usage), FoxIO JA4 spec (fetch attempt 404'd — mechanics from established knowledge, confidence noted above), ua-parser-js conventions