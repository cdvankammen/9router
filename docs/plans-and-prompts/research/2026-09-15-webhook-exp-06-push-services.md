# Exponential Branch 06 — Push Services (R18–R20)

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** active
**Tags:** #research #webhook #exponential #push #ntfy #gotify #apprise #branch-exp-06

## Objective

N-ary exponential expansion (6 levels, N children per node) of the push-service roots: R18 ntfy integration, R19 Gotify integration, R20 Apprise universal adapter.

## R18 — ntfy integration

```
L0 R18: NTFY INTEGRATION
├─ L1: core model
│  ├─ L2: topic = password
│  │  ├─ L3: no sign-up
│  │  │  ├─ L4: PUT/POST ntfy.sh/<topic>
│  │  │  │  ├─ L5: topic is the auth
│  │  │  │  │  └─ L6: unguessable topic = security
│  │  │  │  └─ L5: anyone with topic reads
│  │  │  │     └─ L6: keep secret
│  │  │  └─ L4: self-hosted
│  │  │     ├─ L5: Go binary
│  │  │     │  └─ L6: single deploy
│  │  │     └─ L5: SQLite history
│  │  │        └─ L6: 12h cache
│  │  └─ L3: auth options
│  │     ├─ L4: Basic auth
│  │     │  └─ L5: user:pass
│  │     ├─ L4: tk_ tokens
│  │     │  └─ L5: access tokens
│  │     └─ L4: Bearer
│  │        └─ L5: OAuth
│  ├─ L2: message format
│  │  ├─ L3: body = message text
│  │  │  └─ L4: 4096 bytes
│  │  ├─ L3: X-Title
│  │  │  └─ L4: notification title
│  │  ├─ L3: X-Priority (1-5)
│  │  │  ├─ L4: 1 min, 2 low, 3 default, 4 high, 5 max
│  │  │  │  └─ L5: 5 = repeat sound
│  │  │  └─ L4: urgency mapping
│  │  ├─ L3: X-Tags
│  │  │  └─ L4: emoji tags
│  │  ├─ L3: X-Markdown
│  │  │  └─ L4: markdown body
│  │  ├─ L3: X-Click
│  │  │  └─ L4: open URL on tap
│  │  ├─ L3: X-Email
│  │  │  └─ L4: email fallback
│  │  └─ L3: X-Call
│  │     └─ L4: phone call
│  ├─ L2: action buttons (≤3)
│  │  ├─ L3: view
│  │  │  └─ L4: open URL
│  │  ├─ L3: broadcast
│  │  │  └─ L4: Android intent
│  │  ├─ L3: http
│  │  │  ├─ L4: POST to URL
│  │  │  │  └─ L5: method, headers, body
│  │  │  └─ L4: approve/deny pattern
│  │  │     └─ L5: action → webhook
│  │  └─ L3: copy
│  │     └─ L4: clipboard
│  ├─ L2: X-Delay
│  │  ├─ L3: min 10s
│  │  ├─ L3: max 3 days
│  │  └─ L3: scheduled delivery
│  │     └─ L4: ISO 8601 or duration
│  └─ L2: templates
│     ├─ L3: github
│     │  └─ L4: GitHub event payloads
│     ├─ L3: grafana
│     │  └─ L4: Grafana alerts
│     └─ L3: alertmanager
│        └─ L4: Alertmanager payloads
├─ L1: 9router application
│  ├─ L2: notify action
│  │  ├─ L3: ntfy://topic URL
│  │  │  └─ L4: R14 notify
│  │  ├─ L3: PUT ntfy.sh/<topic>
│  │  │  └─ L4: title + body + priority
│  │  └─ L3: X-Markdown
│  │     └─ L4: rich alerts
│  ├─ L2: self-hosted option
│  │  ├─ L3: ntfy.sh or own server
│  │  │  └─ L4: URL configurable
│  │  └─ L3: no account needed
│  │     └─ L4: zero setup
│  └─ L2: action buttons (v2)
│     ├─ L3: http button → 9router endpoint
│     │  └─ L4: approve/deny flow
│     └─ L3: view button → dashboard
│        └─ L4: deep link
```

## R19 — Gotify integration

```
L0 R19: GOTIFY INTEGRATION
├─ L1: core model
│  ├─ L2: token types
│  │  ├─ L3: appToken (sender)
│  │  │  ├─ L4: POST messages
│  │  │  │  ├─ L5: shown once
│  │  │  │  │  └─ L6: copy on creation
│  │  │  │  └─ L5: per-app
│  │  │  │     └─ L6: multiple apps
│  │  │  └─ L4: X-Gotify-Key header
│  │  │     └─ L5: or token query / Bearer
│  │  └─ L3: clientToken (receiver)
│  │     ├─ L4: read messages
│  │     │  └─ L5: GET /stream (WebSocket)
│  │     └─ L4: shown once
│  │        └─ L5: rotation
│  ├─ L2: message API
│  │  ├─ L3: POST /message
│  │  │  ├─ L4: {title, message, priority, extras}
│  │  │  │  ├─ L5: priority 0-7
│  │  │  │  │  └─ L6: 0 min, 5 high, 7 urgent
│  │  │  │  └─ L5: extras
│  │  │  │     └─ L6: clientDisplay, clientNotification
│  │  │  └─ L4: response
│  │  │     └─ L5: {id, appid, ...}
│  │  └─ L3: GET /message
│  │     ├─ L4: list
│  │     └─ L4: pagination
│  ├─ L2: auth
│  │  ├─ L3: X-Gotify-Key: <apptoken>
│  │  │  └─ L4: header
│  │  ├─ L3: token query param
│  │  │  └─ L4: ?token=
│  │  └─ L3: Authorization: Bearer
│  │     └─ L4: clientToken
│  ├─ L2: deployment
│  │  ├─ L3: self-hosted Go binary
│  │  │  └─ L4: single binary
│  │  ├─ L3: SQLite storage
│  │  ├─ L3: Docker
│  │  │  └─ L4: gotify/server
│  │  └─ L3: OIDC
│  │     └─ L4: SSO
│  └─ L2: plugins
│     ├─ L3: plugin system
│     │  └─ L4: custom handlers
│     └─ L3: webhooks
│        └─ L4: incoming
├─ L1: 9router application
│  ├─ L2: notify action
│  │  ├─ L3: gotify://host/appToken
│  │  │  └─ L4: R14 notify
│  │  ├─ L3: X-Gotify-Key header
│  │  │  └─ L4: POST /message
│  │  └─ L3: {title, message, priority}
│  │     └─ L4: map severity → priority
│  ├─ L2: self-hosted
│  │  ├─ L3: local Gotify server
│  │  │  └─ L4: no cloud dependency
│  │  └─ L3: URL configurable
│  │     └─ L4: settings
│  └─ L2: receiver (v2)
│     ├─ L3: clientToken + /stream
│     │  └─ L4: WebSocket inbound
│     └─ L3: plugin webhooks
│        └─ L4: R01 endpoint
```

## R20 — Apprise universal adapter

```
L0 R20: APPRISE UNIVERSAL ADAPTER
├─ L1: core model
│  ├─ L2: one URL → 100+ services
│  │  ├─ L3: schema://credentials/params
│  │  │  ├─ L4: slack://webhook-id/webhook-token
│  │  │  │  └─ L5: R15
│  │  │  ├─ L4: discord://id/token
│  │  │  │  └─ L5: R16
│  │  │  ├─ L4: tgram://bottoken/chatid
│  │  │  │  └─ L5: R17
│  │  │  ├─ L4: ntfy://topic
│  │  │  │  └─ L5: R18
│  │  │  ├─ L4: gotify://host/apptoken
│  │  │  │  └─ L5: R19
│  │  │  ├─ L4: mailto://user:pass@host
│  │  │  │  └─ L5: SMTP
│  │  │  ├─ L4: matrix://...
│  │  │  ├─ L4: signal://...
│  │  │  ├─ L4: whatsapp://...
│  │  │  ├─ L4: pagerduty://...
│  │  │  ├─ L4: opsgenie://...
│  │  │  └─ L4: 46elks://... (SMS)
│  │  └─ L3: Python library
│  │     ├─ L4: 17.3k★
│  │     │  └─ L5: BSD-2
│  │     └─ L4: CLI + API
│  │        └─ L5: apprise -b "msg" URL
│  ├─ L2: config
│  │  ├─ L3: YAML/TEXT files
│  │  │  ├─ L4: APPRISE_URLS env
│  │  │  └─ L4: apprise.yaml
│  │  └─ L3: tags
│  │     ├─ L4: -g devops
│  │     │  └─ L5: OR logic
│  │     ├─ L4: -g devops,critical
│  │     │  └─ L5: AND logic
│  │     ├─ L4: -g "2:alerts"
│  │     │  └─ L5: priority escalation
│  │     ├─ L4: -g "alerts:3"
│  │     │  └─ L5: per-call retry
│  │     └─ L4: -g "alerts:3:2"
│  │        └─ L5: retry + priority
│  └─ L2: delivery semantics
│     ├─ L3: notify all matching
│     │  └─ L4: tag groups
│     ├─ L3: escalation
│     │  └─ L4: priority 1 first, escalate
│     └─ L3: retry
│        └─ L4: per-call
├─ L1: 9router application
│  ├─ L2: URL scheme parser
│  │  ├─ L3: parse schema://
│  │  │  ├─ L4: dispatch to platform notifier
│  │  │  │  └─ L5: no Python dep
│  │  │  └─ L4: settings.notifyUrls = [...]
│  │  │     └─ L5: R14 notify
│  │  └─ L3: unknown schema
│  │     ├─ L4: warn
│  │     └─ L4: skip
│  ├─ L2: tag routing (v2)
│  │  ├─ L3: event → channel mapping
│  │  │  ├─ L4: provider.error → [ntfy, slack]
│  │  │  └─ L4: quota.exhausted → [ntfy, slack, tgram]
│  │  └─ L3: priority escalation
│  │     └─ L4: Apprise semantics
│  └─ L2: deferred spec alignment
│     ├─ L3: messages-page-feature-spec §6
│     │  ├─ L4: Apprise-style URLs
│     │  │  └─ L5: Slack/Discord/ntfy/Gotify/Telegram
│     │  └─ L4: Alertmanager semantics
│     │     ├─ L5: group by fingerprint
│     │     ├─ L5: min-interval dedupe
│     │     └─ L5: silence window
│     └─ L3: P3 → operationalized
│        └─ L4: this branch
```

## L6 Leaf Summary

| Leaf | Finding | Precedent |
|------|---------|-----------|
| R18-L6-1 | topic = password; PUT/POST ntfy.sh/<topic> | ntfy |
| R18-L6-2 | X-Title/X-Priority 1-5/X-Tags/X-Markdown/X-Click | ntfy |
| R18-L6-3 | Action buttons ≤3: view/broadcast/http/copy | ntfy |
| R18-L6-4 | X-Delay 10s–3d scheduled delivery | ntfy |
| R18-L6-5 | Templates: github/grafana/alertmanager | ntfy |
| R19-L6-1 | appToken (sender) vs clientToken (receiver) | Gotify |
| R19-L6-2 | X-Gotify-Key header / token query / Bearer | Gotify |
| R19-L6-3 | POST /message {title, message, priority 0-7, extras} | Gotify |
| R19-L6-4 | GET /stream WebSocket receiver | Gotify |
| R20-L6-1 | One URL → 100+ services (schema://) | Apprise |
| R20-L6-2 | Tags: OR/AND/priority escalation/exclusive/retry | Apprise |
| R20-L6-3 | 9router parses URLs natively, no Python dep | Apprise |
| R20-L6-4 | Operationalizes messages-page-feature-spec §6 (P3) | 9router deferred spec |

## Related Docs

- Master map: `2026-09-15-webhook-exponential-master-map.md` (R18–R20)
- Prior 2-way spine: `2026-09-15-webhook-branch-b1b-push-services.md`
- Flat research: `2026-09-15-webhook-receive-act-research.md` (Part 2 C4–C6)
- Plan: `../planning/2026-09-15-webhook-receive-act-plan.md` (M4)