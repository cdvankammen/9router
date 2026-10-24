# Implementation Plan 117 — Enforcement Mechanism Combinations — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #enforcement #policy #layers #matrix #governance #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (rules engine from plan 88 (`src/lib/rules/`); enforcement hooks in `src/sse/handlers/chat.js`; audit log from plan 47; governance from plan 71).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — define layers; combine policies; validate matrix.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-117-enforcement-combinations.md`, `../research/9router/impl-plan-88-rule-engine-v2.md`, `../research/9router/impl-plan-71-governance.md`.

## Scope

**In scope:** enforcement layers (gateway, api, config, runtime); combination semantics (AND/OR/override/escalation); enforcement matrix (policy × layer × mechanism, validation, audit); enforcement telemetry + dashboard matrix view.
**Out of scope:** new enforcement mechanisms per layer (plan 31/32 research); policy authoring (plan 88).

## Milestones

### M1 — Enforcement layers

**Reference code (`src/lib/enforce/layers.js`):**

```js
// Enforcement layers: request entry → route → config → execution.
export const LAYERS = {
  gateway: { order: 0, name: "gateway", desc: "request entry (auth, rate limit)" },
  api: { order: 1, name: "api", desc: "route handlers (validation, authz)" },
  config: { order: 2, name: "config", desc: "config validation (schema, ranges)" },
  runtime: { order: 3, name: "runtime", desc: "execution (retry, fallback, budget)" },
};

export function layerOrder(layer) { return LAYERS[layer]?.order ?? -1; }

// Enforcement event: policy × layer × mechanism.
export function enforcementEvent({ policy, layer, mechanism, result, detail = null } = {}) {
  return { policy, layer, mechanism, result, detail, at: Date.now() };
}
```

**Acceptance criteria:** layers defined; events shaped.

### M2 — Combination semantics

**Reference code (`src/lib/enforce/combine.js`):**

```js
// AND: all layers must pass.
export function andCombine(results) { return results.every((r) => r.result === "pass"); }

// OR: any layer can enforce.
export function orCombine(results) { return results.some((r) => r.result === "pass"); }

// Override: higher layer overrides lower.
export function overrideCombine(results) {
  const sorted = [...results].sort((a, b) => layerOrder(b.layer) - layerOrder(a.layer));
  return sorted[0]?.result ?? "pass";
}

// Escalation: failure escalates to next layer.
export function escalate(results, { onFail = "block" } = {}) {
  for (const r of results) {
    if (r.result === "fail") return { escalated: true, at: r.layer, action: onFail };
  }
  return { escalated: false };
}

// Precedence: explicit order wins.
export function precedence(layer) { return layerOrder(layer); }
```

**Acceptance criteria:** AND/OR/override/escalation semantics.

### M3 — Enforcement matrix

**Reference code (`src/lib/enforce/matrix.js`):**

```js
// Matrix model: policy × layer × mechanism.
export function makeMatrix() {
  const cells = new Map(); // `${policy}:${layer}` -> mechanism
  return {
    set(policy, layer, mechanism) { cells.set(`${policy}:${layer}`, mechanism); },
    get(policy, layer) { return cells.get(`${policy}:${layer}`) ?? null; },
    // Validation: every policy covered by at least one layer.
    validate(policies, layers = Object.keys(LAYERS)) {
      const uncovered = policies.filter((p) => !layers.some((l) => this.get(p, l)));
      return { ok: uncovered.length === 0, uncovered };
    },
    // Audit: enforcement coverage per policy.
    audit(policies) {
      return policies.map((p) => ({
        policy: p,
        layers: Object.keys(LAYERS).filter((l) => this.get(p, l)),
        covered: Object.keys(LAYERS).some((l) => this.get(p, l)),
      }));
    },
  };
}
```

**Acceptance criteria:** matrix; validation; audit.

### M4 — Telemetry + integration + tests

**Reference code (`src/lib/enforce/telemetry.js`):**

```js
// Enforcement telemetry: per-layer events + gaps.
export function makeEnforceTelemetry() {
  const events = [];
  return {
    record(evt) { events.push(evt); },
    report() {
      const byLayer = {};
      for (const l of Object.keys(LAYERS)) byLayer[l] = events.filter((e) => e.layer === l).length;
      const fails = events.filter((e) => e.result === "fail");
      return { byLayer, total: events.length, failures: fails.length, failureRate: events.length ? fails.length / events.length : 0 };
    },
  };
}

// Integration: run a policy through all layers.
export function enforce(policy, { layerFns = {} } = {}) {
  const results = Object.keys(LAYERS)
    .filter((l) => layerFns[l])
    .map((l) => ({ layer: l, result: layerFns[l](policy) }));
  return { policy, results, combined: andCombine(results) };
}
```

**Files touched:** `src/lib/enforce/` (new: layers, combine, matrix, telemetry), `src/lib/rules/` (integration), `src/sse/handlers/chat.js` (enforcement hooks), dashboard enforce page (new), `tests/unit/enforce.test.js` (new).

**Acceptance criteria:** telemetry; integration; tests.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Enforcement gaps | Uncovered policies | Matrix audit |
| Double enforcement | Conflicting results | Combination semantics |
| Override confusion | Wrong precedence | Clear layer order |
| Telemetry noise | Event flood | Aggregation |

## Verification

- Unit: andCombine, orCombine, overrideCombine, escalate, makeMatrix, enforce
- Manual: policy enforced at gateway + runtime; matrix audit shows coverage
- Regression: `tests/__baseline__/verify-no-regression.mjs`