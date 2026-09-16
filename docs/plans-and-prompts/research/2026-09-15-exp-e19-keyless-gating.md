# Exponential Expansion E19 — Keyless Gating Mechanisms

**Date:** 2026-09-15
**Root phrase:** "Keyless gating mechanisms (network gating, UA fingerprint gating, header identity, agent profiles, workspaces, guardrails, gate levels, tag-based allowance, short-lived tokens, OAuth/device flow; hybrid keyless-vs-keyed resolution order)" — from `2026-09-14-keyless-governance-research.md` §A
**Format:** 6+ levels, variable branching
**Status:** complete

## L1 — sub-phrases discovered in the root

1. Network gating (trusted subnets, loopback)
2. UA fingerprint gating (sourceApps rules)
3. Header identity (X-9R-* headers)
4. Agent profiles (profile JSON → routing)
5. Workspaces (team/workspace scoping)
6. Guardrails (PII, injection, content)
7. Gate levels (L0–L5 ladder)
8. Tag-based allowance (tags → allowed models)
9. Short-lived tokens (ephemeral credentials)
10. OAuth/device flow (browser-based auth)
11. Hybrid resolution order (key → subnet → loopback → default profile)

## L2 — expansion of each L1 node

### 1. Network gating
- **1a. Loopback** — 127.0.0.1, ::1.
- **1b. Trusted subnets** — configurable CIDRs.
- **1c. Custom-server** — TCP socket IP derivation.
- **1d. X-Forwarded-For** — stripped unless loopback proxy.

### 2. UA fingerprint gating
- **2a. UA_RULES** — 24 rules.
- **2b. fingerprintSourceApp** — caps 300 chars.
- **2c. DEFAULT_APP** — "unknown".
- **2d. Browser** — /mozilla/i.

### 3. Header identity
- **3a. X-9R-App** — app name.
- **3b. X-9R-User** — user id.
- **3c. X-9R-Session** — session id.
- **3d. Trust** — post-auth only.

### 4. Agent profiles
- **4a. Profile JSON** — name, UA pattern, defaults.
- **4b. Resolution** — UA → profile.
- **4c. Profile → routing** — model defaults, tags.
- **4d. Precedents** — LiteLLM, Anthropic, OpenRouter.

### 5. Workspaces
- **5a. Scope** — keys, budgets, limits.
- **5b. Defaults** — workspace-level.
- **5c. Mirrors** — Anthropic workspaces.

### 6. Guardrails
- **6a. PII** — redact/block.
- **6b. Prompt injection** — detect.
- **6c. Content filters** — regex.
- **6d. OpenRouter precedent** — guardrail hierarchy.

### 7. Gate levels
- **7a. L0** — open.
- **7b. L1** — loopback.
- **7c. L2** — trusted subnet.
- **7d. L3** — key.
- **7e. L4** — profile.
- **7f. L5** — full auth.

### 8. Tag-based allowance
- **8a. Tags** — on keys/profiles.
- **8b. Allowance** — tags → models.
- **8c. Wildcards** — claude-*.

### 9. Short-lived tokens
- **9a. TTL** — minutes/hours.
- **9b. Rotation** — auto-refresh.
- **9c. Revocation** — immediate.

### 10. OAuth/device flow
- **10a. Device code** — user approves.
- **10b. Browser** — dashboard login.
- **10c. Token** — session cookie.

### 11. Hybrid resolution
- **11a. Key** — first.
- **11b. Trusted subnet** — second.
- **11c. Loopback** — third.
- **11d. Default profile** — last.

## L3 — expansion of selected L2 nodes

### 1c → custom-server
- **1c-i. TCP socket** — client IP.
- **1c-ii. XFF strip** — attacker-controlled.
- **1c-iii. Loopback proxy** — trusted.

### 2a → UA_RULES
- **2a-i. Claude Code** — ×2 rules.
- **2a-ii. Cursor** — cursor.
- **2a-iii. Codex** — codex-cli + droid guard.
- **2a-iv. Copilot** — github-copilot.
- **2a-v. SDKs** — openai, langchain, vercel.
- **2a-vi. UIs** — open-webui, lobe, cherry, librechat.

### 3d → post-auth trust
- **3d-i. Key auth** — then trust.
- **3d-ii. Trusted subnet** — also trust.
- **3d-iii. Otherwise** — claim.

### 4b → resolution
- **4b-i. UA match** — profile lookup.
- **4b-ii. Fallback** — default profile.
- **4b-iii. Override** — header.

### 7a → L0
- **7a-i. Open** — no gate.
- **7a-ii. Use** — dev only.
- **7a-iii. Risk** — exposed.

### 11a → key first
- **11a-i. Bearer** — Authorization.
- **11a-ii. Verify** — API_KEY_SECRET.
- **11a-iii. Profile** — key-linked.

## L4 → expansion of selected L3 nodes

### 1c-i → TCP socket
- **1c-i-a. socket.remoteAddress** — IP.
- **1c-i-b. IPv6** — ::1.
- **1c-i-c. Mapped** — ::ffff:127.0.0.1.

### 2a-iii → Codex
- **2a-iii-a. codex-cli/** — UA.
- **2a-iii-b. CodexDroid** — Android.
- **2a-iii-c. Guard** — /codex[ _-]?droid|droid[ _-]?codex/i.

### 4b-i → UA match
- **4b-i-a. Regex** — per profile.
- **4b-i-b. Order** — most-specific-first.
- **4b-i-c. Cache** — fingerprint.

### 7c → L2
- **7c-i. CIDR** — 192.168.0.0/16.
- **7c-ii. Config** — trustedSubnets.
- **7c-iii. Check** — ip in range.

### 11b → trusted subnet
- **11b-i. Match** — then trust.
- **11b-ii. Profile** — subnet profile.
- **11b-iii. Headers** — honored.

## L5 → expansion of selected L4 nodes

### 1c-i-a → remoteAddress
- **1c-i-a-1. Derive** — custom-server.
- **1c-i-a-2. Strip** — XFF.
- **1c-i-a-3. Rate limit** — per IP.

### 2a-iii-a → codex-cli UA
- **2a-iii-a-1. Format** — codex-cli/0.x.
- **2a-iii-a-2. Version** — semver.
- **2a-iii-a-3. Match** — /codex-cli/i.

### 4b-i-a → per-profile regex
- **4b-i-a-1. Pattern** — UA fragment.
- **4b-i-a-2. Flags** — i.
- **4b-i-a-3. Test** — regex.test(ua).

### 7c-i → CIDR
- **7c-i-1. IPv4** — 192.168.0.0/16.
- **7c-i-2. IPv6** — fd00::/8.
- **7c-i-3. Loopback** — 127.0.0.0/8.

### 11b-i → match
- **11b-i-1. ipInCidr** — util.
- **11b-i-2. Config** — array.
- **11b-i-3. Default** — empty.

## L6 → expansion of selected L5 nodes

### 1c-i-a-1 → derive
- **1c-i-a-1-1. Socket** — req.socket.
- **1c-i-a-1-2. remoteAddress** — IP.
- **1c-i-a-1-3. Proxy** — loopback only.

### 2a-iii-a-1 → format
- **2a-iii-a-1-1. Prefix** — codex-cli/.
- **2a-iii-a-1-2. Suffix** — version.
- **2a-iii-a-1-3. Case** — lowercase.

### 7c-i-1 → IPv4 CIDR
- **7c-i-1-1. Private** — 10/8, 172.16/12, 192.168/16.
- **7c-i-1-2. Mask** — prefix length.
- **7c-i-1-3. Bitwise** — AND.

## Confidence & open questions

- **Confidence: high** — codebase verified + industry precedents.
- **Open:** which gate level is the default for loopback?
- **Open:** should profiles be user-editable JSON?

## Sources

- `docs/plans-and-prompts/research/2026-09-14-keyless-governance-research.md` §A
- `src/lib/sourceApps.js`
- `custom-server.js`
- OpenRouter app-attribution docs