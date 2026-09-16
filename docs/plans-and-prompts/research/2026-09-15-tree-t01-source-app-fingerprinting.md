# Tree T1 — Source-App Fingerprinting (6-level binary tree, 127 nodes)

**Date:** 2026-09-15
**Author:** Claude Code agent (main session)
**Status:** active
**Tags:** #research #tree #binary-tree #source-apps #fingerprinting #t01

## Objective

Full 6-level binary tree expansion of the **source-app fingerprinting** topic (`src/lib/sourceApps.js`, from `2026-08-31-message-origin-and-destination-research.md` Part A.1). Every node researched: codebase grounding, external research, or design note.

## The tree (127 nodes, path notation)

```
L0: Source-app fingerprinting
├─ L1L: Rule engine (sourceApps.js)
│  ├─ L2LL: Rule structure
│  │  ├─ L3LLL: UA_RULES array
│  │  │  ├─ L4LLLL: regex pairs
│  │  │  │  ├─ L5LLLLL: pattern syntax
│  │  │  │  │  ├─ L6LLLLLL: literal vs regex
│  │  │  │  │  └─ L6LLLLLR: flags (i)
│  │  │  │  └─ L5LLLLR: case-insensitivity
│  │  │  │     ├─ L6LLLLRL: /i flag
│  │  │  │     └─ L6LLLLRR: mixed-case UAs
│  │  │  └─ L4LLLR: ordering
│  │  │     ├─ L5LLLRL: most-specific-first
│  │  │     │  ├─ L6LLLRLL: compound UAs
│  │  │     │  └─ L6LLLRLR: app before transport
│  │  │     └─ L5LLLRR: first-match-wins
│  │  │        ├─ L6LLLRRL: return early
│  │  │        └─ L6LLLRRR: no backtracking
│  │  └─ L3LLR: Matching semantics
│  │     ├─ L4LLRL: substring vs full
│  │     │  ├─ L5LLRLL: partial match
│  │     │  │  ├─ L6LLRLLL: contains
│  │     │  │  └─ L6LLRLLR: false positives
│  │     │  └─ L5LLRLR: anchored rules
│  │     │     ├─ L6LLRLRL: ^curl
│  │     │     └─ L6LLRLRR: exact prefix
│  │     └─ L4LLRR: cap 300 chars
│  │        ├─ L5LLRRL: DoS guard
│  │        │  ├─ L6LLRRLL: unbounded regex
│  │        │  └─ L6LLRRLR: memory bound
│  │        └─ L5LLRRR: truncation edge
│  │           ├─ L6LLRRRL: marker past cap
│  │           └─ L6LLRRRR: acceptable loss
│  └─ L2LR: App classes
│     ├─ L3LRL: Known apps
│     │  ├─ L4LRLL: agent apps
│     │  │  ├─ L5LRLLL: Claude Code
│     │  │  │  ├─ L6LRLLLL: claude-code UA
│     │  │  │  └─ L6LRLLLR: claude-cli variant
│     │  │  └─ L5LRLLR: Cursor/Codex
│     │  │     ├─ L6LRLLRL: cursor UA
│     │  │     └─ L6LRLLRR: codex-cli UA
│     │  └─ L4LRLR: SDK/tool apps
│     │     ├─ L5LRLRL: OpenAI SDKs
│     │     │  ├─ L6LRLRLL: openai/js
│     │     │  └─ L6LRLRLR: openai/python
│     │     └─ L5LRLRR: HTTP tools
│     │        ├─ L6LRLRRL: curl/node-fetch
│     │        └─ L6LRLRRR: postman/insomnia
│     └─ L3LRR: Unknown default
│        ├─ L4LRRL: DEFAULT_APP
│        │  ├─ L5LRRLL: "unknown" class
│        │  │  ├─ L6LRRLLL: no match
│        │  │  └─ L6LRRLLR: new tools
│        │  └─ L5LRRLR: strictest policy
│        │     ├─ L6LRRLRL: default limits
│        │     └─ L6LRRLRR: default profile
│        └─ L4LRRR: extensibility
│           ├─ L5LRRRL: addSourceAppRule
│           │  ├─ L6LRRRLL: programmatic
│           │  └─ L6LRRRRL: plugin path
│           └─ L5LRRRR: test-driven
│              ├─ L6LRRRRL: positive tests
│              └─ L6LRRRRR: ordering tests
└─ L1R: Spoofing detection
   ├─ L2RL: Header cross-checks
   │  ├─ L3RLL: Sec-CH-UA / client hints
   │  │  ├─ L4RLLL: client hints
   │  │  │  ├─ L5RLLLL: Chromium
   │  │  │  │  ├─ L6RLLLLL: Sec-CH-UA sent
   │  │  │  │  └─ L6RLLLLR: UA+CH pair
   │  │  │  └─ L5RLLLR: spoof detection
   │  │  │     ├─ L6RLLLRL: curl lacks CH
   │  │  │     └─ L6RLLLRR: flag suspicious
   │  │  └─ L4RLLR: Sec-Fetch-*
   │  │     ├─ L5RLLRL: fetch metadata
   │  │     │  ├─ L6RLLRLL: Sec-Fetch-Site
   │  │     │  └─ L6RLLRLR: same-origin
   │  │     └─ L5RLLRR: anomaly
   │  │        ├─ L6RLLRRL: curl+browser mix
   │  │        └─ L6RLLRRR: heuristic
   │  └─ L3RLR: Accept profile
   │     ├─ L4RLRL: curl */*
   │     │  ├─ L5RLRLL: SDK json
   │     │  │  ├─ L6RLRLLL: Accept application/json
   │     │  │  └─ L6RLRLLR: SDK default
   │     │  └─ L5RLRLR: mismatch flag
   │     │     ├─ L6RLRLRL: curl */*
   │     │     └─ L6RLRLRR: mismatch score
   │     └─ L4RLRR: Accept-Language
   │        ├─ L5RLRRL: browser vs curl
   │        │  ├─ L6RLRRLL: Accept-Language
   │        │  └─ L6RLRRLR: browser sends
   │        └─ L5RLRRR: consistency
   │           ├─ L6RLRRRL: multi-header check
   │           └─ L6RLRRRR: confidence
   └─ L2RR: Behavior cross-checks
      ├─ L3RRL: Session-id presence
      │  ├─ L4RRLL: x-claude-code-session-id
      │  │  ├─ L5RRLLL: agent marker
      │  │  │  ├─ L6RRLLLL: session-id present
      │  │  │  └─ L6RRLLLR: agent confirmed
      │  │  └─ L5RRLLR: absence flag
      │  │     ├─ L6RRLLRL: no session-id
      │  │     └─ L6RRLLRR: suspicious
      │  └─ L4RRLR: tool-use shapes
      │     ├─ L5RRLRL: tool_use blocks
      │     │  ├─ L6RRLRLL: tool_use count
      │     │  └─ L6RRLRLR: agent behavior
      │     └─ L5RRLRR: streaming pattern
      │        ├─ L6RRLRRL: SSE stream
      │        └─ L6RRLRRR: curl no stream
      └─ L3RRR: TLS fingerprints
         ├─ L4RRRL: JA3
         │  ├─ L5RRRLL: TLS handshake hash
         │  │  ├─ L6RRRLLL: ClientHello fields
         │  │  └─ L6RRRLLR: MD5 hash
         │  └─ L5RRRLR: stack not app
         │     ├─ L6RRRLRL: OpenSSL shared
         │     └─ L6RRRLRR: can't distinguish
         └─ L4RRRR: JA4
            ├─ L5RRRRL: post-QUIC
            │  ├─ L6RRRRLL: JA4 fields
            │  └─ L6RRRRLR: QUIC support
            └─ L5RRRRR: needs TLS termination
               ├─ L6RRRRRL: gateway TLS
               └─ L6RRRRRR: local HTTP no
```

## Node research (all 127 nodes)

### L0 — Source-app fingerprinting
Maps raw User-Agent → stable app class. Foundation for attribution, gating, and profiles. Privacy: never persist raw UA.

### L1L — Rule engine (sourceApps.js)
`UA_RULES` ordered array of `[regex, appName]`; `fingerprintSourceApp()` caps input at 300 chars; `addSourceAppRule()` for extension.

### L1R — Spoofing detection
UA is client-controlled; detection tiers: header cross-checks (cheap), behavior cross-checks (medium), TLS fingerprints (expensive, low value locally).

### L2LL — Rule structure
Ordered array; first match wins; most-specific-first convention.

### L2LR — App classes
22 known classes + `unknown` default. Agent apps, SDKs, HTTP tools.

### L2RL — Header cross-checks
`Sec-CH-UA`, `Sec-Fetch-*`, `Accept`, `Accept-Language` consistency vs UA.

### L2RR — Behavior cross-checks
Session-id presence, tool-use shapes, streaming patterns — behavior is harder to fake than headers.

### L3LLL — UA_RULES array
The registry itself; each entry `[regex, app]`; order is semantic.

### L3LLR — Matching semantics
Substring matching with some anchored rules; 300-char cap.

### L3LRL — Known apps
Claude Code, Cursor, Codex CLI, Copilot, OpenAI SDKs, LangChain, Vercel AI SDK, Open WebUI, LiteLLM, LobeChat, Cherry Studio, LibreChat, JetBrains, Continue, curl, node-fetch, axios, Postman, Insomnia, Hoppscotch, 9Router, Browser.

### L3LRR — Unknown default
`DEFAULT_APP = "unknown"` — the fallback; governance treats unknown as strictest.

### L3RLL — Sec-CH-UA / client hints
Chromium sends Client Hints alongside UA; absence is a spoof signal.

### L3RLR — Accept profile
SDKs send `application/json`; curl sends `*/*`; mismatch flags spoofing.

### L3RRL — Session-id presence
`x-claude-code-session-id` confirms agent; absence with agent UA is suspicious.

### L3RRR — TLS fingerprints
JA3/JA4 identify TLS stacks, not apps; need TLS termination.

### L4LLLL — regex pairs
Each rule is `[RegExp, appName]`; e.g. `/claude[-_ ]code\//i` → "Claude Code".

### L4LLLR — ordering
Most-specific-first; compound UAs hit the app rule before transport rules.

### L4LLRL — substring vs full
Most rules are substring (`/cursor\//i`); some anchored (`/^curl\//i`).

### L4LLRR — cap 300 chars
`fingerprintSourceApp` truncates UA to 300 chars before matching.

### L4LRLL — agent apps
Claude Code, Cursor, Codex CLI, GitHub Copilot, Continue — the primary governance targets.

### L4LRLR — SDK/tool apps
OpenAI JS/Python, LangChain, Vercel AI SDK, curl, node-fetch, axios, Postman, Insomnia, Hoppscotch.

### L4LRRL — DEFAULT_APP
`"unknown"` — no match → unknown class.

### L4LRRR — extensibility
`addSourceAppRule(re, app)` — programmatic rule addition for tests/plugins.

### L4RLLL — client hints
`Sec-CH-UA` header carries browser brand/version.

### L4RLLR — Sec-Fetch-*
`Sec-Fetch-Site`, `Sec-Fetch-Mode`, `Sec-Fetch-Dest` — browser-only fetch metadata.

### L4RLRL — curl */*
curl sends `Accept: */*`; SDKs send `application/json`.

### L4RLRR — Accept-Language
Browsers send it; curl doesn't by default.

### L4RRLL — x-claude-code-session-id
Claude Code's session header; LiteLLM uses it for spend grouping.

### L4RRLR — tool-use shapes
`tool_use` blocks in messages = agent behavior.

### L4RRRL — JA3
MD5 of TLS ClientHello key fields (version, ciphers, extensions, curves).

### L4RRRR — JA4
FoxIO successor; includes SNI, ALPN, HTTP version, QUIC support.

### L5LLLLL — pattern syntax
Regex literals with `/i` flag; e.g. `/claude[-_ ]code\//i`.

### L5LLLLR — case-insensitivity
All rules use `/i` — UAs vary in case (`Claude-Code/1.0` vs `claude-code/1.0`).

### L5LLLRL — most-specific-first
`claude-code` before `curl`; `codex-cli` before `node-fetch`.

### L5LLLRR — first-match-wins
First matching rule returns; no scoring, no backtracking.

### L5LLRLL — partial match
Substring match — `cursor` anywhere in UA matches Cursor.

### L5LLRLR — anchored rules
`/^curl\//i` anchors to start — avoids matching "not-curl".

### L5LLRRL — DoS guard
Unbounded regex on attacker-controlled UA is a DoS vector; cap bounds it.

### L5LLRRR — truncation edge
Marker past 300 chars is lost — acceptable; real clients put tokens early.

### L5LRLLL — Claude Code
`/claude[-_ ]code\//i` and `/claude-code/i`; also `claude-cli/...` variant.

### L5LRLLR — Cursor/Codex
`/cursor\//i`; `/codex-cli|codex\//i`; `/codex[ _-]?droid|droid[ _-]?codex/i`.

### L5LRLRL — OpenAI SDKs
`/openai\/js/i`, `/openai\/python/i` — SDK clients.

### L5LRLRR — HTTP tools
`/^curl\//i`, `/node-fetch|undici/i`, `/axios/i`, `/postman/i`, `/insomnia/i`, `/hoppscotch/i`.

### L5LRRLL — "unknown" class
No rule matched → `unknown`. Also the class for legitimate new tools.

### L5LRRLR — strictest policy
Governance: unknown ⇒ default profile with strictest limits (mirrors OpenRouter/LiteLLM defaults).

### L5LRRRL — addSourceAppRule
Programmatic registration; used by tests and future plugins.

### L5LRRRR — test-driven
Each new rule ships positive + negative + ordering tests (tests/ vitest package).

### L5RLLLL — Chromium
Real Chromium sends both `User-Agent` and `Sec-CH-UA`.

### L5RLLLR — spoof detection
curl with browser UA lacks `Sec-CH-UA` → suspicious.

### L5RLLRL — fetch metadata
`Sec-Fetch-Site: same-origin` from a curl UA is anomalous.

### L5RLLRR — anomaly
Mixed signals (browser UA + curl headers) → heuristic flag, not proof.

### L5RLRLL — SDK json
SDKs default `Accept: application/json`.

### L5RLRLR — mismatch flag
`Accept: */*` with an SDK UA → mismatch score.

### L5RLRRL — browser vs curl
Browsers send `Accept-Language`; curl doesn't.

### L5RLRRR — consistency
Multi-header consistency check → confidence score (0–1).

### L5RRLLL — agent marker
Session-id header present → agent confirmed.

### L5RRLLR — absence flag
Agent UA without session-id → suspicious (A1a2LR cross-check).

### L5RRLRL — tool_use blocks
Count `tool_use` blocks per request — the agent discriminator.

### L5RRLRR — streaming pattern
Agents stream SSE; curl one-shots — pattern mismatch flags spoof.

### L5RRRLL — TLS handshake hash
JA3 hashes ClientHello: TLS version, ciphers, extensions, curves, point formats.

### L5RRRLR — stack not app
JA3 identifies TLS library (OpenSSL, BoringSSL, Go) — Claude Code and curl share OpenSSL.

### L5RRRRL — post-QUIC
JA4 adds SNI, ALPN, HTTP version, QUIC — survives HTTP/3.

### L5RRRRR — needs TLS termination
JA3/JA4 require gateway TLS visibility; 9router is local HTTP — low value.

### L6 leaves (64)
- **L6LLLLLL** literal vs regex: rules are regex literals, not strings.
- **L6LLLLLR** flags (i): all rules case-insensitive.
- **L6LLLLRL** /i flag: matches `Claude-Code` and `claude-code`.
- **L6LLLLRR** mixed-case UAs: real clients vary case; /i handles it.
- **L6LLLRLL** compound UAs: `Claude-Code/1.0 (curl 8.4.0)` → app rule first.
- **L6LLLRLR** app before transport: app marker wins over transport marker.
- **L6LLLRRL** return early: first match returns immediately.
- **L6LLLRRR** no backtracking: no scoring across rules.
- **L6LLRLLL** contains: substring match anywhere in UA.
- **L6LLRLLR** false positives: "cursor" in a custom UA misclassifies.
- **L6LLRLRL** ^curl: anchored start — "not-curl" won't match.
- **L6LLRLRR** exact prefix: only true curl UAs match.
- **L6LLRRLL** unbounded regex: 10 KB UA × regex = CPU DoS.
- **L6LLRRLR** memory bound: 300-char cap bounds work.
- **L6LLRRRL** marker past cap: app token after 300 chars is lost.
- **L6LLRRRR** acceptable loss: real clients put tokens early.
- **L6LRLLLL** claude-code UA: `claude-code/1.0.0` style.
- **L6LRLLLR** claude-cli variant: `claude-cli/...` also matches.
- **L6LRLLRL** cursor UA: `cursor/0.x` style.
- **L6LRLLRR** codex-cli UA: `codex-cli/...` or `codex/...`.
- **L6LRLRLL** openai/js: `openai/js` SDK UA.
- **L6LRLRLR** openai/python: `openai/python` SDK UA.
- **L6LRLRRL** curl/node-fetch: transport tools.
- **L6LRLRRR** postman/insomnia: API-testing tools.
- **L6LRRLLL** no match: nothing matched → unknown.
- **L6LRRLLR** new tools: legitimate new tools land in unknown.
- **L6LRRLRL** default limits: unknown gets default (strictest) limits.
- **L6LRRLRR** default profile: unknown resolves to default profile (B6b2).
- **L6LRRRLL** programmatic: `addSourceAppRule(re, app)` at runtime.
- **L6LRRRRL** plugin path: future plugins register rules.
- **L6LRRRRL** positive tests: real UA string → expected class.
- **L6LRRRRR** ordering tests: compound UA → app, not transport.
- **L6RLLLLL** Sec-CH-UA sent: Chromium sends brand list.
- **L6RLLLLR** UA+CH pair: browser sends both; spoof sends neither.
- **L6RLLLRL** curl lacks CH: curl sends no client hints.
- **L6RLLLRR** flag suspicious: UA/CH mismatch → suspicious flag.
- **L6RLLRLL** Sec-Fetch-Site: cross-site/same-origin/none.
- **L6RLLRLR** same-origin: browser-only value.
- **L6RLLRRL** curl+browser mix: browser UA + curl fetch headers.
- **L6RLLRRR** heuristic: flag, not proof — determined spoofers set all headers.
- **L6RLRLLL** Accept application/json: SDK default.
- **L6RLRLLR** SDK default: OpenAI SDKs send json accept.
- **L6RLRLRL** curl */*: curl's default accept.
- **L6RLRLRR** mismatch score: accept vs UA mismatch adds to score.
- **L6RLRRLL** Accept-Language: browser sends locale.
- **L6RLRRLR** browser sends: curl doesn't by default.
- **L6RLRRRL** multi-header check: UA + CH + Accept + Lang together.
- **L6RLRRRR** confidence: aggregate → spoofScore 0–1.
- **L6RRLLLL** session-id present: agent confirmed.
- **L6RRLLLR** agent confirmed: header + UA agree.
- **L6RRLLRL** no session-id: agent UA without session header.
- **L6RRLLRR** suspicious: flagged for behavior check.
- **L6RRLRLL** tool_use count: blocks per request.
- **L6RRLRLR** agent behavior: high tool_use = agent.
- **L6RRLRRL** SSE stream: agents stream.
- **L6RRLRRR** curl no stream: curl one-shots.
- **L6RRRLLL** ClientHello fields: version, ciphers, extensions, curves.
- **L6RRRLLR** MD5 hash: JA3 = MD5 of concatenated fields.
- **L6RRRLRL** OpenSSL shared: Claude Code + curl share stack.
- **L6RRRLRR** can't distinguish: JA3 can't tell apps apart.
- **L6RRRRLL** JA4 fields: SNI, ALPN, HTTP version.
- **L6RRRRLR** QUIC support: JA4 handles HTTP/3.
- **L6RRRRRL** gateway TLS: JA4 needs TLS at gateway.
- **L6RRRRRR** local HTTP no: 9router localhost HTTP — no TLS visibility.

## Confidence levels

| Finding | Confidence |
|---------|-----------|
| Rule engine design (ordered, most-specific-first, 300-char cap) | High |
| Raw UA must never be persisted | High |
| Header cross-checks are cheap and useful | Medium |
| JA3/JA4 identify TLS stacks, not apps | High |
| JA3/JA4 useful in local-HTTP topology | Low |

## Open questions

1. Should spoofScore be per-request (cheap headers) or per-session (accumulate behavior)?
2. Should "unknown" split into `unknown-new` vs `unknown-suspicious`?
3. Does the CLI failover-proxy terminate TLS today? (JA3 becomes possible but still low value.)

## Sources

- Code: `src/lib/sourceApps.js` (read in prior research)
- Prior research: `2026-08-31-message-origin-and-destination-research.md`, `2026-09-14-keyless-governance-research.md`, `2026-09-15-branch-a1a-ua-fingerprinting.md`
- Industry: Cloudflare bot management, FoxIO JA4, ua-parser-js conventions