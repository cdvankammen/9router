# Implementation Plan 121 — Divergence & Malformed Response Handling — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #divergence #malformed #repair #validation #schema #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (executors in `open-sse/executors/*`; translators in `open-sse/translator/*`; error taxonomy from plan 89 (`open-sse/errors/`); request normalization from plan 52).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — detect divergence; repair; retry on fatal.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-121-divergence-malformed-handling.md`, `../research/9router/impl-plan-89-error-classification-retry.md`, `../research/9router/impl-plan-52-request-normalization.md`.

## Scope

**In scope:** divergence detection (schema validation, types missing/wrong-type/extra/wrong-encoding, severity fatal/warn/ignore); malformed handling (repair strategies field defaults/type coercion/truncation, retry on fatal, fallback on repeated); repair pipeline (detect → classify → repair → validate, logging, per-provider repair rate); executor + translator integration + dashboard divergence view.
**Out of scope:** unified error system internals (plan 19); error taxonomy (plan 89).

## Milestones

### M1 — Divergence detection

**Reference code (`src/lib/divergence/detect.js`):**

```js
// Divergence types + severity.
export const DIVERGENCE_TYPES = ["missing-field", "wrong-type", "extra-field", "wrong-encoding"];
export const SEVERITY = { fatal: 2, warn: 1, ignore: 0 };

// Schema validation: validate response against expected schema.
export function validateAgainstSchema(response, schema) {
  const issues = [];
  for (const [field, expected] of Object.entries(schema)) {
    const value = response?.[field];
    if (value === undefined) issues.push({ type: "missing-field", field, severity: expected.required ? "fatal" : "warn" });
    else if (expected.type && typeof value !== expected.type) issues.push({ type: "wrong-type", field, severity: "warn", expected: expected.type, got: typeof value });
  }
  for (const field of Object.keys(response ?? {})) {
    if (!(field in schema)) issues.push({ type: "extra-field", field, severity: "ignore" });
  }
  return issues;
}

// Severity: worst issue wins.
export function worstSeverity(issues) {
  return issues.reduce((w, i) => (SEVERITY[i.severity] > SEVERITY[w] ? i.severity : w), "ignore");
}
```

**Acceptance criteria:** schema validation; severity classification.

### M2 — Malformed handling

**Reference code (`src/lib/divergence/repair.js`):**

```js
// Repair strategies: field defaults, type coercion, truncation.
export function repairResponse(response, issues, { defaults = {}, coerce = {} } = {}) {
  const out = { ...response };
  for (const issue of issues) {
    if (issue.type === "missing-field" && issue.field in defaults) out[issue.field] = defaults[issue.field];
    if (issue.type === "wrong-type" && issue.field in coerce) {
      const v = out[issue.field];
      out[issue.field] = coerce[issue.field](v);
    }
    if (issue.type === "wrong-encoding" && typeof out[issue.field] === "string") {
      out[issue.field] = out[issue.field].replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, ""); // strip control chars
    }
  }
  return out;
}

// Retry triggers: fatal malformation → retry.
export function shouldRetry(issues, { maxRetries = 2, attempt = 0 } = {}) {
  return worstSeverity(issues) === "fatal" && attempt < maxRetries;
}

// Fallback triggers: repeated malformation → fallback model.
export function shouldFallback(issues, { consecutive = 0, threshold = 3 } = {}) {
  return worstSeverity(issues) === "fatal" && consecutive >= threshold;
}
```

**Acceptance criteria:** repair; retry trigger; fallback trigger.

### M3 — Repair pipeline

**Reference code (`src/lib/divergence/pipeline.js`):**

```js
// Pipeline: detect → classify → repair → validate.
export function repairPipeline(response, schema, { defaults, coerce } = {}) {
  const issues = validateAgainstSchema(response, schema);
  const repaired = repairResponse(response, issues, { defaults, coerce });
  const after = validateAgainstSchema(repaired, schema);
  return {
    issues, repaired, ok: worstSeverity(after) !== "fatal",
    trace: { before: issues.length, after: after.length, repaired: issues.length - after.length },
  };
}

// Repair metrics: repair rate per provider.
export function makeRepairMetrics() {
  const stats = new Map(); // providerId -> { total, repaired }
  return {
    record(providerId, { repaired = false } = {}) {
      const s = stats.get(providerId) ?? { total: 0, repaired: 0 };
      s.total += 1; if (repaired) s.repaired += 1;
      stats.set(providerId, s);
    },
    report() {
      return Object.fromEntries([...stats.entries()].map(([k, v]) => [k, { ...v, rate: v.total ? v.repaired / v.total : 0 }]));
    },
  };
}
```

**Acceptance criteria:** pipeline; logging; metrics.

### M4 — Integration + tests

**Reference code (`src/lib/divergence/integrate.js`):**

```js
// Executor integration: unified validation in executors.
export function validateExecutorResponse(executorId, response, schema, { defaults, coerce } = {}) {
  const result = repairPipeline(response, schema, { defaults, coerce });
  return { executorId, ...result };
}

// Translator integration: validation after translation.
export function validateTranslated(translated, schema, { defaults, coerce } = {}) {
  return repairPipeline(translated, schema, { defaults, coerce });
}

// Telemetry: divergence view.
export function makeDivergenceTelemetry() {
  const events = [];
  return {
    record(evt) { events.push({ ...evt, at: Date.now() }); },
    report() {
      const byType = {};
      for (const e of events) for (const i of e.issues ?? []) byType[i.type] = (byType[i.type] ?? 0) + 1;
      return { total: events.length, byType, fatal: events.filter((e) => worstSeverity(e.issues ?? []) === "fatal").length };
    },
  };
}
```

**Files touched:** `src/lib/divergence/` (new: detect, repair, pipeline, integrate), `open-sse/executors/` (validation integration), `open-sse/translator/` (post-translation validation), dashboard divergence page (new), `tests/unit/divergence.test.js` (new).

**Acceptance criteria:** executor/translator integration; telemetry; tests.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| False positives | Wrong repairs | Severity levels |
| Repair corruption | Broken output | Validate after repair |
| Retry loops | Infinite retries | Retry caps |
| Divergence blindness | Missed issues | Schema coverage |

## Verification

- Unit: validateAgainstSchema, worstSeverity, repairResponse, shouldRetry, repairPipeline
- Manual: malformed provider response → repaired; fatal → retry → fallback
- Regression: `tests/__baseline__/verify-no-regression.mjs`