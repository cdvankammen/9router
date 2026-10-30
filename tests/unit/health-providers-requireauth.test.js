// Security hardening test for finding #318: /api/health/providers must
// require auth as defense-in-depth. The middleware gate covers this when
// requireLogin=true (the documented default), but on requireLogin=false
// deployments the endpoint was LIVE-VERIFIED leaking the full provider
// topology to unauthenticated LAN peers.
import { describe, expect, it, vi, beforeAll } from "vitest";
import fs from "node:fs";

vi.mock("@/lib/auth/requireAuth", () => ({
  requireAuth: vi.fn(async () => false),
}));
vi.mock("@/lib/db/repos/connectionsRepo.js", () => ({
  getProviderConnections: vi.fn(async () => []),
  getOrphanConnections: vi.fn(async () => []),
}));
vi.mock("open-sse/services/accountFallback.js", () => ({
  getEarliestModelLockUntil: vi.fn(() => null),
}));
vi.mock("open-sse/services/oauthCredentialManager.js", () => ({
  getCredentialExpiryMs: vi.fn(() => null),
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

  it("returns 200 when requireAuth accepts", async () => {
    requireAuth.mockResolvedValueOnce(true);
    const req = new Request("http://localhost/api/health/providers");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("providers");
  });

  it("source-level: route imports requireAuth", () => {
    const src = fs.readFileSync(
      new URL("../../src/app/api/health/providers/route.js", import.meta.url),
      "utf8"
    );
    expect(src).toMatch(/import\s+\{[^}]*requireAuth[^}]*\}\s+from\s+["']@\/lib\/auth\/requireAuth["']/);
  });

  it("source-level: requireAuth check appears before getProviderConnections call", () => {
    const src = fs.readFileSync(
      new URL("../../src/app/api/health/providers/route.js", import.meta.url),
      "utf8"
    );
    const authIdx = src.indexOf("requireAuth(request)");
    const dbIdx = src.indexOf("getProviderConnections()");
    expect(authIdx).toBeGreaterThan(-1);
    expect(dbIdx).toBeGreaterThan(-1);
    expect(authIdx).toBeLessThan(dbIdx);
  });
});
