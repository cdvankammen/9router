---
Date: 2026-09-16
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, prompt-engineering, system-prompts, templates, optimization
---

# Implementation Plan 46 — Prompt Templates & Optimization

> Written after the binary-tree research expansion (see `39-binary-tree-expansion-master-plan.md`, `47-branch-9router-internal-threads.md`).
> This plan covers the "prompt templates" option: managed prompt templates and optimization.

## 1. Goal

Add managed prompt templates to 9Router: versioned system prompts, template variables, A/B testing, and optimization — so prompt quality is managed and measurable.

## 2. Background (from research)

- **9Router current state**: no prompt template system; system prompts embedded in requests.
- **Research findings**: versioned templates enable A/B testing; template variables reduce duplication; prompt optimization (shortening, restructuring) improves cost/quality.

## 3. Design

### 3.1 Template System

- **Template model**: name, version, content, variables.
- **Template variables**: {{var}} substitution.
- **Template registry**: versioned template store.

### 3.2 Template Management

- **Template CRUD**: dashboard + API.
- **Template versioning**: version history + rollback.
- **Template validation**: variable validation.

### 3.3 A/B Testing

- **Test setup**: variant assignment (per-request, per-user).
- **Outcome tracking**: quality/cost/latency per variant.
- **Test analysis**: variant comparison.

### 3.4 Optimization

- **Length optimization**: token reduction suggestions.
- **Structure optimization**: best-practice checks.
- **Optimization reports**: per-template.

## 4. Implementation Steps

1. Build template system.
2. Add template management.
3. Add A/B testing.
4. Add optimization reports.
5. Tests: templates, variables, A/B.

## 5. Files Touched

- `src/lib/templates/` (new: model, registry)
- `src/sse/handlers/chat.js` (template resolution)
- `src/app/api/v1/templates/route.js` (new)
- Dashboard templates page (new)
- `tests/unit/templates.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Variable injection | Validation |
| A/B noise | Sample sizing |
| Version confusion | Clear versioning |
| Optimization bias | Data-driven |

## 7. Success Criteria

- Templates versioned + manageable.
- Variables validated.
- A/B testing operational.
- Optimization reports available.

## 8. Related Plans
- Plan 36 (Comparison) — A/B synergy.
- Plan 26 (Token Optimization) — length optimization.
- Plan 12 (UX) — template UX.