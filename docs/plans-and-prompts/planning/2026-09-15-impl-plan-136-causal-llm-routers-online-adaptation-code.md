# Implementation Plan 136 — Causal LLM Routers & Online Adaptation — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #causal #routing #online #adaptation #learned #counterfactual #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (learned routing from plan 1 (`src/lib/learned/`); online adaptation from plan 41 research; calibration from plan 82 (`src/lib/calibration/`); offline RL from plan 132; feedback from plan 83).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — causal model; online adaptation; OOD detection.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-136-causal-llm-routers-online-adaptation.md`, `../research/9router/impl-plan-41-learned-routing.md`, `../research/9router/impl-plan-132-pomdp-self-verification-routing.md`.

## Scope

**In scope:** causal model (causal graph query features → model performance; feature extraction query complexity/domain/format; intervention do-calculus; counterfactual what-if analysis); online adaptation (feedback loop route → response → quality signal; incremental causal model update; stability anti-oscillation; explore/exploit); OOD + drift (distribution shift detection, graceful degradation, concept drift); integration + dashboard causal view.
**Out of scope:** POMDP belief-state machinery (plan 132); RTK internals (plan 129).

## Milestones

### M1 — Causal model

**Reference code (`src/lib/causal/model.js`):**

```js
// Causal graph: query features → model performance.
export function makeCausalModel({ nodes = [], edges = [] } = {}) {
  const nodeSet = new Set(nodes);
  const edgeMap = new Map(); // parent -> [children]
  for (const [p, c] of edges) {
    if (!nodeSet.has(p) || !nodeSet.has(c)) throw new Error("causal edge references unknown node");
    if (!edgeMap.has(p)) edgeMap.set(p, []);
    edgeMap.get(p).push(c);
  }
  return {
    // Intervention: do(node = value) — set node and propagate.
    intervene(node, value, { values = new Map() } = {}) {
      const next = new Map(values); next.set(node, value);
      // Propagate: recompute descendants.
      const stack = [...(edgeMap.get(node) ?? [])];
      while (stack.length) {
        const n = stack.shift();
        next.set(n, compute(n, next)); // compute per-node function
        stack.push(...(edgeMap.get(n) ?? []));
      }
      return next;
    },
    // Counterfactual: what-if analysis.
    counterfactual({ observed, intervened, values = new Map() } = {}) {
      // Keep exogenous noise, swap intervened nodes.
      const cf = new Map(values);
      for (const [n, v] of observed) if (!intervened.includes(n)) cf.set(n, v);
      for (const n of intervened) cf.set(n, compute(n, cf));
      return cf;
    },
    // do-calculus: identify causal effect.
    identify({ treatment, outcome, graph = this } = {}) {
      // Backdoor adjustment: adjust for confounders.
      const confounders = backdoorSet(graph, treatment, outcome);
      return { estimand: `P(${outcome} | do(${treatment})) = Σ_conf P(${outcome} | ${treatment}, conf) P(conf)`, confounders };
    },
  };
}

// Backdoor set: minimal set blocking all backdoor paths.
export function backdoorSet(graph, treatment, outcome) {
  // Simplified: parents of treatment block confounding.
  const parents = [...graph.edges()].filter(([, c]) => c === treatment).map(([p]) => p);
  return [...new Set(parents)];
}

// Feature extraction: query → causal features.
export function extractFeatures(query, { maxLen = 512 } = {}) {
  const text = typeof query === "string" ? query.slice(0, maxLen) : "";
  return {
    complexity: text.length > 200 ? "high" : text.length > 60 ? "medium" : "low",
    domain: /code|debug|function|api|sql/.test(text) ? "code" : /translat|summar|rewrite/.test(text) ? "language" : "general",
    format: /json|xml|yaml|table/.test(text) ? "structured" : "freeform",
    hasTools: /tool|function|call/.test(text),
  };
}
```

**Acceptance criteria:** graph; intervention; counterfactual; identification.

### M2 — Online adaptation

**Reference code (`src/lib/causal/adapt.js`):**

```js
// Feedback loop: route → response → quality signal.
export function makeLearner({ graph, alpha = 0.05, stabilityWindow = 10 } = {}) {
  let beliefs = new Map(); // node -> value
  const history = [];
  return {
    // Update: incremental causal update from feedback.
    update({ route, quality, features } = {}) {
      const effect = quality - (beliefs.get("baseline") ?? 0.5);
      for (const [feature, val] of Object.entries(features ?? {})) {
        const key = `${feature}:${val}`;
        beliefs.set(key, (beliefs.get(key) ?? 0.5) + alpha * (effect - (beliefs.get(key) ?? 0.5)));
      }
      history.push({ route, quality, features, at: Date.now() });
      return beliefs;
    },
    // Stability: anti-oscillation — check recent variance.
    stable() {
      if (history.length < stabilityWindow) return true;
      const recent = history.slice(-stabilityWindow).map((h) => h.quality);
      const mean = recent.reduce((a, b) => a + b, 0) / recent.length;
      const variance = recent.reduce((a, b) => a + (b - mean) ** 2, 0) / recent.length;
      return variance < 0.05;
    },
    // Explore/exploit: epsilon-greedy with decay.
    explore({ epsilon = 0.1, step = 0 } = {}) {
      const eps = epsilon * Math.max(0.1, 1 - step / 1000);
      return Math.random() < eps ? "explore" : "exploit";
    },
    predict(features) {
      // Score: sum of learned feature effects.
      let score = beliefs.get("baseline") ?? 0.5;
      for (const [feature, val] of Object.entries(features ?? {})) score += beliefs.get(`${feature}:${val}`) ?? 0;
      return score;
    },
  };
}
```

**Acceptance criteria:** incremental; stability; explore/exploit; prediction.

### M3 — OOD + drift

**Reference code (`src/lib/causal/ood.js`):**

```js
// OOD: distribution shift detection.
export function makeOodDetector({ reference = [], threshold = 0.1 } = {}) {
  // Reference distribution: feature centroids.
  const centroids = new Map(); // feature:value -> count
  for (const f of reference) for (const [k, v] of Object.entries(f)) centroids.set(`${k}:${v}`, (centroids.get(`${k}:${v}`) ?? 0) + 1);
  const total = Math.max(1, reference.length);
  return {
    // Score: distance from reference distribution.
    score(features) {
      let mass = 0;
      for (const [k, v] of Object.entries(features)) {
        const p = (centroids.get(`${k}:${v}`) ?? 0) / total;
        mass += p === 0 ? 1 : -Math.log(p); // low mass → OOD
      }
      return mass / Math.max(1, Object.keys(features).length);
    },
    // Detection: score above threshold.
    detect(features, { threshold: t = threshold } = {}) {
      const s = this.score(features);
      return { ood: s > t, score: s };
    },
  };
}

// Graceful degradation: fallback on OOD.
export function degrade({ ood = false, primary = null, fallback = null } = {}) {
  if (!ood) return { use: primary ?? "primary", degraded: false };
  return { use: fallback ?? "conservative", degraded: true };
}

// Concept drift: EWMA on error rate.
export function driftDetector({ alpha = 0.05, threshold = 0.2 } = {}) {
  let ewma = null;
  return {
    record(ok) {
      ewma = ewma == null ? (ok ? 0 : 1) : alpha * (ok ? 0 : 1) + (1 - alpha) * ewma;
      return { drift: ewma > threshold, errorRate: ewma };
    },
  };
}
```

**Acceptance criteria:** OOD scoring; degradation; drift.

### M4 — Integration + telemetry + tests

**Reference code (`src/lib/causal/integrate.js`):**

```js
// Pre-routing: causal prediction before provider selection.
export function preRoute({ learner, features, rules = null } = {}) {
  const score = learner.predict(features);
  const action = learner.explore({});
  return { score, action, useCausal: action === "exploit" || (rules?.["use-causal"] ?? true) };
}

// Telemetry: causal routing view.
export function makeCausalTelemetry() {
  const events = [];
  return {
    record(evt) { events.push({ ...evt, at: Date.now() }); },
    report() {
      return {
        routed: events.filter((e) => e.action === "route").length,
        explored: events.filter((e) => e.action === "explore").length,
        ood: events.filter((e) => e.ood).length,
        driftEvents: events.filter((e) => e.drift).length,
        avgScore: events.length ? events.reduce((a, e) => a + (e.score ?? 0), 0) / events.length : null,
      };
    },
  };
}
```

**Files touched:** `src/lib/causal/` (new: model, adapt, ood, integrate), `open-sse/handlers/chat.js` (pre-routing hooks), dashboard causal page (new), `tests/unit/causal.test.js` (new).

**Acceptance criteria:** integration; telemetry; tests.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Causal misspecification | Wrong effects | Validation |
| Adaptation instability | Oscillation | Stability checks |
| OOD blindness | Wrong routing | Detection |
| Feedback noise | Bad updates | Quality filtering |

## Verification

- Unit: makeCausalModel, intervene, counterfactual, identify, makeLearner, makeOodDetector, driftDetector, preRoute
- Manual: feature shift → OOD detected → conservative route
- Regression: `tests/__baseline__/verify-no-regression.mjs`