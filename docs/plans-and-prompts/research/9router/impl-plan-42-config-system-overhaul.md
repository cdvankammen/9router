---
Date: 2026-09-16
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, config, settings, schema, validation, env
---

# Implementation Plan 42 — Configuration System Overhaul

> Written after the binary-tree research expansion (see `39-binary-tree-expansion-master-plan.md`, `47-branch-9router-internal-threads.md`).
> This plan covers the "config system" option: a unified, validated configuration system.

## 1. Goal

Overhaul 9Router's configuration: unified config schema, validation, env contract, and UI parity — so configuration is consistent, validated, and documented.

## 2. Background (from research)

- **9Router current state**: .env.example contract; config in open-sse/config/; dashboard settings; file-based + UI config parity noted in CLAUDE.md.
- **Research findings**: config needs a single schema; validation at load; env contract documented; UI/file parity enforced.

## 3. Design

### 3.1 Unified Config Schema

- **Config schema**: single schema for all config (env, file, UI).
- **Config sources**: env → file → UI (precedence).
- **Config types**: typed config (string, number, bool, enum).

### 3.2 Validation

- **Load-time validation**: validate on load; clear errors.
- **Schema validation**: JSON-schema-style validation.
- **Cross-field validation**: dependent fields.

### 3.3 Env Contract

- **Env docs**: auto-generated env docs from schema.
- **Env validation**: validate env at startup.
- **Env defaults**: documented defaults.

### 3.4 UI Parity

- **UI config**: all file config editable in UI.
- **Sync**: UI ↔ file sync.
- **Config export/import**: portable config.

## 4. Implementation Steps

1. Define unified schema.
2. Build validation.
3. Auto-generate env docs.
4. Enforce UI parity.
5. Add export/import.
6. Tests: validation, parity.

## 5. Files Touched

- `src/lib/config/` (new: schema, validation)
- `open-sse/config/` (schema integration)
- `.env.example` (generated)
- Dashboard settings (extend)
- `tests/unit/config.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Migration churn | Backward-compatible |
| Validation friction | Clear errors |
| Parity gaps | Parity tests |
| Schema drift | Single source |

## 7. Success Criteria

- Single schema governs all config.
- Validation at load.
- Env docs auto-generated.
- UI/file parity enforced.

## 8. Related Plans
- Plan 33 (Docs) — env docs.
- Plan 12 (UX) — settings UX.
- Plan 20 (Master Rules) — config rules.