# Routing Exponential Expansion R41 — Gateway Observability

**Date:** 2026-09-19
**Author:** GitHub Copilot agent (main session)
**Status:** active
**Tags:** #research #routing #exponential #observability #gateway #metrics #alerting #traffic-mirroring #caching

## Objective

N-ary exponential expansion (6+ levels, N children per node) of the root phrase **"Gateway observability (caching, traffic mirroring, alerting, max parallel)"** from `44-branch-gateways-and-serving.md` L1-A.

## L1 — sub-phrases discovered in the root

1. Caching (Redis recommended)
2. Traffic mirroring (silent experiments)
3. Alerting (Slack/webhook)
4. Max parallel requests (semaphore)
5. Pre-call checks (context window, EU region)

## L2 — expansion of each L1 node

### 1. Caching
- **1a. Redis** — recommended.
- **1b. Cache key** — request hash.
- **1c. TTL** — expiry.
- **1d. Hit rate** — metric.

### 2. Traffic mirroring
- **2a. Copy** — requests.
- **2b. Shadow** — second route.
- **2c. Compare** — responses.
- **2d. A/B** — evaluation.

### 3. Alerting
- **3a. Slack** — channel.
- **3b. Webhook** — generic.
- **3c. Triggers** — failures.
- **3d. Thresholds** — rates.

### 4. Max parallel
- **4a. Semaphore** — limit.
- **4b. Default** — rpm or tpm/1000/6.
- **4c. Queue** — waiting.
- **4d. Reject** — overload.

### 5. Pre-call checks
- **5a. Context window** — filter.
- **5b. EU region** — filter.
- **5c. Modality** — requirement.
- **5d. Auth** — authorization.

## L3 — expansion of selected L2 nodes (variable branching)

### 1a → Redis
- **1a-i. Shared** — across instances.
- **1a-ii. Fast** — in-memory.
- **1a-iii. TTL** — automatic.
- **1a-iv. Cost** — infra.

### 2a → copy
- **2a-i. Full** — request.
- **2a-ii. Sampled** — fraction.
- **2a-iii. Async** — non-blocking.
- **2a-iv. Discard** — response.

### 3a → Slack
- **3a-i. Webhook** — incoming.
- **3a-ii. Channel** — configured.
- **3a-iii. Message** — formatted.
- **3a-iv. Rate** — throttled.

### 4a → semaphore
- **4a-i. Count** — limit.
- **4a-ii. Acquire** — before call.
- **4a-iii. Release** — after.
- **4a-iv. Wait** — queue.

### 5a → context window
- **5a-i. Model limit** — tokens.
- **5a-ii. Request size** — estimate.
- **5a-iii. Exceed** — skip.
- **5a-iv. Alternative** — larger model.

## L4 — expansion of selected L3 nodes

### 1a-i → shared
- **1a-i-a. Multi-instance** — consistent.
- **1a-i-b. Single** — local.
- **1a-i-c. Eviction** — LRU.
- **1a-i-d. Persistence** — optional.

### 2a-i → full copy
- **2a-i-a. Body** — complete.
- **2a-i-b. Headers** — sanitized.
- **2a-i-c. Metadata** — added.
- **2a-i-d. Async** — fire-and-forget.

### 3a-i → webhook
- **3a-i-a. URL** — configured.
- **3a-i-b. Payload** — JSON.
- **3a-i-c. Retry** — on failure.
- **3a-i-d. Timeout** — bounded.

### 4a-i → count
- **4a-i-a. RPM** — per-minute.
- **4a-i-b. TPM** — per-token.
- **4a-i-c. Formula** — rpm or tpm/1000/6.
- **4a-i-d. Config** — override.

### 5a-i → model limit
- **5a-i-a. Context** — tokens.
- **5a-i-b. Input** — prompt.
- **5a-i-c. Output** — reserved.
- **5a-i-d. Sum** — check.

## L5 — expansion of selected L4 nodes

### 1a-i-a → multi-instance
- **1a-i-a-1. Consistency** — cache shared.
- **1a-i-a-2. Hit rate** — higher.
- **1a-i-a-3. Infra** — Redis.
- **1a-i-a-4. Cost** — justified.

### 2a-i-a → body
- **2a-i-a-1. JSON** — serialized.
- **2a-i-a-2. Size** — bounded.
- **2a-i-a-3. Sanitize** — secrets.
- **2a-i-a-4. Store** — temp.

### 3a-i-a → URL
- **3a-i-a-1. Slack** — hooks.slack.com.
- **3a-i-a-2. Generic** — any.
- **3a-i-a-3. Secret** — in URL.
- **3a-i-a-4. Rotate** — periodically.

### 4a-i-a → RPM
- **4a-i-a-1. Provider** — limit.
- **4a-i-a-2. Account** — limit.
- **4a-i-a-3. Aggregate** — sum.
- **4a-i-a-4. Cap** — semaphore.

### 5a-i-a → context
- **5a-i-a-1. Model** — specific.
- **5a-i-a-2. Window** — tokens.
- **5a-i-a-3. Check** — before route.
- **5a-i-a-4. Skip** — if exceed.

## L6 — expansion of selected L5 nodes

### 1a-i-a-1 → consistency
- **1a-i-a-1-i. Same key** — same result.
- **1a-i-a-1-ii. Any instance** — serves.
- **1a-i-a-1-iii. No duplication** — compute.
- **1a-i-a-1-iv. Savings** — cost.

### 2a-i-a-1 → JSON
- **2a-i-a-1-i. Serialize** — stringify.
- **2a-i-a-1-ii. Parse** — mirror.
- **2a-i-a-1-iii. Schema** — stable.
- **2a-i-a-1-iv. Version** — compat.

### 3a-i-a-1 → Slack URL
- **3a-i-a-1-i. Domain** — hooks.slack.com.
- **3a-i-a-1-ii. Token** — secret.
- **3a-i-a-1-iii. Channel** — encoded.
- **3a-i-a-1-iv. Secure** — env.

### 4a-i-a-1 → provider limit
- **4a-i-a-1-i. Published** — docs.
- **4a-i-a-1-ii. Tier** — plan.
- **4a-i-a-1-iii. Dynamic** — changes.
- **4a-i-a-1-iv. Monitor** — 429s.

### 5a-i-a-1 → model specific
- **5a-i-a-1-i. 8k** — small.
- **5a-i-a-1-ii. 32k** — medium.
- **5a-i-a-1-iii. 128k** — large.
- **5a-i-a-1-iv. 1M** — frontier.

## Confidence & open questions

- **High confidence:** LiteLLM observability features from branch 44 + docs.
- **Open questions:**
  - Should 9Router add Redis caching (coai-style hash caching)?
  - Does 9Router need traffic mirroring for A/B evaluation?
  - What alerting channels fit 9Router (webhook, dashboard)?

## Sources

- LiteLLM docs (BerriAI/litellm)
- `docs/plans-and-prompts/research/9router/44-branch-gateways-and-serving.md` L1-A
- `docs/plans-and-prompts/research/9router/46-branch-evaluation-and-cost-quality.md` (A/B evaluation)