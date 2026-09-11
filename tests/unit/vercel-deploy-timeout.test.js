import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock next/server
vi.mock("next/server", () => ({
  NextResponse: {
    json: (body, init) => ({
      body,
      status: init?.status ?? 200,
      _isNextResponse: true,
    }),
  },
}));

// Mock @/models
const mockCreateProxyPool = vi.fn();
vi.mock("@/models", () => ({
  createProxyPool: (...args) => mockCreateProxyPool(...args),
}));

const originalFetch = global.fetch;

beforeEach(() => {
  mockCreateProxyPool.mockReset();
  global.fetch = vi.fn();
});

afterEach(() => {
  global.fetch = originalFetch;
});

// Helper: build a successful Vercel deploy flow mock
function mockSuccessfulFlow() {
  const mockFetch = vi.fn()
    // deploy create
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: "dpl_123", projectId: "prj_abc", url: "relay-x.vercel.app" }),
    })
    // project PATCH (disable SSO)
    .mockResolvedValueOnce({ ok: true })
    // pollDeployment call 1: READY
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ readyState: "READY", url: "relay-x.vercel.app" }),
    });
  return mockFetch;
}

describe("vercel-deploy route timeouts (GAP-P2-23)", () => {
  it("deploy create fetch includes AbortSignal.timeout signal", async () => {
    const mockFetch = mockSuccessfulFlow();
    vi.stubGlobal("fetch", mockFetch);

    const { POST } = await import(
      "../../src/app/api/proxy-pools/vercel-deploy/route.js"
    );
    const req = new Request("http://localhost/api/proxy-pools/vercel-deploy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vercelToken: "tok_123" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(201);

    // First call = deploy create
    const [, deployInit] = mockFetch.mock.calls[0];
    expect(deployInit.signal).toBeInstanceOf(AbortSignal);

    vi.unstubAllGlobals();
  });

  it("project PATCH fetch includes AbortSignal.timeout signal", async () => {
    const mockFetch = mockSuccessfulFlow();
    vi.stubGlobal("fetch", mockFetch);

    const { POST } = await import(
      "../../src/app/api/proxy-pools/vercel-deploy/route.js"
    );
    const req = new Request("http://localhost/api/proxy-pools/vercel-deploy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vercelToken: "tok_123" }),
    });

    await POST(req);

    // Second call = project PATCH
    const [, patchInit] = mockFetch.mock.calls[1];
    expect(patchInit.signal).toBeInstanceOf(AbortSignal);

    vi.unstubAllGlobals();
  });

  it("pollDeployment fetch includes AbortSignal.timeout signal", async () => {
    const mockFetch = mockSuccessfulFlow();
    vi.stubGlobal("fetch", mockFetch);

    const { POST } = await import(
      "../../src/app/api/proxy-pools/vercel-deploy/route.js"
    );
    const req = new Request("http://localhost/api/proxy-pools/vercel-deploy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vercelToken: "tok_123" }),
    });

    await POST(req);

    // Third call = pollDeployment
    const [, pollInit] = mockFetch.mock.calls[2];
    expect(pollInit.signal).toBeInstanceOf(AbortSignal);

    vi.unstubAllGlobals();
  });

  it("deploy creation timeout aborts fetch with AbortError", async () => {
    // Deploy create fetch hangs then gets aborted
    const abortError = new DOMException(
      "The operation was aborted.",
      "AbortError"
    );
    const mockFetch = vi.fn().mockImplementation(() => {
      return new Promise((resolve, reject) => {
        // Reject with AbortError after a tick to simulate abort
        setTimeout(() => reject(abortError), 0);
      });
    });

    vi.stubGlobal("fetch", mockFetch);

    const { POST } = await import(
      "../../src/app/api/proxy-pools/vercel-deploy/route.js"
    );
    const req = new Request("http://localhost/api/proxy-pools/vercel-deploy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vercelToken: "tok_123" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(500);
    expect(res.body.error).toContain("aborted");

    vi.unstubAllGlobals();
  });

  it("RELAY_FUNCTION_CODE includes AbortSignal.timeout for edge relay", () => {
    // Read the raw source file to verify the relay template string
    const fs = require("fs");
    const path = require("path");
    const routePath = path.resolve(
      __dirname,
      "../../src/app/api/proxy-pools/vercel-deploy/route.js"
    );
    const source = fs.readFileSync(routePath, "utf8");

    // The relay code is a template literal — ${RELAY_FORWARD_TIMEOUT_MS}
    // interpolates to 60000 at runtime. Verify the signal is present.
    expect(source).toContain("signal: AbortSignal.timeout(${RELAY_FORWARD_TIMEOUT_MS})");
  });
});
