# Implementation Plan 55 — Context Window Management — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #context-window #overflow #estimation #compression #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (`open-sse/rtk/` token saver hooks — fail-open compression already exists; `open-sse/handlers/chatCore.js`; `open-sse/config/providerModels.js` for context windows; `src/lib/events/bus.js` from plan 37).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — estimate tokens on real requests; trigger overflow; confirm truncate/summarize/fallback paths.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-55-context-window-management.md`, `../research/9router/45-branch-semantic-and-embedding-routing.md`, `../research/9router/impl-plan-26-token-optimization.md`.

## Scope

**In scope:** per-model context window registry; token estimation (chars/4 heuristic + optional tiktoken); pre-routing fit check; overflow handling (truncate oldest non-essential, opt-in summarize, fallback to larger-context model); context optimization (RTK compression reuse, cache-aware ordering); context usage telemetry.
**Out of scope:** splitting requests across models; semantic summarization with LLM calls (opt-in later).

## Milestones

### M1 — Context registry + estimation

**Reference code (`open-sse/config/contextConfig.js`):**

```js
// Per-model context windows (tokens). Unknown models default conservatively.
export const CONTEXT_WINDOWS = {
  "gpt-4o": 128_000,
  "gpt-4o-mini": 128_000,
  "gpt-4.1": 1_047_576,
  "claude-sonnet-4-20250514": 200_000,
  "claude-haiku-4-5-20251001": 200_000,
  "gemini-2.0-flash": 1_048_576,
  "deepseek-chat": 64_000,
  "llama-3.3-70b": 128_000,
};
export const DEFAULT_CONTEXT_WINDOW = 32_000;

export function contextWindowFor(model) {
  return CONTEXT_WINDOWS[model] ?? DEFAULT_CONTEXT_WINDOW;
}
```

**Reference code (`src/lib/context/estimate.js`):**

```js
// Token estimation: chars/4 heuristic (conservative for code), optional tiktoken if installed.
export function estimateTokens(text) {
  if (typeof text !== "string") return 0;
  return Math.ceil(text.length / 4);
}

export function estimateMessages(messages) {
  let total = 0;
  for (const msg of messages ?? []) {
    total += estimateTokens(msg.role ?? "") + 4; // role overhead
    if (typeof msg.content === "string") total += estimateTokens(msg.content);
    else if (Array.isArray(msg.content)) {
      for (const part of msg.content) {
        if (part.type === "text") total += estimateTokens(part.text ?? "");
        else if (part.type === "image_url") total += 1000; // image ≈ 1000 tokens
        else total += 200; // other parts
      }
    }
  }
  return total;
}

// Fit check: estimated tokens + output budget vs model window.
export function fitsInWindow(model, messages, { outputTokens = 1024, windowOverride } = {}) {
  const window = windowOverride ?? contextWindowFor(model);
  const used = estimateMessages(messages) + outputTokens;
  return { fits: used <= window, used, window, headroom: window - used };
}
```

**Acceptance criteria:** estimation reasonable; fit check pre-routing; unknown models conservative.

### M2 — Overflow handling

**Reference code (`src/lib/context/overflow.js`):**

```js
import { fitsInWindow } from "./estimate.js";

// Strategy: truncate | summarize | fallback (configurable per settings.contextOverflow).
export function handleOverflow({ model, messages, strategy = "truncate", windowOverride } = {}) {
  const check = fitsInWindow(model, messages, { windowOverride });
  if (check.fits) return { action: "none", messages, check };

  switch (strategy) {
    case "truncate": {
      // Drop oldest non-system messages until it fits (keep system + last N).
      const kept = [...messages];
      let guard = 0;
      while (!fitsInWindow(model, kept, { windowOverride }).fits && guard < 50) {
        const idx = kept.findIndex((m) => m.role !== "system");
        if (idx === -1) break;
        kept.splice(idx, 1);
        guard++;
      }
      return { action: "truncate", messages: kept, check: fitsInWindow(model, kept, { windowOverride }) };
    }
    case "summarize": {
      // Opt-in: replace oldest non-system messages with a summary placeholder.
      // The summary itself is produced by a cheap model (async, out of band) — here we mark it.
      const systemIdx = messages.findIndex((m) => m.role === "system");
      const head = systemIdx >= 0 ? messages.slice(0, systemIdx + 1) : [];
      const tail = messages.slice(-5);
      const summarized = [...head, { role: "user", content: "[summarized-history]" }, ...tail];
      return { action: "summarize", messages: summarized, check: fitsInWindow(model, summarized, { windowOverride }) };
    }
    case "fallback": {
      // Route to a larger-context model (caller resolves via alias/registry).
      return { action: "fallback", messages, check, fallbackModel: pickLargerModel(model) };
    }
    default:
      return { action: "none", messages, check };
  }
}

function pickLargerModel(model) {
  // From context registry: first model with a larger window (config-driven).
  const { CONTEXT_WINDOWS } = await import("../../open-sse/config/contextConfig.js");
  const current = CONTEXT_WINDOWS[model] ?? 0;
  const larger = Object.entries(CONTEXT_WINDOWS).filter(([, w]) => w > current).sort((a, b) => a[1] - b[1]);
  return larger[0]?.[0] ?? null;
}
```

**Acceptance criteria:** truncate keeps system + recent; summarize marks history; fallback picks larger model.

### M3 — Context optimization (compression + cache ordering)

**Reference code (`src/lib/context/optimize.js`):**

```js
// Cache-aware ordering: move cacheable (stable) content first, volatile last.
export function orderForCache(messages) {
  const system = messages.filter((m) => m.role === "system");
  const stable = messages.filter((m) => m.role === "user" && m.cacheable);
  const rest = messages.filter((m) => !system.includes(m) && !stable.includes(m));
  return [...system, ...stable, ...rest];
}

// Compression: reuse RTK-style fail-open compression for tool results.
export async function compressToolResults(messages) {
  const { compressToolResult } = await import("../../open-sse/rtk/index.js").catch(() => ({ compressToolResult: null }));
  if (!compressToolResult) return messages; // fail-open
  return messages.map((m) => {
    if (m.role !== "tool") return m;
    const compressed = compressToolResult(m.content);
    return compressed ? { ...m, content: compressed } : m;
  });
}
```

**Acceptance criteria:** cache ordering applied; compression fail-open; no behavior change when disabled.

### M4 — Integration + telemetry + tests

**Reference code (integration in `open-sse/handlers/chatCore.js`):**

```js
// Before translation: fit check → overflow handling → optimization.
import { fitsInWindow } from "../../src/lib/context/estimate.js";
import { handleOverflow } from "../../src/lib/context/overflow.js";
import { orderForCache, compressToolResults } from "../../src/lib/context/optimize.js";

export async function prepareContext({ model, messages, settings }) {
  const check = fitsInWindow(model, messages);
  if (!check.fits) {
    const handled = handleOverflow({ model, messages, strategy: settings.contextOverflow ?? "truncate" });
    if (handled.action === "fallback" && handled.fallbackModel) {
      return { model: handled.fallbackModel, messages: await compressToolResults(orderForCache(messages)), overflow: "fallback" };
    }
    return { model, messages: handled.messages, overflow: handled.action };
  }
  return { model, messages: await compressToolResults(orderForCache(messages)), overflow: "none" };
}
```

**Files touched:** `src/lib/context/` (new: estimate, overflow, optimize), `open-sse/config/contextConfig.js` (new), `open-sse/handlers/chatCore.js` (integration), `src/lib/db/repos/contextRepo.js` (new: telemetry), `tests/unit/context-window.test.js` (new).

**Acceptance criteria:** fit check pre-routing; overflow handled per strategy; telemetry recorded; tests pass.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Estimation error | Wrong fit decisions | Conservative heuristic + headroom |
| Summarize loss | Lost context | Opt-in + safety rules |
| Fallback cost | Expensive model | Config-gated |
| Compression bugs | Corrupted content | Fail-open (RTK pattern) |

## Verification

- Unit: estimate, fit, overflow, optimize
- Manual: oversized request → truncate/fallback; telemetry visible
- Regression: `tests/__baseline__/verify-no-regression.mjs`