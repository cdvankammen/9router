---
Date: 2026-09-16
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, i18n, localization, multi-language
---

# Implementation Plan 30 — i18n & Localization

> Written after the binary-tree research expansion (see `39-binary-tree-expansion-master-plan.md`, `47-branch-9router-internal-threads.md`).
> This plan covers the "i18n" option: full internationalization of the dashboard and CLI.

## 1. Goal

Complete 9Router's internationalization: full i18n coverage of the dashboard, CLI messages, and docs — with language detection, switching, and translation management.

## 2. Background (from research)

- **9Router current state**: i18n exists (`src/app/i18n/`, `public/i18n/`); README translated (zh-CN, es, fr, ja, etc.).
- **Research findings**: i18n must cover UI strings, dates, numbers, and error messages; language detection (browser, settings); translation management (keys, fallback).

## 3. Design

### 3.1 i18n Framework

- **Key-based**: all UI strings keyed.
- **Fallback**: missing translation → English.
- **Pluralization**: per-locale plural rules.
- **Date/number formatting**: per-locale.

### 3.2 Language Handling

- **Detection**: browser language, settings, URL param.
- **Switching**: in-app language switcher.
- **Persistence**: language preference stored.

### 3.3 Translation Management

- **Translation files**: per-locale JSON.
- **Coverage check**: missing keys report.
- **Translation workflow**: extract keys → translate → verify.

### 3.4 Scope

- **Dashboard**: all pages, components, errors.
- **CLI**: messages, prompts, tray.
- **Docs**: README translations maintained.

## 4. Implementation Steps

1. Audit current i18n coverage.
2. Build key-based framework.
3. Add language detection/switching.
4. Add coverage check.
5. Translate remaining strings.
6. Tests: i18n coverage, fallback, switching.

## 5. Files Touched

- `src/app/i18n/` (extend)
- `public/i18n/` (translations)
- `cli/src/` (CLI messages)
- `scripts/check-i18n-coverage.mjs` (new)
- `tests/unit/i18n.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Coverage gaps | Coverage check in CI |
| Translation drift | Key-based; fallback |
| Pluralization bugs | Per-locale rules |
| Scope creep | Prioritized locales |

## 7. Success Criteria

- Dashboard fully keyed.
- Language switching works.
- Coverage check passes.
- CLI messages localized.

## 8. Related Plans
- Plan 12 (UX) — dashboard UX.
- Plan 29 (CLI) — CLI messages.
- Plan 20 (Master Rules) — i18n rules.