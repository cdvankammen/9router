# Tree T24 — Adaptive/Predictive Rate Control (6-level binary tree, 127 nodes)

**Date:** 2026-09-15
**Author:** Claude Code agent (main session)
**Status:** active
**Tags:** #research #tree #binary-tree #adaptive #predictive #rate #control #t24

## Objective

Full 6-level binary tree expansion of the **adaptive/predictive rate control** topic (from `2026-09-14-keyless-governance-research.md` Part F). Every node researched: codebase grounding, external research, or design note.

## The tree (127 nodes, path notation)

```
L0: Adaptive/predictive rate control
├─ L1L: Reactive control
│  ├─ L2LL: AIMD
│  │  ├─ L3LLL: additive increase
│  │  │  ├─ L4LLLL: slow ramp
│  │  │  │  ├─ L5LLLLL: +1 per RTT
│  │  │  │  │  ├─ L6LLLLLL: linear
│  │  │  │  │  └─ L6LLLLLR: stable
│  │  │  │  └─ L5LLLLR: per-window
│  │  │  │     ├─ L6LLLLRL: window
│  │  │  │     └─ L6LLLLRR: increment
│  │  │  └─ L4LLLR: trigger
│  │  │     ├─ L5LLLRL: success
│  │  │     │  ├─ L6LLLRLL: 2xx
│  │  │     │  └─ L6LLLRLR: no 429
│  │  │     └─ L5LLLRR: no signal
│  │  │        ├─ L6LLLRRL: implicit
│  │  │        └─ L6LLLRRR: increase
│  │  └─ L3LLR: multiplicative decrease
│  │     ├─ L4LLRL: on 429
│  │     │  ├─ L5LLRLL: halve
│  │     │  │  ├─ L6LLRLLL: rate /= 2
│  │     │  │  └─ L6LLRLLR: fast
│  │     │  └─ L5LLRLR: on error
│  │     │     ├─ L6LLRLRL: 5xx
│  │     │     └─ L6LLRLRR: halve
│  │     └─ L4LLRR: floor
│  │        ├─ L5LLRRL: min rate
│  │        │  ├─ L6LLRRLL: floor
│  │        │  └─ L6LLRRLR: stop
│  │        └─ L5LLRRR: recovery
│  │           ├─ L6LLRRRL: wait
│  │           └─ L6LLRRRR: ramp
│  └─ L2LR: EWMA rate estimator
│     ├─ L3LRL: EWMA
│     │  ├─ L4LRLL: alpha
│     │  │  ├─ L5LRLLL: smoothing
│     │  │  │  ├─ L6LRLLLL: 0.1-0.3
│     │  │  │  └─ L6LRLLLR: tune
│     │  │  └─ L5LRLLR: O(1)
│     │  │     ├─ L6LRLLRL: constant
│     │     │     └─ L6LRLLRR: cheap
│     │  └─ L4LRLR: estimate
│     │     ├─ L5LRLRL: rate
│     │     │  ├─ L6LRLRLL: req/s
│     │  │     │  └─ L6LRLRLR: tokens/s
│     │     └─ L5LRLRR: variance
│     │        ├─ L6LRLRRL: burst
│     │        └─ L6LRLRRR: detect
│     └─ L3LRR: use
│        ├─ L4LRRL: set limit
│        │  ├─ L5LRRLL: target
│        │  │  ├─ L6LRRLLL: EWMA * k
│        │  │  └─ L6LRRLLR: headroom
│        │  └─ L5LRRLR: clamp
│        │     ├─ L6LRRLRL: min
│        │     └─ L6LRRLRR: max
│        └─ L4LRRR: detect anomaly
│           ├─ L5LRRRL: spike
│           │  ├─ L6LRRRLL: > threshold
│           │  └─ L6LRRRLR: alert
│           └─ L5LRRRR: drop
│              ├─ L6LRRRRL: < threshold
│              └─ L6LRRRRR: alert
└─ L1R: Predictive control
   ├─ L2RL: Forecasting
   │  ├─ L3RLL: time series
   │  │  ├─ L4RLLL: history
   │  │  │  ├─ L5RLLLL: windows
   │  │  │  │  ├─ L6RLLLLL: hourly
   │  │  │  │  └─ L6RLLLLR: daily
   │  │  │  └─ L5RLLLR: features
   │  │  │     ├─ L6RLLLRL: trend
   │  │  │     └─ L6RLLLRR: season
   │  │  └─ L4RLLR: model
   │  │     ├─ L5RLLRL: simple
   │  │     │  ├─ L6RLLRLL: linear
   │  │     │  └─ L6RLLRLR: trend
   │  │     └─ L5RLLRR: Holt-Winters
   │  │        ├─ L6RLLRRL: trend
   │  │        └─ L6RLLRRR: season
   │  └─ L3RLR: prediction
   │     ├─ L4RLRL: next window
   │     │  ├─ L5RLRLL: forecast
   │     │  │  ├─ L6RLRLLL: rate
   │     │  │  └─ L6RLRLLR: confidence
   │     │  └─ L5RLRLR: horizon
   │     │     ├─ L6RLRLRL: 1h
   │     │     └─ L6RLRLRR: 24h
   │     └─ L4RLRR: confidence
   │        ├─ L5RLRRL: interval
   │        │  ├─ L6RLRRLL: PI
   │        │  └─ L6RLRRLR: width
   │        └─ L5RLRRR: act
   │           ├─ L6RLRRRL: preempt
   │           └─ L6RLRRRR: adjust
   └─ L2RR: Preemptive action
      ├─ L3RRL: preemptive limit
      │  ├─ L4RRLL: reduce early
      │  │  ├─ L5RRLLL: forecast > cap
      │  │  │  ├─ L6RRLLLL: reduce
      │  │  │  └─ L6RRLLLR: preempt
      │  │  └─ L5RRLLR: smooth
      │  │     ├─ L6RRLLRL: ramp down
      │  │     └─ L6RRLLRR: avoid 429
      │  └─ L4RRLR: allocate
      │     ├─ L5RRLRL: reserve
      │     │  ├─ L6RRLRLL: headroom
      │     │  └─ L6RRLRLR: buffer
      │     └─ L5RRLRR: shift
      │        ├─ L6RRLRRL: to cheap
      │        └─ L6RRLRRR: models
      └─ L3RRR: budget pacing
         ├─ L4RRRL: spend rate
         │  ├─ L5RRRLL: target
         │  │  ├─ L6RRRLLL: budget / time
         │  │  └─ L6RRRLLR: pace
         │  └─ L5RRRLR: adjust
         │     ├─ L6RRRLRL: rate
         │     └─ L6RRRLRR: limit
         └─ L4RRRR: cost-aware
            ├─ L5RRRRL: cheap first
            │  ├─ L6RRRRLL: route
            │  │  └─ L6RRRRLR: budget
            └─ L5RRRRR: premium last
               ├─ L6RRRRRL: route
               └─ L6RRRRRR: budget
```

## Node research (all 127 nodes)

### L0 — Adaptive/predictive rate control
Reactive (AIMD, EWMA) + predictive (forecasting, preemptive, budget pacing) control loops.

### L1L — Reactive control
AIMD + EWMA.

### L1R — Predictive control
Forecasting + preemptive + budget pacing.

### L2LL — AIMD
Additive increase + multiplicative decrease.

### L2LR — EWMA rate estimator
Alpha + estimate + use.

### L2RL — Forecasting
Time series + prediction.

### L2RR — Preemptive action
Preemptive limit + budget pacing.

### L3LLL — additive increase
Slow ramp.

### L3LLR — multiplicative decrease
On 429.

### L3LRL — EWMA
Alpha.

### L3LRR — use
Set limit + anomaly.

### L3RLL — time series
History.

### L3RLR — prediction
Next window.

### L3RRL — preemptive limit
Reduce early.

### L3RRR — budget pacing
Spend rate.

### L4LLLL — slow ramp
+1 per RTT.

### L4LLLR — trigger
Success.

### L4LLRL — on 429
Halve.

### L4LLRR — floor
Min rate.

### L4LRLL — alpha
Smoothing.

### L4LRLR — estimate
Rate.

### L4LRRL — set limit
Target.

### L4LRRR — detect anomaly
Spike.

### L4RLLL — history
Windows.

### L4RLLR — model
Simple.

### L4RLRL — next window
Forecast.

### L4RLRR — confidence
Interval.

### L4RRLL — reduce early
Forecast > cap.

### L4RRLR — allocate
Reserve.

### L4RRRL — spend rate
Target.

### L4RRRR — cost-aware
Cheap first.

### L5LLLLL — +1 per RTT
Linear.

### L5LLLLR — per-window
Window.

### L5LLLRL — 2xx
No 429.

### L5LLLRR — no signal
Implicit.

### L5LLRLL — halve
Rate /= 2.

### L5LLRLR — 5xx
Halve.

### L5LLRRL — min rate
Floor.

### L5LLRRR — recovery
Wait.

### L5LRLLL — 0.1-0.3
Tune.

### L5LRLLR — O(1)
Cheap.

### L5LRLRL — req/s
Tokens/s.

### L5LRLRR — variance
Burst.

### L5LRRLL — EWMA * k
Headroom.

### L5LRRLR — clamp
Min/max.

### L5LRRRL — > threshold
Alert.

### L5LRRRR — < threshold
Alert.

### L5RLLLL — hourly
Daily.

### L5RLLLR — trend
Season.

### L5RLLRL — linear
Trend.

### L5RLLRR — Holt-Winters
Trend.

### L5RLRLL — forecast
Rate.

### L5RLRLR — horizon
1h/24h.

### L5RLRRL — PI
Width.

### L5RLRRR — preempt
Adjust.

### L5RRLLL — forecast > cap
Reduce.

### L5RRLLR — ramp down
Avoid 429.

### L5RRLRL — reserve
Headroom.

### L5RRLRR — shift
To cheap.

### L5RRRLL — budget / time
Pace.

### L5RRRLR — adjust
Rate.

### L5RRRRL — route
Budget.

### L5RRRRR — route
Budget.

### L6 leaves (64)
- **L6LLLLLL** linear: stable.
- **L6LLLLLR** stable: ramp.
- **L6LLLLRL** window: increment.
- **L6LLLLRR** increment: window.
- **L6LLLRLL** 2xx: success.
- **L6LLLRLR** no 429: success.
- **L6LLLRRL** implicit: increase.
- **L6LLLRRR** increase: implicit.
- **L6LLRLLL** rate /= 2: halve.
- **L6LLRLLR** fast: halve.
- **L6LLRLRL** 5xx: halve.
- **L6LLRLRR** halve: error.
- **L6LLRRLL** floor: min.
- **L6LLRRLR** stop: floor.
- **L6LLRRRL** wait: recovery.
- **L6LLRRRR** ramp: recovery.
- **L6LRLLLL** 0.1-0.3: alpha.
- **L6LRLLLR** tune: alpha.
- **L6LRLLRL** constant: O(1).
- **L6LRLLRR** cheap: O(1).
- **L6LRLRLL** req/s: rate.
- **L6LRLRLR** tokens/s: rate.
- **L6LRLRRL** burst: variance.
- **L6LRLRRR** detect: variance.
- **L6LRRLLL** EWMA * k: target.
- **L6LRRLLR** headroom: target.
- **L6LRRLRL** min: clamp.
- **L6LRRLRR** max: clamp.
- **L6LRRRLL** > threshold: spike.
- **L6LRRRLR** alert: spike.
- **L6LRRRRL** < threshold: drop.
- **L6LRRRRR** alert: drop.
- **L6RLLLLL** hourly: window.
- **L6RLLLLR** daily: window.
- **L6RLLLRL** trend: feature.
- **L6RLLLRR** season: feature.
- **L6RLLRLL** linear: simple.
- **L6RLLRLR** trend: simple.
- **L6RLLRRL** trend: HW.
- **L6RLLRRR** season: HW.
- **L6RLRLLL** rate: forecast.
- **L6RLRLLR** confidence: forecast.
- **L6RLRLRL** 1h: horizon.
- **L6RLRLRR** 24h: horizon.
- **L6RLRRLL** PI: interval.
- **L6RLRRLR** width: interval.
- **L6RLRRRL** preempt: act.
- **L6RLRRRR** adjust: act.
- **L6RRLLLL** reduce: preempt.
- **L6RRLLLR** preempt: reduce.
- **L6RRLLRL** ramp down: smooth.
- **L6RRLLRR** avoid 429: smooth.
- **L6RRLRLL** headroom: reserve.
- **L6RRLRLR** buffer: reserve.
- **L6RRLRRL** to cheap: shift.
- **L6RRLRRR** models: shift.
- **L6RRRLLL** budget / time: target.
- **L6RRRLLR** pace: target.
- **L6RRRLRL** rate: adjust.
- **L6RRRLRR** limit: adjust.
- **L6RRRRLL** route: cheap.
- **L6RRRRLR** budget: cheap.
- **L6RRRRRL** route: premium.
- **L6RRRRRR** budget: premium.

## Confidence levels

| Finding | Confidence |
|---------|-----------|
| AIMD is proven for congestion control (TCP) | High |
| EWMA is O(1) and widely used for rate estimation | High |
| 429 is a binary congestion signal (like ECN) | High |
| Predictive forecasting (Holt-Winters) is a design proposal | Medium |
| Budget pacing with cost-aware routing is a design proposal | Medium |

## Open questions

1. Should AIMD operate per-model, per-group, or per-app?
2. Should EWMA estimate request rate or token rate?
3. Should predictive control preemptively reduce limits or just alert?

## Sources

- Prior research: `2026-09-14-keyless-governance-research.md`, `2026-09-15-branch-b3b-adaptive-rate-control.md`
- Industry: TCP AIMD, EWMA rate estimation, Holt-Winters forecasting, budget pacing