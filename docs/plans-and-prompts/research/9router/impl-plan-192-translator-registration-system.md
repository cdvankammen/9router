---
Date: 2026-09-16
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, translator-registration, translator-system, provider-translation, api-normalization
---

# Implementation Plan 192 — Translator Registration System

> Mined from branch docs: `47-branch-9router-internal-threads.md` (Level 4: AAB-B — Translator Registration).

## 1. Goal

Implement a translator registration system for 9Router: formalize how translators (API normalizers) are registered, discovered, and invoked, add translator validation, and add translator observability — making the translation layer maintainable and extensible.

## 2. Background (from research)

- **9Router current state**: Translators exist; registration implicit.
- **Research findings** (47-branch):
  - Translator registration (AAB-B): registration system.
  - Translator direct routes (AAB-A): direct routing.
  - Provider registry (plan 34): provider registration.

## 3. Design

### 3.1 Registration Model

- **Translator registry**: registered translators.
- **Translator metadata**: name, provider, capabilities.
- **Translator validation**: schema validation.

### 3.2 Discovery

- **Discovery mechanism**: auto-discovery.
- **Discovery scope**: per-provider, per-model.
- **Discovery fallback**: default translator.

### 3.3 Invocation

- **Invocation flow**: request → translator → provider.
- **Invocation caching**: cache translations.
- **Invocation fallback**: fallback translator.

### 3.4 Integration

- **Executor integration**: translator hooks.
- **Observability**: translator metrics.
- **Dashboard**: translator view.

## 4. Implementation Steps

1. Build registration model.
2. Add discovery.
3. Add invocation flow.
4. Integrate executors.
5. Dashboard: translator view.
6. Tests: registration, discovery, invocation.

## 5. Files Touched

- `src/lib/translators/registry.js` (new)
- `open-sse/translator/` (integration)
- Dashboard translators page (new)
- `tests/unit/translators.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Registration drift | Validation |
| Discovery failures | Fallback |
| Invocation errors | Error handling |
| Complexity | Simple registration |

## 7. Success Criteria

- Registration formalized.
- Discovery works.
- Invocation functional.
- Translators maintainable.

## 8. Related Plans

- Plan 124 (Translator Direct Routes) — direct routes.
- Plan 34 (Provider Registry) — registry.
- Plan 40 (API Compatibility) — API.
- Plan 130 (Provider Registry Governance) — governance.