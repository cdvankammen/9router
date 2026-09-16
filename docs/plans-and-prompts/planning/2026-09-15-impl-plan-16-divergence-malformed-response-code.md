# Implementation Plan 16 — Divergence & Malformed Response Handling — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #divergence #malformed-response #validation #quarantine #graceful-degradation #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (imports, function signatures, `open-sse/executors/default.js` response parsing, `open-sse/translator/` response translators, `open-sse/handlers/chatCore.js`).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — run the app, hit the endpoints, confirm acceptance criteria.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-16-divergence-malformed-response.md`, `../research/9router/33-divergence-registry.md`

## Scope

**In scope:** response schema validation; divergence registry (per-provider quirks); graceful degradation (salvage partial, fallback on unrecoverable, client-safe errors); retry + provider quarantine.
**Out of scope:** full response schema DSL; auto-fix of provider bugs.

## Milestones

### M1 — Response validation

**Reference code (`open-sse/validation/responseSchema.js`):**

```js
// Minimal OpenAI-compatible response validator.
export function validateChatResponse(body) {
  const errors = [];
  if (!body || typeof body !== "object") return { ok: false, errors: ["response is not an object"] };
  if (typeof body.id !== "string") errors.push("missing id");
  if (typeof body.object !== "string") errors.push("missing object");
  if (!Array.isArray(body.choices) || body.choices.length === 0) errors.push("missing choices");
  for (const c of body.choices ?? []) {
    if (!c.message || typeof c.message !== "object") errors.push("choice missing message");
    if (c.message?.content == null && !Array.isArray(c.message?.tool_calls)) errors.push("message has no content or tool_calls");
  }
  if (body.usage && typeof body.usage.total_tokens !== "number") errors.push("usage.total_tokens not a number");
  return errors.length ? { ok: false, errors } : { ok: true, errors: [] };
}

// Streaming chunk validator.
export function validateStreamChunk(chunk) {
  if (typeof chunk !== "string") return { ok: false, errors: ["chunk not a string"] };
  if (!chunk.startsWith("data:")) return { ok: false, errors: ["chunk missing data: prefix"] };
  return { ok: true, errors: [] };
}
```

**Acceptance criteria:** validators catch malformed responses; streaming chunk validation.

### M2 — Divergence registry

**Reference code (`open-sse/config/divergenceRegistry.js`):**

```js
// Per-provider known quirks + salvage strategies.
export const DIVERGENCE_REGISTRY = {
  "provider-x": {
    quirks: [
      { pattern: /choices\[\d+\]\.message\.content is null/, strategy: "salvage_tool_calls" },
      { pattern: /missing usage/, strategy: "estimate_usage" },
      { pattern: /role missing/, strategy: "default_role_assistant" },
    ],
  },
  // ... per-provider entries
};

export function findDivergence(provider, errorOrBody) {
  const entry = DIVERGENCE_REGISTRY[provider];
  if (!entry) return null;
  const text = typeof errorOrBody === "string" ? errorOrBody : JSON.stringify(errorOrBody);
  for (const q of entry.quirks) {
    if (q.pattern.test(text)) return q;
  }
  return null;
}
```

**Acceptance criteria:** registry entries per provider; `findDivergence` matches.

### M3 — Graceful degradation + quarantine

**Reference code (`open-sse/services/degradation.js`):**

```js
// Salvage: extract usable parts (tool_calls, partial content) from malformed response.
export function salvageResponse(body, divergence) {
  switch (divergence?.strategy) {
    case "salvage_tool_calls":
      return { ok: true, value: { ...body, choices: body.choices.map((c) => ({ ...c, message: { ...c.message, content: c.message.content ?? "" } })) } };
    case "estimate_usage":
      return { ok: true, value: { ...body, usage: estimateUsage(body) } };
    case "default_role_assistant":
      return { ok: true, value: { ...body, choices: body.choices.map((c) => ({ ...c, message: { ...c.message, role: c.message.role ?? "assistant" } })) } };
    default:
      return { ok: false, error: "unrecoverable" };
  }
}

// Quarantine: repeated malformed responses -> provider quarantine + fallback.
export class ProviderQuarantine {
  constructor({ threshold = 3, windowMs = 60_000 } = {}) {
    this.threshold = threshold;
    this.windowMs = windowMs;
    this.failures = new Map(); // provider -> [{ts}]
  }

  recordFailure(provider) {
    const now = Date.now();
    const list = (this.failures.get(provider) ?? []).filter((f) => now - f.ts < this.windowMs);
    list.push({ ts: now });
    this.failures.set(provider, list);
    return list.length >= this.threshold;
  }

  isQuarantined(provider) {
    const list = this.failures.get(provider) ?? [];
    return list.filter((f) => Date.now() - f.ts < this.windowMs).length >= this.threshold;
  }

  clear(provider) {
    this.failures.delete(provider);
  }
}
```

**Wiring in `chatCore.js`:** validate → salvage → if unrecoverable → retry once → quarantine + fallback to next candidate.

**Acceptance criteria:** salvage strategies work; quarantine trips after threshold; fallback proceeds.

### M4 — Tests

**Files touched:** `tests/unit/response-validation.test.js` (new).

**Acceptance criteria:** validators, registry, salvage, quarantine tests pass.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Registry staleness | New provider quirks | Additive entries; tests |
| Salvage wrong guesses | Conservative strategies; log |
| Quarantine false positives | Threshold + window tuning |

## Verification

- Unit: validation, salvage, quarantine
- Manual: mock malformed response → verify salvage/fallback
- Regression: `tests/__baseline__/verify-no-regression.mjs`