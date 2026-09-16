# Exponential Expansion E24 — Adaptive Rate Control

**Date:** 2026-09-15
**Root phrase:** "Adaptive rate control (algorithm inventory table, AIMD+EWMA+feedback hybrid with formulas, budget-proportional pacing remaining_budget/remaining_seconds, UI exposure)" — from `2026-09-14-keyless-governance-research.md` §F
**Format:** 6+ levels, variable branching
**Status:** complete

## L1 — sub-phrases discovered in the root

1. Algorithm inventory table
2. AIMD (additive increase, multiplicative decrease)
3. EWMA (exponentially weighted moving average)
4. Feedback hybrid
5. Budget-proportional pacing
6. Formula: remaining_budget / remaining_seconds
7. UI exposure
8. 429 feedback loop
9. Latency feedback
10. Error-rate feedback

## L2 — expansion of each L1 node

### 1. Algorithm inventory
- **1a. Fixed window** — simple.
- **1b. Sliding window** — precise.
- **1c. Token bucket** — burst.
- **1d. Leaky bucket** — smooth.
- **1e. AIMD** — adaptive.
- **1f. EWMA** — smoothing.
- **1g. PID** — control.
- **1h. Hybrid** — combined.

### 2. AIMD
- **2a. Additive increase** — +1.
- **2b. Multiplicative decrease** — ×0.5.
- **2c. On success** — increase.
- **2d. On 429** — decrease.
- **2e. Formula** — rate += 1; rate *= 0.5.

### 3. EWMA
- **3a. Alpha** — smoothing factor.
- **3b. Formula** — avg = α·x + (1−α)·avg.
- **3c. Latency** — smoothed.
- **3d. Error rate** — smoothed.
- **3e. Alpha default** — 0.3.

### 4. Feedback hybrid
- **4a. Inputs** — 429, latency, errors.
- **4b. Combine** — weighted.
- **4c. Output** — rate.
- **4d. Stability** — damped.

### 5. Budget-proportional pacing
- **5a. Budget** — USD remaining.
- **5b. Time** — period remaining.
- **5c. Rate** — budget/time.
- **5d. Spend** — evenly.

### 6. Formula
- **6a. Numerator** — remaining_budget.
- **6b. Denominator** — remaining_seconds.
- **6c. Result** — spend rate.
- **6d. Units** — USD/s.

### 7. UI exposure
- **7a. Dashboard** — current rate.
- **7b. Chart** — rate over time.
- **7c. Config** — alpha, weights.
- **7d. Alerts** — rate changes.

### 8. 429 feedback
- **8a. Signal** — upstream 429.
- **8b. Count** — per window.
- **8c. Decrease** — rate.
- **8d. Cooldown** — hold.

### 9. Latency feedback
- **9a. Measure** — request time.
- **9b. EWMA** — smooth.
- **9c. High** — decrease.
- **9d. Low** — increase.

### 10. Error-rate feedback
- **10a. Errors** — 5xx.
- **10b. Rate** — per window.
- **10c. High** — decrease.
- **10d. Threshold** — 5%.

## L3 — expansion of selected L2 nodes

### 1e → AIMD
- **1e-i. Increase** — +1/cycle.
- **1e-ii. Decrease** — ×0.5.
- **1e-iii. Cycle** — 60s.
- **1e-iv. Bounds** — min/max.

### 2a → additive increase
- **2a-i. +1** — per cycle.
- **2a-ii. No 429** — condition.
- **2a-iii. Cap** — max rate.

### 3a → alpha
- **3a-i. 0.3** — default.
- **3a-ii. 0.1** — smooth.
- **3a-iii. 0.5** — reactive.
- **3a-iv. Config** — per key.

### 4a → inputs
- **4a-i. 429 count** — signal.
- **4a-ii. Latency** — signal.
- **4a-iii. Error rate** — signal.
- **4a-iv. Weights** — config.

### 5a → budget
- **5a-i. USD** — remaining.
- **5a-ii. Period** — day/week/month.
- **5a-iii. Track** — usageDb.

### 6a → numerator
- **6a-i. remaining_budget** — USD.
- **6a-ii. Source** — usage.
- **6a-iii. Update** — per request.

### 7a → dashboard
- **7a-i. Rate** — current.
- **7a-ii. History** — chart.
- **7a-iii. Config** — panel.

### 8a → signal
- **8a-i. Status** — 429.
- **8a-ii. Retry-After** — header.
- **8a-iii. Count** — window.

### 9a → measure
- **9a-i. Start** — timestamp.
- **9a-ii. End** — response.
- **9a-iii. Diff** — ms.

### 10a → errors
- **10a-i. 5xx** — status.
- **10a-ii. Timeout** — error.
- **10a-iii. Count** — window.

## L4 → expansion of selected L3 nodes

### 1e-i → increase
- **1e-i-a. +1 RPM** — per cycle.
- **1e-i-b. No 429** — condition.
- **1e-i-c. Cap** — max.

### 2a-i → +1
- **2a-i-a. Unit** — RPM.
- **2a-i-b. Cycle** — 60s.
- **2a-i-c. Linear** — growth.

### 3a-i → 0.3
- **3a-i-a. Default** — alpha.
- **3a-i-b. Balance** — responsive.
- **3a-i-c. Stable** — enough.

### 4a-i → 429 count
- **4a-i-a. Window** — 60s.
- **4a-i-b. Weight** — 0.5.
- **4a-i-c. Decrease** — rate.

### 5a-i → USD
- **5a-i-a. Budget** — per key.
- **5a-i-b. Spent** — usage.
- **5a-i-c. Remaining** — diff.

### 6a-i → remaining_budget
- **6a-i-a. Compute** — budget − spent.
- **6a-i-b. Negative** — clamp 0.
- **6a-i-c. Hard stop** — block.

### 7a-i → rate
- **7a-i-a. Current** — value.
- **7a-i-b. Target** — computed.
- **7a-i-c. Display** — RPM.

### 8a-i → status
- **8a-i-a. 429** — upstream.
- **8a-i-b. Parse** — response.
- **8a-i-c. Count** — increment.

### 9a-i → start
- **9a-i-a. Before** — dispatch.
- **9a-i-b. Date.now()** — ms.
- **9a-i-c. Store** — per request.

### 10a-i → 5xx
- **10a-i-a. 500** — server.
- **10a-i-b. 502** — bad gateway.
- **10a-i-c. 503** — unavailable.

## L5 → expansion of selected L4 nodes

### 1e-i-a → +1 RPM
- **1e-i-a-1. Increment** — rate.
- **1e-i-a-2. Per cycle** — 60s.
- **1e-i-a-3. No 429** — condition.

### 2a-i-a → unit
- **2a-i-a-1. RPM** — requests/min.
- **2a-i-a-2. Integer** — value.
- **2a-i-a-3. Display** — dashboard.

### 3a-i-a → default
- **3a-i-a-1. 0.3** — alpha.
- **3a-i-a-2. Config** — override.
- **3a-i-a-3. Per key** — scoped.

### 4a-i-a → window
- **4a-i-a-1. 60s** — fixed.
- **4a-i-a-2. Count** — 429s.
- **4a-i-a-3. Reset** — each window.

### 5a-i-a → budget
- **5a-i-a-1. Config** — per key.
- **5a-i-a-2. USD** — currency.
- **5a-i-a-3. Period** — reset.

### 6a-i-a → compute
- **6a-i-a-1. budget − spent** — diff.
- **6a-i-a-2. Clamp** — ≥ 0.
- **6a-i-a-3. Update** — per request.

### 7a-i-a → current
- **7a-i-a-1. Value** — rate.
- **7a-i-a-2. Source** — controller.
- **7a-i-a-3. Display** — RPM.

### 8a-i-a → 429
- **8a-i-a-1. Upstream** — provider.
- **8a-i-a-2. Status** — 429.
- **8a-i-a-3. Count** — feedback.

### 9a-i-a → before
- **9a-i-a-1. Dispatch** — executor.
- **9a-i-a-2. Timestamp** — start.
- **9a-i-a-3. Store** — map.

### 10a-i-a → 500
- **10a-i-a-1. Server error** — upstream.
- **10a-i-a-2. Count** — error rate.
- **10a-i-a-3. Feedback** — decrease.

## L6 → expansion of selected L5 nodes

### 1e-i-a-1 → increment
- **1e-i-a-1-1. rate + 1** — new.
- **1e-i-a-1-2. Cap** — max.
- **1e-i-a-1-3. Store** — state.

### 2a-i-a-1 → RPM
- **2a-i-a-1-1. Requests** — count.
- **2a-i-a-1-2. Per minute** — window.
- **2a-i-a-1-3. Rate** — value.

### 3a-i-a-1 → 0.3
- **3a-i-a-1-1. Alpha** — smoothing.
- **3a-i-a-1-2. Formula** — α·x + (1−α)·avg.
- **3a-i-a-1-3. Tune** — config.

### 4a-i-a-1 → 60s
- **4a-i-a-1-1. Window** — fixed.
- **4a-i-a-1-2. Sliding** — precise.
- **4a-i-a-1-3. Choice** — config.

### 5a-i-a-1 → config
- **5a-i-a-1-1. Per key** — scoped.
- **5a-i-a-1-2. USD** — value.
- **5a-i-a-1-3. Period** — reset.

### 6a-i-a-1 → diff
- **6a-i-a-1-1. Budget** — limit.
- **6a-i-a-1-2. Spent** — usage.
- **6a-i-a-1-3. Remaining** — result.

### 7a-i-a-1 → value
- **7a-i-a-1-1. Rate** — RPM.
- **7a-i-a-1-2. Target** — computed.
- **7a-i-a-1-3. Display** — UI.

### 8a-i-a-1 → upstream
- **8a-i-a-1-1. Provider** — response.
- **8a-i-a-1-2. Status** — 429.
- **8a-i-a-1-3. Feedback** — loop.

### 9a-i-a-1 → dispatch
- **9a-i-a-1-1. Executor** — call.
- **9a-i-a-1-2. Start** — time.
- **9a-i-a-1-3. End** — time.

### 10a-i-a-1 → server error
- **10a-i-a-1-1. 5xx** — class.
- **10a-i-a-1-2. Count** — window.
- **10a-i-a-1-3. Rate** — percent.

## Confidence & open questions

- **Confidence: high** — standard control theory + verified codebase.
- **Open:** default alpha and weights?
- **Open:** should pacing be per-key or global?

## Sources

- `docs/plans-and-prompts/research/2026-09-14-keyless-governance-research.md` §F
- AIMD (TCP congestion control)
- EWMA (statistical smoothing)
- `src/lib/usageDb.js`