# Implementation Plan 192 — Translator Registration System — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #translators #registration #discovery #invocation #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (translator direct routes from plan 124; provider registry from plan 34 (`open-sse/providers/registry/`); API compatibility from plan 40; provider registry governance from plan 130). **Read `open-sse/AGENTS.md` before touching anything under `open-sse/translator/`** — translators self-register via `register(from, to, reqFn, resFn)` as import side effects and MUST be imported in `open-sse/translator/index.js`.
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — registration; discovery; invocation.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-192-translator-registration-system.md`, `../research/9router/impl-plan-124-translator-direct-routes.md`, `../research/9router/impl-plan-34-provider-registry.md`.

## Scope

**In scope:** registration model (registry, metadata, validation); discovery (auto-discovery, scope, fallback); invocation (flow, caching, fallback).
**Out of scope:** translator direct routes (plan 124); provider registry (plan 34).

## Milestones

### M1 — Registration model

**Reference code (`src/lib/translators/registry.js`):**

```js
// Translator registry: registered translators.
export function makeTranslatorRegistry() {
  const translators = new Map(); // name -> {from, to, req, res, metadata}
  return {
    // register: {name, from, to, req, res, metadata}
    register(t) {
      translators.set(t.name, { ...t, registeredAt: Date.now() });
      return t.name;
    },
    get(name) { return translators.get(name) ?? null; },
    all() { return [...translators.values()]; },
    // Find by pair.
    forPair(from, to) {
      return [...translators.values()].find((t) => t.from === from && t.to === to) ?? null;
    },
  };
}

// Translator metadata: name, provider, capabilities.
export function makeMetadata({ name = "", provider = null, capabilities = [] } = {}) {
  return { name, provider, capabilities, version: 1 };
}

// Translator validation: schema validation.
export function validateTranslator(t = {}) {
  const errors = [];
  if (!t.name) errors.push("name required");
  if (!t.from || !t.to) errors.push("from/to required");
  if (typeof t.req !== "function") errors.push("req must be a function");
  if (typeof t.res !== "function") errors.push("res must be a function");
  return { valid: errors.length === 0, errors };
}
```

**Acceptance criteria:** registry; metadata; validation.

### M2 — Discovery

**Reference code (`src/lib/translators/discover.js`):**

```js
// Discovery mechanism: auto-discovery.
export function discoverTranslators({ registry, candidates = [] } = {}) {
  const discovered = [];
  for (const c of candidates) {
    const validation = validateTranslator(c);
    if (validation.valid) {
      registry.register(c);
      discovered.push(c.name);
    }
  }
  return discovered;
}

// Discovery scope: per-provider, per-model.
export function discoverFor({ registry, provider = null, model = null } = {}) {
  return registry.all().filter((t) => (!provider || t.metadata?.provider === provider) && (!model || t.metadata?.capabilities?.includes(model)));
}

// Discovery fallback: default translator.
export function discoveryFallback({ registry, from, to, defaults = [] } = {}) {
  return registry.forPair(from, to) ?? defaults.find((d) => d.from === from && d.to === to) ?? null;
}
```

**Acceptance criteria:** discovery; scope; fallback.

### M3 — Invocation

**Reference code (`src/lib/translators/invoke.js`):**

```js
// Invocation flow: request → translator → provider.
export function invokeTranslator({ translator, request = {}, direction = "req" } = {}) {
  if (!translator) return request; // passthrough
  return direction === "req" ? translator.req(request) : translator.res(request);
}

// Invocation caching: cache translations.
export function makeTranslationCache({ max = 100 } = {}) {
  const cache = new Map();
  return {
    get(key) { return cache.get(key) ?? null; },
    set(key, value) { if (cache.size >= max) cache.delete(cache.keys().next().value); cache.set(key, value); },
    clear() { cache.clear(); },
  };
}

// Invocation fallback: fallback translator.
export function invokeWithFallback({ primary = null, fallback = null, request = {}, direction = "req" } = {}) {
  try {
    return invokeTranslator({ translator: primary, request, direction });
  } catch {
    return invokeTranslator({ translator: fallback, request, direction });
  }
}
```

**Acceptance criteria:** flow; caching; fallback.

### M4 — Integration + tests

**Reference code (`src/lib/translators/integrate.js`):**

```js
// Executor integration: translator hooks.
export function translatorFor({ registry, from, to, defaults = [] } = {}) {
  return discoveryFallback({ registry, from, to, defaults });
}

// Fail-open.
export function safeTranslator(fn, fallback = null) {
  try { return fn(); } catch { return fallback; }
}
```

**Files touched:** `src/lib/translators/` (new: registry, discover, invoke, integrate), `open-sse/translator/` (integration), dashboard translators page (new), `tests/unit/translators.test.js` (new).

**Acceptance criteria:** integration; fail-open; tests.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Registration drift | Stale translators | Validation |
| Discovery failures | Missing translators | Fallback |
| Invocation errors | Broken requests | Error handling |
| Complexity | Confusion | Simple registration |

## Verification

- Unit: makeTranslatorRegistry, makeMetadata, validateTranslator, discoverTranslators, discoverFor, discoveryFallback, invokeTranslator, makeTranslationCache, invokeWithFallback, translatorFor
- Manual: register → discover → invoke → fallback
- Regression: `tests/__baseline__/verify-no-regression.mjs`