# Implementation Plan 63 — Model Capability Discovery & Negotiation — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #capabilities #discovery #negotiation #routing #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (`open-sse/providers/registry/*` metadata; `open-sse/config/providerModels.js`; context windows from plan 55; `/v1/models` endpoint; translator capability handling).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — discover capabilities, route by capability, negotiate params, confirm fallback.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-63-capability-discovery-negotiation.md`, `../research/9router/44-branch-gateways-and-serving.md`, `../research/9router/impl-plan-34-provider-registry.md`.

## Scope

**In scope:** capability model (context window, modalities text/image/audio, tools, streaming, reasoning, max output); capability sources (registry, provider API discovery, manual override) with confidence; capability-based routing (extract request needs → match → fallback); parameter negotiation (max_tokens, modalities, features per capability); negotiation logging.
**Out of scope:** live provider API polling (manual refresh + cache); ML-based capability inference.

## Milestones

### M1 — Capability model

**Reference code (`src/lib/capabilities/model.js`):**

```js
// Capability dimensions per model.
export const CAPABILITY_DIMENSIONS = ["contextWindow", "modalities", "tools", "streaming", "reasoning", "maxOutput"];

// Capability record: { model, contextWindow, modalities: ["text","image"], tools: true, streaming: true, reasoning: false, maxOutput, source: "registry"|"api"|"manual", confidence }
export function mergeCapabilities(base, override) {
  return { ...base, ...override, source: override.source ?? base.source ?? "manual", confidence: override.confidence ?? base.confidence ?? 0.5 };
}

// Request needs extraction: what does this request require?
export function extractNeeds(request) {
  const needs = { modalities: ["text"], tools: false, streaming: request.stream === true, reasoning: false, maxOutput: request.max_tokens ?? null };
  for (const msg of request.messages ?? []) {
    if (Array.isArray(msg.content)) {
      for (const part of msg.content) {
        if (part.type === "image_url") needs.modalities.push("image");
        if (part.type === "input_audio") needs.modalities.push("audio");
      }
    }
    if (msg.tool_calls?.length) needs.tools = true;
  }
  needs.modalities = [...new Set(needs.modalities)];
  return needs;
}
```

**Acceptance criteria:** dimensions defined; merge works; needs extraction correct.

### M2 — Discovery

**Reference code (`src/lib/capabilities/discovery.js`):**

```js
import { getAdapter } from "@/lib/db/driver.js";

// Sources: registry (static) → provider API (opt-in) → manual override (highest).
export async function discoverCapabilities({ provider, registry, fetchModels = null } = {}) {
  const db = getAdapter();
  const manual = db.all("SELECT * FROM capability_overrides WHERE provider = ?", [provider]);

  const discovered = {};
  // 1. Registry baseline.
  for (const [model, meta] of Object.entries(registry ?? {})) {
    discovered[model] = { model, ...meta.capabilities, source: "registry", confidence: 0.6 };
  }
  // 2. Provider API (opt-in, cached).
  if (fetchModels) {
    try {
      const models = await fetchModels();
      for (const m of models) {
        discovered[m.id] = mergeCapabilities(discovered[m.id] ?? { model: m.id }, {
          contextWindow: m.context_window, modalities: m.modalities ?? ["text"],
          tools: m.supports_tools ?? false, streaming: m.supports_streaming ?? true,
          source: "api", confidence: 0.8,
        });
      }
    } catch { /* fail-open to registry */ }
  }
  // 3. Manual overrides win.
  for (const o of manual) {
    discovered[o.model] = mergeCapabilities(discovered[o.model] ?? { model: o.model }, JSON.parse(o.capabilities_json));
  }
  return discovered;
}
```

**Acceptance criteria:** registry baseline; API discovery opt-in + cached; manual overrides win.

### M3 — Capability-based routing

**Reference code (`src/lib/capabilities/match.js`):**

```js
import { extractNeeds } from "./model.js";

// Match request needs to candidate models' capabilities.
export function matchCapabilities(needs, candidates) {
  const scored = [];
  for (const c of candidates) {
    const caps = c.capabilities;
    let score = 0;
    const missing = [];
    if (needs.modalities.every((m) => caps.modalities?.includes(m))) score += 10;
    else missing.push("modalities");
    if (!needs.tools || caps.tools) score += 5;
    else missing.push("tools");
    if (!needs.streaming || caps.streaming) score += 5;
    else missing.push("streaming");
    if (needs.reasoning && caps.reasoning) score += 5;
    if (needs.maxOutput && caps.maxOutput && needs.maxOutput > caps.maxOutput) missing.push("maxOutput");
    else if (needs.maxOutput) score += 3;
    if (needs.contextWindow && caps.contextWindow && needs.contextWindow > caps.contextWindow) missing.push("contextWindow");
    scored.push({ model: c.model, score, missing, capabilities: caps });
  }
  // Sort: score desc, missing count asc.
  return scored.sort((a, b) => b.score - a.score || a.missing.length - b.missing.length);
}

// Fallback: if best match still misses hard needs, return null → caller falls back to default routing.
export function bestMatch(needs, candidates) {
  const ranked = matchCapabilities(needs, candidates);
  const best = ranked[0];
  if (!best) return null;
  const hardMissing = best.missing.filter((m) => ["modalities", "contextWindow"].includes(m));
  return hardMissing.length ? null : best;
}
```

**Acceptance criteria:** scoring ranks candidates; hard needs (modalities, context) gate selection.

### M4 — Negotiation + telemetry + tests

**Reference code (`src/lib/capabilities/negotiate.js`):**

```js
// Adjust request params to the selected model's capabilities.
export function negotiateParams(request, capabilities) {
  const out = { ...request };
  if (capabilities.maxOutput && (out.max_tokens ?? 0) > capabilities.maxOutput) {
    out.max_tokens = capabilities.maxOutput;
    out._negotiated = [...(out._negotiated ?? []), "max_tokens"];
  }
  // Drop unsupported modalities from content (e.g., no image support).
  if (!capabilities.modalities?.includes("image") && Array.isArray(out.messages)) {
    out.messages = out.messages.map((m) => {
      if (!Array.isArray(m.content)) return m;
      const filtered = m.content.filter((p) => p.type !== "image_url" || capabilities.modalities.includes("image"));
      return { ...m, content: filtered };
    });
    out._negotiated = [...(out._negotiated ?? []), "image-content"];
  }
  return out;
}

// Negotiation logging (telemetry).
export async function logNegotiation(db, { requestId, model, negotiated }) {
  db.run("INSERT INTO negotiation_events (request_id, model, negotiated_json, created_at) VALUES (?, ?, ?, datetime('now'))",
    [requestId, model, JSON.stringify(negotiated)]);
}
```

**Files touched:** `src/lib/capabilities/` (new: model, discovery, match, negotiate), `open-sse/providers/registry/` (capability metadata), `src/sse/handlers/chat.js` (capability routing), `open-sse/handlers/chatCore.js` (negotiation), `src/lib/db/repos/capabilityRepo.js` (new: overrides + telemetry), `tests/unit/capabilities.test.js` (new).

**Acceptance criteria:** negotiation adjusts params; unsupported modalities dropped; events logged.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Stale capabilities | Wrong routing | Discovery refresh + confidence |
| Wrong matching | Bad model choice | Hard-need gating + fallback |
| Discovery cost | API load | Caching + opt-in |
| Negotiation bugs | Broken requests | Tests + logging |

## Verification

- Unit: model, discovery, match, negotiate
- Manual: image request → image-capable model; max_tokens clamped
- Regression: `tests/__baseline__/verify-no-regression.mjs`