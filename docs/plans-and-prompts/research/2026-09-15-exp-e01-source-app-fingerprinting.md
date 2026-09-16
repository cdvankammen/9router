# Exponential Expansion E01 — Source-App Fingerprinting (`src/lib/sourceApps.js`)

**Date:** 2026-09-15
**Root phrase:** "Source-app fingerprinting (`src/lib/sourceApps.js`)" — from `2026-08-31-message-origin-and-destination-research.md` §A.1
**Format:** 6+ levels, variable branching (every discovered phrase researched)
**Status:** complete

## L1 — sub-phrases discovered in the root

1. `UA_RULES` ordered array
2. `fingerprintSourceApp(userAgent)` function
3. 300-char UA cap
4. `DEFAULT_APP = "unknown"`
5. `addSourceAppRule(re, app)` extensibility
6. Privacy stance (never store raw UA)
7. Browser fallback (`/mozilla/i`)
8. Rule ordering (most-specific-first)

## L2 — expansion of each L1 node

### 1. UA_RULES ordered array
- **1a. Regex patterns per app** — 24 rules, each `{re, app}`. Codebase: `src/lib/sourceApps.js` lines 10–36.
- **1b. Most-specific-first ordering** — `claude[-_ ]code\//i` before `claude-code/i`; `codex-cli|codex\//i` before the droid rule. Design note: ordering prevents generic rules from shadowing specific ones.
- **1c. Per-app rule inventory** — Claude Code (2 rules), Cursor, Codex CLI (2), GitHub Copilot, OpenAI JS/Python SDK, LangChain, Vercel AI SDK, Open WebUI, LiteLLM, LobeChat, Cherry Studio, LibreChat, JetBrains, Continue, curl, Node fetch, axios, Postman, Insomnia, Hoppscotch, 9Router.
- **1d. Codex droid adjacency guard** — `/codex[ _-]?droid|droid[ _-]?codex/i` avoids bare `/droid/i` catching "Android 13" mobile UAs. Codebase comment lines 17–19.

### 2. fingerprintSourceApp(userAgent)
- **2a. Input validation** — `!userAgent || typeof !== "string"` → `DEFAULT_APP`. Codebase lines 42–44.
- **2b. Slice cap** — `userAgent.slice(0, 300)` before matching. Codebase line 45.
- **2c. Linear scan** — first matching rule wins; O(n) over 24 rules. Design note: fine for per-request cost.
- **2d. Return contract** — stable class string, e.g. `"Claude Code"`, `"unknown"`.

### 3. 300-char UA cap
- **3a. Why cap** — UAs can be kilobytes; only the class matters. Privacy + memory.
- **3b. Truncation edge** — a rule matching only after char 300 never fires. Design note: acceptable; all known rules match early.
- **3c. Alternative: hash** — could store FNV-1a of UA instead of class; rejected (class is more useful for filtering).

### 4. DEFAULT_APP = "unknown"
- **4a. Fallback semantics** — unmatched UAs get `"unknown"`, not `null`. Codebase line 38.
- **4b. Dashboard impact** — "unknown" is a first-class filter value in usage views.
- **4c. Spoofing surface** — an attacker sending a garbage UA lands in "unknown" — a bucket that can be rate-limited separately.

### 5. addSourceAppRule(re, app)
- **5a. Push semantics** — appends to `UA_RULES`; new rules are *least* specific. Codebase lines 55–60.
- **5b. Test usage** — used by unit tests to add synthetic rules.
- **5c. Runtime registration** — could be used by a plugin/extension system later; no persistence.

### 6. Privacy stance
- **6a. Class-only persistence** — raw UA never stored; only the class. Codebase comment lines 4–6.
- **6b. Why** — raw UA can fingerprint a person's exact toolchain (browser version, OS, extensions).
- **6c. Industry parallel** — OpenRouter stores referer URL (app-level), not full UA; Anthropic doesn't expose client UAs in analytics.

### 7. Browser fallback
- **7a. `/mozilla/i` test** — any UA containing "mozilla" → `"Browser"`. Codebase lines 47–49.
- **7b. Gap** — non-Mozilla browsers (some mobile, curl-like) fall to `"unknown"`.
- **7c. Improvement** — could add `Sec-CH-UA` (Client Hints) parsing for richer browser detection.

### 8. Rule ordering
- **8a. Why order matters** — first match wins; a generic rule early would shadow specific ones.
- **8b. Maintenance** — new rules must be inserted in the right position; no sort is applied.
- **8c. Test coverage** — ordering is implicitly tested by the unit tests in `tests/unit/`.

## L3 — expansion of selected L2 nodes (variable branching)

### 1b → most-specific-first ordering
- **1b-i. Claude Code double rule** — `/claude[-_ ]code\//i` (with slash) then `/claude-code/i` (bare). Covers `claude-cli/1.0.0` and `claude-code` variants.
- **1b-ii. Cursor** — `/cursor\//i` requires the slash; bare "cursor" in a UA won't match.
- **1b-iii. Copilot** — `/githubcopilot|copilot-chat/i` — GitHub's official UA strings.
- **1b-iv. SDK rules** — `/openai\/js/i`, `/openai\/python/i` — language-specific SDKs.
- **1b-v. Framework rules** — LangChain, Vercel AI SDK — higher-level frameworks that wrap SDKs.

### 1c → per-app rule inventory (each app is a phrase)
- **1c-i. Claude Code** — `claude-cli/` UA; settings at `~/.claude/settings.json`; env `ANTHROPIC_BASE_URL` for gateway routing.
- **1c-ii. Cursor** — `cursor/` UA; IDE-based; sends `x-cursor-*` headers.
- **1c-iii. Codex CLI** — `codex-cli|codex/` UA; OpenAI's CLI; Android companion "CodexDroid".
- **1c-iv. GitHub Copilot** — `githubcopilot|copilot-chat` UA; VS Code extension.
- **1c-v. OpenAI SDKs** — `openai/js`, `openai/python`; the most common programmatic clients.
- **1c-vi. LangChain** — `langchainjs|langchain/`; framework over SDKs.
- **1c-vii. Vercel AI SDK** — `vercel-ai-sdk|ai-sdk`; framework over SDKs.
- **1c-viii. Open WebUI** — `openwebui`; self-hosted chat UI.
- **1c-ix. LiteLLM** — `litellm`; proxy/gateway itself.
- **1c-x. LobeChat / Cherry Studio / LibreChat** — chat UIs with distinct UAs.
- **1c-xi. JetBrains** — `pycharm|jetbrains`; IDE plugins.
- **1c-xii. Continue** — `continue/`; VS Code extension.
- **1c-xiii. curl / Node fetch / axios** — raw HTTP clients.
- **1c-xiv. Postman / Insomnia / Hoppscotch** — API testing tools.
- **1c-xv. 9Router** — self-identification (gateway→gateway).

### 2c → linear scan
- **2c-i. Performance** — 24 regex tests per request; negligible.
- **2c-ii. Alternative: trie/prefix** — overkill for 24 rules.
- **2c-iii. Caching** — could memoize by UA hash; not needed at local scale.

### 6b → why raw UA fingerprints
- **6b-i. UA anatomy** — `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36` — OS, browser, version.
- **6b-ii. Toolchain inference** — UA + timing + request patterns can identify a specific person.
- **6b-iii. GDPR angle** — raw UA can be personal data; class-only is safer.

## L4 — expansion of selected L3 nodes

### 1c-i → Claude Code
- **1c-i-a. UA format** — `claude-cli/1.0.0 (Claude Code)` style.
- **1c-i-b. Settings files** — `~/.claude/settings.json`, `.claude/settings.json`, `.claude/settings.local.json`, managed settings.
- **1c-i-c. Env routing** — `ANTHROPIC_BASE_URL` points Claude Code at a gateway; `ANTHROPIC_AUTH_TOKEN` for keyless.
- **1c-i-d. Session header** — `x-claude-code-session-id` — a per-session identifier usable for attribution.

### 1c-iii → Codex CLI
- **1c-iii-a. UA** — `codex-cli/0.x` or `codex/1.x`.
- **1c-iii-b. Android companion** — "CodexDroid" — needs the adjacency rule.
- **1c-iii-c. Config** — `~/.codex/config.toml`; `OPENAI_BASE_URL` for gateway routing.

### 1c-ix → LiteLLM
- **1c-ix-a. UA** — `litellm/...` — a proxy in front of 9router.
- **1c-ix-b. Chained attribution** — LiteLLM passes `user` and metadata; 9router sees LiteLLM's UA, not the original client's.
- **1c-ix-c. Header passthrough** — LiteLLM forwards `X-9R-*` headers if configured.

### 6b → raw UA fingerprinting
- **6b-i. Browser UA** — includes OS + browser + version + platform.
- **6b-ii. SDK UA** — `openai-node/4.x` — reveals language + SDK version.
- **6b-iii. CLI UA** — `claude-cli/1.0.0` — reveals tool + version.
- **6b-iv. Combined signals** — UA + IP + timing = near-unique device identity.

## L5 — expansion of selected L4 nodes

### 1c-i-b → Claude Code settings files
- **1c-i-b-1. `~/.claude/settings.json`** — user-global; model, permissions, env.
- **1c-i-b-2. `.claude/settings.json`** — project-scoped; overrides user.
- **1c-i-b-3. `.claude/settings.local.json`** — local-only; gitignored.
- **1c-i-b-4. Managed settings** — org-managed; highest precedence.
- **1c-i-b-5. `env` key** — can set `ANTHROPIC_BASE_URL` per project → gateway routing per project.

### 1c-i-d → x-claude-code-session-id
- **1c-i-d-1. Format** — UUID per Claude Code session.
- **1c-i-d-2. Persistence** — 9router captures it as `conversationId` (partial).
- **1c-i-d-3. Attribution value** — groups all requests from one agent run.
- **1c-i-d-4. Spoofability** — client-controlled; treat as claim, not proof.

## L6 — expansion of selected L5 nodes

### 1c-i-b-5 → env key for gateway routing
- **1c-i-b-5-1. `ANTHROPIC_BASE_URL`** — points Claude Code at `http://localhost:20128/v1`.
- **1c-i-b-5-2. `ANTHROPIC_AUTH_TOKEN`** — bearer token; can carry a profile name.
- **1c-i-b-5-3. `ANTHROPIC_API_KEY`** — legacy; 9router accepts as API key.
- **1c-i-b-5-4. Per-project routing** — different projects → different profiles via env.

### 1c-i-d-4 → spoofability of session headers
- **1c-i-d-4-1. Claim vs proof** — headers are claims; only post-auth trust.
- **1c-i-d-4-2. Mitigation** — trusted-subnet + key auth before honoring.
- **1c-i-d-4-3. Synthetic fallback** — behavioral fingerprint when headers untrusted.

## Confidence & open questions

- **Confidence: high** — codebase read directly (`src/lib/sourceApps.js`).
- **Confidence: high** — Claude Code settings/env documented by Anthropic.
- **Open:** should new UA rules be config-driven (DB) instead of code?
- **Open:** should `Sec-CH-UA` client hints supplement UA parsing?
- **Open:** is the 300-char cap still right for modern UAs?

## Sources

- `src/lib/sourceApps.js` (read directly)
- `docs/plans-and-prompts/research/message-viewer-design-philosophies.md` §B.3
- Anthropic Claude Code settings docs (via prior research)
- `tests/unit/` sourceApps tests