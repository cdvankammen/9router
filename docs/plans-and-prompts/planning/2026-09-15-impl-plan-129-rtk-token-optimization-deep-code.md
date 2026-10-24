# Implementation Plan 129 — RTK Token Optimization Deep Dive — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #rtk #tokens #compression #context-window #analytics #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (RTK token saver in `open-sse/rtk/`; token budget in `src/lib/tokens.js`; context window from plan 55 research; performance from plan 31).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — compression strategies; token budgets; analytics.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-129-rtk-token-optimization-deep.md`, `../research/9router/impl-plan-25-token-optimization-context.md`, `../research/9router/impl-plan-16-rtk-deep-dive.md`.

## Scope

**In scope:** compression strategies (tool result, system prompt, history, image); context-window-aware compression (per-request token budget, compression priority, quality guardrails); compression analytics (per-request savings, post-compression quality, ratios by content type); RTK hooks + dashboard compression view.
**Out of scope:** RTK architecture internals (plan 16); latency optimization (plan 31).

## Milestones

### M1 — Compression strategies

**Reference code (`open-sse/rtk/compress.js`):**

```js
// Compression strategies: tool result, system prompt, history, image.
export function compressToolResult(content, { maxChars = 2000 } = {}) {
  if (typeof content !== "string" || content.length <= maxChars) return { content, compressed: false };
  return { content: `${content.slice(0, maxChars)}\n...[truncated ${content.length - maxChars} chars]`, compressed: true };
}

export function compressSystemPrompt(prompt, { maxChars = 4000 } = {}) {
  if (typeof prompt !== "string" || prompt.length <= maxChars) return { content: prompt, compressed: false };
  return { content: prompt.slice(0, maxChars), compressed: true };
}

export function compressHistory(turns, { keep = 10, summarize = null } = {}) {
  if (turns.length <= keep) return { turns, compressed: false };
  const kept = turns.slice(-keep);
  const dropped = turns.slice(0, turns.length - keep);
  const summary = summarize ? summarize(dropped) : `[${dropped.length} earlier turns omitted]`;
  return { turns: [{ role: "system", content: summary }, ...kept], compressed: true };
}

export function compressImage(base64, { maxBytes = 200_000 } = {}) {
  if (typeof base64 !== "string" || base64.length <= maxBytes) return { content: base64, compressed: false };
  return { content: base64.slice(0, maxBytes), compressed: true };
}
```

**Acceptance criteria:** four strategies; lossless when under limits.

### M2 — Context-window-aware compression

**Reference code (`open-sse/rtk/budget.js`):**

```js
// Token budget: per-request budget.
export function tokenBudget({ maxContext, reserveForOutput = 4096, currentTokens = 0 } = {}) {
  const available = maxContext - reserveForOutput;
  return { available, over: currentTokens > available, excess: Math.max(0, currentTokens - available) };
}

// Compression priority: what to compress first.
export const COMPRESS_PRIORITY = ["tool-result", "history", "system-prompt", "image"];

// Quality guardrails: min quality thresholds.
export function guardrail({ qualityScore = null, minQuality = 0.6, compressed = false } = {}) {
  if (!compressed) return { ok: true };
  if (qualityScore == null) return { ok: true, unknown: true };
  return { ok: qualityScore >= minQuality, qualityScore };
}

// Plan: which strategies to apply given the budget.
export function planCompression({ excess, strategies = COMPRESS_PRIORITY } = {}) {
  const plan = [];
  let remaining = excess;
  for (const s of strategies) {
    if (remaining <= 0) break;
    plan.push(s);
    remaining -= 1; // each strategy reduces ~1 unit of pressure
  }
  return { plan, remaining };
}
```

**Acceptance criteria:** budget; priority; guardrails; plan.

### M3 — Compression analytics

**Reference code (`open-sse/rtk/analytics.js`):**

```js
// Savings tracking: per-request savings.
export function makeCompressionAnalytics() {
  const records = [];
  return {
    record({ requestId, before, after, byType = {}, qualityScore = null } = {}) {
      records.push({ requestId, before, after, saved: before - after, byType, qualityScore, at: Date.now() });
    },
    // Ratios by content type.
    ratios() {
      const agg = {};
      for (const r of records) for (const [type, saved] of Object.entries(r.byType)) {
        agg[type] = agg[type] ?? { saved: 0, count: 0 };
        agg[type].saved += saved; agg[type].count += 1;
      }
      return Object.fromEntries(Object.entries(agg).map(([k, v]) => [k, { ...v, avg: v.count ? v.saved / v.count : 0 }]));
    },
    // Quality: post-compression quality.
    avgQuality() {
      const q = records.filter((r) => r.qualityScore != null).map((r) => r.qualityScore);
      return q.length ? q.reduce((a, b) => a + b, 0) / q.length : null;
    },
    totalSaved() { return records.reduce((a, r) => a + r.saved, 0); },
  };
}
```

**Acceptance criteria:** savings; ratios; quality.

### M4 — Integration + tests

**Reference code (`open-sse/rtk/integrate.js`):**

```js
// RTK hooks: apply compression plan to a request.
export function applyCompression({ messages, plan, budget, analytics, requestId } = {}) {
  let before = budget.currentTokens ?? 0;
  const byType = {};
  const out = messages.map((m) => {
    if (plan.includes("tool-result") && m.role === "tool") {
      const r = compressToolResult(m.content); if (r.compressed) byType["tool-result"] = (byType["tool-result"] ?? 0) + (m.content.length - r.content.length);
      return { ...m, content: r.content };
    }
    return m;
  });
  const after = before - Object.values(byType).reduce((a, b) => a + b, 0);
  analytics?.record({ requestId, before, after, byType });
  return { messages: out, saved: before - after };
}

// Telemetry: compression view.
export function makeCompressionTelemetry() {
  const events = [];
  return {
    record(evt) { events.push({ ...evt, at: Date.now() }); },
    report() {
      return {
        requests: events.length,
        totalSaved: events.reduce((a, e) => a + (e.saved ?? 0), 0),
        compressed: events.filter((e) => (e.saved ?? 0) > 0).length,
      };
    },
  };
}
```

**Files touched:** `open-sse/rtk/` (new compression hooks), `src/lib/tokens.js` (budget management), dashboard compression page (new), `tests/unit/rtk.test.js` (new).

**Acceptance criteria:** hooks; telemetry; tests.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Quality loss | Bad outputs | Guardrails |
| Compression overhead | Latency | Sampling |
| Budget complexity | Confusion | Simple defaults |
| Provider quirks | Wrong counts | Per-provider config |

## Verification

- Unit: compressToolResult, compressHistory, tokenBudget, planCompression, makeCompressionAnalytics
- Manual: over-budget request → compression plan applied; savings visible
- Regression: `tests/__baseline__/verify-no-regression.mjs`