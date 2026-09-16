---
Date: 2026-09-16
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, capability-matching, model-capabilities, feature-detection, negotiation
---

# Implementation Plan 104 — Capability Matching & Feature Detection

> Mined from branch docs: `47-branch-9router-internal-threads.md` (capability matching) and `44-branch-gateways-and-serving.md` (capability negotiation).

## 1. Goal

Add capability matching and feature detection to 9Router: detect each model's actual capabilities (function calling, vision, thinking, streaming, context length), match requests to capable models, and negotiate capabilities with providers — so requests never fail due to missing model features.

## 2. Background (from research)

- **9Router current state**: capability assumptions are static in provider configs.
- **Research findings** (47-branch):
  - Capability matching: match request features to model capabilities.
  - (44-branch) Capability negotiation: negotiate features with providers.

## 3. Design

### 3.1 Capability Model

```
CAPABILITIES = {
  function_calling: bool,
  vision: bool,
  thinking: bool,
  streaming: bool,
  json_mode: bool,
  max_context: number,
  max_output: number,
  modalities: ['text','image','audio'],
}
```

### 3.2 Feature Detection

- **Static detection**: provider configs + model registry.
- **Dynamic detection**: probe requests (models endpoint, test calls).
- **Detection cache**: per-model capability cache with TTL.
- **Detection fallback**: conservative defaults.

### 3.3 Capability Matching

- **Request requirements**: extract required capabilities from request.
- **Matching**: filter models by required capabilities.
- **Mismatch handling**: strip unsupported features or route elsewhere.
- **Negotiation**: request capability-appropriate parameters.

### 3.4 Capability Registry

- **Registry**: per-model capability records.
- **Overrides**: manual capability overrides.
- **Versioning**: capability changes per model version.

### 3.5 Integration

- **Selection integration**: capability filter in model selection.
- **Translator integration**: feature stripping per capability.
- **Observability**: capability mismatch telemetry.
- **Dashboard**: capability view.

## 4. Implementation Steps

1. Define capability model (`src/lib/capabilities/`).
2. Build feature detection.
3. Build capability matching.
4. Add mismatch handling.
5. Integrate selection + translator.
6. Dashboard: capability view.
7. Tests: detection, matching, mismatch handling.

## 5. Files Touched

- `src/lib/capabilities/` (new: model, detect, match, registry)
- `src/sse/handlers/chat.js` (matching integration)
- `open-sse/translator/` (feature stripping)
- `open-sse/config/capabilityConfig.js` (new)
- Dashboard capabilities page (new)
- `tests/unit/capabilities.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Wrong detection | Conservative defaults |
| Probe cost | Cached detection |
| Mismatch failures | Strip + route |
| Stale capabilities | TTL refresh |

## 7. Success Criteria

- Capabilities detected and cached.
- Requests matched to capable models.
- Mismatches handled gracefully.
- Capability view visible.

## 8. Related Plans

- Plan 63 (Capability Discovery) — discovery foundations.
- Plan 52 (Request Normalization) — feature handling.
- Plan 79 (Per-Model Adaptation) — capability-based params.
- Plan 34 (Provider Registry) — model metadata.