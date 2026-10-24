# Webhook Implementation Plan — n8n-Style Workflow Engine (R37)

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (code ready for agent review)
**Tags:** #plan #webhook #implementation #code #r37 #n8n #workflow

---

## ⚠️ AGENT REVIEW NOTE (READ FIRST)

> **⚠️ THIS PLAN IS A RESEARCH DOCUMENT — NOT AN IMPLEMENTATION INSTRUCTION.**
>
> **The code in this plan is a SUGGESTION / OPTION for future agents — it is NOT a final decision and NOT an instruction to implement anything.**
>
> Every agent that reads this plan MUST understand:
> - This plan documents **research-grade suggestions** for how a feature *could* be implemented
> - The code snippets show **possible approaches** (file paths, function signatures, patterns) — they are **options**, not requirements
> - **Nothing in this plan should be implemented automatically** — a future agent must evaluate each suggestion, decide if there's a better way, and only then proceed
> - The agent is the final arbiter: if a better approach exists, **make those changes happen** — update the code, note the improvement, and proceed
> - Do not treat this code as sacred. It follows 9router's existing conventions, but the agent decides what to use.

---

## Objective

Implement an n8n-style workflow engine (R37): multi-step workflows with nodes (trigger → transform → action), instead of the single-step TCA rules. This is the power-user path — TCA rules (M3) stay for simple cases; workflows handle branching, transforms, and multi-action sequences.

## Scope

**In scope:**
- Workflow JSON: `{id, name, nodes: [{id, type, config}], connections: [{from, to}]}`
- Node types: trigger, transform (JSON-path/map), condition (branch), action (notify/http/llm)
- Executor: topological order, per-node input/output, branch skipping
- Workflow trigger: same event types as rules

**Out of scope (v1):**
- Visual node editor (n8n canvas) — JSON workflows only
- Loops/retries within workflows (v2)

## Rationale & Design Decisions

**Purpose:** Let users define multi-step automation workflows (trigger → transform → condition → action) in a n8n-style DAG, for logic beyond single rules.

**Research grounding:** R37 (exp-10 patterns/platforms) — see Related Docs below for the exact experiment documents this plan derives from.

**Key design decisions:**
- **DAG executor** — nodes with explicit connections; topological execution with cycle detection.
- **Node types** — trigger/transform/condition/action cover the observed workflow shapes; each node is a small registered function.
- **JSON workflow definition** — workflows are data (settings-backed), not code, so they're editable and versionable.

**Trade-offs & risks:** Trade-off: a DAG engine is more complex than linear rules (M3); it's justified only when branching/merging is a real need. Linear steps (Pipedream plan R39) are the simpler alternative.

---
## Grounding in 9router

**Auth registration:** `/api/webhooks/workflows` → **`PROTECTED_API_PATHS`**

Workflow CRUD is dashboard surface; overlaps M3 rules — pick one as the engine.

**Conventions this plan must follow:**
- Import `getSettings`/`updateSettings` from `@/lib/localDb` in route handlers (matches `src/app/api/settings/route.js`)
- Start workers from `src/instrumentation.js` (settings-gated, `NEXT_RUNTIME === "nodejs"`) — layout chunks tree-shake in standalone builds
- New migrations start at **006** (`src/lib/db/migrations/` currently ends at `005-seen-models.js`)
- Keep `export const dynamic = "force-dynamic"` on every route
- Strip secrets from request bodies and never return them in GET responses (CWE-915 pattern from `src/app/api/settings/route.js`)
- Reuse `src/shared/hookTemplate.js` for `{{field}}` expansion — it already exists

See `2026-10-03-webhook-grounding-in-9router.md` for the full discrepancy list.

---

## Files

| File | Action | Purpose |
|------|--------|---------|
| `src/lib/webhooks/workflows.js` | new | Workflow executor |
| `src/lib/webhooks/workflows/nodes.js` | new | Node type implementations |
| `src/lib/db/repos/settingsRepo.js` | edit | `webhookWorkflows: []` default |

## Code

### 1. `src/lib/webhooks/workflows.js`

```js
// src/lib/webhooks/workflows.js
// n8n-style workflow executor: nodes + connections, topological execution.
import { getSettings } from "@/lib/db/repos/settingsRepo.js";
import { runNode } from "./workflows/nodes.js";

/**
 * Execute a workflow against an event.
 * @param {object} workflow - {id, name, nodes, connections}
 * @param {{type: string, data: object}} event
 * @returns {Promise<{nodeId: string, output: any}[]>}
 */
export async function executeWorkflow(workflow, event) {
  const outputs = new Map(); // nodeId -> output
  const results = [];

  // Simple topological execution: iterate until no progress (DAG assumed)
  const pending = new Set(workflow.nodes.map((n) => n.id));
  let progressed = true;
  while (pending.size && progressed) {
    progressed = false;
    for (const node of workflow.nodes) {
      if (!pending.has(node.id)) continue;
      const deps = workflow.connections.filter((c) => c.to === node.id).map((c) => c.from);
      if (deps.every((d) => outputs.has(d))) {
        const input = deps.length
          ? deps.map((d) => outputs.get(d)).flat()
          : [event.data];
        const output = await runNode(node, input, event);
        outputs.set(node.id, output);
        results.push({ nodeId: node.id, output });
        pending.delete(node.id);
        progressed = true;
      }
    }
  }
  return results;
}

/**
 * Dispatch an event through all enabled workflows.
 * @param {{type: string, data: object}} event
 */
export async function dispatchWorkflows(event) {
  const settings = await getSettings();
  const workflows = settings.webhookWorkflows || [];
  const results = [];
  for (const wf of workflows) {
    if (!wf.enabled) continue;
    const trigger = wf.nodes.find((n) => n.type === "trigger");
    if (trigger && trigger.config.event && trigger.config.event !== event.type) continue;
    try {
      results.push({ workflowId: wf.id, results: await executeWorkflow(wf, event) });
    } catch (err) {
      results.push({ workflowId: wf.id, error: err?.message || String(err) });
    }
  }
  return results;
}
```

### 2. `src/lib/webhooks/workflows/nodes.js`

```js
// src/lib/webhooks/workflows/nodes.js
// Node type implementations.
import { runNotifyAction } from "../actions/notify.js";
import { runHttpAction } from "../actions/http.js";
import { runLlmAction } from "../actions/llm.js";

/**
 * Run a single workflow node.
 * @param {object} node - {id, type, config}
 * @param {Array} input - inputs from connected nodes
 * @param {{type: string, data: object}} event
 */
export async function runNode(node, input, event) {
  switch (node.type) {
    case "trigger":
      return [event.data];
    case "transform": {
      // config.map: {field: "json.path", to: "outputKey"}
      const out = {};
      for (const [key, path] of Object.entries(node.config.map || {})) {
        out[key] = getPath(input[0], path);
      }
      return [out];
    }
    case "condition": {
      // config: {field, op, value} — returns input if true, [] if false (branch skip)
      const val = getPath(input[0], node.config.field);
      const pass = compare(val, node.config.op, node.config.value);
      return pass ? input : [];
    }
    case "action":
      return [await runActionNode(node.config, event)];
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

async function runActionNode(config, event) {
  switch (config.type) {
    case "notify": return runNotifyAction(config, event);
    case "http": return runHttpAction(config, event);
    case "llm": return runLlmAction(config, event);
    default: return { ok: false, error: `unknown action: ${config.type}` };
  }
}
```

### 3. `src/lib/db/repos/settingsRepo.js` — default

```js
// In DEFAULT_SETTINGS:
  // n8n-style workflows: [{id, name, enabled, nodes, connections}]
  webhookWorkflows: [],
```

## Acceptance Criteria

- [ ] Workflow JSON executes in dependency order (DAG)
- [ ] Node types: trigger/transform/condition/action
- [ ] Condition branch skips downstream nodes (empty output)
- [ ] Same event types as TCA rules trigger workflows

## Testing

```bash
# Unit test (tests/unit/webhook-workflows.test.js)
# - linear chain: trigger → transform → action
# - branch: condition false → downstream skipped
# - unknown node type → error result, not throw
```

## Related Docs

- Research: `../research/2026-09-15-webhook-exp-10-patterns-platforms.md` (R37)
- Plan: `../planning/2026-09-15-webhook-m3-rule-engine-actions-plan.md` (TCA rules)
- Interpretation: `../interpretation/2026-09-15-webhook-interpretation-guide.md`