---
Date: 2026-09-16
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, provider-registry-details, provider-models, registry-governance, model-catalog
---

# Implementation Plan 130 — Provider Registry & Model Catalog Governance

> Mined from branch docs: `47-branch-9router-internal-threads.md` (Provider details) and `17-provider-registry-deep-dive.md`.

## 1. Goal

Add provider registry and model catalog governance to 9Router: formalize registry conventions, add model catalog validation, and add registry health checks — so the provider registry stays accurate and maintainable.

## 2. Background (from research)

- **9Router current state**: Provider registry exists (plan 34); conventions in AGENTS.md.
- **Research findings** (47-branch):
  - Provider details: Provider architecture.
  - (17) Provider registry deep dive: registry design.

## 3. Design

### 3.1 Registry Conventions

- **Registry format**: one file per provider.
- **Registry validation**: schema validation.
- **Registry generation**: auto-generated index.

### 3.2 Model Catalog

- **Model catalog**: all models documented.
- **Model validation**: model metadata validation.
- **Model updates**: model lifecycle updates.

### 3.3 Registry Health

- **Registry checks**: completeness, consistency.
- **Registry metrics**: provider counts, model counts.
- **Registry alerts**: stale entries.

### 3.4 Integration

- **CI integration**: registry validation in CI.
- **Docs integration**: registry docs generation.
- **Dashboard**: registry overview.

## 4. Implementation Steps

1. Audit registry conventions.
2. Add schema validation.
3. Build model catalog.
4. Add registry health.
5. CI: registry validation.
6. Tests: registry, catalog.

## 5. Files Touched

- `open-sse/providers/registry/` (validation)
- `open-sse/config/providerModels.js` (catalog)
- `scripts/validate-registry.mjs` (new)
- Dashboard registry page (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Registry drift | CI validation |
| Model staleness | Update process |
| Schema complexity | Simple schema |
| Generation conflicts | Script ownership |

## 7. Success Criteria

- Conventions enforced.
- Catalog complete.
- Health checks pass.
- Registry overview visible.

## 8. Related Plans

- Plan 34 (Provider Registry Models) — registry foundations.
- Plan 17 (Provider Registry) — architecture.
- Plan 33 (Docs) — registry docs.
- Plan 36 (Test Coverage) — CI validation.