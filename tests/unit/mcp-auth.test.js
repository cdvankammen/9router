import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  json: vi.fn((body, init) => ({ status: init?.status || 200, body })),
  registerSession: vi.fn(() => "test-session-id"),
  unregisterSession: vi.fn(),
  sendToChild: vi.fn(),
  findPlugin: vi.fn((name) => (name === "known-plugin" ? { name } : null)),
  getConsistentMachineId: vi.fn(),
}));

vi.mock("next/server", () => ({
  NextResponse: { json: mocks.json },
}));

vi.mock("@/lib/mcp/stdioSseBridge", () => ({
  registerSession: mocks.registerSession,
  unregisterSession: mocks.unregisterSession,
  sendToChild: mocks.sendToChild,
  findPlugin: mocks.findPlugin,
}));

vi.mock("@/shared/utils/machineId", () => ({
  getConsistentMachineId: mocks.getConsistentMachineId,
}));

const VALID_TOKEN = "abc123def456";
const FAKE_TOKEN = "wrong-token";

function makeRequest(url, headers = {}) {
  return {
    headers: new Map(Object.entries(headers)),
    url,
  };
}

describe("MCP endpoint CLI-token auth", () => {
  let GET, POST;

  beforeEach(async () => {
    vi.clearAllMocks();
    mocks.getConsistentMachineId.mockResolvedValue(VALID_TOKEN);

    // Dynamic imports after mocking
    const sseModule = await import("../../src/app/api/mcp/[plugin]/sse/route.js");
    const msgModule = await import("../../src/app/api/mcp/[plugin]/message/route.js");
    GET = sseModule.GET;
    POST = msgModule.POST;
  });

  describe("GET /api/mcp/[plugin]/sse", () => {
    it("returns 401 when no token provided", async () => {
      const req = makeRequest("http://localhost:3000/api/mcp/known-plugin/sse");
      const res = await GET(req, { params: Promise.resolve({ plugin: "known-plugin" }) });
      expect(res.status).toBe(401);
    });

    it("returns 401 when wrong token provided", async () => {
      const req = makeRequest("http://localhost:3000/api/mcp/known-plugin/sse", {
        "x-9r-cli-token": FAKE_TOKEN,
      });
      const res = await GET(req, { params: Promise.resolve({ plugin: "known-plugin" }) });
      expect(res.status).toBe(401);
    });

    it("returns 404 for unknown plugin when token is valid", async () => {
      const req = makeRequest("http://localhost:3000/api/mcp/unknown-plugin/sse", {
        "x-9r-cli-token": VALID_TOKEN,
      });
      const res = await GET(req, { params: Promise.resolve({ plugin: "unknown-plugin" }) });
      // Should pass auth check (401 gate) but fail on plugin lookup (404)
      expect(res.status).toBe(404);
    });

    it("allows access with valid CLI token", async () => {
      const req = makeRequest("http://localhost:3000/api/mcp/known-plugin/sse", {
        "x-9r-cli-token": VALID_TOKEN,
      });
      const res = await GET(req, { params: Promise.resolve({ plugin: "known-plugin" }) });
      // Should NOT be 401 — auth passed, stream should start
      expect(res.status).not.toBe(401);
    });
  });

  describe("POST /api/mcp/[plugin]/message", () => {
    it("returns 401 when no token provided", async () => {
      const req = {
        headers: new Map(),
        url: "http://localhost:3000/api/mcp/known-plugin/message",
        json: async () => ({}),
      };
      const res = await POST(req, { params: Promise.resolve({ plugin: "known-plugin" }) });
      expect(res.status).toBe(401);
    });

    it("returns 401 when wrong token provided", async () => {
      const req = {
        headers: new Map([["x-9r-cli-token", FAKE_TOKEN]]),
        url: "http://localhost:3000/api/mcp/known-plugin/message",
        json: async () => ({}),
      };
      const res = await POST(req, { params: Promise.resolve({ plugin: "known-plugin" }) });
      expect(res.status).toBe(401);
    });

    it("returns 404 for unknown plugin when token is valid", async () => {
      const req = {
        headers: new Map([["x-9r-cli-token", VALID_TOKEN]]),
        url: "http://localhost:3000/api/mcp/unknown-plugin/message",
        json: async () => ({}),
      };
      const res = await POST(req, { params: Promise.resolve({ plugin: "unknown-plugin" }) });
      expect(res.status).toBe(404);
    });

    it("allows access with valid CLI token for known plugin", async () => {
      const req = {
        headers: new Map([["x-9r-cli-token", VALID_TOKEN]]),
        url: "http://localhost:3000/api/mcp/known-plugin/message",
        json: async () => ({ method: "test" }),
      };
      const res = await POST(req, { params: Promise.resolve({ plugin: "known-plugin" }) });
      // Should NOT be 401 — auth passed, message forwarded (202)
      expect(res.status).toBe(202);
    });
  });
});
