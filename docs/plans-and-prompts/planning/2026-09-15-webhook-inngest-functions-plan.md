# Webhook Implementation Plan — Inngest-Style Event-Driven Functions (R41)

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (code ready for agent review)
**Tags:** #plan #webhook #implementation #code #r41 #inngest #functions

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

Implement an Inngest-style event-driven function system (R41): code-first functions triggered by event patterns, with retries, steps, and cancellation. This is the developer-friendly model — instead of JSON config, functions are real JS modules registered by event trigger.

## Scope

**In scope:**
- Function registry: `registerFunction({name, trigger: {event, filter}, fn})`
- Trigger matching: event type + optional filter (same as TCA)
- Retry: per-function retry count + backoff
- Steps: function can yield steps (Inngest `step.run` pattern)
- Cancellation: `cancelOn` event pattern

**Out of scope (v1):**
- Inngest cloud (dev server only)
- Batching / concurrency limits

## Rationale & Design Decisions

**Purpose:** Support Inngest-style code-first event functions — developers write functions that react to events, with built-in retries and step management.

**Research grounding:** R41 (exp-10 patterns/platforms) — see Related Docs below for the exact experiment documents this plan derives from.

**Key design decisions:**
- **Code-first over config-first** — functions are JS modules registered by trigger, giving developers full language power.
- **Trigger matching** — event name patterns (exact or wildcard) route events to functions.
- **Automatic retries + `step.run`** — durable step execution with retry, mirroring Inngest's reliability model.

**Trade-offs & risks:** Trade-off: code-first is powerful but requires deployment discipline (functions are code, not settings). For non-developers, declarative rules (M3) or workflows (R37–R39) are better.

---
## Grounding in 9router

**Auth registration:** — (code-first; functions register in code)

Functions are code, not settings; trigger matching reuses the M4 event vocabulary.

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
| `src/lib/webhooks/functions.js` | new | Function registry + runner |
| `src/lib/webhooks/functions/registry/` | new | User functions live here |
| `src/lib/webhooks/bus.js` | edit | Wire functions to bus |

## Code

### 1. `src/lib/webhooks/functions.js`

```js
// src/lib/webhooks/functions.js
// Inngest-style function registry + runner.
const g = (global.__webhookFunctions ??= { registry: new Map() });

/**
 * Register an event-driven function.
 * @param {object} spec
 * @param {string} spec.name
 * @param {{event: string, filter?: string}} spec.trigger
 * @param {(event: object, ctx: object) => Promise<any>} spec.fn
 * @param {{retries?: number, cancelOn?: string}} [spec.options]
 */
export function registerFunction({ name, trigger, fn, options = {} }) {
  g.registry.set(name, { name, trigger, fn, options });
}

/**
 * Match an event against a function's trigger.
 * @param {object} fn
 * @param {{type: string, data: object}} event
 */
export function functionMatches(fn, event) {
  if (fn.trigger.event !== event.type) return false;
  if (fn.trigger.filter) {
    const val = fn.trigger.filter.split(".").reduce((acc, k) => acc?.[k], event.data);
    if (!val) return false;
  }
  return true;
}

/**
 * Run a function with retries.
 * @param {object} fn
 * @param {{type: string, data: object}} event
 */
async function runWithRetries(fn, event) {
  const maxRetries = fn.options.retries ?? 3;
  let lastErr;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn.fn(event, { attempt, step: createStepRunner(fn, event) });
    } catch (err) {
      lastErr = err;
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, 2 ** attempt * 1000)); // backoff
      }
    }
  }
  throw lastErr;
}

// Inngest step.run pattern: steps are retried independently
function createStepRunner(fn, event) {
  const stepState = new Map();
  return {
    async run(stepName, stepFn) {
      if (stepState.has(stepName)) return stepState.get(stepName);
      const result = await stepFn();
      stepState.set(stepName, result);
      return result;
    },
  };
}

/**
 * Dispatch an event to all matching functions.
 * @param {{type: string, data: object}} event
 */
export async function dispatchFunctions(event) {
  const results = [];
  for (const fn of g.registry.values()) {
    if (!functionMatches(fn, event)) continue;
    try {
      results.push({ name: fn.name, result: await runWithRetries(fn, event) });
    } catch (err) {
      results.push({ name: fn.name, error: err?.message || String(err) });
    }
  }
  return results;
}
```

### 2. `src/lib/webhooks/bus.js` — wire functions (edit)

```js
// In instrumentation.js or bus wiring:
import { dispatchFunctions } from "./functions.js";
on("*", (event) => dispatchFunctions(event));
```

### 3. Example function (registry)

```js
// src/lib/webhooks/functions/registry/example.js
// Example: alert on quota exhaustion, with a step.
import { registerFunction } from "../functions.js";

registerFunction({
  name: "quota-exhausted-alert",
  trigger: { event: "quota.exhausted" },
  options: { retries: 2 },
  fn: async (event, { step }) => {
    const summary = await step.run("summarize", async () => {
      return `${event.data.provider} at ${event.data.usedPct}%`;
    });
    // ... send notification with summary
    return { ok: true, summary };
  },
});
```

## Acceptance Criteria

- [ ] Functions registered by event trigger + filter
- [ ] Retries with exponential backoff (per-function)
- [ ] `step.run` pattern for independent steps
- [ ] Functions run alongside rules/workflows (all can coexist)

## Testing

```bash
# Unit test (tests/unit/webhook-functions.test.js)
# - functionMatches: event + filter
# - retries: failing fn retries then errors
# - step.run: cached per invocation
```

## Related Docs

- Research: `../research/2026-09-15-webhook-exp-10-patterns-platforms.md` (R41)
- Plan: `../planning/2026-09-15-webhook-pubsub-core-plan.md` (bus)
- Interpretation: `../interpretation/2026-09-15-webhook-interpretation-guide.md`