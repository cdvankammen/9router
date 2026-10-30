/**
 * iFlow cookie route (GAP-P2-21): verify AbortSignal.timeout(15000)
 * is attached to both fetch calls and that timeout produces a 504
 * with a user-friendly message.
 *
 * Anti-false-positive: deliberately removing the timeout check causes
 * test failures, proving the assertion is not vacuous.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { readFileSync } from "node:fs";

/* ── mocks ───────────────────────────────────────────────────────── */

vi.mock("@/models", () => ({
  createProviderConnection: vi.fn(async (opts) => ({ id: "mock-conn", ...opts })),
}));

// Mock requireAuth to always pass — these tests validate the route logic,
// not the auth gate (which has its own test suite).
vi.mock("@/lib/auth/requireAuth", () => ({
  requireAuth: vi.fn(() => Promise.resolve(true)),
}));

/* Mock NextResponse to return a plain object so we can assert on it. */
vi.mock("next/server", () => {
  class MockNextResponse {
    constructor(body, init) {
      this.body = body;
      this.status = init?.status ?? 200;
      this.headers = init?.headers ?? {};
    }
    static json(body, init) {
      return { _json: true, body, status: init?.status ?? 200 };
    }
  }
  return { NextResponse: MockNextResponse };
});

/* ── helpers ─────────────────────────────────────────────────────── */

const VALID_COOKIE = "BXAuth=abc123test;";

function makeRequest(cookie = VALID_COOKIE) {
  return {
    json: async () => ({ cookie }),
  };
}

function makeGetSuccessResponse() {
  return {
    ok: true,
    json: async () => ({
      success: true,
      data: { name: "test-user" },
    }),
  };
}

function makePostSuccessResponse() {
  return {
    ok: true,
    json: async () => ({
      success: true,
      data: {
        apiKey: "iflow-key-xyz",
        name: "test-user",
        expireTime: 9999999999,
      },
    }),
  };
}

/* ── tests ───────────────────────────────────────────────────────── */

describe("iFlow cookie route — timeout behavior (GAP-P2-21)", () => {
  let originalFetch;
  let originalConsoleError;

  beforeEach(() => {
    originalFetch = global.fetch;
    originalConsoleError = console.error;
    console.error = vi.fn(); // suppress noise
  });

  afterEach(() => {
    global.fetch = originalFetch;
    console.error = originalConsoleError;
    vi.restoreAllMocks();
  });

  it("attaches AbortSignal.timeout(15000) to GET fetch call", async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce(makeGetSuccessResponse())
      .mockResolvedValueOnce(makePostSuccessResponse());

    const { POST } = await import(
      "@/app/api/oauth/iflow/cookie/route.js"
    );

    const result = await POST(makeRequest());

    expect(global.fetch).toHaveBeenCalledTimes(2);

    // Check GET call (first)
    const [, getInit] = global.fetch.mock.calls[0];
    expect(getInit.signal).toBeDefined();
    expect(getInit.signal).toBeInstanceOf(AbortSignal);
  });

  it("attaches AbortSignal.timeout(15000) to POST fetch call", async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce(makeGetSuccessResponse())
      .mockResolvedValueOnce(makePostSuccessResponse());

    const { POST } = await import(
      "@/app/api/oauth/iflow/cookie/route.js"
    );

    const result = await POST(makeRequest());

    expect(global.fetch).toHaveBeenCalledTimes(2);

    // Check POST call (second)
    const [, postInit] = global.fetch.mock.calls[1];
    expect(postInit.signal).toBeInstanceOf(AbortSignal);
  });

  it("returns 504 with user-friendly message when GET fetch times out", async () => {
    global.fetch = vi.fn(async () => {
      const err = new DOMException("The operation was aborted.", "AbortError");
      throw err;
    });

    const { POST } = await import(
      "@/app/api/oauth/iflow/cookie/route.js"
    );

    const result = await POST(makeRequest());

    expect(result.status).toBe(504);
    expect(result.body.error).toMatch(/timed out after 15s/i);
  });

  it("returns 504 with user-friendly message when POST fetch times out", async () => {
    let callCount = 0;
    global.fetch = vi.fn(async () => {
      callCount++;
      if (callCount === 1) return makeGetSuccessResponse(); // GET succeeds
      const err = new DOMException("The operation was aborted.", "AbortError");
      throw err;
    });

    const { POST } = await import(
      "@/app/api/oauth/iflow/cookie/route.js"
    );

    const result = await POST(makeRequest());

    expect(result.status).toBe(504);
    expect(result.body.error).toMatch(/timed out after 15s/i);
  });

  it("returns 504 on TimeoutError (Node 18+ AbortSignal.timeout name)", async () => {
    global.fetch = vi.fn(async () => {
      const err = new Error("fetch timed out");
      err.name = "TimeoutError";
      throw err;
    });

    const { POST } = await import(
      "@/app/api/oauth/iflow/cookie/route.js"
    );

    const result = await POST(makeRequest());

    expect(result.status).toBe(504);
    expect(result.body.error).toMatch(/timed out after 15s/i);
  });

  it("returns 500 for non-timeout errors (no false positive)", async () => {
    global.fetch = vi.fn(async () => {
      throw new TypeError("network error");
    });

    const { POST } = await import(
      "@/app/api/oauth/iflow/cookie/route.js"
    );

    const result = await POST(makeRequest());

    // Non-timeout errors should NOT return 504
    expect(result.status).toBe(500);
  });

  it("anti-false-positive: removing timeout check breaks tests", async () => {
    const src = readFileSync(
      new URL("../../src/app/api/oauth/iflow/cookie/route.js", import.meta.url),
      "utf8"
    );
    expect(src).toContain("AbortSignal.timeout(15000)");
    // Exactly 2 occurrences (GET + POST)
    const matches = src.match(/AbortSignal\.timeout\(15000\)/g);
    expect(matches).toHaveLength(2);
    // Verify timeout handling in catch block
    expect(src).toContain("TimeoutError");
    expect(src).toContain("AbortError");
    expect(src).toContain("status: 504");
  });
});
