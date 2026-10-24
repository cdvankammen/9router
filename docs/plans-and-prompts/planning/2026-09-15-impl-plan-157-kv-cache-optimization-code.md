# Implementation Plan 157 — KV Cache Optimization & Prefix Caching — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #kvcache #prefix-caching #quantization #inference #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (local inference from plan 92 (`open-sse/executors/local.js`); inference toolkit from plan 100; quantization from plan 113; draft selection from plan 155 (`src/lib/speculative/`)).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — prefix cache; quantization config; lifecycle.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-157-kv-cache-optimization.md`, `../research/9router/impl-plan-92-local-inference.md`, `../research/9router/impl-plan-113-quantization.md`.

## Scope

**In scope:** prefix caching (detection, storage, hit tracking); KV quantization (8-bit/4-bit levels, quality impact, per-model config); cache lifecycle (LRU eviction, TTL, sizing); integration.
**Out of scope:** draft model selection (plan 155); verification strategies (plan 156).

## Milestones

### M1 — Prefix caching

**Reference code (`src/lib/kvcache/prefix.js`):**

```js
// Prefix caching: shared prompt prefixes.
export function makePrefixCache({ maxEntries = 100 } = {}) {
  const cache = new Map(); // prefixHash -> {prefix, tokens, at}
  return {
    // Longest cached prefix of the prompt.
    longestPrefix(prompt) {
      let best = null;
      for (const [hash, entry] of cache) {
        if (prompt.startsWith(entry.prefix) && (!best || entry.prefix.length > best.prefix.length)) best = entry;
      }
      return best;
    },
    // Store a prefix.
    store(prefix, tokens) {
      if (cache.size >= maxEntries) {
        // Evict oldest.
        const oldest = [...cache.entries()].sort((a, b) => a[1].at - b[1].at)[0];
        cache.delete(oldest[0]);
      }
      cache.set(hash(prefix), { prefix, tokens, at: Date.now() });
    },
    // Hit rate tracking.
    hitRate() {
      const hits = [...cache.values()].filter((e) => e.hits).length;
      return cache.size ? hits / cache.size : 0;
    },
    size() { return cache.size; },
  };
}

function hash(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

// Prefix detection: shared prefix of two prompts.
export function sharedPrefix(a, b) {
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  return a.slice(0, i);
}
```

**Acceptance criteria:** longest prefix; store; hit rate.

### M2 — KV quantization

**Reference code (`src/lib/kvcache/quantize.js`):**

```js
// KV quantization levels: 8-bit, 4-bit.
export const QUANT_LEVELS = ["none", "8bit", "4bit"];

// Quantize a value to N bits.
export function quantize(value, bits = 8) {
  const levels = 2 ** bits;
  const q = Math.round(value * (levels - 1)) / (levels - 1);
  return Math.max(0, Math.min(1, q));
}

// Quality impact estimate per level.
export const QUALITY_IMPACT = { none: 0, "8bit": 0.01, "4bit": 0.05 };

// Per-model quantization config.
export function makeQuantConfig() {
  const config = new Map(); // modelId -> level
  return {
    set(modelId, level) { config.set(modelId, level); },
    get(modelId, fallback = "none") { return config.get(modelId) ?? fallback; },
    // Memory saved estimate.
    memorySaved(modelId, kvBytes) {
      const level = this.get(modelId);
      const ratio = level === "4bit" ? 0.5 : level === "8bit" ? 0.75 : 1;
      return kvBytes * (1 - ratio);
    },
  };
}
```

**Acceptance criteria:** levels; quantize; config.

### M3 — Cache lifecycle

**Reference code (`src/lib/kvcache/lifecycle.js`):**

```js
// Cache lifecycle: LRU eviction + TTL + sizing.
export function makeCacheLifecycle({ maxBytes = 1024 * 1024 * 512, ttlMs = 10 * 60_000 } = {}) {
  const entries = new Map(); // key -> {bytes, at}
  return {
    touch(key, bytes, now = Date.now()) {
      entries.set(key, { bytes, at: now });
      this.evict(now);
    },
    // LRU eviction.
    evict(now = Date.now()) {
      let total = [...entries.values()].reduce((s, e) => s + e.bytes, 0);
      const expired = [...entries.entries()].filter(([, e]) => now - e.at > ttlMs);
      for (const [k] of expired) { entries.delete(k); total -= expired.find(([, e]) => e.bytes)?.bytes ?? 0; }
      const sorted = [...entries.entries()].sort((a, b) => a[1].at - b[1].at);
      while (total > maxBytes && sorted.length) {
        const [k, e] = sorted.shift();
        entries.delete(k);
        total -= e.bytes;
      }
    },
    has(key) { return entries.has(key); },
    size() { return [...entries.values()].reduce((s, e) => s + e.bytes, 0); },
  };
}

// TTL check.
export function isExpired({ at, ttlMs, now = Date.now() } = {}) {
  return now - at > ttlMs;
}
```

**Acceptance criteria:** eviction; TTL; sizing.

### M4 — Integration + tests

**Reference code (`src/lib/kvcache/integrate.js`):**

```js
// Inference integration: cache hooks.
export function cacheForRequest({ cache, lifecycle, prompt, tokens } = {}) {
  const hit = cache.longestPrefix(prompt);
  if (hit) lifecycle.touch(hit.prefix, hit.tokens.length);
  return { hit, cachedTokens: hit?.tokens.length ?? 0 };
}

// Fail-open.
export function safeCache(fn, fallback = null) {
  try { return fn(); } catch { return fallback; }
}
```

**Files touched:** `src/lib/kvcache/` (new: prefix, quantize, lifecycle, integrate), `open-sse/executors/local.js` (integration), dashboard cache page (new), `tests/unit/kvcache.test.js` (new).

**Acceptance criteria:** integration; fail-open; tests.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Memory growth | OOM | Eviction |
| Quality loss | Bad outputs | Quantization levels |
| Stale cache | Wrong reuse | TTL |
| Complexity | Confusion | Simple defaults |

## Verification

- Unit: makePrefixCache, sharedPrefix, quantize, makeQuantConfig, makeCacheLifecycle, isExpired, cacheForRequest
- Manual: shared prefix → cache hit; LRU eviction
- Regression: `tests/__baseline__/verify-no-regression.mjs`