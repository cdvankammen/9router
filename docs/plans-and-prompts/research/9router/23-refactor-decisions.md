# Refactor Decisions — Research-Grounded (2026-08-08)

**Date:** 2026-08-08
**Author:** GitHub Copilot agent
**Status:** active
**Tags:** #research #refactor #decisions #architecture #patterns

## Grounding sources

- **Circuit Breaker / Retry patterns** — Martin Fowler, "CircuitBreaker"
  (martinfowler.com/bliki/CircuitBreaker.html, 2014) + Microsoft Azure
  Architecture Center "Circuit Breaker Pattern" (learn.microsoft.com/azure/
  architecture/patterns/circuit-breaker, 2025): trip after a failure
  threshold, half-open probe, reset on success, monitor state changes,
  differentiate error types (timeouts vs connection vs 429), manual override.
- **Faceted search** — facet counting done at query time via GROUP BY is the
  standard (Elasticsearch faceted navigation; the 10k-row JS-count approach
  violated both correctness and latency).
- **Retry semantics** — Azure "Retry pattern": retries are for transient
  faults; retry logic must stop when the breaker indicates a non-transient
  fault; backoff/jitter avoids retry storms.
- **Config merge semantics** — deep-merge for config objects, replace for maps
  the sender owns (observed in practice across config systems); deleting a map
  entry = sending the map without it.

## Decisions

### D1 — Provider failure handling: circuit-breaker-style auto-disable (DONE, Phase 4)
- **Context:** xAI refresh failures hammered the refresh endpoint forever;
  providers with revoked tokens stayed silently dead.
- **Decision:** consecutive-failure counter on the connection record
  (`refreshFailCount`), trip at 3 (`needsReauthReason`, `isActive=false`),
  reset on success. Health endpoint surfaces state (closed/open semantics via
  `auth: needs-reauth`).
- **Grounded in:** Fowler/Azure circuit breaker (threshold + reset-on-success
  + state observability). Chosen over a full state machine (open/half-open)
  because the protected operation (OAuth refresh) has a human-recovery path —
  re-auth — so half-open probing is unnecessary; a manual override (UI
  re-enable) exists per Azure's "manual override" guidance.
- **Follow-up (future):** differentiate error types (only trip on
  `invalid_grant`/401, not network blips); alert on state change (banner
  exists; webhook is P2).

### D2 — Facets/histogram in SQL, never in JS over fetched rows (DONE, BUG-E/F)
- **Context:** messages page fetched 10k full JSON records per load to count
  facets; counts truncated, current-hour histogram bucket missing.
- **Decision:** `getRequestFacets()` with `COUNT(*) GROUP BY` + light
  timestamp/status query; shared `buildWhere()`.
- **Grounded in:** faceted-search practice; also the principle that COUNT
  should be computed by the engine that owns the data.
- **Follow-up:** if the table grows large, add a `facets` materialized view or
  daily rollups; index on `(timestamp, provider, model, status)`.

### D3 — Settings merge semantics: config merge vs map replace (DONE, BUG-A)
- **Context:** partial PATCH of nested config either shadowed defaults or
  clobbered prior PATCHes (both bugs existed across iterations).
- **Decision:** `CONFIG_MERGE_KEYS` (smartRouter, capacityAdapter,
  srComboCleanup) accumulate against the stored value; `MAP_REPLACE_KEYS`
  (modelFallbacks, *Strategies, quotaVisibility, dnsToolEnabled) are
  replace-semantics (deletes honored).
- **Grounded in:** config-management convention; preserves both the UI's
  full-object writes and external partial-PATCH callers.
- **Follow-up:** document the two classes in the API (OpenAPI/README) so
  external callers know which keys are partial-updatable.

### D4 — Retry policy: retry transient, fail-fast otherwise (VERIFIED in combo.js)
- **Context:** combo engine retries models; must not retry non-retryable errors.
- **Decision (verified correct):** `checkFallbackError` short-circuits
  non-retryable; retries same model up to `retriesPerModel`; exceptions move to
  next model without retry; 429/5xx respect Retry-After with bounded cooldown.
- **Grounded in:** Azure Retry + Circuit Breaker interplay.
- **Follow-up:** add jitter to retries; consider exponential backoff for 429
  retry storms (currently fixed cooldown ≤5s).

### D5 — Drawer/viewport resilience (DONE in shared components)
- **Context:** fixed 800px drawer overflowed compact windows (spec §12.1);
  payload text unscrollable (spec §12.2).
- **Decision:** `w-[min(800px,100vw)]` on Drawer; wrap/no-wrap toggle in
  FormatTabs; `min-h-0` flex chains.
- **Grounded in:** responsive-design practice; direct manipulation guidance
  (user's request).

### D6 — Observability: atomic writes + drop surfacing (DONE, Phase 3)
- **Context:** markdown flush could be read partially; 1000-record cap was
  silent.
- **Decision:** temp-file + atomic rename (POSIX rename) for markdown;
  `droppedRecords` counter + status endpoint + amber banner.
- **Grounded in:** atomic-write practice (readers never see partial files);
  "observability must not be silent" (research synthesis §5).

### D7 — Source-app classification: privacy-first UA fingerprinting (DONE)
- **Context:** need "which client hit the gateway" without storing raw UA.
- **Decision:** rule-list → stable class; never persist raw UA; cap length.
- **Grounded in:** research D.4 (privacy: UA can fingerprint a person).
- **Follow-up:** keep the rule list ordered most-specific-first; add tests for
  new UAs (BUG-B showed the cost of a too-broad regex).

### D8 — Deferred consolidation: 5 fallback-rule views
- **Context:** Table / Chain Flow / Simple+Advanced / Wizard / Expert Text
  overlap; user will pick one.
- **Decision:** keep all until user picks; then archive the losers (remove
  from switcher, keep components reachable via Expert Text-style escape
  hatch if desired).
- **Grounded in:** feature-bloat guidance (NN/g progressive disclosure: no
  more than 2 disclosure levels for rarely-used features).

## Non-decisions (explicitly out of scope)

- Full circuit-breaker state machine (open/half-open/closed) for providers —
  human re-auth makes it overkill (D1 rationale).
- Materialized facet views — premature until table size demands it.
- Multi-server markdown logs — single-server assumption documented (E6).

## Applying this document

Each decision maps to a commit (see 21-audit-no-more-bugs.md). Revisit when:
- provider failure modes change (D1 thresholds),
- requestDetails grows past ~100k rows (D2),
- the user picks a fallback-rule view (D8).
