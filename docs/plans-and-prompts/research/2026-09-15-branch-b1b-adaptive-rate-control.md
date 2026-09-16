# Branch Research — B1b: Adaptive Rate Control (7-node subtree)

**Date:** 2026-09-15
**Author:** Claude Code agent (main session)
**Status:** active
**Tags:** #research #governance #rate-limiting #adaptive #aimd #ewma #binary-tree #branch-b1b

## Objective

Deep-dive the **adaptive rate control** subtree: AIMD (B1b1) and EWMA prediction (B1b2), down to L6 leaves.

```
B1b ADAPTIVE CONTROL
├─ B1b1: AIMD (TCP congestion control)
│  ├─ B1b1L: additive increase / multiplicative decrease
│  │  ├─ B1b1LL: TCP Reno semantics
│  │  └─ B1b1LR: CUBIC (Linux default)
│  └─ B1b1R: application to LLM gateways
│     ├─ B1b1RL: 429 as congestion signal
│     └─ B1b1RR: cooldown on failure (LiteLLM)
└─ B1b2: EWMA PREDICTION
   ├─ B1b2L: exponential moving average of arrival rate
   │  ├─ B1b2LL: surge detection (incoming > rate*1.2)
   │  └─ B1b2LR: pre-throttle before 429s
   └─ B1b2R: budget-proportional pacing
      ├─ B1b2RL: allowed = remaining_budget / remaining_time
      └─ B1b2RR: monthly-budget-aware rate
```

## Codebase grounding

- No adaptive control exists today. The limiter is static (B1a). The phase-2 research proposed AIMD + EWMA + 429 feedback + budget-proportional pacing as the adaptive layer; this branch deep-dives the algorithms.

## External research

### B1b1LL — TCP Reno semantics (AIMD)

- AIMD (Chiu & Jain 1989): `w(t+1) = w(t) + a` when no congestion; `w(t+1) = w(t) × b` when congestion detected. TCP: `a = 1 MSS/RTT`, `b = 1/2`.
- Key property: **convergence to fairness** — multiple AIMD flows sharing a link converge to equal share. This is why AIMD is the right shape for *multiple sources sharing one upstream quota*: each source's rate adapts and they converge to a fair split.
- Saw-tooth behavior: probe up slowly, cut down hard. The asymmetry (slow up, fast down) is deliberate — it's conservative under uncertainty.
- Requires a **binary congestion signal**: loss (timeout/dup-ACK) or ECN marking.

### B1b1LR — CUBIC

- CUBIC (Linux default since 2.6.19): replaces linear increase with a cubic function of time-since-loss — aggressive probing when far from the last-known-good rate, gentle near it. Better throughput on high-BDP links.
- For 9router: CUBIC's "remember the last good rate and return to it quickly" is a nice property for *recovering* after a provider cooldown — but the added complexity isn't justified for a local gateway. Reno-style AIMD is the right v1.

### B1b1RL — 429 as the congestion signal

- The mapping: upstream **429 = congestion signal** (binary, exactly what AIMD needs). On 429: `rate = rate × 0.5` (multiplicative decrease). On success for a full window: `rate = rate + step` (additive increase).
- LiteLLM precedent (phase 2): cooldowns on 429 (immediate), >50% failure rate, and non-retryable errors; default 5s. LiteLLM's cooldown is a *binary* on/off; AIMD is a *graduated* version — smoother and self-tuning.
- 9router already has retry/refresh logic in `open-sse/handlers/chatCore.js` — the 429 signal is already detected there; adaptive control just needs to *consume* it.

### B1b1RR — Cooldown on failure

- Design choice: hard cooldown (LiteLLM: 5s default, configurable) vs AIMD rate reduction. Recommendation: **both** — hard cooldown for the *deployment* (don't hammer a failing provider), AIMD for the *source's allowed rate* (fairness across sources).

### B1b2L — EWMA of arrival rate

- EWMA (exponential moving average): `rate = α·new + (1−α)·rate`. O(1) memory, one stored value. α ≈ 0.1–0.3 for arrival-rate estimation (smoother); the "half-life" is `ln(2)/α` samples.
- Properties (from the moving-average research): first-order IIR low-pass filter; weights decay exponentially, never reaching zero; robust to noise; the moving *median* is more robust to shocks but needs a skiplist — overkill here.
- For 9router: EWMA per source label (A2a) of inter-arrival time or requests/sec. This is the "messages/s math" the user asked for.

### B1b2LL — Surge detection

- Rule: if instantaneous rate > EWMA × 1.2 (configurable), flag a surge. The EWMA is the baseline; the 1.2 threshold is the tripwire.
- Surge response options: (a) pre-throttle (B1b2LR), (b) queue with pacing (B2b), (c) just log + let the token bucket handle it. Recommendation: log + token bucket for v1; pre-throttle as the adaptive upgrade.

### B1b2LR — Pre-throttle before 429s

- The goal: *predict* the upstream limit and slow down *before* hitting it, instead of reacting to 429s. If the provider's RPM is known (config) and the source's EWMA rate approaches it, reduce the source's allowed rate preemptively.
- This is the "programmatically decide and change its rate" ask: the rate becomes a *function of observed traffic + known limits*, not a constant.

### B1b2R — Budget-proportional pacing

- B1b2RL: `allowed = remaining_budget / remaining_time` — the classic budget pacing formula (used by ad-bidding systems and OpenRouter-style budget guardrails). If $10 remains and 5 days left: $2/day ceiling.
- B1b2RR: monthly-budget-aware rate — the pacing rate is recomputed on each request (or each minute) from the usage DB's spend totals. Connects to B4b (budget guardrails): the budget guardrail *blocks* at the hard limit; pacing *smooths* toward it.

## Synthesis — design space

1. **Adaptive layer architecture** (per source label):
   - `ewmaRate` (arrival rate, α≈0.2) — the observed pace.
   - `aimdRate` (allowed rate) — starts at the static limit; `×0.5` on upstream 429; `+step` after a clean window.
   - `effectiveRate = min(staticLimit, aimdRate, budgetPace)` — the gate.
   - Surge flag when `ewmaRate > effectiveRate × 1.2` → optional pre-throttle/queue.
2. **Signals:** upstream 429 (from chatCore retry path), upstream success, usage DB spend (for budget pace).
3. **Fairness:** AIMD's convergence property gives multi-source fairness automatically — two agents sharing one provider converge to a fair split without per-agent config.
4. **Safety:** floor the AIMD rate (e.g. ≥ 1 req/min) so a single 429 storm doesn't zero out a source; ceiling at the static limit.

## Confidence levels

| Finding | Confidence |
|---------|-----------|
| AIMD converges to fairness across competing sources | High |
| 429 is the correct binary congestion signal | High |
| EWMA is the right O(1) rate estimator | High |
| Budget pacing formula (remaining/remaining) is standard | High |
| CUBIC-style recovery is unnecessary complexity for v1 | Medium |

## Open questions

1. AIMD step size: fixed (+1 req/min) or proportional (+5% of current)? Proportional is smoother at scale.
2. Should the AIMD state persist across restarts (SQLite) or is in-memory fine? (In-memory is fine — it re-converges in minutes.)
3. Does the user want the adaptive layer *visible* in the dashboard (current effective rate per source), or silent?

## Sources

- Code: `open-sse/handlers/chatCore.js` (retry/refresh path — 429 detection), `src/lib/usageDb.js` (spend totals)
- Prior research: `2026-09-14-keyless-governance-research.md` (adaptive/predictive rate control section)
- Industry: Wikipedia AIMD (Chiu & Jain 1989; fetched 2026-09-15), Wikipedia moving average / EWMA (fetched 2026-09-15), LiteLLM cooldown docs (phase 2), TCP CUBIC (RFC 8312)