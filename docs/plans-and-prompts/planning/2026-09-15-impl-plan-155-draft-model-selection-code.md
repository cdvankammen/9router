# Implementation Plan 155 — Draft Model Selection for Speculative Decoding — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #speculative #draft-models #acceptance #inference #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (local inference from plan 92 (`open-sse/executors/local.js`); inference toolkit from plan 100; performance from plan 31; quantization from plan 113).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — draft registry; acceptance tracking; selection.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-155-draft-model-selection.md`, `../research/9router/impl-plan-92-local-inference.md`, `../research/9router/impl-plan-156-verification-strategies-speculative.md`.

## Scope

**In scope:** draft model registry (catalog, properties, pairing); acceptance tracking (rate, tokens saved, per-pair); selection strategy (best per target, adaptive, fallback); integration.
**Out of scope:** verification strategies (plan 156); KV cache (plan 157).

## Milestones

### M1 — Draft model registry

**Reference code (`src/lib/speculative/registry.js`):**

```js
// Draft model registry: candidate draft models.
export function makeDraftRegistry() {
  const drafts = new Map(); // id -> {id, size, speed, quality}
  const pairs = new Map(); // targetId -> draftId
  return {
    register(d) { drafts.set(d.id, d); },
    get(id) { return drafts.get(id); },
    all() { return [...drafts.values()]; },
    // Pairing: draft → target.
    pair(targetId, draftId) { pairs.set(targetId, draftId); },
    draftFor(targetId) { return drafts.get(pairs.get(targetId)) ?? null; },
    // Best draft for a target under constraints.
    bestFor({ targetId, maxSize = Infinity, minQuality = 0 } = {}) {
      return this.all()
        .filter((d) => d.size <= maxSize && d.quality >= minQuality)
        .sort((a, b) => b.speed - a.speed)[0] ?? null;
    },
  };
}

export function makeDraft({ id, size = 1, speed = 1, quality = 0.7 } = {}) {
  return { id, size, speed, quality };
}
```

**Acceptance criteria:** registry; pairing; bestFor.

### M2 — Acceptance tracking

**Reference code (`src/lib/speculative/accept.js`):**

```js
// Acceptance tracking: rate + tokens saved per pair.
export function makeAcceptanceTracker() {
  const stats = new Map(); // pairKey -> {accepted, proposed, tokens}
  const key = (draft, target) => `${draft}->${target}`;
  return {
    record({ draft, target, accepted = 0, proposed = 0, tokens = 0 } = {}) {
      const k = key(draft, target);
      const s = stats.get(k) ?? { accepted: 0, proposed: 0, tokens: 0 };
      s.accepted += accepted;
      s.proposed += proposed;
      s.tokens += tokens;
      stats.set(k, s);
    },
    rate({ draft, target } = {}) {
      const s = stats.get(key(draft, target));
      return s && s.proposed ? s.accepted / s.proposed : null;
    },
    tokensSaved({ draft, target } = {}) {
      const s = stats.get(key(draft, target));
      return s ? s.tokens : 0;
    },
    report() { return Object.fromEntries(stats); },
  };
}

// Tuning: adjust draft choice from acceptance.
export function tunePair({ tracker, draft, target, minRate = 0.5 } = {}) {
  const rate = tracker.rate({ draft, target });
  return { keep: rate === null || rate >= minRate, rate };
}
```

**Acceptance criteria:** tracking; rate; tuning.

### M3 — Selection strategy

**Reference code (`src/lib/speculative/select.js`):**

```js
// Selection: best draft per target.
export function selectDraft({ registry, targetId, tracker, maxSize = Infinity } = {}) {
  const paired = registry.draftFor(targetId);
  if (paired) return paired;
  return registry.bestFor({ targetId, maxSize });
}

// Adaptive: prefer drafts with proven acceptance.
export function adaptiveSelect({ registry, targetId, tracker, minRate = 0.5 } = {}) {
  const candidates = registry.all().filter((d) => {
    const rate = tracker.rate({ draft: d.id, target: targetId });
    return rate === null || rate >= minRate;
  });
  return candidates.sort((a, b) => b.speed - a.speed)[0] ?? null;
}

// Fallback: no-draft fallback.
export function fallbackDraft({ draft = null } = {}) {
  return { draft, speculative: Boolean(draft) };
}
```

**Acceptance criteria:** selection; adaptive; fallback.

### M4 — Integration + tests

**Reference code (`src/lib/speculative/integrate.js`):**

```js
// Inference integration: pick draft, record acceptance.
export function speculativeConfig({ registry, tracker, targetId, maxSize = Infinity } = {}) {
  const draft = selectDraft({ registry, targetId, tracker, maxSize });
  return {
    draft,
    record(result) {
      if (draft) tracker.record({ draft: draft.id, target: targetId, ...result });
    },
  };
}

// Fail-open.
export function safeSpeculative(fn, fallback = null) {
  try { return fn(); } catch { return fallback; }
}
```

**Files touched:** `src/lib/speculative/` (new: registry, accept, select, integrate), `open-sse/executors/local.js` (integration), dashboard speculation page (new), `tests/unit/speculative.test.js` (new).

**Acceptance criteria:** integration; fail-open; tests.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Low acceptance | No speedup | Pair tuning |
| Complexity | Confusion | Simple defaults |
| Memory | Draft overhead | Size limits |
| Quality | Wrong tokens | Verification |

## Verification

- Unit: makeDraftRegistry, makeDraft, makeAcceptanceTracker, tunePair, selectDraft, adaptiveSelect, fallbackDraft, speculativeConfig
- Manual: pair draft → track acceptance → tune
- Regression: `tests/__baseline__/verify-no-regression.mjs`