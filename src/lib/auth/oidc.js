import crypto from "node:crypto";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { getSettings } from "@/lib/localDb";

export const OIDC_COOKIE_NAMES = {
  state: "oidc_state",
  nonce: "oidc_nonce",
  verifier: "oidc_code_verifier",
};

const DEFAULT_SCOPES = "openid profile email";
const DEFAULT_LOGIN_LABEL = "Sign in with OIDC";

function trimTrailingSlashes(value) {
  return (value || "").trim().replace(/\/+$/, "");
}

function normalizeScopes(value) {
  return (value || DEFAULT_SCOPES).trim() || DEFAULT_SCOPES;
}

export function getPublicOrigin(request) {
  const configuredBaseUrl =
    process.env.BASE_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    "";

  if (configuredBaseUrl) {
    return trimTrailingSlashes(configuredBaseUrl);
  }

  const forwardedProto = request?.headers?.get?.("x-forwarded-proto") || "";
  const forwardedHost = request?.headers?.get?.("x-forwarded-host") || "";
  const host = forwardedHost || request?.headers?.get?.("host") || "";
  if (host) {
    const protocol = (forwardedProto || new URL(request.url).protocol || "http:").replace(/:$/, "");
    return `${protocol}://${host}`.replace(/\/+$/, "");
  }

  return trimTrailingSlashes(new URL(request.url).origin);
}

export function isOidcConfigured(settings) {
  return !!(
    trimTrailingSlashes(settings?.oidcIssuerUrl) &&
    (settings?.oidcClientId || "").trim() &&
    (settings?.oidcClientSecret || "").trim()
  );
}

export async function getOidcRuntimeConfig() {
  const settings = await getSettings();
  if (!["oidc", "both"].includes(settings.authMode) || !isOidcConfigured(settings)) return null;

  const issuerUrl = trimTrailingSlashes(settings.oidcIssuerUrl);
  return {
    issuerUrl,
    clientId: settings.oidcClientId.trim(),
    clientSecret: settings.oidcClientSecret.trim(),
    scopes: normalizeScopes(settings.oidcScopes),
    loginLabel: (settings.oidcLoginLabel || DEFAULT_LOGIN_LABEL).trim() || DEFAULT_LOGIN_LABEL,
  };
}

export async function fetchOidcDiscovery(issuerUrl, { signal } = {}) {
  const discoveryUrl = `${trimTrailingSlashes(issuerUrl)}/.well-known/openid-configuration`;
  const res = await fetch(discoveryUrl, { cache: "no-store", signal });
  if (!res.ok) {
    throw new Error(`Failed to load OIDC discovery document from ${discoveryUrl}`);
  }
  return await res.json();
}

// Required fields in the discovery document — without these, the IdP cannot
// drive an authorization-code flow and saving the config would brick login.
const REQUIRED_DISCOVERY_FIELDS = ["authorization_endpoint", "token_endpoint"];

/**
 * Pre-flight check run by the settings PATCH route before persisting OIDC
 * config. Defends against the evil.example.com scenario (Finding #13): an
 * unreachable or malformed issuer would otherwise lock out password-disabled
 * logins.
 *
 * Returns { ok: true, discovery } on success, or { ok: false, reason, message }
 * on failure. `reason` is a stable code the UI can key error copy off of.
 */
export async function validateOidcConfigForSave({ issuerUrl, timeoutMs = 5000 } = {}) {
  if (!issuerUrl || !String(issuerUrl).trim()) {
    return { ok: false, reason: "empty", message: "Issuer URL is required." };
  }
  const trimmed = String(issuerUrl).trim();

  let parsed;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { ok: false, reason: "invalid-url", message: `Issuer URL is not a valid URL: ${trimmed}` };
  }
  // HTTPS required except for local development hosts — prevents accidentally
  // sending auth code flows (and client secrets) over cleartext.
  const isLocalDev = parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1" || parsed.hostname === "::1";
  if (parsed.protocol !== "https:" && !isLocalDev) {
    return {
      ok: false,
      reason: "insecure",
      message: `Issuer URL must use HTTPS (got ${parsed.protocol}). Cleartext OIDC endpoints expose the authorization code flow to network observers.`,
    };
  }

  const ac = new AbortController();
  const timer = setTimeout(
    () => ac.abort(new Error(`Discovery fetch timed out after ${timeoutMs}ms`)),
    timeoutMs,
  );
  try {
    const discovery = await fetchOidcDiscovery(trimmed, { signal: ac.signal });
    if (!discovery || typeof discovery !== "object") {
      return { ok: false, reason: "bad-json", message: "Discovery document is not a JSON object." };
    }
    const missing = REQUIRED_DISCOVERY_FIELDS.filter((f) => !discovery[f]);
    if (missing.length > 0) {
      return {
        ok: false,
        reason: "missing-fields",
        message: `Discovery document is missing required fields: ${missing.join(", ")}.`,
        discovery,
      };
    }
    return { ok: true, discovery };
  } catch (err) {
    const msg = err?.message || String(err);
    // Distinguish timeout from generic network failure so the UI can show
    // targeted remediation (e.g. "check DNS / firewall" vs "host unreachable").
    if (/abort|timed out/i.test(msg)) {
      return { ok: false, reason: "timeout", message: `OIDC discovery fetch timed out (${timeoutMs}ms). Verify the issuer host is reachable from this server.` };
    }
    return { ok: false, reason: "fetch-failed", message: `Could not reach OIDC discovery: ${msg}` };
  } finally {
    clearTimeout(timer);
  }
}

export function createPkcePair() {
  const verifier = crypto.randomBytes(32).toString("base64url");
  const challenge = crypto.createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge };
}

export function createOidcState() {
  return crypto.randomBytes(16).toString("base64url");
}

export function createOidcNonce() {
  return crypto.randomBytes(16).toString("base64url");
}

export function buildOidcAuthorizationUrl({
  authorizationEndpoint,
  clientId,
  redirectUri,
  scopes = DEFAULT_SCOPES,
  state,
  nonce,
  codeChallenge,
}) {
  const url = new URL(authorizationEndpoint);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("scope", normalizeScopes(scopes));
  url.searchParams.set("state", state);
  url.searchParams.set("nonce", nonce);
  url.searchParams.set("code_challenge", codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  return url.toString();
}

export async function exchangeOidcCode({
  tokenEndpoint,
  clientId,
  clientSecret,
  code,
  redirectUri,
  codeVerifier,
}) {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: clientId,
    code,
    redirect_uri: redirectUri,
    code_verifier: codeVerifier,
  });

  if (clientSecret) {
    body.set("client_secret", clientSecret);
  }

  const res = await fetch(tokenEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = data?.error_description || data?.error || `OIDC token exchange failed (${res.status})`;
    throw new Error(message);
  }

  return data;
}

export async function probeOidcClientSecret({
  tokenEndpoint,
  clientId,
  clientSecret,
  redirectUri,
}) {
  if (!clientSecret) {
    return {
      tested: false,
      valid: null,
      message: "No client secret was provided, so secret validation was skipped.",
    };
  }

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: clientId,
    client_secret: clientSecret,
    code: "__oidc_test_invalid_code__",
    redirect_uri: redirectUri,
    code_verifier: "__oidc_test_invalid_verifier__",
  });

  const res = await fetch(tokenEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const data = await res.json().catch(() => ({}));
  const error = (data?.error || "").toLowerCase();
  const errorDescription = data?.error_description || data?.error || "";

  if (res.ok) {
    return {
      tested: true,
      valid: true,
      message: "Client secret was accepted by the token endpoint.",
      raw: data,
    };
  }

  if (error === "invalid_client" || error === "unauthorized_client" || /client.*(invalid|failed|mismatch)/i.test(errorDescription)) {
    return {
      tested: true,
      valid: false,
      message: errorDescription || "Client secret is not valid.",
      raw: data,
    };
  }

  if (error === "invalid_grant" || error === "invalid_code" || /grant|code/i.test(errorDescription)) {
    return {
      tested: true,
      valid: true,
      message: "Client secret was accepted; the token exchange failed only because the test authorization code is invalid.",
      raw: data,
    };
  }

  return {
    tested: true,
    valid: null,
    message: errorDescription || `Token endpoint responded with ${res.status}`,
    raw: data,
  };
}

export async function verifyOidcIdToken({
  idToken,
  issuer,
  audience,
  jwksUri,
  nonce,
}) {
  const jwks = createRemoteJWKSet(new URL(jwksUri));
  const { payload } = await jwtVerify(idToken, jwks, {
    issuer,
    audience,
    nonce,
  });
  return payload;
}

export function pickOidcDisplayName(payload = {}) {
  return payload.preferred_username || payload.email || payload.name || payload.given_name || payload.sub || "OIDC user";
}

export function pickOidcEmail(payload = {}) {
  return payload.email || "";
}
