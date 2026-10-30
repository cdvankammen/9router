import { GITLAB_CONFIG } from "../constants/oauth.js";
import { assertHostNotLinkLocalResolved } from "@/shared/utils/ssrfGuard.js";

// GitLab Duo - Authorization Code Flow with PKCE
// Supports two login modes via loginMode metadata: "oauth" (default) or "pat"
//
// SECURITY (#287 / #253): baseUrl is user-supplied via the OAuth modal and
// is used to build both the browser redirect AND the server-side token +
// user-info fetches. Without validation, `http://169.254.169.254` would make
// the server GET cloud metadata and leak it in the tokens._user field.
// We use assertHostNotLinkLocalResolved (the softer variant) so self-hosted
// GitLab instances at RFC1918 addresses still work.
async function assertGitLabHostSafe(baseUrl) {
  const host = new URL(baseUrl).hostname;
  await assertHostNotLinkLocalResolved(host);
}

const gitlab = {
  config: GITLAB_CONFIG,
  flowType: "authorization_code_pkce",
  buildAuthUrl: async (config, redirectUri, state, codeChallenge, meta = {}) => {
    const baseUrl = meta.baseUrl || config.defaultBaseUrl;
    // Guard runs before any user-controlled URL is emitted into the redirect.
    await assertGitLabHostSafe(baseUrl);
    const clientId = meta.clientId || "";
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      state,
      scope: config.scope,
      code_challenge: codeChallenge,
      code_challenge_method: config.codeChallengeMethod,
    });
    return `${baseUrl}${config.authorizeUrlPath}?${params.toString()}`;
  },
  exchangeToken: async (config, code, redirectUri, codeVerifier, state, meta = {}) => {
    const baseUrl = meta.baseUrl || config.defaultBaseUrl;
    const clientId = meta.clientId || "";
    const clientSecret = meta.clientSecret || "";
    const body = new URLSearchParams({
      client_id: clientId,
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
    });
    if (clientSecret) body.set("client_secret", clientSecret);
    const response = await fetch(`${baseUrl}${config.tokenUrlPath}`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body: body.toString(),
    });
    if (!response.ok) throw new Error(`GitLab token exchange failed: ${await response.text()}`);
    const tokens = await response.json();
    // Fetch user info
    const userRes = await fetch(`${baseUrl}${config.userInfoUrlPath}`, {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const user = userRes.ok ? await userRes.json() : {};
    return { ...tokens, _user: user, _baseUrl: baseUrl, _clientId: clientId };
  },
  mapTokens: (tokens) => ({
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresIn: tokens.expires_in,
    scope: tokens.scope,
    providerSpecificData: {
      username: tokens._user?.username || "",
      email: tokens._user?.email || tokens._user?.public_email || "",
      name: tokens._user?.name || "",
      baseUrl: tokens._baseUrl,
      clientId: tokens._clientId,
      authKind: "oauth",
    },
  }),
};

export default gitlab;
