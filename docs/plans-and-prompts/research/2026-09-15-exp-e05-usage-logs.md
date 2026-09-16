# Exponential Expansion E05 — Usage/Logs (`src/lib/usageDb.js`)

**Date:** 2026-09-15
**Root phrase:** "Usage/logs (`src/lib/usageDb.js`, usage.json, log.txt)" — from `2026-08-31-message-origin-and-destination-research.md` §A.5
**Format:** 6+ levels, variable branching
**Status:** complete

## L1 — sub-phrases discovered in the root

1. `src/lib/usageDb.js`
2. `usage.json` + `log.txt` under `~/.9router`
3. Does NOT follow `DATA_DIR`
4. Usage analytics capture `meta.taskType` and `meta.scores`
5. `RequestDetailsTab.js`
6. Gaps: no per-key/per-app/per-user breakdown, no cost attribution, no upstream drill-down

## L2 — expansion of each L1 node

### 1. usageDb.js
- **1a. Role** — usage capture + log writing.
- **1b. API** — record functions for requests/responses.
- **1c. Storage** — JSON file + text log.
- **1d. Concurrency** — single-process writes.

### 2. usage.json + log.txt
- **2a. usage.json** — structured usage records.
- **2b. log.txt** — human-readable log lines.
- **2c. Location** — `~/.9router/` (home dir).
- **2d. Growth** — unbounded; needs rotation.

### 3. Does NOT follow DATA_DIR
- **3a. DATA_DIR** — env override for DB location.
- **3b. Inconsistency** — usage stays in home dir even when DATA_DIR set.
- **3c. Impact** — portable setups split state across two dirs.

### 4. meta.taskType / meta.scores
- **4a. taskType** — from smartRouter classifyTask (see E02).
- **4b. scores** — model scoring results.
- **4c. Capture point** — `src/sse/handlers/chat.js` threads them.
- **4d. Display** — RequestDetailsTab shows them.

### 5. RequestDetailsTab.js
- **5a. Location** — `src/app/(dashboard)/dashboard/usage/components/`.
- **5b. Role** — per-request detail view.
- **5c. Fields** — latency, tokens, params, provider request/response, status, conversationId, sourceApp, userAgent, url, cost.

### 6. Gaps
- **6a. No per-key breakdown** — can't filter by key.
- **6b. No per-app breakdown** — sourceApp exists but not surfaced as filter.
- **6c. No per-user breakdown** — user dimension absent.
- **6d. No cost attribution** — cost field exists but no aggregation.
- **6e. No upstream drill-down** — provider/model in details but no rollup.

## L3 — expansion of selected L2 nodes

### 1b → record API
- **1b-i. Request record** — method, url, headers, body summary.
- **1b-ii. Response record** — status, latency, tokens.
- **1b-iii. Error record** — failures logged.

### 2a → usage.json structure
- **2a-i. Array of records** — append-only.
- **2a-ii. Fields** — timestamp, sourceApp, taskType, model, provider, tokens, cost, status.
- **2a-iii. Size** — grows with traffic.

### 2b → log.txt
- **2b-i. Format** — one line per event.
- **2b-ii. Content** — timestamp + summary.
- **2b-iii. Debug value** — tail -f for live view.

### 4a → taskType capture
- **4a-i. Source** — smartRouterResult.taskType.
- **4a-ii. Threading** — chat.js lines 57, 102–103.
- **4a-iii. Storage** — meta.taskType in usage record.

### 5c → fields
- **5c-i. latency** — ms.
- **5c-ii. tokens** — prompt/completion.
- **5c-iii. providerRequest/Response** — raw upstream.
- **5c-iv. status** — HTTP status.
- **5c-v. conversationId** — session id.
- **5c-vi. sourceApp** — UA class.
- **5c-vii. userAgent** — raw UA (privacy note: stored?).
- **5c-viii. url** — request URL.
- **5c-ix. cost** — USD estimate.

## L4 — expansion of selected L3 nodes

### 2a-ii → fields
- **2a-ii-a. timestamp** — ISO.
- **2a-ii-b. sourceApp** — class string.
- **2a-ii-c. taskType** — 16 types.
- **2a-ii-d. model** — upstream model.
- **2a-ii-e. provider** — upstream provider.
- **2a-ii-f. tokens** — in/out.
- **2a-ii-g. cost** — USD.
- **2a-ii-h. status** — ok/error.

### 5c-vii → raw UA stored?
- **5c-vii-a. Privacy conflict** — sourceApps never stores raw UA, but requestDetails may.
- **5c-vii-b. Check needed** — verify what usageDb actually persists.
- **5c-vii-c. Fix** — redact or class-only.

### 6d → cost attribution
- **6d-i. Cost field** — exists per request.
- **6d-ii. Aggregation** — no rollup by key/app/user.
- **6d-iii. Budgets** — no spend caps (see E08/E13).

## L5 — expansion of selected L4 nodes

### 2a-ii-g → cost
- **2a-ii-g-1. Source** — provider pricing × tokens.
- **2a-ii-g-2. Accuracy** — estimate, not bill.
- **2a-ii-g-3. BYOK** — cost = what provider would charge.

### 5c-vii-a → privacy conflict
- **5c-vii-a-1. sourceApps stance** — class only.
- **5c-vii-a-2. requestDetails** — may include raw UA.
- **5c-vii-a-3. Resolution** — strip raw UA from persisted records.

### 6d-iii → budgets
- **6d-iii-1. Soft/hard** — warn then block.
- **6d-iii-2. Reset** — daily/weekly/monthly.
- **6d-iii-3. Per-key** — key metadata needed (see E04).

## L6 — expansion of selected L5 nodes

### 2a-ii-g-1 → provider pricing
- **2a-ii-g-1-1. Per-model price** — input/output per 1M tokens.
- **2a-ii-g-1-2. Cache pricing** — cache read/write rates.
- **2a-ii-g-1-3. Update cadence** — prices change; config-driven.

### 5c-vii-a-3 → strip raw UA
- **5c-vii-a-3-1. Where** — usageDb write path.
- **5c-vii-a-3-2. What remains** — sourceApp class.
- **5c-vii-a-3-3. Backfill** — existing records may contain UAs.

## Confidence & open questions

- **Confidence: medium** — usageDb.js structure known from research doc; exact fields need direct read.
- **Open:** does requestDetails persist raw UA? (privacy check)
- **Open:** should usage.json rotate/archive?
- **Open:** should usage follow DATA_DIR?

## Sources

- `src/lib/usageDb.js` (referenced; direct read recommended)
- `src/app/(dashboard)/dashboard/usage/components/RequestDetailsTab.js` (referenced)
- `docs/plans-and-prompts/research/2026-08-31-message-origin-and-destination-research.md` §A.5