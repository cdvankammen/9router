# Routing Exponential Expansion R53 — OAuth & Credential Lifecycle

**Date:** 2026-09-19
**Author:** GitHub Copilot agent (main session)
**Status:** active
**Tags:** #research #routing #exponential #oauth #credentials #token-refresh #api-keys #lifecycle #9router

## Objective

N-ary exponential expansion (6+ levels, N children per node) of the root phrase **"OAuth & credential lifecycle (OAuth/API-key management, token refresh, xAI service)"** from `47-branch-9router-internal-threads.md` L1-B + `12-oauth-deep-dive.md`.

## L1 — sub-phrases discovered in the root

1. OAuth credential management
2. API-key management
3. Token refresh (lifecycle)
4. xAI OAuth service
5. Credential storage (security)

## L2 — expansion of each L1 node

### 1. OAuth management
- **1a. Flow** — authorize.
- **1b. Callback** — redirect.
- **1c. Tokens** — access/refresh.
- **1d. Storage** — encrypted.

### 2. API-key management
- **2a. Keys** — per provider.
- **2b. Storage** — encrypted.
- **2c. Rotation** — periodic.
- **2d. Validation** — test.

### 3. Token refresh
- **3a. Expiry** — access token.
- **3b. Refresh** — using refresh token.
- **3c. Retry** — on 401.
- **3d. Persist** — new tokens.

### 4. xAI OAuth service
- **4a. Provider** — xAI.
- **4b. Flow** — OAuth.
- **4c. Endpoints** — discovery.
- **4d. Refresh** — automatic.

### 5. Credential storage
- **5a. Encryption** — at rest.
- **5b. Key** — API_KEY_SECRET.
- **5c. DB** — SQLite.
- **5d. Access** — service layer.

## L3 — expansion of selected L2 nodes (variable branching)

### 1a → flow
- **1a-i. Authorize URL** — redirect.
- **1a-ii. User consent** — page.
- **1a-iii. Callback** — code.
- **1a-iv. Exchange** — tokens.

### 2a → keys
- **2a-i. Per provider** — separate.
- **2a-ii. Per account** — multiple.
- **2a-iii. Env** — or DB.
- **2a-iv. UI** — dashboard.

### 3a → expiry
- **3a-i. Lifetime** — hours.
- **3a-ii. Check** — before call.
- **3a-iii. Refresh** — proactive.
- **3a-iv. Fail** — re-auth.

### 4a → xAI
- **4a-i. Base URL** — api.x.ai.
- **4a-ii. OAuth** — supported.
- **4a-iii. Discovery** — endpoints.
- **4a-iv. Service** — module.

### 5a → encryption
- **5a-i. Algorithm** — AES.
- **5a-ii. Key** — env secret.
- **5a-iii. Salt** — per record.
- **5a-iv. Decrypt** — on use.

## L4 — expansion of selected L3 nodes

### 1a-i → authorize URL
- **1a-i-a. Client id** — registered.
- **1a-i-b. Redirect** — callback.
- **1a-i-c. Scopes** — requested.
- **1a-i-d. State** — CSRF.

### 2a-i → per provider
- **2a-i-a. OpenAI** — key.
- **2a-i-b. Anthropic** — key.
- **2a-i-c. Google** — key.
- **2a-i-d. xAI** — OAuth.

### 3a-i → lifetime
- **3a-i-a. 1 hour** — typical.
- **3a-i-b. 24 hours** — longer.
- **3a-i-c. Config** — provider.
- **3a-i-d. Check** — expiry.

### 4a-i → base URL
- **4a-i-a. Host** — api.x.ai.
- **4a-i-b. Path** — /v1.
- **4a-i-c. Auth** — Bearer.
- **4a-i-d. Models** — grok.

### 5a-i → AES
- **5a-i-a. Mode** — GCM.
- **5a-i-b. Key** — 256-bit.
- **5a-i-c. IV** — random.
- **5a-i-d. Tag** — auth.

## L5 — expansion of selected L4 nodes

### 1a-i-a → client id
- **1a-i-a-1. Registered** — provider.
- **1a-i-a-2. Public** — identifier.
- **1a-i-a-3. Secret** — private.
- **1a-i-a-4. Config** — env.

### 2a-i-a → OpenAI key
- **2a-i-a-1. Format** — sk-...
- **2a-i-a-2. Secret** — sensitive.
- **2a-i-a-3. Storage** — encrypted.
- **2a-i-a-4. Use** — Bearer.

### 3a-i-a → 1 hour
- **3a-i-a-1. Access** — short.
- **3a-i-a-2. Refresh** — long.
- **3a-i-a-3. Renew** — automatic.
- **3a-i-a-4. Fail** — re-auth.

### 4a-i-a → host
- **4a-i-a-1. api.x.ai** — domain.
- **4a-i-a-2. TLS** — secure.
- **4a-i-a-3. Region** — global.
- **4a-i-a-4. Rate** — limits.

### 5a-i-a → GCM
- **5a-i-a-1. Authenticated** — encryption.
- **5a-i-a-2. Tamper-proof** — tag.
- **5a-i-a-3. Standard** — AES-GCM.
- **5a-i-a-4. Node** — crypto.

## L6 — expansion of selected L5 nodes

### 1a-i-a-1 → registered
- **1a-i-a-1-i. App** — created.
- **1a-i-a-1-ii. Credentials** — issued.
- **1a-i-a-1-iii. Redirect** — configured.
- **1a-i-a-1-iv. Scopes** — approved.

### 2a-i-a-1 → sk- format
- **2a-i-a-1-i. Prefix** — sk-.
- **2a-i-a-1-ii. Length** — ~48.
- **2a-i-a-1-iii. Random** — chars.
- **2a-i-a-1-iv. Secret** — guard.

### 3a-i-a-1 → access short
- **3a-i-a-1-i. Security** — limited.
- **3a-i-a-1-ii. Refresh** — renews.
- **3a-i-a-1-iii. Revoke** — possible.
- **3a-i-a-1-iv. Standard** — OAuth.

### 4a-i-a-1 → domain
- **4a-i-a-1-i. DNS** — resolves.
- **4a-i-a-1-ii. CDN** — edge.
- **4a-i-a-1-iii. TLS** — cert.
- **4a-i-a-1-iv. API** — served.

### 5a-i-a-1 → authenticated
- **5a-i-a-1-i. Encrypt** — data.
- **5a-i-a-1-ii. Tag** — integrity.
- **5a-i-a-1-iii. Verify** — decrypt.
- **5a-i-a-1-iv. Secure** — storage.

## Confidence & open questions

- **High confidence:** OAuth/credential lifecycle from branch 47 + 12-oauth-deep-dive.
- **Open questions:**
  - Which providers support OAuth vs API keys?
  - How is token refresh triggered (proactive vs on-401)?
  - Is credential encryption AES-GCM with API_KEY_SECRET?

## Sources

- `docs/plans-and-prompts/research/9router/47-branch-9router-internal-threads.md` L1-B
- `docs/plans-and-prompts/research/9router/12-oauth-deep-dive.md`
- `open-sse/services/` (xAI OAuth service)