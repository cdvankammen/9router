# Exponential Branch 07 — Internal Events (R21–R23)

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** active
**Tags:** #research #webhook #exponential #internal-events #quota #provider #fallback #branch-exp-07

## Objective

N-ary exponential expansion (6 levels, N children per node) of the internal-event roots: R21 quota events (80/90/100%), R22 provider error events, R23 fallback events.

## R21 — Quota events (80/90/100%)

```
L0 R21: QUOTA EVENTS (80/90/100%)
├─ L1: thresholds
│  ├─ L2: 80% warning
│  │  ├─ L3: quota.warning
│  │  │  ├─ L4: payload {provider, usagePct, spend, threshold}
│  │  │  │  ├─ L5: emit once per crossing
│  │  │  │  │  └─ L6: state machine per provider
│  │  │  │  └─ L5: dedupe (Alertmanager min-interval)
│  │  │  │     └─ L6: 5min default
│  │  │  └─ L4: source: quotaAutoPing
│  │  │     └─ L5: existing scheduler
│  │  └─ L3: 9router gitbook spec
│  │     ├─ L4: quota-tracking.md
│  │     │  └─ L5: aspirational (no code)
│  │     └─ L4: delivery: Dashboard/Email/Webhook
│  │        └─ L5: webhook = this system
│  ├─ L2: 90% critical
│  │  ├─ L3: quota.critical
│  │  │  └─ L4: same shape
│  │  └─ L3: escalate priority
│  │     └─ L4: notify priority 4-5
│  └─ L2: 100% exhausted
│     ├─ L3: quota.exhausted
│     │  ├─ L4: provider stops
│     │  │  └─ L5: gateway action (R14)
│     │  └─ L4: fallback trigger
│     │     └─ L5: R23
│     └─ L3: recovery
│        ├─ L4: quota.recovered
│        │  └─ L5: below threshold again
│        └─ L4: re-enable provider
│           └─ L5: gateway action
├─ L1: LiteLLM budget webhooks (BETA)
│  ├─ L2: WEBHOOK_URL env
│  │  ├─ L3: alerting: ["webhook"]
│  │  └─ L3: payload
│  │     ├─ L4: spend
│  │     ├─ L4: max_budget
│  │     ├─ L4: token
│  │     ├─ L4: customer_id / internal_user_id / team_id
│  │     ├─ L4: user_email
│  │     ├─ L4: key_alias
│  │     ├─ L4: projected_exceeded_date
│  │     ├─ L4: projected_spend
│  │     ├─ L4: event
│  │     │  ├─ L5: budget_crossed
│  │     │  ├─ L5: threshold_crossed
│  │     │  └─ L5: projected_limit_exceeded
│  │     └─ L4: event_group
│  │        ├─ L5: customer
│  │        ├─ L5: internal_user
│  │        ├─ L5: key
│  │        ├─ L5: team
│  │        └─ L5: proxy
│  └─ L3: 9router adoption
│     ├─ L4: same vocabulary
│     │  └─ L5: budget_crossed / threshold_crossed
│     └─ L4: 80/90/100 → threshold_crossed/budget_crossed
│        └─ L5: mapping
├─ L1: quotaAutoPing wiring
│  ├─ L2: existing scheduler
│  │  ├─ L3: warms 5h windows
│  │  │  ├─ L4: pre-warms quota
│  │  │  │  └─ L5: pings providers
│  │  │  └─ L4: settings-gated
│  │  │     └─ L5: instrumentation.js
│  │  └─ L3: no alert sending
│  │     └─ L4: gap
│  ├─ L2: extend to check thresholds
│  │  ├─ L3: on each run
│  │  │  ├─ L4: compute usage %
│  │  │  │  └─ L5: usageDb spend / quota
│  │  │  └─ L4: compare to thresholds
│  │  │     └─ L5: 80/90/100
│  │  └─ L3: emit on transition
│  │     ├─ L4: state machine
│  │     │  ├─ L5: below80 → at80 → at90 → exhausted
│  │     │  └─ L5: recovered → below80
│  │     └─ L4: dedupe
│  │        └─ L5: emit once per crossing
│  └─ L2: event emission
│     ├─ L3: emitter.emit("quota.warning", {...})
│     │  └─ L4: → outbox (R09)
│     └─ L3: rule engine matches
│        └─ L4: R12
└─ L1: edge cases
   ├─ L2: no quota data
   │  ├─ L3: skip
   │  └─ L3: log
   ├─ L2: quota reset (monthly)
   │  ├─ L3: state machine reset
   │  └─ L3: recovered event
   └─ L2: multiple providers
      ├─ L3: per-provider state
      └─ L3: per-provider events
```

## R22 — Provider error events

```
L0 R22: PROVIDER ERROR EVENTS
├─ L1: error detection
│  ├─ L2: usageDb error fingerprints
│  │  ├─ L3: request capture
│  │  │  ├─ L4: provider, model, error type
│  │  │  │  └─ L5: status, message
│  │  │  └─ L4: timestamps
│  │  │     └─ L5: windowing
│  │  └─ L3: error classification
│  │     ├─ L4: 4xx (client)
│  │     │  └─ L5: auth, rate limit
│  │     ├─ L4: 5xx (server)
│  │     │  └─ L5: outage
│  │     ├─ L4: network
│  │     │  └─ L5: ECONNREFUSED, timeout
│  │     └─ L4: protocol
│  │        └─ L5: malformed SSE
│  ├─ L2: error spike detection
│  │  ├─ L3: count per window
│  │  │  ├─ L4: sliding window (5min)
│  │  │  │  └─ L5: LiteLLM outage_alerts
│  │  │  └─ L4: thresholds
│  │  │     ├─ L5: minor 5
│  │  │     │  └─ L6: minor_outage_alert_threshold
│  │  │     └─ L5: major 10
│  │  │        └─ L6: major_outage_alert_threshold
│  │  └─ L3: error rate
│  │     ├─ L4: errors / total
│  │     │  └─ L5: One API success rate
│  │     └─ L4: threshold 0.8
│  │        └─ L5: METRIC_SUCCESS_RATE_THRESHOLD
│  └─ L2: event emission
│     ├─ L3: provider.error
│     │  ├─ L4: payload {provider, count, window, rate}
│  │  │  └─ L5: rule engine
│  │  └─ L3: provider.recovered
│  │     └─ L4: rate back below
├─ L1: auto-disable (One API ENABLE_METRIC)
│  ├─ L2: One API model
│  │  ├─ L3: ENABLE_METRIC
│  │  │  ├─ L4: auto-disable channels
│  │  │  │  └─ L5: below success threshold
│  │  │  └─ L4: METRIC_QUEUE_SIZE=10
│  │  │     └─ L5: sample size
│  │  ├─ L3: CHANNEL_TEST_FREQUENCY
│  │  │  └─ L4: re-test disabled
│  │  └─ L3: CHANNEL_UPDATE_FREQUENCY
│  │     └─ L4: re-enable
│  └─ L2: 9router gateway action
│     ├─ L3: condition: error_rate > 0.8
│     │  └─ L4: R13
│     ├─ L3: action: disable provider
│     │  └─ L4: R14 gateway
│     └─ L3: notify why
│        └─ L4: chain notify action
├─ L1: cooldown (LiteLLM cooldown_deployment)
│  ├─ L2: LiteLLM
│  │  ├─ L3: cooldown_deployment alert
│  │  │  └─ L4: deployment cooled down
│  │  └─ L3: cooldown default 5s
│  │     └─ L4: configurable
│  └─ L2: 9router
│     ├─ L3: open-sse backoff
│     │  └─ L4: exponential on errors
│     ├─ L3: provider.cooldown event
│     │  └─ L4: emit on backoff
│     └─ L3: notify
│        └─ L4: R14
└─ L1: edge cases
   ├─ L2: transient blip
   │  ├─ L3: 1 error ≠ spike
   │  │  └─ L4: threshold guards
   │  └─ L3: recovery event
   │     └─ L4: clears state
   ├─ L2: maintenance window
   │  ├─ L3: silence (Alertmanager)
   │  │  └─ L4: settings
   │  └─ L3: no false alerts
   └─ L2: provider removed
      ├─ L3: state cleanup
      └─ L3: no events
```

## R23 — Fallback events

```
L0 R23: FALLBACK EVENTS
├─ L1: fallback.used
│  ├─ L2: when
│  │  ├─ L3: combo falls back
│  │  │  ├─ L4: primary fails
│  │  │  │  └─ L5: error, timeout, quota
│  │  │  └─ L4: account-selection loop
│  │  │     └─ L5: chat.js
│  │  └─ L3: model fallback
│  │     └─ L4: settings.modelFallbacks
│  ├─ L2: payload
│  │  ├─ L3: {combo, primary, fallback, reason}
│  │  │  ├─ L4: combo id
│  │  │  ├─ L4: primary model/provider
│  │  │  ├─ L4: fallback model/provider
│  │  │  └─ L4: reason
│  │  │     ├─ L5: error
│  │  │     ├─ L5: timeout
│  │  │     ├─ L5: quota
│  │  │     └─ L5: rate limit
│  │  └─ L3: frequency
│  │     └─ L4: count per combo
│  ├─ L2: emission point
│  │  ├─ L3: chat.js account-selection loop
│  │  │  └─ L4: after fallback decision
│  │  └─ L3: chatCore.js
│  │     └─ L4: retry/refresh path
│  └─ L2: LiteLLM parity
│     ├─ L3: fallback_reports alert
│     │  └─ L4: same idea
│     └─ L3: attempted_fallbacks in usage
│        └─ L4: observability
├─ L1: fallback storm detection
│  ├─ L2: repeated fallback
│  │  ├─ L3: same combo N times
│  │  │  ├─ L4: threshold 5
│  │  │  │  └─ L5: per window
│  │  │  └─ L4: alert
│  │  │     └- L5: notify
│  │  └─ L3: all fallbacks failing
│  │     ├─ L4: combo exhausted
│  │     │  └─ L5: gateway action
│  │     └─ L4: notify
│  │        └─ L5: user attention
│  └─ L2: cooldown
│     ├─ L3: provider.cooldown (R22)
│     │  └─ L4: backoff
│     └─ L3: combo cooldown
│        └─ L4: skip after N fails
├─ L1: 9router application
│  ├─ L2: emitter in chat.js
│  │  ├─ L3: emit fallback.used
│  │  │  └─ L4: → outbox
│  │  └─ L3: fail-open
│  │     └─ L4: never throw (RTK convention)
│  ├─ L2: rules
│  │  ├─ L3: fallback.used → notify
│  │  │  └─ L4: R14
│  │  └─ L3: fallback storm → gateway
│  │     └─ L4: disable primary
│  └─ L2: observability
│     ├─ L3: fallback count dashboard
│     │  └- L4: usageDb
│     └─ L3: attempted_fallbacks
│        └─ L4: LiteLLM parity
└─ L1: edge cases
   ├─ L2: silent fallback
   │  ├─ L3: user didn't notice
   │  │  └─ L4: event still logged
   │  └─ L3: notify optional
   │     └- L4: rule decides
   ├─ L2: fallback to same provider
   │  └─ L3: different model
   │     └─ L4: still an event
   └─ L2: multi-account fallback
      ├─ L3: account rotation
      └─ L3: event per account
```

## L6 Leaf Summary

| Leaf | Finding | Precedent |
|------|---------|-----------|
| R21-L6-1 | 80/90/100% thresholds, emit-on-transition | 9router gitbook spec |
| R21-L6-2 | LiteLLM vocabulary: budget_crossed/threshold_crossed | LiteLLM budget webhooks |
| R21-L6-3 | quotaAutoPing extended to check thresholds | 9router quotaAutoPing |
| R21-L6-4 | State machine per provider + dedupe | Alertmanager |
| R21-L6-5 | quota.recovered re-enables provider | LiteLLM |
| R22-L6-1 | Error spike: 5 minor / 10 major per window | LiteLLM outage_alerts |
| R22-L6-2 | Error rate threshold 0.8 | One API ENABLE_METRIC |
| R22-L6-3 | gateway action auto-disables provider | One API |
| R22-L6-4 | provider.cooldown on backoff | LiteLLM cooldown_deployment |
| R22-L6-5 | Silence window for maintenance | Alertmanager |
| R23-L6-1 | fallback.used with combo/primary/fallback/reason | LiteLLM fallback_reports |
| R23-L6-2 | Emit in chat.js account-selection loop, fail-open | 9router chat.js, RTK |
| R23-L6-3 | Fallback storm detection (threshold 5/window) | Alertmanager |
| R23-L6-4 | attempted_fallbacks observability | LiteLLM |

## Related Docs

- Master map: `2026-09-15-webhook-exponential-master-map.md` (R21–R23)
- Prior 2-way spine: `2026-09-15-webhook-branch-b2a-internal-events.md`
- Flat research: `2026-09-15-webhook-receive-act-research.md` (Part 2 A1–A2)
- Plan: `../planning/2026-09-15-webhook-receive-act-plan.md` (M4)