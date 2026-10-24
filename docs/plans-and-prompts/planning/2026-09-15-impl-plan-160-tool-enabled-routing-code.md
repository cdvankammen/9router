# Implementation Plan 160 — Tool-Enabled Routing & Tool Fallback — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #tools #function-calling #routing #fallback #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (tool routing from plan 80; message-driven tools from plan 15; capability matching from plan 104 (`src/lib/capabilities/`); per-step routing from plan 159 (`src/lib/steps/`); request parsing in `src/sse/handlers/chat.js`).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — tool registry; tool-aware routing; fallback.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-160-tool-enabled-routing.md`, `../research/9router/impl-plan-80-tool-routing.md`, `../research/9router/impl-plan-104-capability-matching.md`.

## Scope

**In scope:** tool capability model (registry, function-call support, compatibility); tool-aware routing (detection, routing, priority); tool fallback (failure detection, fallback, degradation); integration.
**Out of scope:** per-step routing (plan 159); message-driven tools protocol (plan 15).

## Milestones

### M1 — Tool capability model

**Reference code (`src/lib/tools/registry.js`):**

```js
// Tool registry: supported tools per model.
export function makeToolRegistry() {
  const support = new Map(); // modelId -> Set(toolNames)
  return {
    register(modelId, tools) { support.set(modelId, new Set(tools)); },
    supports(modelId, toolName) { return support.get(modelId)?.has(toolName) ?? false; },
    // Function-call support: does the model support tools at all?
    functionCalling(modelId) { return (support.get(modelId)?.size ?? 0) > 0; },
    // Compatibility: models supporting ALL required tools.
    compatible({ required = [], candidates = [] } = {}) {
      return candidates.filter((m) => required.every((t) => this.supports(m, t)));
    },
    all() { return Object.fromEntries([...support.entries()].map(([k, v]) => [k, [...v]])); },
  };
}

// Tool capability: function-call support flag.
export function toolCapability({ functionCalling = false, tools = [] } = {}) {
  return { functionCalling, tools };
}
```

**Acceptance criteria:** registry; compatibility; capability.

### M2 — Tool-aware routing

**Reference code (`src/lib/tools/detect.js`):**

```js
// Tool detection: tools in request.
export function detectTools({ messages = [], tools = [] } = {}) {
  const requested = new Set(tools.map((t) => t.name ?? t.function?.name).filter(Boolean));
  // Tool calls in history.
  for (const m of messages) {
    if (m.tool_calls) for (const tc of m.tool_calls) requested.add(tc.function?.name);
  }
  return [...requested];
}

// Tool priority: tool support priority in selection.
export function toolPriority({ required = [], candidates = [], registry } = {}) {
  return candidates
    .map((m) => ({ model: m, score: required.filter((t) => registry.supports(m, t)).length }))
    .sort((a, b) => b.score - a.score);
}

// Tool-aware selection: prefer models with full tool support.
export function selectToolAware({ required = [], candidates = [], registry, general = [] } = {}) {
  if (!required.length) return { models: candidates, source: "no-tools" };
  const compatible = registry.compatible({ required, candidates });
  if (compatible.length) return { models: compatible, source: "tool-capable" };
  return { models: general.filter((m) => candidates.includes(m)), source: "general-fallback" };
}
```

**Acceptance criteria:** detection; priority; selection.

### M3 — Tool fallback

**Reference code (`src/lib/tools/fallback.js`):**

```js
// Tool failure: detect tool failures.
export function detectToolFailure({ error = null, toolName = null } = {}) {
  const msg = error?.message ?? "";
  return {
    failed: Boolean(toolName) || /tool|function call/i.test(msg),
    toolName,
    reason: msg.slice(0, 200),
  };
}

// Tool fallback: fallback to capable model.
export function fallbackForTool({ registry, failedModel, required = [], candidates = [] } = {}) {
  const rest = candidates.filter((m) => m !== failedModel);
  const compatible = registry.compatible({ required, candidates: rest });
  return compatible[0] ?? null;
}

// Degradation: strip tools and retry on general model.
export function degradeRequest({ messages = [], tools = [] } = {}) {
  return { messages, tools: [], degraded: tools.length > 0 };
}
```

**Acceptance criteria:** failure detection; fallback; degradation.

### M4 — Integration + tests

**Reference code (`src/lib/tools/integrate.js`):**

```js
// Routing integration: tool-aware selection.
export function routeWithTools({ messages = [], tools = [], registry, candidates = [], general = [] } = {}) {
  const required = detectTools({ messages, tools });
  return selectToolAware({ required, candidates, registry, general });
}

// Observability: tool metrics.
export function makeToolTelemetry() {
  const events = [];
  return {
    record(e) { events.push({ ...e, at: Date.now() }); },
    report() {
      return {
        toolRequests: events.filter((e) => e.tools > 0).length,
        fallbacks: events.filter((e) => e.fallback).length,
        failures: events.filter((e) => e.failure).length,
      };
    },
  };
}

// Fail-open.
export function safeTool(fn, fallback = null) {
  try { return fn(); } catch { return fallback; }
}
```

**Files touched:** `src/lib/tools/` (new: registry, detect, fallback, integrate), `open-sse/handlers/chatCore.js` (integration), dashboard tools page (new), `tests/unit/tools.test.js` (new).

**Acceptance criteria:** integration; telemetry; tests.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Tool failures | Broken calls | Fallback |
| Capability gaps | No capable model | Registry |
| Cost | Expensive tool models | Tool-aware budgets |
| Complexity | Confusion | Simple defaults |

## Verification

- Unit: makeToolRegistry, toolCapability, detectTools, toolPriority, selectToolAware, detectToolFailure, fallbackForTool, degradeRequest, routeWithTools
- Manual: tool request → tool-capable model; failure → fallback
- Regression: `tests/__baseline__/verify-no-regression.mjs`