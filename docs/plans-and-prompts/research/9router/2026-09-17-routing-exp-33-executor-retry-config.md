# Routing Exponential Expansion R33 — Executor Retry Config

**Date:** 2026-09-19
**Author:** GitHub Copilot agent (main session)
**Status:** active
**Tags:** #research #routing #exponential #executor #retry-config #default-retry #timeout #9router

## Objective

N-ary exponential expansion (6+ levels, N children per node) of the root phrase **"Executor retry config (DEFAULT_RETRY_CONFIG, FETCH_CONNECT_TIMEOUT_MS)"** from `42-branch-cascades-and-fallbacks.md` L2-AB + `06-executors-deep-dive.md`.

## L1 — sub-phrases discovered in the root

1. DEFAULT_RETRY_CONFIG (429:0, 502:3×3s, 503:3×2s, 504:2×3s)
2. FETCH_CONNECT_TIMEOUT_MS (60s)
3. Base-URL fallback loop
4. Per-status retry counts
5. Retry delay semantics

## L2 — expansion of each L1 node

### 1. DEFAULT_RETRY_CONFIG
- **1a. 429** — 0 retries.
- **1b. 502** — 3 retries × 3s.
- **1c. 503** — 3 retries × 2s.
- **1d. 504** — 2 retries × 3s.

### 2. FETCH_CONNECT_TIMEOUT_MS
- **2a. Value** — 60,000ms.
- **2b. Scope** — connect phase.
- **2c. Effect** — fail fast.
- **2d. Config** — env override.

### 3. Base-URL fallback loop
- **3a. Multiple base URLs** — per provider.
- **3b. Order** — priority.
- **3c. Fallback** — next URL.
- **3d. Exhaustion** — all failed.

### 4. Per-status retry counts
- **4a. 429:0** — no retry.
- **4b. 502:3** — retry 3.
- **4c. 503:3** — retry 3.
- **4d. 504:2** — retry 2.

### 5. Retry delay semantics
- **5a. Fixed delay** — per status.
- **5b. 3s** — 502/504.
- **5c. 2s** — 503.
- **5d. No backoff** — fixed.

## L3 — expansion of selected L2 nodes (variable branching)

### 1a → 429:0
- **1a-i. Rationale** — rate limit.
- **1a-ii. Retry useless** — immediate.
- **1a-iii. Cooldown** — account switch.
- **1a-iv. Alternative** — wait.

### 2a → 60s value
- **2a-i. Rationale** — slow providers.
- **2a-ii. Tradeoff** — latency.
- **2a-iii. Tuning** — per-provider.
- **2a-iv. Default** — 60s.

### 3a → multiple base URLs
- **3a-i. Mirror** — same provider.
- **3a-ii. Region** — geo endpoints.
- **3a-iii. Priority** — order.
- **3a-iv. Health** — skip dead.

### 4a → 429 no retry
- **4a-i. Effect** — fail fast.
- **4a-ii. Fallback** — next model.
- **4a-iii. Account** — switch.
- **4a-iv. User** — sees error.

### 5a → fixed delay
- **5a-i. Predictable** — timing.
- **5a-ii. Simple** — implementation.
- **5a-iii. No jitter** — thundering herd.
- **5a-iv. Alternative** — backoff.

## L4 — expansion of selected L3 nodes

### 1a-i → rationale
- **1a-i-a. Rate limit** — provider.
- **1a-i-b. Retry-After** — unknown.
- **1a-i-c. Immediate retry** — fails.
- **1a-i-d. Better** — switch.

### 2a-i → slow providers
- **2a-i-a. Connect** — TCP.
- **2a-i-b. TLS** — handshake.
- **2a-i-c. First byte** — TTFB.
- **2a-i-d. 60s** — generous.

### 3a-i → mirror
- **3a-i-a. Same API** — compatible.
- **3a-i-b. Load** — split.
- **3a-i-c. Failover** — automatic.
- **3a-i-d. Config** — list.

### 4a-i → fail fast
- **4a-i-a. Latency** — minimal.
- **4a-i-b. User** — quick error.
- **4a-i-c. Fallback** — next.
- **4a-i-d. Log** — rate limit.

### 5a-i → predictable
- **5a-i-a. Timing** — known.
- **5a-i-b. Testing** — deterministic.
- **5a-i-c. Monitoring** — expected.
- **5a-i-d. Docs** — documented.

## L5 — expansion of selected L4 nodes

### 1a-i-a → rate limit
- **1a-i-a-1. Provider** — per-provider.
- **1a-i-a-2. Window** — per-minute.
- **1a-i-a-3. Header** — x-ratelimit.
- **1a-i-a-4. Action** — switch account.

### 2a-i-a → TCP connect
- **2a-i-a-1. DNS** — resolution.
- **2a-i-a-2. SYN** — handshake.
- **2a-i-a-3. TLS** — cert.
- **2a-i-a-4. Timeout** — 60s.

### 3a-i-a → same API
- **3a-i-a-1. OpenAI-compat** — standard.
- **3a-i-a-2. Auth** — same key.
- **3a-i-a-3. Models** — same names.
- **3a-i-a-4. 9Router** — default executor.

### 4a-i-a → latency
- **4a-i-a-1. Fast** — immediate.
- **4a-i-a-2. User** — no wait.
- **4a-i-a-3. Fallback** — instant.
- **4a-i-a-4. UX** — better.

### 5a-i-a → known timing
- **5a-i-a-1. 3s** — 502.
- **5a-i-a-2. 2s** — 503.
- **5a-i-a-3. 3s** — 504.
- **5a-i-a-4. Total** — ≤9s.

## L6 — expansion of selected L5 nodes

### 1a-i-a-1 → per-provider
- **1a-i-a-1-i. OpenAI** — RPM.
- **1a-i-a-1-ii. Anthropic** — RPM.
- **1a-i-a-1-iii. Google** — RPM.
- **1a-i-a-1-iv. Custom** — varies.

### 2a-i-a-1 → DNS
- **2a-i-a-1-i. Lookup** — ms.
- **2a-i-a-1-ii. Cache** — TTL.
- **2a-i-a-1-iii. Failure** — timeout.
- **2a-i-a-1-iv. Retry** — next URL.

### 3a-i-a-1 → OpenAI-compat
- **3a-i-a-1-i. /v1/chat** — endpoint.
- **3a-i-a-1-ii. SSE** — streaming.
- **3a-i-a-1-iii. Auth** — Bearer.
- **3a-i-a-1-iv. Errors** — standard.

### 4a-i-a-1 → immediate
- **4a-i-a-1-i. 429** — instant fail.
- **4a-i-a-1-ii. No wait** — user.
- **4a-i-a-1-iii. Fallback** — next model.
- **4a-i-a-1-iv. Log** — reason.

### 5a-i-a-1 → 3s delay
- **5a-i-a-1-i. Wait** — sleep.
- **5a-i-a-1-ii. Timer** — setTimeout.
- **5a-i-a-1-iii. Cancel** — abort.
- **5a-i-a-1-iv. Total** — 9s worst.

## Confidence & open questions

- **High confidence:** DEFAULT_RETRY_CONFIG and FETCH_CONNECT_TIMEOUT_MS are in `open-sse/executors/` (branch 42 + 06).
- **Open questions:**
  - Should 429 get a short retry with backoff instead of 0?
  - Is 60s connect timeout too long for user-facing latency?
  - Should retry delays use jitter to avoid thundering herd?

## Sources

- `docs/plans-and-prompts/research/9router/42-branch-cascades-and-fallbacks.md` L2-AB
- `docs/plans-and-prompts/research/9router/06-executors-deep-dive.md`
- `open-sse/executors/` (DEFAULT_RETRY_CONFIG, FETCH_CONNECT_TIMEOUT_MS)