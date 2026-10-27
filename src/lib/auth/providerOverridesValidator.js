/**
 * Provider overrides header validation.
 *
 * SECURITY (Row 19, 2026-10-27): Shared validation logic for provider header
 * overrides. Both PATCH /api/settings and PUT /api/providers/[id]/overrides
 * must apply this gate to prevent authenticated users from injecting
 * security-sensitive headers (Authorization, Host, Cookie, forwarding headers)
 * that would be sent on every upstream request via base.js:132
 * `Object.assign(headers, providerOverrides.headers)`.
 *
 * The original vulnerability: the overrides PUT route validated headers
 * against BLOCKED_HEADERS + HEADER_NAME_RE, but the settings PATCH route
 * passed providerOverrides straight to updateSettings() -> deepMergeObject
 * with zero validation. An authenticated attacker could
 *   PATCH /api/settings {providerOverrides:{claude:{headers:{Authorization:"Bearer x"}}}}
 * and have that header applied system-wide.
 */

export const MAX_HEADERS = 20;
export const MAX_HEADER_VALUE_LENGTH = 8192;
// RFC 7230 token subset: letters, digits, hyphen (no spaces, no unicode)
export const HEADER_NAME_RE = /^[A-Za-z0-9-]+$/;

// Headers that must never be overridden — structure/auth/forwarding headers
// that would compromise request integrity or enable header injection attacks.
export const BLOCKED_HEADERS = new Set([
  // Request structure
  "host",
  "content-length",
  "content-type",
  "connection",
  "transfer-encoding",
  // Auth
  "authorization",
  "cookie",
  // Forwarding / trust / peer headers (defense-in-depth against Bug GG variants).
  // Even though custom-server.js strips these at the socket boundary for inbound
  // requests, an override that sets them on OUTBOUND provider requests could
  // poison upstream trust or leak the gateway's internal peer token.
  "x-forwarded-for",
  "x-forwarded-host",
  "x-forwarded-proto",
  "x-forwarded-server",
  "x-real-ip",
  "x-original-host",
  "x-real-host",
  "x-9r-real-ip",
  "x-9r-peer-token",
  "x-9r-via-proxy",
]);

/**
 * Validate a providerOverrides payload.
 *
 * @param {unknown} providerOverrides - The providerOverrides value from request body.
 *   Accepts null/undefined (clearing the overrides) as a valid no-op.
 * @returns {{ ok: true } | { ok: false, error: string }}
 */
export function validateProviderOverrides(providerOverrides) {
  if (providerOverrides === null || providerOverrides === undefined) {
    return { ok: true };
  }

  if (typeof providerOverrides !== "object" || Array.isArray(providerOverrides)) {
    return { ok: false, error: "providerOverrides must be an object" };
  }

  for (const [providerId, override] of Object.entries(providerOverrides)) {
    if (override === null || override === undefined) continue;

    if (typeof override !== "object" || Array.isArray(override)) {
      return {
        ok: false,
        error: `providerOverrides.${providerId} must be an object`,
      };
    }

    const headers = override.headers;
    if (headers === undefined || headers === null) continue;

    if (typeof headers !== "object" || Array.isArray(headers)) {
      return {
        ok: false,
        error: `providerOverrides.${providerId}.headers must be an object`,
      };
    }

    const entries = Object.entries(headers).filter(([, v]) => v !== "" && v != null);

    if (entries.length > MAX_HEADERS) {
      return {
        ok: false,
        error: `providerOverrides.${providerId}: too many headers (max ${MAX_HEADERS})`,
      };
    }

    for (const [name, value] of entries) {
      if (!HEADER_NAME_RE.test(name)) {
        return {
          ok: false,
          error: `providerOverrides.${providerId}: invalid header name '${name}'`,
        };
      }
      if (typeof value !== "string" || /[\r\n]/.test(value)) {
        return {
          ok: false,
          error: `providerOverrides.${providerId}: invalid value for header '${name}'`,
        };
      }
      if (value.length > MAX_HEADER_VALUE_LENGTH) {
        return {
          ok: false,
          error: `providerOverrides.${providerId}: header '${name}' value too long (max ${MAX_HEADER_VALUE_LENGTH})`,
        };
      }
      if (BLOCKED_HEADERS.has(name.toLowerCase())) {
        return {
          ok: false,
          error: `providerOverrides.${providerId}: header '${name}' cannot be overridden`,
        };
      }
    }
  }

  return { ok: true };
}
