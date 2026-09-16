# Exponential Branch 10 — Patterns & Platforms (R30–R46)

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** active
**Tags:** #research #webhook #exponential #patterns #eventemitter #outbox #mq #sse #websocket #longpolling #automation #branch-exp-10

## Objective

N-ary exponential expansion (6 levels, N children per node) of the patterns/platforms roots: R30 EventEmitter/pub-sub, R31 transactional outbox, R32 message queues, R33 SSE, R34 WebSocket, R35 long-polling, R36 Home Assistant TCA, R37 n8n, R38 Node-RED, R39 Pipedream, R40 Huginn, R41 Inngest, R42 LiteLLM alerts, R43 One API metrics, R44 Helicone, R45 Uptime Kuma, R46 Healthchecks.io.

## R30 — EventEmitter / pub-sub

```
L0 R30: EVENTEMITTER / PUB-SUB
├─ L1: Node.js EventEmitter
│  ├─ L2: in-process
│  │  ├─ L3: emit + on
│  │  │  ├─ L4: synchronous
│  │  │  │  └─ L5: same tick
│  │  │  └─ L4: no persistence
│  │  │     └─ L5: lost on crash
│  │  └─ L3: use cases
│  │     ├─ L4: internal events
│  │     │  └─ L5: quota, fallback (R21–R23)
│  │     └─ L4: decoupling
│  │        └─ L5: emitter → outbox
│  ├─ L2: pub-sub (Redis)
│  │  ├─ L3: channels
│  │  │  └─ L4: fire-and-forget
│  │  └─ L3: no persistence
│  │     └─ L4: lost on restart
│  └─ L2: 9router
│     ├─ L3: EventEmitter for internal
│     │  └─ L4: emitter.emit("quota.warning")
│     └─ L3: outbox for durability
│        └─ L4: R09
├─ L1: event naming
│  ├─ L2: dot notation
│  │  ├─ L3: quota.warning
│  │  ├─ L3: provider.error
│  │  ├─ L3: fallback.used
│  │  └─ L3: catalog.model_added
│  └─ L2: wildcard
│     └─ L3: *.* (Stripe)
├─ L1: fail-open
│  ├─ L2: emitter never throws
│  │  └─ L3: RTK convention
│  └─ L2: listener errors isolated
│     └─ L3: try/catch per listener
└─ L1: vs outbox
   ├─ L2: EventEmitter = fast path
   │  └─ L3: in-memory
   └─ L2: outbox = durable path
      └─ L3: R09
```

## R31 — Transactional outbox

```
L0 R31: TRANSACTIONAL OUTBOX
├─ L1: pattern
│  ├─ L2: write event in same tx
│  │  ├─ L3: as business state
│  │  │  ├─ L4: atomic
│  │  │  │  └─ L5: no partial
│  │  │  └─ L4: SQLite tx
│  │  │     └─ L5: BEGIN/COMMIT
│  │  └─ L3: outbox table
│  │     └─ L4: R09
│  ├─ L2: worker publishes
│  │  ├─ L3: polls outbox
│  │  │  └─ L4: R10
│  │  └─ L3: marks delivered
│  │     └─ L4: status machine
│  └─ L2: guarantees
│     ├─ L3: at-least-once
│     │  └─ L4: retries
│     └─ L3: ordering (per aggregate)
│        └─ L4: FIFO
├─ L1: vs alternatives
│  ├─ L2: MQ (R32)
│  │  └─ L3: overkill single-node
│  ├─ L2: EventEmitter (R30)
│  │  └─ L3: no durability
│  └─ L2: CDC
│     └─ L3: complex
├─ L1: 9router
│  ├─ L2: SQLite outbox
│  │  └─ L3: same DB as settings
│  └─ L2: worker
│     └─ L3: instrumentation.js
└─ L1: pitfalls
   ├─ L2: tx scope
   │  └─ L3: keep small
   ├─ L2: idempotency
   │  └─ L3: R11
   └─ L2: cleanup
      └─ L3: TTL
```

## R32 — Message queues

```
L0 R32: MESSAGE QUEUES
├─ L1: options
│  ├─ L2: RabbitMQ
│  │  ├─ L3: AMQP
│  │  │  └─ L4: exchanges, queues
│  │  └─ L3: durable
│  │     └─ L4: but infra
│  ├─ L2: Redis (BullMQ)
│  │  ├─ L3: lists
│  │  │  └─ L4: BRPOPLPUSH
│  │  └─ L3: BullMQ
│  │     └─ L4: jobs, retries
│  ├─ L2: Kafka
│  │  ├─ L3: log-based
│  │  │  └─ L4: replay
│  │  └─ L3: heavy
│  │     └─ L4: overkill
│  └─ L2: NATS
│     └─ L3: lightweight
├─ L1: 9router fit
│  ├─ L2: single-node local
│  │  ├─ L3: no broker needed
│  │  │  └─ L4: SQLite outbox
│  │  └─ L3: zero new infra
│  │     └─ L4: R09
│  └─ L2: when to add
│     ├─ L3: multi-instance
│     └─ L3: high volume
├─ L1: queue semantics
│  ├─ L2: at-least-once
│  ├─ L2: at-most-once
│  └─ L2: exactly-once
│     └─ L3: hard, use dedupe
└─ L1: comparison table
   ├─ L2: durability
   ├─ L2: ordering
   ├─ L2: ops burden
   └─ L2: fit
```

## R33 — SSE

```
L0 R33: SSE
├─ L1: protocol
│  ├─ L2: text/event-stream
│  │  ├─ L3: event: name
│  │  │  └─ L4: data: JSON
│  │  ├─ L3: id:
│  │  │  └─ L4: Last-Event-ID
│  │  └─ L3: retry:
│  │     └─ L4: reconnect
│  ├─ L2: one-way
│  │  └─ L3: server → client
│  └─ L2: HTTP
│     └─ L3: no upgrade
├─ L1: 9router existing
│  ├─ L2: SSE infra
│  │  ├─ L3: chat streaming
│  │  │  └─ L4: open-sse
│  │  └─ L3: dashboard
│  │     └─ L4: events feed
│  └─ L2: reuse
│     ├─ L3: webhook events feed
│     │  └─ L4: R14 dashboard
│     └─ L3: real-time UI
├─ L1: vs WebSocket (R34)
│  ├─ L2: SSE simpler
│  │  └─ L3: HTTP, auto-reconnect
│  └─ L2: WS bidirectional
│     └─ L3: Slack Socket Mode
└─ L1: use cases
   ├─ L2: dashboard live log
   ├─ L2: rule match highlight
   └─ L2: action results
```

## R34 — WebSocket

```
L0 R34: WEBSOCKET
├─ L1: protocol
│  ├─ L2: bidirectional
│  │  └─ L3: full-duplex
│  ├─ L2: upgrade
│  │  └─ L3: HTTP → WS
│  └─ L2: frames
│     └─ L3: text/binary
├─ L1: use cases
│  ├─ L2: Slack Socket Mode
│  │  ├─ L3: no public URL
│  │  │  └─ L4: local gateway friendly
│  │  └─ L3: events over WS
│  ├─ L2: Gotify /stream
│  │  └─ L3: clientToken
│  └─ L2: real-time chat
│     └─ L3: 9router SSE alternative
├─ L1: 9router
│  ├─ L2: inbound (v2)
│  │  ├─ L3: Slack Socket Mode
│  │  └─ L3: Gotify stream
│  └─ L2: outbound
│     └─ L3: not needed
└─ L1: vs SSE (R33)
   ├─ L2: WS = bidirectional
   ├─ L2: SSE = simpler
   └─ L2: choose per use
```

## R35 — Long-polling

```
L0 R35: LONG-POLLING
├─ L1: pattern
│  ├─ L2: client polls
│  │  ├─ L3: holds connection
│  │  │  └─ L4: until event or timeout
│  │  └─ L3: then re-polls
│  │     └─ L4: offset
│  ├─ L2: vs short polling
│  │  └─ L3: fewer requests
│  └─ L2: vs SSE/WS
│     └─ L3: simpler, no upgrade
├─ L1: use cases
│  ├─ L2: Telegram getUpdates
│  │  ├─ L3: timeout 50s
│  │  │  └─ L4: no public URL
│  │  └─ L3: offset ack
│  │     └- L4: update_id
│  └─ L2: Slack (legacy)
│     └─ L3: RTM
├─ L1: 9router
│  ├─ L2: Telegram inbound (v2)
│  │  └─ L3: getUpdates worker
│  └─ L2: vs webhook
│     ├- L3: webhook needs tunnel
│     └─ L3: long-poll doesn't
└─ L1: tradeoffs
   ├─ L2: latency
   │  └─ L3: up to timeout
   ├─ L2: server load
   │  └─ L3: held connections
   └─ L2: simplicity
      └─ L3: no infra
```

## R36 — Home Assistant TCA

```
L0 R36: HOME ASSISTANT TCA
├─ L1: trigger
│  ├─ L2: webhook
│  │  ├─ L3: POST /api/webhook/<id>
│  │  │  └─ L4: secret ID
│  │  └─ L3: payload
│  │     └─ L4: JSON
│  ├─ L2: state
│  │  └─ L3: entity change
│  ├─ L2: time
│  │  └─ L3: cron
│  ├─ L2: mqtt
│  └─ L2: event
├─ L1: condition
│  ├─ L2: template (Jinja2)
│  │  └─ L3: {{ states(...) }}
│  └─ L2: and/or/not
├─ L1: action
│  ├─ L2: service call
│  │  └─ L3: notify, light, ...
│  └─ L2: script
├─ L1: 9router adoption
│  ├─ L2: webhook trigger = R01
│  ├─ L2: condition = R13
│  └─ L2: action = R14
└─ L1: YAML config
   ├─ L2: automations.yaml
   └─ L2: UI editor
```

## R37 — n8n workflows

```
L0 R37: N8N WORKFLOWS
├─ L1: webhook node
│  ├─ L2: URL
│  │  └─ L3: /webhook/<id>
│  ├─ L2: respond modes
│  │  ├─ L3: immediately
│  │  │  └─ L4: ack-then-process
│  │  └─ L3: when last node
│  │     └─ L4: wait
│  └─ L2: 16MB cap
│     └─ L3: payload limit
├─ L1: nodes
│  ├─ L2: IF (Only Run If)
│  │  ├─ L3: $json.body.field
│  │  │  └─ L4: operators
│  │  └─ L3: branches
│  ├─ L2: HTTP Request
│  ├─ L2: Slack/Discord/Telegram
│  └─ L2: Code
├─ L1: 9router adoption
│  ├─ L2: rules = mini-workflows
│  │  └─ L3: R12
│  └─ L2: Only Run If = R13
└─ L1: comparison
   ├─ L2: visual vs JSON
   │  └─ L3: JSON fits settings
   └─ L2: hosted vs embedded
```

## R38 — Node-RED flows

```
L0 R38: NODE-RED FLOWS
├─ L1: flow-based programming
│  ├─ L2: nodes + wires
│  │  └─ L3: visual graph
│  ├─ L2: Switch node
│  │  └─ L3: rule routing
│  └─ L2: Function node
│     └─ L3: JS code
├─ L1: webhook
│  ├─ L2: http in node
│  │  └─ L3: POST
│  └─ L2: response node
├─ L1: 9router adoption
│  ├─ L2: Switch = R13
│  └─ L2: Function = sandboxed JS (v2)
└─ L1: comparison
   ├─ L2: visual vs JSON
   └─ L2: embedded vs external
```

## R39 — Pipedream

```
L0 R39: PIPEDREAM
├─ L1: event source + workflow
│  ├─ L2: sources
│  │  ├─ L3: webhook source
│  │  │  └─ L4: HTTP endpoint
│  │  └─ L3: app sources
│  ├─ L2: workflows
│  │  ├─ L3: steps
│  │  │  └─ L4: code, actions
│  │  └─ L3: $.respond({immediate:true})
│  │     └─ L4: ack-then-process
│  └─ L2: 5TB uploads
│     └─ L3: presigned URLs
├─ L1: 9router adoption
│  ├─ L2: ack-then-process
│  │  └─ L3: R04
│  └─ L2: large payload offload
│     └─ L3: R03
└─ L1: comparison
   ├─ L2: hosted vs embedded
   └─ L2: code vs JSON rules
```

## R40 — Huginn

```
L0 R40: HUGINN
├─ L1: agent graph
│  ├─ L2: agents
│  │  ├─ L3: trigger
│  │  ├─ L3: website agent
│  │  ├─ L3: post agent
│  │  └─ L3: digest agent
│  └─ L2: events between agents
│     └─ L3: graph
├─ L1: 49.9k★
│  └─ L2: self-hosted
├─ L1: 9router adoption
│  ├─ L2: agent graph = rules
│  │  └─ L3: R12
│  └─ L2: digest agent = R24
└─ L1: comparison
   ├─ L2: Ruby vs JS
   └─ L2: graph vs JSON
```

## R41 — Inngest

```
L0 R41: INNGEST
├─ L1: embedded event queue
│  ├─ L2: inngest.on(name, handler)
│  │  ├─ L3: SDK registration
│  │  │  └─ L4: in code
│  │  └─ L3: event-driven
│  ├─ L2: functions
│  │  ├─ L3: steps
│  │  │  └─ L4: retries
│  │  └─ L3: debounce/rate
│  └─ L2: dev server
│     └─ L3: local
├─ L1: 9router adoption
│  ├─ L2: action registration
│  │  └─ L3: R14
│  └─ L2: embedded (no cloud)
│     └─ L3: outbox worker
└─ L1: comparison
   ├─ L2: SDK vs JSON rules
   └─ L2: hosted vs embedded
```

## R42 — LiteLLM alerts

```
L0 R42: LITELLM ALERTS
├─ L1: alert types
│  ├─ L2: budget alerts
│  │  ├─ L3: budget_crossed
│  │  ├─ L3: threshold_crossed
│  │  └─ L3: projected_limit_exceeded
│  ├─ L2: outage_alerts
│  │  ├─ L3: minor 5
│  │  │  └─ L4: minor_outage_alert_threshold
│  │  └─ L3: major 10
│  │     └─ L4: major_outage_alert_threshold
│  ├─ L2: cooldown_deployment
│  ├─ L2: fallback_reports
│  ├─ L2: new_model_added
│  └─ L2: digest
│     └─ L3: digest_interval
├─ L1: channels
│  ├─ L2: slack
│  ├─ L2: webhook
│  │  └─ L3: WEBHOOK_URL
│  ├─ L2: email
│  └─ L2: discord
├─ L1: 9router adoption
│  ├─ L2: vocabulary
│  │  └─ L3: R21–R24
│  └─ L2: webhook channel
│     └─ L3: R14 http
└─ L1: comparison
   ├─ L2: proxy-level vs gateway-level
   └─ L2: same concepts
```

## R43 — One API metrics

```
L0 R43: ONE API METRICS
├─ L1: ENABLE_METRIC
│  ├─ L2: auto-disable
│  │  ├─ L3: success rate < 0.8
│  │  │  └─ L4: METRIC_SUCCESS_RATE_THRESHOLD
│  │  └─ L3: queue size 10
│  │     └- L4: METRIC_QUEUE_SIZE
│  ├─ L2: re-test
│  │  ├─ L3: CHANNEL_TEST_FREQUENCY
│  │  └─ L3: CHANNEL_UPDATE_FREQUENCY
│  └─ L2: 9router
│     └─ L3: R22 gateway action
├─ L1: Message Pusher
│  ├─ L2: notifications
│  │  └─ L3: channel
│  └─ L2: 9router
│     └─ L3: R14 notify
├─ L1: sandboxed JS plugins
│  ├─ L2: task plugins
│  │  └─ L3: user logic
│  └─ L2: 9router (v2)
│     └─ L3: escape hatch
└─ L1: comparison
   ├─ L2: metric-driven vs rule-driven
   └─ L2: same outcome
```

## R44 — Helicone

```
L0 R44: HELICONE
├─ L1: per-request webhooks
│  ├─ L2: request logged
│  │  └─ L3: webhook on completion
│  ├─ L2: HMAC-SHA256
│  │  └─ L3: signature
│  └─ L2: sample rate
│     └─ L3: percentage
├─ L1: 9router adoption
│  ├─ L2: per-request events
│  │  └─ L3: usageDb → outbox
│  └─ L2: sample rate
│     └─ L3: settings
└─ L1: comparison
   ├─ L2: observability platform
   └─ L2: 9router embedded
```

## R45 — Uptime Kuma

```
L0 R45: UPTIME KUMA
├─ L1: monitors
│  ├─ L2: HTTP
│  │  └─ L3: status codes
│  ├─ L2: push
│  │  └─ L3: ping URL
│  ├─ L2: TCP
│  └─ L2: DNS
├─ L1: notifications (90+)
│  ├─ L2: webhook
│  │  └─ L3: → 9router receiver
│  ├─ L2: ntfy
│  ├─ L2: Slack
│  └─ L2: email
├─ L1: 91.4k★
│  └─ L2: self-hosted
├─ L1: 9router adoption
│  ├─ L2: monitor 9router
│  │  └─ L3: push monitor
│  └─ L2: webhook → rules
│     └─ L3: R01 + R12
└─ L1: comparison
   ├─ L2: external monitor
   └─ L2: complements R25
```

## R46 — Healthchecks.io

```
L0 R46: HEALTHCHECKS.IO
├─ L1: dead man's switch
│  ├─ L2: alert on absence
│  │  └─ L3: R25
│  ├─ L2: states
│  │  └─ L3: New/Up/Late/Down/Paused
│  └─ L2: grace
│     └─ L3: configurable
├─ L1: ping URL
│  ├─ L2: /start /fail /<exitcode>
│  └─ L2: UUID/slug
├─ L1: integrations
│  ├─ L2: webhook
│  │  └─ L3: → 9router
│  ├─ L2: email
│  ├─ L2: Slack
│  └─ L2: ntfy
├─ L1: 9router adoption
│  ├─ L2: watchdog
│  │  └─ L3: R25
│  └─ L2: receiver
│     └─ L3: R01
└─ L1: comparison
   ├─ L2: self-hosted
   └─ L2: complements Uptime Kuma
```

## L6 Leaf Summary

| Leaf | Finding | Precedent |
|------|---------|-----------|
| R30-L6 | EventEmitter in-process, outbox for durability | Node.js, 9router |
| R31-L6 | Transactional outbox: same-tx write, at-least-once | Microservices.io |
| R32-L6 | MQ overkill single-node; SQLite outbox fits | RabbitMQ/Redis/Kafka |
| R33-L6 | SSE one-way, auto-reconnect; 9router has infra | SSE spec, 9router |
| R34-L6 | WS bidirectional; Slack Socket Mode, Gotify /stream | Slack, Gotify |
| R35-L6 | Long-poll: Telegram getUpdates, no public URL | Telegram |
| R36-L6 | TCA: trigger→condition→action | Home Assistant |
| R37-L6 | Webhook node, respond modes, 16MB cap | n8n |
| R38-L6 | Flow-based: Switch + Function nodes | Node-RED |
| R39-L6 | $.respond({immediate:true}) ack-then-process | Pipedream |
| R40-L6 | Agent graph, digest agent | Huginn |
| R41-L6 | inngest.on(name, handler) embedded queue | Inngest |
| R42-L6 | Alert types: budget/outage/cooldown/fallback/digest | LiteLLM |
| R43-L6 | ENABLE_METRIC auto-disable, threshold 0.8 | One API |
| R44-L6 | Per-request webhooks, HMAC, sample rate | Helicone |
| R45-L6 | 90+ notifications, push monitor | Uptime Kuma |
| R46-L6 | Dead man's switch, /start /fail suffixes | Healthchecks.io |

## Related Docs

- Master map: `2026-09-15-webhook-exponential-master-map.md` (R30–R46)
- Flat research: `2026-09-15-webhook-receive-act-research.md` (Part 2 A–F)
- All other exp branches (01–09, 11)
- Plan: `../planning/2026-09-15-webhook-receive-act-plan.md`