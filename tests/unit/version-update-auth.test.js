import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";

const mocks = vi.hoisted(() => ({
  jsonResponse: vi.fn((body, init) => ({ status: init?.status || 200, body })),
  verifyDashboardAuthToken: vi.fn(),
  getConsistentMachineId: vi.fn(),
  killAppProcesses: vi.fn().mockResolvedValue(undefined),
  spawnUpdaterAndExit: vi.fn(),
  cookiesGet: vi.fn(),
  headersGet: vi.fn(),
}));

vi.mock("next/server", () => ({
  NextResponse: { json: mocks.jsonResponse },
}));

vi.mock("next/headers", () => ({
  cookies: () => ({ get: mocks.cookiesGet }),
  headers: () => ({ get: mocks.headersGet }),
}));

vi.mock("@/lib/auth/dashboardSession", () => ({
  verifyDashboardAuthToken: mocks.verifyDashboardAuthToken,
}));

vi.mock("@/shared/utils/machineId", () => ({
  getConsistentMachineId: mocks.getConsistentMachineId,
}));

vi.mock("@/lib/appUpdater", () => ({
  killAppProcesses: mocks.killAppProcesses,
  spawnUpdaterAndExit: mocks.spawnUpdaterAndExit,
}));

const ORIGINAL_ENV = process.env.NODE_ENV;

function makeRequest(headers = {}) {
  return { headers: new Headers(headers) };
}

describe("POST /api/version/update auth gate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NODE_ENV = "production";
    delete process.env.UPDATE_SECRET;
    mocks.cookiesGet.mockReturnValue(undefined);
    mocks.headersGet.mockReturnValue(null);
    mocks.getConsistentMachineId.mockResolvedValue("expected-cli-token");
  });

  afterAll(() => {
    process.env.NODE_ENV = ORIGINAL_ENV;
  });

  it("rejects with 401 when no credentials are provided", async () => {
    mocks.verifyDashboardAuthToken.mockResolvedValue(false);
    const { POST } = await import("../../src/app/api/version/update/route.js");
    const res = await POST(makeRequest());
    expect(res.status).toBe(401);
    expect(mocks.spawnUpdaterAndExit).not.toHaveBeenCalled();
  });

  it("allows request with valid dashboard JWT cookie", async () => {
    mocks.cookiesGet.mockReturnValue({ value: "valid-jwt" });
    mocks.verifyDashboardAuthToken.mockResolvedValue(true);
    const { POST } = await import("../../src/app/api/version/update/route.js?jwt");
    const res = await POST(makeRequest());
    expect(res.status).toBe(200);
    expect(mocks.killAppProcesses).toHaveBeenCalled();
    expect(mocks.spawnUpdaterAndExit).toHaveBeenCalled();
  });

  it("allows request with valid CLI machine-id token", async () => {
    mocks.verifyDashboardAuthToken.mockResolvedValue(false);
    const { POST } = await import("../../src/app/api/version/update/route.js?cli");
    const res = await POST(makeRequest({ "x-9r-cli-token": "expected-cli-token" }));
    expect(res.status).toBe(200);
    expect(mocks.spawnUpdaterAndExit).toHaveBeenCalled();
  });

  it("rejects when UPDATE_SECRET is set but missing from request", async () => {
    process.env.UPDATE_SECRET = "s3cret";
    mocks.cookiesGet.mockReturnValue({ value: "valid-jwt" });
    mocks.verifyDashboardAuthToken.mockResolvedValue(true);
    const { POST } = await import("../../src/app/api/version/update/route.js?secret-missing");
    const res = await POST(makeRequest());
    expect(res.status).toBe(401);
    expect(mocks.spawnUpdaterAndExit).not.toHaveBeenCalled();
  });

  it("allows when UPDATE_SECRET matches via Bearer header", async () => {
    process.env.UPDATE_SECRET = "s3cret";
    mocks.cookiesGet.mockReturnValue({ value: "valid-jwt" });
    mocks.verifyDashboardAuthToken.mockResolvedValue(true);
    mocks.headersGet.mockImplementation((name) =>
      name === "authorization" ? "Bearer s3cret" : null
    );
    const { POST } = await import("../../src/app/api/version/update/route.js?secret-ok");
    const res = await POST(makeRequest());
    expect(res.status).toBe(200);
    expect(mocks.spawnUpdaterAndExit).toHaveBeenCalled();
  });

  it("returns 403 outside production regardless of auth", async () => {
    process.env.NODE_ENV = "development";
    const { POST } = await import("../../src/app/api/version/update/route.js?dev");
    const res = await POST(makeRequest({ "x-9r-cli-token": "expected-cli-token" }));
    expect(res.status).toBe(403);
    expect(mocks.spawnUpdaterAndExit).not.toHaveBeenCalled();
  });
});
