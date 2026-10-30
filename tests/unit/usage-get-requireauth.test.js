// Security hardening test for finding #321: GET /api/usage/[connectionId]
// was missing route-level requireAuth (defense-in-depth gap). The
// middleware gate covers this via PROTECTED_API_PATHS prefix match on
// /api/usage, but defense-in-depth catches any future middleware
// regression. This endpoint returns credential-health signals and
// triggers live credential refresh.
import { describe, expect, it, vi, beforeAll } from "vitest";

vi.mock("@/lib/auth/requireAuth", () => ({
  requireAuth: vi.fn(async () => false),
}));
vi.mock("@/lib/localDb", () => ({
  getProviderConnectionById: vi.fn(async () => null),
  updateProviderConnection: vi.fn(),
}));
vi.mock("open-sse/services/usage.js", () => ({
  getUsageForProvider: vi.fn(),
}));
vi.mock("open-sse/services/tokenRefresh.js", () => ({
  isUnrecoverableRefreshError: vi.fn(() => false),
}));
vi.mock("open-sse/executors/index.js", () => ({
  getExecutor: vi.fn(() => ({ needsRefresh: () => false })),
}));
vi.mock("@/lib/network/connectionProxy", () => ({
  resolveConnectionProxyConfig: vi.fn(async () => ({})),
}));
vi.mock("@/shared/constants/providers", () => ({
  USAGE_APIKEY_PROVIDERS: [],
}));
// The route imports open-sse/index.js for side effects; mock it.
vi.mock("open-sse/index.js", () => ({}));

let GET;
let requireAuth;

beforeAll(async () => {
  ({ GET } = await import("@/app/api/usage/[connectionId]/route.js"));
  ({ requireAuth } = await import("@/lib/auth/requireAuth"));
});

describe("Finding #321: GET /api/usage/[connectionId] requires auth", () => {
  it("returns 401 when requireAuth rejects", async () => {
    requireAuth.mockResolvedValueOnce(false);
    const req = new Request("http://localhost/api/usage/conn-123");
    const res = await GET(req, { params: Promise.resolve({ connectionId: "conn-123" }) });
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("source-level: route imports requireAuth and gates before DB access", () => {
    const fs = require("node:fs");
    const path = require("node:path");
    const src = fs.readFileSync(
      path.join(__dirname, "../../src/app/api/usage/[connectionId]/route.js"),
      "utf8"
    );
    expect(src).toMatch(/import\s+\{[^}]*requireAuth[^}]*\}\s+from\s+["']@\/lib\/auth\/requireAuth["']/);
    expect(src).toMatch(/Finding\s+#321/);
    // requireAuth check must appear BEFORE getProviderConnectionById call.
    const authIdx = src.indexOf("requireAuth(request)");
    const dbIdx = src.indexOf("getProviderConnectionById");
    expect(authIdx).toBeGreaterThan(-1);
    expect(dbIdx).toBeGreaterThan(-1);
    expect(authIdx).toBeLessThan(dbIdx);
  });
});
