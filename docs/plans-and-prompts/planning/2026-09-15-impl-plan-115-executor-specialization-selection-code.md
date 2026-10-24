# Implementation Plan 115 — Executor Specialization & Selection — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #executors #specialization #selection #retry #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (executors in `open-sse/executors/*`; retry engine from plan 89 (`open-sse/errors/retry.js`); provider registry in `open-sse/providers/registry/`; capability matching from plan 104 (`src/lib/capabilities/`)).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — register executors; select by features; confirm retry integration.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-115-executor-specialization-selection.md`, `../research/9router/impl-plan-89-error-classification-retry.md`, `../research/9router/impl-plan-104-capability-matching-detection.md`.

## Scope

**In scope:** executor registry (id, providers, protocols, capabilities, retry policy; provider→executor mapping); executor selection (provider + request features → executor, feature matching, default fallback); executor quality tracking (success/latency/error per executor, comparison, degradation detection); executor retry semantics (per-executor policies unified with plan 89 engine, retry telemetry); dispatch integration + dashboard.
**Out of scope:** writing new executors (registry + selection only); binary/protobuf protocol internals (existing executors).

## Milestones

### M1 — Executor registry

**Reference code (`open-sse/executors/registry.js`):**

```js
// Executor model: id, providers, protocols, capabilities, retry policy.
export const EXECUTORS = new Map();

export function registerExecutor(exec) {
  EXECUTORS.set(exec.id, {
    providers: exec.providers ?? [],
    protocols: exec.protocols ?? ["openai"],
    capabilities: exec.capabilities ?? {},
    retry: exec.retry ?? { maxRetries: 1, backoffMs: 500 },
    ...exec,
  });
}

export function executorForProvider(providerId) {
  return [...EXECUTORS.values()].find((e) => e.providers.includes(providerId)) ?? EXECUTORS.get("default") ?? null;
}

export function allExecutors() { return [...EXECUTORS.values()]; }
```

**Acceptance criteria:** registration; provider mapping; default fallback.

### M2 — Executor selection

**Reference code (`open-sse/executors/select.js`):**

```js
// Selection: provider + request features → executor.
export function selectExecutor({ providerId, features = {}, executors = EXECUTORS } = {}) {
  const candidates = [...executors.values()].filter((e) => e.providers.includes(providerId) || e.providers.includes("*"));
  if (!candidates.length) return executors.get("default") ?? null;
  // Feature matching: streaming request → streaming-capable executor.
  if (features.streaming) {
    const streaming = candidates.filter((e) => e.capabilities.streaming);
    if (streaming.length) return streaming[0];
  }
  if (features.binary) {
    const binary = candidates.filter((e) => e.capabilities.binary);
    if (binary.length) return binary[0];
  }
  if (features.protobuf) {
    const pb = candidates.filter((e) => e.capabilities.protobuf);
    if (pb.length) return pb[0];
  }
  return candidates[0];
}

// Capability check: does executor support the request?
export function supports(executor, feature) {
  return Boolean(executor.capabilities[feature]);
}
```

**Acceptance criteria:** feature matching; fallback.

### M3 — Executor quality tracking

**Reference code (`open-sse/executors/quality.js`):**

```js
// Per-executor quality metrics (EWMA).
export function makeExecutorQuality({ alpha = 0.1 } = {}) {
  const stats = new Map(); // executorId -> { success, latency, errors }
  return {
    record(executorId, { ok, latencyMs = 0, errorType = null } = {}) {
      const s = stats.get(executorId) ?? { success: null, latency: null, errors: new Map() };
      s.success = s.success == null ? (ok ? 1 : 0) : alpha * (ok ? 1 : 0) + (1 - alpha) * s.success;
      s.latency = s.latency == null ? latencyMs : alpha * latencyMs + (1 - alpha) * s.latency;
      if (errorType) s.errors.set(errorType, (s.errors.get(errorType) ?? 0) + 1);
      stats.set(executorId, s);
    },
    report(executorId) {
      const s = stats.get(executorId);
      if (!s) return null;
      return { successRate: s.success, avgLatencyMs: s.latency, errorDistribution: Object.fromEntries(s.errors) };
    },
    // Degradation detection.
    degraded(executorId, { minSuccess = 0.5 } = {}) {
      const s = stats.get(executorId);
      return s ? s.success != null && s.success < minSuccess : false;
    },
  };
}

// Comparison: same provider, different executors.
export function compareExecutors(quality, ids) {
  return ids.map((id) => ({ id, ...quality.report(id) })).sort((a, b) => (b.successRate ?? 0) - (a.successRate ?? 0));
}
```

**Acceptance criteria:** metrics; degradation; comparison.

### M4 — Retry semantics + integration + tests

**Reference code (`open-sse/executors/retry.js`):**

```js
// Per-executor retry policy → unified retry config.
export function retryPolicyFor(executor, { defaults = { maxRetries: 1, backoffMs: 500 } } = {}) {
  return { ...defaults, ...(executor?.retry ?? {}) };
}

// Retry telemetry: per-executor retry stats.
export function makeRetryTelemetry() {
  const stats = new Map(); // executorId -> { retries, successes }
  return {
    record(executorId, { retried = false, ok = false } = {}) {
      const s = stats.get(executorId) ?? { retries: 0, successes: 0 };
      if (retried) s.retries += 1;
      if (ok) s.successes += 1;
      stats.set(executorId, s);
    },
    report() { return Object.fromEntries(stats); },
  };
}

// Dispatch integration: selection in dispatch.
export function dispatchExecutor({ providerId, features, executors } = {}) {
  const executor = selectExecutor({ providerId, features, executors });
  return { executor, retry: retryPolicyFor(executor) };
}
```

**Files touched:** `open-sse/executors/registry.js` (new), `open-sse/executors/*` (capability metadata), `open-sse/handlers/chatCore.js` (selection integration), `open-sse/config/executorConfig.js` (new), dashboard executors page (new), `tests/unit/executors.test.js` (new).

**Acceptance criteria:** executors registered; selection matches features; quality tracked; retry unified.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Wrong executor | Failed requests | Feature matching |
| Capability gaps | Missing features | Default fallback |
| Quality noise | Bad signals | EWMA |
| Retry divergence | Inconsistent retries | Unified engine |

## Verification

- Unit: registerExecutor, selectExecutor, makeExecutorQuality, retryPolicyFor, dispatchExecutor
- Manual: streaming request → streaming-capable executor; unknown provider → default
- Regression: `tests/__baseline__/verify-no-regression.mjs`