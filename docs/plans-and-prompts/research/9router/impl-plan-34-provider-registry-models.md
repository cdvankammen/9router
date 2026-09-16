---
Date: 2026-09-16
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, provider-registry, models, onboarding, new-provider
---

# Implementation Plan 34 — Provider Registry & Model Management

> Written after the binary-tree research expansion (see `39-binary-tree-expansion-master-plan.md`, `44-branch-gateways-and-serving.md`).
> This plan covers the "provider registry" option: robust provider registry and model management.

## 1. Goal

Harden 9Router's provider registry and model management: registry-driven provider onboarding, model metadata management, and provider health tracking.

## 2. Background (from research)

- **9Router current state**: `open-sse/providers/registry/*` (one file per provider, auto-generated index); `config/providerModels.js`; REGISTRY_TEMPLATE.
- **Research findings** (44-branch): registry should be the single source of truth; model metadata (context, pricing, capabilities) drives routing; provider onboarding should be guided.

## 3. Design

### 3.1 Registry Enhancements

- **Registry schema**: provider metadata (name, base URL, auth, capabilities, models).
- **Registry validation**: validate registry entries (schema, uniqueness).
- **Registry generation**: auto-generate index (existing scripts).

### 3.2 Model Metadata

- **Model schema**: context window, pricing, capabilities, aliases.
- **Model updates**: update workflow for model changes.
- **Model discovery**: optional auto-discovery from provider APIs.

### 3.3 Provider Onboarding

- **Onboarding flow**: guided provider setup (config → test → activate).
- **Provider testing**: connectivity + capability tests.
- **Provider docs**: per-provider docs generated from registry.

### 3.4 Provider Health

- **Health tracking**: per-provider health (latency, errors, quota).
- **Health dashboard**: provider health view.
- **Health alerts**: provider degradation alerts.

## 4. Implementation Steps

1. Extend registry schema.
2. Add registry validation.
3. Build model metadata management.
4. Build onboarding flow.
5. Add provider health.
6. Tests: registry validation, model metadata.

## 5. Files Touched

- `open-sse/providers/registry/` (schema, validation)
- `open-sse/config/providerModels.js` (metadata)
- `src/app/api/v1/providers/route.js` (onboarding)
- Dashboard providers page (extend)
- `tests/unit/provider-registry.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Registry churn | Validation; generation |
| Model metadata staleness | Update workflow |
| Onboarding complexity | Guided flow |
| Health data noise | Smoothing; thresholds |

## 7. Success Criteria

- Registry validated + generated.
- Model metadata complete.
- Onboarding guided.
- Provider health visible.

## 8. Related Plans
- Plan 5 (Gateway Interop) — provider interop.
- Plan 12 (UX) — provider UX.
- Plan 33 (Docs) — provider docs.