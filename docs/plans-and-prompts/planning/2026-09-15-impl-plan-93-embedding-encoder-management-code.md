# Implementation Plan 93 — Embedding Encoder Management & Similarity Thresholds — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #embeddings #encoders #similarity #ann-index #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (embedding infrastructure from plan 28 research; RAG retrieval from plan 84 (`src/lib/rag/`); semantic routing from plan 3 research).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — register encoders; select per use-case; tune a threshold; build an index.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-93-embedding-encoder-management.md`, `../research/9router/impl-plan-84-rag-cascade-retrieval.md`, `../research/9router/impl-plan-28-embeddings.md`.

## Scope

**In scope:** encoder registry (id, provider, dimensions, cost, quality score, latency; per-use-case selection; fallback); quality evaluation (retrieval benchmarks, domain fit, production telemetry); similarity thresholds (per-use-case config, calibration from outcome data, dashboard tuning); ANN index management (HNSW/IVF/flat, build/update/rebuild lifecycle, recall/latency/memory metrics); semantic routing + RAG integration.
**Out of scope:** training/fine-tuning encoders; vector DB provisioning.

## Milestones

### M1 — Encoder registry

**Reference code (`src/lib/embeddings/encoders.js`):**

```js
// Encoder registry: id, provider, dimensions, cost, quality, latency.
export const ENCODERS = new Map();

export function registerEncoder(enc) {
  ENCODERS.set(enc.id, { ...enc, registeredAt: new Date().toISOString() });
}

export function encoderFor(useCase, { prefer = null } = {}) {
  if (prefer && ENCODERS.has(prefer)) return ENCODERS.get(prefer);
  const candidates = [...ENCODERS.values()].filter((e) => (e.useCases ?? []).includes(useCase));
  if (!candidates.length) return null;
  // Score: quality primary, then cost, then latency.
  return candidates.sort((a, b) =>
    (b.quality ?? 0) - (a.quality ?? 0) ||
    (a.cost ?? 0) - (b.cost ?? 0) ||
    (a.latencyMs ?? 0) - (b.latencyMs ?? 0)
  )[0];
}

// Fallback chain: try primary, then fallbacks in order.
export async function embedWithFallback({ useCase, embed, fallbacks = [] }) {
  const primary = encoderFor(useCase);
  const chain = [primary, ...fallbacks.map((f) => ENCODERS.get(f))].filter(Boolean);
  let lastErr = null;
  for (const enc of chain) {
    try { return { ok: true, encoder: enc.id, vector: await embed(enc) }; }
    catch (err) { lastErr = err; }
  }
  return { ok: false, error: lastErr?.message ?? "no encoders available" };
}
```

**Acceptance criteria:** encoders registered; per-use-case selection; fallback chain.

### M2 — Quality evaluation

**Reference code (`src/lib/embeddings/quality.js`):**

```js
// Retrieval benchmark: recall@k per encoder.
export function evaluateRecall({ encoderId, queries, corpus, embed, k = 5 }) {
  const vectors = new Map();
  let hits = 0, total = 0;
  for (const q of queries) {
    const qv = embed(q.text);
    const scored = corpus.map((doc) => ({ doc, sim: cosine(qv, embed(doc.text)) }))
      .sort((a, b) => b.sim - a.sim).slice(0, k);
    const relevant = new Set(q.relevantIds ?? []);
    hits += scored.filter((s) => relevant.has(s.doc.id)).length;
    total += Math.min(k, relevant.size || 1);
  }
  return { encoderId, recallAtK: total ? hits / total : 0, k, n: queries.length };
}

// Domain fit: per-domain quality scores.
export function domainFit(encoderId, { domainScores = {} } = {}) {
  return { encoderId, domains: domainScores };
}

// Production telemetry: rolling quality proxy (e.g., downstream task success).
export function makeQualityTelemetry({ window = 100 } = {}) {
  const recent = [];
  return {
    record(ok) { recent.push(ok ? 1 : 0); if (recent.length > window) recent.shift(); },
    rate() { return recent.length ? recent.reduce((a, b) => a + b, 0) / recent.length : null; },
  };
}

export function cosine(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1e-9);
}
```

**Acceptance criteria:** recall@k computed; domain fit; telemetry.

### M3 — Similarity thresholds

**Reference code (`src/lib/embeddings/thresholds.js`):**

```js
// Per-use-case similarity thresholds.
export const DEFAULT_THRESHOLDS = { routing: 0.6, rag: 0.55, search: 0.5, dedupe: 0.85 };

export function thresholdFor(useCase, overrides = {}) {
  return overrides[useCase] ?? DEFAULT_THRESHOLDS[useCase] ?? 0.5;
}

// Calibration from outcome data: adjust threshold toward observed match quality.
export function calibrateThreshold({ useCase, outcomes, current, step = 0.01, min = 0.3, max = 0.95 } = {}) {
  // outcomes: [{ sim, good }]
  const good = outcomes.filter((o) => o.good);
  const bad = outcomes.filter((o) => !o.good);
  const goodMean = good.length ? good.reduce((a, o) => a + o.sim, 0) / good.length : current;
  const badMean = bad.length ? bad.reduce((a, o) => a + o.sim, 0) / bad.length : current;
  const target = (goodMean + badMean) / 2;
  return Math.min(max, Math.max(min, Number(target.toFixed(3))));
}

// Histogram for dashboard tuning.
export function histogram(sims, { bins = 20, min = 0, max = 1 } = {}) {
  const out = new Array(bins).fill(0);
  for (const s of sims) {
    const i = Math.min(bins - 1, Math.floor(((s - min) / (max - min)) * bins));
    if (i >= 0) out[i] += 1;
  }
  return out;
}
```

**Acceptance criteria:** per-use-case thresholds; calibration; histogram.

### M4 — ANN index management + integration + tests

**Reference code (`src/lib/embeddings/indexes.js`):**

```js
// ANN index lifecycle: build, update, rebuild.
export function makeIndex({ type = "flat", metric = "cosine" } = {}) {
  const items = []; // { id, vector }
  return {
    type, metric,
    add(id, vector) { items.push({ id, vector }); },
    build() { return { ok: true, type, size: items.length }; }, // flat: no-op build
    search(vector, k = 5) {
      return items
        .map((it) => ({ id: it.id, sim: cosine(vector, it.vector) }))
        .sort((a, b) => b.sim - a.sim).slice(0, k);
    },
    stats() { return { type, size: items.length, memoryBytes: items.reduce((a, it) => a + it.vector.length * 4, 0) }; },
  };
}

// Index metrics: recall vs. brute force.
export function indexRecall(index, queries, { k = 5 } = {}) {
  const brute = makeIndex({ type: "flat" });
  // (in real impl, brute force over the same corpus)
  let hits = 0, total = 0;
  for (const q of queries) {
    const ann = index.search(q.vector, k).map((r) => r.id);
    const exact = brute.search(q.vector, k).map((r) => r.id);
    hits += ann.filter((id) => exact.includes(id)).length;
    total += k;
  }
  return total ? hits / total : 0;
}

function cosine(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1e-9);
}
```

**Files touched:** `src/lib/embeddings/` (new: encoders, quality, thresholds, indexes), `src/lib/semantic/` (integration), `src/lib/rag/` (integration), `open-sse/config/encoderConfig.js` (new), dashboard encoders page (new), `tests/unit/encoders.test.js` (new).

**Acceptance criteria:** encoders per use-case; quality metrics; tunable thresholds; managed indexes.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Encoder mismatch | Wrong embeddings | Per-use-case selection |
| Threshold drift | Bad matches | Calibration from outcomes |
| Index staleness | Stale results | Rebuild schedules |
| Cost | Expensive encoders | Cost tracking + fallback |

## Verification

- Unit: encoderFor, embedWithFallback, evaluateRecall, calibrateThreshold, makeIndex
- Manual: register 2 encoders → select per use-case → tune threshold with histogram
- Regression: `tests/__baseline__/verify-no-regression.mjs`