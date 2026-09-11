// Header sanitizer middleware — strips or normalizes dangerous/unexpected headers
// before they reach route handlers. Prevents header injection, cache poisoning,
// and host-header attacks.

// Headers that must never be trusted from client input
const STRIP_HEADERS = [
  "x-forwarded-host",
  "x-original-host",
  "x-real-host",
];

// Headers that are only trustworthy when stamped by custom-server.js
const SERVER_ONLY_HEADERS = [
  "x-9r-real-ip",
  "x-9r-peer-token",
  "x-9r-via-proxy",
];

// Maximum allowed header value length (prevent buffer/memory exhaustion)
const MAX_HEADER_VALUE_LENGTH = 8192;

// Characters that indicate header injection attempts
const INJECTION_PATTERN = /[\r\n\0]/;

/**
 * Sanitize request headers in-place on the mutable Headers object.
 * Returns an array of warnings for logging.
 * @param {Headers} headers - Mutable request headers
 * @param {boolean} isTrustedProxy - Whether the request came through a trusted proxy
 * @returns {string[]} Array of warning messages (empty if clean)
 */
export function sanitizeHeaders(headers, isTrustedProxy = false) {
  const warnings = [];

  // Strip headers that should never come from clients
  for (const name of STRIP_HEADERS) {
    if (headers.has(name)) {
      headers.delete(name);
      warnings.push(`stripped untrusted header: ${name}`);
    }
  }

  // Strip server-only headers unless request came through trusted proxy
  if (!isTrustedProxy) {
    for (const name of SERVER_ONLY_HEADERS) {
      if (headers.has(name)) {
        headers.delete(name);
        warnings.push(`stripped server-only header without proxy trust: ${name}`);
      }
    }
  }

  // Validate remaining header values for injection and excessive length
  for (const [name, value] of headers.entries()) {
    if (value.length > MAX_HEADER_VALUE_LENGTH) {
      headers.delete(name);
      warnings.push(`stripped oversized header ${name} (${value.length} bytes)`);
      continue;
    }
    if (INJECTION_PATTERN.test(value)) {
      headers.delete(name);
      warnings.push(`stripped header with injection chars: ${name}`);
    }
  }

  // Normalize Host header — reject if missing or contains injection
  const host = headers.get("host");
  if (host) {
    if (INJECTION_PATTERN.test(host) || host.length > 253) {
      headers.delete("host");
      warnings.push("stripped invalid host header");
    }
  }

  return warnings;
}

/**
 * Create sanitized headers object from a Request (immutable).
 * Returns a new Headers instance with dangerous values removed.
 * @param {Request} request
 * @param {boolean} isTrustedProxy
 * @returns {{ headers: Headers, warnings: string[] }}
 */
export function createSanitizedHeaders(request, isTrustedProxy = false) {
  const headers = new Headers(request.headers);
  const warnings = sanitizeHeaders(headers, isTrustedProxy);
  return { headers, warnings };
}

export const __test__ = {
  STRIP_HEADERS,
  SERVER_ONLY_HEADERS,
  MAX_HEADER_VALUE_LENGTH,
  INJECTION_PATTERN,
};
