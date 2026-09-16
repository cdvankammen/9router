# Exponential Expansion E12 — Anthropic Identity-Backed Keys

**Date:** 2026-09-15
**Root phrase:** "Anthropic identity-backed keys (personal/service/workspace, expiration, WIF, App Attest)" — from `2026-08-31-message-origin-and-destination-research.md` §B.2
**Format:** 6+ levels, variable branching
**Status:** complete

## L1 — sub-phrases discovered in the root

1. Personal key (acts as user, stops when user loses access, archived on removal)
2. Service account key (acts as service account, survives creator removal)
3. Workspace key (legacy, belongs to workspace, expires/disabled/archived with workspace)
4. Key expiration presets (3h/1d/7d/30d/custom/never)
5. Expiry emails (7 days before for ≥14d, 1 day for ≥7d)
6. Expired keys → 401 authentication_error
7. Admin API reports expires_at
8. Workload Identity Federation (WIF)
9. App Attest (iOS/macOS device attestation)

## L2 — expansion of each L1 node

### 1. Personal key
- **1a. Acts as** — the user, with their roles/permissions.
- **1b. Scope** — single workspace or workspaces where role allows.
- **1c. Stops when** — user loses org access or workspace access.
- **1d. Archived** — on removal; not restored on re-invite.
- **1e. Use case** — own development/scripts.

### 2. Service account key
- **2a. Acts as** — a service account.
- **2b. Scope** — single workspace or service account's access.
- **2c. Service account access** — Default Workspace + added workspaces.
- **2d. Stops when** — service account archived or removed from workspace.
- **2e. Use case** — shared/automated workloads (CI, production).

### 3. Workspace key (legacy)
- **3a. Belongs to** — the workspace.
- **3b. No identity** — acts as no one.
- **3c. Stops when** — expires, disabled, deleted, or workspace archived.
- **3d. Creator leaving** — key continues working.
- **3e. Migration** — replace with WIF or identity-backed keys.

### 4. Key expiration presets
- **4a. 3 hours** — short-lived.
- **4b. 1 day** — daily.
- **4c. 7 days** — weekly.
- **4d. 30 days** — monthly.
- **4e. Custom** — arbitrary duration.
- **4f. Never** — for secrets manager rotation.
- **4g. Org max policy** — limits presets/custom; Never unavailable.

### 5. Expiry emails
- **5a. ≥14 days** — 7 days before.
- **5b. ≥7 days** — 1 day before.
- **5c. Shorter** — no warning.
- **5d. Creator** — emailed.

### 6. Expired keys → 401
- **6a. Response** — authentication_error.
- **6b. Recovery** — create new key.
- **6c. Reactivation** — impossible.

### 7. Admin API expires_at
- **7a. List API Keys** — returns expires_at.
- **7b. Retrieve API Key** — returns expires_at.
- **7c. Null** — for keys without expiration.
- **7d. Audit** — rotate before expiry.

### 8. Workload Identity Federation (WIF)
- **8a. Concept** — exchange IdP JWT for short-lived Claude token.
- **8b. IdPs** — AWS IAM, Google Cloud, GitHub Actions, Kubernetes, SPIFFE, Entra ID, Okta.
- **8c. Endpoint** — POST /v1/oauth/token.
- **8d. SDK** — auto-refreshes before expiry.
- **8e. No static secret** — no sk-ant-api... to mint/distribute/rotate.
- **8f. Trust chain** — only as strong as IdP config.
- **8g. Pair with** — IP allowlists, MFA, audit logging.
- **8h. Setup** — service account + federation issuer + federation rule.

### 9. App Attest
- **9a. Purpose** — genuine iOS/macOS app installations.
- **9b. Apple service** — App Attest proves unmodified build.
- **9c. Token** — short-lived, scoped to workspace.
- **9d. Expiry** — 1 hour.
- **9e. Scope** — Messages API only.
- **9f. Registration** — app registered in Claude Console.

## L3 — expansion of selected L2 nodes

### 1c → stops when
- **1c-i. Org removal** — key stops immediately.
- **1c-ii. Workspace removal** — single-workspace key stops.
- **1c-iii. Re-invite** — create new keys.

### 2c → service account access
- **2c-i. Default Workspace** — always has access.
- **2c-ii. Added workspaces** — explicit grants.
- **2c-iii. Key scope** — chosen at creation.

### 4g → org max policy
- **4g-i. Console limits** — presets/custom capped.
- **4g-ii. Never** — unavailable if policy set.
- **4g-iii. Existing keys** — keep current behavior.

### 8b → IdPs
- **8b-i. AWS IAM** — IAM roles.
- **8b-ii. Google Cloud** — service accounts.
- **8b-iii. GitHub Actions** — OIDC tokens.
- **8b-iv. Kubernetes** — service account tokens.
- **8b-v. SPIFFE** — SPIFFE IDs.
- **8b-vi. Entra ID** — Azure AD.
- **8b-vii. Okta** — Okta OIDC.

### 8h → setup resources
- **8h-i. Service account** — identity for workload.
- **8h-ii. Federation issuer** — IdP config.
- **8h-iii. Federation rule** — maps IdP claims to service account.

## L4 — expansion of selected L3 nodes

### 1c-i → org removal
- **1c-i-a. Immediate** — key invalidated.
- **1c-i-b. All keys** — personal + service account.
- **1c-i-c. Audit** — Admin API shows archived.

### 2c-i → Default Workspace
- **2c-i-a. Always** — service account has access.
- **2c-i-b. No config** — automatic.
- **2c-i-c. Limits** — org limits apply.

### 8b-iii → GitHub Actions
- **8b-iii-a. OIDC token** — from Actions runtime.
- **8b-iii-b. Exchange** — POST /v1/oauth/token.
- **8b-iii-c. Use** — CI/CD pipelines.

### 8h-i → service account
- **8h-i-a. Create** — Settings → Service accounts.
- **8h-i-b. Add to workspace** — grant access.
- **8h-i-c. Key** — create for service account.

## L5 — expansion of selected L4 nodes

### 1c-i-a → immediate invalidation
- **1c-i-a-1. Requests fail** — 401.
- **1c-i-a-2. No grace** — instant.
- **1c-i-a-3. Re-invite** — new keys needed.

### 8b-iii-a → OIDC token
- **8b-iii-a-1. Format** — JWT.
- **8b-iii-a-2. Claims** — sub, aud, iss, exp.
- **8b-iii-a-3. Audience** — Anthropic.

### 8h-i-a → create service account
- **8h-i-a-1. Name** — human-readable.
- **8h-i-a-2. Description** — purpose.
- **8h-i-a-3. Admin** — org admin creates.

## L6 — expansion of selected L5 nodes

### 8b-iii-a-1 → JWT format
- **8b-iii-a-1-1. Header** — alg, typ.
- **8b-iii-a-1-2. Payload** — claims.
- **8b-iii-a-1-3. Signature** — IdP signs.

### 8h-i-a-3 → admin creates
- **8h-i-a-3-1. Permissions** — org admin required.
- **8h-i-a-3-2. Audit** — logged.
- **8h-i-a-3-3. Delegation** — can't delegate creation.

## Confidence & open questions

- **Confidence: high** — fetched live from platform.claude.com/docs/en/manage-claude/authentication.
- **Open:** should 9router support WIF-style short-lived tokens (see E19)?
- **Open:** should 9router support key expiration presets?

## Sources

- https://platform.claude.com/docs/en/manage-claude/authentication (fetched 2026-09-15)
- `docs/plans-and-prompts/research/2026-08-31-message-origin-and-destination-research.md` §B.2