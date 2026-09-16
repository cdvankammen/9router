# Exponential Expansion E21 — Synthetic Source Tracking

**Date:** 2026-09-15
**Root phrase:** "Synthetic source tracking (signal inventory table, synthetic labels hash(uaClass + ipPrefix + sessionId), behavioral fingerprints, prompt-embedding clusters, hash-only privacy)" — from `2026-09-14-keyless-governance-research.md` §C
**Format:** 6+ levels, variable branching
**Status:** complete

## L1 — sub-phrases discovered in the root

1. Signal inventory table
2. Synthetic labels (hash(uaClass + ipPrefix + sessionId))
3. Behavioral fingerprints
4. Prompt-embedding clusters
5. Hash-only privacy
6. Signal collection points
7. Signal storage (usage meta)
8. Signal lifecycle (TTL, rotation)
9. Correlation (across requests)
10. Privacy constraints (no raw UA, no raw IP)

## L2 — expansion of each L1 node

### 1. Signal inventory
- **1a. UA class** — sourceApp.
- **1b. IP prefix** — /24, /48.
- **1c. Session id** — client-provided.
- **1d. Key id** — hashed.
- **1e. Task type** — smartRouter.
- **1f. Model** — upstream.
- **1g. Provider** — upstream.
- **1h. Timestamp** — bucket.

### 2. Synthetic labels
- **2a. Formula** — hash(uaClass + ipPrefix + sessionId).
- **2b. Hash** — FNV-1a / SHA-256.
- **2c. Salt** — MACHINE_ID_SALT.
- **2d. Length** — 16 hex.
- **2e. Collision** — negligible.

### 3. Behavioral fingerprints
- **3a. Request cadence** — inter-arrival.
- **3b. Token patterns** — prompt sizes.
- **3c. Model mix** — distribution.
- **3d. Time-of-day** — activity.
- **3e. Tool usage** — function calls.

### 4. Prompt-embedding clusters
- **4a. Embeddings** — prompt vectors.
- **4b. Clustering** — k-means.
- **4c. Centroids** — cluster ids.
- **4d. Drift** — topic change.
- **4e. Privacy** — no raw text.

### 5. Hash-only privacy
- **5a. No raw UA** — never stored.
- **5b. No raw IP** — prefix only.
- **5c. No raw prompt** — hash/embedding.
- **5d. Salted** — MACHINE_ID_SALT.
- **5e. Reversible** — no.

### 6. Collection points
- **6a. Request entry** — headers.
- **6b. Post-auth** — key id.
- **6c. Post-route** — provider/model.
- **6d. Post-response** — usage.

### 7. Storage
- **7a. usage.json** — meta.
- **7b. log.txt** — line.
- **7c. DB** — usage table.
- **7d. Retention** — configurable.

### 8. Lifecycle
- **8a. TTL** — 30/90 days.
- **8b. Rotation** — salt rotation.
- **8c. Purge** — old entries.

### 9. Correlation
- **9a. Same label** — same source.
- **9b. Session join** — sessionId.
- **9c. Key join** — key id.

### 10. Privacy constraints
- **10a. GDPR** — minimal data.
- **10b. Local-first** — no cloud.
- **10c. Opt-out** — disable tracking.

## L3 — expansion of selected L2 nodes

### 1a → UA class
- **1a-i. sourceApp** — fingerprint.
- **1a-ii. Class** — app name.
- **1a-iii. Unknown** — "unknown".

### 2a → formula
- **2a-i. Concatenate** — uaClass + ipPrefix + sessionId.
- **2a-ii. Hash** — FNV-1a.
- **2a-iii. Salt** — MACHINE_ID_SALT.
- **2a-iv. Hex** — 16 chars.

### 3a → cadence
- **3a-i. Inter-arrival** — ms between.
- **3a-ii. Burst** — short gaps.
- **3a-iii. Steady** — regular.

### 4a → embeddings
- **4a-i. Model** — embedding model.
- **4a-ii. Dim** — vector size.
- **4a-iii. Cost** — tokens.

### 5a → no raw UA
- **5a-i. Cap** — 300 chars.
- **5a-ii. Discard** — after classify.
- **5a-iii. Never store** — privacy.

### 6a → request entry
- **6a-i. Headers** — UA, X-9R-*.
- **6a-ii. IP** — socket.
- **6a-iii. Time** — timestamp.

### 7a → usage.json
- **7a-i. Entries** — per request.
- **7a-ii. Meta** — labels.
- **7a-iii. Path** — ~/.9router.

### 8b → rotation
- **8b-i. Salt change** — invalidates labels.
- **8b-ii. Announce** — migration.
- **8b-iii. Old labels** — orphaned.

### 9a → same label
- **9a-i. Group** — by label.
- **9a-ii. Count** — requests.
- **9a-iii. Trend** — over time.

## L4 → expansion of selected L3 nodes

### 1a-i → sourceApp
- **1a-i-a. fingerprintSourceApp** — function.
- **1a-i-b. UA_RULES** — 24 rules.
- **1a-i-c. DEFAULT_APP** — "unknown".

### 2a-ii → FNV-1a
- **2a-ii-a. 32-bit** — standard.
- **2a-ii-b. 64-bit** — less collision.
- **2a-ii-c. Fast** — O(n).

### 3a-i → inter-arrival
- **3a-i-a. Compute** — t2 - t1.
- **3a-i-b. Median** — robust.
- **3a-i-c. Stddev** — variance.

### 4a-i → embedding model
- **4a-i-a. Local** — 9router-embeddings.
- **4a-i-b. Remote** — provider.
- **4a-i-c. Dim** — 768/1536.

### 5a-i → cap
- **5a-i-a. 300 chars** — limit.
- **5a-i-b. Truncate** — slice.
- **5a-i-c. Classify** — before cap.

### 6a-i → headers
- **6a-i-a. user-agent** — raw.
- **6a-i-b. x-9r-app** — claim.
- **6a-i-c. x-9r-session** — claim.

### 7a-iii → path
- **7a-iii-a. ~/.9router** — default.
- **7a-iii-b. DATA_DIR** — override.
- **7a-iii-c. usage.json** — file.

### 8b-i → salt change
- **8b-i-a. New salt** — new labels.
- **8b-i-b. Old data** — unlinkable.
- **8b-i-c. Document** — changelog.

## L5 → expansion of selected L4 nodes

### 1a-i-a → fingerprintSourceApp
- **1a-i-a-1. Input** — UA string.
- **1a-i-a-2. Output** — app name.
- **1a-i-a-3. Order** — rules array.

### 2a-ii-a → 32-bit FNV
- **2a-ii-a-1. Prime** — 16777619.
- **2a-ii-a-2. Offset** — 2166136261.
- **2a-ii-a-3. XOR** — fold.

### 3a-i-a → compute
- **3a-i-a-1. Timestamps** — per request.
- **3a-i-a-2. Diff** — ms.
- **3a-i-a-3. Store** — rolling.

### 4a-i-a → local embeddings
- **4a-i-a-1. 9router-embeddings** — skill.
- **4a-i-a-2. Model** — local.
- **4a-i-a-3. Batch** — async.

### 5a-i-a → 300 chars
- **5a-i-a-1. Slice** — ua.slice(0, 300).
- **5a-i-a-2. Classify** — full UA.
- **5a-i-a-3. Store** — class only.

### 6a-i-a → user-agent
- **6a-i-a-1. Raw** — header.
- **6a-i-a-2. Length** — variable.
- **6a-i-a-3. Privacy** — discard.

## L6 → expansion of selected L5 nodes

### 1a-i-a-1 → input
- **1a-i-a-1-1. String** — UA.
- **1a-i-a-1-2. Empty** — default.
- **1a-i-a-1-3. Long** — capped.

### 2a-ii-a-1 → prime
- **2a-ii-a-1-1. Value** — 16777619.
- **2a-ii-a-1-2. Odd** — property.
- **2a-ii-a-1-3. Multiply** — each byte.

### 3a-i-a-1 → timestamps
- **3a-i-a-1-1. Date.now()** — ms.
- **3a-i-a-1-2. Per key** — scoped.
- **3a-i-a-1-3. Per label** — scoped.

### 4a-i-a-1 → 9router-embeddings
- **4a-i-a-1-1. Skill** — docs.
- **4a-i-a-1-2. Endpoint** — /v1/embeddings.
- **4a-i-a-1-3. Local model** — default.

## Confidence & open questions

- **Confidence: high** — codebase verified (sourceApps, usageDb, smartRouter FNV-1a).
- **Open:** embedding clustering cost vs value?
- **Open:** default retention period?

## Sources

- `docs/plans-and-prompts/research/2026-09-14-keyless-governance-research.md` §C
- `src/lib/sourceApps.js`
- `src/lib/usageDb.js`
- `open-sse/services/smartRouter.js` (FNV-1a)