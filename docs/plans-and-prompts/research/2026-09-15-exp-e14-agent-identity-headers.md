# Exponential Expansion E14 — Agent Identity & Attribution Headers

**Date:** 2026-09-15
**Root phrase:** "Agent identity & attribution headers (MCP, Claude Code settings, per-key attribution)" — from `2026-08-31-message-origin-and-destination-research.md` §B.4
**Format:** 6+ levels, variable branching
**Status:** complete

## L1 — sub-phrases discovered in the root

1. OpenRouter's model (HTTP-Referer + X-OpenRouter-Title + categories)
2. MCP (JSON-RPC 2.0; hosts/clients/servers; no standard identity header)
3. Claude Code (UA, settings files, env)
4. Cursor / Codex CLI / Copilot (distinct UAs)
5. Key insight: UA fingerprinting is the only universal signal
6. Robust design: per-API-key attribution + UA + optional client headers
7. Trusted only when request already authenticated with a key

## L2 — expansion of each L1 node

### 1. OpenRouter's model
- **1a. HTTP-Referer** — app URL.
- **1b. X-OpenRouter-Title** — display name.
- **1c. Categories** — marketplace categories.
- **1d. Self-identify** — apps declare themselves.
- **1e. Grouping** — by referer URL.

### 2. MCP
- **2a. JSON-RPC 2.0** — protocol.
- **2b. Hosts/clients/servers** — roles.
- **2c. No identity header** — identity at MCP layer, not HTTP.
- **2d. Gap** — gateway can't see MCP identity.

### 3. Claude Code
- **3a. UA** — `claude-cli/...` (matches `claude[-_ ]code\//i`).
- **3b. Settings files** — `~/.claude/settings.json`, `.claude/settings.json`, `.claude/settings.local.json`, managed.
- **3c. Env** — model/permissions/env config.
- **3d. Gateway config** — how a gateway could be configured per-agent.

### 4. Cursor / Codex CLI / Copilot
- **4a. Cursor** — `cursor/` UA.
- **4b. Codex CLI** — `codex-cli|codex/` UA.
- **4c. Copilot** — `githubcopilot|copilot-chat` UA.
- **4d. Already in sourceApps** — rules exist.

### 5. Key insight
- **5a. UA only universal** — every client sends one.
- **5b. Headers non-standard** — no universal agent header.
- **5c. Implication** — UA is baseline; headers are enhancement.

### 6. Robust design
- **6a. Per-API-key attribution** — key = identity with metadata.
- **6b. UA fingerprinting** — secondary signal.
- **6c. Client headers** — optional, e.g. X-9R-App, X-9R-User.

### 7. Trusted only post-auth
- **7a. Key auth** — request authenticated.
- **7b. Then trust headers** — X-9R-App/User honored.
- **7c. No key** — headers are claims only.

## L3 — expansion of selected L2 nodes

### 1e → grouping by referer
- **1e-i. Same URL** — same app.
- **1e-ii. Origin grouping** — subdomains grouped.
- **1e-iii. Localhost** — needs title.

### 2c → no identity header
- **2c-i. MCP layer** — identity at protocol layer.
- **2c-ii. HTTP layer** — opaque.
- **2c-iii. Gateway impact** — can't attribute MCP clients by header.

### 3b → settings files
- **3b-i. User-global** — ~/.claude/settings.json.
- **3b-ii. Project** — .claude/settings.json.
- **3b-iii. Local** — .claude/settings.local.json.
- **3b-iv. Managed** — org-managed.

### 3c → env config
- **3c-i. ANTHROPIC_BASE_URL** — gateway URL.
- **3c-ii. ANTHROPIC_AUTH_TOKEN** — bearer token.
- **3c-iii. ANTHROPIC_API_KEY** — legacy key.
- **3c-iv. Per-project** — different env per project.

### 6a → per-key attribution
- **6a-i. Key metadata** — name, owner, tags.
- **6a-ii. Usage** — per-key usage records.
- **6a-iii. Limits** — per-key limits/budgets.

### 7a → key auth
- **7a-i. Bearer token** — Authorization header.
- **7a-ii. Verification** — API_KEY_SECRET.
- **7a-iii. Identity** — key → profile.

## L4 — expansion of selected L3 nodes

### 3b-i → user-global settings
- **3b-i-a. Location** — ~/.claude/settings.json.
- **3b-i-b. Scope** — all projects.
- **3b-i-c. Fields** — model, permissions, env.

### 3c-i → ANTHROPIC_BASE_URL
- **3c-i-a. Value** — http://localhost:20128/v1.
- **3c-i-b. Effect** — Claude Code routes through gateway.
- **3c-i-c. Per-project** — different gateways.

### 6a-i → key metadata
- **6a-i-a. Name** — human label.
- **6a-i-b. Owner** — user.
- **6a-i-c. Tags** — grouping.

### 7a-ii → verification
- **7a-ii-a. Derive** — HMAC.
- **7a-ii-b. Compare** — constant-time.
- **7a-ii-c. Fail** — 401.

## L5 → expansion of selected L4 nodes

### 3b-i-c → fields
- **3b-i-c-1. model** — default model.
- **3b-i-c-2. permissions** — allow/deny tools.
- **3b-i-c-3. env** — environment variables.

### 3c-i-a → localhost:20128
- **3c-i-a-1. Port** — 20128.
- **3c-i-a-2. Path** — /v1.
- **3c-i-a-3. Loopback** — rate limiter bypass.

### 6a-i-a → name
- **6a-i-a-1. Purpose** — identify key in UI.
- **6a-i-a-2. Example** — "hermes-main".
- **6a-i-a-3. Search** — filter by name.

## L6 → expansion of selected L5 nodes

### 3b-i-c-3 → env
- **3b-i-c-3-1. ANTHROPIC_BASE_URL** — gateway.
- **3b-i-c-3-2. ANTHROPIC_AUTH_TOKEN** — profile token.
- **3b-i-c-3-3. Other** — custom vars.

### 3c-i-a-1 → port 20128
- **3c-i-a-1-1. Default** — 20128.
- **3c-i-a-1-2. Env** — PORT override.
- **3c-i-a-1-3. Conflict** — port in use.

## Confidence & open questions

- **Confidence: high** — codebase + MCP spec + Anthropic docs.
- **Open:** should 9router define X-9R-App/User/Session headers?
- **Open:** should MCP identity be bridged (e.g. via metadata)?

## Sources

- `src/lib/sourceApps.js` (read directly)
- MCP spec 2025-06-18
- Anthropic Claude Code settings docs
- `docs/plans-and-prompts/research/2026-08-31-message-origin-and-destination-research.md` §B.4