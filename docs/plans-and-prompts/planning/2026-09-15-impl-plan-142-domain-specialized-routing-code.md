# Implementation Plan 142 — Domain-Specialized Routing (Code/Math/Vision) — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #domains #code #math #vision #specialization #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (task classification from plan 56 (`src/lib/tasks/`); domain routing from plan 105 (`src/lib/domains/`); intent classification from plan 81; capability matching from plan 104 (`src/lib/capabilities/`); pre-routing in `open-sse/handlers/chatCore.js`).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — domain detection; specialized routing; fallback.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-142-domain-specialized-routing.md`, `../research/9router/impl-plan-105-domain-specialized-routing.md`, `../research/9router/impl-plan-56-task-classification-intent.md`.

## Scope

**In scope:** domain detection (code/math/vision/general classifier, keyword/structure/modality signals, calibrated confidence); domain model registry (code/math/vision/general model lists); domain routing (domain → model mapping, general fallback, mixed-domain handling); pre-routing integration + dashboard domain view.
**Out of scope:** task classification internals (plan 56); capability matching (plan 104).

## Milestones

### M1 — Domain detection

**Reference code (`src/lib/domains/detect.js`):**

```js
// Domain classifier: code/math/vision/general.
export const DOMAINS = ["code", "math", "vision", "general"];

// Domain signals: keywords, structure, modality.
export const DOMAIN_PATTERNS = {
  code: [/function|class|import|export|const |let |def |=>|```|debug|compile|syntax|api|sql|regex/i],
  math: [/solve|equation|integral|derivative|proof|theorem|calculate|compute|algebra|calculus|probability|statistics/i],
  vision: [/image|picture|photo|diagram|chart|screenshot|ocr|visual|see this|look at/i],
};

export function detectDomain({ text = "", hasImage = false, patterns = DOMAIN_PATTERNS } = {}) {
  if (hasImage) return { domain: "vision", confidence: 0.9, signals: ["image-modality"] };
  const hits = Object.entries(patterns)
    .map(([domain, res]) => ({ domain, count: res.filter((re) => re.test(text)).length }))
    .filter((h) => h.count > 0)
    .sort((a, b) => b.count - a.count);
  if (!hits.length) return { domain: "general", confidence: 0.5, signals: [] };
  const top = hits[0];
  return { domain: top.domain, confidence: Math.min(0.95, 0.5 + top.count * 0.15), signals: hits.map((h) => `${h.domain}:${h.count}`) };
}

// Mixed-domain: multiple domains above threshold.
export function mixedDomains({ text = "", patterns = DOMAIN_PATTERNS, threshold = 2 } = {}) {
  return Object.entries(patterns)
    .filter(([, res]) => res.filter((re) => re.test(text)).length >= threshold)
    .map(([d]) => d);
}
```

**Acceptance criteria:** classifier; confidence; mixed detection.

### M2 — Domain model registry

**Reference code (`src/lib/domains/registry.js`):**

```js
// Domain model registry: per-domain model lists.
export function makeDomainRegistry() {
  const lists = new Map(); // domain -> [modelIds]
  return {
    set(domain, models) { lists.set(domain, models); },
    modelsFor(domain) { return lists.get(domain) ?? []; },
    // General fallback: models usable for any domain.
    general() { return lists.get("general") ?? []; },
    // Availability: is a model registered for a domain?
    has(domain, modelId) { return this.modelsFor(domain).includes(modelId); },
    all() { return Object.fromEntries(lists); },
  };
}

// Domain → model mapping.
export function mapDomain({ domain, registry, candidates = [] } = {}) {
  const specialized = registry.modelsFor(domain).filter((m) => candidates.includes(m));
  return specialized.length ? specialized : registry.general().filter((m) => candidates.includes(m));
}
```

**Acceptance criteria:** per-domain lists; mapping; fallback.

### M3 — Domain routing

**Reference code (`src/lib/domains/route.js`):**

```js
// Domain routing: domain → model selection.
export function selectForDomain({ domain, registry, candidates, confidence = 0.5, minConfidence = 0.6 } = {}) {
  if (confidence < minConfidence) return { source: "general", models: registry.general().filter((m) => candidates.includes(m)) };
  const models = mapDomain({ domain, registry, candidates });
  return { source: models.length ? "specialized" : "general", models };
}

// Domain fallback: general model fallback.
export function fallbackToGeneral({ specialized = [], general = [] } = {}) {
  return specialized.length ? specialized : general;
}

// Mixed-domain: route to intersection or general.
export function routeMixed({ domains = [], registry, candidates } = {}) {
  const intersections = domains.map((d) => registry.modelsFor(d).filter((m) => candidates.includes(m)));
  const common = intersections.reduce((a, b) => a.filter((m) => b.includes(m)));
  return common.length ? common : registry.general().filter((m) => candidates.includes(m));
}
```

**Acceptance criteria:** selection; fallback; mixed routing.

### M4 — Integration + telemetry + tests

**Reference code (`src/lib/domains/integrate.js`):**

```js
// Pre-routing: domain detection before selection.
export function preRouteDomain({ text, hasImage, registry, candidates } = {}) {
  const { domain, confidence } = detectDomain({ text, hasImage });
  return selectForDomain({ domain, registry, candidates, confidence });
}

// Telemetry: domain view.
export function makeDomainTelemetry() {
  const events = [];
  return {
    record(evt) { events.push({ ...evt, at: Date.now() }); },
    report() {
      return {
        byDomain: events.reduce((acc, e) => { acc[e.domain] = (acc[e.domain] ?? 0) + 1; return acc; }, {}),
        specialized: events.filter((e) => e.source === "specialized").length,
        general: events.filter((e) => e.source === "general").length,
        avgConfidence: events.length ? events.reduce((a, e) => a + (e.confidence ?? 0), 0) / events.length : null,
      };
    },
  };
}
```

**Files touched:** `src/lib/domains/` (new: detect, registry, route, integrate), `open-sse/handlers/chatCore.js` (pre-routing), dashboard domains page (new), `tests/unit/domains.test.js` (new).

**Acceptance criteria:** integration; telemetry; tests.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Misclassification | Wrong routing | Confidence thresholds |
| Domain gaps | No specialized model | General fallback |
| Mixed queries | Ambiguous routing | Mix handling |
| Model availability | Missing models | Registry checks |

## Verification

- Unit: detectDomain, mixedDomains, makeDomainRegistry, selectForDomain, routeMixed, preRouteDomain
- Manual: code query → code model; image → vision model; unknown → general
- Regression: `tests/__baseline__/verify-no-regression.mjs`