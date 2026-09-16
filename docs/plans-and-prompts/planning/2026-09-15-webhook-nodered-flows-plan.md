# Webhook Implementation Plan — Node-RED-Style Flow Engine (R38)

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (code ready for agent review)
**Tags:** #plan #webhook #implementation #code #r38 #nodered #flow

---

## ⚠️ AGENT REVIEW NOTE (READ FIRST)

> **The code in this plan is a starting point, not a final decision.**
> Every agent that reads this plan MUST review the code below and make a decision:
> is there a better way to implement this? If yes, **make those changes happen** —
> update the code, note the improvement, and proceed. Do not treat this code as
> sacred. It follows 9router's existing conventions, but the agent is the final
> arbiter of implementation quality.

---

## Objective

Implement a Node-RED-style flow engine (R38): message-passing flows where each node receives a `msg` object `{payload, topic, ...}` and passes it on. This is the alternative to the n8n-style workflow (R37) — simpler, message-centric, closer to Node's EventEmitter model.

## Scope

**In scope:**
- Flow JSON: `{id, name, nodes: [{id, type, wires: [targetIds]}]}`
- Node types: inject (trigger), function (JS transform), switch (branch), http-request, notify
- Message object: `{payload, topic, event}`
- Wire-based routing (each node's output goes to `wires` targets)

**Out of scope (v1):**
- Node-RED editor UI
- Subflows / flow control nodes (catch, status)

## Files

| File | Action | Purpose |
|------|--------|---------|
| `src/lib/webhooks/flows.js` | new | Flow executor (message-passing) |
| `src/lib/webhooks/flows/nodes.js` | new | Node implementations |
| `src/lib/db/repos/settingsRepo.js` | edit | `webhookFlows: []` default |

## Code

### 1. `src/lib/webhooks/flows.js`

```js
// src/lib/webhooks/flows.js
// Node-RED-style flow executor: each node gets a msg and wires to targets.
import { getSettings } from "@/lib/db/repos/settingsRepo.js";
import { runFlowNode } from "./flows/nodes.js";

/**
 * Execute a flow against an event.
 * @param {object} flow - {id, name, nodes: [{id, type, wires, config}]}
 * @param {{type: string, data: object}} event
 */
export async function executeFlow(flow, event) {
  const byId = new Map(flow.nodes.map((n) => [n.id, n]));
  const queue = [];
  const results = [];

  // Start: nodes with no incoming wires (inject/trigger nodes)
  const incoming = new Set(flow.nodes.flatMap((n) => n.wires || []));
  for (const node of flow.nodes) {
    if (!incoming.has(node.id)) {
      queue.push({ node, msg: { payload: event.data, topic: event.type, event } });
    }
  }

  // BFS message passing
  while (queue.length) {
    const { node, msg } = queue.shift();
    let outputs;
    try {
      outputs = await runFlowNode(node, msg);
    } catch (err) {
      results.push({ nodeId: node.id, error: err?.message || String(err) });
      continue;
    }
    results.push({ nodeId: node.id, outputs: outputs.length });
    for (const targetId of node.wires || []) {
      const target = byId.get(targetId);
      if (!target) continue;
      for (const out of outputs) {
        queue.push({ node: target, msg: out });
      }
    }
  }
  return results;
}

/**
 * Dispatch an event through all enabled flows.
 * @param {{type: string, data: object}} event
 */
export async function dispatchFlows(event) {
  const settings = await getSettings();
  const flows = settings.webhookFlows || [];
  const results = [];
  for (const flow of flows) {
    if (!flow.enabled) continue;
    try {
      results.push({ flowId: flow.id, results: await executeFlow(flow, event) });
    } catch (err) {
      results.push({ flowId: flow.id, error: err?.message || String(err) });
    }
  }
  return results;
}
```

### 2. `src/lib/webhooks/flows/nodes.js`

```js
// src/lib/webhooks/flows/nodes.js
// Node-RED-style node implementations. Each returns an array of output msgs.
import { runNotifyAction } from "../actions/notify.js";
import { runHttpAction } from "../actions/http.js";

export async function runFlowNode(node, msg) {
  switch (node.type) {
    case "inject":
      // config.event filters which events start the flow
      if (node.config?.event && node.config.event !== msg.topic) return [];
      return [msg];
    case "function": {
      // config.code: JS function body: (msg) => msg | [msg] | null
      const fn = new Function("msg", `"use strict"; return (${node.config.code})(msg);`);
      const out = fn(msg);
      return out == null ? [] : Array.isArray(out) ? out : [out];
    }
    case "switch": {
      // config: {property, cases: [{op, value, wires}]}
      const val = getPath(msg.payload, node.config.property);
      const matched = node.config.cases.find((c) => compare(val, c.op, c.value));
      return matched ? [msg] : [];
    }
    case "http-request":
      return [{ ...msg, payload: await runHttpAction(node.config, msg.event) }];
    case "notify":
      return [{ ...msg, payload: await runNotifyAction(node.config, msg.event) }];
    default:
      throw new Error(`unknown node type: ${node.type}`);
  }
}

function getPath(obj, path) {
  return path.split(".").reduce((acc, key) => (acc == null ? acc : acc[key]), obj);
}

function compare(actual, op, expected) {
  switch (op) {
    case "eq": return actual === expected;
    case "neq": return actual !== expected;
    case "gt": return actual > expected;
    case "lt": return actual < expected;
    case "contains": return String(actual ?? "").includes(String(expected));
    default: return false;
  }
}
```

### 3. `src/lib/db/repos/settingsRepo.js` — default

```js
// In DEFAULT_SETTINGS:
  // Node-RED-style flows: [{id, name, enabled, nodes: [{id, type, wires, config}]}]
  webhookFlows: [],
```

## Acceptance Criteria

- [ ] Flows execute via message passing (BFS over wires)
- [ ] Node types: inject/function/switch/http-request/notify
- [ ] Function nodes run JS transforms (sandboxed — agent review: consider vm module)
- [ ] Same event types as rules trigger flows

## Testing

```bash
# Unit test (tests/unit/webhook-flows.test.js)
# - inject → function → notify chain
# - switch branch: matched case passes, others skipped
# - function returning null stops the flow
```

## Related Docs

- Research: `../research/2026-09-15-webhook-exp-10-patterns-platforms.md` (R38)
- Plan: `../planning/2026-09-15-webhook-n8n-workflows-plan.md` (n8n alternative)
- Interpretation: `../interpretation/2026-09-15-webhook-interpretation-guide.md`