import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";

const mocks = vi.hoisted(() => ({
  json: vi.fn((body, init) => ({
    status: init?.status || 200,
    body,
    headers: init?.headers || {},
  })),
  getSettings: vi.fn(),
  updateSettings: vi.fn(),
  isLocalRequest: vi.fn(),
}));

vi.mock("next/server", () => ({
  NextResponse: { json: mocks.json },
}));

vi.mock("@/lib/localDb", () => ({
  getSettings: mocks.getSettings,
  updateSettings: mocks.updateSettings,
}));

vi.mock("@/dashboardGuard", () => ({
  isLocalRequest: mocks.isLocalRequest,
}));

const originalEnv = process.env.INITIAL_PASSWORD;

function makeRequest(body, local = true) {
  mocks.isLocalRequest.mockReturnValue(local);
  return {
    json: async () => body,
    headers: { get: () => null },
  };
}

describe("/api/auth/setup (GAP-P1-14)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.INITIAL_PASSWORD;
  });

  afterAll(() => {
    if (originalEnv !== undefined) process.env.INITIAL_PASSWORD = originalEnv;
    else delete process.env.INITIAL_PASSWORD;
  });

  describe("GET", () => {
    it("reports setupRequired=true when no hash and no env", async () => {
      mocks.getSettings.mockResolvedValue({ password: null });
      const { GET } = await import("../../src/app/api/auth/setup/route.js");

      const res = await GET();

      expect(res.status).toBe(200);
      expect(res.body.setupRequired).toBe(true);
    });

    it("reports setupRequired=false when hash exists", async () => {
      mocks.getSettings.mockResolvedValue({ password: "$2a$10$hash" });
      const { GET } = await import("../../src/app/api/auth/setup/route.js");

      const res = await GET();

      expect(res.body.setupRequired).toBe(false);
    });

    it("reports setupRequired=false when INITIAL_PASSWORD is set", async () => {
      process.env.INITIAL_PASSWORD = "bootstrap";
      mocks.getSettings.mockResolvedValue({ password: null });
      const { GET } = await import("../../src/app/api/auth/setup/route.js");

      const res = await GET();

      expect(res.body.setupRequired).toBe(false);
    });
  });

  describe("POST", () => {
    it("rejects non-local requests even on a fresh install", async () => {
      mocks.getSettings.mockResolvedValue({ password: null });
      const { POST } = await import("../../src/app/api/auth/setup/route.js");

      const res = await POST(makeRequest({ password: "newpass123" }, false));

      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/local-only/i);
      expect(mocks.updateSettings).not.toHaveBeenCalled();
    });

    it("creates a bcrypt hash and persists it on a valid local request", async () => {
      mocks.getSettings.mockResolvedValue({ password: null });
      mocks.updateSettings.mockResolvedValue({});
      const { POST } = await import("../../src/app/api/auth/setup/route.js");

      const res = await POST(makeRequest({ password: "secure-password" }, true));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mocks.updateSettings).toHaveBeenCalledTimes(1);
      const persisted = mocks.updateSettings.mock.calls[0][0];
      expect(persisted.password).toMatch(/^\$2[aby]\$/);
    });

    it("rejects passwords shorter than 6 characters", async () => {
      mocks.getSettings.mockResolvedValue({ password: null });
      const { POST } = await import("../../src/app/api/auth/setup/route.js");

      const res = await POST(makeRequest({ password: "short" }, true));

      expect(res.status).toBe(400);
      expect(mocks.updateSettings).not.toHaveBeenCalled();
    });

    it("refuses to overwrite an existing password hash", async () => {
      mocks.getSettings.mockResolvedValue({ password: "$2a$10$existing" });
      const { POST } = await import("../../src/app/api/auth/setup/route.js");

      const res = await POST(makeRequest({ password: "newpass123" }, true));

      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/already configured/i);
      expect(mocks.updateSettings).not.toHaveBeenCalled();
    });

    it("refuses when INITIAL_PASSWORD is set (operator chose bootstrap)", async () => {
      process.env.INITIAL_PASSWORD = "bootstrap";
      mocks.getSettings.mockResolvedValue({ password: null });
      const { POST } = await import("../../src/app/api/auth/setup/route.js");

      const res = await POST(makeRequest({ password: "newpass123" }, true));

      expect(res.status).toBe(403);
      expect(mocks.updateSettings).not.toHaveBeenCalled();
    });
  });
});
