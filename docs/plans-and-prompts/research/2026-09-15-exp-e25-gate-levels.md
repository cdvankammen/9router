# Exponential Expansion E25 — Gate Levels (L0–L5)

**Date:** 2026-09-15
**Root phrase:** "Gate levels (L0–L5 ladder table, gate config JSON, highest-cleared-level-wins)" — from `2026-09-14-keyless-governance-research.md` §G
**Format:** 6+ levels, variable branching
**Status:** complete

## L1 — sub-phrases discovered in the root

1. L0 — open (no gate)
2. L1 — loopback only
3. L2 — trusted subnet
4. L3 — API key
5. L4 — agent profile
6. L5 — full auth (session)
7. Gate config JSON
8. Highest-cleared-level-wins
9. Level evaluation order
10. Level fallback (default)

## L2 — expansion of each L1 node

### 1. L0 — open
- **1a. No gate** — any request.
- **1b. Use** — dev only.
- **1c. Risk** — exposed.
- **1d. Default** — no.

### 2. L1 — loopback
- **2a. 127.0.0.1** — IPv4.
- **2b. ::1** — IPv6.
- **2c. ::ffff:127.0.0.1** — mapped.
- **2d. Check** — isLoopback.

### 3. L2 — trusted subnet
- **3a. CIDR** — config.
- **3b. 192.168.0.0/16** — example.
- **3c. 10.0.0.0/8** — example.
- **3d. Check** — ipInCidr.

### 4. L3 — API key
- **4a. Bearer** — Authorization.
- **4b. Verify** — API_KEY_SECRET.
- **4c. Key metadata** — name, owner.
- **4d. Limits** — per key.

### 5. L4 — agent profile
- **5a. UA match** — profile.
- **5b. Header** — X-9R-Profile.
- **5c. Defaults** — model, tags.
- **5d. Limits** — profile-level.

### 6. L5 — full auth
- **6a. Session** — cookie.
- **6b. JWT** — JWT_SECRET.
- **6c. Dashboard** — login.
- **6d. Full control** — all features.

### 7. Gate config JSON
- **7a. Structure** — levels array.
- **7b. Enabled** — per level.
- **7c. Params** — per level.
- **7d. File** — gate.json.

### 8. Highest-cleared-level-wins
- **8a. Evaluate** — all levels.
- **8b. Highest** — cleared.
- **8c. Wins** — privileges.
- **8d. Example** — L3 > L1.

### 9. Evaluation order
- **9a. L0** — always.
- **9b. L1** — loopback.
- **9c. L2** — subnet.
- **9d. L3** — key.
- **9e. L4** — profile.
- **9f. L5** — session.

### 10. Fallback
- **10a. No level** — cleared.
- **10b. Default** — L0.
- **10c. Config** — defaultLevel.
- **10d. Deny** — if none.

## L3 — expansion of selected L2 nodes

### 1c → risk
- **1c-i. Exposed** — network.
- **1c-ii. Abuse** — anyone.
- **1c-iii. Cost** — unlimited.

### 2d → isLoopback
- **2d-i. 127.** — prefix.
- **2d-ii. ::1** — IPv6.
- **2d-iii. Mapped** — ::ffff:.

### 3a → CIDR
- **3a-i. IPv4** — 192.168.0.0/16.
- **3a-ii. IPv6** — fd00::/8.
- **3a-iii. Parse** — util.

### 4b → verify
- **4b-i. Hash** — key_hash.
- **4b-ii. Compare** — constant-time.
- **4b-iii. Fail** — 401.

### 5a → UA match
- **5a-i. sourceApps** — rules.
- **5a-ii. Profile** — lookup.
- **5a-iii. Fallback** — default.

### 6b → JWT
- **6b-i. Sign** — JWT_SECRET.
- **6b-ii. Verify** — middleware.
- **6b-iii. Expiry** — session.

### 7a → structure
- **7a-i. levels** — array.
- **7a-ii. enabled** — bool.
- **7a-iii. params** — object.

### 8a → evaluate
- **8a-i. All** — levels.
- **8a-ii. Clear** — check.
- **8a-iii. Max** — track.

### 9b → L1
- **9b-i. Loopback** — check.
- **9b-ii. Clear** — yes.
- **9b-iii. Level** — 1.

### 10b → default
- **10b-i. L0** — open.
- **10b-ii. Config** — override.
- **10b-iii. Safe** — L1.

## L4 → expansion of selected L3 nodes

### 1c-i → exposed
- **1c-i-a. Network** — reachable.
- **1c-i-b. No auth** — anyone.
- **1c-i-c. Risk** — abuse.

### 2d-i → 127.
- **2d-i-a. Prefix** — 127.0.0.1.
- **2d-i-b. Range** — 127.0.0.0/8.
- **2d-i-c. Check** — startsWith.

### 3a-i → IPv4
- **3a-i-a. 192.168.0.0/16** — private.
- **3a-i-b. 10.0.0.0/8** — private.
- **3a-i-c. 172.16.0.0/12** — private.

### 4b-i → hash
- **4b-i-a. SHA-256** — hash.
- **4b-i-b. Salt** — API_KEY_SECRET.
- **4b-i-c. Store** — key_hash.

### 5a-i → sourceApps
- **5a-i-a. UA_RULES** — 24 rules.
- **5a-i-b. fingerprint** — function.
- **5a-i-c. App** — class.

### 6b-i → sign
- **6b-i-a. Payload** — user, exp.
- **6b-i-b. Secret** — JWT_SECRET.
- **6b-i-c. Algorithm** — HS256.

### 7a-i → levels
- **7a-i-a. Array** — 6 entries.
- **7a-i-b. Index** — level.
- **7a-i-c. Config** — per level.

### 8a-i → all
- **8a-i-a. Loop** — levels.
- **8a-i-b. Check** — each.
- **8a-i-c. Track** — max.

### 9b-i → loopback
- **9b-i-a. IP** — socket.
- **9b-i-b. Check** — isLoopback.
- **9b-i-c. Clear** — level 1.

### 10b-i → L0
- **10b-i-a. Open** — default.
- **10b-i-b. Unsafe** — production.
- **10b-i-c. Override** — config.

## L5 → expansion of selected L4 nodes

### 1c-i-a → network
- **1c-i-a-1. Reachable** — from LAN.
- **1c-i-a-2. Internet** — exposed.
- **1c-i-a-3. Firewall** — protection.

### 2d-i-a → prefix
- **2d-i-a-1. 127.0.0.1** — loopback.
- **2d-i-a-2. startsWith** — check.
- **2d-i-a-3. True** — loopback.

### 3a-i-a → 192.168.0.0/16
- **3a-i-a-1. Private** — RFC 1918.
- **3a-i-a-2. LAN** — home.
- **3a-i-a-3. Trust** — config.

### 4b-i-a → SHA-256
- **4b-i-a-1. Digest** — hex.
- **4b-i-a-2. Salted** — secret.
- **4b-i-a-3. Compare** — constant-time.

### 5a-i-a → UA_RULES
- **5a-i-a-1. Array** — 24.
- **5a-i-a-2. Order** — specific-first.
- **5a-i-a-3. Match** — regex.

### 6b-i-a → payload
- **6b-i-a-1. sub** — user id.
- **6b-i-a-2. exp** — expiry.
- **6b-i-a-3. iat** — issued.

### 7a-i-a → array
- **7a-i-a-1. 6** — entries.
- **7a-i-a-2. L0-L5** — levels.
- **7a-i-a-3. Config** — JSON.

### 8a-i-a → loop
- **8a-i-a-1. For** — each level.
- **8a-i-a-2. Check** — cleared.
- **8a-i-a-3. Max** — highest.

### 9b-i-a → IP
- **9b-i-a-1. Socket** — remoteAddress.
- **9b-i-a-2. Mapped** — ::ffff:.
- **9b-i-a-3. Check** — loopback.

### 10b-i-a → open
- **10b-i-a-1. Any** — request.
- **10b-i-a-2. No gate** — pass.
- **10b-i-a-3. Dev** — only.

## L6 → expansion of selected L5 nodes

### 1c-i-a-1 → reachable
- **1c-i-a-1-1. LAN** — local.
- **1c-i-a-1-2. WAN** — internet.
- **1c-i-a-1-3. Risk** — abuse.

### 2d-i-a-1 → 127.0.0.1
- **2d-i-a-1-1. IPv4** — loopback.
- **2d-i-a-1-2. ::1** — IPv6.
- **2d-i-a-1-3. Mapped** — ::ffff:127.0.0.1.

### 3a-i-a-1 → private
- **3a-i-a-1-1. RFC 1918** — standard.
- **3a-i-a-1-2. 10/8** — class A.
- **3a-i-a-1-3. 192.168/16** — class C.

### 4b-i-a-1 → digest
- **4b-i-a-1-1. Hex** — 64 chars.
- **4b-i-a-1-2. Salted** — secret.
- **4b-i-a-1-3. Store** — DB.

### 5a-i-a-1 → array
- **5a-i-a-1-1. 24 rules** — count.
- **5a-i-a-1-2. Ordered** — specific-first.
- **5a-i-a-1-3. Extend** — addSourceAppRule.

### 6b-i-a-1 → sub
- **6b-i-a-1-1. User id** — subject.
- **6b-i-a-1-2. Unique** — per user.
- **6b-i-a-1-3. Claim** — JWT.

### 7a-i-a-1 → 6 entries
- **7a-i-a-1-1. L0** — open.
- **7a-i-a-1-2. L1** — loopback.
- **7a-i-a-1-3. L5** — auth.

### 8a-i-a-1 → for
- **8a-i-a-1-1. Iterate** — levels.
- **8a-i-a-1-2. Evaluate** — each.
- **8a-i-a-1-3. Max** — track.

### 9b-i-a-1 → socket
- **9b-i-a-1-1. remoteAddress** — IP.
- **9b-i-a-1-2. Derive** — custom-server.
- **9b-i-a-1-3. Trust** — TCP.

### 10b-i-a-1 → any
- **10b-i-a-1-1. Request** — all.
- **10b-i-a-1-2. Pass** — no gate.
- **10b-i-a-1-3. Risk** — accepted.

## Confidence & open questions

- **Confidence: high** — codebase verified (isLoopback, sourceApps, JWT).
- **Open:** default level for production?
- **Open:** should L4 require L3?

## Sources

- `docs/plans-and-prompts/research/2026-09-14-keyless-governance-research.md` §G
- `custom-server.rate-limiter.js` (isLoopback)
- `src/lib/sourceApps.js`
- `src/dashboardGuard.js` (JWT)