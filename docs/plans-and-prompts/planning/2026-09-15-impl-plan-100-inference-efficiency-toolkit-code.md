# Implementation Plan 100 — Inference Efficiency Toolkit (Batching, KV, Prefix) — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #inference #batching #kv-cache #prefix-cache #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (local acceleration from plan 92 (`src/lib/local/`); local executor in `open-sse/executors/`; performance from plan 31 research).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — batch concurrent requests; confirm KV caps; measure prefix hits; confirm draft fallback.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-100-inference-efficiency-toolkit.md`, `../research/9router/impl-plan-92-local-inference-acceleration.md`, `../research/9router/impl-plan-31-performance.md`.

## Scope

**In scope:** continuous batching (batch queue, configurable window, max batch/token limits, priority bypass); KV cache management (page-based allocation via backend, int8/int4 quantization options, memory caps); prefix caching (system-prompt+prefix hash key, LRU with memory cap, hit-rate telemetry); speculative decoding (per-target draft config, acceptance verification, fallback on poor acceptance); local executor integration + dashboard.
**Out of scope:** backend engine implementation (vLLM/llama.cpp features are configured, not built); GPU scheduling.

## Milestones

### M1 — Continuous batching

**Reference code (`src/lib/inference/batch.js`):**

```js
// Continuous batching with priority bypass.
export function makeBatcher({ windowMs = 50, maxBatch = 8, maxTokens = 16_000, process } = {}) {
  let queue = [];
  let timer = null;
  const flush = async () => {
    timer = null;
    const batch = queue;
    queue = [];
    if (batch.length) await process(batch);
  };
  return {
    submit(item, { priority = false } = {}) {
      if (priority) { // high-priority bypasses the queue
        if (timer) { clearTimeout(timer); timer = null; }
        return process([item]);
      }
      queue.push(item);
      const tokens = queue.reduce((a, i) => a + (i.tokens ?? 0), 0);
      if (queue.length >= maxBatch || tokens >= maxTokens) {
        if (timer) clearTimeout(timer);
        return flush();
      }
      if (!timer) timer = setTimeout(flush, windowMs);
      return null;
    },
    depth() { return queue.length; },
    flushNow() { return flush(); },
  };
}

// Latency tradeoff: batch size vs. added latency.
export function batchTradeoff({ batchSize, windowMs, singleLatencyMs }) {
  return { batchSize, addedLatency: batchSize > 1 ? windowMs : 0, effectiveLatency: singleLatencyMs + (batchSize > 1 ? windowMs : 0) };
}
```

**Acceptance criteria:** batching; priority bypass; limits.

### M2 — KV cache management

**Reference code (`src/lib/inference/kv.js`):**

```js
// KV quantization options + memory caps.
export const KV_OPTIONS = ["none", "int8", "int4"];

export function kvConfig({ option = "none", memoryCapMb = 2048, pageSize = 16 } = {}) {
  if (!KV_OPTIONS.includes(option)) throw new Error(`invalid KV option: ${option}`);
  return { option, memoryCapMb, pageSize };
}

// Page-based allocation bookkeeping (PagedAttention-style).
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

export function withinMemoryCap({ usageMb, capMb = 2048 }) {
  return usageMb <= capMb;
}
```

**Acceptance criteria:** options validated; page table; memory cap.

### M3 — Prefix caching

**Reference code (`src/lib/inference/prefix.js`):**

```js
// LRU prefix cache keyed by system-prompt + prefix hash.
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

### M4 — Speculative decoding + integration + tests

**Reference code (`src/lib/inference/draft.js`):**

```js
// Draft model config + acceptance + fallback.
export const DRAFT_CONFIG = {
  "local/llama-70b": { draft: "local/llama-1b", maxDraftTokens: 5, acceptThreshold: 0.6 },
};

export function draftFor(target, config = DRAFT_CONFIG) {
  return config[target] ?? null;
}

export function acceptDraft({ targetLogprob, draftLogprob, threshold = 0.6 } = {}) {
  if (targetLogprob == null || draftLogprob == null) return false;
  return targetLogprob / Math.max(1e-6, draftLogprob) >= threshold;
}

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

**Files touched:** `src/lib/inference/` (new: batch, kv, prefix, draft), `open-sse/executors/local.js` (integration), `open-sse/config/inferenceConfig.js` (new), dashboard inference page (new), `tests/unit/inference.test.js` (new).

**Acceptance criteria:** batching; KV options; prefix hits; draft fallback; telemetry.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Batching latency | Slow single requests | Window tuning |
| KV memory | OOM | Caps |
| Cache staleness | Wrong prefixes | LRU + invalidation |
| Draft rejection | Slower baseline | Monitoring + fallback |

## Verification

- Unit: makeBatcher, makePageTable, makePrefixCache, acceptDraft
- Manual: concurrent local requests → batched; repeated prefix → hits; poor acceptance → draft disabled
- Regression: `tests/__baseline__/verify-no-regression.mjs`