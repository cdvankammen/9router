// Security hardening test for finding #318: /api/health/providers must
// require auth as defense-in-depth. The middleware gate covers this when
// requireLogin=true (the documented default), but on requireLogin=false
// deployments the endpoint was LIVE-VERIFIED leaking the full provider
// topology — connection IDs, provider names, auth types, and health
// status — to unauthenticated LAN peers.
import { describe, expect, it, vi, beforeAll } from "vitest";

vi.mock("@/lib/auth/requireAuth", () => ({
  requireAuth: vi.fn(async () => false), // default: deny
}));
vi.mock("@/lib/localDb", () => ({
  getProviderConnections: vi.fn(async () => []),
  getProviderNodes: vi.fn(async () => []),
}));

let GET;
let requireAuth;

beforeAll(async () => {
  ({ GET } = await import("@/app/api/health/providers/route.js"));
  ({ requireAuth } = await import("@/lib/auth/requireAuth"));
});

describe("Finding #318: /api/health/providers requires auth", () => {
  it("returns 401 when requireAuth rejects", async () => {
    requireAuth.mockResolvedValueOnce(false);
    const req = new Request("http://localhost/api/health/providers");
    const res = await GET(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 200 with topology when requireAuth accepts", async () => {
    requireAuth.mockResolvedValueOnce(true);
    const req = new Request("http://localhost/api/health/providers");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("connections");
    expect(body).toHaveProperty("nodes");
  });

  it("calls requireAuth as the FIRST operation (before any DB access)", async () => {
    const { getProviderConnections, getProviderNodes } = await import("@/lib/localDb");
    requireAuth.mockClear();
    getProviderConnections.mockClear();
    getProviderNodes.mockClear();
    requireAuth.mockResolvedValueOnce(false);

    const req = new Request("http://localhost/api/health/providers");
    await GET(req);

    // requireAuth must have been called
    expect(requireAuth).toHaveBeenCalled();
    // DB accessors must NOT have been called when auth fails —
    // otherwise we'd be doing DB work for every unauthenticated probe.
    expect(getProviderConnections).not.toHaveBeenCalled();
    expect(getProviderNodes).not.toHaveBeenCalled();
  });

  it("source-level: route imports requireAuth and gates before Promise.all", () => {
    const fs = require("fs");
    const src = fs.readFileSync(
      require("path").join(__dirname, "../../src/app/api/health/providers/route.js"),
      "utf8"
    );
    expect(src).toMatch(/import\s+\{[^}]*requireAuth[^}]*\}\s+from\s+["']@\/lib\/auth\/requireAuth["']/);
    expect(src).toMatch(/if\s*\(\s*!\s*\(\s*await\s+requireAuth\s*\(\s*request\s*\)\s*\)\s*\)/);
    // requireAuth check must appear BEFORE the Promise.all that hits the DB.
    const authIdx = src.indexOf("requireAuth(request)");
    const dbIdx = src.indexOf("Promise.all");
    expect(authIdx).toBeGreaterThan(-1);
    expect(dbIdx).toBeGreaterThan(-1);
    expect(authIdx).toBeLessThan(dbIdx);
  });
});
