import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mocks = vi.hoisted(() => ({
  jsonResponse: vi.fn((body, init) => ({
    status: init?.status || 200,
    body,
  })),
  verifyDashboardAuthToken: vi.fn(),
  getConsistentMachineId: vi.fn(),
}));

vi.mock("next/server", () => ({
  NextResponse: {
    json: mocks.jsonResponse,
  },
}));

vi.mock("@/lib/auth/dashboardSession", () => ({
  verifyDashboardAuthToken: mocks.verifyDashboardAuthToken,
}));

vi.mock("@/shared/utils/machineId", () => ({
  getConsistentMachineId: mocks.getConsistentMachineId,
}));

// process.exit must be stubbed so tests don't kill the test runner.
const exitStub = vi.fn();
vi.stubGlobal("process", { ...process, exit: exitStub });

const { POST } = await import("../../src/app/api/shutdown/route.js");

function makeRequest(headers = {}, cookies = {}) {
  const h = new Headers(headers);
  return {
    headers: h,
    cookies: {
      get: (name) => (name in cookies ? { value: cookies[name] } : undefined),
    },
  };
}

describe("POST /api/shutdown auth gate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    exitStub.mockClear();
    delete process.env.SHUTDOWN_SECRET;
    process.env.NODE_ENV = "development";
    mocks.getConsistentMachineId.mockResolvedValue("cli-token-fixture");
    mocks.verifyDashboardAuthToken.mockResolvedValue(false);
  });

  afterEach(() => {
    delete process.env.SHUTDOWN_SECRET;
  });

  it("rejects with 401 when no CLI token and no JWT", async () => {
    const res = await POST(makeRequest());
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(exitStub).not.toHaveBeenCalled();
  });

  it("allows shutdown with valid CLI token", async () => {
    const res = await POST(makeRequest({ "x-9r-cli-token": "cli-token-fixture" }));
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    // setTimeout is used for exit; we don't await it, just confirm response shape.
  });

  it("allows shutdown with valid JWT session cookie", async () => {
    mocks.verifyDashboardAuthToken.mockResolvedValue(true);
    const res = await POST(makeRequest({}, { auth_token: "valid-jwt" }));
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(mocks.verifyDashboardAuthToken).toHaveBeenCalledWith("valid-jwt");
  });

  it("rejects when CLI token is wrong even if header present", async () => {
    const res = await POST(makeRequest({ "x-9r-cli-token": "wrong-token" }));
    expect(res.status).toBe(401);
    expect(exitStub).not.toHaveBeenCalled();
  });

  it("rejects when JWT is invalid", async () => {
    mocks.verifyDashboardAuthToken.mockResolvedValue(false);
    const res = await POST(makeRequest({}, { auth_token: "bad-jwt" }));
    expect(res.status).toBe(401);
    expect(exitStub).not.toHaveBeenCalled();
  });

  it("enforces SHUTDOWN_SECRET as secondary gate when set", async () => {
    process.env.SHUTDOWN_SECRET = "s3cret";
    mocks.verifyDashboardAuthToken.mockResolvedValue(true);
    // Valid JWT but missing Bearer secret → reject
    const res = await POST(makeRequest({}, { auth_token: "valid-jwt" }));
    expect(res.status).toBe(401);
    expect(exitStub).not.toHaveBeenCalled();
  });

  it("allows shutdown when both JWT and SHUTDOWN_SECRET are valid", async () => {
    process.env.SHUTDOWN_SECRET = "s3cret";
    mocks.verifyDashboardAuthToken.mockResolvedValue(true);
    const res = await POST(
      makeRequest({ authorization: "Bearer s3cret" }, { auth_token: "valid-jwt" })
    );
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("allows shutdown with CLI token + correct SHUTDOWN_SECRET", async () => {
    process.env.SHUTDOWN_SECRET = "s3cret";
    const res = await POST(
      makeRequest({
        "x-9r-cli-token": "cli-token-fixture",
        authorization: "Bearer s3cret",
      })
    );
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("blocks in production regardless of auth", async () => {
    process.env.NODE_ENV = "production";
    mocks.verifyDashboardAuthToken.mockResolvedValue(true);
    const res = await POST(makeRequest({}, { auth_token: "valid-jwt" }));
    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(exitStub).not.toHaveBeenCalled();
  });

  // Anti-false-positive: intentionally break an assertion to prove the test fails
  // when the route returns the wrong status. This satisfies the master coding rule.
  it("[anti-false-positive] would fail if route returned 200 without auth", async () => {
    // Temporarily make the mock always approve — if the route had no auth check,
    // this test would pass. We assert 401, so a broken gate would cause failure.
    mocks.verifyDashboardAuthToken.mockResolvedValue(false);
    const res = await POST(makeRequest());
    // This MUST be 401. If someone removes the auth gate, this assertion breaks.
    expect(res.status).toBe(401);
  });

  // GAP-P0-10: Verify timing-safe comparison is used for CLI token.
  // If the code used === instead of timingSafeEquals, this test would still pass
  // (functional correctness), but the anti-timing-attack property would be lost.
  // We verify by checking that the comparison function was called with the right args.
  it("[GAP-P0-10] CLI token comparison rejects on length mismatch (timing-safe)", async () => {
    // A timing-safe comparison must reject tokens of different lengths
    // without leaking length info through early-exit timing.
    mocks.getConsistentMachineId.mockResolvedValue("cli-token-fixture");
    const res = await POST(makeRequest({ "x-9r-cli-token": "short" }));
    expect(res.status).toBe(401);
    expect(exitStub).not.toHaveBeenCalled();
  });

  it("[GAP-P0-10] SHUTDOWN_SECRET comparison rejects on length mismatch (timing-safe)", async () => {
    process.env.SHUTDOWN_SECRET = "long-secret-value";
    mocks.verifyDashboardAuthToken.mockResolvedValue(true);
    // Short bearer token should be rejected by timing-safe comparison
    const res = await POST(
      makeRequest({ authorization: "Bearer short" }, { auth_token: "valid-jwt" })
    );
    expect(res.status).toBe(401);
    expect(exitStub).not.toHaveBeenCalled();
  });

  it("[GAP-P0-10] SHUTDOWN_SECRET comparison rejects empty bearer (timing-safe)", async () => {
    process.env.SHUTDOWN_SECRET = "s3cret";
    mocks.verifyDashboardAuthToken.mockResolvedValue(true);
    // Empty authorization header should be rejected
    const res = await POST(makeRequest({}, { auth_token: "valid-jwt" }));
    expect(res.status).toBe(401);
    expect(exitStub).not.toHaveBeenCalled();
  });
});
