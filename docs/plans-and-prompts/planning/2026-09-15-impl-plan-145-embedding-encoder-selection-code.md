# Implementation Plan 145 — Embedding Encoder Selection & Quality — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #encoders #embeddings #quality #selection #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (embeddings from plan 27 (`open-sse/services/embeddings.js`); embedding management from plan 93; RAG cascade from plan 84; RAG-aware routing from plan 114 (`src/lib/ragroute/`)).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — encoder selection; quality monitoring; fallback.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-145-embedding-encoder-selection.md`, `../research/9router/impl-plan-27-embeddings-vectorstore.md`, `../research/9router/impl-plan-93-embedding-management.md`.

## Scope

**In scope:** encoder registry (catalog, properties, quality); selection strategy (quality/cost/speed tradeoffs, per-task, fallback); quality monitoring (metrics, drift, alerts); integration.
**Out of scope:** similarity metrics (plan 146); NN search internals (plan 146).

## Milestones

### M1 — Encoder registry

**Reference code (`src/lib/encoders/registry.js`):**

```js
// Encoder catalog: available encoders with properties.
export function makeEncoderRegistry() {
  const encoders = new Map(); // id -> {id, dims, cost, speed, quality}
  return {
    register(enc) { encoders.set(enc.id, enc); },
    get(id) { return encoders.get(id); },
    all() { return [...encoders.values()]; },
    // Best encoder for a task under constraints.
    bestFor({ task = "general", maxCost = Infinity, minQuality = 0 } = {}) {
      return this.all()
        .filter((e) => e.cost <= maxCost && (e.quality ?? 0) >= minQuality && (e.tasks?.includes(task) || !e.tasks))
        .sort((a, b) => (b.quality ?? 0) - (a.quality ?? 0))[0] ?? null;
    },
  };
}

// Encoder properties: dimensions, cost, speed, quality.
export function makeEncoder({ id, dims = 768, cost = 1, speed = 1, quality = 0.8, tasks = [] } = {}) {
  return { id, dims, cost, speed, quality, tasks };
}
```

**Acceptance criteria:** catalog; bestFor; properties.

### M2 — Encoder selection

**Reference code (`src/lib/encoders/select.js`):**

```js
// Selection strategies: quality / cost / speed tradeoffs.
export const SELECTION = ["quality", "cost", "speed", "balanced"];

export function selectEncoder({ registry, strategy = "balanced", task = "general", maxCost = Infinity } = {}) {
  const candidates = registry.all().filter((e) => e.cost <= maxCost);
  if (!candidates.length) return null;
  switch (strategy) {
    case "quality": return [...candidates].sort((a, b) => b.quality - a.quality)[0];
    case "cost": return [...candidates].sort((a, b) => a.cost - b.cost)[0];
    case "speed": return [...candidates].sort((a, b) => a.speed - b.speed)[0];
    case "balanced":
    default: {
      // Normalized score: quality + speed, penalized by cost.
      const maxQ = Math.max(...candidates.map((e) => e.quality));
      const maxS = Math.max(...candidates.map((e) => e.speed));
      return [...candidates].sort((a, b) => score(b, maxQ, maxS) - score(a, maxQ, maxS))[0];
    }
  }
}

function score(e, maxQ, maxS) {
  return (e.quality / maxQ) * 0.5 + (e.speed / maxS) * 0.3 - (e.cost / 10) * 0.2;
}

// Per-task encoders: task-specific selection.
export function selectForTask({ registry, task, strategy = "balanced" } = {}) {
  return registry.bestFor({ task }) ?? selectEncoder({ registry, strategy, task });
}

// Fallback: on failure, next-best encoder.
export function fallbackEncoder({ registry, current, used = [] } = {}) {
  return registry.all().filter((e) => e.id !== current && !used.includes(e.id)).sort((a, b) => b.quality - a.quality)[0] ?? null;
}
```

**Acceptance criteria:** strategies; per-task; fallback.

### M3 — Quality monitoring

**Reference code (`src/lib/encoders/quality.js`):**

```js
// Quality metrics: retrieval quality per encoder.
export function makeQualityMonitor() {
  const samples = new Map(); // encoderId -> [{hit, at}]
  return {
    record(encoderId, hit) {
      const list = samples.get(encoderId) ?? [];
      list.push({ hit, at: Date.now() });
      samples.set(encoderId, list.slice(-200));
    },
    quality(encoderId) {
      const list = samples.get(encoderId) ?? [];
      if (!list.length) return null;
      return list.filter((s) => s.hit).length / list.length;
    },
    // Drift: quality drop vs baseline.
    drift(encoderId, baseline = 0.8) {
      const q = this.quality(encoderId);
      return q === null ? 0 : baseline - q;
    },
    report() {
      return Object.fromEntries([...samples.keys()].map((id) => [id, { quality: this.quality(id), drift: this.drift(id) }]));
    },
  };
}

// Quality alerts: degradation threshold.
export function alertCheck({ monitor, encoderId, threshold = 0.2 } = {}) {
  return monitor.drift(encoderId) >= threshold ? { alert: true, encoderId, drift: monitor.drift(encoderId) } : { alert: false };
}
```

**Acceptance criteria:** metrics; drift; alerts.

### M4 — Integration + tests

**Reference code (`src/lib/encoders/integrate.js`):**

```js
// Embedding integration: pick encoder, record quality.
export function encoderForRequest({ registry, monitor, strategy = "balanced", task = "general", maxCost = Infinity } = {}) {
  const enc = selectEncoder({ registry, strategy, task, maxCost });
  return {
    encoder: enc,
    record(hit) { if (enc) monitor.record(enc.id, hit); },
  };
}

// Fail-open: never throw from selection.
export function safeEncode(fn, fallback = null) {
  try { return fn(); } catch { return fallback; }
}
```

**Files touched:** `src/lib/encoders/` (new: registry, select, quality, integrate), `open-sse/services/embeddings.js` (integration), dashboard encoders page (new), `tests/unit/encoders.test.js` (new).

**Acceptance criteria:** integration; fail-open; tests.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Quality loss | Bad retrieval | Monitoring |
| Cost increase | Overspend | Cost-aware selection |
| Drift | Stale embeddings | Drift detection |
| Encoder failure | No embeddings | Fallback |

## Verification

- Unit: makeEncoderRegistry, selectEncoder, selectForTask, fallbackEncoder, makeQualityMonitor, alertCheck
- Manual: quality strategy → best encoder; failure → fallback
- Regression: `tests/__baseline__/verify-no-regression.mjs`