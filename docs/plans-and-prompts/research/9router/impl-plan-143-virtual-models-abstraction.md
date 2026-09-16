---
Date: 2026-09-16
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, virtual-models, model-aliases, model-abstraction, model-mapping
---

# Implementation Plan 143 — Virtual Models & Abstraction Layer

> Mined from branch docs: `44-branch-gateways-and-serving.md` (Level 4: AAA-B — Virtual Models).

## 1. Goal

Implement virtual models for 9Router: create an abstraction layer where virtual model names map to real provider models, enabling stable client-facing model names that can be re-pointed without client changes.

## 2. Background (from research)

- **9Router current state**: Model aliases exist (plan 50); virtual models shallow.
- **Research findings** (44-branch):
  - Virtual models (AAA-B): abstraction over real models.
  - Strategy selection (AAA-A): strategy per virtual model.
  - Cost tier bands (BAB): cost tiers for virtual models.

## 3. Design

### 3.1 Virtual Model Model

- **Virtual model**: name, description, capabilities.
- **Mapping**: virtual → real model(s).
- **Versioning**: virtual model versions.

### 3.2 Mapping Strategies

- **Static mapping**: fixed real model.
- **Dynamic mapping**: routing-based selection.
- **Fallback mapping**: fallback real models.
- **Cost-tier mapping**: cost-based selection.

### 3.3 Virtual Model Management

- **Lifecycle**: create, update, deprecate.
- **Capabilities**: virtual capability declaration.
- **Observability**: virtual model metrics.

### 3.4 Integration

- **API integration**: virtual names in API.
- **Dashboard**: virtual model management.
- **Tests**: mapping, fallback, lifecycle.

## 4. Implementation Steps

1. Build virtual model model.
2. Add mapping strategies.
3. Add lifecycle management.
4. Integrate API.
5. Dashboard: virtual models.
6. Tests: mapping, lifecycle.

## 5. Files Touched

- `src/lib/virtual-models/` (new: model, mapping, lifecycle)
- `src/app/api/v1/` (virtual name support)
- Dashboard virtual-models page (new)
- `tests/unit/virtual-models.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Mapping confusion | Clear docs |
| Capability mismatch | Validation |
| Version drift | Lifecycle mgmt |
| Client breakage | Stable names |

## 7. Success Criteria

- Virtual models work.
- Mappings flexible.
- Lifecycle managed.
- Clients stable.

## 8. Related Plans

- Plan 50 (Model Aliases) — aliases.
- Plan 44 (Gateway Interop) — gateway.
- Plan 97 (Quality Tiers) — tiers.
- Plan 40 (API Compatibility) — API stability.