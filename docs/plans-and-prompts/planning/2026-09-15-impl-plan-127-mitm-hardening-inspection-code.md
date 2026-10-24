# Implementation Plan 127 — MITM System Hardening & Traffic Inspection — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #mitm #inspection #security #tls #certificates #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (MITM system in `src/mitm/`; security foundations from plan 10; traffic inspection from plan 54; security audit from plan 58).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — interception rules; inspection filters; cert lifecycle.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-127-mitm-hardening-inspection.md`, `../research/9router/impl-plan-10-security-mitm-hardening.md`, `../research/9router/impl-plan-54-traffic-inspection.md`.

## Scope

**In scope:** interception rules (host/path/method patterns, ordered evaluation, decision logging); traffic inspection (request/response viewer, filters host/path/status/time, export); MITM security (cert lifecycle, TLS hardening, scope limits, audit logging); dashboard MITM UI + tests.
**Out of scope:** MITM architecture internals (plan 14); security audit (plan 58).

## Milestones

### M1 — Interception rules

**Reference code (`src/mitm/rules.js`):**

```js
// Rule model: host patterns, path patterns, methods.
export function makeRule({ id, host = null, path = null, methods = null, action = "intercept", priority = 0 } = {}) {
  return { id, host: host ? new RegExp(host) : null, path: path ? new RegExp(path) : null, methods, action, priority };
}

// Rule evaluation: ordered matching.
export function evaluateRules(rules, { host, path, method } = {}) {
  const sorted = [...rules].sort((a, b) => b.priority - a.priority);
  for (const rule of sorted) {
    if (rule.host && !rule.host.test(host ?? "")) continue;
    if (rule.path && !rule.path.test(path ?? "")) continue;
    if (rule.methods && !rule.methods.includes(method)) continue;
    return { rule, decision: rule.action };
  }
  return { rule: null, decision: "pass" };
}

// Decision logging: interception decisions.
export function decisionLog(entry) {
  return { ...entry, at: Date.now() };
}
```

**Acceptance criteria:** rule model; ordered evaluation; logging.

### M2 — Traffic inspection

**Reference code (`src/mitm/inspect.js`):**

```js
// Inspection store: request/response viewer.
export function makeInspectionStore({ maxEntries = 1000, sampleRate = 1 } = {}) {
  const entries = [];
  return {
    // Sampling: avoid overhead.
    shouldSample() { return Math.random() < sampleRate; },
    add(entry) {
      entries.push({ ...entry, at: Date.now() });
      if (entries.length > maxEntries) entries.shift();
    },
    // Filters: host, path, status, time.
    query({ host = null, path = null, status = null, since = null, until = null } = {}) {
      return entries.filter((e) =>
        (!host || e.host?.includes(host)) &&
        (!path || e.path?.includes(path)) &&
        (status == null || e.status === status) &&
        (!since || e.at >= since) &&
        (!until || e.at <= until));
    },
    // Export: inspected traffic.
    exportJson() { return JSON.stringify(entries, null, 2); },
    all() { return entries; },
  };
}
```

**Acceptance criteria:** viewer; filters; export.

### M3 — MITM security

**Reference code (`src/mitm/security.js`):**

```js
// Certificate lifecycle: expiry tracking + renewal.
export function certStatus({ cert, now = Date.now(), renewBeforeMs = 30 * 24 * 3600 * 1000 } = {}) {
  const expiresAt = cert?.expiresAt ?? 0;
  if (now >= expiresAt) return "expired";
  if (expiresAt - now < renewBeforeMs) return "renew-due";
  return "valid";
}

// TLS hardening: protocol/cipher config.
export function tlsConfig({ minVersion = "TLSv1.2", ciphers = null } = {}) {
  return { minVersion, ciphers: ciphers ?? ["TLS_AES_128_GCM_SHA256", "TLS_AES_256_GCM_SHA384"] };
}

// Scope limits: interception scope restrictions.
export function inScope({ host, allowlist = [], denylist = [] } = {}) {
  if (denylist.some((d) => host?.includes(d))) return false;
  if (allowlist.length && !allowlist.some((a) => host?.includes(a))) return false;
  return true;
}

// Audit logging: interception audit trail.
export function auditEntry({ ruleId, host, path, action, at = Date.now() } = {}) {
  return { ruleId, host, path, action, at };
}
```

**Acceptance criteria:** cert lifecycle; TLS config; scope limits; audit.

### M4 — Integration + tests

**Reference code (`src/mitm/integrate.js`):**

```js
// Integration: rules + scope + inspection in one pass.
export function inspectRequest({ rules, scope, store, req } = {}) {
  if (!inScope({ host: req.host, ...scope })) return { decision: "pass", reason: "out-of-scope" };
  const { rule, decision } = evaluateRules(rules, req);
  if (store.shouldSample()) store.add({ host: req.host, path: req.path, method: req.method, decision, ruleId: rule?.id ?? null });
  return { decision, rule };
}

// Telemetry: MITM view.
export function makeMitmTelemetry() {
  const events = [];
  return {
    record(evt) { events.push({ ...evt, at: Date.now() }); },
    report() {
      return {
        intercepted: events.filter((e) => e.decision === "intercept").length,
        passed: events.filter((e) => e.decision === "pass").length,
        outOfScope: events.filter((e) => e.reason === "out-of-scope").length,
      };
    },
  };
}
```

**Files touched:** `src/mitm/` (rules, inspect, security, integrate), dashboard mitm page (new), `tests/unit/mitm.test.js` (new).

**Acceptance criteria:** integration; telemetry; tests.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Interception leaks | Sensitive data | Scope limits |
| Cert issues | Broken TLS | Lifecycle mgmt |
| Inspection overhead | Latency | Sampling |
| Security gaps | Exploits | Audit + hardening |

## Verification

- Unit: makeRule, evaluateRules, makeInspectionStore, certStatus, inScope, inspectRequest
- Manual: rule intercepts matching host; out-of-scope passes; cert renew-due flagged
- Regression: `tests/__baseline__/verify-no-regression.mjs`