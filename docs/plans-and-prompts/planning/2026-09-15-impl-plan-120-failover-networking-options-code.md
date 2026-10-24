# Implementation Plan 120 — Failover Networking Options — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #networking #failover #paths #probes #connectivity #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (executors in `open-sse/executors/*`; provider registry in `open-sse/providers/registry/`; health signals from plan 94 (`src/lib/health/`); provider redundancy from plan 65).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — register paths; probe health; fail over; recover.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-120-failover-networking-options.md`, `../research/9router/impl-plan-65-provider-redundancy.md`, `../research/9router/impl-plan-94-provider-acceptance-load-balancing.md`.

## Scope

**In scope:** network path model (endpoint + proxy + DNS + protocol; types direct/proxy/alternate-endpoint/alternate-DNS; per-provider path registry); path health (periodic probes, latency/success/stability metrics, states healthy/degraded/down); path failover (primary → alternates, triggers, recovery detection with hysteresis); executor integration + dashboard path view.
**Out of scope:** provider-level redundancy (plan 65); acceptance/load balancing (plan 94).

## Milestones

### M1 — Network path model

**Reference code (`src/lib/netpaths/model.js`):**

```js
// Path: endpoint + proxy + DNS + protocol.
export const PATH_TYPES = ["direct", "proxy", "alternate-endpoint", "alternate-dns"];

export function makePath({ id, providerId, type = "direct", endpoint, proxy = null, dns = null, protocol = "https" } = {}) {
  if (!PATH_TYPES.includes(type)) throw new Error(`invalid path type: ${type}`);
  return { id, providerId, type, endpoint, proxy, dns, protocol, state: "healthy" };
}

// Path registry: per-provider path lists.
export function makePathRegistry() {
  const paths = new Map(); // id -> path
  return {
    register(path) { paths.set(path.id, path); return path; },
    forProvider(providerId) { return [...paths.values()].filter((p) => p.providerId === providerId); },
    primary(providerId) { return this.forProvider(providerId).find((p) => p.type === "direct") ?? this.forProvider(providerId)[0] ?? null; },
    alternates(providerId) { return this.forProvider(providerId).filter((p) => p.id !== this.primary(providerId)?.id); },
    all() { return [...paths.values()]; },
  };
}
```

**Acceptance criteria:** path types; registry; primary/alternates.

### M2 — Path health

**Reference code (`src/lib/netpaths/health.js`):**

```js
// Path states.
export const PATH_STATES = ["healthy", "degraded", "down"];

// Path metrics: latency, success, stability (EWMA).
export function makePathHealth({ alpha = 0.1 } = {}) {
  const stats = new Map(); // pathId -> { latency, success }
  return {
    record(pathId, { latencyMs = 0, ok = true } = {}) {
      const s = stats.get(pathId) ?? { latency: null, success: null };
      s.latency = s.latency == null ? latencyMs : alpha * latencyMs + (1 - alpha) * s.latency;
      s.success = s.success == null ? (ok ? 1 : 0) : alpha * (ok ? 1 : 0) + (1 - alpha) * s.success;
      stats.set(pathId, s);
    },
    // State: hysteresis prevents flapping.
    state(pathId, { degradeBelow = 0.6, downBelow = 0.3, prev = "healthy" } = {}) {
      const s = stats.get(pathId);
      if (!s) return "healthy";
      if (s.success < downBelow) return "down";
      if (s.success < degradeBelow) return prev === "down" ? "down" : "degraded";
      return prev === "degraded" ? "degraded" : "healthy"; // recover only after stable
    },
    report(pathId) { return stats.get(pathId) ?? null; },
  };
}

// Probe: periodic connectivity check.
export async function probePath(path, { fetchFn = fetch, timeoutMs = 3000 } = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const start = Date.now();
    const res = await fetchFn(path.endpoint, { method: "HEAD", signal: ctrl.signal });
    return { ok: res.ok, latencyMs: Date.now() - start };
  } catch {
    return { ok: false, latencyMs: timeoutMs };
  } finally { clearTimeout(t); }
}
```

**Acceptance criteria:** metrics; states with hysteresis; probes.

### M3 — Path failover

**Reference code (`src/lib/netpaths/failover.js`):**

```js
// Failover: primary path → alternates.
export function selectPath({ registry, health, providerId, prevPathId = null } = {}) {
  const primary = registry.primary(providerId);
  if (!primary) return null;
  const primaryState = health.state(primary.id);
  if (primaryState === "healthy" || primaryState === "degraded") return primary;
  // Primary down → best alternate.
  const alternates = registry.alternates(providerId)
    .map((p) => ({ path: p, state: health.state(p.id) }))
    .sort((a, b) => ["healthy", "degraded", "down"].indexOf(a.state) - ["healthy", "degraded", "down"].indexOf(b.state));
  return alternates[0]?.path ?? primary;
}

// Recovery: primary path recovery detection.
export function recoveryDetected({ registry, health, providerId } = {}) {
  const primary = registry.primary(providerId);
  return primary ? health.state(primary.id) === "healthy" : false;
}

// Telemetry: path view.
export function makePathTelemetry() {
  const events = [];
  return {
    record(evt) { events.push({ ...evt, at: Date.now() }); },
    report() {
      return {
        failovers: events.filter((e) => e.type === "failover").length,
        recoveries: events.filter((e) => e.type === "recovery").length,
        probes: events.filter((e) => e.type === "probe").length,
      };
    },
  };
}
```

**Acceptance criteria:** failover selection; recovery; telemetry.

### M4 — Integration + tests

**Reference code (`src/lib/netpaths/integrate.js`):**

```js
// Executor integration: path selection in dispatch.
export function pathForRequest({ registry, health, providerId, prevPathId } = {}) {
  const path = selectPath({ registry, health, providerId, prevPathId });
  return path ? { endpoint: path.endpoint, proxy: path.proxy, dns: path.dns, protocol: path.protocol, pathId: path.id } : null;
}

// Config: per-provider path lists.
export function netpathConfig(providers, { pathsOf = () => [] } = {}) {
  return Object.fromEntries(providers.map((p) => [p, pathsOf(p)]));
}
```

**Files touched:** `src/lib/netpaths/` (new: model, health, failover, integrate), `open-sse/executors/` (path integration), `open-sse/config/netpathConfig.js` (new), dashboard netpaths page (new), `tests/unit/netpaths.test.js` (new).

**Acceptance criteria:** executor integration; config; tests.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Path misdetection | Wrong path | Probe calibration |
| Failover storms | Flapping | Hysteresis |
| Proxy issues | Broken paths | Path validation |
| Recovery races | Premature recovery | Recovery checks |

## Verification

- Unit: makePath, makePathRegistry, makePathHealth, selectPath, recoveryDetected
- Manual: kill primary endpoint → alternate used; restore → recovery
- Regression: `tests/__baseline__/verify-no-regression.mjs`