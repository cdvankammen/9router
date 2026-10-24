# Implementation Plan 92 — Local Inference Acceleration (Speculative Decoding & KV Optimization) — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #local-inference #speculative-decoding #kv-cache #batching #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (local model executor in `open-sse/executors/`; performance work from plan 31 research; token optimization from plan 26; context window from plan 55).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — run local inference with draft model; confirm acceptance; check prefix cache hits; confirm batching.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-92-local-inference-acceleration.md`, `../research/9router/impl-plan-31-performance.md`, `../research/9router/impl-plan-55-context-window-management.md`.

## Scope

**In scope:** speculative decoding (draft model config per target, acceptance verification, tradeoff controls, fallback when draft underperforms); KV cache optimization (int8/int4 quantization options, page-based management, memory caps); prefix caching (LRU with memory cap, hit-rate telemetry); continuous batching (batch queue, configurable window, latency tradeoff); local executor integration + dashboard.
**Out of scope:** actual model weights/quantization tooling (server-side features only); GPU-specific optimizations.

## Milestones

### M1 — Speculative decoding

**Reference code (`src/lib/local/draft.js`):**

```js
// Draft model config per target.
export const DRAFT_CONFIG = {
  "local/llama-70b": { draft: "local/llama-1b", maxDraftTokens: 5, acceptThreshold: 0.6 },
  // ...extend per deployment
};

export function draftFor(target, config = DRAFT_CONFIG) {
  return config[target] ?? null;
}

// Acceptance: verify draft tokens against target logits (simplified — real impl uses logprobs).
export function acceptDraft({ draftToken, targetLogprob, draftLogprob, threshold = 0.6 } = {}) {
  if (targetLogprob == null || draftLogprob == null) return false;
  const ratio = targetLogprob / Math.max(1e-6, draftLogprob);
  return ratio >= threshold;
}

// Tradeoff monitor: disable draft when acceptance rate drops.
export function makeAcceptanceMonitor({ minRate = 0.5, window = 50 } = {}) {
  const recent = [];
  return {
    record(accepted) {
      recent.push(accepted ? 1 : 0);
      if (recent.length > window) recent.shift();
    },
    rate() { return recent.length ? recent.reduce((a, b) => a + b, 0) / recent.length : 1; },
    shouldDisable() { return recent.length >= window && this.rate() < minRate; },
  };
}
```

**Acceptance criteria:** draft config lookup; acceptance logic; auto-disable on low rate.

### M2 — KV cache optimization

**Reference code (`src/lib/local/kv.js`):**

```js
// KV quantization options (server-side flags).
export const KV_OPTIONS = ["none", "int8", "int4"];

export function kvConfig({ option = "none", memoryCapMb = 2048, pageSize = 16 } = {}) {
  if (!KV_OPTIONS.includes(option)) throw new Error(`invalid KV option: ${option}`);
  return { option, memoryCapMb, pageSize };
}

// Page-based KV management (PagedAttention-style bookkeeping).
export function makePageTable({ pageSize = 16, maxPages = 128 } = {}) {
  const pages = new Map(); // seqId -> [{ page, slotsUsed }]
  return {
    alloc(seqId, tokens) {
      const needed = Math.ceil(tokens / pageSize);
      const existing = pages.get(seqId) ?? [];
      if (existing.length + needed > maxPages) return { ok: false, reason: "out-of-pages" };
      for (let i = 0; i < needed; i++) existing.push({ page: existing.length, slotsUsed: Math.min(pageSize, tokens - i * pageSize) });
      pages.set(seqId, existing);
      return { ok: true, pages: existing.length };
    },
    free(seqId) { pages.delete(seqId); },
    usage() { return [...pages.values()].reduce((a, p) => a + p.length, 0) / maxPages; },
  };
}

// Memory cap enforcement.
export function withinMemoryCap({ usageMb, capMb = 2048 }) {
  return usageMb <= capMb;
}
```

**Acceptance criteria:** options validated; page table alloc/free; memory cap.

### M3 — Prefix caching

**Reference code (`src/lib/local/prefix.js`):**

```js
// LRU prefix cache with memory cap.
export function makePrefixCache({ maxEntries = 100, maxChars = 1_000_000 } = {}) {
  const map = new Map(); // hash -> { prefix, chars, hits, lastUsed }
  let totalChars = 0;
  return {
    get(prefix) {
      const hash = simpleHash(prefix);
      const e = map.get(hash);
      if (!e) return null;
      e.hits += 1; e.lastUsed = Date.now();
      return e.prefix;
    },
    set(prefix) {
      const hash = simpleHash(prefix);
      if (map.has(hash)) return;
      const chars = prefix.length;
      while (map.size >= maxEntries || totalChars + chars > maxChars) {
        // Evict LRU.
        let lruKey = null; let lru = Infinity;
        for (const [k, v] of map) if (v.lastUsed < lru) { lru = v.lastUsed; lruKey = k; }
        if (lruKey == null) break;
        totalChars -= map.get(lruKey).chars;
        map.delete(lruKey);
      }
      map.set(hash, { prefix, chars, hits: 0, lastUsed: Date.now() });
      totalChars += chars;
    },
    stats() { return { entries: map.size, hits: [...map.values()].reduce((a, e) => a + e.hits, 0), totalChars }; },
  };
}
function simpleHash(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h >>> 0;
}
```

**Acceptance criteria:** LRU eviction; memory cap; hit stats.

### M4 — Continuous batching + integration + tests

**Reference code (`src/lib/local/batch.js`):**

```js
// Continuous batching: collect concurrent requests into batches.
export function makeBatcher({ windowMs = 50, maxBatch = 8, process } = {}) {
  let queue = [];
  let timer = null;
  const flush = async () => {
    timer = null;
    const batch = queue;
    queue = [];
    if (batch.length) await process(batch);
  };
  return {
    submit(item) {
      queue.push(item);
      if (queue.length >= maxBatch) { if (timer) clearTimeout(timer); return flush(); }
      if (!timer) timer = setTimeout(flush, windowMs);
      return null;
    },
    depth() { return queue.length; },
    flushNow() { return flush(); },
  };
}

// Latency tradeoff: batch size vs. added latency.
export function batchTradeoff({ batchSize, windowMs, singleLatencyMs }) {
  const addedLatency = batchSize > 1 ? windowMs : 0;
  return { batchSize, addedLatency, effectiveLatency: singleLatencyMs + addedLatency };
}
```

**Files touched:** `src/lib/local/` (new: draft, kv, prefix, batch), `open-sse/executors/local.js` (integration), `open-sse/config/localConfig.js` (new), dashboard local page (new), `tests/unit/local.test.js` (new).

**Acceptance criteria:** draft + KV + prefix + batching integrated in local executor; telemetry visible.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Draft rejection | Slower than baseline | Acceptance monitoring + auto-disable |
| KV memory | OOM | Memory caps |
| Cache staleness | Wrong prefixes | LRU + invalidation |
| Batching latency | Slow single requests | Window tuning |

## Verification

- Unit: acceptDraft, makePageTable, makePrefixCache, makeBatcher
- Manual: local inference with draft → acceptance rate; repeated prefix → cache hits
- Regression: `tests/__baseline__/verify-no-regression.mjs`