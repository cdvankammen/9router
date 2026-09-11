import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock next/server
vi.mock("next/server", () => ({
  NextResponse: {
    json: (body, init) => ({ body, status: init?.status ?? 200, _isNextResponse: true }),
  },
}));

// Mock @/models
const mockCreateProxyPool = vi.fn();
vi.mock("@/models", () => ({
  createProxyPool: (...args) => mockCreateProxyPool(...args),
}));

// Capture console.error calls
const consoleErrors = [];
const originalConsoleError = console.error;

beforeEach(() => {
  consoleErrors.length = 0;
  console.error = (...args) => consoleErrors.push(args.join(" "));
  mockCreateProxyPool.mockReset();
});

afterEach(() => {
  console.error = originalConsoleError;
});

describe("deno-deploy route cleanup logging", () => {
  it("logs error when cleanup DELETE fails after deploy error (line ~119)", async () => {
    // Setup: createApp succeeds, deploy fails
    const mockFetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: "app-123" }) }) // createApp
      .mockResolvedValueOnce({ ok: false, status: 500, text: async () => "deploy boom" }) // deploy
      .mockRejectedValueOnce(new Error("network-down")); // cleanup DELETE fails

    vi.stubGlobal("fetch", mockFetch);

    const { POST } = await import("../../src/app/api/proxy-pools/deno-deploy/route.js");
    const req = new Request("http://localhost/api/proxy-pools/deno-deploy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ denoToken: "tok", orgDomain: "example.com" }),
    });

    const res = await POST(req);

    expect(res.status).toBe(500);
    expect(consoleErrors.some((m) => m.includes("cleanup DELETE failed") && m.includes("deploy error"))).toBe(true);
    expect(consoleErrors.some((m) => m.includes("network-down"))).toBe(true);

    vi.unstubAllGlobals();
  });

  it("logs error when cleanup DELETE fails after status check failure (line ~150)", async () => {
    // Setup: createApp succeeds, deploy returns status 'failed' immediately
    // (while loop is skipped since status is neither 'queued' nor 'building'),
    // so the NEXT fetch call is the cleanup DELETE itself.
    const mockFetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: "app-456" }) }) // createApp
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: "rev-1", status: "failed" }) }) // deploy
      .mockRejectedValueOnce(new Error("delete-timeout")); // cleanup DELETE fails

    vi.stubGlobal("fetch", mockFetch);

    const { POST } = await import("../../src/app/api/proxy-pools/deno-deploy/route.js?status-fail");
    const req = new Request("http://localhost/api/proxy-pools/deno-deploy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ denoToken: "tok", orgDomain: "example.com" }),
    });

    const res = await POST(req);

    expect(res.status).toBe(500);
    expect(consoleErrors.some((m) => m.includes("cleanup DELETE failed") && m.includes("status check"))).toBe(true);
    expect(consoleErrors.some((m) => m.includes("delete-timeout"))).toBe(true);

    vi.unstubAllGlobals();
  });
});
