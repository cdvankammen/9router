# Exponential Expansion E16 — Attribution Dimensions ("Where From")

**Date:** 2026-09-15
**Root phrase:** "Attribution dimensions ('where from' — app, key, user, machine, task, conversation)" — from `2026-08-31-message-origin-and-destination-research.md` §C.1
**Format:** 6+ levels, variable branching
**Status:** complete

## L1 — sub-phrases discovered in the root

1. Client app (UA fingerprint, sourceApps.js) — ✅ exists, Low effort
2. Client app self-identified (X-9R-App / X-OpenRouter-Title-style header) — ❌, Low
3. API key identity (key metadata: name/owner/tags) — ❌, Medium
4. User identity (per-key user field / X-9R-User header) — ❌, Medium
5. Machine/device (IP, hostname header, machine-id) — IP only, Medium
6. Task type (classifyTask) — ✅ exists (meta.taskType), Low
7. Conversation (sticky-session fingerprint) — ✅ exists (5-min TTL), Low

## L2 — expansion of each L1 node

### 1. Client app (UA)
- **1a. Signal** — UA fingerprint.
- **1b. Status** — exists.
- **1c. Effort** — low.
- **1d. Limitation** — spoofable.

### 2. Client app (self-identified)
- **2a. Signal** — X-9R-App header.
- **2b. Status** — missing.
- **2c. Effort** — low.
- **2d. Trust** — post-auth only.

### 3. API key identity
- **3a. Signal** — key metadata.
- **3b. Status** — keys opaque.
- **3c. Effort** — medium.
- **3d. Value** — per-key attribution.

### 4. User identity
- **4a. Signal** — user field / X-9R-User.
- **4b. Status** — missing.
- **4c. Effort** — medium.
- **4d. Value** — per-user attribution.

### 5. Machine/device
- **5a. Signal** — IP, hostname, machine-id.
- **5b. Status** — IP only.
- **5c. Effort** — medium.
- **5d. Value** — per-device attribution.

### 6. Task type
- **6a. Signal** — classifyTask.
- **6b. Status** — exists.
- **6c. Effort** — low.
- **6d. Value** — per-task usage.

### 7. Conversation
- **7a. Signal** — sticky-session fingerprint.
- **7b. Status** — exists.
- **7c. Effort** — low.
- **7d. Value** — per-conversation usage.

## L3 — expansion of selected L2 nodes

### 1d → spoofable
- **1d-i. UA spoofing** — client sets any UA.
- **1d-ii. Detection** — header cross-checks.
- **1d-iii. Mitigation** — treat as claim.

### 2d → post-auth trust
- **2d-i. Key auth** — then trust header.
- **2d-ii. Trusted subnet** — also trust.
- **2d-iii. Otherwise** — claim only.

### 3d → per-key attribution
- **3d-i. Usage records** — key field.
- **3d-ii. Filters** — by key.
- **3d-iii. Limits** — per-key.

### 5d → per-device
- **5d-i. IP** — socket.
- **5d-ii. Hostname** — header.
- **5d-iii. Machine-id** — MACHINE_ID_SALT.

### 6d → per-task usage
- **6d-i. Breakdown** — by task type.
- **6d-ii. Model fit** — per-task model choice.
- **6d-iii. Cost** — per-task cost.

### 7d → per-conversation
- **7d-i. Fingerprint** — FNV-1a.
- **7d-ii. TTL** — 5 min.
- **7d-iii. Sticky** — model pinned.

## L4 → expansion of selected L3 nodes

### 1d-i → UA spoofing
- **1d-i-a. Easy** — any HTTP client.
- **1d-i-b. Common** — curl -A.
- **1d-i-c. Impact** — misattribution.

### 3d-i → usage records
- **3d-i-a. Field** — keyId.
- **3d-i-b. Capture** — at auth.
- **3d-i-c. Display** — dashboard.

### 5d-iii → machine-id
- **5d-iii-a. Salt** — MACHINE_ID_SALT.
- **5d-iii-b. Derive** — hash.
- **5d-iii-c. Privacy** — salted.

### 6d-i → breakdown
- **6d-i-a. Count** — requests per task.
- **6d-i-b. Tokens** — per task.
- **6d-i-c. Cost** — per task.

## L5 → expansion of selected L4 nodes

### 1d-i-a → any HTTP client
- **1d-i-a-1. curl** — -A flag.
- **1d-i-a-2. Scripts** — custom UA.
- **1d-i-a-3. SDKs** — configurable.

### 3d-i-a → keyId field
- **3d-i-a-1. Format** — key id.
- **3d-i-a-2. Null** — no key.
- **3d-i-a-3. Index** — filterable.

### 5d-iii-a → salt
- **5d-iii-a-1. Purpose** — prevent reversal.
- **5d-iii-a-2. Secret** — env.
- **5d-iii-a-3. Rotation** — changes IDs.

## L6 → expansion of selected L5 nodes

### 1d-i-a-1 → curl -A
- **1d-i-a-1-1. Syntax** — curl -A "custom".
- **1d-i-a-1-2. Detection** — cross-check.
- **1d-i-a-1-3. Rate limit** — unknown bucket.

### 3d-i-a-1 → key id format
- **3d-i-a-1-1. Prefix** — sk-.
- **3d-i-a-1-2. Length** — 32+ chars.
- **3d-i-a-1-3. Hash** — stored hashed.

## Confidence & open questions

- **Confidence: high** — codebase inventory read directly.
- **Open:** which dimensions should be first-class filters?
- **Open:** should machine-id be exposed?

## Sources

- `src/lib/sourceApps.js`
- `open-sse/services/smartRouter.js`
- `docs/plans-and-prompts/research/2026-08-31-message-origin-and-destination-research.md` §C.1