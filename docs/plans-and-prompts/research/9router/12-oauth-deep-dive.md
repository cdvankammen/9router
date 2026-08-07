# 9Router OAuth Deep Dive

**Location:** `src/lib/oauth/`
**Role:** Local OAuth gateway that authenticates end-users against 22 upstream AI/IDE providers (Claude, Codex, Kiro, Cursor, Antigravity, xAI, Grok CLI, Gemini CLI, GitHub, GitLab, Trae, Windsurf, Zed, Kimi, Kilocode, Cline, Clinepass, iFlow, Qoder, Codebuddy-CN/Intl, Kimchi) so 9Router can relay their tokens upstream on each chat/embedding/image request.

---

## 1. Directory layout


src/lib/oauth/
├── providers.js                 # Re-export shim
├── providerHelpers.js           # JWT/xAI/Kiro/Codex decoding helpers
├── providers/
│   ├── index.js                 # PROVIDERS registry + orchestration fns
│   ├── _shared.js               # Tiny JSON-path extractor (trae/windsurf)
│   ├── claude.js, codex.js, kiro.js, cursor.js, antigravity.js, …
├── services/
│   ├── index.js                 # Re-exports all *Service classes
│   ├── oauth.js                 # Generic OAuthService (legacy CLI)
│   └── claude.js, codex.js, gemini.js, iflow.js, qoder.js, …
└── utils/
    ├── pkce.js                  # PKCE + state generation
    ├── server.js                # Local HTTP callback + Codex proxy
    └── ideDetect.js             # Trae/Windsurf install detection


`providers.js` is a one-liner: `export * from "./providers/index.js"` — everything consumers need is re-exported from the registry.

---

## 2. Provider contract (the shape every provider must implement)

Every file under `providers/*.js` exports a default object with these fields:

| Field | Required | Notes |
|---|---|---|
| `config` | ✓ | Imported from `constants/oauth.js`. Holds `clientId`, `authorizeUrl`, `tokenUrl`, scopes, `codeChallengeMethod`, etc. |
| `flowType` | ✓ | One of `authorization_code_pkce`, `authorization_code`, `device_code`, `import_token`. |
| `buildAuthUrl(config, redirectUri, state, codeChallenge, meta)` | PKCE/code flows | Returns the browser URL. |
| `exchangeToken(config, code, redirectUri, codeVerifier, state, meta)` | PKCE/code flows | POSTs to token endpoint, returns raw JSON. |
| `requestDeviceCode(config, codeChallenge, options)` | device_code only | Returns `{device_code, user_code, verification_uri_complete, interval, _clientId, _clientSecret, …}`. |
| `pollToken(config, deviceCode, codeVerifier, extraData)` | device_code only | Returns `{ok, data}`; `data.error = 'authorization_pending'` keeps polling. |
| `mapTokens(rawTokens, extra)` | ✓ | Normalizes into `{accessToken, refreshToken, idToken, expiresIn, email, providerSpecificData}`. |
| `prepareConfig(config, meta)` | optional | Async — lets providers customize config per-session (GitLab user-supplied `clientId`/`baseUrl`, Trae's `loginTraceID`, Zed's RSA key). |
| `postExchange(tokens)` | optional | Async — extra HTTP calls after token exchange (Antigravity onboarding, Codex profile, Kiro ARN lookup). |
| `fixedPort`, `callbackPath` | optional | Override local callback server port/path. |

The `PROVIDERS` map in `providers/index.js` keys by provider id. `getProvider()` normalizes legacy aliases (`kimi-coding` → `kimi`).

---

## 3. Three orchestration entry points in `providers/index.js`

```js
generateAuthData(providerName, redirectUri, meta)
  → calls prepareConfig → generatePKCE(provider.pkceVerifierBytes)
  → provider.buildAuthUrl(...)
  → returns { authUrl, state, codeVerifier, codeChallenge, redirectUri,
              flowType, fixedPort, callbackPath }

exchangeTokens(providerName, code, redirectUri, codeVerifier, state, meta)
  → provider.exchangeToken(...) → provider.postExchange(...)
  → provider.mapTokens(tokens, extra)

requestDeviceCode / pollForToken(providerName, …)
  → Kiro/xAI path; pollForToken loops through authorization_pending,
    resolves profileArn for Kiro via fetchKiroProfileArn on success.


Special cases wired into `generateAuthData`:
- **Trae** uses `config.loginTraceID` as `state` (its callback matcher) instead of PKCE state.
- **Zed** passes an encoded RSA private key as `codeVerifier` instead of a PKCE verifier.

`backfillCodexEmails()` runs once per process at startup, walking existing Codex OAuth rows and backfilling `email` + `chatgptAccountId` from the `id_token` JWT for old rows that predate those fields.

---

## 4. Flow types in practice

### 4a. `authorization_code_pkce` (Claude, Codex, xAI, Grok CLI, Gemini CLI, Kimi, Kilocode, Cline, Clinepass, Trae, Windsurf, Zed, Codebuddy-*, Kimchi, GitHub, GitLab, iFlow, Qoder)
Standard RFC 7636. Local HTTP server on 127.0.0.1 listens on `/callback`, browser redirects there with `?code=&state=`, we exchange with the PKCE verifier. `generatePKCE(bytes)` defaults to 32 random bytes (xAI uses 96).

### 4b. `authorization_code` (Antigravity — Google-flavored)
Same shape but uses a `client_secret` instead of PKCE. `access_type=offline` + `prompt=consent` forces refresh token issuance.

### 4c. `device_code` (Kiro)
AWS SSO OIDC. Three HTTP calls:
1. `POST https://oidc.{region}.amazonaws.com/client/register` — dynamic client registration, returns ephemeral `clientId`/`clientSecret`.
2. `POST …/device_authorization` — returns `deviceCode`, `userCode`, `verificationUriComplete`.
3. `pollToken` polls `…/token` with grant `urn:ietf:params:oauth:grant-type:device_code` until `accessToken` arrives or `authorization_pending`.

The ephemeral client credentials are persisted into `providerSpecificData` so refresh works later. Region is user-selectable (`us-east-1` default) and validated by `assertValidAwsRegion`. Auth method is either `builder-id` (default) or `idc`.

### 4d. `import_token` (Cursor)
No OAuth flow at all. The Cursor IDE stores its bearer token in a local SQLite database; 9Router has a `/api/oauth/cursor/import` route that reads it. `mapTokens` just normalizes the already-extracted token and tags it with `machineId` + `authMethod: "imported"`.

---

## 5. Provider-specific quirks

### `claude.js`
- `buildAuthUrl` adds `code=true` (Claude-specific query param).
- `exchangeToken` handles `code` values that carry a trailing `#substate` fragment — splits on `#` and forwards both parts in the JSON body.
- Content-Type `application/json` (unlike most peers which use form-encoded).

### `codex.js` (OpenAI ChatGPT)
- Fixed callback port **1455** (`CODEX_CONFIG.fixedPort`) because OpenAI's allowlist is static.
- Extracts email + `chatgptAccountId` + `chatgptPlanType` from the `id_token` JWT's `https://api.openai.com/auth` claim (via `extractCodexAccountInfo`), falling back to the `email` claim in the access token JWT.
- `providerSpecificData.chatgptAccountId` is critical — it's the ChatGPT org/account the token is scoped to, used for model routing.

### `kiro.js` (AWS Builder ID / IAM Identity Center)
- Device code flow (see §4c).
- After successful poll, if `profileArn` is missing (common with Builder-ID tokens), the orchestrator calls `fetchKiroProfileArn(accessToken)` which POSTs to `https://codewhisperer.us-east-1.amazonaws.com/ListAvailableProfiles` and grabs the first ARN. Without this, downstream Kiro calls return 403.
- Stores `_clientId`, `_clientSecret`, `_region`, `_authMethod`, `_startUrl` inside the persisted `providerSpecificData` so refresh can re-sign.

### `cursor.js`
- Pure import flow — `mapTokens` is the only meaningful method. `refreshToken: null` (Cursor has no public refresh endpoint; when the imported token expires, user must re-import).

### `antigravity.js` (Google Code Assist / Gemini-for-IDE)
- Plain `authorization_code` with client secret.
- `postExchange` does three extra calls:
  1. `GET userInfoUrl?alt=json` — email.
  2. `POST loadCodeAssistEndpoint` with `{metadata}` — returns `cloudaicompanionProject.id` and the default `allowedTiers[].id`.
  3. **Fire-and-forget onboarding loop**: up to 10 attempts, 5 s apart, POSTs to `onboardUserEndpoint` with `{tierId, metadata}` until `done === true`. Does not block the DB save.
- `mapTokens` flattens `projectId` to the top level so the upstream executor can attach it to Gemini requests.

---

## 6. `utils/pkce.js`

Four pure functions, no dependencies beyond `node:crypto`:
- `generateCodeVerifier(bytes=32)` → base64url
- `generateCodeChallenge(verifier)` → SHA-256 base64url (S256)
- `generateState()` → 32 random bytes base64url
- `generatePKCE(bytes)` → bundles all three

---

## 7. `utils/server.js` — callback server + Codex proxy

**`startLocalServer(onCallback, fixedPort)`** — generic HTTP server on `127.0.0.1`. Serves `/callback` and `/auth/callback`, returns a success HTML page with a 3 s auto-`window.close()` countdown. Guards against login-CSRF with `isLoopbackOrigin()`: any `Origin` header that isn't `127.0.0.1`/`localhost` is rejected (legit OAuth redirects are top-level navigations with no Origin).

**`startCodexProxy(appPort)`** — singleton fixed-port (1455) server with two modes:
- **Mode A (server-side exchange)**: if `registerCodexSession({state, codeVerifier, redirectUri})` was called before the popup opened, the proxy itself exchanges the code, writes the row via `createProviderConnection`, sets `session.status = "done"`, and renders a success page. Modal polls `getCodexSessionStatus(state)`.
- **Mode B (legacy channel fallback)**: no registered session → 302 redirect to the dashboard's `/callback` on `appPort` so the old `BroadcastChannel`-based flow handles it.
Auto-stops after 5 min (`CODEX_PROXY_TIMEOUT_MS`).

`pendingExchanges` Map is the session store; `clearCodexSession` deletes after consumption.

---

## 8. `utils/ideDetect.js`

`detectIdeInstalled(providerId)` → `{installed, path}`. Checks platform-specific install paths for Trae and Windsurf, then falls back to `which`/`where` for the binary. Used by the dashboard to decide whether to show "Open IDE" CTAs on the OAuth success page.

---

## 9. `providerHelpers.js`

Shared decode/lookup utilities, all re-exported from `providers/index.js`:
- `decodeJwtPayload(jwt)` — base64url middle-segment decode with correct padding.
- `extractEmailFromAccessToken(accessToken)` — `email || preferred_username || sub`.
- `extractCodexAccountInfo(idToken)` — pulls `email`, `chatgptAccountId`, `chatgptPlanType` out of the OpenAI-namespaced claim.
- `fetchKiroProfileArn(accessToken)` — Codewhisperer `ListAvailableProfiles` call (see §5).
- `decodeXaiIdTokenEmail`, `validateXaiOAuthEndpoint` — strict `https:` + `x.ai` host allowlist for xAI's dynamic discovery document.
- `BASE64_BLOCK_SIZE = 4` constant for padding math.

---

## 10. `services/oauth.js` — legacy CLI helper

`OAuthService` class used by the standalone `open-sse` CLI (`open-sse/index.js`). Methods:
- `buildAuthUrl` — URLSearchParams-based.
- `startAuthFlow(authUrl, providerName)` — spins up `startLocalServer`, returns `{redirectUri, waitForCallback}`.
- `exchangeCode(code, redirectUri, codeVerifier, contentType)` — supports both form-encoded and JSON bodies.
- `authenticate(providerName, buildAuthUrlFn)` — full flow with `open` (opens the user's browser), state validation, and `OAUTH_TIMEOUT` (5 min).

This class is **not** used by the Next.js dashboard path — the dashboard calls `generateAuthData`/`exchangeTokens` directly from `providers/index.js`. The `services/index.js` barrel re-exports `OAuthService` plus provider-specific service classes (`ClaudeService`, `CodexService`, `KiroService`, `CursorService`, `AntigravityService`, `GitHubService`, `GeminiCLIService`, `IFlowService`, `QoderService`, `OpenAIService`) that wrap provider-specific refresh/profile logic.

---

## 11. Data flow through the gateway (putting it together)

1. Dashboard calls `GET /api/oauth/{provider}/start` → `generateAuthData(provider, redirectUri, meta)` → returns `authUrl` + `state`.
2. Browser navigates user to provider's authorize URL.
3. Provider redirects to `http://localhost:{port}/callback?code=&state=`.
   - Codex hits port 1455 proxy first (Mode A auto-exchanges and writes DB; Mode B redirects to dashboard).
4. Dashboard receives callback, calls `exchangeTokens(provider, code, redirectUri, codeVerifier, state, meta)`.
5. `provider.exchangeToken` → `provider.postExchange` (Antigravity onboarding, Codex/Kiro profile fetch) → `provider.mapTokens`.
6. Result persisted via `createProviderConnection({provider, authType:"oauth", ...tokenData})` into SQLite (`src/lib/db/repos/providerConnections`).
7. On each chat request, `open-sse/handlers/chatCore.js` picks a connection for the selected provider, refreshes the access token if `expiresAt` is near, and uses the resulting bearer for the upstream call.

---

## 12. Key architectural patterns worth preserving

- **Provider plugin model**: add a new provider by dropping one file in `providers/`, importing it in `providers/index.js`, and adding its constants to `constants/oauth.js`. No other file changes needed.
- **PKCE as default, opt-out for legacy**: only Antigravity uses `authorization_code` without PKCE (because Google still requires `client_secret` for that client type).
- **Post-exchange hook** cleanly separates "get tokens" from "get the rest of the user's profile/project data", keeping `exchangeToken` focused.
- **Fixed-port proxy pattern** (Codex, xAI) solves providers with a static redirect-URI allowlist, while keeping a legacy fallback path for older dashboard clients.
- **JWT introspection over extra HTTP**: email/account-id pulled from the `id_token` or access-token JWT whenever the claim exists; network calls only when necessary (Kiro ARN, Antigravity user info).
- **Origin-guarded callback server** blocks login-CSRF on the loopback redirect without needing a nonce cookie.
- **`_`-prefixed fields** (`_clientId`, `_clientSecret`, `_region`) on device-code poll results carry ephemeral registration data through to `mapTokens` and into DB persistence so refresh doesn't need to re-register.
- **Run-once backfill guards** (`codexBackfillDone` flag) for schema migrations that need to patch existing rows exactly once per process.
