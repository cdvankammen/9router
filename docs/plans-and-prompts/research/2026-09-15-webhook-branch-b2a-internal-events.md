# Branch Research — B2a: Internal Events (7-node subtree)

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** active
**Tags:** #research #webhook #outbound #triggers #quota #provider #fallback #binary-tree #branch-b2a

## Objective

Deep-dive the **internal events** subtree of the webhook master tree (`2026-09-15-webhook-master-research-tree.md`). Covers quota events (B2a1) and provider & fallback events (B2a2), down to L6 leaves.

```
B2a INTERNAL EVENTS
├─ B2a1: QUOTA EVENTS
│  ├─ B2a1L: thresholds
│  │  ├─ B2a1LL: 80%/90%/exhausted (deferred spec)
│  │  └─ B2a1LR: LiteLLM budget webhooks (BETA)
│  └─ B2a1R: quotaAutoPing wiring
│     ├─ B2a1RL: existing scheduler (warms 5h windows)
│     └─ B2a1RR: emit events on threshold cross
└─ B2a2: PROVIDER & FALLBACK EVENTS
   ├─ B2a2L: provider errors
   │  ├─ B2a2LL: error spike (LiteLLM outage_alerts)
   │  └─ B2a2LR: auto-disable (One API ENABLE_METRIC)
   └─ B2a2R: fallback events
      ├─ B2a2RL: fallback.used event
      └─ B2a2RR: cooldown (LiteLLM cooldown_deployment)
```

## Codebase grounding (what exists today)

### `src/shared/services/quotaAutoPing.js` — quota scheduler (B2a1R)

- Warms 5h windows (pre-warms quota by pinging providers).
- **No alert sending** — it only warms. The quota-tracking doc (`gitbook/content/en/features/quota-tracking.md`) describes alerts at 80%/90%/exhausted as **aspirational** — no code.
- **Recommended:** this scheduler is the natural place to emit quota threshold events into the outbox (B2a1RR).

### `src/sse/handlers/chat.js` + `open-sse/handlers/chatCore.js` — request pipeline (B2a2)

- The request lifecycle: parse → combo expansion → account-selection loop → translate → dispatch → retry/refresh → stream.
- Provider errors and fallback events happen here — the natural emit points for `provider.error` and `fallback.used` events.
- `open-sse/` is the provider-agnostic engine; the emitter should be a thin hook (fail-open, never throw — the RTK convention).

### `src/lib/usageDb.js` — error capture (B2a2L)

- Captures request details with error fingerprints — the data source for error-spike detection.

## External research

### B2a1LL — 80%/90%/exhausted thresholds (deferred spec)

- **9router's own spec:** quota warnings at 80%/90%/exhausted; delivery: Dashboard notification / Email / Webhook.
- **Recommended:** emit `quota.warning` at 80% and 90%, `quota.exhausted` at 100%. The rule engine maps these to notify actions.

### B2a1LR — LiteLLM budget webhooks (BETA)

- **LiteLLM:** budget webhooks via `WEBHOOK_URL` env + `alerting: ["webhook"]`; payload: `spend, max_budget, token, customer_id, internal_user_id, team_id, user_email, key_alias, projected_exceeded_date, projected_spend, event (budget_crossed|threshold_crossed|projected_limit_exceeded), event_group (customer|internal_user|key|team|proxy)`.
- **Recommended:** adopt the LiteLLM event vocabulary: `budget_crossed`, `threshold_crossed`, `projected_limit_exceeded` — with 9router's 80/90/100 thresholds mapping to `threshold_crossed`/`budget_crossed`.

### B2a1RL — existing scheduler (warms 5h windows)

- `quotaAutoPing.js` runs on a schedule (settings-gated via instrumentation.js).
- **Recommended:** extend it to check thresholds on each run and emit events when crossed (with dedupe — only emit on transition, not every run).

### B2a1RR — emit events on threshold cross

- **Recommended:** `emitter.emit("quota.warning", {provider, usagePct, spend, threshold})` → outbox → rule engine.
- Dedupe: emit once per threshold crossing (state machine per provider: `below80 → at80 → at90 → exhausted`).

### B2a2LL — provider error spike (LiteLLM outage_alerts)

- **LiteLLM:** `outage_alerts` with `minor_outage_alert_threshold: 5`, `major_outage_alert_threshold: 10` (errors per window); `outage_alert_ttl: 60` (seconds).
- **Recommended:** count provider errors per window (usageDb error fingerprints); emit `provider.error` when count > threshold (5 minor / 10 major).

### B2a2LR — auto-disable (One API ENABLE_METRIC)

- **One API:** `ENABLE_METRIC` auto-disables channels below `METRIC_SUCCESS_RATE_THRESHOLD=0.8`; `METRIC_QUEUE_SIZE=10`, `CHANNEL_TEST_FREQUENCY`, `CHANNEL_UPDATE_FREQUENCY`.
- **Recommended:** the `gateway` action (A2b2LL) toggles a provider off when error rate > threshold — with a notify action telling the user why.

### B2a2RL — fallback.used event

- **Recommended:** emit `fallback.used` when a combo falls back to the next model/account (chat.js account-selection loop). Payload: `{combo, primary, fallback, reason}`.
- **LiteLLM:** `fallback_reports` alert type — same idea.

### B2a2RR — cooldown (LiteLLM cooldown_deployment)

- **LiteLLM:** `cooldown_deployment` alert when a deployment is cooled down after failures; cooldown default 5s.
- **Recommended:** emit `provider.cooldown` when 9router's error-classification backoff kicks in (open-sse already has exponential backoff on errors).

## L6 Leaf Summary

| Leaf | Finding | Precedent |
|------|---------|-----------|
| B2a1LL | Emit quota.warning at 80%/90%, quota.exhausted at 100% | 9router deferred spec |
| B2a1LR | LiteLLM event vocabulary: budget_crossed/threshold_crossed | LiteLLM budget webhooks |
| B2a1RL | Extend quotaAutoPing to check thresholds | 9router quotaAutoPing |
| B2a1RR | Emit on transition only (dedupe) | Alertmanager min-interval |
| B2a2LL | Error spike: 5 minor / 10 major per window | LiteLLM outage_alerts |
| B2a2LR | gateway action auto-disables failing provider | One API ENABLE_METRIC |
| B2a2RL | Emit fallback.used with combo/primary/fallback/reason | LiteLLM fallback_reports |
| B2a2RR | Emit provider.cooldown on backoff | LiteLLM cooldown_deployment |

## Related Docs

- Master tree: `2026-09-15-webhook-master-research-tree.md`
- Flat research: `2026-09-15-webhook-receive-act-research.md` (Part 2 A1 LiteLLM, A2 One API; Part 4 outbound triggers)
- Plan: `../planning/2026-09-15-webhook-receive-act-plan.md` (M4)