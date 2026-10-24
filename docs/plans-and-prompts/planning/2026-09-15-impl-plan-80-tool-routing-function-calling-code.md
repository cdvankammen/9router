# Implementation Plan 80 — Tool Routing & Function-Calling Agentic Gateway — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #tool-routing #function-calling #tool-fallback #stickiness #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (tool param handling in `open-sse/translator/`; capability discovery from plan 63; session state from plan 68; SSE streaming in `open-sse/handlers/chatCore.js`; provider model flags in `open-sse/config/providerModels.js`).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — send a tool-bearing request; confirm tool-capable model chosen; simulate dropped tool call → fallback retry.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-80-tool-routing-function-calling.md`, `../research/9router/impl-plan-63-capability-discovery-negotiation.md`, `../research/9router/impl-plan-68-session-management-persistence.md`.

## Scope

**In scope:** tool-intent classifier (chat/tool-use/code/mixed with toolCount/toolComplexity/hasCodeTools); tool-aware routing (capability matching via `supportsToolCalling` flags, complexity tiers, code-tool specialization, tool-capable fallback chains); tool-call fallback (SSE detection of dropped/malformed calls, retry on tool-capable model); agent stickiness (session affinity, configurable, inactivity timeout); telemetry.
**Out of scope:** tool execution itself (gateway routes, doesn't run tools); tool schema translation across all provider pairs (existing translator scope).

## Milestones

### M1 — Tool-intent classifier

**Reference code (`src/lib/tool-routing/classifier.js`):**

```js
// Classify tool intent from messages + tools. Lightweight, no LLM.
const CODE_TOOL_HINTS = ["file", "edit", "shell", "bash", "terminal", "exec", "write_file", "read_file"];
const COMPLEX_TOOL_HINTS = ["browser", "search", "multi", "plan", "agent"];

export function classifyToolIntent({ messages = [], tools = [] } = {}) {
  const toolNames = tools.map((t) => t.function?.name ?? t.name ?? "").filter(Boolean);
  const lastUser = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
  const text = typeof lastUser === "string" ? lastUser : JSON.stringify(lastUser);

  const hasCodeTools = toolNames.some((n) => CODE_TOOL_HINTS.some((h) => n.toLowerCase().includes(h)));
  const toolComplexity = toolNames.some((n) => COMPLEX_TOOL_HINTS.some((h) => n.toLowerCase().includes(h))) ? "complex" : "simple";
  const codeIntent = /\b(code|debug|refactor|fix|implement|function|script)\b/i.test(text) || hasCodeTools;

  let intent = "chat";
  if (tools.length > 0) intent = codeIntent ? "code" : "tool-use";
  else if (codeIntent) intent = "code";

  return { intent, toolCount: tools.length, toolComplexity, hasCodeTools, toolNames };
}

// Conservative: when unsure, fall back to current behavior (no tool routing).
export function needsToolRouting(classification) {
  return classification.toolCount > 0;
}
```

**Acceptance criteria:** intent classified; code tools detected; conservative fallback.

### M2 — Tool-aware routing

**Reference code (`src/lib/tool-routing/select.js`):**

```js
// Filter candidates to tool-capable models when the request uses tools.
export function toolCapableCandidates(candidates, { supportsToolCalling }) {
  return candidates.filter((c) => supportsToolCalling[c.model] ?? false);
}

// Complexity tier: complex multi-tool → stronger tier.
export function tierFor(classification, { simpleTier = "fast", complexTier = "strong" } = {}) {
  if (classification.toolComplexity === "complex" || classification.toolCount > 3) return complexTier;
  return simpleTier;
}

// Build fallback chain: tool-capable models first, then original candidates.
export function toolFallbackChain(candidates, { supportsToolCalling }) {
  const capable = toolCapableCandidates(candidates, { supportsToolCalling });
  const rest = candidates.filter((c) => !capable.includes(c));
  return capable.length ? [...capable, ...rest] : candidates;
}
```

**Acceptance criteria:** tool-capable filter; tier selection; fallback chain ordering.

### M3 — Tool-call fallback (SSE detection)

**Reference code (`src/lib/tool-routing/detect.js`):**

```js
// Detect dropped/malformed tool calls in a streamed response.
export function analyzeToolCalls({ chunks = [], toolCount = 0 } = {}) {
  const calls = new Map(); // index -> { name, args }
  for (const chunk of chunks) {
    const delta = chunk?.choices?.[0]?.delta;
    const tc = delta?.tool_calls?.[0];
    if (!tc) continue;
    const idx = tc.index ?? 0;
    const cur = calls.get(idx) ?? { name: "", args: "" };
    if (tc.function?.name) cur.name += tc.function.name;
    if (tc.function?.arguments) cur.args += tc.function.arguments;
    calls.set(idx, cur);
  }
  const issues = [];
  for (const [idx, call] of calls) {
    if (!call.name) issues.push({ index: idx, issue: "missing-name" });
    try { JSON.parse(call.args); } catch { issues.push({ index: idx, issue: "malformed-args" }); }
  }
  // Dropped: model promised tool calls but stream ended with none.
  if (toolCount > 0 && calls.size === 0) issues.push({ issue: "dropped-all" });
  return { calls: [...calls.entries()].map(([i, c]) => ({ index: i, ...c })), issues };
}

export function shouldRetry(analysis, { maxIssues = 1 } = {}) {
  return analysis.issues.length > 0 && analysis.issues.length <= maxIssues;
}
```

**Acceptance criteria:** streamed tool calls assembled; malformed/dropped detected; retry decision.

### M4 — Stickiness + integration + tests

**Reference code (`src/lib/tool-routing/sticky.js`):**

```js
// Agent stickiness: same model for the whole agent trajectory.
const sticky = new Map(); // sessionId -> { model, at }
const STICKY_TTL_MS = Number(process.env.TOOL_STICKY_TTL_MS ?? 30 * 60_000);

export function rememberModel(sessionId, model, now = Date.now()) {
  if (!sessionId) return;
  sticky.set(sessionId, { model, at: now });
}
export function stickyModel(sessionId, now = Date.now()) {
  const s = sticky.get(sessionId);
  if (!s) return null;
  if (now - s.at > STICKY_TTL_MS) { sticky.delete(sessionId); return null; }
  return s.model;
}
export function clearSticky(sessionId) { sticky.delete(sessionId); }

// Integration: prefer sticky model when the request is a tool continuation.
export function applyStickiness(candidates, sessionId, { isToolContinuation }) {
  if (!isToolContinuation) return candidates;
  const model = stickyModel(sessionId);
  if (!model) return candidates;
  const match = candidates.find((c) => c.model === model);
  return match ? [match, ...candidates.filter((c) => c.model !== model)] : candidates;
}
```

**Files touched:** `src/lib/tool-routing/` (new: classifier, select, detect, sticky), `src/sse/handlers/chat.js` (tool-aware selection), `open-sse/handlers/chatCore.js` (tool-call detection), `open-sse/config/providerModels.js` (tool-support flags), dashboard tool-routing page (new), `tests/unit/tool-routing.test.js` (new).

**Acceptance criteria:** tool requests routed to capable models; dropped calls retried; stickiness within TTL.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Misclassified intent | Wrong routing | Conservative fallback to current behavior |
| Detection false positives | Unneeded retries | Multiple indicators + issue cap |
| Stale stickiness | Wrong model kept | TTL + availability check |
| Translation drops tool params | Broken tool calls | Per-pair tool-param preservation tests |

## Verification

- Unit: classifier, select, detect, sticky
- Manual: tool request → capable model; simulate dropped call → fallback retry
- Regression: `tests/__baseline__/verify-no-regression.mjs`