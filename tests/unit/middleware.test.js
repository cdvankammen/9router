import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── mocks ──────────────────────────────────────────────────────────────
const mocks = vi.hoisted(() => ({
  nextResponse: Symbol("next"),
  jsonResponse: vi.fn((body, init) => ({
    status: init?.status || 200,
    body,
    headers: new Headers(init?.headers || {}),
  })),
  getSettings: vi.fn(),
  validateApiKey: vi.fn(),
  getConsistentMachineId: vi.fn(),
  verifyDashboardAuthToken: vi.fn(),
}));

vi.mock("next/server", () => ({
  NextResponse: {
    next: vi.fn(() => mocks.nextResponse),
    json: mocks.jsonResponse,
    redirect: vi.fn((url) => ({ status: 307, url })),
  },
}));

vi.mock("@/lib/localDb", () => ({
  getSettings: mocks.getSettings,
  validateApiKey: mocks.validateApiKey,
}));

vi.mock("@/shared/utils/machineId", () => ({
  getConsistentMachineId: mocks.getConsistentMachineId,
}));

vi.mock("@/lib/auth/dashboardSession", () => ({
  verifyDashboardAuthToken: mocks.verifyDashboardAuthToken,
}));

// ─── real modules (not mocked — we test them directly) ──────────────────
const {
  checkRateLimit, rateLimitResponse, addRateLimitHeaders, __resetBuckets, __test__,
} = await import("../../src/lib/middleware/rateLimiter.js");

const { sanitizeHeaders, createSanitizedHeaders, __test__: szTest } = await import("../../src/lib/middleware/headerSanitizer.js");

// ─── helpers ────────────────────────────────────────────────────────────
function fakeRequest(pathname = "/api/test", headers = {}, search = "") {
  return {
    nextUrl: { pathname, searchParams: new URLSearchParams(search) },
    headers: new Headers(headers),
    cookies: { get: () => undefined },
    url: `http://localhost:20127${pathname}${search}`,
  };
}

// Mock headers that allow injection chars (native Headers rejects them)
class MockHeaders {
  constructor(init = {}) {
    this._map = new Map();
    for (const [k, v] of Object.entries(init)) {
      this._map.set(k.toLowerCase(), v);
    }
  }
  has(name) { return this._map.has(name.toLowerCase()); }
  get(name) { return this._map.get(name.toLowerCase()) ?? null; }
  set(name, value) { this._map.set(name.toLowerCase(), value); }
  delete(name) { this._map.delete(name.toLowerCase()); }
  *entries() { for (const [k, v] of this._map) yield [k, v]; }
}

const PEER_TOKEN = "peer-token-fixture";

beforeEach(() => {
  vi.clearAllMocks();
  __resetBuckets();
  process.env.NINEROUTER_PEER_TOKEN = PEER_TOKEN;
});

// ─── rate limiter tests ─────────────────────────────────────────────────
describe("rateLimiter — checkRateLimit", () => {
  it("allows requests within the window limit", () => {
    const req = fakeRequest("/api/providers", { host: "localhost" });
    const result = checkRateLimit(req);
    expect(result.limited).toBe(false);
    expect(result.remaining).toBe(__test__.DEFAULT_MAX_REQUESTS - 1);
  });

  it("throttles after exceeding window limit", () => {
    const req = fakeRequest("/api/models", { host: "localhost" });
    __resetBuckets();
    // Use a small window cap below burst limit so window limit triggers first
    const maxRequests = 10;
    for (let i = 0; i < maxRequests; i++) {
      const r = checkRateLimit(req, { windowMs: 60000, maxRequests });
      expect(r.limited).toBe(false);
    }
    const result = checkRateLimit(req, { windowMs: 60000, maxRequests });
    expect(result.limited).toBe(true);
    expect(result.retryAfter).toBeGreaterThan(0);
    expect(result.remaining).toBe(0);
  });

  it("respects burst limit (faster trigger within burst window)", () => {
    const req = fakeRequest("/api/keys", { host: "localhost" });
    for (let i = 0; i < __test__.BURST_LIMIT; i++) {
      const r = checkRateLimit(req);
      expect(r.limited).toBe(false);
    }
    const result = checkRateLimit(req);
    expect(result.limited).toBe(true);
  });

  it("separates buckets by IP when using trusted peer headers", () => {
    // Use distinct x-9r-real-ip values with valid peer token so getClientIp returns different IPs
    const reqA = fakeRequest("/api/settings", {
      host: "localhost",
      "x-9r-peer-token": PEER_TOKEN,
      "x-9r-real-ip": "10.0.0.1",
    });
    const reqB = fakeRequest("/api/settings", {
      host: "localhost",
      "x-9r-peer-token": PEER_TOKEN,
      "x-9r-real-ip": "10.0.0.2",
    });
    // Exhaust bucket A via burst
    for (let i = 0; i <= __test__.BURST_LIMIT; i++) checkRateLimit(reqA);
    // Bucket B should still be open
    const result = checkRateLimit(reqB);
    expect(result.limited).toBe(false);
  });

  it("resets buckets after __resetBuckets call", () => {
    const req = fakeRequest("/api/tags");
    for (let i = 0; i < __test__.DEFAULT_MAX_REQUESTS + 1; i++) {
      checkRateLimit(req);
    }
    __resetBuckets();
    const result = checkRateLimit(req);
    expect(result.limited).toBe(false);
    expect(result.remaining).toBe(__test__.DEFAULT_MAX_REQUESTS - 1);
  });

  it("supports custom window/maxRequests", () => {
    const req = fakeRequest("/api/providers");
    const result1 = checkRateLimit(req, { windowMs: 60000, maxRequests: 2 });
    expect(result1.limited).toBe(false);
    const result2 = checkRateLimit(req, { windowMs: 60000, maxRequests: 2 });
    expect(result2.limited).toBe(false);
    const result3 = checkRateLimit(req, { windowMs: 60000, maxRequests: 2 });
    expect(result3.limited).toBe(true);
  });
});

describe("rateLimiter — rateLimitResponse", () => {
  it("returns 429 with Retry-After header", () => {
    const result = { limited: true, remaining: 0, retryAfter: 60, resetAt: Date.now() + 60000 };
    const resp = rateLimitResponse(result, { json: mocks.jsonResponse });
    expect(resp.status).toBe(429);
    expect(resp.body.error).toBe("Too many requests");
    expect(resp.headers.get("Retry-After")).toBe("60");
  });

  it("includes X-RateLimit headers", () => {
    const resetAt = Date.now() + 60000;
    const result = { limited: true, remaining: 0, retryAfter: 30, resetAt };
    const resp = rateLimitResponse(result, { json: mocks.jsonResponse });
    expect(resp.headers.get("X-RateLimit-Limit")).toBe(String(__test__.DEFAULT_MAX_REQUESTS));
    expect(resp.headers.get("X-RateLimit-Remaining")).toBe("0");
    expect(resp.headers.get("X-RateLimit-Reset")).toBe(String(Math.ceil(resetAt / 1000)));
  });
});

describe("rateLimiter — addRateLimitHeaders", () => {
  it("attaches rate-limit headers to response", () => {
    const result = { limited: false, remaining: 100, resetAt: Date.now() + 60000 };
    const resp = addRateLimitHeaders({ headers: new Headers() }, result);
    expect(resp.headers.get("X-RateLimit-Remaining")).toBe("100");
    expect(resp.headers.get("X-RateLimit-Limit")).toBe(String(__test__.DEFAULT_MAX_REQUESTS));
  });
});

// ─── header sanitizer tests ─────────────────────────────────────────────
describe("headerSanitizer — sanitizeHeaders", () => {
  it("strips x-forwarded-host", () => {
    const headers = new MockHeaders({ "x-forwarded-host": "evil.com", host: "localhost" });
    const warnings = sanitizeHeaders(headers, false);
    expect(headers.has("x-forwarded-host")).toBe(false);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain("x-forwarded-host");
  });

  it("strips server-only headers when not trusted proxy", () => {
    const headers = new MockHeaders({
      "x-9r-real-ip": "127.0.0.1",
      "x-9r-peer-token": "secret",
      "x-9r-via-proxy": "true",
      host: "localhost",
    });
    const warnings = sanitizeHeaders(headers, false);
    expect(headers.has("x-9r-real-ip")).toBe(false);
    expect(headers.has("x-9r-peer-token")).toBe(false);
    expect(headers.has("x-9r-via-proxy")).toBe(false);
    expect(warnings).toHaveLength(3);
  });

  it("preserves server-only headers when trusted proxy", () => {
    const headers = new MockHeaders({
      "x-9r-real-ip": "10.0.0.1",
      "x-9r-peer-token": PEER_TOKEN,
      "x-9r-via-proxy": "true",
      host: "localhost",
    });
    const warnings = sanitizeHeaders(headers, true);
    expect(headers.has("x-9r-real-ip")).toBe(true);
    expect(warnings).toHaveLength(0);
  });

  it("strips headers with CRLF injection", () => {
    const headers = new MockHeaders({ authorization: "Bearer tok\r\nEvil: header", host: "localhost" });
    const warnings = sanitizeHeaders(headers, false);
    expect(headers.has("authorization")).toBe(false);
    expect(warnings.some(w => w.includes("injection chars"))).toBe(true);
  });

  it("strips oversized headers", () => {
    const bigValue = "x".repeat(10000);
    const headers = new MockHeaders({ "x-custom": bigValue, host: "localhost" });
    const warnings = sanitizeHeaders(headers, false);
    expect(headers.has("x-custom")).toBe(false);
    expect(warnings.some(w => w.includes("oversized"))).toBe(true);
  });

  it("strips invalid host header (injection chars)", () => {
    const headers = new MockHeaders({ host: "localhost\r\nX-Injected: evil" });
    const warnings = sanitizeHeaders(headers, false);
    expect(headers.has("host")).toBe(false);
    expect(warnings.some(w => w.includes("host"))).toBe(true);
  });

  it("strips null-byte headers", () => {
    const headers = new MockHeaders({ "x-evil": "value\0payload", host: "localhost" });
    const warnings = sanitizeHeaders(headers, false);
    expect(headers.has("x-evil")).toBe(false);
    expect(warnings).toHaveLength(1);
  });
});

describe("headerSanitizer — createSanitizedHeaders", () => {
  it("returns new Headers instance without mutating original", () => {
    const request = fakeRequest("/api/test", { "x-forwarded-host": "evil.com", host: "localhost" });
    const { headers, warnings } = createSanitizedHeaders(request, false);
    // Original headers still have it (createSanitizedHeaders makes a copy)
    expect(request.headers.has("x-forwarded-host")).toBe(true);
    // Sanitized copy does not
    expect(headers.has("x-forwarded-host")).toBe(false);
    expect(warnings.length).toBeGreaterThan(0);
  });

  it("preserves legitimate headers", () => {
    const request = fakeRequest("/api/test", {
      host: "localhost:20127",
      authorization: "Bearer valid-token",
      "content-type": "application/json",
    });
    const { headers, warnings } = createSanitizedHeaders(request, false);
    expect(headers.get("authorization")).toBe("Bearer valid-token");
    expect(headers.get("content-type")).toBe("application/json");
    expect(warnings).toHaveLength(0);
  });
});

// ─── barrel export test ─────────────────────────────────────────────────
describe("middleware barrel export", () => {
  it("exports all expected symbols", async () => {
    const mod = await import("../../src/lib/middleware/index.js");
    expect(typeof mod.checkRateLimit).toBe("function");
    expect(typeof mod.rateLimitResponse).toBe("function");
    expect(typeof mod.addRateLimitHeaders).toBe("function");
    expect(typeof mod.sanitizeHeaders).toBe("function");
    expect(typeof mod.createSanitizedHeaders).toBe("function");
  });
});

// ─── dashboardGuard integration test ────────────────────────────────────
describe("dashboardGuard — middleware integration", () => {
  beforeEach(() => {
    mocks.getConsistentMachineId.mockResolvedValue("cli-token");
    mocks.getSettings.mockResolvedValue({ requireLogin: false });
    mocks.verifyDashboardAuthToken.mockResolvedValue(false);
    mocks.validateApiKey.mockResolvedValue(false);
  });

  it("returns 429 when rate limit exceeded on API route", async () => {
    const { proxy } = await import("../../src/dashboardGuard.js");
    const req = fakeRequest("/api/providers", {
      host: "localhost",
      "x-9r-peer-token": PEER_TOKEN,
      "x-9r-real-ip": "192.168.99.99",
    });

    // Exhaust rate limit for this specific IP
    for (let i = 0; i < __test__.DEFAULT_MAX_REQUESTS + 1; i++) {
      checkRateLimit(req);
    }

    const response = await proxy(req);
    expect(response.status).toBe(429);
    expect(response.body.error).toBe("Too many requests");
  });

  it("allows requests under rate limit with valid auth", async () => {
    const { proxy } = await import("../../src/dashboardGuard.js");
    __resetBuckets();
    // /api/providers is now ALWAYS_PROTECTED (Finding #7, commit 24f497b6):
    // JWT or CLI token required regardless of requireLogin. Present the
    // CLI token (mocked getConsistentMachineId returns "cli-token").
    const req = fakeRequest("/api/providers", {
      host: "localhost:20127",
      "x-9r-peer-token": PEER_TOKEN,
      "x-9r-real-ip": "127.0.0.1",
      origin: "http://localhost:20127",
      "x-9r-cli-token": "cli-token",
    });
    const response = await proxy(req);
    // Under limit + local request + valid CLI token → nextResponse
    expect(response).toBe(mocks.nextResponse);
  });

  // ─── RSC/Next-internal exemption (Finding #16 remediation) ──────────
  it("exempts _rsc= prefetches from rate limiting even when bucket exhausted", async () => {
    const { proxy } = await import("../../src/dashboardGuard.js");
    __resetBuckets();
    // Exhaust the bucket for this IP with ordinary dashboard requests.
    const plain = fakeRequest("/dashboard/combos", {
      host: "localhost:20127",
      "x-9r-peer-token": PEER_TOKEN,
      "x-9r-real-ip": "192.168.99.98",
    });
    for (let i = 0; i < __test__.BURST_LIMIT + 1; i++) checkRateLimit(plain);
    expect(checkRateLimit(plain).limited).toBe(true);

    // Same IP, but a Next RSC prefetch — must NOT be 429'd by the limiter.
    const rsc = fakeRequest("/dashboard/combos", {
      host: "localhost:20127",
      "x-9r-peer-token": PEER_TOKEN,
      "x-9r-real-ip": "192.168.99.98",
    }, "?_rsc=abc123");
    const response = await proxy(rsc);
    expect(response.status).not.toBe(429);
  });

  it("exempts /_next/ paths from rate limiting even when bucket exhausted", async () => {
    const { proxy } = await import("../../src/dashboardGuard.js");
    __resetBuckets();
    const plain = fakeRequest("/dashboard/providers", {
      host: "localhost:20127",
      "x-9r-peer-token": PEER_TOKEN,
      "x-9r-real-ip": "192.168.99.97",
    });
    for (let i = 0; i < __test__.BURST_LIMIT + 1; i++) checkRateLimit(plain);
    expect(checkRateLimit(plain).limited).toBe(true);

    const nextAsset = fakeRequest("/_next/static/chunk/main.js", {
      host: "localhost:20127",
      "x-9r-peer-token": PEER_TOKEN,
      "x-9r-real-ip": "192.168.99.97",
    });
    const response = await proxy(nextAsset);
    expect(response.status).not.toBe(429);
  });

  it("still rate-limits ordinary dashboard requests (exemption is narrow)", async () => {
    const { proxy } = await import("../../src/dashboardGuard.js");
    __resetBuckets();
    const req = fakeRequest("/dashboard/usage", {
      host: "localhost:20127",
      "x-9r-peer-token": PEER_TOKEN,
      "x-9r-real-ip": "192.168.99.96",
    });
    for (let i = 0; i < __test__.BURST_LIMIT + 1; i++) checkRateLimit(req);
    const response = await proxy(req);
    expect(response.status).toBe(429);
  });
});
