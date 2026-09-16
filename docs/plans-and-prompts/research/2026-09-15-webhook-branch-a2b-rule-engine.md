# Branch Research — A2b: Rule Engine (7-node subtree)

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** active
**Tags:** #research #webhook #rule-engine #tca #actions #automation #binary-tree #branch-a2b

## Objective

Deep-dive the **rule engine** subtree of the webhook master tree (`2026-09-15-webhook-master-research-tree.md`). Covers rule matching (A2b1) and actions (A2b2), down to L6 leaves.

```
A2b RULE ENGINE
├─ A2b1: RULE MATCHING
│  ├─ A2b1L: TCA model (Home Assistant)
│  │  ├─ A2b1LL: trigger→condition→action
│  │  └─ A2b1LR: JSON rules in settingsRepo
│  └─ A2b1R: filter semantics
│     ├─ A2b1RL: field/op/value (n8n Only Run If)
│     └─ A2b1RR: jsonpath (Hookdeck Filters)
└─ A2b2: ACTIONS
   ├─ A2b2L: action types
   │  ├─ A2b2LL: notify / http / llm / gateway / dashboard
   │  └─ A2b2LR: LLM action (analyze-error reuse, Slack reacji→LLM)
   └─ A2b2R: action execution
      ├─ A2b2RL: async queue (Slack "implement a queue" mandate)
      └─ A2b2RR: idempotent actions
```

## Codebase grounding (what exists today)

### `src/lib/db/repos/settingsRepo.js` — rule storage (A2b1LR)

- `DEFAULT_SETTINGS` object holds all config; PATCH via `/api/settings`.
- `webhookRules` would be a new key: an array of rule objects `{trigger, condition, actions}`.
- This matches the existing pattern exactly — rules are JSON config, editable via the settings API, no new storage layer.

### `src/app/api/analyze-error/route.js` — LLM action pipeline (A2b2LR)

- Runs LLM analysis through the internal routing pipeline: credentials → `handleChatCore` from `open-sse/handlers/chatCore.js`, using `settings.analyzeErrorModel`.
- A webhook `llm` action reuses this exact pipeline: webhook payload → prompt → LLM → reply/act.
- **Slack's documented example:** `reaction_added` → fetch message → send to HuggingFace LLM → post answer in thread. Same shape.

### `src/shared/services/quotaAutoPing.js` — event source (A2b1)

- Quota scheduler that warms 5h windows — the natural place to emit quota threshold events (80%/90%/exhausted) into the rule engine.

## External research

### A2b1LL — trigger→condition→action (Home Assistant)

- **Home Assistant:** the canonical TCA model — trigger (webhook/event/mqtt/state/time), condition (Jinja2 templates), action (any HA service).
- **n8n:** webhook node → workflow nodes; "Only Run If" expression on `$json.body`.
- **Node-RED:** Switch node routes by rule to multiple branches.
- **Recommended:** rule JSON `{trigger: {event, filter}, condition: {and: [...]}, actions: [...]}` — the Home Assistant shape, JSON-configurable.

### A2b1LR — JSON rules in settingsRepo

- **Recommended:** `settings.webhookRules = [{id, name, enabled, trigger: {event, filter}, condition: {and: [...]}, actions: [...]}]`.
- PATCH-able via `/api/settings` — same as every other 9router config (modelFallbacks, smartRouter, etc.).
- **n8n** stores workflows as JSON; **Node-RED** stores flows as JSON — both prove JSON rules are the right storage format.

### A2b1RL — field/op/value (n8n Only Run If)

- **n8n:** "Only Run If" — `$json.body.field` compared with operators (equals, not equals, contains, regex, etc.).
- **Recommended:** condition ops: `eq, neq, gt, lt, gte, lte, contains, regex, exists`. Fields are dot-paths into the event payload (`provider`, `error_count`, `model`, etc.).

### A2b1RR — jsonpath (Hookdeck Filters)

- **Hookdeck:** Filters = conditional routing by content (JSONPath expressions).
- **Recommended:** support JSONPath for complex filters (v2); field/op/value covers 90% of cases (v1).

### A2b2LL — action types

- **Recommended (from flat research):** `notify` (Apprise-style URLs), `http` (outbound POST), `llm` (analyze-error reuse), `gateway` (toggle provider/fallback), `dashboard` (SSE feed).
- **One API/new-api:** sandboxed JS task plugins — user-defined logic in response to events (the "anything" escape hatch; v2 for 9router).
- **Inngest:** `inngest.on(name, handler)` — SDK-based action registration (the same idea, embedded).

### A2b2LR — LLM action (analyze-error reuse, Slack reacji→LLM)

- **Slack's documented LLM example:** reaction → fetch message → LLM → reply in thread.
- **9router's analyze-error:** already runs LLM through the routing pipeline with a chosen model.
- **Recommended:** `{type: "llm", model: "...", prompt: "..."}` — the prompt receives the event payload as context; the LLM output can be sent to a notify action or returned to the sender.

### A2b2RL — async queue (Slack mandate)

- **Slack:** "Avoid actually processing and reacting to events within the same process. Implement a queue."
- **Recommended:** actions run in the outbox worker (A2a), never in the route handler. The route only verifies + enqueues + returns 200.

### A2b2RR — idempotent actions

- Actions must be safe to run twice (at-least-once delivery): notify is naturally idempotent-ish (duplicate notification acceptable), http should carry the event_id for the receiver to dedupe, gateway toggles should be idempotent (set state, not flip).
- **Stripe:** dedupe by event ID on the receiver side — the same principle applies to 9router's outbound http actions.

## L6 Leaf Summary

| Leaf | Finding | Precedent |
|------|---------|-----------|
| A2b1LL | `{trigger, condition, actions}` JSON rules | Home Assistant TCA |
| A2b1LR | Rules in settingsRepo DEFAULT_SETTINGS, PATCH-able | n8n/Node-RED JSON flows, 9router settings |
| A2b1RL | field/op/value ops: eq/neq/gt/lt/contains/regex | n8n Only Run If |
| A2b1RR | JSONPath for complex filters (v2) | Hookdeck Filters |
| A2b2LL | notify/http/llm/gateway/dashboard; sandboxed JS later | One API plugins, Inngest |
| A2b2LR | LLM action reuses analyze-error pipeline | Slack reacji→LLM, 9router analyze-error |
| A2b2RL | Actions in worker, never in route | Slack queue mandate |
| A2b2RR | Idempotent actions; event_id in outbound http | Stripe dedupe |

## Related Docs

- Master tree: `2026-09-15-webhook-master-research-tree.md`
- Flat research: `2026-09-15-webhook-receive-act-research.md` (Part 2 B1 Home Assistant, B2 n8n, B3 Node-RED, B4 Pipedream, B7 Inngest, D4 Hookdeck, A2 One API; Part 4 recommended architecture)
- Plan: `../planning/2026-09-15-webhook-receive-act-plan.md` (M3)