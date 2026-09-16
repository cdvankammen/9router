# Webhook Implementation Plan — Pipedream-Style Step Runner (R39)

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (code ready for agent review)
**Tags:** #plan #webhook #implementation #code #r39 #pipedream #steps

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

Implement a Pipedream-style step runner (R39): linear sequences of steps where each step's output is available to later steps via `steps.<name>`. This is the simplest automation model — no wires, no branches, just ordered steps with shared state.

## Scope

**In scope:**
- Workflow JSON: `{id, name, steps: [{name, type, config}]}`
- Step types: transform, notify, http, llm, delay
- Shared state: `steps.<name>.output` accessible to later steps
- `$` context object (like Pipedream's `$`): `$.event`, `$.steps`, `$.return`

**Out of scope (v1):**
- Parallel steps / branches (linear only)
- Retry per step (v2)

## Files

| File | Action | Purpose |
|------|--------|---------|
| `src/lib/webhooks/steps.js` | new | Step runner |
| `src/lib/db/repos/settingsRepo.js` | edit | `webhookStepRuns: []` default |

## Code

### 1. `src/lib/webhooks/steps.js`

```js
// src/lib/webhooks/steps.js
// Pipedream-style step runner: linear steps, shared state via steps.<name>.
import { getSettings } from "@/lib/db/repos/settingsRepo.js";
import { runNotifyAction } from "./actions/notify.js";
import { runHttpAction } from "./actions/http.js";
import { runLlmAction } from "./actions/llm.js";

const STEP_HANDLERS = {
  transform: runTransformStep,
  notify: runNotifyAction,
  http: runHttpAction,
  llm: runLlmAction,
  delay: runDelayStep,
};

/**
 * Run a step-based workflow.
 * @param {object} workflow - {id, name, steps: [{name, type, config}]}
 * @param {{type: string, data: object}} event
 */
export async function runSteps(workflow, event) {
  const $ = {
    event,
    steps: {},
    return: null,
  };

  for (const step of workflow.steps) {
    const handler = STEP_HANDLERS[step.type];
    if (!handler) {
      $.steps[step.name] = { ok: false, error: `unknown step type: ${step.type}` };
      continue;
    }
    try {
      const output = await handler(step.config, $);
      $.steps[step.name] = output;
      if (step.config?.returnValue) $.return = output;
    } catch (err) {
      $.steps[step.name] = { ok: false, error: err?.message || String(err) };
    }
  }
  return $.steps;
}

/**
 * Dispatch an event through all enabled step workflows.
 * @param {{type: string, data: object}} event
 */
export async function dispatchStepRuns(event) {
  const settings = await getSettings();
  const workflows = settings.webhookStepRuns || [];
  const results = [];
  for (const wf of workflows) {
    if (!wf.enabled) continue;
    if (wf.triggerEvent && wf.triggerEvent !== event.type) continue;
    try {
      results.push({ workflowId: wf.id, steps: await runSteps(wf, event) });
    } catch (err) {
      results.push({ workflowId: wf.id, error: err?.message || String(err) });
    }
  }
  return results;
}

// --- step implementations ---

function runTransformStep(config, $) {
  // config.map: {outputKey: "steps.prev.output.field" | "event.data.field"}
  const out = {};
  for (const [key, path] of Object.entries(config.map || {})) {
    out[key] = resolvePath($, path);
  }
  return out;
}

function resolvePath($, path) {
  // Supports "event.data.x" and "steps.<name>.output.x"
  const parts = path.split(".");
  if (parts[0] === "event") return getPath($.event, parts.slice(1));
  if (parts[0] === "steps") {
    const stepName = parts[1];
    return getPath($.steps[stepName], parts.slice(2));
  }
  return getPath($, parts);
}

function getPath(obj, parts) {
  return parts.reduce((acc, key) => (acc == null ? acc : acc[key]), obj);
}

function runDelayStep(config) {
  const ms = config.ms || 1000;
  return new Promise((resolve) => setTimeout(() => resolve({ delayed: ms }), ms));
}
```

### 2. `src/lib/db/repos/settingsRepo.js` — default

```js
// In DEFAULT_SETTINGS:
  // Pipedream-style step workflows: [{id, name, enabled, triggerEvent, steps}]
  webhookStepRuns: [],
```

## Acceptance Criteria

- [ ] Linear steps execute in order with shared `steps.<name>` state
- [ ] Step types: transform/notify/http/llm/delay
- [ ] `$.return` captures the final value
- [ ] Trigger event filter per workflow

## Testing

```bash
# Unit test (tests/unit/webhook-steps.test.js)
# - transform reads event.data and steps.prev output
# - unknown step type → error in steps map, continues
# - delay resolves after ms
```

## Related Docs

- Research: `../research/2026-09-15-webhook-exp-10-patterns-platforms.md` (R39)
- Plan: `../planning/2026-09-15-webhook-n8n-workflows-plan.md` (n8n alternative)
- Interpretation: `../interpretation/2026-09-15-webhook-interpretation-guide.md`