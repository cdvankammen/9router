# Error Sweep — Messages Needing Action (2026-08-08)

**Date:** 2026-08-08
**Author:** GitHub Copilot agent
**Status:** active
**Tags:** #research #errors #logs #observability #action-items

## Source

Live in-app Console Log on :20130 (production build) + code paths that emit
errors. Each entry: evidence, current handling, required action, owner.

## Open items

### E1 — xAI refresh token revoked (`invalid_grant`)
- **Evidence (2026-08-07 log):** `[TOKEN_REFRESH] xai refresh failed: xAI token refresh failed: {"error":"invalid_grant","error_description":"Invalid or unknown refresh token"}`
- **Current handling:** fail-open (refresh attempted, error logged); Phase 4
  auto-disable (3 strikes) now trips after repeated failures and marks the
  connection `needsReauthReason` — surfaced on the providers page banner.
- **Required action (user):** re-auth the xAI connection in the dashboard.
  Until then xAI stays disabled (auto-disable is now correct behavior).

### E2 — OpenRouter guardrail/privacy 404 on gpt-4o-mini
- **Evidence (2026-08-07 log):** `✗ ERROR 404 · openrouter/openai/gpt-4o-mini · "No endpoints available matching your guardrail restrictions and data policy"`
- **Current handling:** model locked 120s + fallback to next model (worked —
  adapter fell to mimo and succeeded). Error detail surfaces in request details.
- **Required action (user):** adjust https://openrouter.ai/settings/privacy if
  gpt-4o-mini should be usable. Optional code follow-up: when a 404 body
  contains "guardrail", add a hint in the UI error drawer ("check provider
  privacy settings") — tracked as a low-priority polish.

### E3 — B3: conversation view is page-window-scoped
- **Symptom:** conversations spanning >1 page show partial chains; totals are
  per-page not per-conversation (review doc 20, verified).
- **Current handling:** none (design gap).
- **Action:** dedicated conversation-grouped query (messages table grouped by
  conversationId with windowed aggregation). P3-sized; deferred.

### E4 — B4: cURL tab uses `<provider-endpoint>` placeholder
- **Symptom:** exported cURL cannot be run as-is; the upstream URL is never
  captured.
- **Current handling:** placeholder + explanatory comments; headers tab
  documents capture limits.
- **Action:** capture `providerUrl` at request time (P3 enrichment) and emit it
  in cURL. Deferred.

### E5 — 1000-record observability cap
- **Symptom:** requestDetails silently drops oldest beyond
  `observabilityMaxRecords` (default 1000).
- **Current handling:** NEW Phase 3 — `droppedRecords` counter +
  `/api/observability/status` + amber banner in Request Details when drops
  occur.
- **Action:** if production volume exceeds 1000 records per flush window,
  raise the setting in Settings → Observability. No code change needed.

### E6 — Markdown log is a daily snapshot, not append
- **Symptom:** concurrent servers can last-writer-win the daily file.
- **Current handling:** Phase 3 atomic temp+rename (no partial files); single
  server assumed.
- **Action:** none unless multi-server logs needed (then per-process files).

## Resolved by this session's hardening (no action needed)

- Shallow settings merge (BUG-A) — fixed with CONFIG_MERGE_KEYS/MAP_REPLACE_KEYS.
- Messages status filter returning empty (BUG-G) — vocabulary fixed.
- Facets perf/truncation + histogram hour bug (BUG-E/F) — SQL facets fixed.
- JSON1 filters breaking pagination (BUG-D) — fixed.
- Provider refresh hammering (E1 auto-disable) — Phase 4 circuit-breaker-style
  auto-disable (see refactor-decisions).

## How to re-sweep

1. Production build on :20130 → login → System → Console Log.
2. Grep for `✗`, `ERROR`, `FAIL`, `invalid_grant`, `guardrail`, `locked`.
3. Cross-check each against this list; new patterns → add here with evidence.
