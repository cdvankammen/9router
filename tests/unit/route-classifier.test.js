// Pins the ESM route classifier (src/lib/middleware/routeClassifier.js) to
// the same fixture table as its CJS twin in custom-server.rate-limiter.js.
// If you change one classifier, update BOTH — the shared fixtures in this
// file and in rate-limiter-buckets.test.cjs must stay in agreement.
import { describe, it, expect } from "vitest";
import {
  classifyRoute,
  shouldBypass,
  getBucketLimit,
  BUCKET_LIMITS,
  BYPASS_CATEGORIES,
} from "@/lib/middleware/routeClassifier.js";

// Shared fixture table — identical expectations apply to the CJS twin
// (custom-server.rate-limiter.js classifyRequest), verified in
// rate-limiter-buckets.test.cjs via the `category` field on checkLimit.
const FIXTURES = [
  // Framework traffic — bypass categories
  ["/_next/static/chunks/main.js", "GET", "static"],
  ["/_next/static/css/app.css", "GET", "static"],
  ["/dashboard/providers?_rsc=abc123", "GET", "rsc"],
  ["/dashboard/combos?_rsc=11hzb", "GET", "rsc"],

  // Auth — tight bucket, credential-submission POSTs only
  ["/api/auth/login", "POST", "auth"],
  ["/api/auth/setup", "POST", "auth"],
  ["/api/auth/reset-password", "POST", "auth"],

  // Auth-adjacent routes that MUST stay out of the auth bucket
  ["/api/auth/status", "GET", "api"],   // polled by Header.js every page load
  ["/api/auth/status", "POST", "api"],
  ["/api/auth/login", "GET", "api"],
  ["/api/auth/logout", "POST", "api"],

  // Chat — tight bucket, POST completions only
  ["/v1/chat/completions", "POST", "chat"],
  ["/v1/completions", "POST", "chat"],
  ["/api/v1/chat/completions", "POST", "chat"], // rewrite form (/v1/* → /api/v1/*)
  ["/v1/chat/completions", "GET", "api"],
  ["/v1/embeddings", "POST", "api"],
  ["/v1/images/generations", "POST", "api"],
  ["/v1/models", "GET", "api"],

  // Other API / gateway traffic
  ["/api/models", "GET", "api"],
  ["/api/providers", "GET", "api"],
  ["/api/usage", "GET", "api"],
  ["/api/auth/status", "GET", "api"],
  ["/v1beta/models", "GET", "api"],

  // Bypass evasion attempts must NOT bypass
  ["/api/search?q=rsc+models", "GET", "api"],
  ["/api/what_is_next", "GET", "api"],

  // Fallback
  ["/dashboard/usage", "GET", "general"],
  ["/dashboard/providers", "GET", "general"],
  ["/", "GET", "general"],
  ["", "GET", "general"],
];

describe("classifyRoute — shared fixture table (ESM twin pin)", () => {
  for (const [url, method, expected] of FIXTURES) {
    it(`${method} ${url || "(empty)"} → ${expected}`, () => {
      expect(classifyRoute(url, method)).toBe(expected);
    });
  }
});

describe("shouldBypass", () => {
  it("bypasses static and rsc", () => {
    expect(shouldBypass("static")).toBe(true);
    expect(shouldBypass("rsc")).toBe(true);
  });

  it("does not bypass counted buckets", () => {
    expect(shouldBypass("auth")).toBe(false);
    expect(shouldBypass("chat")).toBe(false);
    expect(shouldBypass("api")).toBe(false);
    expect(shouldBypass("general")).toBe(false);
  });

  it("BYPASS_CATEGORIES matches the documented set", () => {
    expect([...BYPASS_CATEGORIES].sort()).toEqual(["rsc", "static"]);
  });
});

describe("getBucketLimit", () => {
  it("returns the per-bucket limits", () => {
    expect(getBucketLimit("auth")).toBe(10);
    expect(getBucketLimit("chat")).toBe(20);
    expect(getBucketLimit("api")).toBe(120);
    expect(getBucketLimit("general")).toBe(120);
  });

  it("falls back to the general limit for unknown buckets", () => {
    expect(getBucketLimit("nope")).toBe(BUCKET_LIMITS.general);
    expect(getBucketLimit(undefined)).toBe(BUCKET_LIMITS.general);
  });

  it("tight buckets are actually tighter than general", () => {
    expect(BUCKET_LIMITS.auth).toBeLessThan(BUCKET_LIMITS.general);
    expect(BUCKET_LIMITS.chat).toBeLessThan(BUCKET_LIMITS.general);
  });
});
