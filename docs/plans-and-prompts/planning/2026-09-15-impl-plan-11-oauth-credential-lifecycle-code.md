# Implementation Plan 11 — OAuth & Credential Lifecycle — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #oauth #credentials #lifecycle #pkce #device-flow #token-refresh #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (imports, function signatures, `open-sse/services/oauthService.js` existence, `src/lib/db/repos/connectionsRepo.js`, `src/lib/db/repos/apiKeysRepo.js`, token refresh flow in `open-sse/handlers/chatCore.js`).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — run the app, hit the endpoints, check the DB, confirm acceptance criteria.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-11-oauth-credential-lifecycle.md`, `../research/9router/15-oauth-deep-dive.md`, `../research/9router/16-oauth-cursor-auto-import.md`

## Scope

**In scope:** config-driven OAuth framework (authorization code + PKCE, device flow); single-flight token refresh; credential lifecycle states (created → active → rotating → revoked); audit events; fix `oauth-cursor-auto-import` known-fail.
**Out of scope:** OIDC/SAML SSO (dashboard auth, separate); social login.

## Milestones

### M1 — OAuth framework (config-driven)

**Reference code (`open-sse/config/oauthConfig.js`):**

```js
// Per-provider OAuth config: auth URL, token URL, scopes, PKCE, device flow.
export const OAUTH_PROVIDERS = {
  cursor: {
    authUrl: "https://authenticator.cursor.sh/v1/oauth/authorize",
    tokenUrl: "https://authenticator.cursor.sh/v1/oauth/token",
    scopes: ["openid", "profile", "email"],
    pkce: true,
    deviceFlow: false,
  },
  xai: {
    authUrl: "https://console.x.ai/oauth/authorize",
    tokenUrl: "https://console.x.ai/oauth/token",
    scopes: ["openid"],
    pkce: true,
    deviceFlow: false,
  },
  // ... per-provider entries
};
```

**Reference code (`open-sse/services/oauthService.js`):**

```js
import { OAUTH_PROVIDERS } from "../config/oauthConfig.js";

export function buildAuthUrl(provider, { clientId, redirectUri, state }) {
  const cfg = OAUTH_PROVIDERS[provider];
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: cfg.scopes.join(" "),
    state,
  });
  if (cfg.pkce) {
    const verifier = generatePkceVerifier();
    params.set("code_challenge", generatePkceChallenge(verifier));
    params.set("code_challenge_method", "S256");
    // Store verifier in session for token exchange
  }
  return `${cfg.authUrl}?${params}`;
}

export async function exchangeCode(provider, { code, verifier, redirectUri }) {
  const cfg = OAUTH_PROVIDERS[provider];
  const res = await fetch(cfg.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: cfg.clientId,
      ...(verifier ? { code_verifier: verifier } : {}),
    }),
  });
  if (!res.ok) throw new Error(`OAuth token exchange failed: ${res.status}`);
  return res.json(); // { access_token, refresh_token, expires_in, ... }
}
```

**Acceptance criteria:** auth URL builder + token exchange work; PKCE supported; device flow stub.

### M2 — Single-flight token refresh

**Reference code (`open-sse/services/tokenRefresh.js`):**

```js
// Single-flight: concurrent refreshes for same credential collapse into one.
const inflight = new Map(); // credentialId -> Promise

export async function refreshToken(credentialId, refreshFn) {
  if (inflight.has(credentialId)) return inflight.get(credentialId);
  const p = refreshFn().finally(() => inflight.delete(credentialId));
  inflight.set(credentialId, p);
  return p;
}
```

**Acceptance criteria:** concurrent refreshes collapse; refresh failures logged + credential marked for re-auth.

### M3 — Lifecycle states + audit

**Reference code (`src/lib/db/repos/credentialRepo.js`):**

```js
// States: created -> active -> rotating -> revoked
export const CREDENTIAL_STATES = ["created", "active", "rotating", "revoked"];

export async function transitionCredentialState(db, credentialId, to, { reason } = {}) {
  const from = await db.get(`SELECT state FROM credentials WHERE id = ?`, [credentialId]);
  if (!from) throw new Error("credential not found");
  if (!isValidTransition(from.state, to)) throw new Error(`invalid transition ${from.state} -> ${to}`);
  await db.run(`UPDATE credentials SET state = ?, updated_at = ? WHERE id = ?`, [to, Date.now(), credentialId]);
  await logAuditEvent({ type: "credential.state_change", actor: "system", detail: { credentialId, from: from.state, to, reason } });
}

function isValidTransition(from, to) {
  const allowed = {
    created: ["active", "revoked"],
    active: ["rotating", "revoked"],
    rotating: ["active", "revoked"],
    revoked: [],
  };
  return allowed[from]?.includes(to) ?? false;
}
```

**Acceptance criteria:** state machine enforced; audit events on transitions; rotation flow (refresh → verify → swap → revoke old).

### M4 — Fix oauth-cursor-auto-import + tests

**Files touched:**
- Fix `tests/unit/oauth-cursor-auto-import.test.js` known-fail (auto-import flow: detect cursor config → import credentials → mark active)
- `tests/unit/oauth-lifecycle.test.js` (new)

**Acceptance criteria:** known-fail fixed; lifecycle tests pass.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Provider OAuth changes | Config-driven; versioned config |
| Refresh token expiry | Lifecycle states; re-auth prompts |
| Single-flight memory | Map cleanup on settle |
| Auto-import detection | Cursor config paths vary | Path probing + user confirmation |

## Verification

- Unit: auth URL, token exchange, single-flight, state machine
- Manual: OAuth connect a provider → verify states + audit
- Regression: `tests/__baseline__/verify-no-regression.mjs`