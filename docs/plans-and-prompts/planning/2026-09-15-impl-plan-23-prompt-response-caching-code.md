# Implementation Plan 23 — Prompt & Response Caching — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #caching #prompt-caching #response-cache #semantic-cache #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (imports, function signatures, `open-sse/translator/` cache_control handling, `src/lib/db/` conventions, `src/sse/handlers/chat.js`).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — run the app, hit the endpoints, check the DB, confirm acceptance criteria.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-23-prompt-response-caching.md`, `../research/9router/38-caching.md`

## Scope

**In scope:** provider prompt caching (cache_control blocks, prefix hints, cache read/write token metrics); gateway response cache (normalized request hash, SQLite-backed TTL, exact-match default, invalidation); semantic cache opt-in (embedding nearest-neighbor, threshold).
**Out of scope:** distributed cache (Redis optional); cache warming.

## Milestones

### M1 — Provider prompt caching

**Reference code (`open-sse/translator/cacheControl.js`):**

```js
// Inject cache_control blocks for stable prefixes (system prompt, tool defs).
export function applyCacheControl(messages, { enabled = true, prefixHints = true } = {}) {
  if (!enabled) return messages;
  const out = [];
  for (let i = 0; i < messages.length; i++) {
    const m = messages[i];
    if (prefixHints && (m.role === "system" || m.role === "tool")) {
      out.push({ ...m, cache_control: { type: "ephemeral" } });
    } else {
      out.push(m);
    }
  }
  return out;
}

// Parse cache read/write tokens from provider usage.
export function parseCacheTokens(usage) {
  return {
    cacheRead: usage?.prompt_tokens_details?.cached_tokens ?? 0,
    cacheWrite: usage?.prompt_tokens_details?.cache_creation_input_tokens ?? 0,
  };
}
```

**Acceptance criteria:** cache_control injected for stable prefixes; cache tokens parsed + logged.

### M2 — Gateway response cache

**Reference code (`src/lib/db/repos/cacheRepo.js`):**

```js
// SQLite-backed response cache with TTL.
export async function cacheGet(key) {
  const db = await getAdapter();
  const row = await db.get(`SELECT value, expires_at FROM response_cache WHERE key = ?`, [key]);
  if (!row) return null;
  if (row.expires_at < Date.now()) {
    await db.run(`DELETE FROM response_cache WHERE key = ?`, [key]);
    return null;
  }
  return JSON.parse(row.value);
}

export async function cacheSet(key, value, { ttlMs = 300_000 } = {}) {
  const db = await getAdapter();
  await db.run(`
    INSERT INTO response_cache (key, value, expires_at, created_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, expires_at = excluded.expires_at
  `, [key, JSON.stringify(value), Date.now() + ttlMs, Date.now()]);
}

export async function cacheInvalidate(prefix) {
  const db = await getAdapter();
  await db.run(`DELETE FROM response_cache WHERE key LIKE ?`, [`${prefix}%`]);
}
```

**Reference code (`open-sse/services/responseCache.js`):**

```js
// Normalized request hash (model + messages + params, sorted keys).
export function requestHash(req) {
  const canonical = JSON.stringify({
    model: req.model,
    messages: req.messages,
    temperature: req.temperature ?? 0,
    max_tokens: req.max_tokens,
    ...(req.tools ? { tools: req.tools } : {}),
  });
  return createHash("sha256").update(canonical).digest("hex");
}

// Exact-match default; semantic opt-in (plan 28 embeddings).
export function isCacheableRequest(req, settings) {
  if (!settings.responseCaching?.enabled) return false;
  if (req.stream) return false;
  if (req.tools?.length) return false; // tool calls are stateful
  return (req.temperature ?? 0) === 0;
}
```

**Acceptance criteria:** cache hit/miss; TTL; invalidation; only deterministic requests cached.

### M3 — Semantic cache (opt-in)

**Reference code (`open-sse/services/semanticCache.js`):**

```js
// Nearest-neighbor lookup via embeddings (plan 28 vector store).
export async function semanticLookup(prompt, { threshold = 0.95, topK = 1 } = {}) {
  const embedding = await embedText(prompt);
  const neighbors = await vectorSearch("response_cache", embedding, topK);
  const best = neighbors[0];
  if (best && best.similarity >= threshold) {
    return { hit: true, value: best.value, similarity: best.similarity };
  }
  return { hit: false };
}
```

**Acceptance criteria:** semantic hits above threshold; opt-in setting; fallback to exact.

### M4 — Config + tests

**Reference code (`src/lib/db/repos/settingsRepo.js` extension):**

```js
// Add to DEFAULT_SETTINGS:
responseCaching: { enabled: false, ttlSeconds: 300, semantic: false, semanticThreshold: 0.95 },
promptCaching: { enabled: true, prefixHints: true },
```

**Files touched:** `tests/unit/caching.test.js` (new).

**Acceptance criteria:** settings wired; tests pass.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Stale cached responses | TTL + invalidation |
| Cache key collisions | Canonical hash |
| Semantic false positives | Threshold tuning |
| Cache storage growth | LRU eviction + TTL sweep |

## Verification

- Unit: cache_control, hash, hit/miss, invalidation
- Manual: repeat identical request → verify cache hit
- Regression: `tests/__baseline__/verify-no-regression.mjs`