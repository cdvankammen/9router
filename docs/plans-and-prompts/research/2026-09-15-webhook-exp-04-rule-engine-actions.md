# Exponential Branch 04 — Rule Engine & Actions (R12–R14)

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** active
**Tags:** #research #webhook #exponential #rule-engine #tca #actions #llm #branch-exp-04

## Objective

N-ary exponential expansion (6 levels, N children per node) of the rule engine roots: R12 rule engine (TCA), R13 rule matching (field/op/value), R14 actions (notify/http/llm/gateway/dashboard).

## R12 — Rule engine (TCA)

```
L0 R12: RULE ENGINE (TCA)
├─ L1: trigger→condition→action model
│  ├─ L2: Home Assistant TCA
│  │  ├─ L3: trigger (event, state, time, mqtt, webhook)
│  │  │  ├─ L4: webhook trigger = our endpoint
│  │  │  │  └─ L5: event_id + payload
│  │  │  └─ L4: state trigger (provider status)
│  │  │     └─ L5: from usageDb
│  │  ├─ L3: condition (Jinja2 templates)
│  │  │  ├─ L4: field/op/value
│  │  │  │  ├─ L5: eq, neq, gt, lt, contains, regex
│  │  │  │  │  └─ L6: n8n Only Run If
│  │  │  │  └─ L5: jsonpath (v2)
│  │  │  │     └─ L6: Hookdeck Filters
│  │  │  └─ L4: and/or/not
│  │  │     └─ L5: boolean logic
│  │  └─ L3: action (service call)
│  │     ├─ L4: notify, http, llm, gateway, dashboard
│  │     └─ L4: async queue
│  │        └─ L5: Slack mandate
│  ├─ L2: n8n workflow
│  │  ├─ L3: webhook node → nodes
│  │  │  └─ L4: Only Run If expression
│  │  └─ L3: visual DAG
│  │     └─ L4: drag-drop
│  └─ L2: Node-RED
│     ├─ L3: Switch node (rules)
│     │  └─ L4: route to branches
│     └─ L3: Function node (code)
│        └─ L4: escape hatch
├─ L1: rule storage
│  ├─ L2: JSON in settingsRepo
│  │  ├─ L3: webhookRules array
│  │  │  ├─ L4: {id, name, enabled, trigger, condition, actions}
│  │  │  │  └─ L5: PATCH /api/settings
│  │  │  └─ L4: DEFAULT_SETTINGS key
│  │  │     └─ L5: webhookRules: []
│  │  └─ L3: versioned (v2)
│  │     └─ L4: migration
│  ├─ L2: vs database
│  │  ├─ L3: settings = config, not data
│  │  │  └─ L4: rules are config
│  │  └─ L3: DB for events (R09)
│  │     └─ L4: separation
│  └─ L2: import/export
│     ├─ L3: YAML/JSON file
│     │  └─ L4: dashboard
│     └─ L3: shareable
│        └─ L4: community rules
├─ L1: evaluation
│  ├─ L2: event-driven
│  │  ├─ L3: worker picks event
│  │  │  └─ L4: R10
│  │  ├─ L3: match all rules
│  │  │  ├─ L4: ordered (priority)
│  │  │  │  └─ L5: first-match or all-match
│  │  │  └─ L4: parallel eval
│  │  │     └─ L5: independent
│  │  └─ L3: short-circuit
│  │     └─ L4: condition false → skip
│  ├─ L2: condition engine
│  │  ├─ L3: field/op/value
│  │  │  ├─ L4: dot-path into payload
│  │  │  │  ├─ L5: provider, model, error_count
│  │  │  │  └─ L5: nested: body.message.content
│  │  │  └─ L4: type coercion
│  │  │     └─ L5: string/number/bool
│  │  ├─ L3: jsonpath (v2)
│  │  │  └─ L4: complex queries
│  │  └─ L3: template (v2)
│  │     └─ L4: Jinja2 (HA)
│  └─ L2: performance
│     ├─ L3: index rules by trigger
│     │  └─ L4: O(1) lookup
│     └─ L3: compile conditions
│        └─ L4: JIT (v2)
└─ L1: rule lifecycle
   ├─ L2: create (dashboard)
   │  ├─ L3: form → JSON
   │  │  └─ L4: validation
   │  └─ L3: test against sample
   │     └─ L4: dry-run
   ├─ L2: edit
   │  ├─ L3: version history
   │  └─ L3: rollback
   ├─ L2: disable/enable
   │  └─ L3: toggle
   └─ L2: delete
      └─ L3: soft (archive)
```

## R13 — Rule matching (field/op/value)

```
L0 R13: RULE MATCHING (FIELD/OP/VALUE)
├─ L1: operators
│  ├─ L2: equality
│  │  ├─ L3: eq (===)
│  │  │  └─ L4: string/number/bool
│  │  └─ L3: neq (!==)
│  ├─ L2: comparison
│  │  ├─ L3: gt, gte, lt, lte
│  │  │  └─ L4: numbers only
│  │  └─ L3: between
│  │     └─ L4: [min, max]
│  ├─ L2: string
│  │  ├─ L3: contains
│  │  │  ├─ L4: case-insensitive
│  │  │  └─ L4: substring
│  │  ├─ L3: startsWith / endsWith
│  │  ├─ L3: regex
│  │  │  ├─ L4: RE2 (safe)
│  │  │  │  └─ L5: no catastrophic backtrack
│  │  │  └─ L4: flags (i, m)
│  │  └─ L3: glob
│  │     └─ L4: * ? [range]
│  ├─ L2: existence
│  │  ├─ L3: exists
│  │  │  └─ L4: field present
│  │  └─ L3: notExists
│  │     └─ L4: field absent
│  └─ L2: array
│     ├─ L3: in / notIn
│     │  └─ L4: value in array
│     └─ L3: containsAll / containsAny
│        └─ L4: array overlap
├─ L1: field paths
│  ├─ L2: dot notation
│  │  ├─ L3: provider
│  │  ├─ L3: model
│  │  ├─ L3: error_count
│  │  ├─ L3: body.message.content
│  │  └─ L3: headers.x-slack-retry-num
│  ├─ L2: array index
│  │  ├─ L3: choices[0].message.content
│  │  └─ L3: negative index
│  └─ L2: wildcard (v2)
│     ├─ L3: choices[*].message.role
│     └─ L3: **.content
├─ L1: compound conditions
│  ├─ L2: and (all true)
│  │  └─ L3: short-circuit
│  ├─ L2: or (any true)
│  │  └─ L3: short-circuit
│  ├─ L2: not (negate)
│  │  └─ L3: single child
│  └─ L2: grouping
│     └─ L3: (A and B) or C
├─ L1: evaluation order
│  ├─ L2: rule priority
│  │  ├─ L3: explicit priority field
│  │  │  └─ L4: lower = first
│  │  └─ L3: creation order fallback
│  └─ L2: first-match vs all-match
│     ├─ L3: first-match (HA)
│     │  └─ L4: stop on first
│     └─ L3: all-match (n8n)
│        └─ L4: run all matching
└─ L1: testing
   ├─ L2: sample events
   │  ├─ L3: from usageDb
   │  └─ L3: manual JSON
   ├─ L2: dry-run
   │  ├─ L3: show matched rules
   │  └─ L3: show actions that would fire
   └─ L2: unit tests
      └─ L3: condition engine
```

## R14 — Actions (notify/http/llm/gateway/dashboard)

```
L0 R14: ACTIONS (NOTIFY/HTTP/LLM/GATEWAY/DASHBOARD)
├─ L1: notify (Apprise-style)
│  ├─ L2: URL schemes
│  │  ├─ L3: slack://webhook-url
│  │  │  └─ L4: R15
│  │  ├─ L3: discord://id/token
│  │  │  └─ L4: R16
│  │  ├─ L3: tgram://bottoken/chatid
│  │  │  └─ L4: R17
│  │  ├─ L3: ntfy://topic
│  │  │  └─ L4: R18
│  │  ├─ L3: gotify://host/apptoken
│  │  │  └─ L4: R19
│  │  └─ L3: apprise://... (v2)
│  │     └─ L4: 100+ services
│  ├─ L2: templating
│  │  ├─ L3: {{event.payload.field}}
│  │  │  └─ L4: dot-path
│  │  ├─ L3: {{event.received_at}}
│  │  ├─ L3: {{rule.name}}
│  │  └─ L3: conditional blocks
│  │     └─ L4: {{#if condition}}...{{/if}}
│  ├─ L2: batching (Alertmanager)
│  │  ├─ L3: group by fingerprint
│  │  │  ├─ L4: provider+model+error
│  │  │  └─ L4: dedupe window
│  │  ├─ L3: min-interval
│  │  │  └─ L4: 5min default
│  │  └─ L3: silence window
│  │     └─ L4: maintenance
│  └─ L2: delivery
│     ├─ L3: async (worker)
│     │  └─ L4: R10
│     └─ L3: retry (R16)
├─ L1: http (outbound webhook)
│  ├─ L2: method + URL + headers + body
│  │  ├─ L3: POST default
│  │  ├─ L3: JSON body
│  │  │  └─ L4: template
│  │  ├─ L3: custom headers
│  │  │  └─ L4: Authorization, X-Event-ID
│  │  └─ L3: timeout
│  │     └─ L4: 10s
│  ├─ L2: idempotency
│  │  ├─ L3: event_id in body
│  │  │  └─ L4: receiver dedupes
│  │  └─ L3: Idempotency-Key header
│  │     └─ L4: Stripe
│  ├─ L2: response handling
│  │  ├─ L3: 2xx = success
│  │  ├─ L3: 4xx = no retry
│  │  └─ L3: 5xx = retry
│  └─ L2: auth
│     ├─ L3: Bearer token
│     ├─ L3: API key header
│     └─ L3: Basic auth
├─ L1: llm (analyze-error reuse)
│  ├─ L2: pipeline
│  │  ├─ L3: credentials → handleChatCore
│  │  │  └─ L4: src/app/api/analyze-error/route.js
│  │  ├─ L3: model from settings
│  │  │  └─ L4: analyzeErrorModel
│  │  └─ L3: prompt template
│  │     ├─ L4: system + user
│  │     │  └─ L5: event payload injected
│  │     └─ L4: configurable
│  ├─ L2: output
│  │  ├─ L3: send as notify
│  │  │  └─ L4: Slack thread (Slack reacji→LLM)
│  │  ├─ L3: store in event
│  │  │  └─ L4: for audit
│  │  └─ L3: http callback
│  │     └─ L4: webhook with result
│  ├─ L2: cost control
│  │  ├─ L3: max tokens
│  │  │  └─ L4: 4096 default
│  │  ├─ L3: budget per rule
│  │  │  └─ L4: daily cap
│  │  └─ L3: cache by event_id
│  │     └─ L4: R11
│  └─ L2: Slack reacji→LLM pattern
│     ├─ L3: reaction_added → fetch msg → LLM → reply
│     │  └─ L4: Slack docs
│     └─ L3: 9router: event → LLM → notify
│        └─ L4: same shape
├─ L1: gateway (toggle provider/fallback)
│  ├─ L2: actions
│  │  ├─ L3: disable provider
│  │  │  └─ L4: settings.providerEnabled[provider]=false
│  │  ├─ L3: enable provider
│  │  ├─ L3: add to fallback
│  │  │  └─ L4: settings.modelFallbacks
│  │  └─ L3: remove from fallback
│  ├─ L2: idempotent
│  │  ├─ L3: set state, not flip
│  │  │  └─ L4: check current first
│  │  └─ L3: no-op if already
│  ├─ L2: One API ENABLE_METRIC
│  │  ├─ L3: auto-disable on error rate
│  │  │  └─ L4: threshold 0.8
│  │  └─ L3: 9router: rule does same
│  │     └─ L4: condition: error_rate > 0.8
│  └─ L2: audit
│     ├─ L3: log every toggle
│     │  └─ L4: usageDb
│     └─ L3: notify on change
│        └─ L4: chain notify
├─ L1: dashboard (SSE feed)
│  ├─ L2: event stream
│  │  ├─ L3: /api/webhooks/events (SSE)
│  │  │  └─ L4: existing SSE infra
│  │  ├─ L3: filter by endpoint
│  │  └─ L3: filter by status
│  ├─ L2: real-time UI
│  │  ├─ L3: event log table
│  │  ├─ L3: rule match highlight
│  │  └─ L3: action result
│  └─ L2: history
│     ├─ L3: last 100 events
│     └─ L3: search
```

## L6 Leaf Summary

| Leaf | Finding | Precedent |
|------|---------|-----------|
| R12-L6-1 | TCA model: trigger→condition→action (Home Assistant) | Home Assistant |
| R12-L6-2 | Rules as JSON in settingsRepo, PATCH-able | n8n/Node-RED, 9router settings |
| R12-L6-3 | Event-driven eval in worker (R10) | Outbox pattern |
| R12-L6-4 | Rule priority + first-match or all-match | HA / n8n |
| R13-L6-1 | Operators: eq/neq/gt/lt/contains/regex/in/exists | n8n Only Run If |
| R13-L6-2 | Dot-path field access (body.message.content) | JSONPath |
| R13-L6-3 | Compound: and/or/not with short-circuit | Boolean logic |
| R13-L6-4 | Test/dry-run against sample events | n8n test workflow |
| R14-L6-1 | notify: Apprise-style URLs, templating, Alertmanager batching | Apprise, Alertmanager |
| R14-L6-2 | http: method/URL/headers/body, Idempotency-Key, retry | Stripe, Pipedream |
| R14-L6-3 | llm: reuse analyze-error pipeline, Slack reacji→LLM pattern | 9router analyze-error, Slack |
| R14-L6-4 | gateway: set state not flip, One API ENABLE_METRIC parity | One API |
| R14-L6-5 | dashboard: SSE feed, real-time UI, history | 9router SSE infra |

## Related Docs

- Master map: `2026-09-15-webhook-exponential-master-map.md` (R12–R14)
- Prior 2-way spine: `2026-09-15-webhook-branch-a2b-rule-engine.md`
- Flat research: `2026-09-15-webhook-receive-act-research.md` (Part 4 M3, Part 5 D7–D10, Part 2 B1–B7)
- Plan: `../planning/2026-09-15-webhook-receive-act-plan.md` (M3)