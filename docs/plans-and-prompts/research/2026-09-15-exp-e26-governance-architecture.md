# Exponential Expansion E26 — Governance Architecture (7-Layer Model)

**Date:** 2026-09-15
**Root phrase:** "Governance architecture (7-layer model: Identity/Gate/Policy/Queue/Rate/Routing/Observability, keyless-first principle)" — from `2026-09-14-keyless-governance-research.md` §H
**Format:** 6+ levels, variable branching
**Status:** complete

## L1 — sub-phrases discovered in the root

1. Identity layer
2. Gate layer
3. Policy layer
4. Queue layer
5. Rate layer
6. Routing layer
7. Observability layer
8. Keyless-first principle
9. Layer ordering (request path)
10. Layer config (per-layer JSON)

## L2 — expansion of each L1 node

### 1. Identity
- **1a. Source** — UA, headers, key.
- **1b. Resolution** — profile.
- **1c. Synthetic label** — hash.
- **1d. Output** — identity object.

### 2. Gate
- **2a. Levels** — L0-L5.
- **2b. Check** — highest cleared.
- **2c. Deny** — 401/403.
- **2d. Output** — gate level.

### 3. Policy
- **3a. Allowlists** — models/providers.
- **3b. Budgets** — USD.
- **3c. Guardrails** — PII/injection.
- **3d. Output** — policy decision.

### 4. Queue
- **4a. Priority** — classes.
- **4b. Bounded** — FIFO.
- **4c. TTL** — 60s.
- **4d. Output** — queue slot.

### 5. Rate
- **5a. RPM/TPM** — limits.
- **5b. Adaptive** — AIMD/EWMA.
- **5c. Pacing** — budget-proportional.
- **5d. Output** — rate decision.

### 6. Routing
- **6a. Provider** — selection.
- **6b. Model** — selection.
- **6c. Combo** — fallback.
- **6d. Output** — upstream target.

### 7. Observability
- **7a. Usage** — per key/profile.
- **7b. Logs** — decisions.
- **7c. Dashboard** — views.
- **7d. Output** — telemetry.

### 8. Keyless-first
- **8a. Principle** — no key needed.
- **8b. Local** — loopback trust.
- **8c. Profiles** — identity.
- **8d. Key optional** — for control.

### 9. Layer ordering
- **9a. Identity** — first.
- **9b. Gate** — second.
- **9c. Policy** — third.
- **9d. Queue** — fourth.
- **9e. Rate** — fifth.
- **9f. Routing** — sixth.
- **9g. Observability** — throughout.

### 10. Layer config
- **10a. Per layer** — JSON.
- **10b. Global** — governance.json.
- **10c. Hot reload** — watch.
- **10d. Validation** — schema.

## L3 — expansion of selected L2 nodes

### 1c → synthetic label
- **1c-i. Formula** — hash(uaClass + ipPrefix + sessionId).
- **1c-ii. Salt** — MACHINE_ID_SALT.
- **1c-iii. Privacy** — hash-only.

### 2b → highest cleared
- **2b-i. Evaluate** — all levels.
- **2b-ii. Max** — track.
- **2b-iii. Privileges** — level-based.

### 3a → allowlists
- **3a-i. Models** — per identity.
- **3a-ii. Providers** — per identity.
- **3a-iii. Wildcards** — claude-*.

### 4a → priority
- **4a-i. Classes** — 0-5.
- **4a-ii. Tags** — keyword → class.
- **4a-iii. Aging** — boost.

### 5a → RPM/TPM
- **5a-i. Per key** — limits.
- **5a-ii. Per profile** — limits.
- **5a-iii. Per group** — limits.

### 6a → provider
- **6a-i. Registry** — providers.
- **6a-ii. Health** — status.
- **6a-iii. Selection** — smartRouter.

### 7a → usage
- **7a-i. Per key** — counts.
- **7a-ii. Per profile** — counts.
- **7a-iii. Per group** — counts.

### 8b → loopback trust
- **8b-i. 127.0.0.1** — trusted.
- **8b-ii. ::1** — trusted.
- **8b-iii. No key** — needed.

### 9a → identity first
- **9a-i. Resolve** — identity.
- **9a-ii. Before** — gate.
- **9a-iii. Context** — passed.

### 10a → per layer
- **10a-i. identity.json** — config.
- **10a-ii. gate.json** — config.
- **10a-iii. policy.json** — config.

## L4 → expansion of selected L3 nodes

### 1c-i → formula
- **1c-i-a. Concatenate** — parts.
- **1c-i-b. Hash** — FNV-1a.
- **1c-i-c. Hex** — 16 chars.

### 2b-i → evaluate
- **2b-i-a. Loop** — levels.
- **2b-i-b. Check** — cleared.
- **2b-i-c. Max** — highest.

### 3a-i → models
- **3a-i-a. List** — allowed.
- **3a-i-b. Wildcards** — patterns.
- **3a-i-c. Empty** — allow all.

### 4a-i → classes
- **4a-i-a. 0** — lowest.
- **4a-i-b. 5** — highest.
- **4a-i-c. Default** — 0.

### 5a-i → per key
- **5a-i-a. RPM** — limit.
- **5a-i-b. TPM** — limit.
- **5a-i-c. Bucket** — token.

### 6a-i → registry
- **6a-i-a. Files** — per provider.
- **6a-i-b. Index** — generated.
- **6a-i-c. Models** — config.

### 7a-i → per key
- **7a-i-a. Requests** — count.
- **7a-i-b. Tokens** — sum.
- **7a-i-c. Cost** — USD.

### 8b-i → 127.0.0.1
- **8b-i-a. Loopback** — IPv4.
- **8b-i-b. Trust** — implicit.
- **8b-i-c. Gate** — L1.

### 9a-i → resolve
- **9a-i-a. UA** — fingerprint.
- **9a-i-b. Headers** — claims.
- **9a-i-c. Key** — metadata.

### 10a-i → identity.json
- **10a-i-a. Profiles** — array.
- **10a-i-b. Rules** — UA patterns.
- **10a-i-c. Defaults** — fallback.

## L5 → expansion of selected L4 nodes

### 1c-i-a → concatenate
- **1c-i-a-1. uaClass** — app.
- **1c-i-a-2. ipPrefix** — /24.
- **1c-i-a-3. sessionId** — claim.

### 2b-i-a → loop
- **2b-i-a-1. For** — levels.
- **2b-i-a-2. Check** — each.
- **2b-i-a-3. Max** — track.

### 3a-i-a → list
- **3a-i-a-1. Models** — ids.
- **3a-i-a-2. Order** — priority.
- **3a-i-a-3. Deny** — non-listed.

### 4a-i-a → 0
- **4a-i-a-1. Lowest** — priority.
- **4a-i-a-2. Default** — tag-less.
- **4a-i-a-3. Batch** — jobs.

### 5a-i-a → RPM
- **5a-i-a-1. Limit** — value.
- **5a-i-a-2. Window** — 60s.
- **5a-i-a-3. Enforce** — bucket.

### 6a-i-a → files
- **6a-i-a-1. One** — per provider.
- **6a-i-a-2. Template** — REGISTRY_TEMPLATE.
- **6a-i-a-3. Index** — auto-generated.

### 7a-i-a → requests
- **7a-i-a-1. Count** — per key.
- **7a-i-a-2. Window** — day.
- **7a-i-a-3. Trend** — chart.

### 8b-i-a → loopback
- **8b-i-a-1. IPv4** — 127.0.0.1.
- **8b-i-a-2. IPv6** — ::1.
- **8b-i-a-3. Mapped** — ::ffff:.

### 9a-i-a → UA
- **9a-i-a-1. Raw** — header.
- **9a-i-a-2. Fingerprint** — app.
- **9a-i-a-3. Profile** — lookup.

### 10a-i-a → profiles
- **10a-i-a-1. Array** — entries.
- **10a-i-a-2. Fields** — name, uaPattern.
- **10a-i-a-3. Defaults** — model.

## L6 → expansion of selected L5 nodes

### 1c-i-a-1 → uaClass
- **1c-i-a-1-1. sourceApp** — class.
- **1c-i-a-1-2. Unknown** — default.
- **1c-i-a-1-3. Browser** — mozilla.

### 2b-i-a-1 → for
- **2b-i-a-1-1. Iterate** — levels.
- **2b-i-a-1-2. Evaluate** — each.
- **2b-i-a-1-3. Max** — track.

### 3a-i-a-1 → models
- **3a-i-a-1-1. Ids** — strings.
- **3a-i-a-1-2. Wildcards** — patterns.
- **3a-i-a-1-3. Deny** — default.

### 4a-i-a-1 → lowest
- **4a-i-a-1-1. Class 0** — priority.
- **4a-i-a-1-2. Default** — tag-less.
- **4a-i-a-1-3. Batch** — jobs.

### 5a-i-a-1 → limit
- **5a-i-a-1-1. Value** — integer.
- **5a-i-a-1-2. Config** — per key.
- **5a-i-a-1-3. Enforce** — bucket.

### 6a-i-a-1 → one per provider
- **6a-i-a-1-1. File** — provider.js.
- **6a-i-a-1-2. Registry** — index.
- **6a-i-a-1-3. Models** — config.

### 7a-i-a-1 → count
- **7a-i-a-1-1. Per key** — scoped.
- **7a-i-a-1-2. Window** — day.
- **7a-i-a-1-3. Trend** — chart.

### 8b-i-a-1 → IPv4
- **8b-i-a-1-1. 127.0.0.1** — loopback.
- **8b-i-a-1-2. 127.0.0.0/8** — range.
- **8b-i-a-1-3. Trust** — implicit.

### 9a-i-a-1 → raw
- **9a-i-a-1-1. Header** — user-agent.
- **9a-i-a-1-2. Cap** — 300 chars.
- **9a-i-a-1-3. Discard** — privacy.

### 10a-i-a-1 → array
- **10a-i-a-1-1. Entries** — profiles.
- **10a-i-a-1-2. Order** — specific-first.
- **10a-i-a-1-3. Match** — regex.

## Confidence & open questions

- **Confidence: high** — synthesis of all E01–E25 research + codebase.
- **Open:** should observability be a layer or cross-cutting?
- **Open:** config file format (single vs per-layer)?

## Sources

- `docs/plans-and-prompts/research/2026-09-14-keyless-governance-research.md` §H
- All E01–E25 expansion docs
- `docs/plans-and-prompts/research/2026-09-15-exponential-master-map.md`