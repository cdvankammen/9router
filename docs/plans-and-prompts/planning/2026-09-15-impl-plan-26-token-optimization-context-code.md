# Implementation Plan 26 — Token Optimization & Context Management — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #token-optimization #context-window #rtk #truncation #budgeting #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (imports, function signatures, `open-sse/rtk/` existing hooks, `open-sse/config/` conventions, `src/sse/handlers/chat.js`).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — run the app, send long-context requests, confirm acceptance criteria.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-26-token-optimization-context.md`, `../research/9router/41-token-optimization.md`
>
> **Note on overlap:** `2026-09-15-context-window-hybrid-combo-implementation-plan.md` covers context-window-aware *combo selection*. This plan covers *token/context optimization mechanics* (RTK, truncation, budgeting). They compose.

## Scope

**In scope:** RTK enhancements (compression levels per provider, selective compression of large tool results only, tokens-saved metrics); context truncation (drop-oldest/drop-largest/summary-replace; never drop system prompt or tool definitions); token budgeting (per-request input/output split; allocation system > tools > history > current); cache-aware ordering (stable prefixes).
**Out of scope:** model-specific tokenizer accuracy (estimate-based); semantic compression (plan 28).

## Milestones

### M1 — RTK enhancements

**Reference code (`open-sse/rtk/compression.js`):**

```js
// Compression levels per provider; selective: only compress large tool results.
export const COMPRESSION_LEVELS = {
  off: { minTokens: Infinity, ratio: 1 },
  light: { minTokens: 2000, ratio: 0.5 },
  medium: { minTokens: 1000, ratio: 0.3 },
  aggressive: { minTokens: 500, ratio: 0.15 },
};

export function shouldCompress(content, { level = "medium", provider } = {}) {
  const cfg = COMPRESSION_LEVELS[level] ?? COMPRESSION_LEVELS.medium;
  const tokens = estimateTokens(content);
  return tokens >= cfg.minTokens;
}

export function compressToolResult(content, { level = "medium" } = {}) {
  const cfg = COMPRESSION_LEVELS[level];
  const tokens = estimateTokens(content);
  if (tokens < cfg.minTokens) return { content, saved: 0 };
  // Keep head + tail, compress middle (JSON-aware).
  const compressed = truncateMiddle(content, Math.max(1, Math.round(tokens * cfg.ratio)));
  return { content: compressed, saved: tokens - estimateTokens(compressed) };
}

function estimateTokens(text) {
  // Rough estimate: ~4 chars/token; refine with provider tokenizer when available.
  return Math.ceil(String(text).length / 4);
}
```

**Acceptance criteria:** per-provider levels; selective compression; tokens-saved metric recorded.

### M2 — Context truncation

**Reference code (`open-sse/services/contextTruncation.js`):**

```js
// Strategies: drop-oldest | drop-largest | summary-replace.
// Never drop: system prompt, tool definitions, current user message.
export function truncateContext(messages, budget, { strategy = "drop-oldest" } = {}) {
  const protectedIdx = new Set();
  messages.forEach((m, i) => {
    if (m.role === "system") protectedIdx.add(i);
    if (m.role === "tool" && isToolDefinition(m)) protectedIdx.add(i);
    if (i === messages.length - 1) protectedIdx.add(i); // current message
  });

  const droppable = messages.map((m, i) => ({ m, i })).filter(({ i }) => !protectedIdx.has(i));
  let total = messages.reduce((s, m) => s + estimateTokens(m.content ?? ""), 0);

  if (strategy === "drop-oldest") {
    for (const { m, i } of droppable.sort((a, b) => a.i - b.i)) {
      if (total <= budget) break;
      total -= estimateTokens(m.content ?? "");
      messages[i] = null;
    }
  } else if (strategy === "drop-largest") {
    for (const { m, i } of droppable.sort((a, b) => estimateTokens(b.m.content ?? "") - estimateTokens(a.m.content ?? ""))) {
      if (total <= budget) break;
      total -= estimateTokens(m.content ?? "");
      messages[i] = null;
    }
  } else if (strategy === "summary-replace") {
    // Replace oldest droppable block with a summary placeholder.
    const block = droppable.slice(0, Math.max(1, Math.floor(droppable.length / 3)));
    const summary = `[summary of ${block.length} earlier messages]`;
    const removed = block.reduce((s, { m }) => s + estimateTokens(m.content ?? ""), 0);
    messages[block[0].i] = { role: "user", content: summary };
    for (const { i } of block.slice(1)) messages[i] = null;
    total = total - removed + estimateTokens(summary);
  }

  return { messages: messages.filter(Boolean), totalTokens: total };
}
```

**Acceptance criteria:** protected messages never dropped; strategies work; budget respected.

### M3 — Token budgeting + cache-aware ordering

**Reference code (`open-sse/services/tokenBudget.js`):**

```js
// Allocation: system > tools > history > current.
export const BUDGET_ALLOCATION = { system: 0.2, tools: 0.15, history: 0.45, current: 0.2 };

export function allocateBudget(totalBudget) {
  return Object.fromEntries(
    Object.entries(BUDGET_ALLOCATION).map(([k, v]) => [k, Math.floor(totalBudget * v)])
  );
}

// Cache-aware ordering: keep stable prefixes (system, tools) first for provider prompt caching.
export function orderForCache(messages) {
  const system = messages.filter((m) => m.role === "system");
  const tools = messages.filter((m) => m.role === "tool" && isToolDefinition(m));
  const rest = messages.filter((m) => !system.includes(m) && !tools.includes(m));
  return [...system, ...tools, ...rest];
}
```

**Acceptance criteria:** budgets allocated; ordering preserves stable prefixes.

### M4 — Config + tests

**Reference code (`src/lib/db/repos/settingsRepo.js` extension):**

```js
// Add to DEFAULT_SETTINGS:
tokenOptimization: {
  enabled: true,
  compressionLevel: "medium",
  truncationStrategy: "drop-oldest",
  budgetTokens: 128_000,
},
```

**Files touched:** `tests/unit/token-optimization.test.js` (new).

**Acceptance criteria:** settings wired; tests pass.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Token estimation error | Conservative budgets |
| Truncation loses context | Summary-replace option |
| RTK fail-open preserved | Never throw (existing rule) |

## Verification

- Unit: compression, truncation, budgeting, ordering
- Manual: long-context request → verify truncation + tokens-saved metric
- Regression: `tests/__baseline__/verify-no-regression.mjs`