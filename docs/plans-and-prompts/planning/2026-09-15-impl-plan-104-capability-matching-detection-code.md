# Implementation Plan 104 — Capability Matching & Feature Detection — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #capabilities #feature-detection #matching #negotiation #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (capability discovery from plan 63 research; request normalization from plan 52 research; per-model adaptation from plan 79 (`src/lib/adaptation/`); provider registry in `open-sse/providers/registry/`).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — detect capabilities; match a vision request; confirm mismatch handling.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-104-capability-matching-detection.md`, `../research/9router/impl-plan-63-capability-discovery.md`, `../research/9router/impl-plan-79-per-model-request-adaptation.md`.

## Scope

**In scope:** capability model (function_calling, vision, thinking, streaming, json_mode, max_context, max_output, modalities); feature detection (static from configs, dynamic probes, per-model cache with TTL, conservative fallback); capability matching (extract request requirements, filter models, mismatch handling strip-or-route, negotiation of parameters); capability registry (records, manual overrides, per-version); selection + translator integration + dashboard.
**Out of scope:** provider-side capability advertisement protocols beyond probes; training detectors.

## Milestones

### M1 — Capability model

**Reference code (`src/lib/capabilities/model.js`):**

```js
// Capability model.
export const CAPABILITY_KEYS = [
  "function_calling", "vision", "thinking", "streaming", "json_mode",
  "max_context", "max_output", "modalities",
];

export function makeCapabilities(caps = {}) {
  return {
    function_calling: caps.function_calling ?? false,
    vision: caps.vision ?? false,
    thinking: caps.thinking ?? false,
    streaming: caps.streaming ?? true,
    json_mode: caps.json_mode ?? false,
    max_context: caps.max_context ?? 4096,
    max_output: caps.max_output ?? 1024,
    modalities: caps.modalities ?? ["text"],
  };
}

// Conservative defaults when unknown.
export function conservativeDefaults() {
  return makeCapabilities({ streaming: true });
}

export function hasCapability(caps, key) {
  return Boolean(caps[key]);
}
```

**Acceptance criteria:** model defined; conservative defaults.

### M2 — Feature detection

**Reference code (`src/lib/capabilities/detect.js`):**

```js
// Static detection from provider configs + registry.
export function staticDetect({ providerConfig, modelId } = {}) {
  return makeCapabilities(providerConfig?.capabilities?.[modelId] ?? providerConfig?.capabilities ?? {});
}

// Dynamic detection: probe requests (models endpoint / test call).
export async function probeDetect({ modelId, probe }) {
  try {
    const info = await probe(modelId);
    return makeCapabilities(info);
  } catch {
    return conservativeDefaults(); // detection fallback
  }
}

// Detection cache with TTL.
export function makeDetectionCache({ ttlMs = 60 * 60_000 } = {}) {
  const cache = new Map(); // modelId -> { caps, at }
  return {
    get(modelId, now = Date.now()) {
      const e = cache.get(modelId);
      if (!e) return null;
      if (now - e.at > ttlMs) { cache.delete(modelId); return null; }
      return e.caps;
    },
    set(modelId, caps, now = Date.now()) { cache.set(modelId, { caps, at: now }); },
    clear() { cache.clear(); },
  };
}
```

**Acceptance criteria:** static + dynamic detection; TTL cache; fallback.

### M3 — Capability matching

**Reference code (`src/lib/capabilities/match.js`):**

```js
// Request requirements: extract required capabilities from request.
export function requirementsFromRequest({ messages, tools, response_format, stream = false } = {}) {
  const req = { vision: false, function_calling: false, json_mode: false, streaming: stream };
  for (const m of messages ?? []) {
    const content = m.content;
    if (Array.isArray(content)) {
      for (const part of content) {
        if (part.type === "image" || part.type === "image_url") req.vision = true;
      }
    }
  }
  if (tools?.length) req.function_calling = true;
  if (response_format?.type === "json_object") req.json_mode = true;
  return req;
}

// Matching: filter models by required capabilities.
export function matchModels(candidates, requirements, { capsOf } = {}) {
  return candidates.filter((m) => {
    const caps = capsOf(m);
    if (requirements.vision && !caps.vision) return false;
    if (requirements.function_calling && !caps.function_calling) return false;
    if (requirements.json_mode && !caps.json_mode) return false;
    if (requirements.streaming && !caps.streaming) return false;
    return true;
  });
}

// Mismatch handling: strip unsupported features or route elsewhere.
export function handleMismatch({ model, requirements, caps, strip = true } = {}) {
  const stripped = [];
  if (requirements.vision && !caps.vision) stripped.push("vision");
  if (requirements.function_calling && !caps.function_calling) stripped.push("tools");
  if (requirements.json_mode && !caps.json_mode) stripped.push("json_mode");
  if (!strip && stripped.length) return { ok: false, reason: `missing:${stripped.join(",")}` };
  return { ok: true, stripped };
}

// Negotiation: request capability-appropriate parameters.
export function negotiateParams({ caps, requested = {} } = {}) {
  const out = { ...requested };
  if (requested.max_tokens > caps.max_output) out.max_tokens = caps.max_output;
  if (requested.max_context && requested.max_context > caps.max_context) out.max_context = caps.max_context;
  return out;
}
```

**Acceptance criteria:** requirements extracted; filtering; strip-or-route; negotiation.

### M4 — Registry + integration + tests

**Reference code (`src/lib/capabilities/registry.js`):**

```js
// Capability registry: records + manual overrides.
export function makeCapabilityRegistry() {
  const records = new Map(); // modelId -> caps
  const overrides = new Map();
  return {
    set(modelId, caps) { records.set(modelId, caps); },
    override(modelId, caps) { overrides.set(modelId, caps); },
    get(modelId) { return overrides.get(modelId) ?? records.get(modelId) ?? conservativeDefaults(); },
    clearOverride(modelId) { overrides.delete(modelId); },
    all() { return Object.fromEntries(records); },
  };
}

// Versioning: capability changes per model version.
export function versionedCapabilities({ modelId, version, caps }) {
  return { modelId, version, caps, at: new Date().toISOString() };
}
```

**Files touched:** `src/lib/capabilities/` (new: model, detect, match, registry), `src/sse/handlers/chat.js` (matching integration), `open-sse/translator/` (feature stripping), `open-sse/config/capabilityConfig.js` (new), dashboard capabilities page (new), `tests/unit/capabilities.test.js` (new).

**Acceptance criteria:** capabilities detected/cached; matched; mismatches handled; view visible.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Wrong detection | Failed requests | Conservative defaults |
| Probe cost | Slow startup | Cached detection |
| Mismatch failures | Broken calls | Strip + route |
| Stale capabilities | Wrong assumptions | TTL refresh |

## Verification

- Unit: requirementsFromRequest, matchModels, handleMismatch, negotiateParams, makeDetectionCache
- Manual: vision request → only vision-capable models; probe failure → conservative defaults
- Regression: `tests/__baseline__/verify-no-regression.mjs`