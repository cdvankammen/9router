# Exponential Expansion E22 — Tag-Priority Queues

**Date:** 2026-09-15
**Root phrase:** "Tag-priority queues (strict priority/WFQ/aging/tag-based models, tag definitions with keywords, queue mechanics: bounded FIFO, TTL 60s, 503+Retry-After backpressure, head-of-line protection, interval pacing/leaky bucket)" — from `2026-09-14-keyless-governance-research.md` §D
**Format:** 6+ levels, variable branching
**Status:** complete

## L1 — sub-phrases discovered in the root

1. Strict priority queueing
2. Weighted fair queueing (WFQ)
3. Aging (starvation prevention)
4. Tag-based queue models
5. Tag definitions with keywords
6. Bounded FIFO
7. TTL 60s
8. 503 + Retry-After backpressure
9. Head-of-line protection
10. Interval pacing / leaky bucket

## L2 — expansion of each L1 node

### 1. Strict priority
- **1a. Classes** — 0-5.
- **1b. Drain** — highest first.
- **1c. Starvation** — low classes.
- **1d. Use** — interactive > batch.

### 2. WFQ
- **2a. Weights** — per class.
- **2b. Fairness** — proportional.
- **2c. Formula** — weight/total.
- **2d. Use** — mixed workloads.

### 3. Aging
- **3a. Wait time** — per item.
- **3b. Boost** — priority rises.
- **3c. Cap** — max boost.
- **3d. Prevent** — starvation.

### 4. Tag-based models
- **4a. Tags** — on requests.
- **4b. Priority map** — tag → class.
- **4c. Default** — class 0.
- **4d. Override** — per request.

### 5. Tag definitions
- **5a. Keywords** — "urgent", "batch".
- **5b. Regex** — pattern.
- **5c. Match** — prompt/headers.
- **5d. Config** — JSON.

### 6. Bounded FIFO
- **6a. Capacity** — max items.
- **6b. Overflow** — 503.
- **6c. Per class** — separate.
- **6d. Memory** — bounded.

### 7. TTL 60s
- **7a. Expiry** — 60s.
- **7b. Drop** — expired.
- **7c. Client** — retry.
- **7d. Config** — per queue.

### 8. 503 + Retry-After
- **8a. 503** — service unavailable.
- **8b. Retry-After** — seconds.
- **8c. Client** — backoff.
- **8d. Standard** — HTTP.

### 9. Head-of-line protection
- **9a. Slow item** — blocks queue.
- **9b. Timeout** — per item.
- **9c. Skip** — move on.
- **9d. Parallel** — concurrency.

### 10. Interval pacing
- **10a. Leaky bucket** — fixed rate.
- **10b. Interval** — ms between.
- **10c. Burst** — capacity.
- **10d. Smooth** — upstream load.

## L3 — expansion of selected L2 nodes

### 1b → drain
- **1b-i. Highest** — class 5 first.
- **1b-ii. Empty** — then next.
- **1b-iii. Fairness** — none.

### 2a → weights
- **2a-i. Class 0** — weight 1.
- **2a-ii. Class 3** — weight 4.
- **2a-iii. Class 5** — weight 8.
- **2a-iv. Config** — per class.

### 3b → boost
- **3b-i. Rate** — +1/min.
- **3b-ii. Cap** — +3.
- **3b-iii. Reset** — on dequeue.

### 4b → priority map
- **4b-i. "urgent"** — class 5.
- **4b-ii. "batch"** — class 0.
- **4b-iii. "interactive"** — class 3.
- **4b-iv. Default** — class 0.

### 5b → regex
- **5b-i. Pattern** — /urgent/i.
- **5b-ii. Source** — prompt.
- **5b-iii. Source** — header.
- **5b-iv. Test** — match.

### 6a → capacity
- **6a-i. Default** — 100.
- **6a-ii. Per class** — 20.
- **6a-iii. Config** — queue.json.

### 7a → expiry
- **7a-i. Enqueue time** — stored.
- **7a-ii. Now - enqueue** — age.
- **7a-iii. > 60s** — drop.

### 8a → 503
- **8a-i. Status** — 503.
- **8a-ii. Body** — JSON error.
- **8a-iii. Log** — queue full.

### 9b → timeout
- **9b-i. Per item** — 30s.
- **9b-ii. Abort** — upstream.
- **9b-iii. Next** — continue.

### 10a → leaky bucket
- **10a-i. Rate** — r items/s.
- **10a-ii. Capacity** — b items.
- **10a-iii. Drain** — continuous.

## L4 → expansion of selected L3 nodes

### 1b-i → class 5 first
- **1b-i-a. Dequeue** — from class 5.
- **1b-i-b. Empty** — class 4.
- **1b-i-c. Down** — to class 0.

### 2a-i → weight 1
- **2a-i-a. Baseline** — class 0.
- **2a-i-b. Share** — 1/13.
- **2a-i-c. Example** — 13 total.

### 3b-i → +1/min
- **3b-i-a. Timer** — per item.
- **3b-i-b. Increment** — priority.
- **3b-i-c. Cap** — +3.

### 4b-i → "urgent"
- **4b-i-a. Keyword** — urgent.
- **4b-i-b. Case** — insensitive.
- **4b-i-c. Match** — prompt.

### 5b-i → pattern
- **5b-i-a. /urgent/i** — regex.
- **5b-i-b. /batch/i** — regex.
- **5b-i-c. /now/i** — regex.

### 6a-i → default 100
- **6a-i-a. Total** — 100 items.
- **6a-i-b. Memory** — ~1MB.
- **6a-i-c. Overflow** — 503.

### 7a-i → enqueue time
- **7a-i-a. Date.now()** — ms.
- **7a-i-b. Store** — item.
- **7a-i-c. Compare** — sweep.

### 8a-i → status 503
- **8a-i-a. HTTP** — standard.
- **8a-i-b. Retry-After** — header.
- **8a-i-c. Body** — error JSON.

### 9b-i → 30s
- **9b-i-a. Timeout** — per item.
- **9b-i-b. AbortController** — abort.
- **9b-i-c. Error** — logged.

### 10a-i → rate
- **10a-i-a. r** — items/s.
- **10a-i-b. Config** — per queue.
- **10a-i-c. Smooth** — upstream.

## L5 → expansion of selected L4 nodes

### 1b-i-a → dequeue class 5
- **1b-i-a-1. Shift** — FIFO.
- **1b-i-a-2. Dispatch** — executor.
- **1b-i-a-3. Next** — loop.

### 2a-i-a → baseline
- **2a-i-a-1. Class 0** — lowest.
- **2a-i-a-2. Weight** — 1.
- **2a-i-a-3. Share** — proportional.

### 3b-i-a → timer
- **3b-i-a-1. setInterval** — 60s.
- **3b-i-a-2. Scan** — queued.
- **3b-i-a-3. Boost** — priority.

### 4b-i-a → keyword
- **4b-i-a-1. List** — config.
- **4b-i-a-2. Match** — prompt text.
- **4b-i-a-3. Class** — mapped.

### 5b-i-a → /urgent/i
- **5b-i-a-1. Test** — regex.test.
- **5b-i-a-2. Source** — prompt.
- **5b-i-a-3. Header** — x-9r-priority.

### 6a-i-a → 100 items
- **6a-i-a-1. Bound** — memory.
- **6a-i-a-2. Per class** — 20.
- **6a-i-a-3. Total** — 100.

### 7a-i-a → Date.now()
- **7a-i-a-1. Enqueue** — timestamp.
- **7a-i-a-2. Age** — now - t.
- **7a-i-a-3. Drop** — > 60s.

### 8a-i-a → HTTP 503
- **8a-i-a-1. Standard** — RFC 9110.
- **8a-i-a-2. Retry-After** — seconds.
- **8a-i-a-3. Client** — backoff.

### 9b-i-a → timeout
- **9b-i-a-1. 30s** — default.
- **9b-i-a-2. Config** — per queue.
- **9b-i-a-3. Abort** — upstream.

## L6 → expansion of selected L5 nodes

### 1b-i-a-1 → shift
- **1b-i-a-1-1. Array** — queue.
- **1b-i-a-1-2. shift()** — O(n).
- **1b-i-a-1-3. Linked** — O(1).

### 2a-i-a-1 → class 0
- **2a-i-a-1-1. Lowest** — priority.
- **2a-i-a-1-2. Default** — tag-less.
- **2a-i-a-1-3. Batch** — jobs.

### 3b-i-a-1 → setInterval
- **3b-i-a-1-1. 60s** — sweep.
- **3b-i-a-1-2. Scan** — all queues.
- **3b-i-a-1-3. Boost** — aging.

### 4b-i-a-1 → list
- **4b-i-a-1-1. urgent** — class 5.
- **4b-i-a-1-2. batch** — class 0.
- **4b-i-a-1-3. interactive** — class 3.

### 5b-i-a-1 → regex.test
- **5b-i-a-1-1. Global** — no g flag.
- **5b-i-a-1-2. LastIndex** — reset.
- **5b-i-a-1-3. Case** — i flag.

### 6a-i-a-1 → bound
- **6a-i-a-1-1. Memory** — bounded.
- **6a-i-a-1-2. DoS** — protection.
- **6a-i-a-1-3. 503** — overflow.

## Confidence & open questions

- **Confidence: high** — standard queueing theory + HTTP semantics.
- **Open:** strict priority vs WFQ default?
- **Open:** aging boost rate?

## Sources

- `docs/plans-and-prompts/research/2026-09-14-keyless-governance-research.md` §D
- RFC 9110 (503, Retry-After)
- Queueing theory (strict priority, WFQ, leaky bucket)