# Exponential Branch 08 — Scheduled & Monitoring (R24–R25)

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** active
**Tags:** #research #webhook #exponential #scheduled #monitoring #digest #deadmansswitch #branch-exp-08

## Objective

N-ary exponential expansion (6 levels, N children per node) of the scheduled/monitoring roots: R24 scheduled reports (daily digest), R25 dead man's switch.

## R24 — Scheduled reports (daily digest)

```
L0 R24: SCHEDULED REPORTS (DAILY DIGEST)
├─ L1: daily spend digest
│  ├─ L2: LiteLLM digest mode
│  │  ├─ L3: digest_interval: 86400 (24h)
│  │  │  ├─ L4: groups by alert_type
│  │  │  │  └─ L5: request_model
│  │  │  │     └─ L6: api_base
│  │  │  └─ L4: in-memory only
│  │  │     └─ L5: resets on restart
│  │  │        └- L6: 9router: persist instead
│  │  └─ L3: report_check_interval: 3600 (1h)
│  │     ├- L4: how often scheduler checks
│  │     └─ L4: 9router: same pattern
│  ├─ L2: 9router digest
│  │  ├─ L3: source: usageDb
│  │  │  ├─ L4: aggregate spend by provider
│  │  │  │  └─ L5: by model
│  │  │  │     └─ L6: by combo
│  │  │  └─ L4: period: last 24h
│  │  │     └─ L5: configurable
│  │  ├─ L3: content
│  │  │  ├─ L4: total spend
│  │  │  ├─ L4: per-provider breakdown
│  │  │  │  └─ L5: top models
│  │  │  ├─ L4: request counts
│  │  │  ├─ L4: error counts
│  │  │  └─ L4: quota status
│  │  │     └─ L5: R21
│  │  └─ L3: delivery
│  │     ├- L4: notify action (R14)
│  │     │  └─ L5: Slack/ntfy/email
│  │     └─ L4: format
│  │        ├─ L5: text summary
│  │        └─ L5: blocks/embeds (v2)
│  ├─ L2: scheduling
│  │  ├─ L3: instrumentation.js job
│  │  │  ├─ L4: settings-gated
│  │  │  │  └─ L5: digestEnabled
│  │  │  └─ L4: hourly check
│  │  │     └─ L5: report_check_interval
│  │  ├─ L3: last-sent persistence
│  │  │  ├─ L4: settingsRepo
│  │  │  │  └─ L5: survives restart
│  │  │  └─ L4: due when now - last >= 24h
│  │  └─ L3: timezone
│  │     ├- L4: local time
│  │     └─ L4: configurable hour
│  └─ L2: edge cases
│     ├─ L3: no usage
│     │  └─ L4: skip or empty digest
│     ├─ L3: missed run (sleep)
│     │  └─ L4: catch-up on boot
│     └─ L3: DST
│        └─ L4: wall-clock vs interval
├─ L1: new model added
│  ├─ L2: model catalog sync
│  │  ├─ L3: instrumentation.js job
│  │  │  ├─ L4: syncs catalog
│  │  │  │  └─ L5: providers/models
│  │  │  └─ L4: detects new
│  │  │     └─ L5: diff
│  │  └─ L3: event
│  │     ├- L4: catalog.model_added
│  │     │  └─ L5: payload {provider, model}
│  │     └─ L4: → outbox
│  ├─ L2: LiteLLM new_model_added
│  │  ├─ L3: alert type
│  │  │  └─ L4: notifies on new model
│  │  └─ L3: 9router parity
│  │     └─ L4: same event name
│  └─ L2: rules
│     ├─ L3: notify
│     │  └─ L4: "new model available"
│     └─ L3: auto-add to combo (v2)
│        └─ L4: gateway action
└─ L1: other scheduled reports (v2)
   ├─ L2: weekly summary
   │  ├─ L3: Monday digest
   │  └─ L3: trends
   ├─ L2: monthly billing
   │  ├─ L3: cost report
   │  └─ L3: quota projection
   └─ L2: error report
      ├─ L3: top errors
      └─ L3: per provider
```

## R25 — Dead man's switch

```
L0 R25: DEAD MAN'S SWITCH
├─ L1: Healthchecks.io model
│  ├─ L2: concept
│  │  ├─ L3: alert on ABSENCE of ping
│  │  │  ├─ L4: not on failure
│  │  │  │  └─ L5: inverse monitoring
│  │  │  └─ L4: cron jobs, daemons
│  │  │     └─ L5: anything periodic
│  │  └─ L3: states
│  │     ├─ L4: New
│  │     │  └─ L5: created, no ping
│  │     ├─ L4: Up
│  │     │  └─ L5: ping received
│  │     ├─ L4: Late
│  │     │  └─ L5: grace passed
│  │     ├─ L4: Down
│  │     │  └─ L5: grace + 1h
│  │     └─ L4: Paused
│  │        └─ L5: manual
│  ├─ L2: ping URL
│  │  ├─ L3: https://hc-ping.com/<uuid>
│  │  │  ├─ L4: UUID or slug
│  │  │  │  └─ L5: /<project-ping-key>/<name-slug>
│  │  │  │     └─ L6: auto-provisioning
│  │  │  └─ L4: suffixes
│  │  │     ├─ L5: /start (job started)
│  │  │     │  └─ L6: measure duration
│  │  │     ├─ L5: /fail (job failed)
│  │  │     │  └─ L6: immediate alert
│  │  │     └─ L5: /<exitcode> (custom)
│  │  │        └─ L6: 0-255
│  │  └─ L3: grace time
│  │     ├─ L4: configurable
│  │     │  ├─ L5: default 1 day
│  │     │  │  └─ L6: min 1 min
│  │     │  └─ L5: per-check
│  │     └─ L4: Late after grace
│  │        └─ L5: Down after grace + 1h
│  ├─ L2: integrations
│  │  ├─ L3: email
│  │  ├─ L3: webhook
│  │  │  └─ L4: → 9router receiver!
│  │  ├─ L3: Slack
│  │  ├─ L3: ntfy
│  │  └─ L3: 30+ channels
│  └─ L2: self-hosted
│     ├─ L3: open source
│     │  └─ L4: Django
│     └─ L3: Docker
│        └─ L4: healthchecks/healthchecks
├─ L1: 9router watchdog
│  ├─ L2: what to monitor
│  │  ├─ L3: background jobs (instrumentation.js)
│  │  │  ├─ L4: console log capture
│  │  │  ├─ L4: markdown log flusher
│  │  │  ├─ L4: sr-combo cleanup
│  │  │  ├─ L4: model catalog sync
│  │  │  └─ L4: quotaAutoPing
│  │  ├─ L3: gateway liveness
│  │  │  └─ L4: /v1 health
│  │  └─ L3: worker liveness
│  │     └─ L4: R10 worker
│  ├─ L2: job registry
│  │  ├─ L3: {name, interval}
│  │  │  └─ L4: register at startup
│  │  └─ L3: last-run tracking
│  │     └─ L4: in-memory + DB
│  ├─ L2: ping cadence
│  │  ├─ L3: per job
│  │  │  ├─ L4: ping on each run
│  │  │  │  └─ L5: /start + success
│  │  │  └─ L4: /fail on error
│  │  │     └─ L5: immediate alert
│  │  └─ L3: gateway ping
│  │     ├- L4: every 5min
│  │     └─ L4: grace 15min
│  └─ L2: grace time
│     ├─ L3: 2× job interval
│     │  └─ L4: 5h quota job → 10h grace
│     └─ L3: configurable
│        └─ L4: settings
├─ L1: 9router as Healthchecks receiver
│  ├─ L2: webhook integration
│  │  ├─ L3: Healthchecks → 9router webhook
│  │  │  └─ L4: R01 endpoint
│  │  └─ L3: rule: check.down → notify
│  │     └- L4: R12
│  └─ L2: self-hosted option
│     ├─ L3: run own Healthchecks
│     │  └─ L4: local-first
│     └─ L3: or use hc-ping.com
│        └─ L4: free tier
└─ L1: edge cases
   ├─ L2: machine sleep
   │  ├─ L3: missed pings
   │  │  └─ L4: grace covers
   │  └─ L3: catch-up ping
   │     └─ L4: on wake
   ├─ L2: clock skew
   │  └─ L3: server-side grace
   └─ L2: multiple instances
      ├─ L3: one pings
      └─ L3: dedupe
```

## L6 Leaf Summary

| Leaf | Finding | Precedent |
|------|---------|-----------|
| R24-L6-1 | Daily digest: digest_interval 86400, group by provider/model | LiteLLM |
| R24-L6-2 | Persist last-sent (survives restart) | 9router settingsRepo |
| R24-L6-3 | Hourly check (report_check_interval 3600) | LiteLLM |
| R24-L6-4 | catalog.model_added on sync | 9router instrumentation.js |
| R24-L6-5 | new_model_added alert parity | LiteLLM |
| R25-L6-1 | Alert on absence, not failure | Healthchecks.io |
| R25-L6-2 | States: New→Up→Late→Down→Paused | Healthchecks.io |
| R25-L6-3 | /start /fail /<exitcode> suffixes | Healthchecks.io |
| R25-L6-4 | Grace = 2× interval, configurable | Healthchecks.io |
| R25-L6-5 | Watchdog over instrumentation.js jobs | 9router jobs |
| R25-L6-6 | Healthchecks webhook → 9router receiver | Healthchecks.io integrations |

## Related Docs

- Master map: `2026-09-15-webhook-exponential-master-map.md` (R24–R25)
- Prior 2-way spine: `2026-09-15-webhook-branch-b2b-scheduled-monitoring.md`
- Flat research: `2026-09-15-webhook-receive-act-research.md` (Part 2 E1–E2)
- Plan: `../planning/2026-09-15-webhook-receive-act-plan.md` (M4)