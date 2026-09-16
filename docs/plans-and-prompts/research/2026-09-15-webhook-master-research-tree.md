# Master Research Tree — 9router Webhook Receive & Act (6-Level Binary Tree)

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** active
**Tags:** #research #index #tree #webhook #events #automation #binary-tree

## Purpose

This is the master map for the webhook receive & act research: the prior flat research (`2026-09-15-webhook-receive-act-research.md`) is expanded into a **6-level binary tree** (63 nodes). Each Level-3 branch has its own research doc covering its 7-node subtree, with L6 leaf details inside each branch doc.

**Relationship to prior work:** this tree does NOT replace `2026-09-15-webhook-receive-act-research.md` (the flat 6-level-per-program analysis, 12 archetypes, recommended architecture). It is the recursive expansion: every finding from that doc is now a node that branches into 2 sub-topics × 6 levels.

## The Tree

```
L0  ROOT: 9router Webhook Receive & Act
│
├─ L1 A: INBOUND — receiving webhooks
│  ├─ L2 A1: RECEIVER — HTTP endpoint
│  │  ├─ L3 A1a: TRANSPORT — HTTP semantics
│  │  │  ├─ L4 A1a1: REQUEST HANDLING
│  │  │  │  ├─ L5 A1a1L: methods & routes
│  │  │  │  │  ├─ L6 A1a1LL: POST /api/webhooks/[id]
│  │  │  │  │  └─ L6 A1a1LR: allowed_methods (Home Assistant)
│  │  │  │  └─ L5 A1a1R: response contract
│  │  │  │     ├─ L6 A1a1RL: 2xx <3s (Slack/Discord mandate)
│  │  │  │     └─ L6 A1a1RR: challenge handshake (Slack url_verification)
│  │  │  └─ L4 A1a2: RAW BODY
│  │  │     ├─ L5 A1a2L: req.text() pattern
│  │  │     │  ├─ L6 A1a2LL: raw body for HMAC (Svix/Next.js)
│  │  │     │  └─ L6 A1a2LR: JSON parse after verify
│  │  │     └─ L5 A1a2R: payload limits
│  │  │        ├─ L6 A1a2RL: size caps (n8n 16MB, Pipedream 512KB)
│  │  │        └─ L6 A1a2RR: large payload offload (Pipedream S3)
│  │  └─ L3 A1b: AUTH & SECURITY
│  │     ├─ L4 A1b1: HMAC VERIFICATION
│  │     │  ├─ L5 A1b1L: signature schemes
│  │     │  │  ├─ L6 A1b1LL: Stripe t=,v1= format
│  │     │  │  └─ L6 A1b1LR: Standard Webhooks webhook-signature
│  │     │  └─ L5 A1b1R: verification mechanics
│  │     │     ├─ L6 A1b1RL: timingSafeEqual constant-time compare
│  │     │     └─ L6 A1b1RR: timestamp tolerance (5-min replay protection)
│  │     └─ L4 A1b2: SECRET MANAGEMENT
│  │        ├─ L5 A1b2L: secret ID in URL (Home Assistant)
│  │        │  ├─ L6 A1b2LL: UUID as password
│  │        │  └─ L6 A1b2LR: local_only default
│  │        └─ L5 A1b2R: secret rotation
│  │           ├─ L6 A1b2RL: whsec_ prefix (Stripe/Svix)
│  │           └─ L6 A1b2RR: dual-secret grace (Stripe 24h)
│  ├─ L2 A2: PROCESSING — after receipt
│  │  ├─ L3 A2a: EVENT STORE
│  │  │  ├─ L4 A2a1: OUTBOX TABLE
│  │  │  │  ├─ L5 A2a1L: schema
│  │  │  │  │  ├─ L6 A2a1LL: event_id idempotency key
│  │  │  │  │  └─ L6 A2a1LR: status machine (pending→processing→delivered/failed)
│  │  │  │  └─ L5 A2a1R: transactional outbox pattern
│  │  │  │     ├─ L6 A2a1RL: same-DB write (9router SQLite)
│  │  │  │     └─ L6 A2a1RR: at-least-once guarantee
│  │  │  └─ L4 A2a2: WORKER & RETRY
│  │  │     ├─ L5 A2a2L: poller (instrumentation.js pattern)
│  │  │     │  ├─ L6 A2a2LL: settings-gated startup
│  │  │     │  └─ L6 A2a2LR: polling interval
│  │  │     └─ L5 A2a2R: retry policy
│  │  │        ├─ L6 A2a2RL: exponential backoff (Stripe 3 days)
│  │  │        └─ L6 A2a2RR: dead-letter after N attempts
│  │  └─ L3 A2b: RULE ENGINE
│  │     ├─ L4 A2b1: RULE MATCHING
│  │     │  ├─ L5 A2b1L: TCA model (Home Assistant)
│  │     │  │  ├─ L6 A2b1LL: trigger→condition→action
│  │     │  │  └─ L6 A2b1LR: JSON rules in settingsRepo
│  │     │  └─ L5 A2b1R: filter semantics
│  │     │     ├─ L6 A2b1RL: field/op/value (n8n Only Run If)
│  │     │     └─ L6 A2b1RR: jsonpath (Hookdeck Filters)
│  │     └─ L4 A2b2: ACTIONS
│  │        ├─ L5 A2b2L: action types
│  │        │  ├─ L6 A2b2LL: notify / http / llm / gateway / dashboard
│  │        │  └─ L6 A2b2LR: LLM action (analyze-error reuse, Slack reacji→LLM)
│  │        └─ L5 A2b2R: action execution
│  │           ├─ L6 A2b2RL: async queue (Slack "implement a queue" mandate)
│  │           └─ L6 A2b2RR: idempotent actions
│
├─ L1 B: OUTBOUND — sending webhooks/notifications
│  ├─ L2 B1: CHANNELS — where notifications go
│  │  ├─ L3 B1a: MESSAGING PLATFORMS
│  │  │  ├─ L4 B1a1: SLACK
│  │  │  │  ├─ L5 B1a1L: incoming webhooks
│  │  │  │  │  ├─ L6 B1a1LL: URL format & message shape
│  │  │  │  │  └─ L6 B1a1LR: formatting (blocks, attachments)
│  │  │  │  └─ L5 B1a1R: rate limits & retries
│  │  │  │     ├─ L6 B1a1RL: 30k events/hr workspace cap
│  │  │  │     └─ L6 B1a1RR: retry semantics (x-slack-retry-num)
│  │  │  └─ L4 B1a2: DISCORD & TELEGRAM
│  │  │     ├─ L5 B1a2L: discord webhooks
│  │  │     │  ├─ L6 B1a2LL: /webhooks/<id>/<token> URL
│  │  │     │  └─ L6 B1a2LR: slack/github-compatible endpoints
│  │  │     └─ L5 B1a2R: telegram bots
│  │  │        ├─ L6 B1a2RL: sendMessage API
│  │  │        └─ L6 B1a2RR: chat_id targeting
│  │  └─ L3 B1b: PUSH SERVICES
│  │     ├─ L4 B1b1: NTFY & GOTIFY
│  │     │  ├─ L5 B1b1L: ntfy
│  │     │  │  ├─ L6 B1b1LL: topic=password, PUT/POST
│  │     │  │  └─ L6 B1b1LR: action buttons, X-Delay, templates
│  │     │  └─ L5 B1b1R: gotify
│  │     │     ├─ L6 B1b1RL: appToken vs clientToken
│  │     │     └─ L6 B1b1RR: X-Gotify-Key header
│  │     └─ L4 B1b2: APPRISE
│  │        ├─ L5 B1b2L: universal adapter
│  │        │  ├─ L6 B1b2LL: one URL → 100+ services
│  │        │  └─ L6 B1b2LR: schema:// URL config
│  │        └─ L5 B1b2R: tag routing
│  │           ├─ L6 B1b2RL: OR/AND/priority/escalation chains
│  │           └─ L6 B1b2RR: 9router deferred spec alignment
│  ├─ L2 B2: TRIGGERS — what causes notifications
│  │  ├─ L3 B2a: INTERNAL EVENTS
│  │  │  ├─ L4 B2a1: QUOTA EVENTS
│  │  │  │  ├─ L5 B2a1L: thresholds
│  │  │  │  │  ├─ L6 B2a1LL: 80%/90%/exhausted (deferred spec)
│  │  │  │  │  └─ L6 B2a1LR: LiteLLM budget webhooks (BETA)
│  │  │  │  └─ L5 B2a1R: quotaAutoPing wiring
│  │  │  │     ├─ L6 B2a1RL: existing scheduler (warms 5h windows)
│  │  │  │     └─ L6 B2a1RR: emit events on threshold cross
│  │  │  └─ L4 B2a2: PROVIDER & FALLBACK EVENTS
│  │  │     ├─ L5 B2a2L: provider errors
│  │  │     │  ├─ L6 B2a2LL: error spike (LiteLLM outage_alerts)
│  │  │     │  └─ L6 B2a2LR: auto-disable (One API ENABLE_METRIC)
│  │  │     └─ L5 B2a2R: fallback events
│  │  │        ├─ L6 B2a2RL: fallback.used event
│  │  │        └─ L6 B2a2RR: cooldown (LiteLLM cooldown_deployment)
│  │  └─ L3 B2b: SCHEDULED & MONITORING
│  │     ├─ L4 B2b1: SCHEDULED REPORTS
│  │     │  ├─ L5 B2b1L: daily spend report
│  │     │  │  ├─ L6 B2b1LL: digest mode (LiteLLM digest_interval)
│  │     │  │  └─ L6 B2b1LR: report_check_interval (3600s)
│  │     │  └─ L5 B2b1R: new model added
│  │     │     ├─ L6 B2b1RL: model catalog sync event
│  │     │     └─ L6 B2b1RR: new_model_added alert (LiteLLM)
│  │     └─ L4 B2b2: DEAD MAN'S SWITCH
│  │        ├─ L5 B2b2L: absence alerting
│  │        │  ├─ L6 B2b2LL: Healthchecks.io model (alert on NO ping)
│  │        │  └─ L6 B2b2LR: ping URL suffixes (/start /fail /<exitcode>)
│  │        └─ L5 B2b2R: watchdog for 9router jobs
│  │           ├─ L6 B2b2RL: monitor background jobs (instrumentation.js)
│  │           └─ L6 B2b2RR: grace time configuration
```

## Branch Docs

Each Level-3 node has a branch doc covering its 7-node subtree (L3 + 2×L4 + 4×L5) with L6 leaf details:

| Branch | Doc | Subtree |
|--------|-----|---------|
| A1a | `2026-09-15-webhook-branch-a1a-transport.md` | HTTP semantics, raw body, payload limits |
| A1b | `2026-09-15-webhook-branch-a1b-auth-security.md` | HMAC verification, secret management |
| A2a | `2026-09-15-webhook-branch-a2a-event-store.md` | Outbox table, worker & retry |
| A2b | `2026-09-15-webhook-branch-a2b-rule-engine.md` | TCA matching, actions |
| B1a | `2026-09-15-webhook-branch-b1a-messaging-platforms.md` | Slack, Discord, Telegram |
| B1b | `2026-09-15-webhook-branch-b1b-push-services.md` | ntfy, Gotify, Apprise |
| B2a | `2026-09-15-webhook-branch-b2a-internal-events.md` | Quota events, provider/fallback events |
| B2b | `2026-09-15-webhook-branch-b2b-scheduled-monitoring.md` | Scheduled reports, dead man's switch |

## Related Docs

- `2026-09-15-webhook-receive-act-research.md` — the flat 6-level-per-program research this tree expands (20+ programs, 12 archetypes, recommended architecture)
- `../planning/2026-09-15-webhook-receive-act-plan.md` — implementation plan (M1–M5)
- `2026-09-15-master-research-tree.md` — the governance & control tree (sibling tree, same format)