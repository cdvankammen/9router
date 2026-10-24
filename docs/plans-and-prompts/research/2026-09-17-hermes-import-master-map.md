---
Date: 2026-09-17
Author: GitHub Copilot agent (6-level binary tree expansion)
Status: active
Tags: research, hermes-import, master-map, index, binary-tree, implementation-plans
---

# Master Map — Hermes Message Import (External Agent Traffic Recording)

This is the **master index** for the Hermes Message Import research and implementation effort. It connects all branch docs, implementation plans, and prior research so any agent can navigate the full body of work.

## 0. The Requirement (verbatim)

> "i want to be able to import all the message requests from hermes agents. meaning that there has to be a log of all the message requests and what they looked like to and from the provider. is there a way we could do this and if so how and there should be a way to match it up with current providers based on the name of the models that were in them thus making good records possible to update our logs. meaning that even if i didn't initially go through 9router, i could still record and figure out the codes, the messages, the errors and everything as though it did go through 9router."

> "continue ... build out more information and add it to our research folder worth of things as well as get more documentation and more options and implementation option plans (meaning that these need to be known as connected together, but it needs to be known how to do the work even down to the code for each option that you find and finding a way for all of this to be possible that will allow you to even build things out.)"

## 1. The Research Tree (16 branches)

The research was expanded into a binary tree. Each level-1 branch has its own doc.

```
L0 ROOT: Hermes Message Import & External Agent Traffic Recording
│
├─ A: LOG CAPTURE MECHANISMS .................. 2026-09-17-hermes-import-branch-a-log-capture.md
│   ├─ A1: Hermes Hook (post-request webhook)
│   ├─ A2: Log File Tail (parse existing logs)
│   ├─ A3: Transparent Proxy (route through 9Router)
│   └─ A4: Manual Import (paste/upload JSON)
│
├─ B: PROVIDER MATCHING BY MODEL NAME ......... 2026-09-17-hermes-import-branch-b-provider-matching.md
│   ├─ B1: Model Name Normalization
│   ├─ B2: Provider Registry Integration
│   ├─ B3: Unknown Model Handling
│   └─ B4: Matching Performance
│
├─ C: ERROR RECONSTRUCTION ..................... 2026-09-17-hermes-import-branch-c-error-reconstruction.md
│   ├─ C1: HTTP Status Classification
│   ├─ C2: Error Body Parsing
│   ├─ C3: Error Categorization
│   ├─ C4: Error Recovery Suggestions
│   └─ C5: Error Aggregation
│
├─ D: COST CALCULATION FROM MODEL NAMES ....... 2026-09-17-hermes-import-branch-d-cost-calculation.md
│   ├─ D1: Pricing Data Sources
│   ├─ D2: Token Counting
│   ├─ D3: Cost Formula
│   ├─ D4: Cost Display
│   └─ D5: Cost Accuracy
│
├─ E: CONVERSATION RECONSTRUCTION ............. 2026-09-17-hermes-import-branch-e-conversation-reconstruction.md
│   ├─ E1: Conversation ID Detection
│   ├─ E2: Message Ordering
│   ├─ E3: Conversation Metadata
│   ├─ E4: Conversation Viewer UI
│   └─ E5: Conversation Merging
│
├─ F: PROXY/INTERCEPT PATTERNS ................ 2026-09-17-hermes-import-branch-f-proxy-intercept.md
│   ├─ F1: HTTP Proxy
│   ├─ F2: DNS Hijack
│   ├─ F3: Library Interception
│   ├─ F4: SDK Wrapping
│   └─ F5: Method Comparison
│
├─ G: DATABASE SCHEMA & STORAGE ............... 2026-09-17-hermes-import-branch-g-database-schema.md
│   ├─ G1: Table Design
│   ├─ G2: Schema Definition
│   ├─ G3: Migration Strategy
│   ├─ G4: Query Patterns
│   └─ G5: Performance Considerations
│
├─ H: UI/UX INTEGRATION ....................... 2026-09-17-hermes-import-branch-h-ui-ux.md
│   ├─ H1: Messages Page Enhancements
│   ├─ H2: Message Detail View
│   ├─ H3: Error Inbox Integration
│   ├─ H4: Dashboard Quota Page
│   ├─ H5: Unknown Models UI
│   └─ H6: Import Workflow UI
│
├─ I: DATA NORMALIZATION & SANITIZATION ....... 2026-09-17-hermes-import-branch-i-normalization-sanitization.md
│   ├─ I1: Schema Normalization
│   ├─ I2: Sensitive Data Sanitization
│   ├─ I3: Format Conversion
│   ├─ I4: Validation & Error Handling
│   └─ I5: Configuration
│
├─ J: TESTING & VERIFICATION STRATEGY ......... 2026-09-17-hermes-import-branch-j-testing-verification.md
│   ├─ J1: Unit Tests
│   ├─ J2: Integration Tests
│   ├─ J3: End-to-End Tests
│   ├─ J4: Performance Tests
│   └─ J5: Verification Checklist
│
├─ K: PERFORMANCE & SCALABILITY ............... 2026-09-17-hermes-import-branch-k-performance-scalability.md
│   ├─ K1: Import Throughput
│   ├─ K2: Query Performance
│   ├─ K3: Storage Optimization
│   ├─ K4: Concurrency Control
│   ├─ K5: Resource Limits
│   └─ K6: Scalability Limits
│
├─ L: SECURITY & PRIVACY ...................... 2026-09-17-hermes-import-branch-l-security-privacy.md
│   ├─ L1: Authentication & Authorization
│   ├─ L2: Data Sanitization
│   ├─ L3: Encryption
│   ├─ L4: Access Control
│   ├─ L5: Privacy Compliance
│   └─ L6: Incident Response
│
├─ M: INTEGRATION WITH EXISTING COMPONENTS .... 2026-09-17-hermes-import-branch-m-integration-existing-components.md
│   ├─ M1: requestDetailsRepo.js
│   ├─ M2: usageDb.js
│   ├─ M3: errorCategorizer.js
│   ├─ M4: providerModels.js
│   ├─ M5: sourceApps.js
│   └─ M6: Messages Page UI
│
└─ N: MIGRATION & BACKWARD COMPATIBILITY ...... 2026-09-17-hermes-import-branch-n-migration-backward-compatibility.md
    ├─ N1: Database Migration
    ├─ N2: API Backward Compatibility
    ├─ N3: UI Backward Compatibility
    ├─ N4: Configuration Backward Compatibility
    ├─ N5: Historical Data Migration
    └─ N6: Rollback Strategy

─── SECOND WAVE (2026-09-17, expansion) ──────────────────────────────────────

├─ O: OBSERVABILITY EXPORT & INTEROP .......... 2026-09-17-hermes-import-branch-o-observability-export.md
│   ├─ O1: Export Targets (Langfuse/OTel/Helicone/Webhook)
│   ├─ O2: Import from Observability Platforms
│   ├─ O3: Export Formats (JSONL/CSV/HAR)
│   ├─ O4: Sync Scheduling
│   └─ O5: Interop Standards (OTel GenAI conventions)
│
├─ P: MULTI-TENANT & MULTI-USER ................ 2026-09-17-hermes-import-branch-p-multi-tenant.md
│   ├─ P1: Tenant Models (single/multi-user/machine/workspace)
│   ├─ P2: Attribution Dimensions (agent, session)
│   ├─ P3: Access Control (scoped queries, key scoping)
│   ├─ P4: Shared vs Private
│   └─ P5: Tenant-Level Config
│
├─ Q: IMPORT AUTOMATION & SCHEDULING ........... 2026-09-17-hermes-import-branch-q-automation-scheduling.md
│   ├─ Q1: Scheduled Imports (cron, watch folder)
│   ├─ Q2: Event-Driven Triggers
│   ├─ Q3: Retry & Failure Handling (dead letter)
│   ├─ Q4: Backfill Jobs
│   └─ Q5: Job Management (status API, cancellation)
│
├─ R: DATA RETENTION & LIFECYCLE ............... 2026-09-17-hermes-import-branch-r-retention-lifecycle.md
│   ├─ R1: Retention Policies (time/size-based)
│   ├─ R2: Archival (JSONL.gz, SQLite)
│   ├─ R3: Purging (scheduled/manual)
│   ├─ R4: Cold Storage (S3/local)
│   └─ R5: Restore
│
├─ S: DEDUPLICATION & IDEMPOTENCY .............. 2026-09-17-hermes-import-branch-s-deduplication-idempotency.md
│   ├─ S1: Dedup Strategies (fingerprint, natural key, time-window)
│   ├─ S2: Idempotency Keys (client/batch)
│   ├─ S3: Dedupe Pipeline (pre/post insert)
│   ├─ S4: Duplicate Reporting
│   └─ S5: Edge Cases (streaming retries, clock skew)
│
├─ T: FORMAT ADAPTERS & PARSERS ............... 2026-09-17-hermes-import-branch-t-format-adapters.md
│   ├─ T1: Agent Log Formats (Hermes/Claude Code/Cursor/Codex/OpenAI)
│   ├─ T2: Proxy Log Formats (log.txt, usage.json, mitmproxy)
│   ├─ T3: Trace Formats (OTel, Langfuse, Weave)
│   ├─ T4: Parser Architecture (registry, streaming)
│   └─ T5: Validation & Errors
│
├─ U: STREAMING & REAL-TIME IMPORT ............. 2026-09-17-hermes-import-branch-u-streaming-realtime.md
│   ├─ U1: Streaming Uploads (NDJSON, chunked, multipart)
│   ├─ U2: SSE Push (agent → 9Router, 9Router → dashboard)
│   ├─ U3: Live Tailing
│   ├─ U4: Backpressure & Buffering
│   └─ U5: Realtime Metrics
│
├─ V: ANALYTICS & INSIGHTS ..................... 2026-09-17-hermes-import-branch-v-analytics-insights.md
│   ├─ V1: Usage Analytics (unified stats, trends)
│   ├─ V2: Provider Comparison (leaderboard, reliability)
│   ├─ V3: Error Analytics (rates, wasted spend)
│   ├─ V4: Agent Analytics
│   ├─ V5: Reporting (scheduled, exportable)
│   └─ V6: Anomaly Detection (cost/usage spikes)
│
├─ W: AGENT ADAPTERS & INTEGRATIONS ............ 2026-09-17-hermes-import-branch-w-agent-adapters.md
│   ├─ W1: Hermes Adapter (hook, plugin, log)
│   ├─ W2: Claude Code Adapter (log, proxy)
│   ├─ W3: Cursor Adapter (proxy, log)
│   ├─ W4: Codex Adapter (proxy, log)
│   ├─ W5: Other Agents (Aider, Continue, Cline, SDK)
│   └─ W6: Adapter Selection Guide
│
├─ X: MODEL CATALOG SYNC & RESOLUTION .......... 2026-09-17-hermes-import-branch-x-model-catalog-sync.md
│   ├─ X1: Catalog Sources (local registry, OpenRouter, models.dev, LiteLLM)
│   ├─ X2: Unknown Model Workflow (detect, review, resolve)
│   ├─ X3: Catalog Sync Jobs
│   ├─ X4: Model Metadata (pricing, capabilities)
│   └─ X5: Aliases & Normalization
│
├─ Y: API DESIGN & CONTRACTS ................... 2026-09-17-hermes-import-branch-y-api-design.md
│   ├─ Y1: Endpoint Surface (import/upload/events/config/jobs/unknown)
│   ├─ Y2: Payload Schema
│   ├─ Y3: Error Contracts (status codes, error codes)
│   ├─ Y4: Versioning
│   ├─ Y5: Client SDKs (Node, Python, curl)
│   └─ Y6: Rate Limiting
│
└─ Z: QUALITY, VERIFICATION & ROLLOUT .......... 2026-09-17-hermes-import-branch-z-quality-rollout.md
    ├─ Z1: Acceptance Criteria
    ├─ Z2: Verification Harness (fixtures, round-trip, fuzz)
    ├─ Z3: Rollout Stages (manual → log → hook → automation)
    ├─ Z4: Success Metrics
    ├─ Z5: Regression Protection
    └─ Z6: Documentation Deliverables
```

## 2. Implementation Plans (connected, with code)

Each plan contains **full working code** as a starting point, plus a mandatory note to implementing agents that the code is for review and improvement.

| Plan | File | Depends on | Provides |
|------|------|-----------|----------|
| 01 | `impl-plan-import-01-db-schema.md` | — | `imported_messages` table, repo, `all_messages` view |
| 02 | `impl-plan-import-02-provider-matching.md` | 01 | `matcher.js`, `unknownModels.js`, `unknown_models` table |
| 03 | `impl-plan-import-03-import-api.md` | 01, 02 | `/api/messages/import` endpoint, normalizer, sanitizer, cost, error-recon |
| 04 | `impl-plan-import-04-log-file-tail.md` | 03 | `logWatcher.js`, `logParsers.js`, `syncState.js` |
| 05 | `impl-plan-import-05-hermes-hook.md` | 03 | `/api/messages/import/config`, Hermes config schema |
| 06 | `impl-plan-import-06-error-reconstruction.md` | 03 | `errorReconstructor.js`, `fallbackSuggestions.js`, fingerprinting |
| 07 | `impl-plan-import-07-cost-calculation.md` | 03 | `costCalculator.js`, `costDisplay.js`, confidence |
| 08 | `impl-plan-import-08-messages-page-ui.md` | 03 | Source filter, badges, import modal, metadata section |
| 09 | `impl-plan-import-09-observability-export.md` | 03 | Langfuse/OTel/webhook exporters, JSONL/CSV export |
| 10 | `impl-plan-import-10-multi-tenant-import.md` | 01 | Tenant columns, per-user keys, scoped queries |
| 11 | `impl-plan-import-11-import-scheduler.md` | 03 | `import_jobs` table, job runner, cron, watch folder |
| 12 | `impl-plan-import-12-retention-lifecycle.md` | 01 | Retention config, archive, purge, restore |
| 13 | `impl-plan-import-13-deduplication-idempotency.md` | 01 | Fingerprint, idempotency keys, dedupe pipeline |
| 14 | `impl-plan-import-14-format-adapters.md` | 03 | Parser registry, Hermes/Claude Code/Cursor/Codex parsers |
| 15 | `impl-plan-import-15-streaming-realtime.md` | 03 | NDJSON streaming, SSE push, live tail |
| 16 | `impl-plan-import-16-analytics-insights.md` | 01 | Unified stats, provider leaderboard, error analytics |
| 17 | `impl-plan-import-17-agent-adapters.md` | 03 | Per-agent config snippets, hook payload spec |
| 18 | `impl-plan-import-18-model-catalog-sync.md` | 01 | **Extends** existing models.dev sync (`src/lib/modelCatalog/sync.js`), unknown-model resolution |
| 19 | `impl-plan-import-19-api-contracts.md` | 03 | Shared schemas, error contract, Node/Python SDKs |
| 20 | `impl-plan-import-20-quality-rollout.md` | all | Fixture harness, acceptance tests, rollout checklist |

### Build Order

```
01 (schema) ──► 02 (matcher) ──► 03 (API) ──┬──► 04 (log tail)
                                             ├──► 05 (hermes hook)
                                             ├──► 06 (errors)
                                             ├──► 07 (cost)
                                             ├──► 08 (UI)
                                             ├──► 09 (export)
                                             ├──► 11 (scheduler)
                                             ├──► 14 (parsers)
                                             ├──► 15 (streaming)
                                             ├──► 17 (agent adapters)
                                             └──► 19 (SDKs)
Independent after 01: 10 (tenants), 12 (retention), 13 (dedupe), 16 (analytics), 18 (catalog)
Final gate: 20 (quality/rollout)
```

Plans 01–03 are the critical path (MVP). Plans 04–20 are independent after their dependencies.

## 3. Connection to Prior Research

This work builds directly on existing research:

| Prior research | How it connects |
|---------------|-----------------|
| `message-capture-deep-research-v2.md` | The observability landscape (Langfuse, Helicone, one-api, ccglass) that informed the UX |
| `message-capture-v4-deep-pass.md` | Deep-pagination pass — 90 more projects, 43 papers, gateway catalog |
| `message-capture-gaps-and-risks.md` | Gaps that Hermes import closes (external traffic blind spot) |
| `message-capture-obscure-projects-v3.md` | Obscure projects (ccglass = the "exact UX" reference) |
| `2026-09-16-hermes-message-import-research.md` | The v1 research note (this expands it 100x) |
| `9router/39-binary-tree-expansion-master-plan.md` | The binary-tree research method |
| `9router/40-binary-tree-expansion-report.md` | Tree statistics (12,319 nodes) |
| `2026-09-15-exponential-master-map.md` | Exponential phrase expansion variant |
| `skills/9router-research/SKILL.md` | The skill that governs this research method |
| `skills/9router-message-import/SKILL.md` | The feature skill (this expands its §1–§10) |

## 4. Key Design Decisions

| # | Decision | Rationale | Reversible? |
|---|----------|-----------|-------------|
| 1 | Separate `imported_messages` table (not a flag on `requestDetails`) | Clean provenance, easy audit, can drop without affecting native | Yes |
| 2 | `all_messages` UNION view for unified queries | Keeps queries simple, no app-level merging | Yes |
| 3 | Provider matching by model name with confidence scoring | Handles unknown models gracefully | Yes |
| 4 | Fingerprint deduplication for errors | Reuses Sentry/Errbit proven pattern | Yes |
| 5 | Reuse `errorCategorizer.js` | Consistency with native error inbox | Yes |
| 6 | Reuse `pricingRepo.js` | Consistency with native cost tracking | Yes |
| 7 | Sanitize auth headers by default | Security-by-default | Yes (configurable) |
| 8 | Import API opt-in (`enableImportApi: false` default) | Backward compatible | Yes |

## 5. Component Map (code)

```
NEW CODE
├── src/lib/import/
│   ├── matcher.js              (plan 02)  model → provider matching
│   ├── unknownModels.js        (plan 02)  unknown model registry
│   ├── normalizer.js           (plan 03)  schema normalization
│   ├── sanitizer.js            (plan 03)  header/PII sanitization
│   ├── costCalculator.js       (plan 07)  cost calculation
│   ├── costDisplay.js          (plan 07)  cost formatting
│   ├── errorReconstructor.js   (plan 06)  error categorization
│   ├── fallbackSuggestions.js  (plan 06)  fallback combo suggestions
│   ├── logWatcher.js           (plan 04)  file watcher
│   ├── logParsers.js           (plan 04)  log format parsers
│   ├── syncState.js            (plan 04)  incremental sync position
│   ├── fingerprint.js          (plan 13)  canonical JSON + SHA-256
│   ├── idempotency.js          (plan 13)  idempotency keys
│   ├── retention.js            (plan 12)  retention config + expired finder
│   ├── archive.js              (plan 12)  JSONL.gz archive writer
│   ├── purge.js                (plan 12)  archive-then-purge
│   ├── restore.js              (plan 12)  restore from archive
│   ├── jobRunner.js            (plan 11)  job run/retry/dead-letter
│   ├── scheduler.js            (plan 11)  cron loop
│   ├── watchFolder.js          (plan 11)  fs.watch folder ingestion
│   ├── backpressure.js         (plan 15)  pause/resume buffer
│   ├── tenantKeys.js           (plan 10)  per-user import keys
│   ├── agentDetect.js          (plan 17)  payload → agent detection
│   ├── hookPayloadSchema.js    (plan 17)  hook payload contract
│   ├── schemas.js              (plan 19)  shared schema contract
│   ├── errors.js               (plan 19)  error contract
│   ├── client.js               (plan 19)  Node SDK
│   ├── parsers/
│   │   ├── registry.js         (plan 14)  parser registry + auto-detect
│   │   ├── hermesParser.js     (plan 14)
│   │   ├── claudeCodeParser.js (plan 14)
│   │   ├── cursorParser.js     (plan 14)  uses real cursorProtobuf exports
│   │   └── codexParser.js      (plan 14)
│   └── exporters/
│       ├── langfuseExporter.js (plan 09)  lazy-import Langfuse SDK
│       ├── otelExporter.js     (plan 09)  lazy-import OTel SDKs
│       └── webhookExporter.js  (plan 09)  HMAC-signed webhook
├── src/lib/db/repos/
│   ├── importedMessagesRepo.js (plan 01)  CRUD + queries
│   └── importAnalyticsRepo.js  (plan 16)  unified native+imported analytics
├── src/lib/db/migrations/
│   ├── 005-imported-messages.js   (plan 01)
│   ├── 006-unknown-models.js      (plan 02)
│   ├── 007-import-sync-state.js   (plan 04)
│   ├── 008-import-tenants.js      (plan 10)
│   ├── 009-import-jobs.js         (plan 11)
│   ├── 010-import-archives.js     (plan 12)
│   ├── 011-import-fingerprint.js  (plan 13)
│   └── 012-import-idempotency.js  (plan 13)
├── src/app/api/messages/import/
│   ├── route.js                (plan 03)  POST /api/messages/import
│   ├── config/route.js         (plan 05)  GET  /api/messages/import/config
│   ├── stream/route.js         (plan 15)  POST NDJSON + GET SSE
│   └── events/route.js         (plan 15)  POST SSE events
├── src/app/api/messages/export/
│   └── route.js                (plan 09)  GET JSONL/CSV/target export
├── src/app/api/analytics/
│   └── route.js                (plan 16)  GET usage/providers/errors/anomalies
└── src/app/(dashboard)/dashboard/messages/components/
    ├── SourceBadge.jsx         (plan 08)
    ├── ConfidenceBadge.jsx     (plan 08)
    ├── ImportMetadata.jsx      (plan 08)
    └── ImportModal.jsx         (plan 08)

REUSED CODE
├── src/lib/db/repos/requestDetailsRepo.js   (buffer/flush pattern, sanitizeHeaders)
├── src/lib/db/repos/usageRepo.js            (usageHistory table — live log source)
├── src/lib/db/repos/pricingRepo.js          (pricing, user overrides)
├── src/lib/db/repos/settingsRepo.js         (getSettings/updateSettings)
├── src/lib/db/paths.js                      (DATA_DIR, DB_DIR, LEGACY_FILES)
├── src/lib/db/driver.js                     (getAdapter — run/get/all/exec)
├── src/lib/db/migrations/index.js           (migration registry)
├── src/lib/db/schema.js                     (TABLES + SCHEMA_VERSION)
├── src/instrumentation.js                   (boot hooks: watcher, scheduler, sync)
├── src/lib/modelCatalog/sync.js             (existing models.dev daily sync)
├── open-sse/providers/catalogOverride.js    (catalog read side)
├── open-sse/providers/index.js              (PROVIDER_MODELS — matcher source)
├── open-sse/config/providerModels.js        (getProviderModels)
├── open-sse/providers/pricing.js            (getPricingForModel — $/1M tokens)
├── open-sse/utils/errorCategorizer.js       (categorizeError(status, text))
├── open-sse/services/combo.js               (getComboModelsFromData — fallback suggestions)
├── open-sse/utils/cursorProtobuf.js         (decodeMessage, parseConnectRPCFrame)
└── src/app/(dashboard)/dashboard/messages/* (existing UI components)
```

## 6. Status

| Deliverable | Status |
|------------|--------|
| 14 branch docs (A–N) | ✅ complete |
| 12 branch docs (O–Z, second wave) | ✅ complete |
| 8 implementation plans with code (01–08) | ✅ complete |
| 12 implementation plans with code (09–20, second wave) | ✅ complete |
| **Grounding pass (all 20 plans verified against real codebase)** | ✅ complete (2026-09-20) |
| Master map (this doc) | ✅ complete |
| v1 research note | ✅ complete (`2026-09-16-hermes-message-import-research.md`) |
| Skills (2) | ✅ complete (`9router-research`, `9router-message-import`) |
| Implementation | ⏳ pending (code is in the plans as suggestions, not yet written to `src/`) |

### Grounding pass details (2026-09-20)

Every plan now carries: **AGENT REVIEW NOTE (READ FIRST)** block, **Grounding table** (verified facts with file paths), **function-by-function breakdown tables**, **per-part Steps with verification commands**, **Dependencies & Risks**, **Verification commands**, and the **Note to Implementing Agents** footer.

Key grounding fixes applied across the 20 plans:

| Plan | Fix |
|------|-----|
| 01 | Migration format `export default {version, name, up(db)}`; adapter API `run/get/all/exec` (no `.prepare()`); `all_messages` view uses JSON1 `json_extract` on `data` (no `request_json` columns on `requestDetails`); `SCHEMA_VERSION` bump 3→4 |
| 02 | Real source `open-sse/providers/index.js` `PROVIDER_MODELS` (keyed `alias\|\|id`); registry is `export default [...]` (no `getRegistry()`); `src/config/providerModels.js` doesn't exist |
| 03 | Zod NOT installed → hand-rolled validation; `categorizeError(status, text)` positional; `getPricingForModel(provider, model)`; timing-safe auth from `version/update/route.js` |
| 04 | `usage.json`/`log.txt` are LEGACY (`appendRequestLog` is a no-op); live source is `usageHistory` table; persistent `import_sync_state` (not in-memory Map) |
| 05 | Hermes is external — only the config endpoint lives in this repo; hook API unverified |
| 06 | Real categories lowercase (`rate_limit`, `auth`, `timeout`…); `comboRules` doesn't exist → use `getComboModelsFromData` |
| 07 | `getPricingForModel(provider, model)`; rates $/1M (÷1,000,000 not 1,000); no `updatedAt` on pricing |
| 08 | Real page path `src/app/(dashboard)/dashboard/messages/page.js`; components dir |
| 09 | Langfuse/OTel NOT installed → optionalDependencies + lazy import; `getImportedMessages` returns `{details, pagination}` |
| 10 | Migration version 8 (5–7 taken); `.prepare()` → positional params |
| 11 | Version 9; ESM (no `require()`); `getAdapter()` async must be awaited |
| 12 | Version 10; `node:crypto` import; `import_archives` migration |
| 13 | Versions 11–12; `.prepare()` → positional params |
| 14 | `decodeCursorProtobuf` doesn't exist → real exports `decodeMessage`/`parseConnectRPCFrame` |
| 15 | `getRecentImports(sinceIso)` takes ISO string; reuse `insertImportedMessages` |
| 16 | `src/lib/usageDb.js` doesn't exist → `usageRepo.js`; UNION against `usageHistory` (real columns) |
| 17 | Zod NOT installed → plain-object contract |
| 18 | **Existing models.dev sync** (`src/lib/modelCatalog/sync.js`) — extend, don't duplicate; version 8 taken |
| 19 | Zod NOT installed → contract objects; stream endpoint reads `request.body` |
| 20 | `matchModelToProvider` is sync (no await); `.prepare()` → `db.all()` |

## 7. Next Steps (per the "unlimited" mandate)

1. **Add more branches** as new options surface (e.g., AA — multi-protocol import, AB — MCP integration, AC — billing/invoicing).
2. **Add more implementation plans** — every option in every branch can become a plan.
3. **Cross-link** every branch doc to its implementation plan(s).
4. **Write the code** for plans 01–03 (MVP: schema + matcher + API) — when the user approves implementation.

"there is no limit on the number you make it is as long as you cover every option, and piece of research you find."
