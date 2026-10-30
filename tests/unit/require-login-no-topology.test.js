// Security hardening test for finding #336: /api/settings/require-login
// must NOT leak tunnel/tailscale topology to unauthenticated callers.
// The login page only needs `requireLogin` to decide setup-vs-login form.
import { describe, expect, it, vi, beforeAll } from "vitest";

vi.mock("@/lib/localDb", () => ({
  getSettings: vi.fn(async () => ({
    requireLogin: true,
    tunnelDashboardAccess: true,
    tunnelUrl: "https://rABC123.abc-tunnel.us",
    tailscaleUrl: "https://myhost.tailnet",
  })),
}));

let GET;

beforeAll(async () => {
  ({ GET } = await import("@/app/api/settings/require-login/route.js"));
});

describe("Finding #336: /api/settings/require-login does not leak topology", () => {
  it("response contains requireLogin but NOT tunnel/tailscale fields", async () => {
    const req = new Request("http://localhost/api/settings/require-login");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("requireLogin", true);
    // These fields must NOT be present — they leak topology.
    expect(body).not.toHaveProperty("tunnelUrl");
    expect(body).not.toHaveProperty("tailscaleUrl");
    expect(body).not.toHaveProperty("tunnelDashboardAccess");
  });

  it("error response also omits tunnel/tailscale fields (fails closed to 200)", async () => {
    const { getSettings } = await import("@/lib/localDb");
    getSettings.mockRejectedValueOnce(new Error("db error"));
    const req = new Request("http://localhost/api/settings/require-login");
    const res = await GET(req);
    // The source catches the error and returns 200 with {requireLogin: true}
    // (fail-closed: require login when DB is unavailable). Correct security
    // behavior — the login page needs to render regardless.
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("requireLogin", true);
    expect(body).not.toHaveProperty("tunnelUrl");
    expect(body).not.toHaveProperty("tailscaleUrl");
    expect(body).not.toHaveProperty("tunnelDashboardAccess");
  });

  it("source-level: route does not reference tunnelUrl/tailscaleUrl in response", () => {
    const fs = require("fs");
    const src = fs.readFileSync(
      require("path").join(__dirname, "../../src/app/api/settings/require-login/route.js"),
      "utf8"
    );
    expect(src).toMatch(/Finding\s+#336/);
    // The NextResponse.json call must not include tunnel/tailscale fields.
    // Check that the response object literal doesn't contain them.
    const jsonMatch = src.match(/NextResponse\.json\s*\(\s*\{[^}]*\}/s);
    expect(jsonMatch).not.toBeNull();
    expect(jsonMatch[0]).not.toMatch(/tunnelUrl/);
    expect(jsonMatch[0]).not.toMatch(/tailscaleUrl/);
    expect(jsonMatch[0]).not.toMatch(/tunnelDashboardAccess/);
  });
});
