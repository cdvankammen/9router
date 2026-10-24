# Implementation Plan 108 — Hybrid Rule-Based + Learned Routing with Explainability — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #hybrid-routing #explainability #learned-routing #decision-trace #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (learned routing from plan 1 research; rule engine from plan 88 (`src/lib/rules/`); calibration from plan 82 (`src/lib/calibration/`); request tracing from plan 66 (`src/lib/tracing/`)).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — hybrid decision; rule precedence; learned weight update; explanation endpoint.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-108-hybrid-routing-explainability.md`, `../research/9router/impl-plan-88-routing-rule-engine-v2.md`, `../research/9router/impl-plan-82-router-calibration-confidence.md`.

## Scope

**In scope:** hybrid framework (decision = f(rules, learned_weights, context)); rule layer (hard rules always enforced, soft rules weighted, rule effectiveness metrics); learned layer (per (context, model) scores from feedback/outcomes/calibration, Bayesian/EWMA updates); explainability (decision trace recording contributing factors, human-readable explanations, per-decision explanation API, dashboard decision inspector); routing integration + observability.
**Out of scope:** training learned models offline; cross-instance learned state (plan 70).

## Milestones

### M1 — Hybrid framework

**Reference code (`src/lib/hybrid/framework.js`):**

```js
// Hybrid decision: rules (hard) + learned (soft) + context.
export function hybridDecision({ rules, learned, context, trace = true } = {}) {
  const traceLog = [];
  // 1. Hard rules: always enforced.
  for (const rule of rules.hard ?? []) {
    const hit = rule.matches(context);
    if (hit) {
      traceLog.push({ layer: "rule", rule: rule.name, effect: rule.effect, hard: true });
      if (rule.effect === "block") return { decision: "block", reason: rule.name, trace: traceLog };
      if (rule.effect === "force") return { decision: "force", model: rule.model, reason: rule.name, trace: traceLog };
    }
  }
  // 2. Soft rules: weighted preferences.
  let softScore = 0;
  for (const rule of rules.soft ?? []) {
    if (rule.matches(context)) {
      softScore += rule.weight ?? 1;
      traceLog.push({ layer: "rule", rule: rule.name, weight: rule.weight ?? 1, hard: false });
    }
  }
  // 3. Learned weights: per (context, model) scores.
  const scored = (learned.candidates ?? []).map((m) => {
    const w = learned.score?.(m, context) ?? 0;
    traceLog.push({ layer: "learned", model: m, score: w });
    return { model: m, score: w + softScore };
  }).sort((a, b) => b.score - a.score);
  const decision = scored[0] ?? null;
  return { decision: decision?.model ?? null, score: decision?.score ?? 0, trace: trace ? traceLog : null };
}
```

**Acceptance criteria:** hard rules enforced; soft weighted; learned scored.

### M2 — Rule layer

**Reference code (`src/lib/hybrid/rules.js`):**

```js
// Rule helpers: hard + soft.
export function hardRule({ name, matches, effect = "block", model = null } = {}) {
  return { name, matches, effect, model, hard: true };
}

export function softRule({ name, matches, weight = 1 } = {}) {
  return { name, matches, weight, hard: false };
}

// Rule effectiveness metrics.
export function makeRuleMetrics() {
  const stats = new Map(); // ruleName -> { hits, outcomes }
  return {
    record(ruleName, { applied, ok = null } = {}) {
      const s = stats.get(ruleName) ?? { hits: 0, outcomes: [] };
      if (applied) s.hits += 1;
      if (ok != null) s.outcomes.push(ok ? 1 : 0);
      stats.set(ruleName, s);
    },
    report() {
      return Object.fromEntries([...stats.entries()].map(([n, s]) => [
        n,
        { hits: s.hits, successRate: s.outcomes.length ? s.outcomes.reduce((a, b) => a + b, 0) / s.outcomes.length : null },
      ]));
    },
  };
}
```

**Acceptance criteria:** rule helpers; effectiveness metrics.

### M3 — Learned layer

**Reference code (`src/lib/hybrid/learned.js`):**

```js
// Learned weights: per (context, model) scores with EWMA updates.
export function makeLearnedWeights({ alpha = 0.1 } = {}) {
  const weights = new Map(); // `${contextKey}:${model}` -> score
  return {
    score(model, context) {
      const key = `${contextKey(context)}:${model}`;
      return weights.get(key) ?? 0;
    },
    update(model, context, outcome) {
      const key = `${contextKey(context)}:${model}`;
      const prev = weights.get(key) ?? 0;
      weights.set(key, alpha * outcome + (1 - alpha) * prev);
      return weights.get(key);
    },
    all() { return Object.fromEntries(weights); },
  };
}

// Bayesian-style update (Beta).
export function betaUpdate({ alpha = 1, beta = 1, ok } = {}) {
  if (ok) alpha += 1; else beta += 1;
  return { alpha, beta, mean: alpha / (alpha + beta) };
}

function contextKey(context) {
  return `${context.route ?? ""}|${context.taskType ?? ""}|${context.userId ?? ""}`;
}
```

**Acceptance criteria:** EWMA weights; Beta updates.

### M4 — Explainability + integration + tests

**Reference code (`src/lib/hybrid/explain.js`):**

```js
// Decision trace → human-readable explanation.
export function explain(trace) {
  if (!trace) return "no trace recorded";
  const parts = trace.map((t) => {
    if (t.hard) return `rule "${t.rule}" (hard, effect=${t.effect})`;
    if (t.layer === "rule") return `rule "${t.rule}" (soft, weight=${t.weight})`;
    return `learned score ${t.score.toFixed(3)} for ${t.model}`;
  });
  return parts.join("; ");
}

// Explanation API payload.
export function explanationPayload({ requestId, decision, trace }) {
  return { requestId, decision, explanation: explain(trace), trace };
}

// Trace sampling: cap stored traces.
export function shouldTrace({ sampleRate = 0.1, rand = Math.random } = {}) {
  return rand() < sampleRate;
}
```

**Files touched:** `src/lib/hybrid/` (new: framework, rules, learned, explain), `src/sse/handlers/chat.js` (hybrid integration), `src/app/api/v1/explain/route.js` (new endpoint), `open-sse/config/hybridConfig.js` (new), dashboard hybrid page (new), `tests/unit/hybrid.test.js` (new).

**Acceptance criteria:** hybrid decisions; rules enforced; weights adapt; decisions explainable.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Rule/learned conflict | Wrong decisions | Rule precedence |
| Explanation cost | Overhead | Trace sampling |
| Learned instability | Wild swings | Smoothing |
| Opacity | No auditability | Decision traces |

## Verification

- Unit: hybridDecision, hardRule, makeLearnedWeights, explain, explanationPayload
- Manual: block rule → decision blocked with trace; learned update → re-rank
- Regression: `tests/__baseline__/verify-no-regression.mjs`