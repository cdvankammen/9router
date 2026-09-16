# Exponential Expansion E04 — Auth & API Keys

**Date:** 2026-09-15
**Root phrase:** "Auth & API keys (JWT_SECRET, INITIAL_PASSWORD, API_KEY_SECRET, MACHINE_ID_SALT)" — from `2026-08-31-message-origin-and-destination-research.md` §A.4
**Format:** 6+ levels, variable branching
**Status:** complete

## L1 — sub-phrases discovered in the root

1. `JWT_SECRET` (session cookie)
2. `INITIAL_PASSWORD` (default `123456` — must override)
3. `API_KEY_SECRET`
4. `MACHINE_ID_SALT`
5. Dashboard auth via session cookie
6. `/v1/*` gateway auth via API key
7. Gaps: no key metadata, no rotation/expiry, no per-key usage attribution, no management API

## L2 — expansion of each L1 node

### 1. JWT_SECRET
- **1a. Purpose** — signs session cookies for the dashboard.
- **1b. Location** — env contract in `.env.example` / ARCHITECTURE.md.
- **1c. Risk** — weak secret → session forgery.
- **1d. Rotation** — changing it invalidates all sessions.

### 2. INITIAL_PASSWORD
- **2a. Default** — `123456` — must override.
- **2b. First-run** — dashboard boots with this password.
- **2c. Risk** — unmodified default = trivial access.
- **2d. Enforcement** — should force change on first login.

### 3. API_KEY_SECRET
- **3a. Purpose** — signs/derives API keys for `/v1/*`.
- **3b. Format** — keys are derived, not stored raw.
- **3c. Risk** — leak → key forgery.
- **3d. Rotation** — rotating invalidates all keys.

### 4. MACHINE_ID_SALT
- **4a. Purpose** — salts machine identity (used for device attribution).
- **4b. Use** — machine-id in usage/attribution.
- **4c. Privacy** — salt prevents rainbow-table reversal.

### 5. Dashboard session cookie
- **5a. Flow** — login → JWT cookie → dashboard routes.
- **5b. HttpOnly** — cookie not readable by JS.
- **5c. SameSite** — CSRF protection.
- **5d. Expiry** — session TTL.

### 6. /v1/* API key auth
- **6a. Flow** — `Authorization: Bearer <key>` → gateway.
- **6b. Verification** — key derived/verified via API_KEY_SECRET.
- **6c. Opaque keys** — no metadata attached today.

### 7. Gaps
- **7a. No key metadata** — name, owner, scopes absent.
- **7b. No rotation/expiry** — keys live forever.
- **7c. No per-key usage attribution** — can't say which key did what.
- **7d. No management API** — no CRUD for keys.

## L3 — expansion of selected L2 nodes

### 1a → session cookie signing
- **1a-i. JWT structure** — header.payload.signature.
- **1a-ii. Claims** — sub (user), iat, exp.
- **1a-iii. Algorithm** — HS256 with JWT_SECRET.
- **1a-iv. Verification** — every dashboard request verifies signature.

### 2b → first-run
- **2b-i. Bootstrap** — no users table seeded; password env used.
- **2b-ii. Warning** — dashboard should warn if INITIAL_PASSWORD unchanged.
- **2b-iii. Change flow** — settings page to change password.

### 3b → derived keys
- **3b-i. Derivation** — HMAC(API_KEY_SECRET, keyId) or similar.
- **3b-ii. Storage** — only keyId stored; secret derived.
- **3b-iii. Verification** — recompute HMAC and compare.

### 6b → verification
- **6b-i. Bearer parse** — extract token from Authorization header.
- **6b-ii. Lookup** — find key record by id.
- **6b-iii. Compare** — constant-time compare to avoid timing attacks.

### 7a → key metadata gap
- **7a-i. What metadata** — name, owner, tags, scopes, limits, budget.
- **7a-ii. Industry** — LiteLLM virtual keys have all of this (see E13).
- **7a-iii. Value** — per-key attribution + per-key limits.

## L4 — expansion of selected L3 nodes

### 1a-i → JWT structure
- **1a-i-a. Header** — `{"alg":"HS256","typ":"JWT"}`.
- **1a-i-b. Payload** — claims.
- **1a-i-c. Signature** — HMAC-SHA256(header.payload, secret).

### 3b-i → HMAC derivation
- **3b-i-a. Input** — keyId + API_KEY_SECRET.
- **3b-i-b. Output** — 256-bit HMAC.
- **3b-i-c. Encoding** — base64url.

### 7a-ii → LiteLLM virtual keys
- **7a-ii-a. Budget** — USD per key.
- **7a-ii-b. Rate limits** — RPM/TPM per key.
- **7a-ii-c. Model restrictions** — allowlist per key.
- **7a-ii-d. Metadata** — user, team, tags.

## L5 — expansion of selected L4 nodes

### 1a-i-c → HMAC-SHA256
- **1a-i-c-1. Strength** — 256-bit key.
- **1a-i-c-2. Timing-safe compare** — crypto.timingSafeEqual.
- **1a-i-c-3. Secret length** — must be ≥ 32 bytes.

### 7a-ii-a → per-key budget
- **7a-ii-a-1. Soft limit** — warning at 80%.
- **7a-ii-a-2. Hard limit** — block at 100%.
- **7a-ii-a-3. Reset** — daily/weekly/monthly.

## L6 — expansion of selected L5 nodes

### 1a-i-c-2 → timing-safe compare
- **1a-i-c-2-1. Why** — naive === leaks timing.
- **1a-i-c-2-2. Node API** — `crypto.timingSafeEqual`.
- **1a-i-c-2-3. Length check** — equal-length buffers first.

### 7a-ii-a-2 → hard limit
- **7a-ii-a-2-1. Response** — 429 or 403.
- **7a-ii-a-2-2. Retry** — after reset.
- **7a-ii-a-2-3. Alert** — notify owner.

## Confidence & open questions

- **Confidence: high** — env contract read from `.env.example` / ARCHITECTURE.md.
- **Open:** should API keys get metadata (name/owner/tags)?
- **Open:** should keys support rotation/expiry?
- **Open:** should a management API be added?

## Sources

- `.env.example` (env contract)
- `docs/ARCHITECTURE.md` (env matrix)
- `docs/plans-and-prompts/research/2026-08-31-message-origin-and-destination-research.md` §A.4
- LiteLLM virtual keys docs (via E13)