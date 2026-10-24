# Implementation Plan 109 — Safety Signals & Content Guardrails — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #safety #guardrails #content-safety #policy #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (security hardening from plan 58 research; rule engine from plan 88 (`src/lib/rules/`); privacy/compliance from plan 35 research; output guardrails from plan 75 (`src/lib/guardrails/`)).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — detect unsafe input; enforce actions; confirm policy modes.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-109-safety-signals-guardrails.md`, `../research/9router/impl-plan-88-routing-rule-engine-v2.md`, `../research/9router/impl-plan-75-response-quality-guardrails.md`.

## Scope

**In scope:** safety detection (input and output, blocklists/classifiers/LLM-safety checks, per-signal confidence); safety actions (block, sanitize, warn, route-to-safer-model); model safety constraints (per-model safety ratings, safety-sensitive routing, audited admin overrides); safety policy (per-route policies, strict/moderate/permissive modes, consistent enforcement); gateway integration + dashboard.
**Out of scope:** building safety classifiers (uses upstream moderation endpoints); legal compliance certification.

## Milestones

### M1 — Safety detection

**Reference code (`src/lib/safety/detect.js`):**

```js
// Safety signals with confidence.
export const SIGNAL_TYPES = { BLOCKLIST: "blocklist", INJECTION: "injection", MODERATION: "moderation" };

// Blocklist detection.
export const DEFAULT_BLOCKLIST = [
  "ignore previous instructions",
  "disregard all prior",
  "reveal your system prompt",
  "exfiltrate",
];

export function detectBlocklist(text, { blocklist = DEFAULT_BLOCKLIST } = {}) {
  const lower = (text ?? "").toLowerCase();
  const hits = blocklist.filter((b) => lower.includes(b));
  return { type: SIGNAL_TYPES.BLOCKLIST, detected: hits.length > 0, hits, confidence: hits.length ? 0.8 : 0 };
}

// Prompt-injection heuristics.
export const INJECTION_PATTERNS = [
  /ignore (all )?(previous|prior|above) instructions/i,
  /you are now (a|an) /i,
  /system:\s*you must/i,
];

export function detectInjection(text) {
  const hits = INJECTION_PATTERNS.filter((re) => re.test(text ?? ""));
  return { type: SIGNAL_TYPES.INJECTION, detected: hits.length > 0, confidence: hits.length ? 0.7 : 0 };
}

// Moderation via upstream classifier (pluggable).
export async function detectModeration({ text, moderate }) {
  if (!moderate) return { type: SIGNAL_TYPES.MODERATION, detected: false, confidence: 0 };
  try {
    const res = await moderate(text);
    return { type: SIGNAL_TYPES.MODERATION, detected: Boolean(res?.flagged), confidence: res?.score ?? 0, categories: res?.categories ?? [] };
  } catch {
    return { type: SIGNAL_TYPES.MODERATION, detected: false, confidence: 0, error: true }; // fail-open
  }
}

// Layered detection: combine signals.
export function combineSignals(signals, { threshold = 0.6 } = {}) {
  const detected = signals.filter((s) => s.detected);
  const confidence = detected.length ? Math.max(...detected.map((s) => s.confidence ?? 0)) : 0;
  return { detected: detected.length > 0 && confidence >= threshold, signals: detected, confidence };
}
```

**Acceptance criteria:** layered detection; confidence; fail-open on error.

### M2 — Safety actions

**Reference code (`src/lib/safety/actions.js`):**

```js
// Actions: block | sanitize | warn | route.
export const SAFETY_ACTION = { BLOCK: "block", SANITIZE: "sanitize", WARN: "warn", ROUTE: "route" };

export function applyAction({ action, text, saferModel = null, signals = [] } = {}) {
  switch (action) {
    case SAFETY_ACTION.BLOCK:
      return { ok: false, blocked: true, reason: signals.map((s) => s.type).join(",") };
    case SAFETY_ACTION.SANITIZE: {
      let out = text;
      for (const s of signals) {
        for (const hit of s.hits ?? []) out = out.split(hit).join("[redacted]");
      }
      return { ok: true, text: out, sanitized: true };
    }
    case SAFETY_ACTION.WARN:
      return { ok: true, text, warning: signals.map((s) => s.type) };
    case SAFETY_ACTION.ROUTE:
      return { ok: true, routeTo: saferModel, reason: "safety-routing" };
    default:
      return { ok: true, text };
  }
}

// Warn mode override: over-blocking protection.
export function downgradeToWarn({ action, mode = "moderate" } = {}) {
  if (mode === "permissive") return SAFETY_ACTION.WARN;
  return action;
}
```

**Acceptance criteria:** four actions; sanitize; over-block protection.

### M3 — Model safety registry

**Reference code (`src/lib/safety/registry.js`):**

```js
// Per-model safety ratings.
export const SAFETY_RATINGS = new Map();

export function registerSafetyRating(modelId, rating) {
  SAFETY_RATINGS.set(modelId, { safety: rating.safety ?? 0.5, conservative: rating.conservative ?? false, notes: rating.notes ?? "" });
}

export function safetyRating(modelId) {
  return SAFETY_RATINGS.get(modelId) ?? { safety: 0.5, conservative: false };
}

// Safety routing: safety-sensitive requests → safe models.
export function safeModels(candidates, { minSafety = 0.7 } = {}) {
  return candidates.filter((m) => safetyRating(m).safety >= minSafety);
}

// Admin overrides with audit.
export function makeSafetyOverrides() {
  const overrides = new Map();
  const audit = [];
  return {
    set(modelId, rating, { actor = "unknown" } = {}) {
      overrides.set(modelId, rating);
      audit.push({ modelId, rating, actor, at: new Date().toISOString() });
      return { ok: true };
    },
    get(modelId) { return overrides.get(modelId) ?? null; },
    auditLog() { return audit; },
  };
}
```

**Acceptance criteria:** ratings; safe-model filtering; audited overrides.

### M4 — Policy + integration + tests

**Reference code (`src/lib/safety/policy.js`):**

```js
// Policy modes: strict | moderate | permissive.
export const POLICY_MODES = {
  strict: { threshold: 0.4, action: "block", routeSafetyMin: 0.8 },
  moderate: { threshold: 0.6, action: "sanitize", routeSafetyMin: 0.7 },
  permissive: { threshold: 0.8, action: "warn", routeSafetyMin: 0.5 },
};

export function policyFor({ route, policies = {}, defaultMode = "moderate" } = {}) {
  const mode = policies[route] ?? defaultMode;
  return { mode, ...(POLICY_MODES[mode] ?? POLICY_MODES.moderate) };
}

// Enforcement: consistent application of policy.
export function enforcePolicy({ signals, policy }) {
  const combined = combineSignals(signals, { threshold: policy.threshold });
  if (!combined.detected) return { ok: true, enforced: false };
  return { ok: policy.action !== "block", action: policy.action, signals: combined.signals, mode: policy.mode };
}
```

**Files touched:** `src/lib/safety/` (new: detect, actions, registry, policy), `src/sse/handlers/chat.js` (safety integration), `src/app/api/v1/safety/route.js` (new endpoints), `open-sse/config/safetyConfig.js` (new), dashboard safety page (new), `tests/unit/safety.test.js` (new).

**Acceptance criteria:** unsafe content detected; actions enforced; safety routing; dashboard view.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| False positives | Blocking valid requests | Confidence thresholds |
| False negatives | Unsafe content passes | Layered detection |
| Policy bypass | Inconsistent safety | Gateway enforcement |
| Over-blocking | Bad UX | Warn mode |

## Verification

- Unit: detectBlocklist, detectInjection, combineSignals, applyAction, enforcePolicy
- Manual: injection prompt → blocked in strict mode; moderate → sanitized
- Regression: `tests/__baseline__/verify-no-regression.mjs`