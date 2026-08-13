# Learnings — Provider Observability & Usage Fixes

**Date:** 2026-08-12
**Author:** Claude Code agent (main session, v1 branch)
**Status:** active
**Tags:** #learnings #usage #observability #capabilities #openrouter #quota

Six related threads, all one theme: *the dashboard under-reports what's actually
happening per provider.* Plan: `plans/curried-chasing-lerdorf`. This captures the
non-obvious decisions and their rationale so the next session doesn't re-derive them.

---

## 1. `include_usage` on the default executor — but guarded

**Problem.** OpenRouter (and every OpenAI-compatible provider) runs through the
generic `DefaultExecutor`. Only `iflow.js` ever injected `stream_options`, so on
the default path streams carried no usage chunk. The gateway fell back to a
`chars/4` estimate, and for tool-only / empty-text responses `saveUsageStats()`
early-returns on `in===0 && out===0` (`chatCore/requestDetail.js`) — usage was
**silently dropped entirely**, not just approximated.

**Decision.** Inject `stream_options = { include_usage: true }` in
`DefaultExecutor.transformRequest()` — but **behind a `supportsIncludeUsage()`
guard**, not the plan's naive "always inject when streaming."

**Why the guard.** `stream_options` is a chat-completions-only field. A
`responses`-format, Anthropic, Gemini, or Ollama upstream would **400** on it.
The guard rejects: `quirks.noIncludeUsage`, any non-`openai` `config.format`, and
`openai-compatible-*` providers whose resolved API type is `responses` rather
than `chat`. It also never clobbers a caller-supplied `stream_options`.

**Takeaway.** When a fix broadcasts a request field across "all providers on a
path," check that the field is universal to that path's wire format first. The
default executor serves multiple formats behind one class.

`open-sse/executors/default.js:84-100`

## 2. Quota tracker is a deliberate allowlist

A provider appears in the quota/credit tracker only if **both**: its registry
entry has `features.usage`, AND there's a `USAGE_HANDLERS` entry in
`open-sse/services/usage.js`. This is by design, not a bug — it's why custom
providers and OpenRouter were missing.

OpenRouter was closable because `/api/v1/auth/key` already exists (it was being
called and discarded in test utils). Modeled the handler + `parseQuotaData` case
on the existing `getVercelAiGatewayUsage` precedent. Handle `limit: null` →
"unlimited" (the auto-ping layer already models unlimited).

**Custom providers stay deferred** — there's no generic usage endpoint to query.

## 3. Error visibility — reuse System B, not the chip's System A

There are **two** error systems:
- **System A** — a per-account `lastError` *string*. Drives the red chip on the
  provider card. One value, no history.
- **System B** — the `requestDetails` table, grouped into fingerprints by
  `/api/messages?view=errors&provider=<id>`: count, first/last seen, category,
  sampleError, detailId. Already powers the Messages "Error Inbox."

**Decision.** The provider-page panels read **System B**. It carries real
history with zero schema change; System A is a dead end for a log view.

**Gotcha that cost time.** The `requestDetails` `model` column stores the **bare
model id** (matches `model.id` in the UI), NOT the alias or `provider/model`
fullModel. Per-model grouping (the `errorsByModel` map in `page.js`) must key on
`model.id`, or every chip shows zero.

`ErrorGroupList.js`, `ProviderErrorPanel.js`, `page.js` (errorsByModel map).

## 4. Provider usage card — no server-side provider filter

`/api/usage/stats?period=` returns `byProvider[id]` (easy) and `byModel` keyed by
`"<rawModel> (<providerId>)"`. There is **no** server-side provider filter on
`byModel`. `ProviderUsageCard.js` filters client-side with
`key.endsWith('(<providerId>)')`. Reused `OverviewCards` for the totals.

## 5. Capability overrides — settings blob + merge + cache invalidation

Static `capabilities.js` couldn't be edited per-model. Added `modelCapOverrides`
(`{ [fullModel]: { vision, audioInput, ... } }`) to settings, a
`mergeUserCapabilityOverrides` layered over static caps, and merged output on
`/api/models`. The subtle part: `useModelCaps` caches `/api/models` at module
level, so a toggle needs `refresh()` / `invalidateModelCaps()` or the combo
pickers keep showing stale caps. F4 ("dynamic filtering") then needed **no code**
— the pickers already read caps via `capFilter` + `getCaps`.

## 6. Regression judging (reminder)

The suite is not all-green by design. `npx vitest run` → 1811 pass / 86 fail, but
`tests/__baseline__/verify-no-regression.mjs <report.json>` reported 86 known /
0 stale / **0 NEW** (exit 0). Generate the JSON with
`npx vitest run --reporter=json --outputFile=/tmp/vitest-current.json` first —
the verifier requires the report path as an argument. Provider/alias baseline
drift here was from unrelated v1 work, not these edits.

## Related
- `../decisions/ADR-008-provider-page-observability-reuse.md`
- `../CHANGELOG.md` UPDATE 2026-08-12
- `../../planning/2026-08-12-combo-duplicate-search-capabilities-plan.md`
- `2026-08-09-messages-page-audit-and-refactor.md` (System B origin)
