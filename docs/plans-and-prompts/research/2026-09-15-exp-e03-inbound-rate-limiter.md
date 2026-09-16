# Exponential Expansion E03 — Inbound Rate Limiter (`custom-server.rate-limiter.js`)

**Date:** 2026-09-15
**Root phrase:** "Inbound rate limiter (`custom-server.rate-limiter.js`)" — from `2026-08-31-message-origin-and-destination-research.md` §A.3
**Format:** 6+ levels, variable branching
**Status:** complete

## L1 — sub-phrases discovered in the root

1. Sliding-window counter per IP
2. In-memory, zero-dependency
3. Limits: `general` 120 req/min, `chat` 20 req/min
4. Loopback bypass
5. 429 + `Retry-After`
6. Gaps: no token-bucket, no per-key/per-user, no per-model, no queueing, no spend caps, no response headers, no workspace/team

## L2 — expansion of each L1 node

### 1. Sliding-window counter per IP
- **1a. Algorithm** — two fixed-size maps (counters + timestamps) keyed by IP.
- **1b. Window roll** — if oldest entry outside window, reset counter.
- **1c. Excess cleanup** — if counter exceeds limit AND window expired, reset.
- **1d. Periodic sweep** — every 60s, evict entries older than 2× window.
- **1e. Memory bound** — prevents unbounded growth on LAN-exposed server.

### 2. In-memory, zero-dependency
- **2a. No external store** — no Redis, no DB.
- **2b. Single-process** — fine for one Node server.
- **2c. Restart loss** — counters reset on restart.
- **2d. Multi-instance gap** — not shared across processes.

### 3. Limits
- **3a. general 120/min** — `/api/*`, `/v1/*`, static assets, health checks.
- **3b. chat 20/min** — `/v1/chat/completions`, `/v1/completions` (POST).
- **3c. Classification** — `classifyRequest` → 'chat' or 'general'.
- **3d. CHAT_PATHS** — case-insensitive match on req.url.

### 4. Loopback bypass
- **4a. LOOPBACK set** — `127.0.0.1`, `::1`, `::ffff:127.0.0.1`.
- **4b. isLoopback** — also `ip.startsWith("127.")`.
- **4c. Rationale** — local tool usage shouldn't be limited.
- **4d. Security note** — loopback is trusted; LAN is not.

### 5. 429 + Retry-After
- **5a. Response** — 429 Too Many Requests.
- **5b. Retry-After header** — seconds until next slot.
- **5c. Client behavior** — SDKs honor Retry-After.

### 6. Gaps
- **6a. No token-bucket** — burst semantics absent.
- **6b. No per-key/per-user** — IP only.
- **6c. No per-model** — model dimension absent.
- **6d. No queueing** — reject, don't queue.
- **6e. No spend caps** — USD budgets absent.
- **6f. No response headers** — `x-ratelimit-*` absent.
- **6g. No workspace/team** — group dimension absent.

## L3 — expansion of selected L2 nodes

### 1a → two maps
- **1a-i. counters Map** — ip → count.
- **1a-ii. timestamps Map** — ip → last-request epoch ms.
- **1a-iii. lastCleanup** — module-level Date.now().

### 1d → periodic sweep
- **1d-i. Interval** — 60s.
- **1d-ii. Eviction** — entries older than 2× window (120s).
- **1d-iii. Cost** — O(n) over active IPs; negligible.

### 3c → classifyRequest
- **3c-i. Chat paths** — `/v1/chat/completions`, `/v1/completions`.
- **3c-ii. Method** — POST only for chat classification.
- **3c-iii. Fallback** — everything else → general.

### 4a → LOOPBACK set
- **4a-i. IPv4** — `127.0.0.1`.
- **4a-ii. IPv6** — `::1`.
- **4a-iii. Mapped** — `::ffff:127.0.0.1`.
- **4a-iv. Prefix** — `127.` covers 127.0.0.0/8.

### 6a → token-bucket absence
- **6a-i. What token bucket gives** — burst capacity + continuous refill.
- **6a-ii. Sliding window vs bucket** — window counts; bucket meters.
- **6a-iii. Anthropic precedent** — token bucket per model (see E10).

## L4 — expansion of selected L3 nodes

### 1a-i → counters Map
- **1a-i-a. Key** — IP string.
- **1a-i-b. Value** — integer count.
- **1a-i-c. Growth** — bounded by sweep.

### 3c-i → chat paths
- **3c-i-a. `/v1/chat/completions`** — the main LLM endpoint.
- **3c-i-b. `/v1/completions`** — legacy completions.
- **3c-i-c. Other /v1/** — embeddings, models → general.

### 4a-iv → 127.0.0.0/8
- **4a-iv-a. Range** — 127.0.0.0 – 127.255.255.255.
- **4a-iv-b. Why** — all loopback addresses, not just .1.
- **4a-iv-c. Docker note** — containers on bridge networks use 172.x, NOT loopback.

### 6a-iii → Anthropic token bucket
- **6a-iii-a. RPM** — requests per minute.
- **6a-iii-b. ITPM** — input tokens per minute.
- **6a-iii-c. OTPM** — output tokens per minute.
- **6a-iii-d. Continuous refill** — capacity replenishes, not reset.

## L5 — expansion of selected L4 nodes

### 3c-i-a → /v1/chat/completions
- **3c-i-a-1. Volume** — the highest-traffic endpoint.
- **3c-i-a-2. Cost** — each call costs tokens.
- **3c-i-a-3. Abuse surface** — the endpoint attackers target.

### 4a-iv-c → Docker bridge networks
- **4a-iv-c-1. 172.17.0.0/16** — default bridge.
- **4a-iv-c-2. Not loopback** — containers appear as LAN IPs.
- **4a-iv-c-3. Rate limiter impact** — containerized clients get limited.
- **4a-iv-c-4. Fix option** — add trusted-subnet bypass (see E19).

### 6a-iii-d → continuous refill
- **6a-iii-d-1. Burst capacity** — bucket size = burst.
- **6a-iii-d-2. Refill rate** — tokens/sec.
- **6a-iii-d-3. 429 semantics** — retry-after-ms.

## L6 — expansion of selected L5 nodes

### 4a-iv-c-3 → containerized clients limited
- **4a-iv-c-3-1. Symptom** — Dockerized agents hit 429 unexpectedly.
- **4a-iv-c-3-2. Diagnosis** — IP is 172.x, not loopback.
- **4a-iv-c-3-3. Workaround** — raise limits or add subnet bypass.
- **4a-iv-c-3-4. Design fix** — trusted-subnet list in config (see E19).

### 6a-iii-d-2 → refill rate
- **6a-iii-d-2-1. Formula** — limit / 60 tokens per second.
- **6a-iii-d-2-2. Example** — 2,000,000 ITPM → ~33,333 tokens/s.
- **6a-iii-d-2-3. Cache-aware** — cached reads don't count (see E10).

## Confidence & open questions

- **Confidence: high** — codebase read directly (`custom-server.rate-limiter.js`).
- **Open:** should the limiter move to token-bucket semantics?
- **Open:** should trusted subnets be configurable?
- **Open:** should `x-ratelimit-*` headers be added?

## Sources

- `custom-server.rate-limiter.js` (read directly)
- `custom-server.js` (wrapper that calls it)
- `docs/plans-and-prompts/research/2026-08-31-message-origin-and-destination-research.md` §A.3