# Implementation Plan 75 — Response Quality & Output Guardrails — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #guardrails #output-validation #safety #quality #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (streaming path in `open-sse/handlers/chatCore.js`; error system from plan 9; privacy/PII from plan 35; fallback semantics from plan 57).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — force a bad output (wrong format), confirm block/redact/warn action + fallback trigger.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-75-response-quality-guardrails.md`, `../research/9router/impl-plan-35-privacy.md`, `../research/9router/impl-plan-57-fallback-retry-semantics.md`.

## Scope

**In scope:** output validation (schema, min/max length, format like JSON/code); quality checks (relevance, coherence, completeness — lightweight heuristics first); safety guardrails (content policy keywords, PII patterns) with actions (block, redact, warn); streaming integration (checks on accumulated text); bad output → fallback trigger; guardrail telemetry.
**Out of scope:** LLM-based output judging in the hot path (plan 67 for offline eval); full content-moderation model integration.

## Milestones

### M1 — Output validation

**Reference code (`src/lib/guardrails/validation.js`):**

```js
// Schema/length/format checks. Returns issues list.
export function validateOutput(text, spec = {}) {
  const issues = [];
  const len = text.length;
  if (spec.minLength != null && len < spec.minLength) issues.push({ rule: "minLength", value: len, expected: spec.minLength });
  if (spec.maxLength != null && len > spec.maxLength) issues.push({ rule: "maxLength", value: len, expected: spec.maxLength });
  if (spec.format === "json") {
    try { JSON.parse(text); } catch { issues.push({ rule: "format", expected: "json" }); }
  }
  if (spec.format === "code" && spec.mustContain) {
    for (const needle of spec.mustContain) if (!text.includes(needle)) issues.push({ rule: "mustContain", expected: needle });
  }
  return issues;
}
```

**Acceptance criteria:** length/schema/format checks work; issues structured.

### M2 — Quality checks

**Reference code (`src/lib/guardrails/quality.js`):**

```js
// Lightweight heuristics (no LLM in hot path).
export function checkQuality({ prompt, response }) {
  const issues = [];
  // Completeness: response shouldn't be empty or a bare error echo.
  if (!response || response.trim().length < 3) issues.push({ rule: "empty", severity: "error" });
  // Coherence: repeated single tokens suggest degeneration.
  const words = response.trim().split(/\s+/);
  const repeats = words.filter((w, i) => i > 0 && w === words[i - 1]).length;
  if (words.length > 20 && repeats / words.length > 0.5) issues.push({ rule: "degeneration", severity: "warning" });
  // Relevance: response shares little vocabulary with the prompt.
  const promptWords = new Set(prompt.toLowerCase().match(/[a-z0-9]+/g) ?? []);
  const overlap = words.filter((w) => promptWords.has(w.toLowerCase())).length;
  if (words.length > 10 && overlap / words.length < 0.05) issues.push({ rule: "irrelevant", severity: "warning" });
  return issues;
}
```

**Acceptance criteria:** empty/degeneration/irrelevance detected; severities assigned.

### M3 — Safety guardrails

**Reference code (`src/lib/guardrails/safety.js`):**

```js
// Content policy + PII patterns. Actions: block | redact | warn.
export const POLICY_PATTERNS = [
  { name: "secrets", pattern: /\b(sk-[A-Za-z0-9]{20,}|api[_-]?key\s*[:=]\s*\S{16,})\b/i, action: "redact" },
  { name: "pii-email", pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i, action: "redact" },
  { name: "pii-phone", pattern: /\b\+?\d[\d\s-]{8,}\d\b/, action: "redact" },
  { name: "harm", pattern: /\b(how to (make|build) (a|an) (bomb|weapon)|instructions for (terror|murder))\b/i, action: "block" },
];

export function scanOutput(text, patterns = POLICY_PATTERNS) {
  const hits = [];
  for (const p of patterns) {
    const m = text.match(p.pattern);
    if (m) hits.push({ name: p.name, action: p.action, matched: m[0].slice(0, 40) });
  }
  return hits;
}

export function applyAction(text, hits) {
  let out = text;
  for (const h of hits) {
    if (h.action === "block") return { action: "block", text: null };
    if (h.action === "redact") out = out.replace(h.matched, "[REDACTED]");
  }
  return { action: hits.length ? "redact" : "pass", text: out };
}
```

**Acceptance criteria:** patterns fire; block returns null; redact replaces; pass-through clean.

### M4 — Integration + telemetry + tests

**Reference code (`open-sse/config/guardrailConfig.js` + integration):**

```js
export const DEFAULT_GUARDRAILS = {
  enabled: true,
  validation: { maxLength: 200_000, format: null },
  quality: { enabled: true },
  safety: { enabled: true },
  onViolation: "warn",        // warn | block | fallback
  fallbackOn: ["block", "error"],
};

// Integration helper for chatCore: run checks on final text before delivery.
export function runGuardrails({ prompt, response, config = DEFAULT_GUARDRAILS }) {
  if (!config.enabled) return { action: "pass", text: response, issues: [] };
  const issues = [
    ...validateOutput(response, config.validation),
    ...(config.quality.enabled ? checkQuality({ prompt, response }) : []),
    ...scanOutput(response).map((h) => ({ rule: `safety:${h.name}`, severity: h.action === "block" ? "error" : "warning", action: h.action })),
  ];
  const blocking = issues.some((i) => i.severity === "error" || i.action === "block");
  if (blocking && config.onViolation === "block") return { action: "block", text: null, issues };
  if (blocking && config.onViolation === "fallback") return { action: "fallback", text: null, issues };
  return { action: "warn", text: response, issues };
}
```

**Files touched:** `src/lib/guardrails/` (new: validation, quality, safety), `open-sse/config/guardrailConfig.js` (new), `open-sse/handlers/chatCore.js` (integration), `src/lib/db/repos/guardrailRepo.js` (new: telemetry), `tests/unit/guardrails.test.js` (new).

**Acceptance criteria:** guardrails run on final text; block/fallback/warn actions honored; telemetry recorded.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| False positives | Legit output blocked | Threshold tuning + warn-first default |
| Latency | Slow delivery | Lightweight regex/heuristic checks |
| Over-blocking | User frustration | Configurable actions per rule |
| Complexity | Guardrail bugs | Progressive rollout (warn → block) |

## Verification

- Unit: validateOutput, checkQuality, scanOutput, applyAction, runGuardrails
- Manual: force JSON-format violation → warn; force harm pattern → block/fallback
- Regression: `tests/__baseline__/verify-no-regression.mjs`