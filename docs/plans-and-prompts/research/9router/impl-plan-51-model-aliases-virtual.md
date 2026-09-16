---
Date: 2026-09-16
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, model-aliases, virtual-models, abstraction, naming
---

# Implementation Plan 51 — Model Aliases & Virtual Models

> Written after the binary-tree research expansion (see `39-binary-tree-expansion-master-plan.md`, `44-branch-gateways-and-serving.md`).
> This plan covers the "model aliases" option: model aliasing and virtual models.

## 1. Goal

Add model aliases and virtual models to 9Router: stable aliases for model names, virtual models that map to routing strategies, and alias management — so clients use stable names while routing evolves.

## 2. Background (from research)

- **9Router current state**: model names pass through; provider models config.
- **Research findings** (44-branch): aliases decouple clients from provider model churn; virtual models (e.g., "best", "cheap") map to strategies; alias management needs versioning.

## 3. Design

### 3.1 Alias System

- **Alias model**: alias → target model(s).
- **Alias types**: static (1:1), dynamic (strategy-based).
- **Alias resolution**: at request time.

### 3.2 Virtual Models

- **Virtual model types**: best-quality, cheapest, fastest, balanced.
- **Virtual resolution**: strategy → model selection.
- **Virtual fallback**: virtual models with fallback chains.

### 3.3 Alias Management

- **Alias CRUD**: dashboard + API.
- **Alias versioning**: versioned aliases.
- **Alias validation**: cycle detection.

### 3.4 Integration

- **API compatibility**: aliases exposed via /v1/models.
- **Usage tracking**: usage tracked by resolved model + alias.
- **Observability**: alias resolution telemetry.

## 4. Implementation Steps

1. Build alias model.
2. Add virtual models.
3. Build alias management.
4. Integrate with API + usage.
5. Tests: resolution, cycles, virtuals.

## 5. Files Touched

- `src/lib/aliases/` (new: model, resolution)
- `src/sse/handlers/chat.js` (resolution integration)
- `src/app/api/v1/aliases/route.js` (new)
- Dashboard aliases page (new)
- `tests/unit/aliases.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Cycle detection | Validation |
| Alias confusion | Clear naming |
| Virtual instability | Strategy fallbacks |
| Usage attribution | Dual tracking |

## 7. Success Criteria

- Aliases resolve correctly.
- Virtual models work.
- Management functional.
- Usage attributed.

## 8. Related Plans
- Plan 5 (Gateway Interop) — virtual models.
- Plan 44 (Dynamic Combos) — strategy synergy.
- Plan 8 (Observability) — resolution telemetry.