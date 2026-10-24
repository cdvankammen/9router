# Routing Exponential Expansion R55 — MITM & Security

**Date:** 2026-09-19
**Author:** GitHub Copilot agent (main session)
**Status:** active
**Tags:** #research #routing #exponential #mitm #security #proxy #interception #transformation #9router

## Objective

N-ary exponential expansion (6+ levels, N children per node) of the root phrase **"MITM & security (intercepting/transforming traffic, IP derivation, X-Forwarded-For)"** from `47-branch-9router-internal-threads.md` L1-B + `14-mitm-deep-dive.md` + `custom-server.js`.

## L1 — sub-phrases discovered in the root

1. MITM proxy (intercept/transform)
2. Client IP derivation (TCP socket)
3. X-Forwarded-For stripping (security)
4. Loopback reverse proxy trust
5. Rate limiting (per-IP)

## L2 — expansion of each L1 node

### 1. MITM proxy
- **1a. Intercept** — traffic.
- **1b. Transform** — requests.
- **1c. Forward** — upstream.
- **1d. Respond** — modified.

### 2. Client IP derivation
- **2a. TCP socket** — source.
- **2b. Direct** — connection.
- **2c. Trusted** — address.
- **2d. Use** — rate limit.

### 3. X-Forwarded-For stripping
- **3a. Header** — attacker-controlled.
- **3b. Strip** — untrusted.
- **3c. Trust** — loopback only.
- **3d. Prevent** — spoofing.

### 4. Loopback trust
- **4a. 127.0.0.1** — loopback.
- **4b. Reverse proxy** — local.
- **4c. Forward** — headers.
- **4d. Trust** — only.

### 5. Rate limiting
- **5a. Per-IP** — limits.
- **5b. Window** — time.
- **5c. Burst** — allowance.
- **5d. Response** — 429.

## L3 — expansion of selected L2 nodes (variable branching)

### 1a → intercept
- **1a-i. Requests** — capture.
- **1a-ii. Responses** — capture.
- **1a-iii. Streams** — SSE.
- **1a-iv. Logs** — record.

### 2a → TCP socket
- **2a-i. remoteAddress** — socket.
- **2a-ii. Direct** — connection.
- **2a-iii. No proxy** — real IP.
- **2a-iv. Trusted** — source.

### 3a → header
- **3a-i. Name** — X-Forwarded-For.
- **3a-ii. Value** — IP list.
- **3a-iii. Spoof** — easy.
- **3a-iv. Strip** — untrusted.

### 4a → 127.0.0.1
- **4a-i. Loopback** — local.
- **4a-ii. Proxy** — localhost.
- **4a-iii. Trust** — headers.
- **4a-iv. Else** — strip.

### 5a → per-IP
- **5a-i. Key** — IP.
- **5a-ii. Count** — requests.
- **5a-iii. Limit** — threshold.
- **5a-iv. Reset** — window.

## L4 — expansion of selected L3 nodes

### 1a-i → requests
- **1a-i-a. Method** — GET/POST.
- **1a-i-b. Path** — URL.
- **1a-i-c. Headers** — meta.
- **1a-i-d. Body** — payload.

### 2a-i → remoteAddress
- **2a-i-a. Node** — socket.
- **2a-i-b. Property** — remoteAddress.
- **2a-i-c. Value** — IP.
- **2a-i-d. IPv6** — mapped.

### 3a-i → name
- **3a-i-a. Standard** — header.
- **3a-i-b. Chain** — proxies.
- **3a-i-c. Leftmost** — client.
- **3a-i-d. Spoofable** — yes.

### 4a-i → loopback
- **4a-i-a. 127.0.0.1** — IPv4.
- **4a-i-b. ::1** — IPv6.
- **4a-i-c. Localhost** — name.
- **4a-i-d. Trust** — only.

### 5a-i → key
- **5a-i-a. IP string** — key.
- **5a-i-b. Map** — counters.
- **5a-i-c. TTL** — window.
- **5a-i-d. Cleanup** — expired.

## L5 — expansion of selected L4 nodes

### 1a-i-a → method
- **1a-i-a-1. GET** — read.
- **1a-i-a-2. POST** — write.
- **1a-i-a-3. PUT** — update.
- **1a-i-a-4. DELETE** — remove.

### 2a-i-a → Node socket
- **2a-i-a-1. net** — module.
- **2a-i-a-2. Socket** — object.
- **2a-i-a-3. remoteAddress** — field.
- **2a-i-a-4. remotePort** — field.

### 3a-i-a → standard
- **3a-i-a-1. RFC** — 7239.
- **3a-i-a-2. Proxies** — append.
- **3a-i-a-3. Clients** — spoof.
- **3a-i-a-4. Trust** — carefully.

### 4a-i-a → 127.0.0.1
- **4a-i-a-1. IPv4** — loopback.
- **4a-i-a-2. Range** — 127/8.
- **4a-i-a-3. Local** — only.
- **4a-i-a-4. Trust** — proxy.

### 5a-i-a → IP string
- **5a-i-a-1. Format** — dotted.
- **5a-i-a-2. IPv6** — colon.
- **5a-i-a-3. Normalize** — canonical.
- **5a-i-a-4. Key** — use.

## L6 — expansion of selected L5 nodes

### 1a-i-a-1 → GET
- **1a-i-a-1-i. Read** — resource.
- **1a-i-a-1-ii. Safe** — no side effects.
- **1a-i-a-1-iii. Cache** — possible.
- **1a-i-a-1-iv. Idempotent** — yes.

### 2a-i-a-1 → net module
- **2a-i-a-1-i. Node** — built-in.
- **2a-i-a-1-ii. TCP** — sockets.
- **2a-i-a-1-iii. Server** — listen.
- **2a-i-a-1-iv. Client** — connect.

### 3a-i-a-1 → RFC 7239
- **3a-i-a-1-i. Standard** — forwarded.
- **3a-i-a-1-ii. Fields** — for/by.
- **3a-i-a-1-iii. Adopted** — proxies.
- **3a-i-a-1-iv. Legacy** — XFF.

### 4a-i-a-1 → IPv4 loopback
- **4a-i-a-1-i. 127.0.0.0/8** — range.
- **4a-i-a-1-ii. Local** — machine.
- **4a-i-a-1-iii. No network** — exposure.
- **4a-i-a-1-iv. Trust** — safe.

### 5a-i-a-1 → dotted format
- **5a-i-a-1-i. 4 octets** — IPv4.
- **5a-i-a-1-ii. 0–255** — each.
- **5a-i-a-1-iii. String** — "1.2.3.4".
- **5a-i-a-1-iv. Parse** — validate.

## Confidence & open questions

- **High confidence:** MITM/security architecture from branch 47 + 14-mitm-deep-dive + custom-server.js.
- **Open questions:**
  - What transformations does the MITM layer apply?
  - How is rate limiting configured (limits, windows)?
  - Are there other spoofable headers to strip?

## Sources

- `docs/plans-and-prompts/research/9router/47-branch-9router-internal-threads.md` L1-B
- `docs/plans-and-prompts/research/9router/14-mitm-deep-dive.md`
- `custom-server.js` (IP derivation, XFF stripping)
- `custom-server.rate-limiter.js`