# ADR-008: Provider-page observability reuses System B (requestDetails), not the card chip

**Date:** 2026-08-12
**Author:** Claude Code agent
**Status:** active
**Tags:** #decision #observability #errors #usage #providers

## Context

The provider **card** shows a red error chip, but the provider **detail page**
showed nothing about that error, its history, or per-model breakdown. The user
wanted real provider- and per-model-level error logs plus current/recent usage
on the detail page.

Two error systems exist:
- **System A** — a per-account `lastError` *string*. One value, no history. Drives
  the card chip.
- **System B** — the `requestDetails` table, grouped into fingerprints by
  `/api/messages?view=errors&provider=<id>` (count, first/last seen, category,
  sampleError, detailId). Already powers the Messages "Error Inbox."

## Decision

The provider-detail error panels read **System B**, not System A. Usage cards read
the existing `/api/usage/stats` aggregate. No schema changes, no new endpoints.

- `ProviderErrorPanel.js` + `ErrorGroupList.js` render grouped System B errors;
  each row's "Analyze" reuses `POST /api/analyze-error {detailId}` (ADR-003).
- `page.js` fetches errors once, builds an `errorsByModel` map keyed on
  `model.id`, and threads `errorGroups` into each `ModelRow` for an inline
  expandable per-model chip.
- `ProviderUsageCard.js` reads `/api/usage/stats?period=`, maps `byProvider[id]`
  into `OverviewCards`, and filters `byModel` client-side by
  `key.endsWith('(<providerId>)')`.

## Why

System B already carries the history a log view needs; System A is a single string
and a dead end. Reusing `/api/messages?view=errors` and `/api/usage/stats` means
zero migrations and zero new SSRF/auth surface — the detail page is pure
presentation over data the Messages and Usage pages already expose.

## Consequences

- **Gotcha:** `requestDetails.model` stores the **bare model id** (matches
  `model.id`), not the alias/fullModel — per-model grouping must key on `model.id`
  or every chip reads zero.
- No server-side provider filter on `byModel`; the usage card filters client-side.
- Accurate token/cost numbers for OpenRouter depend on the `include_usage` fix
  landing first (same session).

## Related

- ADR-003 (analyze-error pipeline), ADR-007 (messages storage)
- `../learnings/2026-08-12-provider-observability-and-usage-fixes.md`
- `../CHANGELOG.md` UPDATE 2026-08-12
