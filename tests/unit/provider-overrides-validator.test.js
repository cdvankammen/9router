// Regression tests for Row 19 (2026-10-27): providerOverrides header-injection
// gate, shared between PATCH /api/settings and PUT /api/providers/[id]/overrides.
//
// An adversarial second-opinion review found that while the overrides PUT
// route validated headers against BLOCKED_HEADERS + HEADER_NAME_RE, the
// PATCH /api/settings route passed providerOverrides straight to
// updateSettings() -> deepMergeObject with zero validation. An authenticated
// user could PATCH
//   { providerOverrides: { claude: { headers: { Authorization: "Bearer x" } } } }
// and have that header sent on every subsequent Claude upstream request via
// base.js:132 Object.assign(headers, providerOverrides.headers).
//
// Fix: a single validator module (src/lib/auth/providerOverridesValidator.js)
// that both routes import. These tests lock that gate in at the unit level.

import { describe, it, expect } from "vitest";
import {
  validateProviderOverrides,
  BLOCKED_HEADERS,
  HEADER_NAME_RE,
  MAX_HEADERS,
  MAX_HEADER_VALUE_LENGTH,
} from "@/lib/auth/providerOverridesValidator.js";

describe("validateProviderOverrides (Row 19 gate)", () => {
  it("accepts null / undefined (clearing overrides is a valid no-op)", () => {
    expect(validateProviderOverrides(null)).toEqual({ ok: true });
    expect(validateProviderOverrides(undefined)).toEqual({ ok: true });
  });

  it("rejects non-object providerOverrides", () => {
    expect(validateProviderOverrides("not-an-object").ok).toBe(false);
    expect(validateProviderOverrides(42).ok).toBe(false);
    expect(validateProviderOverrides([1, 2, 3]).ok).toBe(false);
    expect(validateProviderOverrides("not-an-object").error).toMatch(/must be an object/i);
  });

  it("rejects non-object override entry for a provider", () => {
    const r = validateProviderOverrides({ claude: "not-an-object" });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/providerOverrides\.claude must be an object/i);
  });

  it("rejects non-object headers field", () => {
    const r = validateProviderOverrides({ claude: { headers: "not-an-object" } });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/headers must be an object/i);
  });

  it("rejects each blocked structure/auth header", () => {
    const structureAndAuth = [
      "host",
      "content-length",
      "content-type",
      "connection",
      "transfer-encoding",
      "authorization",
      "cookie",
    ];
    for (const name of structureAndAuth) {
      const r = validateProviderOverrides({
        claude: { headers: { [name]: "evil" } },
      });
      expect(r.ok, `expected rejection for ${name}`).toBe(false);
      expect(r.error).toMatch(/cannot be overridden/i);
    }
  });

  it("rejects each blocked forwarding/trust/peer header (defense-in-depth)", () => {
    const forwarding = [
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
    ];
    for (const name of forwarding) {
      const r = validateProviderOverrides({
        anyprovider: { headers: { [name]: "evil" } },
      });
      expect(r.ok, `expected rejection for ${name}`).toBe(false);
      expect(r.error, `error for ${name}`).toMatch(/cannot be overridden/i);
    }
  });

  it("is case-insensitive on header name lookup (Authorization = authorization)", () => {
    const r = validateProviderOverrides({
      claude: { headers: { Authorization: "Bearer x" } },
    });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/cannot be overridden/i);
  });

  it("rejects invalid header name (space, unicode, punctuation outside token set)", () => {
    for (const bad of ["Bad Header", "X-Heäder", "X_Header", "(evil)", "a b"]) {
      const r = validateProviderOverrides({
        claude: { headers: { [bad]: "value" } },
      });
      expect(r.ok, `expected rejection for '${bad}'`).toBe(false);
      expect(r.error).toMatch(/invalid header name/i);
    }
  });

  it("rejects CRLF injection in header value", () => {
    const r = validateProviderOverrides({
      claude: { headers: { "X-Custom": "value\r\nEvil: injected" } },
    });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/invalid value/i);
  });

  it("rejects lone LF in header value", () => {
    const r = validateProviderOverrides({
      claude: { headers: { "X-Custom": "value\nEvil: injected" } },
    });
    expect(r.ok).toBe(false);
  });

  it("rejects too many headers (>MAX_HEADERS)", () => {
    const headers = {};
    for (let i = 0; i < MAX_HEADERS + 1; i++) headers[`X-Header-${i}`] = `v${i}`;
    const r = validateProviderOverrides({ claude: { headers } });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/too many headers/i);
  });

  it("accepts exactly MAX_HEADERS headers (boundary)", () => {
    const headers = {};
    for (let i = 0; i < MAX_HEADERS; i++) headers[`X-Header-${i}`] = `v${i}`;
    const r = validateProviderOverrides({ claude: { headers } });
    expect(r.ok).toBe(true);
  });

  it("rejects header value longer than MAX_HEADER_VALUE_LENGTH", () => {
    const r = validateProviderOverrides({
      claude: { headers: { "X-Big": "x".repeat(MAX_HEADER_VALUE_LENGTH + 1) } },
    });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/value too long/i);
  });

  it("accepts value at exactly MAX_HEADER_VALUE_LENGTH (boundary)", () => {
    const r = validateProviderOverrides({
      claude: { headers: { "X-Big": "x".repeat(MAX_HEADER_VALUE_LENGTH) } },
    });
    expect(r.ok).toBe(true);
  });

  it("accepts a legitimate multi-provider override payload", () => {
    const r = validateProviderOverrides({
      claude: { headers: { "X-Custom-Tracking": "account-42" } },
      openai: { headers: { "X-Org-Id": "org_abc" } },
    });
    expect(r.ok).toBe(true);
  });

  it("accepts an override entry with no headers field (e.g. future keys)", () => {
    const r = validateProviderOverrides({
      claude: { /* no headers */ },
    });
    expect(r.ok).toBe(true);
  });

  it("skips null/undefined entries in the providerOverrides map gracefully", () => {
    const r = validateProviderOverrides({
      claude: null,
      openai: undefined,
      anthropic: { headers: { "X-OK": "yes" } },
    });
    expect(r.ok).toBe(true);
  });

  it("filters empty-string values before counting (matches normalizeOverride semantics)", () => {
    const headers = {};
    for (let i = 0; i < MAX_HEADERS + 5; i++) headers[`X-Header-${i}`] = ""; // all empty, filtered
    headers["X-Real-One"] = "v";
    const r = validateProviderOverrides({ claude: { headers } });
    expect(r.ok).toBe(true);
  });
});

describe("BLOCKED_HEADERS coverage", () => {
  it("includes the original 7 structure/auth headers", () => {
    for (const h of [
      "host", "content-length", "content-type", "connection",
      "transfer-encoding", "authorization", "cookie",
    ]) {
      expect(BLOCKED_HEADERS.has(h), `missing ${h}`).toBe(true);
    }
  });

  it("includes the 10 forwarding/trust/peer headers (Bug GG defense-in-depth)", () => {
    for (const h of [
      "x-forwarded-for", "x-forwarded-host", "x-forwarded-proto",
      "x-forwarded-server", "x-real-ip", "x-original-host", "x-real-host",
      "x-9r-real-ip", "x-9r-peer-token", "x-9r-via-proxy",
    ]) {
      expect(BLOCKED_HEADERS.has(h), `missing ${h}`).toBe(true);
    }
  });
});

describe("HEADER_NAME_RE (RFC 7230 token subset)", () => {
  it("accepts valid token header names", () => {
    for (const n of ["X-Custom", "authorization", "Content-Type", "X-9r-Peer-Token", "A1"]) {
      expect(HEADER_NAME_RE.test(n), `should accept ${n}`).toBe(true);
    }
  });
  it("rejects invalid header name characters", () => {
    for (const n of ["Bad Header", "X:Y", "X/Y", "(evil)", "X_underscore", "a..b", ""]) {
      expect(HEADER_NAME_RE.test(n), `should reject '${n}'`).toBe(false);
    }
  });
});
