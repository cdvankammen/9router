# Implementation Plan 105 — Domain-Specialized Routing (Code, Math, Creative) — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #domains #code-routing #math-routing #specialization #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (intent classification from plan 81 (`src/lib/intent/`); tool routing from plan 80 (`src/lib/tool-routing/`); expert utilization from plan 96 (`src/lib/experts/`); quality evaluation from plan 67 (`src/lib/eval/`)).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — classify a code request; route to code model; confirm domain quality tracking.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-105-domain-specialized-routing.md`, `../research/9router/impl-plan-81-request-intent-classification.md`, `../research/9router/impl-plan-80-tool-routing-function-calling.md`.

## Scope

**In scope:** domain detection (heuristic + optional LLM classification; domains code/math/creative/analysis/general/multilingual; confidence scores; per-session cache); domain model mapping (domain → preferred models; code sub-types generation/review/debug/refactor; math-strong and creative-strong pools); domain quality tracking (per (domain, model) scores, domain leaderboards, drift); routing + combo integration; dashboard.
**Out of scope:** training domain classifiers; domain-specific prompt engineering.

## Milestones

### M1 — Domain detection

**Reference code (`src/lib/domains/classify.js`):**

```js
// Domains.
export const DOMAINS = ["code", "math", "creative", "analysis", "general", "multilingual"];

// Heuristic classifier (regex-based; optional LLM classification later).
export const DOMAIN_PATTERNS = {
  code: /\b(function|class|import|export|const|let|var|def |return|async|await|```|git |npm |docker|api|bug|error|exception)\b/i,
  math: /\b(integral|derivative|matrix|equation|theorem|proof|calculate|solve|probability|statistics|algebra)\b/i,
  creative: /\b(story|poem|essay|creative|imagine|write a|draft|brainstorm|metaphor)\b/i,
  analysis: /\b(analy|compare|evaluate|summarize|synthesize|trend|insight|report)\b/i,
  multilingual: /[\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]/,
};

export function classifyDomain(text, { patterns = DOMAIN_PATTERNS } = {}) {
  const scores = {};
  for (const [domain, re] of Object.entries(patterns)) {
    const matches = (text.match(re) ?? []).length;
    if (matches) scores[domain] = matches;
  }
  const entries = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  if (!entries.length) return { domain: "general", confidence: 0.5 };
  const [domain, count] = entries[0];
  return { domain, confidence: Math.min(0.95, 0.5 + count * 0.15) };
}

// Per-session domain cache.
export function makeSessionDomainCache({ ttlMs = 30 * 60_000 } = {}) {
  const cache = new Map(); // sessionId -> { domain, at }
  return {
    get(sessionId, now = Date.now()) {
      const e = cache.get(sessionId);
      if (!e) return null;
      if (now - e.at > ttlMs) { cache.delete(sessionId); return null; }
      return e.domain;
    },
    set(sessionId, domain, now = Date.now()) { cache.set(sessionId, { domain, at: now }); },
  };
}
```

**Acceptance criteria:** heuristic classification; confidence; session cache.

### M2 — Domain model mapping

**Reference code (`src/lib/domains/map.js`):**

```js
// Domain → preferred models.
export const DOMAIN_MODELS = {
  code: ["claude-sonnet", "gpt-4o", "deepseek-coder"],
  math: ["gpt-4o", "claude-sonnet", "gemini-pro"],
  creative: ["claude-sonnet", "gpt-4o", "llama-3"],
  analysis: ["gpt-4o", "claude-sonnet"],
  general: [],
  multilingual: ["gpt-4o", "claude-sonnet"],
};

// Code sub-types: generation, review, debug, refactor.
export const CODE_SUBTYPES = {
  generation: /\b(write|create|implement|generate|build|add)\b.*\b(function|class|component|script|module)\b/i,
  review: /\b(review|check|audit|inspect|critique)\b/i,
  debug: /\b(debug|fix|error|bug|crash|trace|stack trace)\b/i,
  refactor: /\b(refactor|clean|optimize|simplify|rename|extract)\b/i,
};

export function codeSubtype(text) {
  for (const [sub, re] of Object.entries(CODE_SUBTYPES)) {
    if (re.test(text)) return sub;
  }
  return "generation";
}

// Mapping: domain + subtype → preferred models.
export function modelsForDomain({ domain, text = "", overrides = {} } = {}) {
  if (domain === "code") {
    const sub = codeSubtype(text);
    const subMap = overrides.codeSubtypes?.[sub];
    if (subMap) return subMap;
  }
  return overrides[domain] ?? DOMAIN_MODELS[domain] ?? [];
}
```

**Acceptance criteria:** mapping; code sub-types; overrides.

### M3 — Domain quality tracking

**Reference code (`src/lib/domains/quality.js`):**

```js
// Per (domain, model) quality scores with EWMA smoothing.
export function makeDomainQuality({ alpha = 0.1 } = {}) {
  const scores = new Map(); // `${domain}:${model}` -> score
  return {
    record(domain, model, score) {
      const key = `${domain}:${model}`;
      const prev = scores.get(key);
      scores.set(key, prev == null ? score : alpha * score + (1 - alpha) * prev);
    },
    score(domain, model) { return scores.get(`${domain}:${model}`) ?? null; },
    leaderboard(domain) {
      return [...scores.entries()]
        .filter(([k]) => k.startsWith(`${domain}:`))
        .map(([k, v]) => ({ model: k.slice(domain.length + 1), score: v }))
        .sort((a, b) => b.score - a.score);
    },
    drift(domain, model, { baseline }) {
      const cur = this.score(domain, model);
      if (cur == null || baseline == null) return 0;
      return cur - baseline;
    },
  };
}
```

**Acceptance criteria:** EWMA scores; leaderboards; drift.

### M4 — Integration + tests

**Reference code (`src/lib/domains/integrate.js`):**

```js
// Routing integration: domain-aware selection.
export function selectForDomain({ domain, candidates, domainModels = DOMAIN_MODELS } = {}) {
  const preferred = domainModels[domain] ?? [];
  const ranked = [...candidates].sort((a, b) => {
    const ia = preferred.indexOf(a); const ib = preferred.indexOf(b);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });
  return ranked;
}

// Combo integration: domain-aware combos.
export function domainCombo({ domain, models }) {
  return { type: "domain", domain, models };
}

// Telemetry: domain distribution.
export function makeDomainTelemetry() {
  const counts = new Map();
  return {
    record(domain) { counts.set(domain, (counts.get(domain) ?? 0) + 1); },
    report() { return Object.fromEntries(counts); },
  };
}
```

**Files touched:** `src/lib/domains/` (new: classify, map, quality, integrate), `src/sse/handlers/chat.js` (domain integration), `open-sse/config/domainConfig.js` (new), dashboard domains page (new), `tests/unit/domains.test.js` (new).

**Acceptance criteria:** domains detected; models selected; quality tracked; view visible.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Misclassification | Wrong model | Confidence gates |
| Domain model gaps | No match | Fallback to general |
| Quality noise | Bad scores | EWMA smoothing |
| Over-specialization | Narrow routing | General fallback |

## Verification

- Unit: classifyDomain, codeSubtype, modelsForDomain, makeDomainQuality, selectForDomain
- Manual: code request → code model; debug request → debug preference
- Regression: `tests/__baseline__/verify-no-regression.mjs`