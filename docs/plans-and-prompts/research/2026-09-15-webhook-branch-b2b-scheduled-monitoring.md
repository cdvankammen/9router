# Branch Research — B2b: Scheduled & Monitoring (7-node subtree)

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** active
**Tags:** #research #webhook #outbound #triggers #scheduled #monitoring #deadmansswitch #binary-tree #branch-b2b

## Objective

Deep-dive the **scheduled & monitoring** subtree of the webhook master tree (`2026-09-15-webhook-master-research-tree.md`). Covers scheduled reports (B2b1) and dead man's switch (B2b2), down to L6 leaves.

```
B2b SCHEDULED & MONITORING
├─ B2b1: SCHEDULED REPORTS
│  ├─ B2b1L: daily spend report
│  │  ├─ B2b1LL: digest mode (LiteLLM digest_interval)
│  │  └─ B2b1LR: report_check_interval (3600s)
│  └─ B2b1R: new model added
│     ├─ B2b1RL: model catalog sync event
│     └─ B2b1RR: new_model_added alert
└─ B2b2: DEAD MAN'S SWITCH
   ├─ B2b2L: absence alerting
   │  ├─ B2b2LL: Healthchecks.io model
   │  └─ B2b2LR: ping URL suffixes (/start /fail /<exitcode>)
   └─ B2b2R: watchdog
      ├─ B2b2RL: monitor background jobs
      └─ B2b2RR: grace time
```

## Codebase grounding (what exists today)

### `src/instrumentation.js` — background job registry (B2b1R, B2b2R)

- Starts settings-gated background jobs: console log capture, markdown log flusher, sr-combo cleanup, model catalog sync.
- **Recommended:** the watchdog (B2b2R) monitors these jobs — if a job hasn't run in N× its interval, emit `job.stalled` → dead man's switch ping failure.

### `src/lib/usageDb.js` — spend data (B2b1L)

- Captures request/usage data — the source for a daily spend report.

### `src/lib/db/repos/settingsRepo.js` — schedule config (B2b1LR)

- `DEFAULT_SETTINGS` holds all config — `reportCheckInterval` and `digestInterval` would be new keys here.

## External research

### B2b1LL — daily spend digest (LiteLLM digest_interval)

- **LiteLLM:** `digest_interval: 86400` (24h) — sends a digest of spend grouped by `alert_type`/`request_model`/`api_base`; **in-memory only** (resets on restart).
- **Recommended:** 9router's daily digest: aggregate usageDb spend by provider/model → notify action (Slack/ntfy/email). Persist last-sent timestamp in settingsRepo (survives restarts — better than LiteLLM's in-memory).

### B2b1LR — report_check_interval (3600s)

- **LiteLLM:** `report_check_interval: 3600` (1h) — how often the report scheduler checks whether a digest is due.
- **Recommended:** 9router: check hourly whether the daily digest is due (same pattern as quotaAutoPing's scheduler).

### B2b1RL — model catalog sync event

- **9router:** `instrumentation.js` runs model catalog sync (background job).
- **Recommended:** emit `catalog.model_added` when sync discovers a new model — the rule engine can notify or auto-add to a combo.

### B2b1RR — new_model_added alert

- **LiteLLM:** `new_model_added` alert type — notifies when a new model is added to the proxy.
- **Recommended:** adopt the same event name for parity: `catalog.model_added` → notify.

### B2b2LL — Healthchecks.io model

- **Healthchecks.io:** the canonical dead man's switch — alerts when a ping is **NOT** received within the grace time. States: New → Up → Late → Down → Paused.
- **Recommended:** 9router pings a Healthchecks.io URL from its watchdog; if the gateway dies, Healthchecks alerts the user (email/webhook).

### B2b2LR — ping URL suffixes

- **Ping URL:** `https://hc-ping.com/<uuid>`; suffixes: `/start` (job started), `/fail` (job failed), `/<exitcode>` (custom exit code).
- **Recommended:** watchdog sends `/start` at job start, `/fail` on job failure, plain ping on success.

### B2b2RL — monitor background jobs

- **Recommended:** watchdog in instrumentation.js: each background job registers `{name, interval}`; watchdog pings Healthchecks with the job's expected cadence; missed runs → `/fail` → alert.

### B2b2RR — grace time

- **Healthchecks:** grace time configurable (default 1 day, min 1 min); "Late" state after grace, "Down" after grace + 1h.
- **Recommended:** grace = 2× job interval (e.g., 5h-window quota job → 10h grace).

## L6 Leaf Summary

| Leaf | Finding | Precedent |
|------|---------|-----------|
| B2b1LL | Daily spend digest grouped by provider/model; persist last-sent | LiteLLM digest_interval |
| B2b1LR | Hourly check whether digest is due | LiteLLM report_check_interval |
| B2b1RL | Emit catalog.model_added on sync | 9router instrumentation.js |
| B2b1RR | new_model_added alert parity | LiteLLM |
| B2b2LL | Ping Healthchecks; alert on absence | Healthchecks.io |
| B2b2LR | /start, /fail, /<exitcode> suffixes | Healthchecks.io |
| B2b2RL | Watchdog monitors instrumentation.js jobs | Healthchecks.io, 9router jobs |
| B2b2RR | Grace = 2× job interval | Healthchecks.io |

## Related Docs

- Master tree: `2026-09-15-webhook-master-research-tree.md`
- Flat research: `2026-09-15-webhook-receive-act-research.md` (Part 2 A1 LiteLLM, E1 Uptime Kuma, E2 Healthchecks.io)
- Plan: `../planning/2026-09-15-webhook-receive-act-plan.md` (M4)