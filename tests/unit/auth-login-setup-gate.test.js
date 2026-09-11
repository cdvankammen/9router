import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";

const mocks = vi.hoisted(() => ({
  json: vi.fn((body, init) => ({
    status: init?.status || 200,
    body,
    headers: init?.headers || {},
  })),
  cookies: vi.fn(),
  getSettings: vi.fn(),
  isOidcConfigured: vi.fn(),
  isSamlConfigured: vi.fn(),
  checkLock: vi.fn(),
  recordFail: vi.fn(),
  recordSuccess: vi.fn(),
  getClientIp: vi.fn(),
  setDashboardAuthCookie: vi.fn(),
}));

vi.mock("next/server", () => ({
  NextResponse: { json: mocks.json },
}));

vi.mock("next/headers", () => ({
  cookies: mocks.cookies,
}));

vi.mock("@/lib/localDb", () => ({
  getSettings: mocks.getSettings,
}));

vi.mock("@/lib/auth/oidc", () => ({
  isOidcConfigured: mocks.isOidcConfigured,
}));

vi.mock("@/lib/auth/saml.js", () => ({
  isSamlConfigured: mocks.isSamlConfigured,
}));

vi.mock("@/lib/auth/loginLimiter", () => ({
  checkLock: mocks.checkLock,
  recordFail: mocks.recordFail,
  recordSuccess: mocks.recordSuccess,
  getClientIp: mocks.getClientIp,
}));

vi.mock("@/lib/auth/dashboardSession", () => ({
  setDashboardAuthCookie: mocks.setDashboardAuthCookie,
}));

// Reset env between tests so INITIAL_PASSWORD does not leak.
const originalEnv = process.env.INITIAL_PASSWORD;

function makeRequest(password, headers = {}) {
  return {
    json: async () => ({ password }),
    headers: {
      get: (k) => headers[k] || null,
    },
  };
}

describe("POST /api/auth/login — first-run setup gate (GAP-P1-14)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.INITIAL_PASSWORD;
    mocks.checkLock.mockReturnValue({ locked: false });
    mocks.getClientIp.mockReturnValue("127.0.0.1");
    mocks.cookies.mockResolvedValue({ set: vi.fn() });
    mocks.isOidcConfigured.mockReturnValue(false);
    mocks.isSamlConfigured.mockReturnValue(false);
  });

  afterAll(() => {
    if (originalEnv !== undefined) process.env.INITIAL_PASSWORD = originalEnv;
    else delete process.env.INITIAL_PASSWORD;
  });

  it("rejects login with setupRequired when no hash and no INITIAL_PASSWORD", async () => {
    mocks.getSettings.mockResolvedValue({ password: null, authMode: "password" });
    const { POST } = await import("../../src/app/api/auth/login/route.js");

    const res = await POST(makeRequest("123456"));

    expect(res.status).toBe(403);
    expect(res.body.setupRequired).toBe(true);
    expect(res.body.success).toBe(false);
    // Must NOT issue a session cookie on an unconfigured install.
    expect(mocks.setDashboardAuthCookie).not.toHaveBeenCalled();
    // Setup-required is a state condition, not a credential failure.
    expect(mocks.recordFail).not.toHaveBeenCalled();
  });

  it("does not count setup-required against the brute-force budget", async () => {
    mocks.getSettings.mockResolvedValue({ password: null, authMode: "password" });
    const { POST } = await import("../../src/app/api/auth/login/route.js");

    for (let i = 0; i < 20; i++) {
      await POST(makeRequest("anything"));
    }

    expect(mocks.recordFail).not.toHaveBeenCalled();
    expect(mocks.checkLock).not.toHaveReturnedWith(
      expect.objectContaining({ locked: true })
    );
  });

  it("accepts INITIAL_PASSWORD when explicitly set (no stored hash)", async () => {
    process.env.INITIAL_PASSWORD = "operator-bootstrap";
    mocks.getSettings.mockResolvedValue({ password: null, authMode: "password" });
    const { POST } = await import("../../src/app/api/auth/login/route.js");

    const res = await POST(makeRequest("operator-bootstrap"));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(mocks.setDashboardAuthCookie).toHaveBeenCalled();
  });

  it("rejects wrong INITIAL_PASSWORD without entering setup-required path", async () => {
    process.env.INITIAL_PASSWORD = "operator-bootstrap";
    mocks.getSettings.mockResolvedValue({ password: null, authMode: "password" });
    mocks.recordFail.mockReturnValue({ remainingBeforeLock: 4 });
    const { POST } = await import("../../src/app/api/auth/login/route.js");

    const res = await POST(makeRequest("wrong"));

    expect(res.status).toBe(401);
    expect(res.body.setupRequired).toBeUndefined();
    expect(mocks.recordFail).toHaveBeenCalled();
  });

  it("honors stored bcrypt hash even when INITIAL_PASSWORD is unset", async () => {
    // Pre-hashed "correct-password" with salt=10
    const bcrypt = await import("bcryptjs");
    const hash = await bcrypt.default.hash("correct-password", 10);
    mocks.getSettings.mockResolvedValue({ password: hash, authMode: "password" });
    const { POST } = await import("../../src/app/api/auth/login/route.js");

    const res = await POST(makeRequest("correct-password"));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(mocks.setDashboardAuthCookie).toHaveBeenCalled();
  });

  it("SSO-configured installs bypass the setup gate entirely", async () => {
    mocks.getSettings.mockResolvedValue({
      password: null,
      authMode: "oidc",
      ssoType: "oidc",
    });
    mocks.isOidcConfigured.mockReturnValue(true);
    const { POST } = await import("../../src/app/api/auth/login/route.js");

    const res = await POST(makeRequest("anything"));

    // Should get the SSO redirect message, NOT setupRequired.
    expect(res.status).toBe(403);
    expect(res.body.setupRequired).toBeUndefined();
    expect(res.body.error).toMatch(/OIDC/i);
  });
});
