---
Date: 2026-09-16
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, error-messages, user-facing, clarity, communication
---

# Implementation Plan 61 — User-Facing Error Messages

> Written after the binary-tree research expansion (see `39-binary-tree-expansion-master-plan.md`, `47-branch-9router-internal-threads.md`).
> This plan covers the "error messages" option: clear, actionable user-facing error messages.

## 1. Goal

Improve user-facing error messages across 9Router: clear language, actionable guidance, consistent formatting, and localization — so users can resolve errors themselves.

## 2. Background (from research)

- **9Router current state**: errors pass through from upstream; some raw.
- **Research findings**: error messages need — plain language, what happened, why, how to fix; consistent format; localization; actionable links.

## 3. Design

### 3.1 Message Framework

- **Message structure**: title, description, cause, action, reference.
- **Message registry**: per-error-code messages.
- **Message fallback**: generic message for unknown errors.

### 3.2 Actionable Guidance

- **Action types**: retry, check config, check quota, contact support.
- **Action links**: dashboard links where relevant.
- **Action docs**: doc links.

### 3.3 Consistency

- **Format**: consistent JSON + UI format.
- **Tone**: consistent tone (no jargon).
- **Status codes**: consistent mapping.

### 3.4 Localization

- **Message keys**: keyed messages.
- **Translations**: per-locale messages.
- **Fallback**: English fallback.

## 4. Implementation Steps

1. Define message framework.
2. Write messages per error code.
3. Add actionable guidance.
4. Add localization.
5. Tests: message coverage, format.

## 5. Files Touched

- `open-sse/config/errorMessages.js` (new)
- `src/lib/i18n/` (message keys)
- `open-sse/handlers/chatCore.js` (message resolution)
- `tests/unit/error-messages.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Message drift | Registry-driven |
| Translation gaps | Fallback |
| Jargon | Review |
| Coverage gaps | Coverage check |

## 7. Success Criteria

- All errors have clear messages.
- Guidance actionable.
- Format consistent.
- Localized.

## 8. Related Plans
- Plan 19 (Unified Error System) — error codes.
- Plan 30 (i18n) — localization.
- Plan 12 (UX) — error UX.